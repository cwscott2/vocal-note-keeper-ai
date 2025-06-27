
import { useState, useEffect } from 'react';
import { Recording, db } from '@/lib/database';

interface UseRecordingsParams {
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  confidenceThreshold?: number;
  showOnlyFavorites?: boolean;
}

export const useRecordings = (params: UseRecordingsParams = {}) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = db.recordings.orderBy('createdAt');
      
      if (sortOrder === 'desc') {
        query = query.reverse();
      }

      if (params.showOnlyFavorites) {
        query = query.filter(r => r.isFavorite === true);
      }

      if (params.searchTerm) {
        query = query.filter(r => 
          r.title.toLowerCase().includes(params.searchTerm!.toLowerCase()) ||
          (r.transcriptMD && r.transcriptMD.toLowerCase().includes(params.searchTerm!.toLowerCase())) ||
          (r.summaryMD && r.summaryMD.toLowerCase().includes(params.searchTerm!.toLowerCase()))
        );
      }

      const allRecordings = await query.toArray();
      setTotalCount(allRecordings.length);

      const offset = (page - 1) * pageSize;
      const paginatedRecordings = allRecordings.slice(offset, offset + pageSize);
      
      setRecordings(paginatedRecordings);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, [params.searchTerm, params.startDate, params.endDate, params.confidenceThreshold, params.showOnlyFavorites, page, pageSize, sortOrder]);

  const favoriteRecording = async (id: string) => {
    try {
      const recording = await db.recordings.get(Number(id));
      if (recording) {
        await db.recordings.update(Number(id), { isFavorite: !recording.isFavorite });
        loadRecordings();
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const deleteRecording = async (id: string) => {
    try {
      await db.recordings.delete(Number(id));
      loadRecordings();
    } catch (err) {
      console.error('Error deleting recording:', err);
    }
  };

  return {
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
  };
};
