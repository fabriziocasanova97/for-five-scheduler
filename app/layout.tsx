import type { Metadata } from "next";
import { Inter } from "next/font/google"; // <--- Back to Inter
import "./globals.css";
import Header from "./components/Header";

// Initialize Inter Font
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "For Five Scheduler",
  description: "Internal shift management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}> {/* <--- Apply Inter here */}
        <Header />
        {children}
      </body>
    </html>
  );
}