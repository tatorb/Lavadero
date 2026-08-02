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

1. Crear una base en [Neon](https://neon.tech) y copiar las dos cadenas de conexión.
2. En Vercel, configurar las variables:
   - `DATABASE_URL`: cadena **pooled** de Neon (runtime).
   - `DIRECT_URL`: cadena **directa** de Neon (migraciones).
   - `AUTH_SECRET`: `npx auth secret` o `openssl rand -base64 32`.
3. Aplicar migraciones y seed contra Neon:
   ```bash
   DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy
   DATABASE_URL=... DIRECT_URL=... npx prisma db seed   # opcional, datos demo
   ```
4. Deploy normal — `postinstall` corre `prisma generate` automáticamente.

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
