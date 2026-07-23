import "./globals.css";
import type { Metadata } from "next";
import Navegacion from "./components/Navegacion";

export const metadata: Metadata = {
  title: "Registro de uso — Equipamiento UCI",
  description: "Sistema de registro de horas de uso por QR (TFI Ing. Clínica UNAJ)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Navegacion />
        {children}
      </body>
    </html>
  );
}
