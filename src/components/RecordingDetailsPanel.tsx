
import { useState, useRef, useEffect } from 'react';
import { Recording, db } from '@/lib/database';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Play, Pause, Trash2, RotateCcw, Volume2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/timeUtils';
import { toast } from '@/hooks/use-toast';

interface RecordingDetailsPanelProps {
  recording: Recording | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (recording: Recording) => void;
  onRetry: (recording: Recording) => void;
  onSave: (recording: Recording, updates: Partial<Recording>) => void;
}

export const RecordingDetailsPanel = ({
  recording,
  isOpen,
  onClose,
  onDelete,
  onRetry,
  onSave
}: RecordingDetailsPanelProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editedSummary, setEditedSummary] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [defaultTab, setDefaultTab] = useState('summary');
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (recording) {
      setEditedSummary(recording.summaryMD || '');
      setEditedTranscript(recording.transcriptMD || '');
      
      // Default to transcript tab if no summary is available
      if (!recording.summaryMD || recording.summaryMD.trim() === '') {
        setDefaultTab('transcript');
      } else {
        setDefaultTab('summary');
      }
      
      loadAudioBlob();
    }
  }, [recording]);

  const loadAudioBlob = async () => {
    if (!recording) return;
    
    try {
      const audioData = await db.audioBlobs.get(recording.audioBlobHandle);
      if (audioData) {
        setAudioBlob(audioData.blob);
      }
    } catch (error) {
      console.error('Error loading audio blob:', error);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSaveChanges = () => {
    if (recording) {
      onSave(recording, {
        summaryMD: editedSummary,
        transcriptMD: editedTranscript
      });
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    return null;
  };

  if (!recording) return null;

  const hasAudio = audioBlob !== null && isFinite(duration) && !isNaN(duration) && duration > 0;
  const hasSummary = recording.summaryMD && recording.summaryMD.trim() !== '';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between text-left">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg">{recording.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(recording.provider)}
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(recording.createdAt)}
                </span>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Audio Player - Only show if audio is available and valid */}
          {hasAudio && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  className="flex-shrink-0"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-100"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              </div>
              
              <audio
                ref={audioRef}
                src={audioBlob ? URL.createObjectURL(audioBlob) : undefined}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {(recording.provider === 'pending' || recording.provider === 'failed') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(recording)}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>

          {/* Content Tabs */}
          <Tabs value={defaultTab} onValueChange={setDefaultTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="mt-4">
              <Textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                placeholder={hasSummary ? "Summary will appear here..." : "No summary available. Check summary settings or switch to transcript tab."}
                className="min-h-[300px] resize-none"
              />
            </TabsContent>
            
            <TabsContent value="transcript" className="mt-4">
              <Textarea
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                placeholder="Transcript will appear here..."
                className="min-h-[300px] resize-none"
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onDelete(recording)}
              className="border-red-500 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleSaveChanges}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
