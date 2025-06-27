
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';
import { Settings } from '@/lib/database';
import { SUMMARY_PROVIDERS } from '@/lib/summaryService';
import { TestSummarizationDialog } from '@/components/TestSummarizationDialog';

interface SummarySettingsProps {
  settings: Settings | null;
  onUpdateSettings: (updates: Partial<Settings>) => void;
}

export const SummarySettings = ({ settings, onUpdateSettings }: SummarySettingsProps) => {
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [apiKeyDialog, setApiKeyDialog] = useState(false);

  const summaryEnabled = settings?.summaryProvider !== 'none' && settings?.summaryProvider;
  const hasOpenAIKey = settings?.openaiApiKey && settings.openaiApiKey.trim() !== '';

  const handleSummaryToggle = (enabled: boolean) => {
    if (enabled && !hasOpenAIKey) {
      setApiKeyDialog(true);
      return;
    }
    
    if (enabled) {
      onUpdateSettings({ summaryProvider: 'openai' });
    } else {
      onUpdateSettings({ summaryProvider: 'none' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable Summarization</Label>
          <p className="text-sm text-muted-foreground">
            Generate AI summaries of your recordings
          </p>
        </div>
        <Switch
          checked={summaryEnabled}
          onCheckedChange={handleSummaryToggle}
        />
      </div>

      {summaryEnabled && (
        <>
          {!hasOpenAIKey && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                OpenAI API Key required for summarization
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label>Model</Label>
            <Select
              value={settings?.summaryModel || 'gpt-4o-mini'}
              onValueChange={(value) => onUpdateSettings({ summaryModel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
                <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                <SelectItem value="gpt-4.1-mini">GPT-4.1 mini</SelectItem>
                <SelectItem value="gpt-4.1-nano">GPT-4.1 nano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {summaryEnabled && hasOpenAIKey && (
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setTestDialogOpen(true)}
        >
          Test Summarization
        </Button>
      )}

      <TestSummarizationDialog 
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
      />

      <Dialog open={apiKeyDialog} onOpenChange={setApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>OpenAI API Key Required</DialogTitle>
            <DialogDescription>
              You need to add your OpenAI API Key in the API Keys section before enabling summarization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setApiKeyDialog(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
