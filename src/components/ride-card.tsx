
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Ride, Driver, RideStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, MapPin, Clock, MoreVertical, Truck, CheckCircle2, Loader2, XCircle, DollarSign, Users, Package, Calendar, Undo2, MessageSquare, Repeat, Milestone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';


type RideCardProps = {
  ride: Ride;
  drivers: Driver[];
  onAssignDriver: (rideId: string, driverId: string) => void;
  onChangeStatus: (rideId: string, newStatus: RideStatus) => void;
  onSetFare: (rideId: string, details: { totalFare: number; paymentDetails: { cash?: number; card?: number; check?: number; } }) => void;
  onUnassignDriver: (rideId: string) => void;
};

const statusConfig: Record<RideStatus, { color: string; icon: React.ReactNode }> = {
  pending: { color: 'bg-yellow-400', icon: <Clock className="h-3 w-3" /> },
  assigned: { color: 'bg-blue-500', icon: <Truck className="h-3 w-3" /> },
  'in-progress': { color: 'bg-indigo-500', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { color: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
};

export function RideCard({ ride, drivers, onAssignDriver, onChangeStatus, onSetFare, onUnassignDriver }: RideCardProps) {
  const [isFareModalOpen, setIsFareModalOpen] = useState(false);
  const [fareCash, setFareCash] = useState<number | undefined>(ride.paymentDetails?.cash);
  const [fareCard, setFareCard] = useState<number | undefined>(ride.paymentDetails?.card);
  const [fareCheck, setFareCheck] = useState<number | undefined>(ride.paymentDetails?.check);
  
  const isMobile = useIsMobile();
  const assignedDriver = drivers.find(d => d.id === ride.driverId);
  const availableDriversForMenu = drivers.filter(d => d.status !== 'offline');

  const totalFare = useMemo(() => {
    return (fareCash || 0) + (fareCard || 0) + (fareCheck || 0);
  }, [fareCash, fareCard, fareCheck]);

  useEffect(() => {
    setFareCash(ride.paymentDetails?.cash);
    setFareCard(ride.paymentDetails?.card);
    setFareCheck(ride.paymentDetails?.check);
  }, [ride.paymentDetails]);


  const getStatusBadge = (status: RideStatus) => {
    const config = statusConfig[status];
    return (
      <Badge className={cn('capitalize text-white', config.color)}>
        {config.icon}
        <span className="ml-1.5">{status.replace('-', ' ')}</span>
      </Badge>
    );
  };

  const handleSetFare = () => {
    if (totalFare > 0) {
      onSetFare(ride.id, {
        totalFare: totalFare,
        paymentDetails: {
          cash: fareCash || undefined,
          card: fareCard || undefined,
          check: fareCheck || undefined,
        }
      });
      setIsFareModalOpen(false);
    }
  };
  
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
  
  const getPaymentSummary = () => {
    if (!ride.totalFare) return null;

    const parts = [];
    if (ride.paymentDetails?.cash) parts.push(`Cash: ${formatCurrency(ride.paymentDetails.cash)}`);
    if (ride.paymentDetails?.card) parts.push(`Card: ${formatCurrency(ride.paymentDetails.card)}`);
    if (ride.paymentDetails?.check) parts.push(`Check: ${formatCurrency(ride.paymentDetails.check)}`);

    return (
      <div className="flex items-center pt-1 text-sm">
        <DollarSign className="mr-2 h-4 w-4 text-green-600" />
        <span className="font-medium">Fare: {formatCurrency(ride.totalFare)}</span>
        <span className="ml-2 text-xs text-muted-foreground">({parts.join(', ')})</span>
         {ride.cardFee && <span className='ml-2 text-xs text-muted-foreground'>(+ {formatCurrency(ride.cardFee)} fee)</span>}
      </div>
    );
  }

  return (
    <>
      <Card className={cn("transition-all bg-card", ride.isNew && "animate-pulse border-primary")}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" /> {ride.passengerCount} Passenger(s)
            </CardTitle>
            {ride.status !== 'pending' && getStatusBadge(ride.status)}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Phone className="mr-2 h-4 w-4" />
            <span>{ride.passengerPhone}</span>
          </div>
          {ride.scheduledTime && (
            <div className="flex items-center text-sm text-amber-600">
              <Calendar className="mr-2 h-4 w-4" />
              <span>Scheduled: {format(ride.scheduledTime, "p")}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm pt-2">
          <div className="flex items-start">
            <MapPin className="mr-2 h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <span className="font-medium">From:</span>
            <span className="ml-2">{ride.pickup.name}</span>
          </div>
           {ride.stops && ride.stops.length > 0 && ride.stops.map((stop, index) => (
             <div key={index} className="flex items-start pl-2">
                <Milestone className="mr-2 h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span className="font-medium">Stop:</span>
                <span className="ml-2">{stop.name}</span>
            </div>
           ))}
          <div className="flex items-start">
            <MapPin className="mr-2 h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span className="font-medium">To:</span>
            <span className="ml-2">{ride.dropoff.name}</span>
          </div>
          {assignedDriver && ride.status !== 'pending' && (
            <div className="flex items-center pt-1">
              <Truck className="mr-2 h-4 w-4 text-primary" />
              <span className="font-medium">Driver:</span>
              <span className="ml-2">{assignedDriver.name}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
            {ride.movingFee && (
                <div className="flex items-center">
                    <Package className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-medium">Moving Fee</span>
                </div>
            )}
             {ride.isReturnTrip && (
                <div className="flex items-center">
                    <Repeat className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-medium">Return Trip</span>
                </div>
            )}
          </div>
          {ride.notes && (
            <div className="flex items-start pt-1 text-sm text-muted-foreground">
              <MessageSquare className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
              <span className="italic">{ride.notes}</span>
            </div>
          )}
          {getPaymentSummary()}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1.5 h-3 w-3" />
            <span>{formatDistanceToNow(ride.requestTime, { addSuffix: true })}</span>
          </div>
          <div className="flex gap-2">
            {!['completed', 'cancelled'].includes(ride.status) && (
              <Button variant="outline" size="sm" onClick={() => setIsFareModalOpen(true)}>
                <DollarSign className="h-4 w-4 mr-2" /> Set Fare
              </Button>
            )}
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                   {ride.status === 'pending' && isMobile && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Assign To</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {availableDriversForMenu.map(driver => (
                              <DropdownMenuItem key={driver.id} onClick={() => onAssignDriver(ride.id, driver.id)}>
                                {driver.name}
                              </DropdownMenuItem>
                            ))}
                             {availableDriversForMenu.length === 0 && <DropdownMenuItem disabled>No drivers available</DropdownMenuItem>}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                   )}
                   {['assigned', 'in-progress'].includes(ride.status) && (
                     <DropdownMenuItem onClick={() => onUnassignDriver(ride.id)}>
                        <Undo2 className="mr-2 h-4 w-4" /> Unassign
                     </DropdownMenuItem>
                   )}
                   {isMobile && ['assigned', 'in-progress'].includes(ride.status) && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Re-assign</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {availableDriversForMenu.map(driver => (
                              <DropdownMenuItem key={driver.id} onClick={() => onAssignDriver(ride.id, driver.id)} disabled={driver.id === ride.driverId}>
                                {driver.name}
                              </DropdownMenuItem>
                            ))}
                             {availableDriversForMenu.length === 0 && <DropdownMenuItem disabled>No drivers available</DropdownMenuItem>}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                   )}
                  {ride.status === 'assigned' && <DropdownMenuItem onClick={() => onChangeStatus(ride.id, 'in-progress')}>Mark In Progress</DropdownMenuItem>}
                  {ride.status === 'in-progress' && <DropdownMenuItem onClick={() => onChangeStatus(ride.id, 'completed')}>Mark Completed</DropdownMenuItem>}
                  {['pending', 'assigned', 'in-progress'].includes(ride.status) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onChangeStatus(ride.id, 'cancelled')} className="text-destructive">
                        Cancel Ride
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={isFareModalOpen} onOpenChange={setIsFareModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Final Fare</DialogTitle>
            <DialogDescription>
              Enter the fare and payment method(s) for ride #{ride.id.split('-').pop()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Details</Label>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <Label htmlFor="fare-cash">Cash Amount</Label>
                    <Input
                        id="fare-cash"
                        type="number"
                        placeholder="e.g., 20.00"
                        value={fareCash || ''}
                        onChange={(e) => setFareCash(parseFloat(e.target.value) || undefined)}
                    />
                 </div>
                 <div className="space-y-1">
                    <Label htmlFor="fare-card">Card Amount</Label>
                    <Input
                        id="fare-card"
                        type="number"
                        placeholder="e.g., 25.50"
                        value={fareCard || ''}
                        onChange={(e) => setFareCard(parseFloat(e.target.value) || undefined)}
                    />
                 </div>
                 <div className="space-y-1">
                    <Label htmlFor="fare-check">Check Amount</Label>
                    <Input
                        id="fare-check"
                        type="number"
                        placeholder="e.g., 50.00"
                        value={fareCheck || ''}
                        onChange={(e) => setFareCheck(parseFloat(e.target.value) || undefined)}
                    />
                 </div>
              </div>
            </div>

            <div className="text-lg font-bold text-right">
                Total: {formatCurrency(totalFare)}
            </div>

            {fareCard && fareCard > 0 && (
              <p className="text-sm text-muted-foreground">
                A ${Math.floor(fareCard / 40)} card processing fee will be applied to the card portion.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSetFare} disabled={totalFare <= 0}>
              Save Fare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
