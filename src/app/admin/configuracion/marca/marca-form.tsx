"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Copy,
  Droplets,
  ImageUp,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import {
  COLORES_SUGERIDOS,
  FUENTES,
  FUENTE_DEFAULT,
  buscarFuente,
  mejorContraste,
  normalizarHex,
  textoSobre,
  type Marca,
} from "@/lib/marca";
import { cn } from "@/lib/utils";
import { guardarMarca } from "@/server/actions/marca";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const MAX_LADO = 256;

/** Redimensiona y comprime el logo en el navegador antes de guardarlo. */
async function optimizarLogo(archivo: File): Promise<string> {
  if (archivo.type === "image/svg+xml") {
    // Los SVG ya son livianos y escalan solos
    return await new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
      lector.readAsDataURL(archivo);
    });
  }

  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  // WebP conserva transparencia y pesa mucho menos que PNG
  return canvas.toDataURL("image/webp", 0.92);
}

function GaleriaFuentes({
  valor,
  onChange,
  soloTitulos,
}: {
  valor: string;
  onChange: (key: string) => void;
  soloTitulos?: boolean;
}) {
  const opciones = soloTitulos ? FUENTES : FUENTES.filter((f) => !f.soloTitulos);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {opciones.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onChange(f.key)}
          className={cn(
            "rounded-lg border px-3 py-2 text-left transition-[transform,border-color,background-color] duration-100 active:scale-[0.98]",
            valor === f.key
              ? "border-primary bg-primary/5"
              : "border-input hover:bg-accent"
          )}
        >
          <p
            className="text-lg leading-tight"
            style={{ fontFamily: `var(${f.variable})` }}
          >
            {f.nombre}
          </p>
          <p className="text-xs text-muted-foreground">{f.descripcion}</p>
        </button>
      ))}
    </div>
  );
}

export function MarcaForm({
  nombre,
  slug,
  inicial,
}: {
  nombre: string;
  slug: string;
  inicial: Marca;
}) {
  const router = useRouter();
  const [logo, setLogo] = React.useState<string | null>(inicial.logoUrl);
  const [color, setColor] = React.useState(inicial.colorPrimario ?? "#2563eb");
  const [usaColor, setUsaColor] = React.useState(!!inicial.colorPrimario);
  const [fuenteTexto, setFuenteTexto] = React.useState(
    inicial.tipografiaTexto ?? FUENTE_DEFAULT
  );
  const [tituloDistinto, setTituloDistinto] = React.useState(
    !!inicial.tipografiaTitulo
  );
  const [fuenteTitulo, setFuenteTitulo] = React.useState(
    inicial.tipografiaTitulo ?? FUENTE_DEFAULT
  );
  const [pending, setPending] = React.useState(false);
  const inputArchivo = React.useRef<HTMLInputElement>(null);

  const colorValido = normalizarHex(color);
  const contraste = colorValido ? mejorContraste(colorValido) : 21;
  const contrasteBajo = contraste < 4.5;

  const varsPreview = {
    "--primary": usaColor && colorValido ? colorValido : undefined,
    "--primary-foreground":
      usaColor && colorValido ? textoSobre(colorValido) : undefined,
    "--fuente-texto": `var(${buscarFuente(fuenteTexto).variable})`,
    "--fuente-titulos": `var(${
      buscarFuente(tituloDistinto ? fuenteTitulo : fuenteTexto).variable
    })`,
  } as React.CSSProperties;

  const guardar = async () => {
    setPending(true);
    const r = await guardarMarca({
      logoUrl: logo ?? "",
      colorPrimario: usaColor ? color : null,
      tipografiaTexto: fuenteTexto,
      tipografiaTitulo: tituloDistinto ? fuenteTitulo : null,
    });
    setPending(false);
    if (r?.error) toast.error(r.error);
    else {
      toast.success("Marca actualizada");
      router.refresh();
    }
  };

  const linkPublico =
    typeof window !== "undefined" ? `${window.location.origin}/l/${slug}` : `/l/${slug}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ===== Configuración ===== */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border bg-muted/40">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt="Logo"
                    className="max-h-16 max-w-16 object-contain"
                  />
                ) : (
                  <Droplets className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => inputArchivo.current?.click()}
                >
                  <ImageUp className="h-4 w-4" />
                  {logo ? "Cambiar logo" : "Subir logo"}
                </Button>
                {logo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setLogo(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Quitar
                  </Button>
                )}
              </div>
              <input
                ref={inputArchivo}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={async (e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = "";
                  if (!archivo) return;
                  try {
                    const optimizado = await optimizarLogo(archivo);
                    if (optimizado.length > 200_000) {
                      toast.error("El logo es demasiado pesado, probá con otro archivo");
                      return;
                    }
                    setLogo(optimizado);
                    toast.success("Logo cargado — acordate de guardar");
                  } catch {
                    toast.error("No se pudo procesar la imagen");
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP o SVG. Se optimiza automáticamente en tu dispositivo
              antes de guardarse. Ideal: fondo transparente y cuadrado.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              Color principal
              <Switch checked={usaColor} onCheckedChange={setUsaColor} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {usaColor ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {COLORES_SUGERIDOS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={`Color ${c}`}
                      className={cn(
                        "h-9 w-9 rounded-full border-2 transition-transform duration-100 active:scale-90",
                        color.toLowerCase() === c.toLowerCase()
                          ? "border-foreground"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {color.toLowerCase() === c.toLowerCase() && (
                        <Check
                          className="mx-auto h-4 w-4"
                          style={{ color: textoSobre(c) }}
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorValido ?? "#2563eb"}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border bg-transparent"
                    aria-label="Elegir color personalizado"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-32 font-mono"
                    aria-label="Código hex del color"
                  />
                  {!colorValido && (
                    <span className="text-xs text-destructive">
                      Formato inválido (#RRGGBB)
                    </span>
                  )}
                </div>
                {colorValido && contrasteBajo && (
                  <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Este color tiene poco contraste ({contraste.toFixed(1)}:1). El
                    texto encima puede leerse mal — probá una versión más oscura.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Usando el color por defecto de la app.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tipografía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Textos</Label>
              <GaleriaFuentes valor={fuenteTexto} onChange={setFuenteTexto} />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Títulos con otra tipografía</p>
                <p className="text-xs text-muted-foreground">
                  Combinación clásica: una fuente de impacto arriba y una legible
                  en el cuerpo
                </p>
              </div>
              <Switch checked={tituloDistinto} onCheckedChange={setTituloDistinto} />
            </div>
            {tituloDistinto && (
              <div className="space-y-2">
                <Label>Títulos</Label>
                <GaleriaFuentes
                  valor={fuenteTitulo}
                  onChange={setFuenteTitulo}
                  soloTitulos
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Link para tus clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Input readOnly value={linkPublico} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                aria-label="Copiar link"
                onClick={() => {
                  navigator.clipboard.writeText(linkPublico);
                  toast.success("Link copiado");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este link abre la app con tu marca. Sirve para el QR del mostrador,
              Instagram y WhatsApp.
            </p>
          </CardContent>
        </Card>

        <Button className="w-full sm:w-auto" disabled={pending} onClick={guardar}>
          {pending ? "Guardando…" : "Guardar marca"}
        </Button>
      </div>

      {/* ===== Preview en vivo ===== */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Así lo ve tu cliente
        </p>
        <div
          style={varsPreview}
          className="overflow-hidden rounded-2xl border bg-muted/30 shadow-sm"
        >
          <div className="flex items-center gap-2 border-b bg-background px-4 py-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Droplets className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{nombre}</p>
              <p
                className="truncate text-sm font-semibold"
                style={{ fontFamily: "var(--fuente-titulos)" }}
              >
                Hola, Carla 👋
              </p>
            </div>
          </div>

          <div
            className="space-y-3 p-4"
            style={{ fontFamily: "var(--fuente-texto)" }}
          >
            <div className="rounded-xl bg-primary p-4 text-primary-foreground">
              <p className="text-xs opacity-80">Tu nivel</p>
              <p
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--fuente-titulos)" }}
              >
                Plata
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full w-2/3 rounded-full bg-white" />
              </div>
            </div>

            <div className="rounded-xl border bg-background p-3">
              <p className="text-xs text-muted-foreground">Próximo turno</p>
              <p className="text-sm font-semibold">Lunes 3/08 a las 10:00</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="success">Confirmado</Badge>
                <span className="text-xs text-muted-foreground">Lavado completo</span>
              </div>
            </div>

            <Button className="w-full">
              <CalendarDays className="h-4 w-4" />
              Pedir un turno
            </Button>
            <Button variant="outline" className="w-full">
              Ver mi historial
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          El preview se actualiza al instante; los cambios se aplican en toda la
          app cuando tocás “Guardar marca”.
        </p>
      </div>
    </div>
  );
}
