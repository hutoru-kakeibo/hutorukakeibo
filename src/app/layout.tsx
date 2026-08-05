import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import "./globals.css";

const rounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PetiteBudget",
    template: "%s | PetiteBudget",
  },
  description:
    "毎日の支出をサッと記録。使いすぎるとキャラクターが太る、続けたくなる家計簿アプリ。",
  applicationName: "PetiteBudget",
  appleWebApp: {
    capable: true,
    title: "PetiteBudget",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    // Next.js は標準名の mobile-web-app-capable のみ出力する。
    // iOS 17 未満はこの旧名しか解釈しないため明示的に付与する。
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#22a06b",
  width: "device-width",
  initialScale: 1,
  // iPhone のノッチ／ホームインジケータ領域まで描画し、safe-area-inset を有効にする
  viewportFit: "cover",
  // 入力欄フォーカス時の意図しないズームを防ぐ（フォント16px以上と併用）
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${rounded.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppProviders>
          {children}
          <ServiceWorkerRegistrar />
        </AppProviders>
      </body>
    </html>
  );
}
