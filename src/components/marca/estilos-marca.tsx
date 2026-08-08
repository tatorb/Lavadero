import { cssDeMarca, normalizarHex, type Marca } from "@/lib/marca";

/**
 * Inyecta los tokens de marca del lavadero renderizados en el servidor.
 * Al llegar en el HTML inicial no hay parpadeo del color/tipografía default.
 * El CSS se arma sólo con valores validados (hex y claves del catálogo),
 * nunca con texto libre del usuario.
 */
export function EstilosMarca({ marca }: { marca: Marca }) {
  const color = normalizarHex(marca.colorPrimario);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssDeMarca(marca) }} />
      {color && <meta name="theme-color" content={color} />}
    </>
  );
}
