
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { db } from '@/lib/database';
import { toast } from '@/hooks/use-toast';
import { downloadZip } from 'client-zip';

export const ExportSettings = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleExport = async () => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Get all recordings
      const recordings = await db.recordings.toArray();
      if (recordings.length === 0) {
        toast({
          title: "No data to export",
          description: "You don't have any recordings to export.",
          variant: "destructive"
        });
        return;
      }

      const files: Array<{ name: string; input: string | Blob; lastModified?: Date }> = [];
      
      // Process each recording
      for (let i = 0; i < recordings.length; i++) {
        if (controller.signal.aborted) break;
        
        const recording = recordings[i];
        const progress = ((i + 1) / recordings.length) * 100;
        setExportProgress(progress);

        // Add transcript as markdown file
        if (recording.transcriptMD) {
          files.push({
            name: `${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.md`,
            input: recording.transcriptMD,
            lastModified: recording.createdAt
          });
        }

        // Add summary as markdown file
        if (recording.summaryMD) {
          files.push({
            name: `${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}_summary.md`,
            input: recording.summaryMD,
            lastModified: recording.createdAt
          });
        }

        // Add audio file if available
        if (recording.audioBlobHandle) {
          try {
            const audioData = await db.audioBlobs.get(recording.audioBlobHandle);
            if (audioData) {
              files.push({
                name: `${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}_audio.webm`,
                input: audioData.blob,
                lastModified: recording.createdAt
              });
            }
          } catch (error) {
            console.error('Error loading audio for recording:', recording.title, error);
          }
        }
      }

      if (controller.signal.aborted || files.length === 0) {
        return;
      }

      // Create and download zip
      const zipBlob = await downloadZip(files).blob();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-note-taker-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export completed",
        description: `Successfully exported ${recordings.length} recordings`
      });

    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Export error:', error);
        toast({
          title: "Export failed",
          description: "There was an error exporting your data",
          variant: "destructive"
        });
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      toast({
        title: "Export cancelled",
        description: "Data export has been cancelled"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Data</CardTitle>
        <CardDescription>
          Download all your recordings, transcripts, and summaries as a ZIP file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Preparing export...</span>
              <span>{Math.round(exportProgress)}%</span>
            </div>
            <Progress value={exportProgress} />
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export All Data'}
          </Button>
          
          {isExporting && (
            <Button 
              variant="outline" 
              onClick={handleCancel}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
