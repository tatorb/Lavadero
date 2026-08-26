"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Car, Heart, NotebookPen, Repeat, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

import { formatARS, formatFecha } from "@/lib/format";
import { guardarPerfilCliente } from "@/server/actions/clientes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface DatosPerfil {
  perfil: string | null;
  queValora: string | null;
  preferencias: string | null;
  detalles: string | null;
}

export interface Habitos {
  servicioFavorito: string | null;
  vecesServicioFavorito: number;
  gastoPromedio: number | null;
  /** Días promedio entre visitas, null si vino una sola vez */
  cadaCuantosDias: number | null;
  primeraVisitaISO: string | null;
  ultimaVisitaISO: string | null;
}

const CAMPOS = [
  {
    clave: "perfil" as const,
    titulo: "Quién es",
    icono: User,
    ayuda: "Taxista, viaja mucho, viene con los chicos, trabaja enfrente…",
  },
  {
    clave: "queValora" as const,
    titulo: "Qué valora",
    icono: Heart,
    ayuda: "Rapidez, que el interior quede impecable, el precio, la atención…",
  },
  {
    clave: "preferencias" as const,
    titulo: "Preferencias y manías",
    icono: Sparkles,
    ayuda: "Sin aromatizante, no tocar el baúl, avisar por WhatsApp cuando está…",
  },
  {
    clave: "detalles" as const,
    titulo: "Observaciones",
    icono: NotebookPen,
    ayuda: "Cualquier cosa que convenga recordar la próxima vez.",
  },
];

/** Dato suelto de la ficha, con su etiqueta arriba. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <div className="font-medium">{valor}</div>
    </div>
  );
}

/**
 * Perfil del cliente: la ficha dura, sus autos, lo que el mostrador sabe de él
 * y los hábitos que se deducen del historial. Los campos cualitativos se
 * editan en el lugar — se completan de a poco, a medida que se los conoce.
 */
export function PerfilTab({
  clienteId,
  ficha,
  datos,
  autos,
  habitos,
  timezone,
}: {
  clienteId: string;
  ficha: {
    relacion: string;
    origen: string | null;
    telefono: string | null;
    email: string | null;
    nombreOriginal: string | null;
    nombre: string;
    visitasAnotadas: number | null;
    totalLavados: number;
    totalGastado: number;
    vinculadoCon: string | null;
    vinculoTipo: string | null;
  };
  datos: DatosPerfil;
  autos: Array<{ id: string; label: string; tipo: string; lavados: number }>;
  habitos: Habitos;
  timezone: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = React.useState<string | null>(null);
  const [borrador, setBorrador] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);

  const guardar = async (campo: keyof DatosPerfil) => {
    setGuardando(true);
    const r = await guardarPerfilCliente(clienteId, campo, borrador);
    setGuardando(false);
    if (r?.error) toast.error(r.error);
    else {
      toast.success("Perfil actualizado");
      setEditando(null);
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="etiqueta flex items-center gap-2">
            <User className="h-4 w-4" /> Ficha
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Dato etiqueta="Relación" valor={ficha.relacion} />
          <Dato etiqueta="¿Cómo llegó?" valor={ficha.origen ?? "Sin dato"} />
          <Dato etiqueta="Teléfono" valor={ficha.telefono ?? "Sin dato"} />
          <Dato etiqueta="Email" valor={ficha.email ?? "Sin dato"} />
          <Dato
            etiqueta="Historial"
            valor={`${ficha.totalLavados} lavados · ${formatARS(ficha.totalGastado)}`}
          />
          {ficha.vinculadoCon && (
            <Dato
              etiqueta="Vínculo"
              valor={
                <span className="flex flex-wrap items-center gap-2">
                  {ficha.vinculadoCon}
                  {ficha.vinculoTipo && <Badge variant="info">{ficha.vinculoTipo}</Badge>}
                </span>
              }
            />
          )}
          {ficha.nombreOriginal && ficha.nombreOriginal !== ficha.nombre && (
            <Dato etiqueta="Nombre en el registro original" valor={ficha.nombreOriginal} />
          )}
          {ficha.visitasAnotadas != null && (
            <Dato
              etiqueta="Visitas anotadas a mano (control)"
              valor={`${ficha.visitasAnotadas} anotadas · ${ficha.totalLavados} reales`}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="etiqueta flex items-center gap-2">
            <Car className="h-4 w-4" /> Autos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {autos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin autos cargados.</p>
          ) : (
            autos.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{a.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a.tipo} · {a.lavados} {a.lavados === 1 ? "lavado" : "lavados"}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {(habitos.servicioFavorito || habitos.cadaCuantosDias != null) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="etiqueta flex items-center gap-2">
              <Repeat className="h-4 w-4" /> Hábitos
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {habitos.servicioFavorito && (
              <Dato
                etiqueta="Servicio que más pide"
                valor={`${habitos.servicioFavorito} (${habitos.vecesServicioFavorito}×)`}
              />
            )}
            {habitos.gastoPromedio != null && (
              <Dato etiqueta="Gasto promedio" valor={formatARS(habitos.gastoPromedio)} />
            )}
            {habitos.cadaCuantosDias != null && (
              <Dato
                etiqueta="Viene cada"
                valor={`${habitos.cadaCuantosDias} días en promedio`}
              />
            )}
            {habitos.primeraVisitaISO && (
              <Dato
                etiqueta="Cliente desde"
                valor={formatFecha(new Date(habitos.primeraVisitaISO), "MMMM yyyy", timezone)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {CAMPOS.map(({ clave, titulo, icono: Icono, ayuda }) => {
        const valor = datos[clave];
        const enEdicion = editando === clave;
        return (
          <Card key={clave}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="etiqueta flex items-center gap-2">
                <Icono className="h-4 w-4" /> {titulo}
              </CardTitle>
              {!enEdicion && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setEditando(clave);
                    setBorrador(valor ?? "");
                  }}
                >
                  {valor ? "Editar" : "Agregar"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {enEdicion ? (
                <div className="space-y-2">
                  <Label htmlFor={clave} className="text-xs text-muted-foreground">
                    {ayuda}
                  </Label>
                  <Textarea
                    id={clave}
                    rows={3}
                    value={borrador}
                    onChange={(e) => setBorrador(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditando(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={guardando}
                      onClick={() => guardar(clave)}
                    >
                      {guardando ? "Guardando…" : "Guardar"}
                    </Button>
                  </div>
                </div>
              ) : valor ? (
                <p className="whitespace-pre-wrap text-sm">{valor}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{ayuda}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
