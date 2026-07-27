import { redirect } from "next/navigation";

// La landing por defecto es el Tablero (rol Ingeniería Clínica). El escáner
// vive en /escanear como acción explícita al final del menú.
export default function Home() {
  redirect("/tablero");
}
