import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2Bfit CRM",
  description: "מערכת ניהול עבור עסק האימונים 2Bfit",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
