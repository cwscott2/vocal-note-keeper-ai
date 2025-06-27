
import { useState, useEffect, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Mic, Search, CalendarIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, subWeeks, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

type FilterType = 'recent' | 'yesterday' | 'lastWeek' | 'lastMonth' | 'custom' | 'favorites';

const Index = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showRecordingSheet, setShowRecordingSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('recent');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [settings, setSettings] = useState(null);
  const { isOnline, installPrompt, isInstalled, installApp } = usePWA();
  const navigate = useNavigate();

  useEffect(() => {
    initializeApp();
  }, []);

  const getFilteredByDate = (recordings: Recording[], filter: FilterType, customRange?: DateRange) => {
    const now = new Date();
    
    switch (filter) {
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return recordings.filter(r => 
          isAfter(r.createdAt, startOfDay(yesterday)) && 
          isBefore(r.createdAt, endOfDay(yesterday))
        );
      case 'lastWeek':
        const weekAgo = subWeeks(now, 1);
        return recordings.filter(r => isAfter(r.createdAt, weekAgo));
      case 'lastMonth':
        const monthAgo = subMonths(now, 1);
        return recordings.filter(r => isAfter(r.createdAt, monthAgo));
      case 'custom':
        if (!customRange?.from) return recordings;
        return recordings.filter(r => {
          const recordingDate = startOfDay(r.createdAt);
          const fromDate = startOfDay(customRange.from!);
          const toDate = customRange.to ? endOfDay(customRange.to) : endOfDay(customRange.from!);
          return isAfter(recordingDate, fromDate) || 
                 (isAfter(recordingDate, fromDate) && isBefore(recordingDate, toDate)) ||
                 recordingDate.getTime() === fromDate.getTime();
        });
      case 'favorites':
        return recordings.filter(r => r.isFavorite);
      case 'recent':
      default:
        return recordings;
    }
  };

  const filteredAndSearchedRecordings = useMemo(() => {
    let filtered = getFilteredByDate(recordings, filterType, dateRange);
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(recording =>
        recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recording.transcriptMD?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recording.summaryMD?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [recordings, filterType, dateRange, searchQuery]);

  const paginatedRecordings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSearchedRecordings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSearchedRecordings, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSearchedRecordings.length / itemsPerPage);
  const showPagination = filteredAndSearchedRecordings.length >= 3;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, dateRange]);

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
        processingStep: 'transcribing',
        isFavorite: false
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

  const handleToggleFavorite = async (recording: Recording) => {
    try {
      const newFavoriteStatus = !recording.isFavorite;
      await db.recordings.update(recording.id!, { isFavorite: newFavoriteStatus });
      
      toast({
        title: newFavoriteStatus ? "Added to favorites" : "Removed from favorites",
        description: "Recording favorite status updated"
      });
      
      loadRecordings();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
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
            <h2 className="text-2xl font-bold mb-4">Recent Recordings</h2>
            
            {/* Filters and Search Row */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-2">
                <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="lastWeek">Last Week</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="favorites">Favorites</SelectItem>
                  </SelectContent>
                </Select>

                {filterType === 'custom' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>

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
            
            {filteredAndSearchedRecordings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || filterType !== 'recent' ? 'No recordings match your search or filter.' : 'No recordings yet. Start by making your first recording!'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedRecordings.map((recording) => (
                    <RecordingCard
                      key={recording.id}
                      recording={recording}
                      onPlay={() => setSelectedRecording(recording)}
                      onEdit={() => setSelectedRecording(recording)}
                      onDelete={handleDeleteRecording}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>

                {/* Pagination Controls - Now below the grid */}
                {showPagination && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink 
                                  onClick={() => setCurrentPage(pageNum)}
                                  isActive={currentPage === pageNum}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                      
                      <span className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredAndSearchedRecordings.length)} of {filteredAndSearchedRecordings.length} items
                      </span>
                    </div>

                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 items/page</SelectItem>
                        <SelectItem value="100">100 items/page</SelectItem>
                        <SelectItem value="250">250 items/page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 animate-gradient-shift hover:animate-gradient-shift-fast transition-all duration-300 border-0"
        onClick={() => setShowRecordingSheet(true)}
        style={{
          backgroundSize: '200% 200%'
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" x2="12" y1="19" y2="22"/>
          <line x1="8" x2="16" y1="22" y2="22"/>
        </svg>
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
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
};

export default Index;
