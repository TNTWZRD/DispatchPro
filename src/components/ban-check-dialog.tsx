
"use client";

import React, { useState, useMemo } from 'react';
import type { Ban } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPhoneNumber } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { ShieldAlert } from 'lucide-react';

type BanCheckDialogProps = {
    bans: Ban[];
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function BanCheckDialog({ bans, isOpen, onOpenChange }: BanCheckDialogProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredBans = useMemo(() => {
        if (!searchTerm) {
            return bans;
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return bans.filter(ban => 
            ban.name?.toLowerCase().includes(lowercasedTerm) ||
            ban.phone?.toLowerCase().includes(lowercasedTerm) ||
            ban.address?.toLowerCase().includes(lowercasedTerm) ||
            ban.reason?.toLowerCase().includes(lowercasedTerm)
        );
    }, [bans, searchTerm]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-destructive" />
                        Check Ban List
                    </DialogTitle>
                    <DialogDescription>
                        Search for a name, phone number, or address to see if a customer is on the ban list.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input 
                        placeholder="Search bans..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <ScrollArea className="h-[60vh]">
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Reason</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBans.length > 0 ? filteredBans.map(ban => (
                                    <TableRow key={ban.id}>
                                        <TableCell>{ban.name || 'N/A'}</TableCell>
                                        <TableCell>{formatPhoneNumber(ban.phone) || 'N/A'}</TableCell>
                                        <TableCell>{ban.address || 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{ban.reason}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No matching bans found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
