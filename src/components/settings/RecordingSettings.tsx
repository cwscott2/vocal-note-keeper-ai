
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Settings } from '@/lib/database';

interface RecordingSettingsProps {
  settings: Settings | null;
  onUpdateSettings: (updates: Partial<Settings>) => void;
}

export const RecordingSettings = ({ settings, onUpdateSettings }: RecordingSettingsProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Save Recordings</Label>
          <p className="text-xs text-muted-foreground">
            Only enabled if File System is selected
          </p>
        </div>
        <Switch
          checked={settings?.saveRecordings || false}
          onCheckedChange={(checked) => onUpdateSettings({ saveRecordings: checked })}
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
          onChange={(e) => onUpdateSettings({ maxDuration: parseInt(e.target.value) * 60 })}
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
    </div>
  );
};
