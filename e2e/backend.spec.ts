import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
const saml = !!process.env.INTEGRATION_SAML

test('real catalogs, nginx and Space support browser CRUD and offline edits', async ({ page, request, baseURL }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('orpheus_locale', 'en'))
  await page.goto('/schedules/new')
  if (saml) {
    await expect(page).toHaveURL(new RegExp(`localhost:${process.env.ORPHEUS_SPACE_WEB_IDP_PORT || '19444'}`))
    await page.getByLabel('Username or email').fill('operator')
    await page.getByLabel('Password', { exact: true }).fill('fixture-password')
    const callback = page.waitForResponse((r) => new URL(r.url()).pathname === '/auth/callback')
    await page.getByRole('button', { name: 'Sign In', exact: true }).click()
    expect((await callback).status()).toBe(303)
  }
  await expect(page.getByRole('heading', { name: 'New schedule' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /^Owner email/ })).toHaveValue(saml ? 'operator@example.test' : '')
  await expect(page.getByRole('button', { name: 'Profile', exact: true })).toHaveText('default')
  await expect(page.getByRole('button', { name: 'Sandbox template', exact: true })).toHaveText('fixture')
  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search' }).fill('sources')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Profile', exact: true })).toHaveText('research')
  await page.getByRole('button', { name: 'Sandbox template', exact: true }).click()
  await page.getByRole('option', { name: /reports:v2/ }).click()
  await page.getByLabel('Name', { exact: true }).fill('Browser integration')
  const prompt = '---\nsource: integration\n---\n## Instructions\n\nTest with **core offline**'
  await page.getByLabel('Prompt', { exact: true }).fill(prompt)
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('paused')
  // The API names the invalid field; the message lands under it, not only in a toast.
  await page.getByRole('combobox', { name: 'Repeat', exact: true }).selectOption('custom')
  await page.getByRole('textbox', { name: 'Expression', exact: true }).fill('0 9 * *')
  await page.getByRole('button', { name: 'Preview next runs' }).click()
  await expect(page.getByRole('alert')).toContainText('Check the cron expression')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  // The toast arrives with the 422; the field keeps its message until the field changes.
  await expect(page.getByText('Could not save. Check the highlighted fields.')).toBeVisible()
  await expect(page.getByRole('alert').first()).toContainText('Check the cron expression')
  await expect(page.getByRole('heading', { name: 'New schedule' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Repeat', exact: true }).selectOption('weekdays')
  await expect(page.getByText(/Monday through Friday/)).toBeVisible()
  await page.getByRole('button', { name: 'Preview next runs' }).click()
  await expect(page.getByText(/^Times in /)).toBeVisible()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Browser integration' })).toBeVisible()
  await expect(page.locator('.frontmatter')).toContainText('source: integration')
  await expect(page.locator('.prose-output strong')).toHaveText('core offline')
  const id = new URL(page.url()).pathname.split('/').pop()!
  const stored = await (await page.request.get(`/api/v1/schedules/${id}`)).json()
  expect(stored).toMatchObject({ profile: 'research', template: 'reports:v2', model: null })
  const auth = await page.request.get('/api/v1/auth/session')
  expect((await auth.json()).write_access).toBe(true)
  expect((await page.request.patch(`/api/v1/schedules/${id}`, { data: { name: 'Forbidden' } })).status()).toBe(403)
  expect((await page.request.get('/api/v1/schedules', { headers: { Authorization: 'Bearer invalid' } })).status()).toBe(401)
  if (!process.env.COMPOSE_PROJECT_NAME || !process.env.COMPOSE_FILE) throw new Error('Run through npm run test:integration to configure the disposable stack')
  const compose = ['compose']
  execFileSync('docker', [...compose, 'stop', 'core'], { stdio: 'pipe' })
  try {
    const unavailable = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/schedules/profiles' && r.status() === 503)
    await page.getByRole('link', { name: 'Edit schedule' }).click()
    await unavailable
    await expect(page.getByRole('button', { name: 'Profile', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Profile', exact: true })).toHaveText('research')
    await expect(page.getByText('Reconnecting…')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveText(prompt, { useInnerText: true })
    await expect(page.getByRole('textbox', { name: /^Owner email/ })).toHaveValue(saml ? 'operator@example.test' : '')
    await page.getByRole('textbox', { name: /^Owner email/ }).fill('other@example.com')
    await page.getByRole('combobox', { name: 'Session', exact: true }).selectOption('reuse')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('other@example.com', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Reset context' }).click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Schedules', exact: true })).toBeVisible()
    expect((await request.get('/api/v1/no-such-route', { headers: { Authorization: 'Bearer integration-only-key' } })).status()).toBe(404)
    expect((await request.get('/assets/missing.js')).status()).toBe(404)
    expect((await request.get('/index.html')).headers()['cache-control']).toContain('no-store')
  } finally {
    execFileSync('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '60', 'core'], { stdio: 'pipe' })
  }
  if (saml) {
    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name === '__Host-orpheus_space_session')).toMatchObject({ secure: true, httpOnly: true, path: '/' })
    expect(cookies.find((c) => c.name === '__Host-orpheus_session')).toBeUndefined()
    // An existing Keycloak SSO session does not bypass the other client's role gate.
    await page.goto(
      `https://localhost:${process.env.ORPHEUS_SPACE_WEB_IDP_PORT || '19444'}/realms/orpheus-space-web/protocol/saml/clients/technical-panel`,
    )
    await expect(page.getByText(/access denied|access is denied/i)).toBeVisible()
    expect((await page.request.get(baseURL! + '/api/v1/schedules')).status()).toBe(200)
    await page.goto('/schedules')
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    expect((await page.request.get('/api/v1/schedules')).status()).toBe(401)
  } else {
    expect((await page.request.post('/auth/logout', { headers: { Origin: baseURL!, 'X-Orpheus-CSRF': '1' } })).status()).toBe(204)
  }
})
