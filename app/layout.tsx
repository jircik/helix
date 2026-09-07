import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helix",
  description: "CRM de prospecção geográfica",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
