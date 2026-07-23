// Logo del sistema: la H de "horus" con una línea de ECG que sale del asta central.
// SVG puro, sin dependencias, para que quede nítido a cualquier tamaño y sea theme-friendly.
export default function Logo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 130 32"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="horus"
      className={className}
    >
      {/* Marca: la H */}
      <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4 V28" />
        <path d="M24 4 V28" />
        {/* Barra horizontal con la línea de ECG saliendo hacia la derecha */}
        <path d="M4 16 H24 M28 16 H32 L34 10 L37 22 L40 8 L43 24 L46 16 H50" />
      </g>
      {/* Wordmark */}
      <text
        x="56"
        y="23"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontSize="22"
        fontWeight="700"
        fill="currentColor"
        letterSpacing="0.5"
      >
        horus
      </text>
    </svg>
  );
}
