# BRAVA — tienda de diseño independiente

Tienda en línea para descubrir gorras y accesorios de marcas independientes. Interfaz construida con React y Vite, con catálogo, cuenta de usuario y espacio de administración conectado a Supabase.

## Requisitos

- Node.js 20 o posterior
- Un proyecto de Supabase

## Desarrollo local

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Edita `.env.local` con la URL de tu proyecto y una clave **publishable** de Supabase:

```env
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

No pongas claves `service_role` o secretas en variables `VITE_` ni en el navegador.

## Compilar

```bash
npm run build
npm run preview
```

## Base de datos

Las migraciones SQL están en `supabase/migrations/`. Aplícalas en orden en el proyecto Supabase que vayas a usar. Consulta [SUPABASE_SETUP.md](SUPABASE_SETUP.md) para el esquema, los permisos y el primer usuario administrador.

## Flujo de ramas

`main` es la línea estable y `develop` reúne los cambios en preparación. Consulta [BRANCHING.md](BRANCHING.md) para crear ramas de funciones, correcciones y hotfixes.

## Estado actual

La interfaz incluye catálogo con filtros, carrito de demostración, registro e inicio de sesión, edición de productos, gestión de perfiles, campañas y configuración de tienda. El checkout aún no procesa pagos ni crea pedidos reales.
