import { expect, test } from '@playwright/test'

const enabled = process.env.E2E_REAL_ACCOUNT === 'true'
const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.E2E_MERCHANT_PASSWORD
const emailBase = process.env.E2E_MERCHANT_EMAIL

const adminRequest = async (path, options = {}) => fetch(`${supabaseUrl}${path}`, {
  ...options,
  headers: {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    'content-type': 'application/json',
    ...options.headers,
  },
})

test.describe('recorrido real de comercio', () => {
  test.skip(!enabled, 'Solo se ejecuta manualmente con secretos de QA.')
  test.skip(!supabaseUrl || !serviceKey || !password || !emailBase, 'Faltan secretos de QA.')

  test('registro, confirmacion, foto, ficha y publicacion', async ({ page }) => {
    const suffix = Date.now()
    const [local, domain] = emailBase.split('@')
    const email = `${local}+qa-${suffix}@${domain}`
    let userId = ''

    try {
      await page.goto('/')
      await page.getByLabel('Mi cuenta').first().click()
      await page.getByRole('button', { name: /crear cuenta comercio/i }).click()

      await page.locator('input[type="email"]').fill(email)
      const passwords = page.locator('input[type="password"]')
      await passwords.nth(0).fill(password)
      await passwords.nth(1).fill(password)
      await page.getByText(/comercio/i, { exact: true }).first().click()
      await page.getByPlaceholder(/nombre y apellido/i).fill('Prueba automatica')
      await page.getByPlaceholder(/3510000000/i).fill('3517662142')
      const businessName = page.getByPlaceholder(/almacen del barrio|nombre del local|nombre del comercio|emprendimiento/i)
      if (await businessName.count()) await businessName.fill(`Local QA ${suffix}`)
      await page.getByPlaceholder(/calle, manzana o referencia/i).fill('Manzana QA, Liceo Procrear')
      const selects = page.locator('select')
      await selects.nth(0).selectOption({ label: 'Liceo Procrear' })
      await selects.nth(1).selectOption({ label: 'Comida' })
      await selects.nth(2).selectOption({ label: 'Solo retiro' })
      await page.getByRole('button', { name: /crear cuenta de comercio/i }).click()

      let user
      await expect.poll(async () => {
        const usersResponse = await adminRequest('/auth/v1/admin/users?page=1&per_page=1000')
        const usersPayload = await usersResponse.json()
        user = usersPayload.users?.find((item) => item.email === email)
        return Boolean(user?.id)
      }).toBeTruthy()
      userId = user.id

      const pendingConfirmation = await page.locator('.register-success.pending-email').isVisible()
      if (pendingConfirmation) {
        await adminRequest(`/auth/v1/admin/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({ email_confirm: true }),
        })
        await page.goto('/')
        await page.getByLabel('Mi cuenta').first().click()
        await page.getByRole('button', { name: /iniciar sesion/i }).first().click()
        await page.locator('input[type="email"]').fill(email)
        await page.locator('input[type="password"]').fill(password)
        await page.getByRole('button', { name: /iniciar sesion/i }).last().click()
      }
      await expect(page.getByText(/mis publicaciones/i).first()).toBeVisible()

      const image = { name: 'qa-local.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') }
      await page.getByRole('button', { name: /foto imagen principal/i }).click()
      const photoInput = page.locator('input[type="file"]').first()
      await photoInput.setInputFiles(image)
      await page.getByRole('button', { name: /actualizar local/i }).click()
      await expect(page.getByText(/local guardado|cambios guardados|foto/i).first()).toBeVisible()

      await page.getByRole('button', { name: /publicar promo/i }).first().click()
      await page.getByPlaceholder(/combo, descuento/i).fill(`Promo QA ${suffix}`)
      await page.getByPlaceholder(/6\.500|consultar/i).fill('1000')
      await page.getByPlaceholder(/conta que incluye/i).fill('Publicacion automatica de control, eliminar al terminar.')
      const promoPhoto = page.locator('input[type="file"]').first()
      await promoPhoto.setInputFiles(image)
      await page.getByRole('button', { name: /^publicar/i }).last().click()
      await expect(page.getByText(/promo publicada/i).first()).toBeVisible()
    } finally {
      if (userId) await adminRequest(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
    }
  })
})
