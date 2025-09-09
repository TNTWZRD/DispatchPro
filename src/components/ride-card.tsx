
"use client";

import React, { useState, useEffect, useMemo, useContext } from 'react';
import type { Ride, Driver, RideStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, MapPin, Clock, MoreVertical, Truck, CheckCircle2, Loader2, XCircle, DollarSign, Users, Package, Calendar, Undo2, MessageSquare, Repeat, Milestone, Edit, CreditCard, Gift, History, CalendarX2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useCondensedMode } from '@/context/condensed-mode-context';
import { ResponsiveDialog } from './responsive-dialog';


type RideCardProps = {
  ride: Ride;
  drivers: Driver[];
  onAssignDriver: (rideId: string, driverId: string) => void;
  onChangeStatus: (rideId: string, newStatus: RideStatus) => void;
  onSetFare: (rideId: string, details: { totalFare: number; paymentDetails: { cash?: number; card?: number; check?: number; tip?: number; } }) => void;
  onUnassignDriver: (rideId: string) => void;
  onEdit: (ride: Ride) => void;
  onUnschedule: (rideId: string) => void;
};

const statusConfig: Record<RideStatus, { color: string; icon: React.ReactNode }> = {
  pending: { color: 'bg-yellow-400', icon: <Clock className="h-3 w-3" /> },
  assigned: { color: 'bg-blue-500', icon: <Truck className="h-3 w-3" /> },
  'in-progress': { color: 'bg-indigo-500', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { color: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
};

export function RideCard({ ride, drivers, onAssignDriver, onChangeStatus, onSetFare, onUnassignDriver, onEdit, onUnschedule }: RideCardProps) {
  const [isFareModalOpen, setIsFareModalOpen] = useState(false);
  const [fareCash, setFareCash] = useState<number | undefined>(ride.paymentDetails?.cash);
  const [fareCard, setFareCard] = useState<number | undefined>(ride.paymentDetails?.card);
  const [fareCheck, setFareCheck] = useState<number | undefined>(ride.paymentDetails?.check);
  const [fareTip, setFareTip] = useState<number | undefined>(ride.paymentDetails?.tip);
  
  const isMobile = useIsMobile();
  const { isCondensed } = useCondensedMode();
  const assignedDriver = drivers.find(d => d.id === ride.driverId);
  const availableDriversForMenu = drivers.filter(d => d.status !== 'offline');

  const cardPaymentAmount = useMemo(() => {
    return (fareCard || 0) + (fareTip || 0);
  }, [fareCard, fareTip]);
  
  const cardFee = useMemo(() => {
    if (!cardPaymentAmount || cardPaymentAmount <= 0) return 0;
    return 1 + Math.floor(cardPaymentAmount / 40);
  }, [cardPaymentAmount]);

  const totalPayment = useMemo(() => {
    return (fareCash || 0) + (fareCard || 0) + (fareCheck || 0);
  }, [fareCash, fareCard, fareCheck]);

  useEffect(() => {
    setFareCash(ride.paymentDetails?.cash);
    setFareCard(ride.paymentDetails?.card);
    setFareCheck(ride.paymentDetails?.check);
    setFareTip(ride.paymentDetails?.tip);
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
    const newTotalFare = totalPayment > 0 ? totalPayment : ride.totalFare
    onSetFare(ride.id, {
      totalFare: newTotalFare,
      paymentDetails: {
        cash: fareCash || undefined,
        card: fareCard || undefined,
        check: fareCheck || undefined,
        tip: fareTip || undefined,
      }
    });
    if (ride.status !== 'completed' && ride.status !== 'cancelled') {
        onChangeStatus(ride.id, 'completed');
    }
    setIsFareModalOpen(false);
  };
  
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
  
  const getPaymentSummary = () => {
    if (isCondensed) return null;
    const parts = [];
    if (ride.paymentDetails?.cash) parts.push(`Cash: ${formatCurrency(ride.paymentDetails.cash)}`);
    if (ride.paymentDetails?.card) parts.push(`Card: ${formatCurrency(ride.paymentDetails.card)}`);
    if (ride.paymentDetails?.check) parts.push(`Check: ${formatCurrency(ride.paymentDetails.check)}`);
    if (ride.paymentDetails?.tip) parts.push(`Tip: ${formatCurrency(ride.paymentDetails.tip)}`);

    return (
        ride.totalFare ? (
            <div className="flex items-center pt-1 text-xs text-muted-foreground">
                <DollarSign className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                <span className="font-medium text-foreground">{formatCurrency(ride.totalFare)}</span>
                {parts.length > 0 && <span className="ml-2">({parts.join(', ')})</span>}
            </div>
        ) : null
    );
  }
  
  const getTimelineEvent = () => {
    let eventText = "Updated";
    let eventDate = ride.updatedAt;

    switch (ride.status) {
      case 'completed':
        eventText = "Completed";
        eventDate = ride.droppedOffAt || ride.updatedAt;
        break;
      case 'cancelled':
        eventText = "Cancelled";
        eventDate = ride.cancelledAt || ride.updatedAt;
        break;
      case 'in-progress':
        eventText = "Picked up";
        eventDate = ride.pickedUpAt || ride.updatedAt;
        break;
      case 'assigned':
        eventText = "Assigned";
        eventDate = ride.assignedAt || ride.updatedAt;
        break;
      case 'pending':
        eventText = "Requested";
        eventDate = ride.createdAt;
        break;
      default:
        eventText = "Updated";
        eventDate = ride.updatedAt;
    }
    
    return `${eventText} ${formatDistanceToNow(eventDate, { addSuffix: true })}`;
  }

  return (
    <TooltipProvider>
      <Card className={cn("transition-all bg-card text-sm", ride.isNew && "animate-pulse border-primary")}>
        <div className="p-3">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(ride.status)}
              {isCondensed && ride.scheduledTime && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center text-amber-600 font-medium text-xs">
                      <Calendar className="mr-1 h-3.5 w-3.5" />
                      <span>{format(ride.scheduledTime, "p")}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Scheduled for {format(ride.scheduledTime, "PPpp")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
               {isCondensed && (
                 <div className="flex items-center text-xs text-muted-foreground">
                    <History className="mr-1.5 h-3 w-3" />
                    <span>{getTimelineEvent()}</span>
                </div>
               )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8" onClick={() => setIsFareModalOpen(true)}>
                  <DollarSign className="h-4 w-4" />
                  {!isCondensed && <span className='sr-only sm:not-sr-only sm:ml-2'>{ride.totalFare ? 'Edit Fare' : 'Set Fare'}</span>}
              </Button>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(ride)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Ride
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {ride.status === 'pending' && ride.scheduledTime && (
                        <DropdownMenuItem onClick={() => onUnschedule(ride.id)}>
                            <CalendarX2 className="mr-2 h-4 w-4" /> Unschedule
                        </DropdownMenuItem>
                    )}
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
                    {ride.status === 'completed' && (
                      <DropdownMenuItem onClick={() => onChangeStatus(ride.id, 'in-progress')}>
                          <Undo2 className="mr-2 h-4 w-4" /> Re-open Ride
                      </DropdownMenuItem>
                    )}
                    {ride.status === 'cancelled' && (
                       <DropdownMenuItem onClick={() => onChangeStatus(ride.id, 'pending')}>
                          <Undo2 className="mr-2 h-4 w-4" /> Uncancel Ride
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>

          {/* Details Grid */}
          <div className={cn("grid gap-x-4", isCondensed ? "grid-cols-1" : "grid-cols-2")}>
            {/* Left Column */}
            <div className="space-y-1.5">
              <div className="flex items-start">
                <MapPin className="mr-2 h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span className="font-medium">{ride.pickup.name}</span>
              </div>
              {!isCondensed && ride.stops && ride.stops.length > 0 && ride.stops.map((stop, index) => (
                <div key={index} className="flex items-start pl-2">
                    <Milestone className="mr-2 h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <span>{stop.name}</span>
                </div>
              ))}
              {ride.dropoff && (
                <div className="flex items-start">
                    <MapPin className="mr-2 h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{ride.dropoff.name}</span>
                </div>
              )}
            </div>
            {/* Right Column */}
            <div className={cn("space-y-1.5 text-xs", isCondensed && "hidden")}>
              {ride.passengerCount && ride.passengerCount > 1 && !isCondensed && (
                <div className='flex items-center'><Users className="mr-1.5" /> {ride.passengerCount} passengers</div>
              )}
              {ride.passengerPhone && (
                <div className="flex items-center">
                    <Phone className="mr-1.5" />
                    <span>{ride.passengerPhone}</span>
                </div>
              )}
              {ride.scheduledTime && !isCondensed && (
                <div className="flex items-center text-amber-600 font-medium">
                  <Calendar className="mr-1.5" />
                  <span>Scheduled for {format(ride.scheduledTime, "p")}</span>
                </div>
              )}
            </div>
          </div>
          
          {!isCondensed && ride.notes && (
            <div className="flex items-start pt-2 text-xs text-muted-foreground">
              <MessageSquare className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
              <span className="italic">{ride.notes}</span>
            </div>
          )}
          {getPaymentSummary()}

          {/* Footer Row */}
          <div className="flex justify-between items-center mt-2 pt-2 border-t">
             {!isCondensed && (
                <div className="flex items-center text-xs text-muted-foreground">
                    <History className="mr-1.5 h-3 w-3" />
                    <span>{getTimelineEvent()}</span>
                </div>
             )}
             <div className="flex items-center gap-1.5 ml-auto">
                {ride.movingFee && (
                    <Tooltip>
                        <TooltipTrigger><Package className="h-4 w-4 text-primary" /></TooltipTrigger>
                        <TooltipContent><p>Moving Fee</p></TooltipContent>
                    </Tooltip>
                )}
             </div>
          </div>
        </div>
      </Card>
      
      <ResponsiveDialog
        open={isFareModalOpen}
        onOpenChange={setIsFareModalOpen}
        title={`Finalize Fare`}
      >
          <div className="space-y-4 py-4">
             <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                <h4 className="font-medium">Ride Summary</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between"><span>Passengers:</span> <span className="font-medium text-foreground">{ride.passengerCount || 1}</span></div>
                    <div className="flex justify-between"><span>Stops:</span> <span className="font-medium text-foreground">{ride.stops?.length || 0}</span></div>
                    <div className="flex justify-between"><span>Moving Fee:</span> <span className="font-medium text-foreground">{ride.movingFee ? 'Yes' : 'No'}</span></div>
                </div>
            </div>

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
                  <div className="space-y-1">
                    <Label htmlFor="fare-tip">Tip (Card)</Label>                    <Input
                        id="fare-tip"
                        type="number"
                        placeholder="e.g., 5.00"
                        value={fareTip || ''}
                        onChange={(e) => setFareTip(parseFloat(e.target.value) || undefined)}
                    />
                 </div>
              </div>
            </div>

            <div className="space-y-2 rounded-md border bg-muted/50 p-4">
                <div className="flex justify-between font-medium">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totalPayment)}</span>
                </div>
                 {fareTip > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Tip:</span>
                        <span>+ {formatCurrency(fareTip)}</span>
                    </div>
                )}
                {cardFee > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Card Fee:</span>
                        <span>+ {formatCurrency(cardFee)}</span>
                    </div>
                )}
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                    <span>Total Charged to Customer:</span>
                    <span>{formatCurrency(totalPayment + cardFee)}</span>
                </div>
            </div>
            
            {cardFee > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                A {formatCurrency(cardFee)} card processing fee will be applied.
              </p>
            )}
             <div className="sm:h-80 md:h-0" />
          </div>
          <div className="flex justify-end p-4">
            <Button onClick={handleSetFare} disabled={totalPayment <= 0}>
              Save Fare & Mark Completed
            </Button>
          </div>
      </ResponsiveDialog>
    </TooltipProvider>
  );
}
