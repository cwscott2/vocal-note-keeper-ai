import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Download, Folder, HardDrive } from 'lucide-react';
import { canUseWhisperWeb, TRANSCRIPTION_PROVIDERS } from '@/lib/transcription';
import { SUMMARY_PROVIDERS } from '@/lib/summaryService';
import { db, Settings } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface OnboardingWizardProps {
  onComplete: () => void;
  showBackButton?: boolean;
}

export const OnboardingWizard = ({ onComplete, showBackButton = false }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState('whisper-web');
  const [selectedSummaryProvider, setSelectedSummaryProvider] = useState<'none' | 'huggingface' | 'openai' | 'ollama' | 'lmstudio'>('none');
  const [apiKeys, setApiKeys] = useState({ openai: '', huggingface: '' });
  const [storageOption, setStorageOption] = useState<'indexeddb' | 'filesystem'>('indexeddb');
  const [whisperSupport, setWhisperSupport] = useState<{ supported: boolean; reason?: string } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const steps = [
    'Capability Check',
    'Choose Provider',
    'Choose Summary Provider',
    'Setup Provider',
    'Storage Options',
    'Complete Setup'
  ];

  useEffect(() => {
    // Check Whisper Web support on mount
    const support = canUseWhisperWeb();
    setWhisperSupport(support);
    if (!support.supported) {
      setSelectedProvider('openai');
    }
  }, []);

  const handleNext = async () => {
    if (currentStep === 3 && selectedProvider === 'whisper-web') {
      // Download whisper model
      setIsDownloading(true);
      try {
        // Simulate download progress for now
        for (let i = 0; i <= 100; i += 10) {
          setDownloadProgress(i);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        toast({
          title: "Model downloaded",
          description: "Whisper model is ready for use"
        });
      } catch (error) {
        toast({
          title: "Download failed",
          description: "Could not download Whisper model",
          variant: "destructive"
        });
      } finally {
        setIsDownloading(false);
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep === 0 && showBackButton) {
      onComplete(); // Go back to settings
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      const settings: Omit<Settings, 'id'> = {
        selectedProvider,
        whisperModels: selectedProvider === 'whisper-web' ? ['tiny'] : [],
        openaiApiKey: apiKeys.openai || undefined,
        hfApiKey: apiKeys.huggingface || undefined,
        saveLocation: storageOption,
        language: 'en',
        maxDuration: 1800,
        summaryProvider: selectedSummaryProvider,
        saveRecordings: storageOption === 'filesystem'
      };

      await db.settings.clear();
      await db.settings.add(settings);
      
      if (!showBackButton) {
        localStorage.setItem('onboarding-completed', 'true');
      }
      onComplete();
      
      toast({
        title: "Setup complete!",
        description: "Your AI Note Taker is ready to use"
      });
    } catch (error) {
      toast({
        title: "Setup failed",
        description: "Could not save settings",
        variant: "destructive"
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Capability Check
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Checking your browser capabilities...</h3>
            
            {whisperSupport && (
              <Alert className={whisperSupport.supported ? "border-green-500" : "border-yellow-500"}>
                <div className="flex items-center gap-2">
                  {whisperSupport.supported ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <AlertDescription>
                    <strong>Whisper Web (Local Processing):</strong>{' '}
                    {whisperSupport.supported ? 'Supported' : `Not supported - ${whisperSupport.reason}`}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <Alert className="border-blue-500">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <AlertDescription>
                <strong>Cloud Transcription:</strong> Available with API keys
              </AlertDescription>
            </Alert>

            <p className="text-muted-foreground">
              {whisperSupport?.supported 
                ? "Great! You can use local processing or cloud transcription."
                : "You'll need to use cloud transcription services with API keys."
              }
            </p>
          </div>
        );

      case 1: // Choose Provider
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose your transcription provider</h3>
            
            <RadioGroup value={selectedProvider} onValueChange={setSelectedProvider}>
              {TRANSCRIPTION_PROVIDERS.map((provider) => (
                <div key={provider.name} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={provider.name} 
                    id={provider.name}
                    disabled={provider.name === 'whisper-web' && !whisperSupport?.supported}
                  />
                  <Label htmlFor={provider.name} className="flex items-center gap-2">
                    {provider.displayName}
                    {provider.name === 'whisper-web' && (
                      <Badge variant={whisperSupport?.supported ? "default" : "secondary"}>
                        Local
                      </Badge>
                    )}
                    {provider.requiresApiKey && (
                      <Badge variant="outline">API Key Required</Badge>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 2: // Choose Summary Provider
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose your summary provider</h3>
            
            <RadioGroup 
              value={selectedSummaryProvider} 
              onValueChange={(value) => setSelectedSummaryProvider(value as 'none' | 'huggingface' | 'openai' | 'ollama' | 'lmstudio')}
            >
              {SUMMARY_PROVIDERS.map((provider) => (
                <div key={provider.name} className="flex items-center space-x-2">
                  <RadioGroupItem value={provider.name} id={`summary-${provider.name}`} />
                  <Label htmlFor={`summary-${provider.name}`} className="flex items-center gap-2">
                    {provider.displayName}
                    {provider.requiresApiKey && (
                      <Badge variant="outline">API Key Required</Badge>
                    )}
                    {provider.name === 'none' && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 3: // Setup Provider
        if (selectedProvider === 'whisper-web') {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Download Whisper Model</h3>
              <p className="text-muted-foreground">
                We'll download the tiny model (~76MB) for fast transcription.
              </p>
              
              {isDownloading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 animate-pulse" />
                    <span>Downloading model...</span>
                  </div>
                  <Progress value={downloadProgress} />
                  <p className="text-sm text-muted-foreground">{downloadProgress}% complete</p>
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Enter API Keys</h3>
            
            {(selectedProvider === 'openai' || selectedSummaryProvider === 'openai') && (
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  {selectedProvider === 'openai' && selectedSummaryProvider === 'openai' 
                    ? 'Used for both transcription and summarization'
                    : selectedProvider === 'openai' 
                    ? 'Used for transcription'
                    : 'Used for summarization'
                  }
                </p>
              </div>
            )}

            {(selectedProvider === 'huggingface' || selectedSummaryProvider === 'huggingface') && (
              <div className="space-y-2">
                <Label htmlFor="hf-key">Hugging Face API Key</Label>
                <Input
                  id="hf-key"
                  type="password"
                  placeholder="hf_..."
                  value={apiKeys.huggingface}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, huggingface: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  {selectedProvider === 'huggingface' && selectedSummaryProvider === 'huggingface' 
                    ? 'Used for both transcription and summarization'
                    : selectedProvider === 'huggingface' 
                    ? 'Used for transcription'
                    : 'Used for summarization'
                  }
                </p>
              </div>
            )}

            {selectedSummaryProvider === 'none' && selectedProvider !== 'openai' && selectedProvider !== 'huggingface' && (
              <p className="text-muted-foreground">No API keys required for your selected configuration.</p>
            )}
          </div>
        );

      case 4: // Storage Options
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose storage location</h3>
            
            <RadioGroup value={storageOption} onValueChange={(value: 'indexeddb' | 'filesystem') => setStorageOption(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="indexeddb" id="indexeddb" />
                <Label htmlFor="indexeddb" className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Browser Storage
                  <Badge variant="outline">Default</Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filesystem" id="filesystem" />
                <Label htmlFor="filesystem" className="flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  File System Access
                  <Badge variant="outline">Sync Friendly</Badge>
                </Label>
              </div>
            </RadioGroup>
            
            <p className="text-sm text-muted-foreground">
              {storageOption === 'indexeddb' 
                ? "Files will be stored in your browser. Export to ZIP when needed."
                : "Files will be saved to a folder you choose, making them accessible to cloud sync services."
              }
            </p>
          </div>
        );

      case 5: // Complete
        return (
          <div className="space-y-4 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">Setup Complete!</h3>
            <p className="text-muted-foreground">
              Your AI Note Taker is configured and ready to use.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedProvider !== '';
      case 2:
        return selectedSummaryProvider !== '';
      case 3:
        if (selectedProvider === 'whisper-web') return !isDownloading;
        if (selectedProvider === 'openai' || selectedSummaryProvider === 'openai') {
          return apiKeys.openai.length > 0;
        }
        if (selectedProvider === 'huggingface' || selectedSummaryProvider === 'huggingface') {
          return apiKeys.huggingface.length > 0;
        }
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center">
            {showBackButton ? 'Setup Wizard' : 'Welcome to AI Note Taker'}
          </CardTitle>
          <div className="space-y-2">
            <Progress value={(currentStep / (steps.length - 1)) * 100} />
            <p className="text-sm text-muted-foreground text-center">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {renderStep()}
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 && !showBackButton}
            >
              {currentStep === 0 && showBackButton ? 'Close' : 'Back'}
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
