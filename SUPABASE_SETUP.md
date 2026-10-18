# Supabase de BRAVA

La tienda usa un proyecto independiente llamado **BRAVA Store** (`hyzthfalnvamfxhcmtzg`) en la región `sa-east-1`. La URL y la clave publishable están en `.env.local`, excluido de Git. Nunca pongas una clave `service_role` o secreta en una variable `VITE_`.

## Esquema

Las migraciones, en orden, crean el catálogo con 8 productos de muestra, los perfiles de cliente y las funciones protegidas para que un administrador gestione cuentas, y dejan las escrituras del catálogo limitadas a administradores. Las tablas `products` y `profiles` tienen RLS activo. Los clientes pueden leer el catálogo; cada cuenta solo puede consultar su propio perfil. Los roles no pueden modificarse desde el cliente.

## Primer administrador

Regístrate en la tienda desde **Cuenta** y confirma tu correo si Supabase lo solicita. Luego comparte aquí el correo exacto de esa cuenta para asignarle el rol administrador de forma segura. La interfaz no permite elevar el propio rol.

## Desarrollo local

La tienda está disponible en `http://127.0.0.1:5181/`. Inicia otra instancia con `npm run dev -- --host 127.0.0.1 --port 5181 --strictPort`. Para conectar otro proyecto, configura las dos variables de `.env.example` en `.env.local` y aplica las migraciones en orden.

Los pedidos siguen en modo demostración: la tienda todavía no procesa pagos ni gestiona envíos.
