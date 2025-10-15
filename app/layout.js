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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen overflow-x-hidden text-slate-900`}
      >
        <div className="mx-auto max-w-6xl px-4 py-6">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </body>
    </html>
  );
}
