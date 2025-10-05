// src/components/offline-indicator.tsx

"use client";

import React from 'react';
import { useOffline } from '@/context/offline-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  XCircle,
  CloudOff,
  Cloud,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface OfflineIndicatorProps {
  className?: string;
  variant?: 'badge' | 'full' | 'compact';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  className, 
  variant = 'badge' 
}) => {
  const {
    isOnline,
    lastOnlineTime,
    syncStatus,
    syncProgress,
    syncError,
    pendingSyncCount,
    conflicts,
    forcSync,
    forceNetworkCheck
  } = useOffline();

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (syncStatus === 'syncing') return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (conflicts.length > 0) return <AlertTriangle className="h-4 w-4" />;
    if (pendingSyncCount > 0) return <Clock className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus === 'syncing') return `Syncing... ${Math.round(syncProgress)}%`;
    if (conflicts.length > 0) return `${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''}`;
    if (pendingSyncCount > 0) return `${pendingSyncCount} pending`;
    return 'Online';
  };

  const getStatusVariant = () => {
    if (!isOnline) return 'destructive';
    if (syncStatus === 'syncing') return 'default';
    if (conflicts.length > 0) return 'destructive';
    if (pendingSyncCount > 0) return 'secondary';
    return 'default';
  };

  if (variant === 'badge') {
    return (
      <Badge 
        variant={getStatusVariant()}
        className={cn("flex items-center gap-1", className)}
      >
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
        
        {syncStatus === 'syncing' && (
          <Progress value={syncProgress} className="w-20 h-2" />
        )}
        
        {(!isOnline || pendingSyncCount > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={isOnline ? forcSync : forceNetworkCheck}
            disabled={syncStatus === 'syncing'}
          >
            <RefreshCw className={cn("h-3 w-3", syncStatus === 'syncing' && "animate-spin")} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {isOnline ? (
            <Cloud className="h-4 w-4 text-green-500" />
          ) : (
            <CloudOff className="h-4 w-4 text-red-500" />
          )}
          Connection Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Network Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Network:</span>
          <Badge variant={isOnline ? 'default' : 'destructive'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {lastOnlineTime && !isOnline && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last online:</span>
            <span className="text-sm">{formatDistanceToNow(lastOnlineTime)} ago</span>
          </div>
        )}

        {/* Sync Status */}
        {syncStatus === 'syncing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Syncing:</span>
              <span className="text-sm">{Math.round(syncProgress)}%</span>
            </div>
            <Progress value={syncProgress} className="w-full" />
          </div>
        )}

        {/* Pending Changes */}
        {pendingSyncCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pending changes:</span>
            <Badge variant="secondary">{pendingSyncCount}</Badge>
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {conflicts.length} sync conflict{conflicts.length > 1 ? 's' : ''} need{conflicts.length === 1 ? 's' : ''} resolution.
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {syncError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{syncError}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={forceNetworkCheck}
            disabled={syncStatus === 'syncing'}
            className="flex-1"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", syncStatus === 'syncing' && "animate-spin")} />
            Check Connection
          </Button>
          
          {isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={forcSync}
              disabled={syncStatus === 'syncing'}
              className="flex-1"
            >
              <RotateCcw className={cn("h-3 w-3 mr-1", syncStatus === 'syncing' && "animate-spin")} />
              Force Sync
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Floating indicator for minimal UI presence
export const FloatingOfflineIndicator: React.FC = () => {
  const { isOnline, showOfflineIndicator } = useOffline();

  if (!showOfflineIndicator) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <OfflineIndicator variant="compact" className="bg-background border shadow-lg rounded-md p-2" />
    </div>
  );
};

// Header indicator for integration into app headers
export const HeaderOfflineIndicator: React.FC = () => {
  const { showOfflineIndicator } = useOffline();

  if (!showOfflineIndicator) {
    return null;
  }

  return <OfflineIndicator variant="badge" />;
};