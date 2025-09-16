
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
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
    loading: () => <Skeleton className="w-full aspect-[2/1] bg-muted rounded-lg" />
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
       <Button variant="ghost" size="icon" onClick={() => setIsOpen(prev => !prev)}>
          {isOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          <span className="sr-only">Toggle Sidebar</span>
      </Button>
      
      <div className={cn("w-[350px] xl:w-[450px] flex flex-col gap-4", !isOpen && 'hidden')}>
        <DynamicMapView rides={rides} drivers={drivers} />
      </div>
    </div>
  );
}
