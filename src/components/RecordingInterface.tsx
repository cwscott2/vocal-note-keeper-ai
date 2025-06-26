
import { useState } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Square, Play, Pause, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordingInterfaceProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  maxDuration: number;
}

export const RecordingInterface = ({ onRecordingComplete, maxDuration }: RecordingInterfaceProps) => {
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording } = useAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = async () => {
    setIsProcessing(true);
    const audioBlob = await stopRecording();
    if (audioBlob) {
      onRecordingComplete(audioBlob, state.duration);
    }
    setIsProcessing(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav'))) {
      onRecordingComplete(file, 0); // Duration will be calculated later
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (state.duration / maxDuration) * 100;
  const isNearLimit = progressPercentage > 90;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Record Audio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Record Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!state.isRecording ? (
            <Button
              onClick={handleStartRecording}
              disabled={isProcessing}
              className="w-full h-16 text-lg"
              variant="default"
            >
              <Mic className="w-6 h-6 mr-2" />
              Start Recording
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  onClick={state.isPaused ? resumeRecording : pauseRecording}
                  variant="outline"
                  size="lg"
                >
                  {state.isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </Button>
                <Button
                  onClick={handleStopRecording}
                  variant="destructive"
                  size="lg"
                  disabled={isProcessing}
                >
                  <Square className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="text-center space-y-2">
                <div className={cn("text-2xl font-mono", isNearLimit && "text-red-500")}>
                  {formatTime(state.duration)}
                </div>
                <Progress value={progressPercentage} className="w-full" />
                <div className="text-sm text-muted-foreground">
                  {formatTime(maxDuration - state.duration)} remaining
                </div>
              </div>

              {/* Audio Level Indicator */}
              <div className="flex items-center justify-center">
                <div className="flex space-x-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2 h-8 rounded-full transition-colors",
                        state.audioLevel * 10 > i ? "bg-green-500" : "bg-gray-200"
                      )}
                    />
                  ))}
                </div>
              </div>
              
              {state.isPaused && (
                <div className="text-center text-yellow-600 font-medium">
                  Recording Paused
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Audio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Audio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept="audio/*,.mp3,.wav"
              onChange={handleFileUpload}
              className="hidden"
              id="audio-upload"
            />
            <label htmlFor="audio-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Drop audio file here</p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to select
              </p>
              <Button variant="outline" asChild>
                <span>Choose File</span>
              </Button>
            </label>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Supports MP3, WAV, and other audio formats
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
