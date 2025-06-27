
import { useState, useEffect, useCallback } from 'react';
import { RecordingCard } from '@/components/RecordingCard';
import { useRecordings } from '@/hooks/useRecordings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Mic } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { AppHeader } from '@/components/AppHeader';
import { SidePanelSheet } from '@/components/SidePanelSheet';
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
        {/* Filters Section */}
        <div className="mb-6 space-y-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
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
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal flex-1",
                        !dateRange[0] && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange[0] ? format(dateRange[0], "PPP") : <span>Start date</span>}
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
                        "justify-start text-left font-normal flex-1",
                        !dateRange[1] && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange[1] ? format(dateRange[1], "PPP") : <span>End date</span>}
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

            {/* Show Only Favorites */}
            <div className="flex items-center space-x-2">
              <Switch
                id="favorites"
                checked={showOnlyFavorites}
                onCheckedChange={setShowOnlyFavorites}
              />
              <Label htmlFor="favorites">
                Show Only Favorites
              </Label>
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

        {/* Floating Action Button */}
        <button
          onClick={onOpenRecording}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 via-blue-600 to-indigo-600 group"
          aria-label="Start new recording"
        >
          <Mic className="w-6 h-6 text-white stroke-[1.25] group-hover:scale-110 transition-transform duration-200" />
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
      {showRecordingInterface && (
        <div className="fixed inset-0 bg-background z-50">
          <div className="h-full flex flex-col">
            <div className="border-b p-4">
              <Button onClick={() => setShowRecordingInterface(false)} variant="outline">
                Close Recording
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p>Recording Interface would go here</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
