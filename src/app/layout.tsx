import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SwRegister from "@/components/SwRegister";
import AuthGate from "@/components/AuthGate";

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
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#fff', borderBottom: '1px solid #ededed', boxSizing: 'border-box', gap: '12px' }}>
          <img src="/psi.jpg" alt="PSI logo" style={{ height: 48, width: 'auto', maxWidth: 180, objectFit: 'contain' }} />
          <span style={{ flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>Community Outreach Portal</span>
          <img src="/tihut%20clinic%20logo%20(2).png" alt="Tihut Medium Clinic logo" style={{ height: 48, width: 'auto', maxWidth: 340, objectFit: 'contain' }} />
        </div>
        <AuthGate>
          {children}
        </AuthGate>
      </body>
    </html>
  );
}
