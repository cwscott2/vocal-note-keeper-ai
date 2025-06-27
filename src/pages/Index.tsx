import { useState, useEffect } from 'react';
import { RecordingCard } from '@/components/RecordingCard';
import { RecordingInterface } from '@/components/RecordingInterface';
import { SidePanelSheet } from '@/components/SidePanelSheet';
import { Recording, db, initializeDefaultSettings } from '@/lib/database';
import { toast } from '@/hooks/use-toast';
import { usePWA } from '@/hooks/usePWA';
import { transcribeAudio } from '@/lib/transcription';
import { generateSummary } from '@/lib/summaryService';
import { AppHeader } from '@/components/AppHeader';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const Index = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showRecordingSheet, setShowRecordingSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState(null);
  const { isOnline, installPrompt, isInstalled, installApp } = usePWA();
  const navigate = useNavigate();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    // Filter recordings based on search query
    if (searchQuery.trim() === '') {
      setFilteredRecordings(recordings);
    } else {
      const filtered = recordings.filter(recording =>
        recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recording.transcriptMD?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recording.summaryMD?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecordings(filtered);
    }
  }, [recordings, searchQuery]);

  const initializeApp = async () => {
    await initializeDefaultSettings();
    await loadRecordings();
    await loadSettings();
  };

  const loadRecordings = async () => {
    try {
      const allRecordings = await db.recordings.orderBy('createdAt').reverse().toArray();
      setRecordings(allRecordings);
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast({
        title: "Error",
        description: "Failed to load recordings",
        variant: "destructive"
      });
    }
  };

  const loadSettings = async () => {
    try {
      const allSettings = await db.settings.toArray();
      if (allSettings.length > 0) {
        setSettings(allSettings[0]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    try {
      if (!settings) {
        throw new Error('Settings not loaded');
      }

      console.log('Processing new recording with settings:', settings);

      // Store the audio blob
      const audioBlobHandle = `audio_${Date.now()}`;
      await db.audioBlobs.add({ id: audioBlobHandle, blob: audioBlob });

      // Create recording entry
      const recording: Recording = {
        title: `Recording ${new Date().toLocaleString()}`,
        createdAt: new Date(),
        duration,
        provider: 'processing',
        language: settings.language || 'en',
        audioBlobHandle,
        processingStep: 'transcribing'
      };

      const recordingId = await db.recordings.add(recording);
      loadRecordings();

      // Process transcription FIRST
      try {
        console.log('Starting transcription with provider:', settings.selectedProvider);
        const transcript = await transcribeAudio(audioBlob, settings);
        console.log('Transcription completed:', transcript);
        
        // Update with transcription
        await db.recordings.update(recordingId, {
          transcriptMD: transcript,
          provider: settings.selectedProvider,
          processingStep: 'completed'
        });
        
        loadRecordings();

        // Now process summary if configured
        let summaryMD = '';
        let title = recording.title;
        
        if (settings.summaryProvider && settings.summaryProvider !== 'none') {
          console.log('Starting summary generation with provider:', settings.summaryProvider);
          await db.recordings.update(recordingId, { processingStep: 'summarizing' });
          loadRecordings();
          
          try {
            const summaryResult = await generateSummary(transcript, settings);
            summaryMD = summaryResult.summary;
            title = summaryResult.title;
            console.log('Summary completed:', summaryResult);
          } catch (summaryError) {
            console.error('Summary failed but transcription succeeded:', summaryError);
            // Keep transcription even if summary fails
          }
        }

        // Final update with all data
        await db.recordings.update(recordingId, {
          summaryMD,
          title,
          processingStep: 'completed'
        });

        toast({
          title: "Recording processed",
          description: "Your recording has been transcribed successfully"
        });
      } catch (error) {
        console.error('Transcription failed:', error);
        await db.recordings.update(recordingId, { 
          provider: 'failed',
          processingStep: 'failed'
        });
        
        toast({
          title: "Transcription failed",
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Error",
        description: "Failed to save recording",
        variant: "destructive"
      });
    } finally {
      loadRecordings();
      setShowRecordingSheet(false);
    }
  };

  const handleRetryTranscription = async (recording: Recording) => {
    try {
      const currentSettings = await db.settings.toArray();
      if (currentSettings.length === 0) {
        throw new Error('No settings found');
      }

      const audioData = await db.audioBlobs.get(recording.audioBlobHandle);
      if (!audioData) {
        throw new Error('Audio data not found');
      }

      console.log('Retrying transcription with settings:', currentSettings[0]);

      await db.recordings.update(recording.id!, { 
        provider: 'processing',
        processingStep: 'transcribing'
      });
      
      loadRecordings();

      try {
        console.log('Starting retry transcription with provider:', currentSettings[0].selectedProvider);
        const transcript = await transcribeAudio(audioData.blob, currentSettings[0]);
        console.log('Retry transcription completed:', transcript);
        
        // Update with transcription
        await db.recordings.update(recording.id!, {
          transcriptMD: transcript,
          provider: currentSettings[0].selectedProvider,
          processingStep: 'completed'
        });
        
        loadRecordings();

        // Process summary if configured
        let summaryMD = '';
        let title = recording.title;
        
        if (currentSettings[0].summaryProvider && currentSettings[0].summaryProvider !== 'none') {
          console.log('Starting retry summary generation with provider:', currentSettings[0].summaryProvider);
          await db.recordings.update(recording.id!, { processingStep: 'summarizing' });
          loadRecordings();
          
          try {
            const summaryResult = await generateSummary(transcript, currentSettings[0]);
            summaryMD = summaryResult.summary;
            title = summaryResult.title;
            console.log('Retry summary completed:', summaryResult);
          } catch (summaryError) {
            console.error('Summary failed but transcription succeeded:', summaryError);
            // Keep transcription even if summary fails
          }
        }

        // Final update
        await db.recordings.update(recording.id!, {
          summaryMD,
          title,
          processingStep: 'completed'
        });

        toast({
          title: "Transcription completed",
          description: "Recording has been processed successfully"
        });
      } catch (error) {
        console.error('Retry transcription failed:', error);
        await db.recordings.update(recording.id!, { 
          provider: 'failed',
          processingStep: 'failed'
        });
        
        toast({
          title: "Transcription failed",
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error retrying transcription:', error);
      toast({
        title: "Error",
        description: "Failed to retry transcription",
        variant: "destructive"
      });
    } finally {
      loadRecordings();
    }
  };

  const handleDeleteRecording = async (recording: Recording) => {
    try {
      await db.recordings.delete(recording.id!);
      await db.audioBlobs.delete(recording.audioBlobHandle);
      
      toast({
        title: "Recording deleted",
        description: "Recording has been deleted successfully"
      });
      
      setSelectedRecording(null);
      loadRecordings();
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: "Error",
        description: "Failed to delete recording",
        variant: "destructive"
      });
    }
  };

  const handleSaveRecording = async (recording: Recording, updates: Partial<Recording>) => {
    try {
      await db.recordings.update(recording.id!, updates);
      
      toast({
        title: "Recording saved",
        description: "Changes have been saved successfully"
      });
      
      loadRecordings();
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        isOnline={isOnline}
        installPrompt={installPrompt}
        isInstalled={isInstalled}
        installApp={installApp}
        onOpenSettings={() => navigate('/settings')}
        onOpenRecording={() => setShowRecordingSheet(true)}
        showActions={true}
      />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Recent Recordings</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search recordings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {filteredRecordings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No recordings match your search.' : 'No recordings yet. Start by making your first recording!'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRecordings.map((recording) => (
                  <RecordingCard
                    key={recording.id}
                    recording={recording}
                    onPlay={() => setSelectedRecording(recording)}
                    onEdit={() => setSelectedRecording(recording)}
                    onDelete={handleDeleteRecording}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setShowRecordingSheet(true)}
      >
        <Mic className="w-6 h-6" />
      </Button>

      {/* Recording Sheet - Left Side */}
      <Sheet open={showRecordingSheet} onOpenChange={setShowRecordingSheet}>
        <SheetContent side="left" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>New Recording</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <RecordingInterface 
              onRecordingComplete={handleRecordingComplete}
              maxDuration={settings?.maxDuration || 1800}
            />
          </div>
        </SheetContent>
      </Sheet>

      <SidePanelSheet
        recording={selectedRecording}
        onClose={() => setSelectedRecording(null)}
        onDelete={handleDeleteRecording}
        onRetry={handleRetryTranscription}
        onSave={handleSaveRecording}
      />
    </div>
  );
};

export default Index;
