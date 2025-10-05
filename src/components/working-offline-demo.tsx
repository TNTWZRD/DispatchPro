// src/components/working-offline-demo.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Database, RefreshCw } from 'lucide-react';
import offlineUtils from '@/lib/offline-fix';

export function WorkingOfflineDemo() {
  const [isOnline, setIsOnline] = useState(true);
  const [testData, setTestData] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial online status
    setIsOnline(offlineUtils.isOnline());

    // Listen for network changes
    const unsubscribe = offlineUtils.events.on('network', (online: boolean) => {
      setIsOnline(online);
      console.log('Network status changed:', online ? 'online' : 'offline');
    });

    // Load test data from storage
    const stored = offlineUtils.storage.get('demo_test_data');
    if (stored && Array.isArray(stored)) {
      setTestData(stored);
    }

    return unsubscribe;
  }, []);

  const addTestItem = () => {
    const newItem = `Item ${Date.now()}`;
    const updatedData = [...testData, newItem];
    
    setTestData(updatedData);
    setLastUpdate(new Date());
    
    // Store in localStorage
    offlineUtils.storage.set('demo_test_data', updatedData);
    
    console.log('Added item:', newItem, 'Online:', isOnline);
  };

  const clearData = () => {
    setTestData([]);
    setLastUpdate(new Date());
    offlineUtils.storage.remove('demo_test_data');
    console.log('Cleared data');
  };

  const testConnectivity = async () => {
    try {
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
      setIsOnline(true);
      console.log('Connectivity test: online');
    } catch {
      setIsOnline(false);
      console.log('Connectivity test: offline');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Offline Demo (Working Version)
          </CardTitle>
          <CardDescription>
            This demo shows basic offline functionality without complex dependencies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Display */}
          <div className="flex items-center gap-4">
            <Badge variant={isOnline ? 'default' : 'destructive'} className="flex items-center gap-1">
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <Button variant="outline" size="sm" onClick={testConnectivity}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Test Connection
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={addTestItem}>
              Add Test Item
            </Button>
            <Button variant="outline" onClick={clearData} disabled={testData.length === 0}>
              Clear All ({testData.length})
            </Button>
          </div>

          {/* Data Display */}
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Stored Items ({testData.length}):
            </div>
            {testData.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                No items stored. Add some items to test offline storage.
              </div>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {testData.map((item, index) => (
                  <div key={index} className="text-sm p-2 bg-muted rounded">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          {lastUpdate && (
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
            <div className="font-medium text-blue-900 mb-2">Test Instructions:</div>
            <ol className="space-y-1 text-blue-800">
              <li>1. Add some test items above</li>
              <li>2. Open DevTools → Network → Check "Offline"</li>
              <li>3. Add more items (should still work)</li>
              <li>4. Refresh page (items should persist)</li>
              <li>5. Uncheck "Offline" to go back online</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}