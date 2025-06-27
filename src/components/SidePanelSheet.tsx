
import { Recording } from '@/lib/database';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RecordingDetailsPanel } from '@/components/RecordingDetailsPanel';

interface SidePanelSheetProps {
  recording: Recording | null;
  onClose: () => void;
  onDelete: (recording: Recording) => void;
  onRetry: (recording: Recording) => void;
  onSave: (recording: Recording, updates: Partial<Recording>) => void;
}

export const SidePanelSheet = ({ 
  recording, 
  onClose, 
  onDelete, 
  onRetry, 
  onSave 
}: SidePanelSheetProps) => {
  return (
    <Sheet open={!!recording} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Recording Details</SheetTitle>
        </SheetHeader>
        {recording && (
          <RecordingDetailsPanel 
            recording={recording}
            isOpen={!!recording}
            onClose={onClose}
            onDelete={onDelete}
            onRetry={onRetry}
            onSave={onSave}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
