// Iconos SVG por tipo de equipo. Sin dependencias; se colorean con currentColor.

type Props = { tipo: string; className?: string };

export default function IconoTipo({ tipo, className = "h-6 w-6" }: Props) {
  if (tipo === "bomba_infusion") {
    // Bomba de infusión: pantalla rectangular con display y gotero.
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <rect x="4" y="3" width="12" height="14" rx="1.5" />
        <path d="M6 6h8M6 9h5" />
        <circle cx="8" cy="13" r="1" fill="currentColor" />
        <path d="M16 8h3v3l-2 1v6a2 2 0 11-2-2" />
      </svg>
    );
  }
  if (tipo === "monitor") {
    // Monitor multiparamétrico: pantalla con línea de ECG.
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M5 12h3l1-3 2 6 2-5 1 2h5" />
        <path d="M10 20h4" />
        <path d="M12 16v4" />
      </svg>
    );
  }
  if (tipo === "ventilador") {
    // Ventilador mecánico: pantalla con curva de presión y salida de aire.
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <rect x="3" y="5" width="14" height="10" rx="1.5" />
        <path d="M5 12c2 0 2-4 4-4s2 4 4 4 2-2 4-2" />
        <path d="M17 8h4M17 12h3M17 15v3H9" />
      </svg>
    );
  }
  // Fallback genérico.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}
