import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { BottomNav } from "@/components/nav/BottomNav";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-dvh flex-col bg-canvas px-safe">
        <main className="mx-auto w-full max-w-md flex-1 overflow-y-auto pb-28">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 border-t border-black/5 bg-surface pb-safe">
          <BottomNav />
        </nav>
      </div>
    </AuthGate>
  );
}
