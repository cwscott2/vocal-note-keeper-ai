
import { useState } from 'react';
import { Recording } from '@/lib/database';
import { SidePanelSheet } from './SidePanelSheet';

export const SidePanel = () => {
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  const handleClose = () => {
    setSelectedRecording(null);
  };

  const handleDelete = (recording: Recording) => {
    // Handle delete logic here
    console.log('Delete recording:', recording);
    handleClose();
  };

  const handleRetry = (recording: Recording) => {
    // Handle retry logic here
    console.log('Retry recording:', recording);
  };

  const handleSave = (recording: Recording, updates: Partial<Recording>) => {
    // Handle save logic here
    console.log('Save recording:', recording, updates);
  };

  const handleToggleFavorite = (recording: Recording) => {
    // Handle toggle favorite logic here
    console.log('Toggle favorite:', recording);
  };

  return (
    <SidePanelSheet
      recording={selectedRecording}
      onClose={handleClose}
      onDelete={handleDelete}
      onRetry={handleRetry}
      onSave={handleSave}
      onToggleFavorite={handleToggleFavorite}
    />
  );
};
