
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

  return (
    <div className="space-y-4">
      <div>
        <Label>Summary Provider</Label>
        <Select
          value={settings?.summaryProvider || 'none'}
          onValueChange={(value) => onUpdateSettings({ summaryProvider: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUMMARY_PROVIDERS.map((provider) => (
              <SelectItem key={provider.name} value={provider.name}>
                {provider.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {settings?.summaryProvider === 'openai' && (
        <>
          {!settings?.openaiApiKey && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                OpenAI API Key required for this
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

      {settings?.summaryProvider === 'lmstudio' && (
        <>
          <div>
            <Label htmlFor="lmstudio-server-url">Server URL & Port</Label>
            <Input
              id="lmstudio-server-url"
              placeholder="http://192.168.0.11:1234"
              value={settings?.lmstudioServerUrl || ''}
              onChange={(e) => onUpdateSettings({ lmstudioServerUrl: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="lmstudio-model">Model</Label>
            <Input
              id="lmstudio-model"
              placeholder="lmstudio-community/gemma-3-1B-it-qat-GGUF"
              value={settings?.summaryModel || ''}
              onChange={(e) => onUpdateSettings({ summaryModel: e.target.value })}
              required
            />
          </div>
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Make sure LM Studio is running with the model loaded
            </AlertDescription>
          </Alert>
        </>
      )}

      {settings?.summaryProvider !== 'none' && (
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
    </div>
  );
};
