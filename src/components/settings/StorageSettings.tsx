
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Settings } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface StorageSettingsProps {
  settings: Settings | null;
  onUpdateSettings: (updates: Partial<Settings>) => void;
  storageUsed: number;
}

export const StorageSettings = ({ settings, onUpdateSettings, storageUsed }: StorageSettingsProps) => {
  const handleSelectFolder = async () => {
    try {
      // @ts-ignore - FileSystemDirectoryHandle might not be in types
      const handle = await window.showDirectoryPicker();
      await onUpdateSettings({ fileSystemHandle: handle });
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

  return (
    <div className="space-y-6">
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
          onValueChange={(value: 'indexeddb' | 'filesystem') => onUpdateSettings({ saveLocation: value })}
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
    </div>
  );
};
