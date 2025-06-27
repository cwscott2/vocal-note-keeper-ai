
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Settings as SettingsIcon, WifiOff, Wifi, Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppHeaderProps {
  isOnline: boolean;
  installPrompt?: any;
  isInstalled: boolean;
  installApp: () => void;
  onOpenSettings?: () => void;
  onOpenRecording?: () => void;
  onBack?: () => void;
  showActions?: boolean;
}

export const AppHeader = ({ 
  isOnline, 
  installPrompt, 
  isInstalled, 
  installApp, 
  onOpenSettings, 
  onOpenRecording,
  onBack,
  showActions = true 
}: AppHeaderProps) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        {!isOnline && (
          <Alert className="mb-4 border-yellow-500">
            <WifiOff className="w-4 h-4" />
            <AlertDescription>
              You're offline. Some features may be limited.
            </AlertDescription>
          </Alert>
        )}
        
        {installPrompt && !isInstalled && (
          <Alert className="mb-4 border-blue-500">
            <Download className="w-4 h-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Install AI Note Taker for a better experience</span>
              <Button size="sm" onClick={installApp}>
                Install App
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={handleLogoClick}>
              <div className="flex items-center space-x-2">
                <Mic className="w-8 h-8 text-primary" />
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold hover:text-primary/80 transition-colors">AI Note Taker</h1>
                  <span className="text-xs text-muted-foreground -mt-1">by Outskill</span>
                </div>
              </div>
              {!isOnline && <WifiOff className="w-5 h-5 text-muted-foreground" />}
              {isOnline && <Wifi className="w-5 h-5 text-green-500" />}
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center space-x-2">
              {onOpenSettings && (
                <Button variant="outline" size="sm" onClick={onOpenSettings}>
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              )}
              {onOpenRecording && (
                <Button onClick={onOpenRecording}>
                  <Mic className="w-4 h-4 mr-2" />
                  New Recording
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
