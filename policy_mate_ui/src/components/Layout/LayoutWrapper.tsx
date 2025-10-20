"use client";

import { usePathname } from "next/navigation";
import { UniversalHeader } from "@/components/Header/UniversalHeader";
import type { ReactNode } from "react";

// Routes that should NOT show the header (full-screen pages)
const routesWithoutHeader: string[] = ["/login", "/register", "/architecture"];

interface LayoutWrapperProps {
    children: ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
    const pathname = usePathname();
    const shouldShowHeader = !routesWithoutHeader.includes(pathname);

    // For pages without header, don't add wrapper constraints
    if (!shouldShowHeader) {
        return <>{children}</>;
    }

    // For pages with header, use fixed viewport height with flex layout
    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <UniversalHeader />
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
}
