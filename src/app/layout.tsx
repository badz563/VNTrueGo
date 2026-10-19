import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/AppProvider";
import SiteChrome from "@/components/SiteChrome";
import "leaflet/dist/leaflet.css";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "@fontsource/noto-serif/400.css";
import "@fontsource/noto-serif/500.css";
import "@fontsource/noto-serif/600.css";
import "@fontsource/noto-serif/700.css";
import "./globals.css";
export const metadata:Metadata={
  title:{default:"VietNam TrueGo | Khám phá Hà Nội",template:"%s | VietNam TrueGo"},
  description:"Khám phá điểm tham quan Hà Nội, tạo lịch trình cá nhân và nhận cảnh báo thay đổi trong bản demo TrueGo.",
  applicationName:"VietNam TrueGo",
  manifest:"/manifest.webmanifest",
  icons:{icon:"/brand-logo.png",apple:"/brand-logo.png"}
};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#245C4F"};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="vi"><body><AppProvider><SiteChrome>{children}</SiteChrome></AppProvider></body></html>;
}
