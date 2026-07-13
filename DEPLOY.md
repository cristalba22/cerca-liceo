# Deploy de Cerca Liceo

Objetivo: publicar la app en `https://cercaliceo.com.ar` con Cloudflare Pages y Supabase.

## 1. Comprar dominio

Recomendado:

- `cercaliceo.com.ar`

Alternativas:

- `cercaliceo.com`
- `cercabarrios.com.ar`
- `cercacba.com.ar`

## 2. Subir a GitHub

Crear un repositorio privado o publico llamado `cerca-liceo`.

No subir `.env.local`. Ya queda ignorado por `.gitignore`.

## 3. Cloudflare Pages

En Cloudflare:

1. Workers & Pages.
2. Create application.
3. Pages.
4. Connect to Git.
5. Elegir el repo `cerca-liceo`.
6. Framework preset: Vite.
7. Build command:

```bash
npm run build
```

8. Build output directory:

```bash
dist
```

## 4. Variables de entorno en Cloudflare

Agregar en Pages > Settings > Environment variables:

```env
VITE_SUPABASE_URL=https://siuzvmhpuqsufyymdimb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_PS7kRy5gbP1czENJRH96rA_KLzxL_ob
```

Usar estas variables tanto para Production como Preview.

## 5. Dominio propio en Cloudflare

En Cloudflare Pages > Custom domains:

1. Add custom domain.
2. Escribir `cercaliceo.com.ar`.
3. Seguir el asistente de DNS.
4. Esperar SSL activo.

## 6. Supabase Auth

En Supabase > Authentication > URL Configuration:

Site URL:

```text
https://cercaliceo.com.ar
```

Redirect URLs:

```text
https://cercaliceo.com.ar/*
```

Mientras se prueba Cloudflare, tambien se puede agregar:

```text
https://*.pages.dev/*
http://127.0.0.1:5173/*
```

## 7. Prueba final

Checklist antes de pasar el link:

- Abrir `https://cercaliceo.com.ar` desde celular.
- Crear cuenta vecino.
- Crear cuenta comercio.
- Cargar local con foto.
- Editar mini carta.
- Publicar promo con foto.
- Ver promo en home.
- Abrir WhatsApp desde una promo.
- Abrir mapa/como llegar.
- Entrar con admin y verificar/ocultar un local.

## 8. QR para comercios

Texto sugerido:

```text
Mira las ofertas y comercios de Liceo en Cerca Liceo.
Escanea el QR y encontra locales, horarios, direccion y WhatsApp.
```
