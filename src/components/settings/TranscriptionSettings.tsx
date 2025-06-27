import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { Settings } from '@/lib/database';
import { TRANSCRIPTION_PROVIDERS } from '@/lib/transcription';
import { checkWhisperWebSupport } from '@/lib/whisperWeb';
import { TestTranscriptionDialog } from '@/components/TestTranscriptionDialog';

interface TranscriptionSettingsProps {
  settings: Settings | null;
  onUpdateSettings: (updates: Partial<Settings>) => void;
}

export const TranscriptionSettings = ({ settings, onUpdateSettings }: TranscriptionSettingsProps) => {
  const [showTestDialog, setShowTestDialog] = useState(false);

  const getProviderModels = (provider: string) => {
    const providerInfo = TRANSCRIPTION_PROVIDERS.find(p => p.name === provider);
    return providerInfo?.models || [];
  };

  const whisperWebSupport = checkWhisperWebSupport();

  // Set default model when provider changes
  const handleProviderChange = (provider: string) => {
    const defaultModel = provider === 'openai' ? 'whisper-1' : 
                        provider === 'huggingface' ? 'openai/whisper-large-v3-turbo' :
                        'tiny';
    onUpdateSettings({ 
      selectedProvider: provider,
      selectedModel: defaultModel 
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Provider</Label>
        <Select
          value={settings?.selectedProvider || ''}
          onValueChange={handleProviderChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select transcription provider" />
          </SelectTrigger>
          <SelectContent>
            {TRANSCRIPTION_PROVIDERS.map((provider) => (
              <SelectItem key={provider.name} value={provider.name}>
                <div className="flex items-center justify-between w-full">
                  <span>{provider.displayName}</span>
                  {provider.name === 'whisper-web' && (
                    <Badge variant={whisperWebSupport.supported ? "default" : "destructive"}>
                      {whisperWebSupport.supported ? "Available" : "Not Supported"}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {settings?.selectedProvider === 'whisper-web' && !whisperWebSupport.supported && (
          <p className="text-sm text-destructive mt-2">
            {whisperWebSupport.reason}. {whisperWebSupport.details}
          </p>
        )}
      </div>

      <div>
        <Label>Model</Label>
        <Select
          value={settings?.selectedModel || ''}
          onValueChange={(value) => onUpdateSettings({ selectedModel: value })}
          disabled={!settings?.selectedProvider}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {getProviderModels(settings?.selectedProvider || '').map((model) => (
              <SelectItem key={model} value={model}>
                {model === 'whisper-1' ? 'Whisper' : 
                 model === 'gpt-4o-mini' ? 'GPT-4o Mini Transcribe' :
                 model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="language">Language</Label>
        <Select
          value={settings?.language || 'en'}
          onValueChange={(value) => onUpdateSettings({ language: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Autodetect</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
            <SelectItem value="it">Italian</SelectItem>
            <SelectItem value="pt">Portuguese</SelectItem>
          </SelectContent>
        </Select>
        {settings?.language === 'auto' && settings?.selectedProvider !== 'openai' && (
          <Alert className="mt-2">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Autodetect requires OpenAI provider
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => setShowTestDialog(true)}
        disabled={!settings?.selectedProvider}
      >
        Test Transcription
      </Button>

      <TestTranscriptionDialog
        isOpen={showTestDialog}
        onClose={() => setShowTestDialog(false)}
        settings={settings}
      />
    </div>
  );
};
