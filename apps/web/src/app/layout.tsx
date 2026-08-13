import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Instrument_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VeritasIQ",
  description: "AI Market Intelligence & Risk Copilot",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-void text-ink">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#4DA3FF",
              colorBackground: "#12161F",
              colorText: "#F4F6FA",
              colorTextSecondary: "#7C8497",
              colorInputBackground: "#0A0D12",
              colorInputText: "#F4F6FA",
              colorNeutral: "#232838",
              borderRadius: "0.5rem",
              fontFamily: "var(--font-inter)",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
