import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('home carga, busca y no desborda en movil', async ({ page }) => {
  const runtimeErrors = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('region', { name: /que hay hoy/i })).toContainText(/promos cerca tuyo/i)
  const search = page.getByPlaceholder(/buscar oferta, local o rubro/i)
  await search.fill('comida')
  await expect(page.getByText(/resultados cerca/i)).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
  expect(runtimeErrors).toEqual([])
})

test('acciones principales y acceso siguen disponibles', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('Mi cuenta').first()).toBeVisible()
  await expect(page.getByRole('link', { name: /abrir maps/i })).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps/)
  await page.getByLabel('Mi cuenta').first().click()
  await expect(page.getByRole('heading', { name: /entrar es opcional/i })).toBeVisible()
})

test('home no tiene problemas serios o criticos de accesibilidad', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1000)
  const results = await new AxeBuilder({ page })
    .analyze()
  const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
  expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([])
})

test('cada comercio tiene pagina indexable y accesible', async ({ page, request }) => {
  const sitemapResponse = await request.get('/sitemap.xml')
  expect(sitemapResponse.ok()).toBeTruthy()
  const sitemap = await sitemapResponse.text()
  const match = sitemap.match(/<loc>[^<]+\/comercios\/([^/]+)\/<\/loc>/)
  expect(match?.[1]).toBeTruthy()

  const path = `/comercios/${match[1]}/`
  const htmlResponse = await request.get(path)
  const html = await htmlResponse.text()
  expect(html).toContain('<link rel="canonical"')
  expect(html).toContain('LocalBusiness')

  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.detail-content h1')).toBeVisible()
  await page.waitForTimeout(1000)
  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
  expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([])
})
