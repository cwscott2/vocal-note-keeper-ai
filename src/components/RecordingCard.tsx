
import { Recording } from '@/lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecordingCardProps {
  recording: Recording;
  onPlay: (recording: Recording) => void;
  onEdit: (recording: Recording) => void;
  onDelete: (recording: Recording) => void;
}

export const RecordingCard = ({ recording, onPlay, onEdit, onDelete }: RecordingCardProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (date: Date) => {
    const distance = formatDistanceToNow(date, { addSuffix: true });
    return distance
      .replace('about ', '')
      .replace(' minutes ago', 'm')
      .replace(' minute ago', 'm')
      .replace(' hours ago', 'h')
      .replace(' hour ago', 'h')
      .replace(' days ago', 'd')
      .replace(' day ago', 'd')
      .replace(' weeks ago', 'w')
      .replace(' week ago', 'w')
      .replace(' months ago', 'mo')
      .replace(' month ago', 'mo');
  };

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
    return null; // Don't show badge for completed transcriptions
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
            <span>{formatDuration(recording.duration)}</span>
            <span>{formatRelativeTime(recording.createdAt)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onPlay(recording);
          }}
          className="w-full"
        >
          <Play className="w-4 h-4 mr-2" />
          Open Details
        </Button>
      </CardContent>
    </Card>
  );
};
