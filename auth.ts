import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";

// ──────────────────────────────────────────────────────────────────────────────
// Extend the built-in session/JWT types
// ──────────────────────────────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id:   string;
      role: string;
    } & DefaultSession["user"];
  }
  interface User {
    role: string;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// NextAuth v5 configuration (Node.js only — includes Prisma)
// ──────────────────────────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email:    { label: "אימייל",  type: "email"    },
        password: { label: "סיסמה",   type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where:   { email: credentials.email as string },
          include: { profile: true },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id:    user.id,
          email: user.email,
          role:  user.role,
          name:  user.profile
            ? `${user.profile.firstName} ${user.profile.lastName}`
            : user.email,
        };
      },
    }),
  ],
});
