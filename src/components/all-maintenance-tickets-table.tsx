
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import type { MaintenanceTicket, Vehicle } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from './ui/dropdown-menu';
import Link from 'next/link';

const getStatusVariant = (status: MaintenanceTicket['status']) => {
    switch (status) {
        case 'open': return 'bg-red-500 hover:bg-red-600';
        case 'in-progress': return 'bg-yellow-500 hover:bg-yellow-600';
        case 'closed': return 'bg-green-600 hover:bg-green-700';
        default: return 'bg-gray-500';
    }
}

const getPriorityVariant = (priority: MaintenanceTicket['priority']) => {
    switch(priority) {
        case 'low': return 'secondary';
        case 'medium': return 'default';
        case 'high': return 'destructive';
    }
}

export function AllMaintenanceTicketsTable() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const ticketsQuery = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          ...docData,
          id: doc.id,
          createdAt: docData.createdAt?.toDate(),
          updatedAt: docData.updatedAt?.toDate(),
        } as MaintenanceTicket;
      });
      setTickets(data);
      setLoading(false);
    });

    const vehiclesQuery = query(collection(db, 'vehicles'));
    const unsubVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
      setVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });

    return () => {
        unsubTickets();
        unsubVehicles();
    };
  }, []);
  
  const getVehicleNickname = (vehicleId: string) => {
    return vehicles.find(v => v.id === vehicleId)?.nickname || 'Unknown Vehicle';
  }

  const handleStatusChange = async (ticketId: string, status: MaintenanceTicket['status']) => {
    const ticketRef = doc(db, 'tickets', ticketId);
    try {
        await updateDoc(ticketRef, { status });
        toast({ title: "Status Updated", description: "Ticket status changed successfully."});
    } catch(e) {
        toast({ variant: 'destructive', title: "Update Failed", description: "Could not update ticket status."});
    }
  }


  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
        <p>No maintenance tickets found.</p>
      </div>
    );
  }


  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/vehicles/${ticket.vehicleId}`} className="text-primary hover:underline">
                    {getVehicleNickname(ticket.vehicleId)}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{ticket.title}</TableCell>
              <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full min-w-[150px] justify-between capitalize">
                            <Badge className={getStatusVariant(ticket.status)}>{ticket.status.replace('-', ' ')}</Badge>
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuRadioGroup value={ticket.status} onValueChange={(value) => handleStatusChange(ticket.id, value as MaintenanceTicket['status'])}>
                            <DropdownMenuRadioItem value="open">Open</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="in-progress">In Progress</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="closed">Closed</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>
                <Badge variant={getPriorityVariant(ticket.priority)} className="capitalize">{ticket.priority}</Badge>
              </TableCell>
              <TableCell>{format(ticket.createdAt, 'PP')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
