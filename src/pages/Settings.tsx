
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Play, RefreshCw } from 'lucide-react';
import { db, Settings as SettingsType } from '@/lib/database';
import { TRANSCRIPTION_PROVIDERS } from '@/lib/transcription';
import { checkWhisperWebSupport } from '@/lib/whisperWeb';
import { toast } from '@/hooks/use-toast';

interface SettingsPageProps {
  onLaunchWizard: () => void;
}

const Settings = ({ onLaunchWizard }: SettingsPageProps) => {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
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

  const whisperWebSupport = checkWhisperWebSupport();

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
            <CardTitle>Transcription Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Selected Provider</Label>
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
                Used for OpenAI Whisper transcription
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
                Used for Hugging Face Whisper models
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
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max-duration">Max Recording Duration (minutes)</Label>
              <Select
                value={settings?.maxDuration?.toString() || '30'}
                onValueChange={(value) => updateSettings({ maxDuration: parseInt(value) * 60 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="900">15 minutes</SelectItem>
                  <SelectItem value="1800">30 minutes</SelectItem>
                  <SelectItem value="3600">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Storage Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <SelectItem value="filesystem">File System Access API</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose where to store your recordings and transcriptions
              </p>
            </div>
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
