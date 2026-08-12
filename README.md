# NOVA+ TV — Panel de administración

Este panel ya está configurado para:

https://nova-tv-api.mikimc-business.workers.dev

## Uso

1. Sube la carpeta completa a tu hosting (por ejemplo GitHub Pages).
2. Abre `index.html`.
3. Pulsa **Token**.
4. Escribe exactamente el valor que configuraste como `ADMIN_TOKEN` en Cloudflare.
5. Desde ahí puedes:
   - agregar canales
   - editar canales
   - activar/ocultar
   - marcar como destacados
   - eliminar
   - consultar reportes
   - marcar reportes como resueltos

El token se conserva en `sessionStorage`: al cerrar la sesión/pestaña del navegador,
deberás volver a escribirlo.

## Importante sobre "Probar enlace"

El botón abre la URL del stream en una pestaña nueva.

Un stream puede no abrir directamente en Chrome aunque sí funcione correctamente
en Android Media3/ExoPlayer. Además, una página HTTPS no puede reproducir dentro
de ella un stream HTTP por las reglas de contenido mixto del navegador.

El canal A&E de prueba usa HTTP; esto se tratará en la app Android mediante la
configuración de tráfico cleartext.
