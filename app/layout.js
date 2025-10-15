// app/layout.js
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "./components/ToastProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Career Compass | Job Applications Dashboard",
  description: "Track your job applications, statuses, and next actions in a clean Supabase-powered dashboard.",
  metadataBase: new URL("https://careercompass.vercel.app"),
  openGraph: {
    title: "Career Compass",
    description: "Track your job applications, statuses, and next actions in a clean Supabase-powered dashboard.",
    url: "https://careercompass.vercel.app",
    siteName: "Career Compass",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Career Compass dashboard preview" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Career Compass",
    description: "Track your job applications, statuses, and next actions in a clean Supabase-powered dashboard.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Solid fallback + prevent horizontal scroll revealing body bg */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-x-hidden`}
      >
        {/* Full-viewport, full-width gradient (stretches in Safari/Chrome) */}
        <div
          className="
            w-screen min-h-screen
            bg-fixed bg-no-repeat [background-size:100%_100%]
            bg-[radial-gradient(120%_120%_at_50%_0%,var(--tw-gradient-stops))]
            from-white via-slate-50 to-slate-100
            dark:from-[#0b1220] dark:via-[#0b1324] dark:to-[#0b1428]
          "
        >
          <div className="mx-auto max-w-6xl px-4 py-6">
            <ToastProvider>{children}</ToastProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
