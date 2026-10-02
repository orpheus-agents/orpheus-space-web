import { expect, test } from '@playwright/test'
import { schedule, occurrence, taskID, occurrenceID, timestamp } from '../src/test/fixtures'

test('new schedule uses the signed-in email and hides empty extra ENV choices', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('orpheus_locale', 'en'))
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/session')) return route.fulfill({ json: {
      mode: 'saml', authenticated: true, read_access: true, write_access: true,
      user: { subject: 'operator', display_name: 'Operator', email: 'operator@example.com' }, expires_at: timestamp,
    } })
    if (path.endsWith('/settings')) return route.fulfill({ json: {
      base_env_from: ['A'], allowed_env_from: ['A'], browser_auth: 'saml',
    } })
    return route.fulfill({ json: schedule() })
  })
  await page.goto('/schedules/new')
  const owner = page.getByRole('textbox', { name: /^Owner email/ })
  await expect(owner).toHaveValue('operator@example.com')
  await expect(page.getByRole('group', { name: 'Additional ENV names' })).toHaveCount(0)
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await owner.fill('')
  await expect(owner).toHaveValue('')
  await page.screenshot({ path: 'test-results/new-schedule-email.png', fullPage: true })
  await page.goto(`/schedules/${taskID}/edit`)
  await expect(owner).toHaveValue('alice@example.com')
})

test('list, editing, history and explicit result work in both themes', async ({ page }) => {
  let task = schedule(),
    resultCalls = 0
  await page.addInitScript(() => {
    localStorage.setItem('orpheus_locale', 'en')
    localStorage.setItem('orpheus_timezone', 'UTC')
  })
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname
    if (path === '/api/v1/auth/session')
      return route.fulfill({
        json: { mode: 'anonymous', authenticated: false, read_access: true, write_access: true, user: null, expires_at: null },
      })
    if (path.endsWith('/settings'))
      return route.fulfill({ json: { base_env_from: ['A'], allowed_env_from: ['A', 'B'], browser_auth: 'anonymous' } })
    if (path.endsWith('/preview'))
      return route.fulfill({
        json: { times: Array.from({ length: 5 }, (_, i) => new Date(Date.parse(timestamp) + i * 86400000).toISOString()) },
      })
    if (path.endsWith('/result')) {
      resultCalls++
      return route.fulfill({
        json: {
          run_status: 'completed',
          fetched_at: timestamp,
          final_message: { id: occurrenceID, text: '**Complete**\n\n![remote](https://external.test/pixel.png)', created_at: timestamp },
          error: null,
        },
      })
    }
    if (path.endsWith('/occurrences')) return route.fulfill({ json: { items: [occurrence()], next_cursor: null } })
    if (path.endsWith('/' + occurrenceID)) return route.fulfill({ json: occurrence() })
    if (path === '/api/v1/schedules') return route.fulfill({ json: { items: [task], next_cursor: null } })
    if (request.method() === 'PATCH') {
      task = { ...task, ...request.postDataJSON() }
      return route.fulfill({ json: task })
    }
    return route.fulfill({ json: task })
  })
  await page.goto('/schedules')
  await expect(page.getByRole('heading', { name: 'Schedules', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navigation' })).toContainText('Skills, soon')
  await expect(page.getByRole('navigation', { name: 'Navigation' }).getByRole('link')).toHaveCount(1)
  await expect(page.getByRole('cell', { name: 'No runs yet' })).toBeVisible()
  await page.getByRole('link', { name: 'Daily report' }).click()
  await page.getByRole('link', { name: 'Edit schedule' }).click()
  await expect(page.getByRole('button', { name: 'Time zone', exact: true })).toContainText('Europe/Moscow')
  await expect(page.getByRole('combobox', { name: 'Repeat', exact: true })).toHaveValue('daily')
  await expect(page.getByText('At 09:00', { exact: true })).toBeVisible()
  await page.getByLabel('Name', { exact: true }).fill('Updated report')
  await page.getByRole('combobox', { name: 'Repeat', exact: true }).selectOption('weekdays')
  await expect(page.getByText('At 09:00, Monday through Friday', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Preview next runs' }).click()
  await expect(page.getByText('Times in Europe/Moscow')).toBeVisible()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Updated report' })).toBeVisible()
  expect(task.cron).toBe('0 9 * * 1-5')
  expect(resultCalls).toBe(0)
  await expect(page.getByRole('cell', { name: 'Completed' })).toBeVisible()
  await page.locator('tbody button').click()
  await expect(page.getByRole('heading', { name: 'Run details' })).toBeVisible()
  expect(resultCalls).toBe(0)
  await page.getByRole('button', { name: 'Load result', exact: true }).click()
  await expect(page.getByText('Complete', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refresh result', exact: true })).toBeVisible()
  expect(resultCalls).toBe(1)
  await expect(page.locator('.prose-output img')).toHaveCount(0)
  await page.getByRole('button', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: 'test-results/schedule-dark.png', fullPage: true })
  await page.getByRole('button', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Light', exact: true }).click()
  await page.screenshot({ path: 'test-results/schedule-light.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/schedules/${taskID}/edit`)
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/editor-mobile.png', fullPage: true })
})

test('filters repeat owner emails, retain them across cursor pages and clear cursor on changes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('orpheus_locale', 'en'))
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url())
    return route.fulfill({
      json: url.pathname.endsWith('/auth/session')
        ? { mode: 'anonymous', authenticated: false, read_access: true, write_access: true, user: null, expires_at: null }
        : { items: [], next_cursor: url.searchParams.has('cursor') ? null : 'opaque' },
    })
  })
  await page.goto('/schedules')
  await page.getByLabel('Owner emails, separated by commas').fill('alice@example.com, bob@example.com')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect.poll(() => new URL(page.url()).searchParams.getAll('owner_email')).toEqual(['alice@example.com', 'bob@example.com'])
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('cursor')).toBe('opaque')
  await page.goBack()
  await expect(page.getByLabel('Owner emails, separated by commas')).toHaveValue('alice@example.com, bob@example.com')
  await page.getByLabel('Shared only').check()
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('unowned')).toBe('true')
  expect(new URL(page.url()).searchParams.has('owner_email')).toBe(false)
  expect(new URL(page.url()).searchParams.has('cursor')).toBe(false)
})

test('schedule prompts render Markdown and front matter while preserving the editable source', async ({ page }) => {
  const prompt = [
    '---', 'source: monitoring', 'channel: "dev-errors"', '---',
    '## Monitoring rules', '', '**Only new incidents.** See [dashboard](https://example.test/dashboard).', '',
    '- Read the logs', '- Compare recent events', '',
    '1. Check the channel', '2. Publish the result', '',
    '> Keep the report concise.', '',
    '| Service | Status |', '| --- | --- |', '| API | Ready |', '',
    '```bash', 'echo "ready"', '```', '',
    '![remote preview](https://example.test/pixel.png)', '',
    '<img src="https://example.test/unsafe.png" onerror="alert(1)">',
  ].join('\n')
  let task = schedule({ prompt })
  const remoteRequests: string[] = []
  page.on('request', (request) => { if (request.url().startsWith('https://example.test/')) remoteRequests.push(request.url()) })
  await page.addInitScript(() => localStorage.setItem('orpheus_locale', 'en'))
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/session')) return route.fulfill({ json: {
      mode: 'anonymous', authenticated: false, read_access: true, write_access: true, user: null, expires_at: null,
    } })
    if (path.endsWith('/settings')) return route.fulfill({ json: { base_env_from: [], allowed_env_from: [], browser_auth: 'anonymous' } })
    if (path.endsWith('/occurrences')) return route.fulfill({ json: { items: [], next_cursor: null } })
    if (route.request().method() === 'PATCH') task = { ...task, ...route.request().postDataJSON() }
    return route.fulfill({ json: task })
  })
  await page.goto(`/schedules/${taskID}`)
  await expect(page.locator('.frontmatter .hljs-attr').first()).toHaveText('source:')
  await expect(page.locator('.frontmatter')).toContainText('channel: "dev-errors"')
  const body = page.locator('.prose-output')
  await expect(body.getByRole('heading', { name: 'Monitoring rules' })).toBeVisible()
  await expect(body.locator('strong')).toHaveText('Only new incidents.')
  await expect(body.locator('ul li')).toHaveCount(2)
  await expect(body.locator('ol li')).toHaveCount(2)
  await expect(body.locator('blockquote')).toContainText('Keep the report concise.')
  await expect(body.getByRole('cell', { name: 'Ready' })).toBeVisible()
  await expect(body.locator('pre code .hljs-built_in')).toHaveText('echo')
  await expect(body.getByRole('link', { name: 'dashboard' })).toHaveAttribute('href', 'https://example.test/dashboard')
  await expect(body.getByRole('link', { name: 'remote preview' })).toBeVisible()
  await expect(body.locator('img')).toHaveCount(0)
  expect(remoteRequests).toEqual([])
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: 'Theme', exact: true }).click()
    await page.getByRole('option', { name: theme, exact: true }).click()
    await page.screenshot({ path: `test-results/prompt-${theme.toLowerCase()}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(body.getByRole('heading', { name: 'Monitoring rules' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: 'test-results/prompt-mobile.png', fullPage: true })
  await page.getByRole('link', { name: 'Edit schedule' }).click()
  await expect(page.getByLabel('Prompt', { exact: true })).toHaveValue(prompt)
  await page.getByLabel('Prompt', { exact: true }).fill('Updated plain text')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('.prose-output')).toHaveText('Updated plain text')
  await expect(page.locator('.frontmatter')).toHaveCount(0)
})
