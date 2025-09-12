
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, Timestamp, setDoc, getDoc } from 'firebase/firestore';
import type { AppUser, Driver } from '@/lib/types';
import { Role } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { formatUserName } from '@/lib/utils';

const roleMap: { [key in keyof typeof Role]?: Role } = {
    DRIVER: Role.DRIVER,
    DISPATCHER: Role.DISPATCHER,
    OWNER: Role.OWNER,
    ADMIN: Role.ADMIN,
};

const getRoleName = (roleValue: Role) => {
  if (roleValue === Role.ALL) return 'None';
  const roles = [];
  if (roleValue & Role.DRIVER) roles.push('Driver');
  if (roleValue & Role.DISPATCHER) roles.push('Dispatcher');
  if (roleValue & Role.OWNER) roles.push('Owner');
  if (roleValue & Role.ADMIN) roles.push('Admin');
  return roles.join(', ') || 'No Role';
};


export function UserManagementTable() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          uid: doc.id,
          id: doc.id,
          name: data.displayName,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        } as AppUser;
      });
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleRoleChange = async (user: AppUser, newRoles: Role) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, { role: newRoles });

      const wasDriver = (user.role & Role.DRIVER) > 0;
      const isDriver = (newRoles & Role.DRIVER) > 0;
      const driverRef = doc(db, 'drivers', user.uid);

      if (isDriver && !wasDriver) {
        // User was just made a driver, create a driver document if it doesn't exist
        const driverDoc = await getDoc(driverRef);
        if (!driverDoc.exists()) {
           const newDriver: Driver = {
                id: user.uid,
                name: user.displayName || user.email || 'Unnamed Driver',
                phoneNumber: '',
                rating: 5,
                status: 'offline',
                location: { x: 50, y: 50 },
            };
            await setDoc(driverRef, newDriver);
             toast({
                title: "Driver Created",
                description: `A new driver profile has been created for ${user.displayName}.`,
            });
        } else {
            // Re-activate an existing driver if they were offline
            await updateDoc(driverRef, { status: 'offline' });
        }
      } else if (!isDriver && wasDriver) {
        // User had driver role removed, set driver to offline if the doc exists
        const driverDoc = await getDoc(driverRef);
        if (driverDoc.exists()) {
            await updateDoc(driverRef, { status: 'offline' });
        }
      }

      toast({
        title: "Success",
        description: "User role updated successfully.",
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user role.",
      });
    }
  };

  const RoleSelector = ({ user }: { user: AppUser }) => {
    const toggleRole = (roleToToggle: Role) => {
        const currentRoles = user.role;
        const newRoles = currentRoles ^ roleToToggle; // XOR to toggle the bit
        handleRoleChange(user, newRoles);
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {getRoleName(user.role)}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Assign Roles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(roleMap).map(([roleName, roleValue]) => (
            <DropdownMenuCheckboxItem
              key={roleName}
              checked={(user.role & roleValue!) > 0}
              onCheckedChange={() => toggleRole(roleValue!)}
            >
              {roleName.charAt(0) + roleName.slice(1).toLowerCase()}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.uid}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.photoURL ?? undefined} />
                    <AvatarFallback>{user.displayName?.[0] || user.email?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{formatUserName(user.displayName || 'N/A')}</span>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                 <RoleSelector user={user} />
              </TableCell>
              <TableCell>
                {user.createdAt ? format(user.createdAt, 'PPpp') : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
