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

const APP_NAME = "太る家計簿";
const APP_DESCRIPTION =
  "毎日の支出をサッと記録。使いすぎるとキャラクターが太る、続けたくなる家計簿アプリ。";

export const metadata: Metadata = {
  // OGP画像などの相対URLを絶対URLに解決するために必要
  metadataBase: new URL("https://hutorukakeibo.vercel.app"),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
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
  // LINEやメッセージアプリでリンク共有した際のプレビュー（タイトル・画像）
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 1200, alt: APP_NAME }],
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/og-image.png"],
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
