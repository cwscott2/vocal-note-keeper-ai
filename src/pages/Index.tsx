import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recording } from '@/lib/database';
import { RecordingCard } from '@/components/RecordingCard';
import { RecordingInterface } from '@/components/RecordingInterface';
import { AppHeader } from '@/components/AppHeader';
import { SidePanelSheet } from '@/components/SidePanelSheet';
import { usePWA } from '@/hooks/usePWA';
import { db, Settings } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { isOnline, installPrompt, isInstalled, installApp } = usePWA();

  const navigate = useNavigate();

  useEffect(() => {
    loadSettings();
    loadRecordings();
  }, []);

  const loadSettings = async () => {
    try {
      const allSettings = await db.settings.toArray();
      if (allSettings.length > 0) {
        setSettings(allSettings[0]);
      } else {
        navigate('/settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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

  const handlePlayRecording = (recording: Recording) => {
    setSelectedRecording(recording);
  };

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    console.log('Recording completed with duration:', duration);
    
    if (!settings) {
      toast({
        title: "Error",
        description: "Settings not loaded",
        variant: "destructive"
      });
      return;
    }

    setIsTranscribing(true);
    
    try {
      // Create recording entry
      const recording: Omit<Recording, 'id'> = {
        title: 'Processing...',
        createdAt: new Date(),
        duration: duration, // Use the actual calculated duration
        provider: 'processing',
        language: settings.language,
        audioBlobHandle: `recording_${Date.now()}`,
        processingStep: 'transcribing',
        processingProgress: 0
      };

      const recordingId = await db.recordings.add(recording);
      console.log('Created recording with ID:', recordingId, 'duration:', duration);

      // Store audio blob
      if (settings.saveRecordings) {
        await db.audioBlobs.put({
          id: recording.audioBlobHandle,
          blob: audioBlob
        });
      }

      // Start transcription
      const { transcribeAudio } = await import('@/lib/transcription');
      
      console.log('Starting transcription for recording:', recordingId);
      console.log('Current settings:', settings);
      
      const transcript = await transcribeAudio(audioBlob, settings);
      console.log('Transcription completed:', transcript.length, 'characters');

      // Update with transcript
      await db.recordings.update(recordingId, {
        title: transcript.slice(0, 50) + (transcript.length > 50 ? '...' : ''),
        transcriptMD: transcript,
        processingStep: 'summarizing',
        processingProgress: 50
      });

      // Generate summary if configured
      if (settings.summaryProvider && settings.summaryProvider !== 'none') {
        try {
          const { generateSummary } = await import('@/lib/summaryService');
          const summaryResult = await generateSummary(transcript, settings);
          
          await db.recordings.update(recordingId, {
            title: summaryResult.title,
            summaryMD: summaryResult.summary,
            provider: settings.selectedProvider,
            processingStep: 'completed',
            processingProgress: 100
          });
        } catch (summaryError) {
          console.error('Summary generation failed:', summaryError);
          await db.recordings.update(recordingId, {
            provider: settings.selectedProvider,
            processingStep: 'completed',
            processingProgress: 100
          });
        }
      } else {
        await db.recordings.update(recordingId, {
          provider: settings.selectedProvider,
          processingStep: 'completed',
          processingProgress: 100
        });
      }

      loadRecordings();
      
      toast({
        title: "Recording processed",
        description: "Your recording has been transcribed successfully"
      });

    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader
          isOnline={isOnline}
          installPrompt={installPrompt}
          isInstalled={isInstalled}
          installApp={installApp}
          showActions={false}
        />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        isOnline={isOnline}
        installPrompt={installPrompt}
        isInstalled={isInstalled}
        installApp={installApp}
        showActions={true}
      />

      <SidePanelSheet recording={selectedRecording} onClose={() => setSelectedRecording(null)} />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">My Recordings</h1>

        <RecordingInterface
          onRecordingComplete={handleRecordingComplete}
          maxDuration={settings?.maxDuration || 1800}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          {recordings.map((recording) => (
            <RecordingCard
              key={recording.id}
              recording={recording}
              onPlay={handlePlayRecording}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
