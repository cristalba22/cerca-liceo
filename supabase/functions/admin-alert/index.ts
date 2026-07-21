const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type AlertPayload = Record<string, unknown>

const clean = (value: unknown) => String(value || '').trim()

const labels: Record<string, { subject: string; title: string }> = {
  merchant_account_created: {
    subject: 'Nuevo comercio registrado en Cerca Liceo',
    title: 'Nuevo comercio registrado',
  },
  business_created: {
    subject: 'Nuevo local cargado en Cerca Liceo',
    title: 'Nuevo local para revisar',
  },
  business_updated: {
    subject: 'Local actualizado en Cerca Liceo',
    title: 'Local actualizado',
  },
  founder_plan_requested: {
    subject: 'Solicitud de plan fundador en Cerca Liceo',
    title: 'Comercio pidio plan fundador',
  },
  offer_created: {
    subject: 'Nueva promo publicada en Cerca Liceo',
    title: 'Nueva promo publicada',
  },
}

const formatLines = (payload: AlertPayload) => {
  const lines = [
    ['Nombre', payload.name || payload.businessName],
    ['Responsable', payload.name],
    ['Comercio', payload.businessName],
    ['Local', payload.businessName || payload.name],
    ['Promo', payload.title],
    ['Rubro', payload.category],
    ['Zona', payload.section],
    ['Tipo', payload.businessType],
    ['WhatsApp', payload.whatsapp],
    ['Instagram', payload.instagram],
    ['Direccion', payload.address],
    ['Referencia', payload.reference],
    ['Ubicacion', payload.locationLat && payload.locationLng ? `${payload.locationLat}, ${payload.locationLng}` : ''],
    ['Plan', payload.plan],
    ['Estado plan', payload.planStatus],
    ['Precio', payload.priceLabel],
    ['Vence', payload.expiresAt],
    ['Estado', payload.status],
  ]

  const seen = new Set<string>()
  return lines
    .filter(([label, value]) => {
      const text = clean(value)
      if (!text || seen.has(`${label}:${text}`)) return false
      seen.add(`${label}:${text}`)
      return true
    })
    .map(([label, value]) => `<p style="margin:0 0 8px"><strong>${label}:</strong> ${clean(value)}</p>`)
    .join('')
}

const buildEmail = (eventType: string, payload: AlertPayload) => {
  const label = labels[eventType] || {
    subject: 'Movimiento nuevo en Cerca Liceo',
    title: 'Movimiento nuevo para revisar',
  }
  const siteUrl = clean(payload.siteUrl) || Deno.env.get('SITE_URL') || 'https://www.cercaliceo.com.ar'
  const adminUrl = `${siteUrl.replace(/\/$/, '')}/?admin=1`
  const whatsapp = clean(payload.whatsapp).replace(/\D/g, '')
  const whatsappUrl = whatsapp ? `https://wa.me/54${whatsapp.replace(/^54/, '')}` : ''

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#f8f3e4;padding:24px;border-radius:18px;color:#07110a">
      <p style="display:inline-block;margin:0 0 14px;padding:8px 12px;border-radius:999px;background:#9bf018;font-weight:800;font-size:12px;text-transform:uppercase">Cerca Liceo</p>
      <h1 style="margin:0 0 10px;font-size:26px;line-height:1.05">${label.title}</h1>
      <p style="margin:0 0 18px;color:#4f4a3d">Hay un movimiento nuevo para revisar en el proyecto.</p>
      <div style="background:#fffaf0;border:1px solid #e4dcc5;border-radius:14px;padding:16px;margin-bottom:18px">
        ${formatLines(payload)}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a href="${adminUrl}" style="background:#07110a;color:#fff;text-decoration:none;border-radius:999px;padding:13px 18px;font-weight:800">Abrir admin</a>
        ${whatsappUrl ? `<a href="${whatsappUrl}" style="background:#9bf018;color:#07110a;text-decoration:none;border-radius:999px;padding:13px 18px;font-weight:800">Escribir WhatsApp</a>` : ''}
      </div>
      <p style="margin:20px 0 0;color:#77705f;font-size:12px">Aviso automatico interno. No responder este correo.</p>
    </div>
  `

  const text = [
    label.title,
    '',
    Object.entries(payload)
      .filter(([, value]) => clean(value))
      .map(([key, value]) => `${key}: ${clean(value)}`)
      .join('\n'),
    '',
    `Admin: ${adminUrl}`,
    whatsappUrl ? `WhatsApp: ${whatsappUrl}` : '',
  ].filter(Boolean).join('\n')

  return { subject: label.subject, html, text }
}

const logAlert = async (eventType: string, payload: AlertPayload, emailStatus: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return

  await fetch(`${supabaseUrl}/rest/v1/admin_alerts`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({
      event_type: eventType,
      payload,
      email_status: emailStatus,
    }),
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  try {
    const { eventType, payload = {} } = await request.json()
    const safeEventType = clean(eventType)
    if (!safeEventType) throw new Error('eventType requerido')

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const to = Deno.env.get('ADMIN_ALERT_EMAIL') || 'crisalbavideografo@gmail.com'
    const from = Deno.env.get('ADMIN_ALERT_FROM') || 'Cerca Liceo <onboarding@resend.dev>'
    const email = buildEmail(safeEventType, payload)

    let emailStatus = 'skipped_no_resend_key'
    if (resendKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${resendKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      })
      emailStatus = response.ok ? 'sent' : `failed_${response.status}`
    }

    await logAlert(safeEventType, payload, emailStatus)

    return new Response(JSON.stringify({ ok: true, emailStatus }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : clean(error)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
