# Configuración de pagos y confirmaciones BRAVA

Este flujo usa Wompi para cobrar en COP, Resend para el correo transaccional y Twilio para el SMS. Las claves privadas se guardan en Supabase Edge Function Secrets; nunca deben agregarse a variables `VITE_*`, al navegador ni al repositorio.

## 1. Credenciales necesarias

En Wompi, activa el comercio y obtén la llave pública, el secreto de integridad y el secreto de eventos para el mismo entorno (Sandbox o Producción). En Resend, crea una llave API y verifica el dominio remitente que usarás. En Twilio, configura una cuenta con capacidad de enviar SMS al país de tus clientes y obtén su Account SID, Auth Token y número o Messaging Service. Los pedidos pendientes reservan inventario por 30 minutos; Supabase Cron libera automáticamente las reservas vencidas cada cinco minutos.

Agrega estas variables como secretos de Edge Functions del proyecto Supabase:

```text
WOMPI_PUBLIC_KEY
WOMPI_INTEGRITY_SECRET
WOMPI_EVENTS_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
APP_BASE_URL
```

No compartas esos valores por chat ni los guardes en `.env.local`. Para desarrollo local, configura las mismas variables en el archivo ignorado `supabase/functions/.env`.

## 2. Base de datos y funciones

Aplica las migraciones de `supabase/migrations/` en orden. Despliega las funciones `create-wompi-checkout` y `wompi-payment-events`. La primera crea el pedido con precios y existencias leídos desde la base de datos; la segunda verifica la firma y vuelve a consultar la transacción en Wompi antes de marcarla como pagada y enviar mensajes.

La función `wompi-payment-events` debe aceptar llamadas sin JWT para recibir el webhook público de Wompi; autentica cada evento con `WOMPI_EVENTS_SECRET`. La función de checkout también acepta llamadas públicas, pero valida el origen, los términos y los datos del pedido, y solo ejecuta RPCs permitidas al rol `service_role`.

## 3. Wompi

En el Dashboard de Wompi registra la URL HTTPS de eventos:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/wompi-payment-events
```

Activa el evento `transaction.updated`. Configura por separado Sandbox y Producción, y usa llaves y secretos del mismo ambiente. Wompi documenta el checkout web y la firma de integridad en [Widget & Checkout Web](https://docs.wompi.co/docs/colombia/widget-checkout-web/) y la firma de notificaciones en [Eventos](https://docs.wompi.co/docs/colombia/eventos/).

## 4. Activación del sitio

Una vez que las funciones estén desplegadas, los secretos estén cargados y el webhook esté registrado, establece en el entorno de compilación del frontend:

```text
VITE_WOMPI_CHECKOUT_ENABLED=true
```

Reconstruye y publica el sitio. El navegador regresa a la página de validación, pero esa redirección no prueba el pago: solo el evento verificado de Wompi dispara la confirmación por correo y SMS. Revisa las métricas y errores de entrega en Resend y Twilio.
