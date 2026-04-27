import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MLR Review Tool",
  description: "Rule-based MLR pre-review tool for Medical Affairs workflows"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
