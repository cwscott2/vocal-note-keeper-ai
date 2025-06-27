
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { generateSummary } from '@/lib/summaryService';
import { db } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface TestSummarizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TestSummarizationDialog = ({ open, onOpenChange }: TestSummarizationDialogProps) => {
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = async () => {
    if (!transcript.trim()) {
      toast({
        title: "Error",
        description: "Please enter a transcript to summarize",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const settings = await db.settings.toArray();
      const currentSettings = settings[0];

      if (!currentSettings?.summaryProvider || currentSettings.summaryProvider === 'none') {
        throw new Error('No summary provider configured. Please configure a provider in settings.');
      }

      const summaryResult = await generateSummary(transcript, currentSettings);
      setResult(summaryResult);
    } catch (error) {
      console.error('Test summarization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Text copied to clipboard"
      });
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setTranscript('');
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Summarization</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result && !error && (
            <>
              <div>
                <Label htmlFor="transcript">Meeting Transcript</Label>
                <Textarea
                  id="transcript"
                  placeholder="Enter your meeting transcript here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={8}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSummarize} 
                  disabled={isLoading || !transcript.trim()}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Summarizing...
                    </>
                  ) : (
                    'Summarize'
                  )}
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Summary Generated Successfully</span>
              </div>

              <div>
                <Label>Title</Label>
                <code 
                  className="block p-3 bg-muted rounded cursor-pointer text-sm mt-2 hover:bg-muted/80 transition-colors"
                  onClick={() => handleCopy(result.title)}
                  title="Click to copy"
                >
                  {result.title}
                </code>
              </div>

              <div>
                <Label>Summary</Label>
                <code 
                  className="block p-3 bg-muted rounded cursor-pointer text-sm mt-2 hover:bg-muted/80 transition-colors whitespace-pre-wrap"
                  onClick={() => handleCopy(result.summary)}
                  title="Click to copy"
                >
                  {result.summary}
                </code>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleClose} className="flex-1">
                  Done
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Test Again
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Summarization Failed</span>
              </div>

              <div>
                <Label>Error Details</Label>
                <code 
                  className="block p-3 bg-muted rounded cursor-pointer text-sm mt-2 hover:bg-muted/80 transition-colors text-red-600"
                  onClick={() => handleCopy(error)}
                  title="Click to copy error details"
                >
                  {error}
                </code>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSummarize} variant="outline" className="flex-1">
                  Retry
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
