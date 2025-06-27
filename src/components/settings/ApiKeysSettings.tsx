
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { Settings } from '@/lib/database';
import { OpenAIKeyGuide } from '@/components/guides/OpenAIKeyGuide';
import { HuggingFaceKeyGuide } from '@/components/guides/HuggingFaceKeyGuide';

interface ApiKeysSettingsProps {
  settings: Settings | null;
  onUpdateSettings: (updates: Partial<Settings>) => void;
}

export const ApiKeysSettings = ({ settings, onUpdateSettings }: ApiKeysSettingsProps) => {
  const [openAIGuideOpen, setOpenAIGuideOpen] = useState(false);
  const [hfGuideOpen, setHfGuideOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="openai-key">OpenAI API Key</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpenAIGuideOpen(true)}
            className="h-auto p-1"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
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
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="hf-key">Hugging Face API Key</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHfGuideOpen(true)}
            className="h-auto p-1"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
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

      <OpenAIKeyGuide 
        open={openAIGuideOpen}
        onOpenChange={setOpenAIGuideOpen}
      />
      
      <HuggingFaceKeyGuide 
        open={hfGuideOpen}
        onOpenChange={setHfGuideOpen}
      />
    </div>
  );
};
