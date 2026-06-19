import "./globals.css";
import { Unbounded, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";

const display = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700"],
  variable: "--font-display-loaded",
  display: "swap",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
  display: "swap",
});

export const metadata = {
  title: "Call Summary — записи встреч",
  description: "Кастомные саммари созвонов: выводы и задачи кто / что / дедлайн.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
