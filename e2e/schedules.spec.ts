import { expect, test } from '@playwright/test'
import { profiles, templates, schedule, occurrence, taskID, occurrenceID, timestamp } from '../src/test/fixtures'

test('new schedule uses the signed-in email and hides empty extra ENV choices', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('orpheus_locale', 'en'))
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/session')) return route.fulfill({ json: {
      mode: 'saml', authenticated: true, read_access: true, write_access: true, can_manage_all: true,
      user: { subject: 'operator', display_name: 'Operator', email: 'operator@example.com' }, expires_at: timestamp,
    } })
    if (path.endsWith('/profiles')) return route.fulfill({ json: profiles() })
    if (path.endsWith('/templates')) return route.fulfill({ json: templates() })
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

test('list, editing, history and automatic result work in both themes', async ({ page }) => {
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
        json: { mode: 'anonymous', authenticated: false, read_access: true, write_access: true, can_manage_all: true, user: null, expires_at: null },
      })
    if (path.endsWith('/profiles')) return route.fulfill({ json: profiles() })
    if (path.endsWith('/templates')) return route.fulfill({ json: templates() })
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
  const taskRow = page.locator('tbody tr').first()
  await expect(taskRow).toHaveCSS('cursor', 'pointer')
  await taskRow.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(taskRow.getByRole('button', { name: 'Resume', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/schedules$/)
  await taskRow.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect(taskRow.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  await taskRow.locator('td').nth(1).click()
  await expect(page).toHaveURL(`/schedules/${taskID}`)
  await page.goBack()
  await page.getByRole('link', { name: 'Daily report' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(`/schedules/${taskID}`)
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
  await expect(page.getByText('Complete', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^(Load|Refresh) result$/ })).toHaveCount(0)
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
        ? { mode: 'anonymous', authenticated: false, read_access: true, write_access: true, can_manage_all: true, user: null, expires_at: null }
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
      mode: 'anonymous', authenticated: false, read_access: true, write_access: true, can_manage_all: true, user: null, expires_at: null,
    } })
    if (path.endsWith('/profiles')) return route.fulfill({ json: profiles() })
    if (path.endsWith('/templates')) return route.fulfill({ json: templates() })
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
  await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveText(prompt, { useInnerText: true })
  const input = page.getByRole('textbox', { name: 'Prompt', exact: true })
  await expect(input.locator('.md-heading').filter({ hasText: 'Monitoring rules' })).toContainText('Monitoring rules')
  await expect(input.locator('.md-property').first()).toHaveText('source')
  await input.press('ControlOrMeta+End')
  await input.press('Enter')
  await input.pressSequentially('**Новая строка**')
  await expect(input).toContainText('**Новая строка**')
  await input.press('ControlOrMeta+z')
  await expect(input).not.toContainText('Новая строка')
  await input.press('ControlOrMeta+Shift+z')
  await expect(input).toContainText('**Новая строка**')
  await input.press('Tab')
  await expect(page.getByRole('textbox', { name: /^Owner email/ })).toBeFocused()
  await input.press('ControlOrMeta+Home')
  await input.press('Tab')
  await page.setViewportSize({ width: 1280, height: 900 })
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: 'Theme', exact: true }).click()
    await page.getByRole('option', { name: theme, exact: true }).click()
    await page.screenshot({ path: `test-results/markdown-editor-${theme.toLowerCase()}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: 'test-results/markdown-editor-mobile.png', fullPage: true })
  await input.fill('')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(input).toBeFocused()
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByRole('alert')).toContainText('Required.')
  expect(task.prompt).toBe(prompt)
  await input.fill('Updated plain text')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('.prose-output')).toHaveText('Updated plain text')
  await expect(page.locator('.frontmatter')).toHaveCount(0)
})

test('readable schedules, aligned list data and clickable history rows', async ({ page }) => {
  const run = occurrence({ scheduled_at: '2026-10-02T13:00:00Z', observed_at: '2026-10-02T13:07:00Z', execution_started_at: '2026-10-02T13:00:00Z', finished_at: '2026-10-02T13:07:00Z' })
  const task = schedule({
    name: 'Мониторинг всплесков HTTP 500 ядра', owner_email: 'operator@example.com',
    cron: '*/30 * * * *', env_from: [], next_run_at: '2026-10-02T14:00:00Z', last_occurrence: run,
    prompt: '## Мониторинг ошибок\n\nКаждые 30 минут проверяй production-ошибки и сообщай только о новых существенных всплесках.\n\n- Сравни события с обычным фоном.\n- Проверь, что об ошибке ещё не сообщали.',
  })
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.addInitScript(() => {
    localStorage.setItem('orpheus_locale', 'ru')
    localStorage.setItem('orpheus_timezone', 'Europe/Moscow')
    localStorage.setItem('orpheus_theme', 'light')
  })
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/session')) return route.fulfill({ json: {
      mode: 'anonymous', authenticated: false, read_access: true, write_access: true, can_manage_all: true, user: null, expires_at: null,
    } })
    if (path.endsWith('/profiles')) return route.fulfill({ json: profiles() })
    if (path.endsWith('/templates')) return route.fulfill({ json: templates() })
    if (path.endsWith('/settings')) return route.fulfill({ json: { base_env_from: [], allowed_env_from: [], browser_auth: 'anonymous' } })
    if (path.endsWith('/result')) return route.fulfill({ json: {
      run_status: 'completed', fetched_at: timestamp,
      final_message: { id: occurrenceID, text: '**Проверка завершена.** Новых существенных всплесков нет.', created_at: timestamp }, error: null,
    } })
    if (path.endsWith('/occurrences')) return route.fulfill({ json: { items: [run], next_cursor: null } })
    if (path.endsWith('/' + occurrenceID)) return route.fulfill({ json: run })
    if (path === '/api/v1/schedules') return route.fulfill({ json: { items: [task], next_cursor: null } })
    return route.fulfill({ json: task })
  })
  await page.goto('/schedules')
  await expect(page.getByRole('columnheader', { name: 'Расписание', exact: true })).toBeVisible()
  const sentence = page.locator('span[title]').filter({ hasText: /^Каждые 30 минут$/ })
  await expect(sentence).toHaveAttribute('title', task.cron)
  const cells = page.locator('tbody tr').first().locator('td')
  await expect(cells.nth(5)).not.toContainText(task.cron)
  const status = cells.nth(3).locator('.inline-flex')
  const time = cells.nth(3).locator('time')
  const statusBox = (await status.boundingBox())!, timeBox = (await time.boundingBox())!
  expect(Math.abs(statusBox.y + statusBox.height - timeBox.y - timeBox.height)).toBeLessThan(1)
  expect(await cells.nth(4).evaluate((el) => getComputedStyle(el).fontSize)).toBe(await time.evaluate((el) => getComputedStyle(el).fontSize))
  await page.screenshot({ path: 'test-results/schedule-list-ru.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('link', { name: task.name }).click()
  await expect(page.getByRole('heading', { name: task.name, exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'История запусков', exact: true })).toBeVisible()
  await expect(sentence).toHaveAttribute('title', task.cron)
  await page.screenshot({ path: 'test-results/schedule-card-ru.png', fullPage: true, animations: 'disabled' })
  const row = page.locator('tbody tr').first()
  await expect(row).toHaveCSS('cursor', 'pointer')
  // A cell away from the date opens the same card; the date button stays keyboard-accessible.
  await row.locator('td').nth(2).click()
  await expect(page.getByText('Проверка завершена.', { exact: true })).toBeVisible()
  await page.getByRole('heading', { name: 'Данные запуска', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/schedule-history-ru.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
  const date = row.getByRole('button')
  await date.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Данные запуска', exact: true })).toBeVisible()
  await page.goto(`/schedules/${taskID}/edit`)
  await expect(sentence).toHaveAttribute('title', task.cron)
  await expect(page.locator('form')).not.toContainText(task.cron)
  await expect(page.getByRole('textbox', { name: 'Задание агенту', exact: true })).toContainText('Мониторинг ошибок')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/schedule-editor-ru.png', fullPage: true, animations: 'disabled' })
})

test('catalog choices support descriptions, keyboard search and preserved offline editing', async ({ page }) => {
  let task = schedule(), offline = false, removed = false
  const patches: Record<string, unknown>[] = []
  await page.addInitScript(() => localStorage.setItem('orpheus_locale', 'en'))
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/session')) return route.fulfill({ json: { mode: 'anonymous', authenticated: false, read_access: true, write_access: true, can_manage_all: true, user: null, expires_at: null } })
    if (path.endsWith('/profiles') || path.endsWith('/templates')) {
      if (offline) return route.fulfill({ status: 503, json: { error: { code: 'core_unavailable' } } })
      const data = path.endsWith('/profiles') ? profiles() : templates()
      if (removed) data.items = data.items.filter((item) => item.is_default)
      return route.fulfill({ json: data })
    }
    if (path.endsWith('/settings')) return route.fulfill({ json: { base_env_from: [], allowed_env_from: [], browser_auth: 'anonymous' } })
    if (path.endsWith('/occurrences')) return route.fulfill({ json: { items: [], next_cursor: null } })
    if (route.request().method() === 'POST' || route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON()
      patches.push(body)
      task = { ...task, ...body }
      return route.fulfill({ json: task })
    }
    return route.fulfill({ json: task })
  })
  await page.clock.install()
  await page.goto('/schedules/new')
  await expect(page.getByRole('button', { name: 'Profile', exact: true })).toHaveText('default')
  await page.getByLabel('Name', { exact: true }).fill('Selected execution')
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Do the work')
  await expect(page.getByLabel('Model (optional)', { exact: true })).toHaveAttribute('placeholder', 'From the profile: default-model')
  await expect(page.getByLabel('Model (optional)', { exact: true })).toHaveValue('')
  await page.getByLabel('Model (optional)', { exact: true }).fill('explicit-model')
  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await expect(page.getByRole('option', { name: /default/ })).toContainText('Default')
  offline = true
  await page.clock.fastForward(30_000)
  await expect(page.getByText('Reconnecting…')).toBeVisible()
  await expect(page.getByRole('listbox', { name: 'Profile', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Profile', exact: true })).toBeEnabled()
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('sources')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Profile', exact: true })).toHaveText('research')
  await expect(page.getByText('Search and compare sources', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Model (optional)', { exact: true })).toHaveValue('explicit-model')
  await expect(page.getByLabel('Model (optional)', { exact: true })).toHaveAttribute('placeholder', 'From the profile: research-model')
  offline = false
  await page.getByRole('button', { name: 'Sandbox template', exact: true }).click()
  await page.screenshot({ path: 'test-results/catalog-form-light.png', fullPage: true })
  await page.getByRole('option', { name: /reports:v2/ }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Selected execution' })).toBeVisible()
  expect(patches[0]).toMatchObject({ profile: 'research', template: 'reports:v2', model: 'explicit-model' })
  await page.getByRole('button', { name: 'research', exact: true }).focus()
  await expect(page.getByRole('tooltip')).toHaveText('Search and compare sources')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  removed = true
  await page.getByRole('link', { name: 'Edit schedule' }).click()
  await expect(page.getByText('This option is no longer available.', { exact: false })).toHaveCount(2)
  await page.getByRole('button', { name: 'Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await expect(page.getByRole('option', { name: /research/ })).toBeDisabled()
  await page.screenshot({ path: 'test-results/catalog-form-mobile-dark.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.keyboard.press('Escape')
  offline = true
  await page.reload()
  await expect(page.getByText('Reconnecting…')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Profile', exact: true })).toHaveText('research')
  await expect(page.getByRole('button', { name: 'Profile', exact: true })).toBeDisabled()
  await page.getByLabel('Name', { exact: true }).fill('Edited offline')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edited offline' })).toBeVisible()
  expect(patches.at(-1)).not.toHaveProperty('profile')
  expect(patches.at(-1)).not.toHaveProperty('template')
  await expect(page.getByText('research', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'research', exact: true })).toHaveCount(0)
})
