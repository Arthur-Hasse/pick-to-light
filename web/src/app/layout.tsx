import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MULTILOG · Pick to Light & Smart Inventory",
  description: "Sistema Integrado de Armazenagem Inteligente com Pick-to-Light e Balança de Dupla Verificação",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0B0D14] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
