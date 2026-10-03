import { expect, test } from '@playwright/test'
test('API-only installation explains browser access; storage outage never redirects to login', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('orpheus_locale', 'en'))
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({
      json: { mode: 'api_only', authenticated: false, read_access: false, write_access: false, can_manage_all: false, user: null, expires_at: null },
    }),
  )
  await page.goto('/schedules')
  await expect(page.getByText('Browser access is not configured')).toBeVisible()
  await expect(page.getByRole('link', { name: 'New schedule' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0)
  await page.unroute('**/api/v1/auth/session')
  await page.route('**/api/v1/auth/session', (route) =>
    route.fulfill({ status: 503, json: { error: { code: 'storage_unavailable', message: 'Unavailable' } } }),
  )
  await page.reload()
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/schedules$/)
})
