// src/components/simple-offline-indicator.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleOfflineIndicatorProps {
  className?: string;
}

export const SimpleOfflineIndicator: React.FC<SimpleOfflineIndicatorProps> = ({ 
  className 
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    // Initialize with current status
    setIsOnline(navigator.onLine);

    // Listen for browser events
    const handleOnline = () => {
      setIsOnline(true);
      setLastCheck(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastCheck(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check
    const interval = setInterval(async () => {
      try {
        await fetch('/favicon.ico', { 
          method: 'HEAD', 
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        });
        if (!isOnline) {
          setIsOnline(true);
          setLastCheck(new Date());
        }
      } catch {
        if (isOnline) {
          setIsOnline(false);
          setLastCheck(new Date());
        }
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  const handleManualCheck = async () => {
    try {
      await fetch('/favicon.ico', { 
        method: 'HEAD', 
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      setIsOnline(true);
      setLastCheck(new Date());
    } catch {
      setIsOnline(false);
      setLastCheck(new Date());
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge 
        variant={isOnline ? 'default' : 'destructive'}
        className="flex items-center gap-1"
      >
        {isOnline ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualCheck}
        className="h-6 px-2"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
      
      {!isOnline && (
        <div className="text-xs text-muted-foreground">
          Working offline - changes will sync when connected
        </div>
      )}
    </div>
  );
};

// Simple storage indicator
export const SimpleStorageStatus: React.FC = () => {
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dispatchpro_offline_')) {
          count++;
        }
      }
      setItemCount(count);
    };

    updateCount();
    
    // Update every 10 seconds
    const interval = setInterval(updateCount, 10000);
    return () => clearInterval(interval);
  }, []);

  if (itemCount === 0) return null;

  return (
    <Badge variant="secondary" className="text-xs">
      {itemCount} items stored offline
    </Badge>
  );
};