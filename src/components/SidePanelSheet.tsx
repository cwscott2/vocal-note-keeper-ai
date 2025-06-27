import { useState, useEffect } from 'react';
import { Recording } from '@/lib/database';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Pause, 
  Download, 
  Edit2, 
  Save, 
  X, 
  Trash2, 
  RefreshCw,
  Clock,
  Calendar,
  Mic,
  Heart
} from 'lucide-react';
import { formatDuration, formatRelativeTime } from '@/lib/timeUtils';
import { toast } from '@/hooks/use-toast';

interface SidePanelSheetProps {
  recording: Recording | null;
  onClose: () => void;
  onDelete: (recording: Recording) => void;
  onRetry: (recording: Recording) => void;
  onSave: (recording: Recording, updates: Partial<Recording>) => void;
  onToggleFavorite: (recording: Recording) => void;
}

export const SidePanelSheet = ({ 
  recording, 
  onClose, 
  onDelete, 
  onRetry, 
  onSave,
  onToggleFavorite 
}: SidePanelSheetProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (recording) {
      setEditedTitle(recording.title);
      setEditedTranscript(recording.transcriptMD || '');
      setEditedSummary(recording.summaryMD || '');
    }
  }, [recording]);

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
    };
  }, [currentAudio]);

  const handlePlay = async () => {
    if (!recording) return;

    try {
      if (isPlaying && currentAudio) {
        currentAudio.pause();
        setIsPlaying(false);
        return;
      }

      // Get audio blob from database
      const { db } = await import('@/lib/database');
      const audioData = await db.audioBlobs.get(recording.audioBlobHandle);
      
      if (!audioData) {
        toast({
          title: "Error",
          description: "Audio file not found",
          variant: "destructive"
        });
        return;
      }

      // Create audio URL and play
      const audioUrl = URL.createObjectURL(audioData.blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to play audio",
          variant: "destructive"
        });
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setCurrentAudio(audio);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "Error",
        description: "Failed to play audio",
        variant: "destructive"
      });
    }
  };

  const handleSave = () => {
    if (!recording) return;

    const updates: Partial<Recording> = {
      title: editedTitle,
      transcriptMD: editedTranscript,
      summaryMD: editedSummary
    };

    onSave(recording, updates);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (recording) {
      setEditedTitle(recording.title);
      setEditedTranscript(recording.transcriptMD || '');
      setEditedSummary(recording.summaryMD || '');
    }
    setIsEditing(false);
  };

  const handleDownload = async () => {
    if (!recording) return;

    try {
      const content = `# ${recording.title}

## Metadata
- **Created:** ${recording.createdAt.toLocaleString()}
- **Duration:** ${formatDuration(recording.duration)}
- **Provider:** ${recording.provider}
- **Language:** ${recording.language}
- **Favorite:** ${recording.isFavorite ? 'Yes' : 'No'}

## Transcript
${recording.transcriptMD || 'No transcript available'}

## Summary
${recording.summaryMD || 'No summary available'}
`;

      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recording.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: "Recording exported successfully"
      });
    } catch (error) {
      console.error('Error downloading:', error);
      toast({
        title: "Error",
        description: "Failed to download recording",
        variant: "destructive"
      });
    }
  };

  const getStatusInfo = (provider: string, processingStep?: string) => {
    if (provider === 'processing') {
      if (processingStep === 'transcribing') {
        return { label: 'Transcribing...', variant: 'outline' as const, color: 'text-blue-600' };
      } else if (processingStep === 'summarizing') {
        return { label: 'Summarizing...', variant: 'outline' as const, color: 'text-purple-600' };
      }
      return { label: 'Processing...', variant: 'outline' as const, color: 'text-blue-600' };
    }
    if (provider === 'failed') {
      return { label: 'Failed', variant: 'destructive' as const, color: 'text-red-600' };
    }
    return { label: 'Completed', variant: 'secondary' as const, color: 'text-green-600' };
  };

  if (!recording) return null;

  const statusInfo = getStatusInfo(recording.provider, recording.processingStep);

  return (
    <Sheet open={!!recording} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px] flex flex-col">
        <SheetHeader className="space-y-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="Recording title"
                />
              ) : (
                <SheetTitle className="text-xl leading-tight">{recording.title}</SheetTitle>
              )}
            </div>
            
            <button
              onClick={() => onToggleFavorite(recording)}
              className="p-2 hover:bg-muted rounded-sm transition-colors"
            >
              <Heart 
                className={`w-4 h-4 ${recording.isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
              />
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatRelativeTime(recording.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(recording.duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Mic className="w-4 h-4" />
              <span>{recording.language}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant={statusInfo.variant} className={statusInfo.color}>
              {statusInfo.label}
            </Badge>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlay}
                disabled={recording.provider === 'processing'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              
              {recording.provider === 'failed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(recording)}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>

          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel} size="sm">
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(recording)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </SheetHeader>

        <Separator className="my-6 flex-shrink-0" />

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6">
            {recording.summaryMD && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Summary</h3>
                {isEditing ? (
                  <Textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="min-h-[100px] max-h-[300px] resize-none"
                    placeholder="Summary content"
                  />
                ) : (
                  <ScrollArea className="max-h-[300px] w-full rounded-md border p-4">
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {recording.summaryMD}
                      </p>
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {recording.transcriptMD && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Transcript</h3>
                {isEditing ? (
                  <Textarea
                    value={editedTranscript}
                    onChange={(e) => setEditedTranscript(e.target.value)}
                    className="min-h-[200px] max-h-[400px] resize-none"
                    placeholder="Transcript content"
                  />
                ) : (
                  <ScrollArea className="max-h-[400px] w-full rounded-md border p-4">
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {recording.transcriptMD}
                      </p>
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {!recording.transcriptMD && !recording.summaryMD && recording.provider !== 'processing' && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No content available yet.</p>
                {recording.provider === 'failed' && (
                  <p className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRetry(recording)}
                      className="mt-2"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Try processing again
                    </Button>
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
