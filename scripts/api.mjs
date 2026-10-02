import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const repository = 'https://github.com/orpheus-agents/orpheus-space'
const specPath = 'api/openapi.yaml'
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

export function localSnapshot(directory, ref) {
  const git = (...args) => execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' }).trim()
  const base = git('rev-parse', '--verify', `${ref === 'worktree' ? 'HEAD' : ref}^{commit}`)
  if (ref === 'worktree') {
    const bytes = readFileSync(resolve(directory, specPath))
    return { bytes, lock: { repository, path: specPath, ref, commit: base, draft: true, sha256: digest(bytes) } }
  }
  const commit = base
  const bytes = execFileSync('git', ['-C', directory, 'show', `${commit}:${specPath}`])
  return { bytes, lock: { repository, path: specPath, ref, commit, sha256: digest(bytes) } }
}

async function fetchChecked(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Upstream request failed: HTTP ${response.status}`)
  return response
}

async function remoteBytes(commit) {
  return Buffer.from(
    await (await fetchChecked(`https://raw.githubusercontent.com/orpheus-agents/orpheus-space/${commit}/${specPath}`)).arrayBuffer(),
  )
}

async function remoteSnapshot(ref) {
  const { sha: commit } = await (
    await fetchChecked(`https://api.github.com/repos/orpheus-agents/orpheus-space/commits/${encodeURIComponent(ref)}`)
  ).json()
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Upstream did not return a full commit SHA')
  const bytes = await remoteBytes(commit)
  return { bytes, lock: { repository, path: specPath, ref, commit, sha256: digest(bytes) } }
}

export function validateSnapshot(lock, bytes) {
  if (lock.repository !== repository || lock.path !== specPath || !/^[a-f0-9]{40}$/.test(lock.commit) || !lock.ref) {
    throw new Error('Invalid upstream lock; run npm run api:update -- --ref <tag-or-commit>')
  }
  if (digest(bytes) !== lock.sha256) throw new Error('OpenAPI snapshot checksum mismatch')
}

export async function generate(bytes) {
  const ast = await openapiTS(bytes.toString(), {
    rootTypes: true,
    rootTypesNoSchemaPrefix: true,
    exportType: true,
    enum: true,
  })
  return '// Generated from api/upstream.yaml by npm run generate:api. Do not edit.\n' + astToString(ast)
}

async function main() {
  const [command, ...args] = process.argv.slice(2)
  const file = (name) => resolve(root, name)
  if (command === 'update') {
    const options = new Map()
    for (let i = 0; i < args.length; i += 2) {
      if (!['--from', '--ref'].includes(args[i]) || !args[i + 1] || options.has(args[i]))
        throw new Error('Usage: api:update -- --ref <tag-or-commit> [--from ../orpheus-space]')
      options.set(args[i], args[i + 1])
    }
    const ref = options.get('--ref')
    if (!ref) throw new Error('Explicit --ref is required; builds never follow main automatically')
    const { bytes, lock } = options.has('--from') ? localSnapshot(options.get('--from'), ref) : await remoteSnapshot(ref)
    validateSnapshot(lock, bytes)
    const output = await generate(bytes)
    await writeFile(file('api/upstream.yaml'), bytes)
    await writeFile(file('api/upstream.lock.json'), JSON.stringify(lock, null, 2) + '\n')
    await writeFile(file('src/api/generated.ts'), output)
    console.log(`OpenAPI and types updated to ${lock.commit}`)
    return
  }
  if (!['generate', 'check', 'verify'].includes(command) || args.length) throw new Error('Expected generate, check, verify, or update')
  const bytes = await readFile(file('api/upstream.yaml'))
  const lock = JSON.parse(await readFile(file('api/upstream.lock.json'), 'utf8'))
  validateSnapshot(lock, bytes)
  if (command === 'verify') {
    if (lock.draft) throw new Error('Draft contract: pin a committed backend revision before opening the frontend PR')
    if (!(await remoteBytes(lock.commit)).equals(bytes)) throw new Error('Snapshot differs from pinned upstream commit')
    console.log(`Verified upstream ${lock.commit}`)
    return
  }
  const output = await generate(bytes)
  if (command === 'generate') await writeFile(file('src/api/generated.ts'), output)
  else if (output !== (await readFile(file('src/api/generated.ts'), 'utf8')))
    throw new Error('Generated types differ; run npm run generate:api')
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
