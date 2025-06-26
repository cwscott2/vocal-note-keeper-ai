
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Settings } from '@/lib/database';
import { SUMMARY_PROVIDERS } from '@/lib/summaryService';

interface SummarySettingsProps {
  settings: Settings | null;
  onUpdateSettings: (updates: Partial<Settings>) => void;
}

export const SummarySettings = ({ settings, onUpdateSettings }: SummarySettingsProps) => {
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

      {settings?.summaryProvider === 'ollama' && (
        <>
          <div>
            <Label htmlFor="ollama-url">Server URL & Port</Label>
            <Input
              id="ollama-url"
              placeholder="http://localhost:11434"
              value={settings?.ollamaUrl || ''}
              onChange={(e) => onUpdateSettings({ ollamaUrl: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="ollama-model">Model</Label>
            <Input
              id="ollama-model"
              placeholder="llama3.1:8b"
              value={settings?.summaryModel || ''}
              onChange={(e) => onUpdateSettings({ summaryModel: e.target.value })}
              required
            />
          </div>
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Ensure you've installed Ollama, downloaded, setup and are running a model.{' '}
              <a href="http://localhost:11434" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:underline">
                Detailed Guide here <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </AlertDescription>
          </Alert>
        </>
      )}

      {settings?.summaryProvider === 'lmstudio' && (
        <>
          <div>
            <Label htmlFor="lmstudio-url">Server URL & Port</Label>
            <Input
              id="lmstudio-url"
              placeholder="http://192.168.0.11:1234"
              value={settings?.lmstudioUrl || ''}
              onChange={(e) => onUpdateSettings({ lmstudioUrl: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="lmstudio-model">Model</Label>
            <Input
              id="lmstudio-model"
              placeholder="google/gemma-3-4b"
              value={settings?.summaryModel || ''}
              onChange={(e) => onUpdateSettings({ summaryModel: e.target.value })}
              required
            />
          </div>
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Ensure you've installed LM Studio, it is running & the model loaded. Detail Guide here
            </AlertDescription>
          </Alert>
        </>
      )}

      {settings?.summaryProvider === 'huggingface' && (
        <>
          {!settings?.hfApiKey && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                HuggingFace API key is not setup
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label htmlFor="hf-summary-model">Model</Label>
            <Input
              id="hf-summary-model"
              placeholder="Falconsai/text_summarization"
              value={settings?.summaryModel || 'Falconsai/text_summarization'}
              onChange={(e) => onUpdateSettings({ summaryModel: e.target.value })}
              required
            />
          </div>
        </>
      )}

      {settings?.summaryProvider === 'openai' && (
        <>
          {!settings?.openaiApiKey && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                OpenAI API key is not setup
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label>Model</Label>
            <Select
              value={settings?.summaryModel || 'gpt-4.1-nano'}
              onValueChange={(value) => onUpdateSettings({ summaryModel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT 4o-mini</SelectItem>
                <SelectItem value="gpt-4.1-nano">GPT 4.1-nano (Default)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {settings?.summaryProvider !== 'none' && (
        <Button variant="outline" className="w-full">
          Test Summarisation
        </Button>
      )}
    </div>
  );
};
