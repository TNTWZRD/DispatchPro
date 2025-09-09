
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { Loader2, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const VALID_INVITE_CODE = 'KBT04330';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  inviteCode: z.string().min(1, { message: 'Invite code is required.' }),
});

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { createUserWithEmailAndPassword, signInWithGoogle } = useAuth();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      inviteCode: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setError(null);
    if (values.inviteCode !== VALID_INVITE_CODE) {
        form.setError('inviteCode', { type: 'manual', message: 'Invalid invite code.' });
        return;
    }

    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(values.email, values.password);
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use.');
      } else {
        setError('Could not create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

   async function handleGoogleSignIn() {
    setError(null);
    const inviteCode = form.getValues('inviteCode');
    if (!inviteCode) {
        form.setError('inviteCode', { type: 'manual', message: 'Please enter an invite code before using Google Sign-In.' });
        return;
    }
    if (inviteCode !== VALID_INVITE_CODE) {
        form.setError('inviteCode', { type: 'manual', message: 'Invalid invite code.' });
        return;
    }
      
    setIsLoading(true);
    try {
        await signInWithGoogle();
        router.push('/');
    } catch(err) {
        setError('Could not sign in with Google. Please try again.');
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
            <Truck className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">DispatchPro</CardTitle>
        </div>
        <CardDescription>Enter your invite code and create an account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" suppressHydrationWarning>
            <FormField
              control={form.control}
              name="inviteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invite Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your invite code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </Form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.5 173.5 64.2L361.3 128c-28.1-26.1-63.9-42.5-113.3-42.5-87.5 0-159.3 71.6-159.3 160s71.8 160 159.3 160c98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path>
                </svg>
            )}
            Google
        </Button>
      </CardContent>
       <CardFooter>
        <div className="text-sm text-muted-foreground w-full text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
                Sign In
            </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
