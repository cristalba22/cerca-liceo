# Template de recuperacion de clave - Cerca Liceo

Usar en Supabase > Authentication > Emails > Reset password.

Subject:

```text
Recupera tu clave de Cerca Liceo
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
                Recuperacion segura
              </span>
              <h1 style="margin:18px 0 10px;font-size:30px;line-height:31px;color:#10150f;">
                Crea una nueva clave
              </h1>
              <p style="margin:0;color:#5c5c50;font-size:16px;line-height:24px;">
                Recibiste este correo porque pediste recuperar el acceso a tu cuenta de Cerca Liceo.
                Toca el boton para elegir una nueva clave.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;">
              <a href="{{ .ConfirmationURL }}" style="display:block;text-align:center;text-decoration:none;background:#9cf112;color:#10150f;font-size:16px;font-weight:900;padding:16px 18px;border-radius:999px;">
                Crear nueva clave
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px;">
              <div style="background:#f3ecd8;border-radius:18px;padding:16px;">
                <p style="margin:0 0 8px;color:#10150f;font-size:14px;line-height:21px;font-weight:700;">
                  Si no pediste este cambio, ignora este correo. Tu clave actual no cambia.
                </p>
                <p style="margin:0;color:#5c5c50;font-size:13px;line-height:20px;">
                  Cerca Liceo nunca te va a pedir datos de tarjeta ni pagos desde este correo. Soporte: 351 766 2142.
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
