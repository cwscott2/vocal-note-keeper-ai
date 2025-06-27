
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings } from '@/lib/database';

interface ApiKeysSettingsProps {
  settings: Settings | null;
  onUpdateSettings: (updates: Partial<Settings>) => void;
}

export const ApiKeysSettings = ({ settings, onUpdateSettings }: ApiKeysSettingsProps) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="openai-key">OpenAI API Key</Label>
        <Input
          id="openai-key"
          type="password"
          placeholder="sk-..."
          value={settings?.openaiApiKey || ''}
          onChange={(e) => onUpdateSettings({ openaiApiKey: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Used for OpenAI Whisper transcription and/or summarization
        </p>
      </div>
      <div>
        <Label htmlFor="hf-key">Hugging Face API Key</Label>
        <Input
          id="hf-key"
          type="password"
          placeholder="hf_..."
          value={settings?.huggingfaceApiKey || ''}
          onChange={(e) => onUpdateSettings({ huggingfaceApiKey: e.target.value })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Used for Hugging Face Whisper models and/or summarization
        </p>
      </div>
    </div>
  );
};
