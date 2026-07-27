import EscanerQR from "@/app/components/EscanerQR";

// Escáner QR a pantalla completa, mobile-first y sin pasos intermedios.
// Modo cadena rápida: el enfermero abre esta pantalla una vez y escanea varios
// equipos consecutivos sin salir. El flujo casual (desde la cámara nativa del
// celular) usa /scan?id=... — ver README y TFI.
export default function EscanearPage() {
  return (
    <main className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
      <div className="pointer-events-none absolute left-3 top-3 z-20 rounded bg-black/40 px-2 py-1 text-xs font-semibold text-white">
        horus · escáner
      </div>
      <EscanerQR />
    </main>
  );
}
