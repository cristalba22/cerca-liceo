# Template de confirmacion de cuenta - Cerca Liceo

Usar en Supabase > Authentication > Emails > Confirm sign up.

Subject:

```text
Confirma tu cuenta en Cerca Liceo
```

Body:

```html
<div style="margin:0;padding:0;background:#f8f2df;font-family:Arial,Helvetica,sans-serif;color:#10150f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f2df;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf7;border:1px solid #eadfc8;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:26px 24px 12px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:54px;height:54px;border-radius:16px;background:#9cf112;text-align:center;font-size:28px;font-weight:900;color:#10150f;">
                    C
                  </td>
                  <td style="padding-left:14px;">
                    <div style="font-size:25px;line-height:24px;font-weight:900;color:#10150f;">Cerca</div>
                    <div style="font-size:12px;font-weight:900;color:#637044;letter-spacing:.3px;">LICEO</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 24px 0;">
              <span style="display:inline-block;padding:9px 12px;border-radius:999px;background:#e5ffad;color:#10150f;font-size:12px;font-weight:900;">
                Verificacion segura
              </span>
              <h1 style="margin:18px 0 10px;font-size:30px;line-height:31px;color:#10150f;">
                Confirma tu cuenta en Cerca Liceo
              </h1>
              <p style="margin:0;color:#5c5c50;font-size:16px;line-height:24px;">
                Hola, recibiste este correo porque creaste una cuenta en Cerca Liceo para usar la guia del barrio,
                publicar como comercio o guardar informacion util.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;">
              <a href="{{ .ConfirmationURL }}" style="display:block;text-align:center;text-decoration:none;background:#9cf112;color:#10150f;font-size:16px;font-weight:900;padding:16px 18px;border-radius:999px;">
                Confirmar mi cuenta
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px;">
              <div style="background:#f3ecd8;border-radius:18px;padding:16px;">
                <p style="margin:0 0 8px;color:#10150f;font-size:14px;line-height:21px;font-weight:700;">
                  Este paso evita que otra persona use tu email o publique con el nombre de tu local.
                </p>
                <p style="margin:0;color:#5c5c50;font-size:13px;line-height:20px;">
                  Cerca Liceo nunca te va a pedir datos de tarjeta ni pagos desde este correo. Si tenes dudas,
                  escribi al WhatsApp de soporte: 351 766 2142.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 24px;color:#6f6b5e;font-size:12px;line-height:18px;">
              Si el boton no funciona, copia y pega este enlace en tu navegador:<br />
              <a href="{{ .ConfirmationURL }}" style="color:#365f00;word-break:break-all;">{{ .ConfirmationURL }}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
```

Configuracion recomendada en Supabase:

```text
Authentication > Sign In / Providers > Confirm email: ON
Authentication > URL Configuration > Site URL: https://cercaliceo.com.ar
Authentication > URL Configuration > Redirect URLs:
https://cercaliceo.com.ar/*
https://www.cercaliceo.com.ar/*
```
