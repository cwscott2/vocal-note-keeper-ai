
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecordingCard } from '@/components/RecordingCard';
import { RecordingInterface } from '@/components/RecordingInterface';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mic, Search, Settings, Plus, Loader2 } from 'lucide-react';
import { Recording, db, initializeDefaultSettings } from '@/lib/database';
import { transcribeWithOpenAI, transcribeWithHuggingFace } from '@/lib/transcription';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const Index = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isRecordingSheetOpen, setIsRecordingSheetOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');

  // Load recordings on mount
  useEffect(() => {
    const loadRecordings = async () => {
      await initializeDefaultSettings();
      const allRecordings = await db.recordings.orderBy('createdAt').reverse().toArray();
      setRecordings(allRecordings);
      setFilteredRecordings(allRecordings);
    };
    loadRecordings();
  }, []);

  // Filter recordings based on search
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
      // Generate a title based on timestamp
      const now = new Date();
      const title = `Recording ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      
      // Store audio blob
      const audioBlobId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.audioBlobs.put({ id: audioBlobId, blob: audioBlob });
      
      // Create recording entry
      const newRecording: Recording = {
        title,
        createdAt: now,
        duration: duration || 0,
        provider: 'pending',
        language: 'en',
        audioBlobHandle: audioBlobId,
        transcriptMD: 'Transcription in progress...',
        summaryMD: 'Summary will be generated after transcription...'
      };
      
      const recordingId = await db.recordings.add(newRecording);
      const savedRecording = await db.recordings.get(recordingId);
      
      if (savedRecording) {
        setRecordings(prev => [savedRecording, ...prev]);
        toast({
          title: "Recording saved",
          description: "Starting transcription process..."
        });
        
        // Start transcription in background
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
      // Get settings for API keys
      const settings = await db.settings.toArray();
      const currentSettings = settings[0];
      
      if (!currentSettings?.openaiApiKey && !currentSettings?.hfApiKey) {
        toast({
          title: "API Key Required",
          description: "Please configure transcription API keys in settings",
          variant: "destructive"
        });
        return;
      }

      let transcription = '';
      let provider = '';

      // Try OpenAI first if available
      if (currentSettings.openaiApiKey) {
        try {
          transcription = await transcribeWithOpenAI(audioBlob, currentSettings.openaiApiKey);
          provider = 'openai';
        } catch (error) {
          console.error('OpenAI transcription failed:', error);
        }
      }

      // Fallback to Hugging Face if OpenAI failed
      if (!transcription && currentSettings.hfApiKey) {
        try {
          transcription = await transcribeWithHuggingFace(
            audioBlob, 
            currentSettings.hfApiKey, 
            'openai/whisper-large-v3'
          );
          provider = 'huggingface';
        } catch (error) {
          console.error('Hugging Face transcription failed:', error);
        }
      }

      if (transcription) {
        // Update recording with transcription
        await db.recordings.update(recording.id!, {
          transcriptMD: transcription,
          summaryMD: `# Summary\n\n*Auto-generated summary will be available soon...*\n\n## Key Points\n\n- Transcription completed successfully\n- Duration: ${Math.floor(recording.duration / 60)}:${(recording.duration % 60).toString().padStart(2, '0')}\n- Provider: ${provider}`,
          provider
        });

        // Update local state
        setRecordings(prev => prev.map(r => 
          r.id === recording.id 
            ? { ...r, transcriptMD: transcription, summaryMD: `Summary for: ${recording.title}`, provider }
            : r
        ));

        toast({
          title: "Transcription complete",
          description: `Successfully transcribed using ${provider}`
        });
      } else {
        throw new Error('All transcription providers failed');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription failed",
        description: "Please check your API keys and try again",
        variant: "destructive"
      });
    }
  };

  const handlePlayRecording = (recording: Recording) => {
    setSelectedRecording(recording);
    setEditedSummary(recording.summaryMD || '');
    setEditedTranscript(recording.transcriptMD || '');
    setIsDetailsOpen(true);
  };

  const handleEditRecording = (recording: Recording) => {
    setSelectedRecording(recording);
    setEditedSummary(recording.summaryMD || '');
    setEditedTranscript(recording.transcriptMD || '');
    setIsDetailsOpen(true);
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

  const handleSaveChanges = async () => {
    if (selectedRecording) {
      try {
        await db.recordings.update(selectedRecording.id!, {
          summaryMD: editedSummary,
          transcriptMD: editedTranscript
        });
        
        setRecordings(prev => prev.map(r => 
          r.id === selectedRecording.id 
            ? { ...r, summaryMD: editedSummary, transcriptMD: editedTranscript }
            : r
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
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Mic className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold">AI Note Taker</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Sheet open={isRecordingSheetOpen} onOpenChange={setIsRecordingSheetOpen}>
                <SheetTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Recording
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh]">
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
                        maxDuration={1800} // 30 minutes
                      />
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
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

        {/* Recordings Grid */}
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
                onPlay={handlePlayRecording}
                onEdit={handleEditRecording}
                onDelete={handleDeleteRecording}
              />
            ))}
          </div>
        )}
      </main>

      {/* Recording Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{selectedRecording?.title}</span>
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="secondary">
                  {selectedRecording?.provider}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedRecording?.createdAt && formatDistanceToNow(selectedRecording.createdAt, { addSuffix: true })}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="summary" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-hidden mt-4">
                <TabsContent value="summary" className="h-full">
                  <Textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    placeholder="Summary will appear here after transcription..."
                    className="h-full resize-none"
                  />
                </TabsContent>
                
                <TabsContent value="transcript" className="h-full">
                  <Textarea
                    value={editedTranscript}
                    onChange={(e) => setEditedTranscript(e.target.value)}
                    placeholder="Transcript will appear here..."
                    className="h-full resize-none"
                  />
                </TabsContent>
              </div>
              
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                <Button onClick={handleSaveChanges}>
                  Save Changes
                </Button>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button */}
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
