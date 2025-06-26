
import { Recording } from '@/lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Clock } from 'lucide-react';
import { formatRelativeTime, formatDuration } from '@/lib/timeUtils';

interface RecordingCardProps {
  recording: Recording;
  onPlay: (recording: Recording) => void;
  onEdit: (recording: Recording) => void;
  onDelete: (recording: Recording) => void;
}

export const RecordingCard = ({ recording, onPlay }: RecordingCardProps) => {
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

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onPlay(recording)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{recording.title}</CardTitle>
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
