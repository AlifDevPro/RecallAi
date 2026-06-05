import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8d6ee2f0-552c-4398-afe7-e8441f822bd9/id-preview-00c95e9b--8655068f-791b-4238-8cf9-113d2137b118.lovable.app-1778987657638.png";

export const metadata: Metadata = {
  title: "Recall AI — AI-Powered Spaced Repetition",
  description:
    "Recall AI uses AI and spaced repetition to help you remember what you learn. Never forget again.",
  openGraph: {
    title: "Recall AI — AI-Powered Spaced Repetition",
    description:
      "Recall AI uses AI and spaced repetition to help you remember what you learn. Never forget again.",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recall AI — AI-Powered Spaced Repetition",
    description:
      "Recall AI uses AI and spaced repetition to help you remember what you learn. Never forget again.",
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function(){try{var k="recall.theme";var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.classList.toggle("dark",t==="dark");}catch(e){document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
