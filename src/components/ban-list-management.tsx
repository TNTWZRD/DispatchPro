
"use client";

import React, { useState, useEffect, useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { Ban } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { addBan, deleteBan } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Trash2, PlusCircle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { formatUserName, formatPhoneNumber } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { EditBanForm } from './edit-ban-form';


const addBanInitialState = { type: '', message: '', errors: null };
function AddBanSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      Add to Ban List
    </Button>
  );
}

export function BanListManagement() {
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, allUsers } = useAuth();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [editingBan, setEditingBan] = useState<Ban | null>(null);

  const [addState, addBanAction, isAddPending] = useActionState(addBan, addBanInitialState);

  useEffect(() => {
    const q = query(collection(db, 'bans'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setBans(snapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate(),
          } as Ban;
      }));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (addState.type === 'success' && !isAddPending) {
        toast({ title: 'Success', description: addState.message });
        formRef.current?.reset();
    } else if (addState.type === 'error' && !isAddPending) {
        toast({ variant: 'destructive', title: 'Error', description: addState.message });
    }
  }, [addState, isAddPending, toast]);

  const handleDelete = async (banId: string) => {
    const result = await deleteBan(banId);
    if (result.type === 'success') {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const getBannedByName = (userId: string) => {
    const banner = allUsers.find(u => u.uid === userId);
    return banner ? formatUserName(banner.displayName, banner.email) : 'Unknown User';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
            <CardHeader>
                <CardTitle>Current Ban List</CardTitle>
                <CardDescription>All currently banned people, addresses, or phone numbers.</CardDescription>
            </CardHeader>
            <CardContent>
                 {bans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
                        <p>The ban list is empty.</p>
                    </div>
                 ) : (
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Banned By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {bans.map(ban => (
                                <TableRow key={ban.id}>
                                    <TableCell>{ban.name || 'N/A'}</TableCell>
                                    <TableCell>{formatPhoneNumber(ban.phone) || 'N/A'}</TableCell>
                                    <TableCell>{ban.address || 'N/A'}</TableCell>
                                    <TableCell className="font-medium">{ban.reason}</TableCell>
                                    <TableCell>{getBannedByName(ban.bannedById)}</TableCell>
                                    <TableCell>{ban.createdAt ? format(ban.createdAt, 'PP') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="outline" size="icon" onClick={() => setEditingBan(ban)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="icon">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently remove this ban. This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(ban.id)}>
                                                            Confirm
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </div>
                 )}
            </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Add New Ban</CardTitle>
            <CardDescription>Add a new entry to the ban list. At least one field is required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} action={addBanAction} className="space-y-4">
              <input type="hidden" name="bannedById" value={user?.uid || ''} />
              
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="e.g., John Doe" />
                {addState?.errors?.name && <p className="text-destructive text-sm">{addState.errors.name[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" placeholder="e.g., 555-867-5309" />
                {addState?.errors?.phone && <p className="text-destructive text-sm">{addState.errors.phone[0]}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" placeholder="e.g., 123 Bad St, Anytown" />
                {addState?.errors?.address && <p className="text-destructive text-sm">{addState.errors.address[0]}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea id="reason" name="reason" placeholder="Reason for the ban..." required />
                 {addState?.errors?.reason && <p className="text-destructive text-sm">{addState.errors.reason[0]}</p>}
              </div>
              {addState?.message && addState.type === 'error' && !addState.errors && (
                <p className="text-sm font-medium text-destructive">{addState.message}</p>
              )}
              <AddBanSubmitButton />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    <EditBanForm 
        ban={editingBan}
        isOpen={!!editingBan}
        onOpenChange={(isOpen) => !isOpen && setEditingBan(null)}
    />
    </>
  );
}
