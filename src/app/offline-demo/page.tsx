// src/app/offline-demo/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { SimpleOfflineIndicator, SimpleStorageStatus } from '@/components/simple-offline-indicator';
import { useSimpleOffline, SimpleOfflineData } from '@/lib/offline-simple';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface DemoItem {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
}

export default function OfflineDemoPage() {
  const { isOnline, storage } = useSimpleOffline();
  const [items, setItems] = useState<DemoItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Load items on mount
  useEffect(() => {
    const loadItems = async () => {
      const storedItems = await storage.get('demo_items');
      setItems(storedItems || []);
    };
    loadItems();
  }, [storage]);

  const addItem = async () => {
    if (!title.trim()) return;

    const newItem: DemoItem = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date()
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    
    // Store each item individually for demo purposes
    await storage.set('demo_items', newItem.id, newItem);
    
    // Clear form
    setTitle('');
    setDescription('');

    console.log('Added item:', newItem);
    console.log('Online status:', isOnline);
  };

  const deleteItem = async (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);
    
    await storage.delete('demo_items', id);
    
    console.log('Deleted item:', id);
  };

  const clearAll = () => {
    setItems([]);
    // Clear from storage would be implemented here
    console.log('Cleared all items');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Offline Demo</h1>
            <p className="text-muted-foreground">
              Test offline functionality - try turning off your network!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SimpleOfflineIndicator />
            <SimpleStorageStatus />
          </div>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Connection Status
              <Badge variant={isOnline ? 'default' : 'destructive'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </CardTitle>
            <CardDescription>
              {isOnline 
                ? 'You are connected to the internet. Changes will sync immediately.'
                : 'You are offline. Changes are stored locally and will sync when you reconnect.'
              }
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Add Item Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Demo Item</CardTitle>
            <CardDescription>
              Add items that will be stored locally and work offline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter item title..."
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter item description..."
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addItem} disabled={!title.trim()}>
                Add Item
              </Button>
              {items.length > 0 && (
                <Button variant="outline" onClick={clearAll}>
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle>Stored Items ({items.length})</CardTitle>
            <CardDescription>
              These items are stored locally and will persist offline
            </CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items yet. Add some items above to test offline storage.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="space-y-2">
              <p><strong>1.</strong> Add some items above while online</p>
              <p><strong>2.</strong> Open Chrome DevTools → Network tab</p>
              <p><strong>3.</strong> Check "Offline" to simulate network failure</p>
              <p><strong>4.</strong> Add/delete items - they should still work</p>
              <p><strong>5.</strong> Refresh the page - your items should persist</p>
              <p><strong>6.</strong> Uncheck "Offline" to go back online</p>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> This is a simplified demo. The full offline system includes 
                automatic sync, conflict resolution, and integration with your existing Firebase data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}