import { expect, test, type Page } from '@playwright/test'
import { schedule, profiles, templates, services, occurrence, taskID } from '../src/test/fixtures'

async function fixture(page: Page, email: string | null = 'alice@example.com') {
  let allowed = true
  let admin = false
  const own = schedule(), other = schedule({ id: '33333333-3333-4333-8333-333333333333', name: 'Other report', owner_email: 'bob@example.com', can_edit: false })
  await page.addInitScript(() => localStorage.setItem('orpheus_locale', 'en'))
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (path.endsWith('/auth/session')) return route.fulfill({ json: {
      mode: 'saml', authenticated: true, read_access: true, write_access: email !== null, can_manage_all: admin,
      user: { subject: 'user', display_name: 'Alice', email }, expires_at: null,
    } })
    if (path.endsWith('/profiles')) return route.fulfill({ json: profiles() })
    if (path.endsWith('/templates')) return route.fulfill({ json: templates() })
    if (path.endsWith('/services')) return route.fulfill({ json: services() })
    if (path.endsWith('/occurrences')) return route.fulfill({ json: { items: [occurrence()], next_cursor: null } })
    if (req.method() !== 'GET') {
      const wrongOwner = req.method() === 'POST' && path === '/api/v1/schedules' && !admin && req.postDataJSON().owner_email !== email
      if (!allowed || wrongOwner) return route.fulfill({ status: 403, json: { error: { code: 'schedule_forbidden', message: 'Forbidden', phase: null, details: [] } } })
      return route.fulfill({ json: own })
    }
    const current = { ...own, can_edit: allowed && email !== null }
    if (path === '/api/v1/schedules') return route.fulfill({ json: { items: [current, other], next_cursor: null } })
    return route.fulfill({ json: path.endsWith(other.id) ? other : current })
  })
  return { other, revoke: () => { allowed = false }, grant: () => { allowed = true }, setAdmin: (value: boolean) => { admin = value } }
}

test('members can view all schedules, edit their own and cannot open a foreign editor', async ({ page }) => {
  const { other } = await fixture(page)
  await page.goto('/schedules')
  await expect(page.getByRole('link', { name: 'New schedule' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(1)
  await page.getByRole('link', { name: other.name }).click()
  await expect(page.getByText('This schedule is available for viewing only.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Edit schedule' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reset context' })).toHaveCount(0)
  await expect(page.getByText('Summarize incidents')).toBeVisible()
  await page.goto(`/schedules/${other.id}/edit`)
  await expect(page).toHaveURL(new RegExp(`/schedules/${other.id}$`))
  await expect(page.getByRole('heading', { name: other.name })).toBeVisible()
  await page.goto(`/schedules/${taskID}/edit`)
  await expect(page.getByRole('textbox', { name: 'Owner email', exact: true })).toHaveAttribute('readonly', '')
  await expect(page.getByRole('textbox', { name: 'Owner email', exact: true })).toHaveValue('alice@example.com')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/schedules/${taskID}$`))
  await page.goto('/schedules/new')
  await expect(page.getByRole('textbox', { name: 'Owner email', exact: true })).toHaveAttribute('readonly', '')
  await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/member-schedule-form.png', fullPage: true })
})

test('refreshing roles on navigation and denial preserves the creation draft', async ({ page }) => {
  const { setAdmin } = await fixture(page)
  await page.goto('/schedules')
  await expect(page.getByRole('link', { name: 'Other report' })).toBeVisible()
  setAdmin(true)
  await page.getByRole('link', { name: 'New schedule' }).click()
  const owner = page.getByRole('textbox', { name: 'Owner email', exact: true })
  await expect(owner).toBeEditable()
  await owner.fill('bob@example.com')
  await page.getByLabel('Name', { exact: true }).fill('Important draft')
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Keep these instructions')
  await expect(owner).toHaveValue('bob@example.com')
  await expect(owner).toBeEditable()
  setAdmin(false)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('You can only change your own schedules. Your access may have changed.')).toBeVisible()
  await expect(page).toHaveURL(/\/schedules\/new$/)
  await expect(owner).toHaveAttribute('readonly', '')
  await expect(owner).toHaveValue('alice@example.com')
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Important draft')
  await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveText('Keep these instructions', { useInnerText: true })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/schedules/${taskID}$`))
})

test('a pending confirmation does not return when ownership is restored', async ({ page }) => {
  await page.clock.install()
  const { revoke, grant } = await fixture(page)
  await page.goto(`/schedules/${taskID}`)
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible()
  revoke()
  await page.clock.fastForward(6000)
  await expect(page.getByText('This schedule is available for viewing only.')).toBeVisible()
  grant()
  await page.clock.fastForward(6000)
  await expect(page.getByRole('link', { name: 'Edit schedule' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(0)
})

test('users without email can browse but cannot create or edit', async ({ page }) => {
  await fixture(page, null)
  await page.goto('/schedules')
  await expect(page.getByRole('link', { name: 'Other report' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'New schedule' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0)
  await expect(page.getByText('Your session has no email. Sign out and sign in again. If the email is still missing, contact your administrator.')).toBeVisible()
  await page.goto('/schedules/new')
  await expect(page).toHaveURL(/\/schedules$/)
  await expect(page.getByRole('link', { name: 'Other report' })).toBeVisible()
})

for (const action of ['list pause', 'card reset', 'edit'] as const) {
  test(`losing permission during ${action} preserves browsing`, async ({ page }) => {
    const { revoke } = await fixture(page)
    await page.goto(action === 'list pause' ? '/schedules' : `/schedules/${taskID}${action === 'edit' ? '/edit' : ''}`)
    if (action === 'edit') {
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
      revoke()
      await page.getByRole('button', { name: 'Save', exact: true }).click()
    } else if (action === 'card reset') {
      await page.getByRole('button', { name: 'Reset context' }).click()
      revoke()
      await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    } else {
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
      revoke()
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
    }
    await expect(page.getByText('You can only change your own schedules. Your access may have changed.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: action === 'list pause' ? 'Schedules' : 'Daily report', exact: true })).toBeVisible()
  })
}
