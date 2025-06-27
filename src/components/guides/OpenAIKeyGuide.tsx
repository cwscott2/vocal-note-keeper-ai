
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, CreditCard, Key, Settings, Plus } from 'lucide-react';

interface OpenAIKeyGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OpenAIKeyGuide = ({ open, onOpenChange }: OpenAIKeyGuideProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            OpenAI API Key Setup Guide
          </DialogTitle>
          <DialogDescription>
            Follow these steps to get your OpenAI API key for transcription and summarization.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              Create OpenAI Account
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              Sign up for an OpenAI account if you don't have one.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://auth.openai.com/create-account" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Sign up for OpenAI
              </a>
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              Go to OpenAI Platform
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              Navigate to the OpenAI platform documentation page.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://platform.openai.com/docs/overview" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Platform Docs
              </a>
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
              Access Settings
            </h3>
            <p className="text-sm text-muted-foreground">
              Click the <Settings className="w-4 h-4 inline mx-1" /> Settings icon in the platform.
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
              Add Billing Credits
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Go to "Billing" page</p>
              <p>• Click on "Add to credit balance"</p>
              <p>• Add credits to your account (minimum $5 recommended)</p>
            </div>
            <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <CreditCard className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">Credits are required to use the API</span>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">5</span>
              Create API Key
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Go to "API keys" section</p>
              <p>• Click <Plus className="w-4 h-4 inline mx-1" /> "Create new secret key"</p>
              <p>• Name it "audionotes"</p>
              <p>• Select "Default" project</p>
              <p>• Click "Create secret key"</p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">6</span>
              Save Your Key
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• In the "Save your key" dialogue</p>
              <p>• Click <Copy className="w-4 h-4 inline mx-1" /> "Copy" for the key</p>
              <p>• Paste it in the "OpenAI API Key" field above</p>
            </div>
            <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <Key className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800">Save this key - you won't be able to see it again!</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
