// src/components/conflict-resolution-dialog.tsx

"use client";

import React, { useState } from 'react';
import { useConflicts } from '@/context/offline-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Calendar, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { SyncConflict } from '@/lib/sync-manager';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { conflicts, resolveConflict } = useConflicts();
  const { toast } = useToast();
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);

  const currentConflict = conflicts[currentConflictIndex];

  const handleResolveConflict = async (resolution: 'local' | 'remote') => {
    if (!currentConflict) return;

    setIsResolving(true);
    try {
      await resolveConflict(currentConflict.collection, currentConflict.docId, resolution);
      
      toast({
        title: "Conflict resolved",
        description: `Used ${resolution} version for ${currentConflict.collection}/${currentConflict.docId}`,
      });

      // Move to next conflict or close dialog
      if (currentConflictIndex < conflicts.length - 1) {
        setCurrentConflictIndex(currentConflictIndex + 1);
      } else {
        onOpenChange(false);
        setCurrentConflictIndex(0);
      }
    } catch (error) {
      toast({
        title: "Failed to resolve conflict",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsResolving(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (value instanceof Date) {
      return format(value, 'PPpp');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getChangedFields = (local: any, remote: any): string[] => {
    const allKeys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
    const changedFields: string[] = [];

    allKeys.forEach(key => {
      if (key.startsWith('_')) return; // Skip metadata fields
      
      const localValue = local?.[key];
      const remoteValue = remote?.[key];
      
      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        changedFields.push(key);
      }
    });

    return changedFields;
  };

  if (!currentConflict) {
    return null;
  }

  const changedFields = getChangedFields(currentConflict.localData, currentConflict.remoteData);

  return (
    <Dialog open={open && conflicts.length > 0} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]" aria-describedby="conflict-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Sync Conflict Resolution
          </DialogTitle>
          <DialogDescription id="conflict-description">
            Conflict {currentConflictIndex + 1} of {conflicts.length}: The same data was modified both locally and remotely. 
            Choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflict info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Conflict Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Collection:</span>
                  <Badge variant="outline">{currentConflict.collection}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Document ID:</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{currentConflict.docId}</code>
                </div>
              </div>
              
              {changedFields.length > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-medium">Changed fields:</span>
                  <div className="flex flex-wrap gap-1">
                    {changedFields.map(field => (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Version comparison */}
          <Tabs defaultValue="comparison" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comparison">Side by Side</TabsTrigger>
              <TabsTrigger value="local">Local Version</TabsTrigger>
              <TabsTrigger value="remote">Remote Version</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-600">Local Version (Your Changes)</CardTitle>
                    <CardDescription className="text-xs">
                      Modified: {currentConflict.localData._offline?.lastModified ? 
                        format(currentConflict.localData._offline.lastModified, 'PPpp') : 'Unknown'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2 text-sm">
                        {changedFields.map(field => (
                          <div key={field} className="border-l-2 border-blue-200 pl-2">
                            <div className="font-medium text-blue-800">{field}:</div>
                            <div className="text-muted-foreground font-mono text-xs whitespace-pre-wrap">
                              {formatValue(currentConflict.localData[field])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-600">Remote Version (Server)</CardTitle>
                    <CardDescription className="text-xs">
                      Modified: {currentConflict.remoteData.updatedAt ? 
                        format(currentConflict.remoteData.updatedAt, 'PPpp') : 'Unknown'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2 text-sm">
                        {changedFields.map(field => (
                          <div key={field} className="border-l-2 border-green-200 pl-2">
                            <div className="font-medium text-green-800">{field}:</div>
                            <div className="text-muted-foreground font-mono text-xs whitespace-pre-wrap">
                              {formatValue(currentConflict.remoteData[field])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="local">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Local Version (Your Changes)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(currentConflict.localData, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="remote">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Remote Version (Server)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(currentConflict.remoteData, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => handleResolveConflict('local')}
              disabled={isResolving}
            >
              Keep Local Version
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => handleResolveConflict('remote')}
              disabled={isResolving}
            >
              Keep Remote Version
            </Button>
          </div>
          
          {conflicts.length > 1 && (
            <div className="flex justify-between items-center w-full text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentConflictIndex(Math.max(0, currentConflictIndex - 1))}
                disabled={currentConflictIndex === 0}
              >
                Previous
              </Button>
              <span>{currentConflictIndex + 1} of {conflicts.length}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentConflictIndex(Math.min(conflicts.length - 1, currentConflictIndex + 1))}
                disabled={currentConflictIndex === conflicts.length - 1}
              >
                Next
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};