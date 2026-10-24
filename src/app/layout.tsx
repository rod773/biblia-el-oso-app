import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Biblia el oso",
    default: "Biblia el oso — Lector en Voz Alta",
  },
  description:
    "Lectura en voz alta de la Biblia el oso (Reina Valera 1654). Selecciona un libro y capítulo, escucha el texto narrado página por página. Edición escaneada del PDF original en español.",
  keywords:
    "Biblia el oso, Biblia Reina Valera 1654, lectura en voz alta, audio bíblico, Biblia en español, lector bíblico, Reina Valera, audio Biblia, estudio bíblico",
  authors: [{ name: "Biblia el oso" }],
  creator: "Biblia el oso",
  publisher: "Biblia el oso",
  robots: "index, follow",
  category: "Religion & Spirituality",
  applicationName: "Biblia el oso",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Biblia el oso",
  },
  openGraph: {
    title: "Biblia el oso — Lector en Voz Alta",
    description:
      "Lectura en voz alta de la Biblia el oso (Reina Valera 1654). Selecciona un libro y capítulo, escucha el texto narrado página por página.",
    url: "https://biblia-el-oso-gggrpohb1-rod773s-projects.vercel.app",
    siteName: "Biblia el oso",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Biblia el oso",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Biblia el oso — Lector en Voz Alta",
    description:
      "Lectura en voz alta de la Biblia el oso (Reina Valera 1654). Selecciona un libro y capítulo, escucha el texto narrado página por página.",
    images: ["/icon-512x512.png"],
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#071a33",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta
          name="google-site-verification"
          content="google6b952db2d93bb4b8"
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
