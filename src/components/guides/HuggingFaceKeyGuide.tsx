
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Key, User, Plus } from 'lucide-react';

interface HuggingFaceKeyGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HuggingFaceKeyGuide = ({ open, onOpenChange }: HuggingFaceKeyGuideProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Hugging Face API Key Setup Guide
          </DialogTitle>
          <DialogDescription>
            Follow these steps to get your Hugging Face API key for AI model access.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              Go to Hugging Face
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              Navigate to the Hugging Face website.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit huggingface.co
              </a>
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              Sign Up for Free Account
            </h3>
            <p className="text-sm text-muted-foreground">
              Create a free Hugging Face account if you don't have one.
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
              Access Your Profile
            </h3>
            <p className="text-sm text-muted-foreground">
              Click on your <User className="w-4 h-4 inline mx-1" /> profile icon in the top left corner.
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
              Go to Access Tokens
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Select "Access Tokens" from the dropdown menu</p>
              <p>• Enter your password if prompted</p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">5</span>
              Create New Token
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Click <Plus className="w-4 h-4 inline mx-1" /> "Create new token"</p>
              <p>• Select "Read" in the tabs</p>
              <p>• Enter "Token name" as "audionotes"</p>
              <p>• Click "Create token"</p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">6</span>
              Save Your Access Token
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• In the "Save your Access Token" dialogue</p>
              <p>• Click <Copy className="w-4 h-4 inline mx-1" /> "Copy" for the token</p>
              <p>• Paste it in the "Hugging Face API Key" field above</p>
            </div>
            <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <Key className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">Free tier includes generous API limits!</span>
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
