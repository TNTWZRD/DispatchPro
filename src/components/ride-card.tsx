
"use client";

import React, { useState } from 'react';
import type { Ride, Driver, RideStatus, PaymentMethod } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, Phone, MapPin, Clock, MoreVertical, Truck, CheckCircle2, Loader2, XCircle, DollarSign, Users, Package, Calendar, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';


type RideCardProps = {
  ride: Ride;
  drivers: Driver[];
  onAssignDriver: (rideId: string, driverId: string) => void;
  onChangeStatus: (rideId: string, newStatus: RideStatus) => void;
  onSetFare: (rideId: string, fare: number, paymentMethod: PaymentMethod) => void;
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
  const [fareAmount, setFareAmount] = useState<number | undefined>(ride.fare);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>(ride.paymentMethod);
  const isMobile = useIsMobile();

  const assignedDriver = drivers.find(d => d.id === ride.driverId);
  const availableDrivers = drivers.filter(d => d.status === 'available');

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
    if (fareAmount && paymentMethod) {
      onSetFare(ride.id, fareAmount, paymentMethod);
      setIsFareModalOpen(false);
    }
  };
  
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
          {ride.movingFee && (
            <div className="flex items-center pt-1 text-sm text-muted-foreground">
              <Package className="mr-2 h-4 w-4 text-primary" />
              <span className="font-medium">Moving Fee</span>
            </div>
          )}
           {ride.fare !== undefined && (
            <div className="flex items-center pt-1 text-sm">
              <DollarSign className="mr-2 h-4 w-4 text-green-600" />
              <span className="font-medium">Fare:</span>
              <span className="ml-2">{formatCurrency(ride.fare)} ({ride.paymentMethod})</span>
              {ride.cardFee && <span className='ml-2 text-xs text-muted-foreground'>(+ {formatCurrency(ride.cardFee)} fee)</span>}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="mr-1.5 h-3 w-3" />
            <span>{formatDistanceToNow(ride.requestTime, { addSuffix: true })}</span>
          </div>
          <div className="flex gap-2">
            {ride.status === 'completed' && ride.fare === undefined && (
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
                            {availableDrivers.map(driver => (
                              <DropdownMenuItem key={driver.id} onClick={() => onAssignDriver(ride.id, driver.id)}>
                                {driver.name}
                              </DropdownMenuItem>
                            ))}
                             {availableDrivers.length === 0 && <DropdownMenuItem disabled>No drivers available</DropdownMenuItem>}
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
                            {availableDrivers.map(driver => (
                              <DropdownMenuItem key={driver.id} onClick={() => onAssignDriver(ride.id, driver.id)}>
                                {driver.name}
                              </DropdownMenuItem>
                            ))}
                             {availableDrivers.length === 0 && <DropdownMenuItem disabled>No drivers available</DropdownMenuItem>}
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
              Enter the total fare and payment method for ride #{ride.id.split('-').pop()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fare-amount">Fare Amount (USD)</Label>
              <Input
                id="fare-amount"
                type="number"
                placeholder="e.g., 25.50"
                value={fareAmount || ''}
                onChange={(e) => setFareAmount(parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash">Cash</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card">Card</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="check" id="check" />
                  <Label htmlFor="check">Check</Label>
                </div>
              </RadioGroup>
            </div>
            {paymentMethod === 'card' && fareAmount && (
              <p className="text-sm text-muted-foreground">
                A ${Math.floor(fareAmount / 40)} card processing fee will be applied.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSetFare} disabled={!fareAmount || !paymentMethod}>
              Save Fare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
