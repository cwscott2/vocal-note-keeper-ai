
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings as SettingsIcon, Play, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { db, Settings as SettingsType } from '@/lib/database';
import { TRANSCRIPTION_PROVIDERS } from '@/lib/transcription';
import { SUMMARY_PROVIDERS } from '@/lib/summaryService';
import { checkWhisperWebSupport } from '@/lib/whisperWeb';
import { toast } from '@/hooks/use-toast';

interface SettingsPageProps {
  onLaunchWizard: () => void;
}

const Settings = ({ onLaunchWizard }: SettingsPageProps) => {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    loadSettings();
    calculateStorageUsage();
  }, []);

  const loadSettings = async () => {
    try {
      const allSettings = await db.settings.toArray();
      if (allSettings.length > 0) {
        setSettings(allSettings[0]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStorageUsage = async () => {
    try {
      const recordings = await db.recordings.toArray();
      const audioBlobs = await db.audioBlobs.toArray();
      let totalSize = 0;
      
      audioBlobs.forEach(blob => {
        totalSize += blob.blob.size;
      });
      
      // Convert to percentage (assuming 1GB limit for demo)
      const percentage = Math.min((totalSize / (1024 * 1024 * 1024)) * 100, 100);
      setStorageUsed(percentage);
    } catch (error) {
      console.error('Error calculating storage:', error);
    }
  };

  const updateSettings = async (updates: Partial<SettingsType>) => {
    if (!settings) return;
    
    setIsSaving(true);
    try {
      const updatedSettings = { ...settings, ...updates };
      await db.settings.update(settings.id!, updates);
      setSettings(updatedSettings);
      
      toast({
        title: "Settings saved",
        description: "Your changes have been saved successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getProviderModels = (provider: string) => {
    const providerInfo = TRANSCRIPTION_PROVIDERS.find(p => p.name === provider);
    return providerInfo?.models || [];
  };

  const getSummaryProviderModels = (provider: string) => {
    const providerInfo = SUMMARY_PROVIDERS.find(p => p.name === provider);
    return providerInfo?.models || [];
  };

  const whisperWebSupport = checkWhisperWebSupport();

  const handleSelectFolder = async () => {
    try {
      // @ts-ignore - FileSystemDirectoryHandle might not be in types
      const handle = await window.showDirectoryPicker();
      await updateSettings({ fileSystemHandle: handle });
      toast({
        title: "Folder selected",
        description: "Storage location updated successfully"
      });
    } catch (error) {
      console.error('Error selecting folder:', error);
      toast({
        title: "Error",
        description: "Failed to select folder",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your AI Note Taker preferences
          </p>
        </div>
        <Button onClick={onLaunchWizard} variant="outline">
          <Play className="w-4 h-4 mr-2" />
          Run Setup Wizard
        </Button>
      </div>

      <div className="space-y-6">
        {/* Transcription Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Transcription Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Provider</Label>
              <Select
                value={settings?.selectedProvider || ''}
                onValueChange={(value) => updateSettings({ selectedProvider: value })}
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
                onValueChange={(value) => updateSettings({ selectedModel: value })}
                disabled={!settings?.selectedProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {getProviderModels(settings?.selectedProvider || '').map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="language">Language</Label>
              <Select
                value={settings?.language || 'en'}
                onValueChange={(value) => updateSettings({ language: value })}
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

            <Button variant="outline" className="w-full">
              Test Transcription
            </Button>
          </CardContent>
        </Card>

        {/* Summary Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Summary Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Summary Provider</Label>
              <Select
                value={settings?.summaryProvider || 'none'}
                onValueChange={(value) => updateSettings({ summaryProvider: value as any })}
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
                    onChange={(e) => updateSettings({ ollamaUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ollama-model">Model</Label>
                  <Input
                    id="ollama-model"
                    placeholder="llama3.1:8b"
                    value={settings?.summaryModel || ''}
                    onChange={(e) => updateSettings({ summaryModel: e.target.value })}
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
                    onChange={(e) => updateSettings({ lmstudioUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lmstudio-model">Model</Label>
                  <Input
                    id="lmstudio-model"
                    placeholder="google/gemma-3-4b"
                    value={settings?.summaryModel || ''}
                    onChange={(e) => updateSettings({ summaryModel: e.target.value })}
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
                    onChange={(e) => updateSettings({ summaryModel: e.target.value })}
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
                    onValueChange={(value) => updateSettings({ summaryModel: value })}
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
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={settings?.openaiApiKey || ''}
                onChange={(e) => updateSettings({ openaiApiKey: e.target.value })}
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
                value={settings?.hfApiKey || ''}
                onChange={(e) => updateSettings({ hfApiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for Hugging Face Whisper models and/or summarization
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recording Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Recording Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Save Recordings</Label>
                <p className="text-xs text-muted-foreground">
                  Only enabled if File System is selected
                </p>
              </div>
              <Switch
                checked={settings?.saveRecordings || false}
                onCheckedChange={(checked) => updateSettings({ saveRecordings: checked })}
                disabled={settings?.saveLocation !== 'filesystem'}
              />
            </div>
            
            <div>
              <Label htmlFor="max-duration">Max Recording Duration (minutes)</Label>
              <Input
                id="max-duration"
                type="number"
                max={60}
                value={Math.floor((settings?.maxDuration || 1800) / 60)}
                onChange={(e) => updateSettings({ maxDuration: parseInt(e.target.value) * 60 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Recording will stop automatically after this
              </p>
              {settings?.maxDuration && settings.maxDuration > 1500 && settings?.selectedProvider !== 'openai' && (
                <Alert className="mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    The model {settings?.selectedModel} from {settings?.selectedProvider} only supports max 25 mins, audio will be chunked before getting processed
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Storage Used</Label>
                <span className="text-sm text-muted-foreground">{storageUsed.toFixed(1)}%</span>
              </div>
              <Progress value={storageUsed} className="w-full" />
            </div>
            
            <div>
              <Label>Storage Location</Label>
              <Select
                value={settings?.saveLocation || 'indexeddb'}
                onValueChange={(value: 'indexeddb' | 'filesystem') => updateSettings({ saveLocation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indexeddb">Browser Storage (IndexedDB)</SelectItem>
                  <SelectItem value="filesystem">File System</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose where to store your recordings and transcriptions
              </p>
            </div>

            {settings?.saveLocation === 'filesystem' && (
              <Button onClick={handleSelectFolder} variant="outline" className="w-full">
                Open Folder Selector
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={() => updateSettings({})} 
            disabled={isSaving}
            className="min-w-24"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
