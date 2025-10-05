// src/app/test-offline/page.tsx

"use client";

import React from 'react';
import { WorkingOfflineDemo } from '@/components/working-offline-demo';

export default function TestOfflinePage() {
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Offline Test Page</h1>
          <p className="text-muted-foreground">
            This page demonstrates basic offline functionality without breaking your main app.
          </p>
        </div>
        
        <WorkingOfflineDemo />
        
        <div className="mt-8 p-4 bg-green-50 rounded-lg">
          <h3 className="font-medium text-green-900 mb-2">Next Steps:</h3>
          <div className="text-sm text-green-800 space-y-1">
            <p>• This basic demo shows localStorage-based offline storage</p>
            <p>• Once this works, we can gradually integrate full offline features</p>
            <p>• The complete system includes Firebase sync, conflict resolution, etc.</p>
            <p>• Test this page in different network conditions</p>
          </div>
        </div>
      </div>
    </div>
  );
}