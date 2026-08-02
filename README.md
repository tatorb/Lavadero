# Lavadero

Aplicación de gestión para lavaderos de autos con experiencia gamificada para el cliente.

## Superficies

| Superficie | Ruta | Quién la usa |
|---|---|---|
| Panel de gestión | `/admin` | Admin y operativos del lavadero |
| Panel super-admin | `/super` | Gestión de múltiples lavaderos y usuarios |
| App del cliente (mobile-first) | `/` | Clientes finales |

### Funcionalidades

- **Gestión**: clientes (con autos y vínculo pareja/familiar que comparte autos y beneficios), calendario de turnos con vistas día/semana/mes estilo Google Calendar, lavados con timeline llegada → inicio → fin, servicios y adicionales, reglas de turnos por franja horaria.
- **Reglas de turnos por franja**: por día de semana y rango horario se configura confirmación automática o manual, anticipación mínima/máxima y capacidad por slot. Ej.: "sábados de 9 a 12 solo con 24 h de anticipación", "lunes reserva directa".
- **Gamificación**: cada lavado finalizado suma puntos (ledger en `PuntosMovimiento`); niveles Bronce/Plata/Oro con progreso, racha de visitas y descuentos ligados al nivel. Los clientes vinculados comparten el mejor nivel de los dos.
- **App del cliente**: home con nivel/progreso/racha, descuentos, historial de lavados, pedir turno con wizard (los horarios salen de las reglas de franja) y perfil.
- **Multi-tenant**: toda la base está asociada a un lavadero (`lavaderoId`); el tenant sale siempre de la sesión, nunca del input.

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL + Prisma 6 · Auth.js v5 (credentials, JWT) · Tailwind CSS 4 + componentes estilo shadcn/ui (Radix) · TanStack Table · date-fns(-tz) · Vitest.

## Desarrollo local

```bash
# 1. Base de datos
docker compose up -d          # Postgres 16 en :5432

# 2. Variables de entorno
cp .env.example .env          # ajustar AUTH_SECRET

# 3. Dependencias, migraciones y datos demo
npm install
npx prisma migrate dev
npx prisma db seed

# 4. Levantar
npm run dev                   # http://localhost:3000
```

### Usuarios demo (contraseña `demo1234`)

| Email | Rol |
|---|---|
| `super@demo.com` | Super admin (`/super`) |
| `admin@demo.com` | Admin del lavadero (`/admin`) |
| `operativo@demo.com` | Operativo (`/admin`, sin edición de servicios/reglas) |
| `cliente@demo.com` | Cliente (app mobile en `/`) |

### Tests

```bash
npm test        # motor de reglas de franja + gamificación (Vitest)
```

## Deploy (Vercel + Neon)

1. En [vercel.com/new](https://vercel.com/new), **importar este repo** desde GitHub (elegir la rama a deployar).
2. En el proyecto de Vercel → **Storage → Create Database → Neon** (o crear la base en [neon.tech](https://neon.tech) a mano). La integración crea `DATABASE_URL` (pooled) y `DATABASE_URL_UNPOOLED` automáticamente.
3. En **Settings → Environment Variables** agregar:
   - `DIRECT_URL`: el valor de `DATABASE_URL_UNPOOLED` (conexión directa, para migraciones).
   - `AUTH_SECRET`: generar con `npx auth secret` o `openssl rand -base64 32`.
4. **Deploy.** Las migraciones corren solas en cada build (`vercel.json` ejecuta `prisma migrate deploy` antes de `next build`).
5. Cargar los datos demo (opcional, una sola vez, desde tu máquina):
   ```bash
   DATABASE_URL="<cadena directa de Neon>" DIRECT_URL="<la misma>" npx prisma db seed
   ```

## Estructura

```
prisma/               schema multi-tenant + seed demo
src/
├── proxy.ts          protección de rutas por rol (edge)
├── app/
│   ├── (cliente)/    app mobile-first del cliente
│   ├── admin/        panel de gestión (sidebar)
│   ├── super/        panel super-admin
│   └── login|registro/
├── components/       ui/ (kit base), admin/, calendario/, cliente/, turnos/
├── lib/
│   ├── auth*.ts      Auth.js + helpers requireStaff/requireCliente
│   ├── turnos/       motor puro de reglas de franja (+ tests)
│   └── gamificacion/ puntos, niveles y racha (+ tests)
└── server/actions/   server actions por dominio (validan sesión + tenant)
```

## Fuera de esta etapa

Pagos, notificaciones (email/SMS/WhatsApp), OTP por teléfono, recuperación de contraseña, canje real de descuentos en el cobro, bonus por racha, drag & drop del calendario, reportes y RLS de Postgres.
