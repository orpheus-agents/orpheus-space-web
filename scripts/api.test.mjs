import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { generate, localSnapshot, validateSnapshot } from './api.mjs'

test('snapshot reads the specified commit, not working-tree edits; checksum detects edits', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'orpheus-space-web-api-'))
  try {
    await mkdir(join(dir, 'api'))
    await writeFile(join(dir, 'api/openapi.yaml'), 'committed schema\n')
    const git = (...args) => execFileSync('git', ['-C', dir, ...args], { stdio: 'pipe' })
    git('init')
    git('add', 'api/openapi.yaml')
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-m', 'schema')
    await writeFile(join(dir, 'api/openapi.yaml'), 'dirty schema\n')
    const draft = localSnapshot(dir, 'worktree')
    assert.equal(draft.lock.draft, true)
    assert.equal(draft.bytes.toString(), 'dirty schema\n')
    validateSnapshot(draft.lock, draft.bytes)
    const snapshot = localSnapshot(dir, 'HEAD')
    assert.equal(snapshot.bytes.toString(), 'committed schema\n')
    assert.match(snapshot.lock.commit, /^[a-f0-9]{40}$/)
    validateSnapshot(snapshot.lock, snapshot.bytes)
    assert.throws(() => validateSnapshot(snapshot.lock, Buffer.from('edited')), /checksum/)
    assert.throws(() => validateSnapshot({ ...snapshot.lock, commit: 'main' }, snapshot.bytes), /lock/)
  } finally {
    await rm(dir, { recursive: true })
  }
})

test('generation preserves string precision and emits runtime enum constants', async () => {
  const spec = Buffer.from(
    JSON.stringify({
      openapi: '3.1.0',
      info: { title: 'Test', version: '1' },
      paths: {},
      components: {
        schemas: {
          Counter: {
            type: 'object',
            required: ['total', 'state'],
            properties: { total: { type: 'string' }, state: { type: 'string', enum: ['fresh', 'stale'] } },
          },
        },
      },
    }),
  )
  const generated = await generate(spec)
  assert.match(generated, /total: string/)
  assert.match(generated, /export enum CounterState/)
  assert.equal(await generate(spec), generated)
})
