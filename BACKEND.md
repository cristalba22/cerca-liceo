# Backend de Cerca Liceo

## Decision tecnica

La mejor opcion para este proyecto es Supabase:

- Postgres real para consultas por rubro, seccion, vencimiento y locales.
- Auth integrado para vecino/comerciante.
- Storage para fotos del local.
- Row Level Security para que cada comercio edite solo lo suyo.
- Free tier suficiente para validar un barrio. Con 100 personas por dia, el volumen esperado es bajo si las consultas estan indexadas.

Firebase tambien es viable, pero para esta app hay relaciones naturales: comercios, productos, ofertas, perfiles y planes. Postgres queda mas claro, mas auditable y mas profesional para portfolio.

## Como levantarlo

1. Crear un proyecto en Supabase.
2. Abrir SQL Editor.
3. Ejecutar `supabase/schema.sql`.
4. Ejecutar `supabase/storage-policies.sql` para que funcionen las fotos.
5. Crear tu cuenta desde la app y despues ejecutar `supabase/admin-bootstrap.sql` para convertirla en super admin.
6. Opcional para datos de prueba: ejecutar `supabase/seed.sql`.
7. Copiar `.env.example` a `.env.local`.
8. Completar:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

9. Reiniciar `npm run dev`.

Si no hay variables de Supabase, la app sigue funcionando con datos locales de desarrollo para no romper el front.

## Checklist para dejarlo real

Antes de ofrecerlo a comercios reales:

- Ejecutar `supabase/schema.sql` completo.
- Verificar que exista el bucket publico `business-photos`.
- Crear una cuenta comercio desde la app.
- Cargar local con foto real, direccion, dias, horario y WhatsApp.
- Editar la mini carta desde `Mi cuenta > Panel comercio > Mini carta`.
- Publicar una promo con foto.
- Probar que el boton de WhatsApp abra el numero del comercio.
- Probar que `Como llegar` abra Google Maps.
- Crear tu usuario admin con `supabase/admin-bootstrap.sql`.
- Entrar a `Mi cuenta > Administrar` y verificar/ocultar locales desde la app.
- Ocultar o reemplazar cualquier dato de prueba antes de compartir el link publico.
- Configurar dominio propio y URLs de Auth segun `DEPLOY.md`.
- Verificar que el footer muestre contacto real de soporte.

## Tablas

- `profiles`: tipo de cuenta, nombre, WhatsApp, seccion.
- `businesses`: ficha publica del local, plan, horarios, entrega, foto, busqueda.
- `products`: mini carta del local.
- `offers`: publicaciones que vencen solas.
- `active_offers`: vista que solo devuelve ofertas vigentes.

## Cobro manual sin Mercado Pago

El sistema queda preparado para manejar planes sin pasarela de pago:

- `businesses.plan`: `free`, `orders` o `plus`.
- `businesses.plan_status`: `free`, `manual_pending`, `active`, `past_due` o `paused`.
- `businesses.paid_until`: fecha hasta donde tiene pago manual registrado.
- `businesses.admin_notes`: notas internas para seguimiento.

La idea para la primera salida es simple: el comercio aparece gratis; si quiere publicaciones extra o mini menu con pedido armado, lo coordinas por WhatsApp, transferencia o efectivo y despues actualizas el estado manualmente desde `Mi cuenta > Administrar`.

## Escala esperada

Para 100 usuarios diarios:

- Las lecturas publicas usan indices por `section`, `category`, `expires_at` y busqueda.
- Las ofertas vencidas no se muestran porque `active_offers` filtra por fecha.
- Las fotos van a Storage, no a la base.
- El front mantiene fallback local si falla la config.

Antes de produccion real conviene:

- Configurar SMTP propio para emails.
- Activar dominio propio.
- Cargar politicas de backups o pasar a plan Pro cuando haya comercios reales pagando.
- Agregar rate-limit en acciones sensibles si se publica masivamente.
