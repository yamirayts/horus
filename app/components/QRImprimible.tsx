"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRImprimibleProps {
  id: string;
}

/**
 * Genera el QR de un equipo en el navegador (sin llamada al servidor) y lo muestra
 * listo para imprimir: borde de guía de corte y sin depender de datos externos.
 */
export default function QRImprimible({ id }: QRImprimibleProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setDataUrl(null);
    setError(null);
    // El QR codifica una URL absoluta a /scan?id=<ID> del propio despliegue.
    // Así se puede escanear con la cámara nativa del celular y abre la app
    // directamente sin necesidad de tenerla abierta primero.
    const contenido = `${window.location.origin}/scan?id=${encodeURIComponent(id)}`;
    QRCode.toDataURL(contenido, { errorCorrectionLevel: "Q", margin: 1 })
      .then((url) => {
        if (!cancelado) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo generar el código QR.");
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <div className="inline-flex w-fit flex-col items-center gap-2 rounded border-2 border-dashed border-gray-300 bg-white p-4 print:border-black print:p-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !dataUrl && <p className="text-sm text-gray-500">Generando QR…</p>}
      {dataUrl && (
        // dataURL local: no aplica la optimización de next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`Código QR del equipo ${id}`} width={160} height={160} className="h-40 w-40" />
      )}
      <p className="font-mono text-base font-bold">{id}</p>
    </div>
  );
}
