import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, ArrowLeft, Play } from 'lucide-react';
import { db, Settings as SettingsType } from '@/lib/database';
import { toast } from '@/hooks/use-toast';
import { TranscriptionSettings } from '@/components/settings/TranscriptionSettings';
import { SummarySettings } from '@/components/settings/SummarySettings';
import { ApiKeysSettings } from '@/components/settings/ApiKeysSettings';
import { RecordingSettings } from '@/components/settings/RecordingSettings';
import { StorageSettings } from '@/components/settings/StorageSettings';
import { AppHeader } from '@/components/AppHeader';
import { usePWA } from '@/hooks/usePWA';

interface SettingsPageProps {
  onLaunchWizard: () => void;
  onBack?: () => void;
}

const Settings = ({ onLaunchWizard, onBack }: SettingsPageProps) => {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);

  const { isOnline, installPrompt, isInstalled, installApp } = usePWA();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader
          isOnline={isOnline}
          installPrompt={installPrompt}
          isInstalled={isInstalled}
          installApp={installApp}
          showActions={false}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        isOnline={isOnline}
        installPrompt={installPrompt}
        isInstalled={isInstalled}
        installApp={installApp}
        showActions={false}
      />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground mt-2">
                Configure your AI Note Taker preferences
              </p>
            </div>
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
            <CardContent>
              <TranscriptionSettings 
                settings={settings} 
                onUpdateSettings={updateSettings}
              />
            </CardContent>
          </Card>

          {/* Summary Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Summary Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <SummarySettings 
                settings={settings} 
                onUpdateSettings={updateSettings}
              />
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <ApiKeysSettings 
                settings={settings} 
                onUpdateSettings={updateSettings}
              />
            </CardContent>
          </Card>

          {/* Recording Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Recording Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <RecordingSettings 
                settings={settings} 
                onUpdateSettings={updateSettings}
              />
            </CardContent>
          </Card>

          {/* Storage Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <StorageSettings 
                settings={settings} 
                onUpdateSettings={updateSettings}
                storageUsed={storageUsed}
              />
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
    </div>
  );
};

export default Settings;
