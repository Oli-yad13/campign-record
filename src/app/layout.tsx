import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SwRegister from "@/components/SwRegister";
import AuthGate from "@/components/AuthGate";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Community Outreach Portal",
  description: "Campaign MRS - Community Outreach Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SwRegister />
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--foreground)', borderBottom: '1px solid var(--border)', boxSizing: 'border-box', gap: '12px' }}>
          <img src="/psi.jpg" alt="PSI logo" style={{ height: 48, width: 'auto', maxWidth: 180, objectFit: 'contain' }} />
          <span style={{ flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Community Outreach Portal</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/admin" style={{ fontSize: 14, color: 'var(--text)', padding: '6px 10px', borderRadius: 999, border: '1px solid var(--border)' }}>Admin</Link>
            <ThemeToggle />
            <img src="/tihut%20clinic%20logo%20(2).png" alt="Tihut Medium Clinic logo" style={{ height: 40, width: 'auto', maxWidth: 240, objectFit: 'contain' }} />
          </div>
        </div>
        <AuthGate>
          {children}
        </AuthGate>
      </body>
    </html>
  );
}
