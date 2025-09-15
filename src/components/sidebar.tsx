
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import type { Ride, Driver } from '@/lib/types';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import dynamic from 'next/dynamic';


const DynamicMapView = dynamic(
  () => import('./map-view').then(mod => mod.MapView),
  {
    ssr: false,
    loading: () => <div className="w-[350px] xl:w-[450px] aspect-[2/1] bg-muted rounded-lg animate-pulse" />
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
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="hidden lg:flex flex-col gap-4 transition-all"
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="icon" className={cn(!isOpen && 'hidden')}>
            <PanelLeftClose />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent asChild className="data-[state=closed]:hidden">
        <div className="w-[350px] xl:w-[450px] flex flex-col gap-4">
            <DynamicMapView rides={rides} drivers={drivers} />
        </div>
      </CollapsibleContent>
       {!isOpen && (
         <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
            <PanelLeftOpen />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
      )}
    </Collapsible>
  );
}
