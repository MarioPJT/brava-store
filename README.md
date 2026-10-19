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

La interfaz incluye catálogo con filtros, carrito, registro e inicio de sesión, edición de productos, gestión de perfiles, campañas y configuración de tienda. El checkout seguro está preparado, pero permanece desactivado hasta configurar Wompi, Resend y Twilio.

## Pagos y confirmaciones de compra

El checkout de Wompi se habilita con `VITE_WOMPI_CHECKOUT_ENABLED=true` después de configurar y desplegar las funciones de Supabase. El navegador nunca recibe llaves privadas. El pedido se calcula con los precios vigentes de Supabase, Wompi confirma el pago mediante eventos firmados y solamente entonces las funciones envían el recibo por Resend y el SMS transaccional por Twilio.

Consulta [PAYMENTS_SETUP.md](PAYMENTS_SETUP.md) para migrar la base de datos, configurar las credenciales seguras de Supabase, desplegar las funciones y registrar el webhook en Wompi. Sin las cuentas y llaves del comercio, Resend y Twilio, los pagos y mensajes permanecen desactivados.
