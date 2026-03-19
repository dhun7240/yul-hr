import { Suspense } from "react";
import LoginPageClient from "./_login-page-client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}