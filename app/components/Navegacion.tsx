"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Menú principal de navegación. Mobile-first: en pantallas chicas se despliega desde
// un botón hamburguesa; en escritorio queda visible arriba. Se oculta al imprimir.
const secciones: { href: string; label: string }[] = [
  { href: "/", label: "Escanear" },
  { href: "/tablero", label: "Tablero" },
  { href: "/equipos", label: "Equipos" },
  { href: "/alta", label: "Alta" },
  { href: "/etiquetas", label: "Etiquetas" },
  { href: "/prueba", label: "Modo prueba" },
];

export default function Navegacion() {
  const path = usePathname();
  const [abierto, setAbierto] = useState(false);

  const esActiva = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 print:hidden">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="font-semibold text-gray-900">
            horus
          </Link>
          <button
            type="button"
            className="md:hidden p-2 -mr-2 rounded hover:bg-gray-100"
            aria-label="Abrir menú"
            aria-expanded={abierto}
            onClick={() => setAbierto((v) => !v)}
          >
            <span className="block w-6 h-0.5 bg-gray-900 mb-1.5" />
            <span className="block w-6 h-0.5 bg-gray-900 mb-1.5" />
            <span className="block w-6 h-0.5 bg-gray-900" />
          </button>
          <ul className="hidden md:flex items-center gap-1">
            {secciones.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className={`px-3 py-2 rounded text-sm ${
                    esActiva(s.href)
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {abierto && (
          <ul className="md:hidden pb-3 flex flex-col gap-1">
            {secciones.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  onClick={() => setAbierto(false)}
                  className={`block px-3 py-2 rounded text-sm ${
                    esActiva(s.href)
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}
