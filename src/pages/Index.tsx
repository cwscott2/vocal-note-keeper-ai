import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { RecordingCard } from '@/components/RecordingCard';
import { RecordingInterface } from '@/components/RecordingInterface';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, Plus, Loader2, Mic } from 'lucide-react';
import { Recording, db, initializeDefaultSettings } from '@/lib/database';
import { transcribeWithOpenAI, transcribeWithHuggingFace, transcribeWithWhisperWeb } from '@/lib/transcription';
import { generateSummary } from '@/lib/summaryService';
import { usePWA } from '@/hooks/usePWA';
import { toast } from '@/hooks/use-toast';
import { RecordingDetailsPanel } from '@/components/RecordingDetailsPanel';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { AppHeader } from '@/components/AppHeader';
import Settings from '@/pages/Settings';

const Index = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isRecordingSheetOpen, setIsRecordingSheetOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { isOnline, installPrompt, isInstalled, installApp } = usePWA();

  useEffect(() => {
    const loadRecordings = async () => {
      await initializeDefaultSettings();
      const allRecordings = await db.recordings.orderBy('createdAt').reverse().toArray();
      setRecordings(allRecordings);
      setFilteredRecordings(allRecordings);
    };
    loadRecordings();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredRecordings(recordings);
    } else {
      const filtered = recordings.filter(recording =>
        recording.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recording.transcriptMD?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recording.summaryMD?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRecordings(filtered);
    }
  }, [searchTerm, recordings]);

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    setIsTranscribing(true);
    
    try {
      const now = new Date();
      const title = `Recording ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      
      const audioBlobId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.audioBlobs.put({ id: audioBlobId, blob: audioBlob });
      
      const newRecording: Recording = {
        title,
        createdAt: now,
        duration: duration || 0,
        provider: 'pending',
        language: 'en',
        audioBlobHandle: audioBlobId,
        transcriptMD: '',
        summaryMD: ''
      };
      
      const recordingId = await db.recordings.add(newRecording);
      const savedRecording = await db.recordings.get(recordingId);
      
      if (savedRecording) {
        setRecordings(prev => [savedRecording, ...prev]);
        toast({
          title: "Recording saved",
          description: "Starting transcription process..."
        });
        
        transcribeRecording(savedRecording, audioBlob);
      }
      
      setIsRecordingSheetOpen(false);
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Error",
        description: "Failed to save recording",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const transcribeRecording = async (recording: Recording, audioBlob: Blob) => {
    try {
      await db.recordings.update(recording.id!, { provider: 'processing' });
      setRecordings(prev => prev.map(r => 
        r.id === recording.id ? { ...r, provider: 'processing' } : r
      ));

      const settings = await db.settings.toArray();
      const currentSettings = settings[0];
      
      let transcription = '';
      let provider = '';

      if (currentSettings?.selectedProvider === 'whisper-web') {
        try {
          transcription = await transcribeWithWhisperWeb(audioBlob, 'tiny');
          provider = 'whisper-web';
        } catch (error) {
          console.error('Whisper Web transcription failed:', error);
          throw error;
        }
      } else if (currentSettings?.selectedProvider === 'openai' && currentSettings.openaiApiKey) {
        try {
          transcription = await transcribeWithOpenAI(audioBlob, currentSettings.openaiApiKey);
          provider = 'openai';
        } catch (error) {
          console.error('OpenAI transcription failed:', error);
          throw error;
        }
      } else if (currentSettings?.selectedProvider === 'huggingface' && currentSettings.hfApiKey) {
        try {
          transcription = await transcribeWithHuggingFace(
            audioBlob, 
            currentSettings.hfApiKey, 
            'openai/whisper-large-v3'
          );
          provider = 'huggingface';
        } catch (error) {
          console.error('Hugging Face transcription failed:', error);
          throw error;
        }
      } else {
        throw new Error('No valid transcription provider configured');
      }

      if (transcription) {
        let summaryContent = '';
        let updatedTitle = recording.title;
        
        if (currentSettings?.summaryProvider && currentSettings.summaryProvider !== 'none') {
          try {
            const summaryResult = await generateSummary(transcription, currentSettings);
            summaryContent = summaryResult.summary;
            updatedTitle = summaryResult.title || recording.title;
          } catch (error) {
            console.error('Summary generation failed:', error);
            summaryContent = '';
          }
        }

        await db.recordings.update(recording.id!, {
          title: updatedTitle,
          transcriptMD: transcription,
          summaryMD: summaryContent,
          provider
        });

        setRecordings(prev => prev.map(r => 
          r.id === recording.id 
            ? { ...r, title: updatedTitle, transcriptMD: transcription, summaryMD: summaryContent, provider }
            : r
        ));

        toast({
          title: "Transcription complete",
          description: `Successfully transcribed using ${provider}`
        });
      } else {
        throw new Error('No transcription returned');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      
      await db.recordings.update(recording.id!, { provider: 'failed' });
      setRecordings(prev => prev.map(r => 
        r.id === recording.id ? { ...r, provider: 'failed' } : r
      ));

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorPreview = errorMessage.split('\n').slice(0, 3).join('\n');
      
      toast({
        title: "Transcription failed",
        description: (
          <div className="space-y-2">
            <p>Please check your API keys and try again</p>
            <code 
              className="block p-2 bg-muted rounded cursor-pointer text-xs"
              onClick={() => navigator.clipboard.writeText(errorMessage)}
              title="Click to copy full error"
            >
              {errorPreview}
              {errorMessage.length > errorPreview.length && '...'}
            </code>
          </div>
        ),
        variant: "destructive"
      });
    }
  };

  const handleRecordingClick = (recording: Recording) => {
    setSelectedRecording(recording);
    setIsDetailsOpen(true);
  };

  const handleRetryTranscription = (recording: Recording) => {
    // Load audio blob and retry transcription
    db.audioBlobs.get(recording.audioBlobHandle).then(audioData => {
      if (audioData) {
        transcribeRecording(recording, audioData.blob);
      }
    });
  };

  const handleSaveRecording = async (recording: Recording, updates: Partial<Recording>) => {
    try {
      await db.recordings.update(recording.id!, updates);
      setRecordings(prev => prev.map(r => 
        r.id === recording.id ? { ...r, ...updates } : r
      ));
      toast({
        title: "Changes saved",
        description: "Recording has been updated successfully"
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecording = async (recording: Recording) => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      try {
        await db.recordings.delete(recording.id!);
        await db.audioBlobs.delete(recording.audioBlobHandle);
        setRecordings(prev => prev.filter(r => r.id !== recording.id));
        toast({
          title: "Recording deleted",
          description: "Recording has been permanently removed"
        });
      } catch (error) {
        console.error('Error deleting recording:', error);
        toast({
          title: "Error",
          description: "Failed to delete recording",
          variant: "destructive"
        });
      }
    }
  };

  if (showOnboarding) {
    return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />;
  }

  if (showSettings) {
    return <Settings onLaunchWizard={() => setShowOnboarding(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        isOnline={isOnline}
        installPrompt={installPrompt}
        isInstalled={isInstalled}
        installApp={installApp}
        onOpenSettings={() => setShowSettings(true)}
        onOpenRecording={() => setIsRecordingSheetOpen(true)}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search recordings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredRecordings.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Mic className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No recordings yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No recordings match your search.' : 'Start by creating your first recording.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsRecordingSheetOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Recording
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecordings.map((recording) => (
              <RecordingCard
                key={recording.id}
                recording={recording}
                onPlay={handleRecordingClick}
                onEdit={handleRecordingClick}
                onDelete={handleDeleteRecording}
              />
            ))}
          </div>
        )}
      </main>

      <RecordingDetailsPanel
        recording={selectedRecording}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onDelete={handleDeleteRecording}
        onRetry={handleRetryTranscription}
        onSave={handleSaveRecording}
      />

      <Sheet open={isRecordingSheetOpen} onOpenChange={setIsRecordingSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Create New Recording</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {isTranscribing ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  <p>Processing your recording...</p>
                </div>
              </div>
            ) : (
              <RecordingInterface
                onRecordingComplete={handleRecordingComplete}
                maxDuration={1800}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Button
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
        onClick={() => setIsRecordingSheetOpen(true)}
      >
        <Mic className="w-6 h-6" />
      </Button>
    </div>
  );
};

export default Index;
