import { Suspense } from "react";
import { LoginPanel } from "@/components/auth/LoginPanel";

export default function LoginPage() {
  return (
    <main className="app-shell items-center justify-center px-safe px-6 text-center">
      <Suspense fallback={null}>
        <LoginPanel />
      </Suspense>
    </main>
  );
}
