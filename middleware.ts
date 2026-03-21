import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session  = req.auth;
  const isLoggedIn = !!session;
  const role     = session?.user?.role;

  const isAuthPage    = nextUrl.pathname === "/login" || nextUrl.pathname === "/register";
  const isAdminRoute  = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname === "/";
  const isPortalRoute = nextUrl.pathname.startsWith("/portal");

  // ── Redirect logged-in users away from auth pages ──────────────────────────
  if (isLoggedIn && isAuthPage) {
    const dest = role === "TRAINEE" ? "/portal" : "/dashboard";
    return NextResponse.redirect(new URL(dest, nextUrl));
  }

  // ── Protect all dashboard + portal routes from unauthenticated access ───────
  if (!isLoggedIn && (isAdminRoute || isPortalRoute)) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based routing ──────────────────────────────────────────────────────
  // TRAINEE trying to access admin routes → send to portal
  if (isLoggedIn && role === "TRAINEE" && isAdminRoute) {
    return NextResponse.redirect(new URL("/portal", nextUrl));
  }

  // ADMIN / COACH trying to access trainee portal → send to dashboard
  if (isLoggedIn && role !== "TRAINEE" && isPortalRoute) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/portal/:path*",
    "/login",
    "/register",
  ],
};
