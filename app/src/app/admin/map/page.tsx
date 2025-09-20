
"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Map as MapIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Role, type Ride, type Driver } from '@/lib/types';
import { AdminBreadcrumb } from '@/components/admin-breadcrumb';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const DynamicMapView = dynamic(
  () => import('../../../components/map-view').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />,
  }
);


export default function MapPage() {
    const { user, loading: authLoading, hasRole } = useAuth();
    const router = useRouter();
    
    const [rides, setRides] = useState<Ride[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    const canAccess = hasRole(Role.ADMIN) || hasRole(Role.OWNER);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else if (!canAccess) {
                router.push('/');
            }
        }
    }, [user, authLoading, router, canAccess]);
    
    useEffect(() => {
      const toDate = (ts: any) => ts instanceof Timestamp ? ts.toDate() : ts;
      
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const unsubscribers = [
        onSnapshot(query(collection(db, "rides"), where("status", "in", ["pending", "assigned", "in-progress"])), (snapshot) => {
            const ridesData = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                createdAt: toDate(doc.data().createdAt),
            } as Ride));
            setRides(ridesData);
        }),
        onSnapshot(query(collection(db, "drivers")), (snapshot) => {
            setDrivers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Driver)));
        }),
      ];
      
      setDataLoading(false);
      
      return () => unsubscribers.forEach(unsub => unsub());
    }, []);

    if (authLoading || dataLoading || !user || !canAccess) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col p-4 md:p-6 gap-6 bg-secondary/50">
            <AdminBreadcrumb segments={[{ name: 'Admin', href: '/admin' }, { name: 'Live Map' }]} />
            <div className="flex-1 min-h-0">
                <DynamicMapView rides={rides} drivers={drivers} />
            </div>
        </div>
    );
}
