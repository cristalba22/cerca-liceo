# Cerca Liceo

App barrial para que vecinos de Liceo encuentren ofertas, locales, horarios, ubicacion y contacto directo por WhatsApp.

## Que resuelve

- Vecinos: buscan ofertas y comercios cercanos sin registrarse.
- Comercios: cargan ficha gratis con foto, direccion, horario, WhatsApp y una promo semanal.
- Admin: revisa locales, oculta contenido, verifica comercios y activa planes manuales.

## Stack

- Frontend: React + Vite.
- Backend: Supabase Auth, Postgres y Storage.
- Deploy sugerido: Cloudflare Pages.

## Desarrollo local

```bash
npm install
npm run dev
```

Crear `.env.local` con:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_PUBLICA
```

## Scripts

```bash
npm run lint
npm run build
npm run preview
```

## Produccion

Ver [DEPLOY.md](./DEPLOY.md).

## Contacto del proyecto

Cristian Eduardo Alba  
WhatsApp: 351 766 2142  
Email: crisalbavideografo@gmail.com
