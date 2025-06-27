import { useState, useEffect, useCallback } from 'react';
import { RecordingCard } from '@/components/RecordingCard';
import { useRecordings } from '@/hooks/useRecordings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Settings as SettingsIcon, Mic, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { SidePanel } from '@/components/SidePanel';

export default function Index() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const {
    recordings,
    isLoading,
    error,
    totalCount,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortOrder,
    setSortOrder,
    favoriteRecording,
    deleteRecording,
  } = useRecordings({
    searchTerm: debouncedSearchTerm,
    startDate: dateRange[0]?.toISOString() || undefined,
    endDate: dateRange[1]?.toISOString() || undefined,
    confidenceThreshold: confidenceThreshold / 100,
    showOnlyFavorites,
  });

  const onOpenRecording = () => {
    window.location.href = '/record';
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to the first page when changing page size
  };

  const handleSortOrderChange = (newSortOrder: 'asc' | 'desc') => {
    setSortOrder(newSortOrder);
  };

  const toggleFavorite = useCallback(
    (id: string) => {
      favoriteRecording(id);
    },
    [favoriteRecording]
  );

  const removeRecording = useCallback(
    (id: string) => {
      deleteRecording(id);
    },
    [deleteRecording]
  );

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Filters Section */}
      <Accordion type="single" collapsible className="mb-4">
        <AccordionItem value="filters">
          <AccordionTrigger>Filters</AccordionTrigger>
          <AccordionContent>
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
              <div>
                <Label>Date Range</Label>
                {/* Implement Date Range Picker here */}
                <Input
                  type="text"
                  placeholder="Date Range (Coming Soon)"
                  disabled
                />
              </div>

              {/* Confidence Threshold */}
              <div>
                <Label htmlFor="confidence">Confidence Threshold</Label>
                <Slider
                  id="confidence"
                  defaultValue={[confidenceThreshold]}
                  max={100}
                  step={1}
                  onValueChange={(value) => setConfidenceThreshold(value[0])}
                />
                <p className="text-sm text-muted-foreground">
                  Show recordings with confidence above {confidenceThreshold}%
                </p>
              </div>

              {/* Show Only Favorites */}
              <div className="md:col-span-3 flex items-center">
                <Switch
                  id="favorites"
                  checked={showOnlyFavorites}
                  onCheckedChange={setShowOnlyFavorites}
                />
                <Label htmlFor="favorites" className="ml-2">
                  Show Only Favorites
                </Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
        <div>
          <Button
            onClick={() => handleSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            variant="outline"
          >
            Sort by Date ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
          </Button>
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
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 via-blue-600 to-indigo-600 hover:animate-mesh-gradient-fast animate-mesh-gradient bg-size-400 group"
        aria-label="Start new recording"
      >
        <Mic className="w-6 h-6 text-white stroke-[1.25] group-hover:scale-110 transition-transform duration-200" />
      </button>

      {/* Side Panel */}
      <SidePanel />
    </div>
  );
}
