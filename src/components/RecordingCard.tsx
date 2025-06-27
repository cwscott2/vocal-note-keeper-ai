
import { Recording } from '@/lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Heart } from 'lucide-react';
import { formatRelativeTime, formatDuration } from '@/lib/timeUtils';

interface RecordingCardProps {
  recording: Recording;
  onPlay: (recording: Recording) => void;
  onEdit: (recording: Recording) => void;
  onDelete: (recording: Recording) => void;
  onToggleFavorite: (recording: Recording) => void;
}

export const RecordingCard = ({ recording, onPlay, onToggleFavorite }: RecordingCardProps) => {
  const getStatusBadge = (provider: string) => {
    if (provider === 'pending') {
      return <Badge variant="secondary">Pending</Badge>;
    }
    if (provider === 'processing') {
      return <Badge variant="outline">Processing</Badge>;
    }
    if (provider === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return null;
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(recording);
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onPlay(recording)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2 flex-1 mr-2">{recording.title}</CardTitle>
          <button
            onClick={handleFavoriteClick}
            className="p-1 hover:bg-muted rounded-sm transition-colors"
          >
            <Heart 
              className={`w-4 h-4 ${recording.isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
            />
          </button>
        </div>
        <div className="space-y-2">
          {getStatusBadge(recording.provider)}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Play className="w-3 h-3" />
              <span>{formatDuration(recording.duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(recording.createdAt)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
