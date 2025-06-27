
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/AppHeader';
import { usePWA } from '@/hooks/usePWA';
import { useNavigate } from 'react-router-dom';

export default function Record() {
  const { isOnline, installPrompt, isInstalled, installApp } = usePWA();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        isOnline={isOnline}
        installPrompt={installPrompt}
        isInstalled={isInstalled}
        installApp={installApp}
        onBack={() => navigate('/')}
        showActions={false}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <p className="text-lg">Recording Interface would go here</p>
        </div>
      </div>
    </div>
  );
}
