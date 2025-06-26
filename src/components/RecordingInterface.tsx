
import { useState } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Square, Play, Pause, Upload, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface RecordingInterfaceProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  maxDuration: number;
}

const ALLOWED_TYPES = {
  openai: ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'],
  huggingface: ['.mp3', '.wav', '.flac']
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_DURATION = 25 * 60; // 25 minutes

export const RecordingInterface = ({ onRecordingComplete, maxDuration }: RecordingInterfaceProps) => {
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording } = useAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = async () => {
    setIsProcessing(true);
    const audioBlob = await stopRecording();
    if (audioBlob) {
      const processedBlob = await processAudioBlob(audioBlob);
      onRecordingComplete(processedBlob, state.duration);
    }
    setIsProcessing(false);
  };

  const processAudioBlob = async (blob: Blob): Promise<Blob> => {
    try {
      // Create audio context for processing
      const audioContext = new AudioContext();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to mono if stereo
      let processedBuffer = audioBuffer;
      if (audioBuffer.numberOfChannels > 1) {
        const monoBuffer = audioContext.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
        const monoData = monoBuffer.getChannelData(0);
        
        // Mix down to mono
        for (let i = 0; i < audioBuffer.length; i++) {
          let sum = 0;
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            sum += audioBuffer.getChannelData(channel)[i];
          }
          monoData[i] = sum / audioBuffer.numberOfChannels;
        }
        processedBuffer = monoBuffer;
      }
      
      // For now, return original blob - full audio processing would require additional libraries
      return blob;
    } catch (error) {
      console.error('Error processing audio:', error);
      return blob; // Return original on error
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size must be less than 25MB. Current size: ${(file.size / (1024 * 1024)).toFixed(1)}MB` };
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const allAllowedTypes = [...ALLOWED_TYPES.openai, ...ALLOWED_TYPES.huggingface];
    
    if (!allAllowedTypes.includes(fileExtension)) {
      return { 
        valid: false, 
        error: `Unsupported file type. Allowed: ${allAllowedTypes.join(', ')}` 
      };
    }

    return { valid: true };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setUploadError(null);
    
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error!);
      return;
    }

    try {
      setIsProcessing(true);
      
      // Get audio duration
      const audio = document.createElement('audio');
      const audioUrl = URL.createObjectURL(file);
      audio.src = audioUrl;
      
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve;
        audio.onerror = reject;
      });
      
      const duration = Math.floor(audio.duration);
      URL.revokeObjectURL(audioUrl);
      
      if (duration > MAX_DURATION) {
        setUploadError(`Recording duration must be less than 25 minutes. Current duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`);
        return;
      }
      
      const processedBlob = await processAudioBlob(file);
      onRecordingComplete(processedBlob, duration);
      
      // Clear the input
      event.target.value = '';
    } catch (error) {
      console.error('Error processing uploaded file:', error);
      setUploadError('Failed to process audio file. Please try a different file.');
    } finally {
      setIsProcessing(false);
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
    <div className="space-y-6">
      {/* Record Audio - First Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Record Audio
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Max duration: {formatTime(maxDuration)}
          </p>
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

      {/* Upload Audio - Second Card */}
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
              accept=".mp3,.wav,.flac,.mp4,.mpeg,.mpga,.m4a,.webm"
              onChange={handleFileUpload}
              className="hidden"
              id="audio-upload"
              disabled={isProcessing}
            />
            <label htmlFor="audio-upload" className={cn("cursor-pointer", isProcessing && "pointer-events-none opacity-50")}>
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
          
          {uploadError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <p><strong>Supported formats:</strong> MP3, WAV, FLAC, MP4, MPEG, MPGA, M4A, WebM</p>
            <p><strong>Limits:</strong> Max 25MB, Max 25 minutes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
