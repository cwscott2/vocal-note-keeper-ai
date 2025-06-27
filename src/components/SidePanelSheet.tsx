
import { Recording } from '@/lib/database';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RecordingDetailsPanel } from '@/components/RecordingDetailsPanel';

interface SidePanelSheetProps {
  recording: Recording | null;
  onClose: () => void;
}

export const SidePanelSheet = ({ recording, onClose }: SidePanelSheetProps) => {
  return (
    <Sheet open={!!recording} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Recording Details</SheetTitle>
        </SheetHeader>
        {recording && (
          <RecordingDetailsPanel recording={recording} />
        )}
      </SheetContent>
    </Sheet>
  );
};
