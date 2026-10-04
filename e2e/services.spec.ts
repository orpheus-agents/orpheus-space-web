import { expect, test } from '@playwright/test'
import { profiles, templates, services, schedule, taskID } from '../src/test/fixtures'

for (const locale of ['en', 'ru']) for (const theme of ['light', 'dark']) {
  test(`service selection and card details in ${locale} ${theme}`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    let task = schedule()
    let written: Record<string, unknown> | undefined
    await page.addInitScript(({ locale, theme }) => {
      localStorage.setItem('orpheus_locale', locale)
      localStorage.setItem('orpheus_theme', theme)
    }, { locale, theme })
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request(), path = new URL(request.url()).pathname
      if (path.endsWith('/auth/session')) return route.fulfill({ json: { mode: 'saml', authenticated: true, read_access: true, write_access: true, can_manage_all: false, user: { subject: 'alice', display_name: 'Alice', email: 'alice@example.com' }, expires_at: null } })
      if (path === '/api/v1/profiles') return route.fulfill({ json: profiles() })
      if (path === '/api/v1/templates') return route.fulfill({ json: templates() })
      if (path === '/api/v1/services') return route.fulfill({ json: services() })
      if (path.endsWith('/occurrences')) return route.fulfill({ json: { items: [], next_cursor: null } })
      if (request.method() === 'PATCH') {
        written = request.postDataJSON()
        task = { ...task, ...written }
      }
      return route.fulfill({ json: task })
    })
    const title = locale === 'en' ? 'Services' : 'Сервисы'
    const selectedEnv = locale === 'en' ? 'ENV variables of the selected services' : 'Переменные ENV выбранных сервисов'
    await page.goto(`/schedules/${taskID}/edit`)
    const choices = page.getByRole('group', { name: title, exact: true })
    await expect(choices.getByRole('checkbox', { name: 'GitLab', exact: true })).toBeChecked()
    await expect(choices.getByText('Work with repositories and merge requests')).toBeVisible()
    await expect(choices.getByRole('checkbox', { name: 'GitLab', exact: true })).toHaveAccessibleDescription('Work with repositories and merge requests')
    // ENV names of the selection sit in one collapsed disclosure under the list.
    await expect(choices.getByText('GITLAB_TOKEN', { exact: true })).not.toBeVisible()
    await choices.getByText(selectedEnv, { exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(choices.getByText('GITLAB_TOKEN', { exact: true })).toBeVisible()
    await expect(choices.getByText('ORPHEUS_SPACE_API_KEY', { exact: true })).toHaveCount(0)
    await expect(choices.getByRole('checkbox', { name: 'GitLab', exact: true })).toBeChecked()
    await choices.getByRole('checkbox', { name: 'Orpheus Space', exact: true }).focus()
    await page.keyboard.press('Space')
    await expect(choices.getByRole('checkbox', { name: 'Orpheus Space', exact: true })).toBeChecked()
    await expect(choices.getByText('ORPHEUS_SPACE_API_KEY', { exact: true })).toBeVisible()
    // A click on the description toggles its row too.
    await choices.getByText('Manage scheduled tasks').click()
    await expect(choices.getByRole('checkbox', { name: 'Orpheus Space', exact: true })).not.toBeChecked()
    await choices.getByText('Manage scheduled tasks').click()
    await expect(choices.getByRole('checkbox', { name: 'Orpheus Space', exact: true })).toBeChecked()
    await page.screenshot({ path: `test-results/services-editor-${locale}-${theme}.png`, fullPage: true })
    await page.getByRole('button', { name: locale === 'en' ? 'Save' : 'Сохранить', exact: true }).click()
    await expect(page).toHaveURL(`/schedules/${taskID}`)
    expect(written).toMatchObject({ services: ['gitlab', 'orpheus-space'] })
    expect(written).not.toHaveProperty('env_from')
    // The card names the selection in one row; descriptions and ENV names open on focus or hover.
    const card = page.locator('dl > div').filter({ has: page.locator('dt', { hasText: title }) })
    const tooltip = page.getByRole('tooltip')
    await expect(card.getByRole('listitem')).toHaveText(['GitLab,', 'Orpheus Space'])
    await expect(card.getByRole('checkbox')).toHaveCount(0)
    await expect(page.getByText('Manage scheduled tasks')).toHaveCount(0)
    await card.getByRole('button', { name: 'Orpheus Space', exact: true }).focus()
    await expect(tooltip.getByText('Manage scheduled tasks', { exact: true })).toBeVisible()
    await expect(tooltip.getByRole('list', { name: locale === 'en' ? 'ENV variables' : 'Переменные ENV', exact: true }).getByRole('listitem')).toHaveText(['ORPHEUS_SPACE_HOST', 'ORPHEUS_SPACE_API_KEY'])
    await page.keyboard.press('Escape')
    await expect(tooltip).toHaveCount(0)
    await card.getByRole('button', { name: 'GitLab', exact: true }).hover()
    await expect(tooltip.getByText('GITLAB_TOKEN', { exact: true })).toBeVisible()
    await page.screenshot({ path: `test-results/services-card-${locale}-${theme}.png`, fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/services-mobile-${locale}-${theme}.png`, fullPage: true })
    expect(pageErrors).toEqual([])
  })
}
