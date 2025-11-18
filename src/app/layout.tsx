import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/user/UserContext";
import { ToastProvider } from "@/context/toast";
import MuiProvider from "@/components/common/MuiProvider";


import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crag Tag',
  description: 'The blog forum for who love hiking',
};


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <MuiProvider>
          <ToastProvider>
            <UserProvider>
              {children}
            </UserProvider>
          </ToastProvider>
        </MuiProvider>
      </body>
    </html>
  );
}
