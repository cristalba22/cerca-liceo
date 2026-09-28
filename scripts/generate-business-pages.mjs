import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'

const root = process.cwd()
const env = loadEnv('production', root, '')
const supabaseUrl = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY
const siteUrl = (env.VITE_SITE_URL || 'https://www.cercaliceo.com.ar').replace(/\/$/, '')

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const slugify = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 64)

const businessSlug = (business) => {
  const id = String(business.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase()
  return `${slugify(business.name) || 'comercio'}${id ? `-${id}` : ''}`
}

const replaceMetaContent = (html, attribute, value) => html.replace(
  new RegExp(`(<meta\\s+${attribute}\\s+content=")[^"]*("\\s*\\/>)`),
  `$1${escapeHtml(value)}$2`,
)

const loadBusinesses = async () => {
  if (!supabaseUrl || !anonKey) {
    const { defaultBusinesses } = await import('../src/lib/fallbackData.js')
    console.warn('Supabase build variables are unavailable; generating preview SEO pages for validation.')
    return defaultBusinesses
  }

  const endpoint = new URL('/rest/v1/businesses', supabaseUrl)
  endpoint.searchParams.set('select', 'id,name,category,section,description,image_key,updated_at')
  endpoint.searchParams.set('is_public', 'eq.true')
  endpoint.searchParams.set('order', 'updated_at.desc')

  const response = await fetch(endpoint, {
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
  })
  if (!response.ok) throw new Error(`Could not generate business pages: ${response.status}`)
  return response.json()
}

const businesses = await loadBusinesses()
const template = await readFile(resolve(root, 'dist/index.html'), 'utf8')
const urls = [`${siteUrl}/`]

for (const business of businesses) {
  const slug = businessSlug(business)
  const url = `${siteUrl}/comercios/${slug}/`
  const title = `${business.name} - ${business.category} en ${business.section} | Cerca Liceo`
  const description = business.description || `${business.name}: horarios, contacto y ofertas en Cerca Liceo.`
  const image = /^https?:/i.test(business.image_key || '') ? business.image_key : `${siteUrl}/og-cerca-liceo.svg`
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description,
    image,
    areaServed: business.section,
    url,
  }).replace(/</g, '\\u003c')

  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}" />`)

  html = replaceMetaContent(html, 'name="description"', description)
  html = replaceMetaContent(html, 'property="og:title"', title)
  html = replaceMetaContent(html, 'property="og:description"', description)
  html = replaceMetaContent(html, 'property="og:url"', url)
  html = replaceMetaContent(html, 'property="og:image"', image)
  html = replaceMetaContent(html, 'name="twitter:title"', title)
  html = replaceMetaContent(html, 'name="twitter:description"', description)
  html = replaceMetaContent(html, 'name="twitter:image"', image)
  html = html.replace('</head>', `  <script type="application/ld+json">${jsonLd}</script>\n</head>`)

  const outputDir = resolve(root, 'dist/comercios', slug)
  await mkdir(outputDir, { recursive: true })
  await writeFile(resolve(outputDir, 'index.html'), html)
  urls.push(url)
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`
await writeFile(resolve(root, 'dist/sitemap.xml'), sitemap)
console.log(`Generated ${businesses.length} indexable business pages.`)
