// /auth?token=xxx — server-validates the magic link token.
// This page just shows a brief loading state; the API route does the redirect.

import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Auth() {
  const router = useRouter();

  useEffect(() => {
    const { token } = router.query;
    if (token) {
      window.location.href = `/api/pro/auth?token=${token}`;
    } else {
      router.replace("/login?error=missing_token");
    }
  }, [router.query]);

  return (
    <>
      <Head><title>Signing in… — Townhall Café Pro</title></Head>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0F1E", color: "#8A95AB", fontFamily: "Inter, sans-serif", fontSize: "15px" }}>
        Signing you in…
      </div>
    </>
  );
}
