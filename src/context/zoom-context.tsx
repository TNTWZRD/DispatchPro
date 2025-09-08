
"use client";

import React, { createContext, useState, useMemo } from 'react';

type ZoomContextType = {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
};

export const ZoomContext = createContext<ZoomContextType>({
  zoom: 1,
  zoomIn: () => {},
  zoomOut: () => {},
});

const ZOOM_LEVELS = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3];

export const ZoomProvider = ({ children }: { children: React.ReactNode }) => {
  const [zoomIndex, setZoomIndex] = useState(3); // Default to 1.0 (100%)

  const zoomIn = () => {
    setZoomIndex(prev => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  };

  const zoomOut = () => {
    setZoomIndex(prev => Math.max(prev - 1, 0));
  };

  const value = useMemo(() => ({
    zoom: ZOOM_LEVELS[zoomIndex],
    zoomIn,
    zoomOut,
  }), [zoomIndex]);

  return (
    <ZoomContext.Provider value={value}>
      {children}
    </ZoomContext.Provider>
  );
};
