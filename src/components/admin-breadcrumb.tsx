
"use client";

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type BreadcrumbSegment = {
    name: string;
    href?: string;
};

type AdminBreadcrumbProps = {
    segments: BreadcrumbSegment[];
    className?: string;
};

export function AdminBreadcrumb({ segments, className }: AdminBreadcrumbProps) {
    return (
        <nav className={cn("flex items-center space-x-2 text-sm text-muted-foreground", className)}>
            {segments.map((segment, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <ChevronRight className="h-4 w-4" />}
                    {segment.href ? (
                        <Link href={segment.href} className="hover:text-primary transition-colors">
                            {segment.name}
                        </Link>
                    ) : (
                        <span className="font-medium text-foreground">{segment.name}</span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
}
