
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Collapsible, CollapsibleTrigger } from './ui/collapsible';
import type { Ride, Driver } from '@/lib/types';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import dynamic from 'next/dynamic';
import { Skeleton } from './ui/skeleton';

const DynamicMapView = dynamic(
  () => import('./map-view').then(mod => mod.MapView),
  {
    ssr: false,
    loading: () => <Skeleton className="w-[350px] xl:w-[450px] aspect-[2/1] bg-muted rounded-lg" />
  }
);


type SidebarProps = {
  rides: Ride[];
  drivers: Driver[];
};

export function Sidebar({ rides, drivers }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();
  
  if (isMobile) return null;
  
  return (
    <div className="hidden lg:flex flex-col gap-4 transition-all">
       {isOpen ? (
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <PanelLeftClose />
                <span className="sr-only">Toggle Sidebar</span>
            </Button>
        ) : (
             <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
                <PanelLeftOpen />
                <span className="sr-only">Toggle Sidebar</span>
            </Button>
        )}
      
      {/* 
        This div's visibility is controlled by the isOpen state.
        Using a simple conditional class prevents the map component from being
        unmounted by a parent component like Collapsible, which fixes the
        "Map container is already initialized" error.
      */}
      <div className={cn("w-[350px] xl:w-[450px] flex flex-col gap-4", !isOpen && 'hidden')}>
        <DynamicMapView rides={rides} drivers={drivers} />
      </div>
    </div>
  );
}
