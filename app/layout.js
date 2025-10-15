// app/layout.js
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "./components/ToastProvider"; // ✅ correct relative path

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Career Compass | Job Applications Dashboard",
  description:
    "Track your job applications, statuses, and next actions in a clean Supabase-powered dashboard.",
  metadataBase: new URL("https://careercompass.vercel.app"),
  openGraph: {
    title: "Career Compass",
    description:
      "Track your job applications, statuses, and next actions in a clean Supabase-powered dashboard.",
    url: "https://careercompass.vercel.app",
    siteName: "Career Compass",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "Career Compass dashboard preview" },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Career Compass",
    description:
      "Track your job applications, statuses, and next actions in a clean Supabase-powered dashboard.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen text-slate-900 dark:text-slate-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-[#f8fafc] to-[#f1f5f9] dark:from-[#0b1220] dark:via-[#0b1324] dark:to-[#0b1428]`}
      >
        <div className="mx-auto max-w-6xl px-4 py-6">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </body>
    </html>
  );
}
