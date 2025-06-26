
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Copy, X } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Settings } from '@/lib/database';
import { transcribeWithOpenAI, transcribeWithHuggingFace, transcribeWithWhisperWeb } from '@/lib/transcription';
import { toast } from '@/hooks/use-toast';

interface TestTranscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings | null;
}

export const TestTranscriptionDialog = ({ isOpen, onClose, settings }: TestTranscriptionDialogProps) => {
  const [stage, setStage] = useState<'recording' | 'transcribing' | 'success' | 'error'>('recording');
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState('');
  const { state, startRecording, stopRecording } = useAudioRecorder();

  const handleStartTest = async () => {
    await startRecording();
  };

  const handleStopTest = async () => {
    const audioBlob = await stopRecording();
    if (audioBlob && settings) {
      setStage('transcribing');
      
      try {
        let result = '';
        
        if (settings.selectedProvider === 'whisper-web') {
          result = await transcribeWithWhisperWeb(audioBlob, settings.selectedModel || 'tiny');
        } else if (settings.selectedProvider === 'openai' && settings.openaiApiKey) {
          result = await transcribeWithOpenAI(audioBlob, settings.openaiApiKey, settings.selectedModel);
        } else if (settings.selectedProvider === 'huggingface' && settings.hfApiKey) {
          result = await transcribeWithHuggingFace(audioBlob, settings.hfApiKey, settings.selectedModel || 'openai/whisper-large-v3');
        } else {
          throw new Error('No valid transcription provider configured');
        }
        
        setTranscription(result);
        setStage('success');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setStage('error');
      }
    }
  };

  const handleClose = () => {
    setStage('recording');
    setTranscription('');
    setError('');
    onClose();
  };

  const handleCopyError = () => {
    navigator.clipboard.writeText(error);
    toast({
      title: "Error copied",
      description: "Error message copied to clipboard"
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Test Transcription</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {stage === 'recording' && (
            <>
              <p className="text-sm text-muted-foreground">
                Record a short audio sample to test your transcription settings. Maximum 30 seconds.
              </p>
              
              {!state.isRecording ? (
                <Button onClick={handleStartTest} className="w-full">
                  Start Test Recording
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-mono">{formatTime(state.duration)}</div>
                    <div className="text-sm text-muted-foreground">/ 0:30</div>
                  </div>
                  
                  <Button 
                    onClick={handleStopTest} 
                    variant="destructive" 
                    className="w-full"
                    disabled={state.duration === 0}
                  >
                    Stop & Transcribe
                  </Button>
                </div>
              )}
            </>
          )}

          {stage === 'transcribing' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              <p>Transcribing using {settings?.selectedProvider}...</p>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          )}

          {stage === 'success' && (
            <>
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  Transcription completed successfully!
                </AlertDescription>
              </Alert>
              
              <div>
                <label className="text-sm font-medium">Result:</label>
                <code className="block mt-1 p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                  {transcription}
                </code>
              </div>
              
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </>
          )}

          {stage === 'error' && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Transcription failed. Please check your settings and try again.
                </AlertDescription>
              </Alert>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Error Details:</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyError}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <code className="block p-3 bg-muted rounded text-sm whitespace-pre-wrap text-red-600">
                  {error}
                </code>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
                <Button onClick={() => setStage('recording')} className="flex-1">
                  Retry
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
