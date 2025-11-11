import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "FxProTrades - Automated Trading Bot Platform",
    description: "Build and deploy automated trading bots without coding. Powered by Deriv.",
    icons: {
        icon: '/favicon.svg',
        apple: '/icon-512.svg',
    },
    manifest: '/manifest.json',
    themeColor: '#FFD700',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'FxProTrades',
    },
    viewport: {
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
            <head>
                <Script
                    crossOrigin="anonymous"
                    src="//unpkg.com/same-runtime/dist/index.global.js"
                />
            </head>
            <body suppressHydrationWarning className="antialiased">
                <ClientBody>{children}</ClientBody>
            </body>
        </html>
    );
}
