import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Encosta — Gestão de Obras",
  description: "Cronograma, documentos e prazos das obras da Encosta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
