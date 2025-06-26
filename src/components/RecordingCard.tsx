
import { Recording } from '@/lib/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Edit, Trash2 } from 'lucide-react';
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{recording.title}</CardTitle>
          <Badge variant="secondary" className="ml-2">
            {recording.provider}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{formatDuration(recording.duration)}</span>
          <span>{formatDistanceToNow(recording.createdAt, { addSuffix: true })}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPlay(recording)}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            Play
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(recording)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(recording)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
