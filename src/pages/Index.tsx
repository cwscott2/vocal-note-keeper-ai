import { useState, useEffect, useCallback } from 'react';
import { RecordingCard } from '@/components/RecordingCard';
import { useRecordings } from '@/hooks/useRecordings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Mic } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { AppHeader } from '@/components/AppHeader';
import { SidePanelSheet } from '@/components/SidePanelSheet';
import { RecordingInterface } from '@/components/RecordingInterface';
import { Recording } from '@/lib/database';
import { usePWA } from '@/hooks/usePWA';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Index() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showRecordingInterface, setShowRecordingInterface] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const navigate = useNavigate();
  const { isOnline, installPrompt, isInstalled, installApp } = usePWA();

  const {
    recordings,
    isLoading,
    error,
    totalCount,
    page,
    setPage,
    pageSize,
    setPageSize,
    favoriteRecording,
    deleteRecording,
    loadRecordings,
  } = useRecordings({
    searchTerm: debouncedSearchTerm,
    startDate: dateRange[0]?.toISOString() || undefined,
    endDate: dateRange[1]?.toISOString() || undefined,
    showOnlyFavorites,
  });

  const onOpenRecording = () => {
    setShowRecordingInterface(true);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const toggleFavorite = useCallback(
    (recording: Recording) => {
      favoriteRecording(recording.id?.toString() || '');
    },
    [favoriteRecording]
  );

  const removeRecording = useCallback(
    (recording: Recording) => {
      deleteRecording(recording.id?.toString() || '');
    },
    [deleteRecording]
  );

  const handlePlay = useCallback((recording: Recording) => {
    setSelectedRecording(recording);
  }, []);

  const handleEdit = useCallback((recording: Recording) => {
    setSelectedRecording(recording);
  }, []);

  const handleCloseSidePanel = () => {
    setSelectedRecording(null);
  };

  const handleDeleteFromSidePanel = (recording: Recording) => {
    removeRecording(recording);
    setSelectedRecording(null);
  };

  const handleRetry = (recording: Recording) => {
    console.log('Retry recording:', recording);
  };

  const handleSave = (recording: Recording, updates: Partial<Recording>) => {
    console.log('Save recording:', recording, updates);
  };

  const handleToggleFavoriteFromSidePanel = (recording: Recording) => {
    toggleFavorite(recording);
  };

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    console.log('Recording completed:', audioBlob, duration);
    setShowRecordingInterface(false);
    
    try {
      // Get current settings
      const allSettings = await db.settings.toArray();
      const settings = allSettings[0];
      
      // Save to database with proper processing setup
      const audioBlobHandle = `audio_${Date.now()}`;
      await db.audioBlobs.put({ id: audioBlobHandle, blob: audioBlob });
      
      const recordingId = await db.recordings.add({
        title: `Recording ${new Date().toLocaleString()}`,
        createdAt: new Date(),
        duration,
        provider: settings?.selectedProvider || 'openai',
        language: settings?.language || 'en',
        audioBlobHandle,
        processingStep: 'transcribing',
        processingProgress: 0
      });

      // Trigger recordings refresh immediately
      loadRecordings();
      
      toast({
        title: "Recording saved",
        description: "Processing will begin shortly"
      });

      // Start processing in background
      processRecording(recordingId, settings);
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Error",
        description: "Failed to save recording",
        variant: "destructive"
      });
    }
  };

  const processRecording = async (recordingId: number, settings: any) => {
    try {
      // Import the transcription service
      const { transcribeAudio } = await import('@/lib/transcription');
      const { generateSummary } = await import('@/lib/summaryService');
      
      // Get the recording
      const recording = await db.recordings.get(recordingId);
      if (!recording) return;

      // Get the audio blob
      const audioBlob = await db.audioBlobs.get(recording.audioBlobHandle);
      if (!audioBlob) return;

      if (!settings) return;

      // Update status to transcribing
      await db.recordings.update(recordingId, { 
        processingStep: 'transcribing',
        processingProgress: 10 
      });
      loadRecordings(); // Refresh UI

      // Transcribe
      const transcriptResult = await transcribeAudio(audioBlob.blob, settings);
      
      await db.recordings.update(recordingId, {
        transcriptMD: transcriptResult.text,
        processingProgress: 60
      });
      loadRecordings(); // Refresh UI

      // Generate summary if enabled
      if (settings.summaryProvider && settings.summaryProvider !== 'none') {
        await db.recordings.update(recordingId, { 
          processingStep: 'summarizing',
          processingProgress: 70 
        });
        loadRecordings(); // Refresh UI

        try {
          const summaryResult = await generateSummary(transcriptResult.text, settings);
          
          await db.recordings.update(recordingId, {
            title: summaryResult.title,
            summaryMD: summaryResult.summary,
            processingStep: 'completed',
            processingProgress: 100
          });
        } catch (summaryError) {
          console.error('Summary generation failed:', summaryError);
          // Continue without summary
          await db.recordings.update(recordingId, {
            processingStep: 'completed',
            processingProgress: 100
          });
        }
      } else {
        await db.recordings.update(recordingId, {
          processingStep: 'completed',
          processingProgress: 100
        });
      }

      loadRecordings(); // Final refresh
      
      toast({
        title: "Processing complete",
        description: "Recording has been transcribed" + (settings.summaryProvider !== 'none' ? " and summarized" : "")
      });

    } catch (error) {
      console.error('Processing failed:', error);
      await db.recordings.update(recordingId, {
        processingStep: 'failed',
        processingProgress: 0
      });
      loadRecordings();
      
      toast({
        title: "Processing failed",
        description: "Please try again or check your settings",
        variant: "destructive"
      });
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        isOnline={isOnline}
        installPrompt={installPrompt}
        isInstalled={isInstalled}
        installApp={installApp}
        onOpenSettings={() => navigate('/settings')}
        onOpenRecording={onOpenRecording}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Recordings Section */}
        <div className="mb-6 space-y-4">
          <h2 className="text-lg font-semibold">Recordings</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Search */}
            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <Input
                type="search"
                id="search"
                placeholder="Search recordings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Date Range */}
            <div>
              <Label>Date Range</Label>
              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal flex-1 text-xs",
                        !dateRange[0] && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dateRange[0] ? format(dateRange[0], "MMM dd") : <span>Start</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange[0] || undefined}
                      onSelect={(date) => setDateRange([date || null, dateRange[1]])}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal flex-1 text-xs",
                        !dateRange[1] && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dateRange[1] ? format(dateRange[1], "MMM dd") : <span>End</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange[1] || undefined}
                      onSelect={(date) => setDateRange([dateRange[0], date || null])}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Show Only Favorites as Button */}
            <div>
              <Label>&nbsp;</Label>
              <Button
                variant={showOnlyFavorites ? "default" : "outline"}
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className="w-full"
              >
                {showOnlyFavorites ? 'Show All' : 'Favorites Only'}
              </Button>
            </div>
          </div>
        </div>

        {/* Recordings Grid */}
        {isLoading ? (
          <p>Loading recordings...</p>
        ) : error ? (
          <p className="text-red-500">Error: {error.message}</p>
        ) : recordings.length === 0 ? (
          <p>No recordings found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recordings.map((recording) => (
              <RecordingCard
                key={recording.id}
                recording={recording}
                onPlay={handlePlay}
                onEdit={handleEdit}
                onToggleFavorite={toggleFavorite}
                onDelete={removeRecording}
              />
            ))}
          </div>
        )}

        {/* Pagination Section */}
        <div className="flex justify-between items-center mt-4">
          <div>
            <Label htmlFor="pageSize">Page Size:</Label>
            <select
              id="pageSize"
              className="ml-2 p-2 border rounded"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              variant="outline"
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>

        {/* Floating Action Button with Mesh Gradient */}
        <button
          onClick={onOpenRecording}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center justify-center group"
          style={{
            backgroundColor: '#ff999c',
            backgroundImage: `
              radial-gradient(at 93% 45%, hsla(59,83%,76%,1) 0px, transparent 50%),
              radial-gradient(at 31% 51%, hsla(188,87%,63%,1) 0px, transparent 50%),
              radial-gradient(at 45% 6%, hsla(165,91%,75%,1) 0px, transparent 50%),
              radial-gradient(at 60% 79%, hsla(90,90%,78%,1) 0px, transparent 50%),
              radial-gradient(at 56% 2%, hsla(164,93%,68%,1) 0px, transparent 50%),
              radial-gradient(at 36% 99%, hsla(294,76%,60%,1) 0px, transparent 50%),
              radial-gradient(at 8% 59%, hsla(307,89%,78%,1) 0px, transparent 50%)
            `
          }}
          aria-label="Start new recording"
        >
          <Mic className="w-6 h-6 text-white stroke-[1.25]" />
        </button>
      </div>

      {/* Side Panel */}
      <SidePanelSheet
        recording={selectedRecording}
        onClose={handleCloseSidePanel}
        onDelete={handleDeleteFromSidePanel}
        onRetry={handleRetry}
        onSave={handleSave}
        onToggleFavorite={handleToggleFavoriteFromSidePanel}
      />

      {/* Recording Interface */}
      <RecordingInterface 
        isOpen={showRecordingInterface}
        onClose={() => setShowRecordingInterface(false)}
        onRecordingComplete={handleRecordingComplete}
      />
    </div>
  );
}
