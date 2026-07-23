import EscanerQR from "@/app/components/EscanerQR";

// Pantalla principal: escaneo QR a pantalla completa, mobile-first y sin pasos intermedios.
// Queda siempre accesible y rápida para el personal, sin autenticación (igual que /tablero,
// que en esta versión es público — ver README).
export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <div className="pointer-events-none absolute left-3 top-3 z-20 rounded bg-black/40 px-2 py-1 text-xs font-semibold text-white">
        horus
      </div>
      <EscanerQR />
    </main>
  );
}
