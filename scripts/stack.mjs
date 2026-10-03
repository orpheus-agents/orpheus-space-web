import { execFileSync, spawn } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { get as httpsGet } from 'node:https'
import { localSnapshot, validateSnapshot } from './api.mjs'

const action = process.argv[2]
if (!['start', 'start-saml', 'stop', 'test'].includes(action)) throw new Error('Expected start, start-saml, stop, or test')
const lock = JSON.parse(await readFile('api/upstream.lock.json', 'utf8'))
validateSnapshot(lock, await readFile('api/upstream.yaml'))
// The integration project takes its own ports so it can run beside a started dev stack.
const defaults = action === 'test' ? ['18096', '19445', '19446'] : ['18095', '19443', '19444']
const httpPort = process.env.ORPHEUS_SPACE_WEB_HTTP_PORT || defaults[0]
const httpsPort = process.env.ORPHEUS_SPACE_WEB_HTTPS_PORT || defaults[1]
const idpPort = process.env.ORPHEUS_SPACE_WEB_IDP_PORT || defaults[2]
const environment = {
  ...process.env,
  ORPHEUS_PUBLIC_URL: process.env.ORPHEUS_PUBLIC_URL || `http://127.0.0.1:${httpPort}`,
  ORPHEUS_SPACE_WEB_HTTP_PORT: httpPort,
  ORPHEUS_SPACE_WEB_HTTPS_PORT: httpsPort,
  ORPHEUS_SPACE_WEB_IDP_PORT: idpPort,
  ORPHEUS_SPACE_COMMIT: lock.commit,
  ORPHEUS_SPACE_CONTEXT: `${lock.repository}.git#${lock.commit}`,
}
let localContext
const project = action === 'test' ? 'orpheus-space-web-integration' : 'orpheus-space-web-dev'
const composeFile = resolve('.docker/dev/compose.yaml')
environment.COMPOSE_PROJECT_NAME = project
environment.COMPOSE_FILE = composeFile
const compose = ['compose', '-p', project, '-f', composeFile]
const saml = [...compose, '-f', '.docker/dev/compose.saml.yaml']
async function run(command, args, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env: { ...environment, ...extraEnv } })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))))
  })
}
function descriptor(ca) {
  return new Promise((resolve, reject) => {
    const request = httpsGet(
      `https://localhost:${idpPort}/realms/orpheus-space-web/protocol/saml/descriptor`,
      { ca, timeout: 2000 },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => (response.statusCode === 200 ? resolve(Buffer.concat(chunks)) : reject(new Error('Keycloak not ready'))))
      },
    )
    request.on('timeout', () => request.destroy(new Error('Keycloak timeout')))
    request.on('error', reject)
  })
}
async function setupSAML() {
  await mkdir('.integration-auth', { recursive: true })
  await run('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    '.integration-auth/key.pem',
    '-out',
    '.integration-auth/cert.pem',
    '-subj',
    '/CN=localhost',
    '-days',
    '2',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ])
  // Disposable fixture credentials must be readable by the containers' non-root users.
  await chmod('.integration-auth/key.pem', 0o644)
  const cert = await readFile('.integration-auth/cert.pem', 'utf8')
  const certificate = cert.replace(/-----[^-]+-----|\s/g, '')
  const realm = {
    realm: 'orpheus-space-web',
    enabled: true,
    sslRequired: 'all',
    clients: [
      {
        clientId: 'orpheus-space-web-test',
        enabled: true,
        protocol: 'saml',
        redirectUris: [`https://localhost:${httpsPort}/auth/callback`],
        protocolMappers: [{
          name: 'email', protocol: 'saml', protocolMapper: 'saml-user-property-mapper',
          config: { 'user.attribute': 'email', 'attribute.name': 'email', 'attribute.nameformat': 'Basic' },
        }],
        attributes: {
          'saml.assertion.signature': 'true',
          'saml.authnstatement': 'true',
          'saml.server.signature': 'true',
          'saml.client.signature': 'true',
          'saml.signature.algorithm': 'RSA_SHA256',
          'saml.signing.certificate': certificate,
          'saml.force.post.binding': 'true',
          saml_assertion_consumer_url_post: `https://localhost:${httpsPort}/auth/callback`,
          saml_name_id_format: 'username',
        },
      },
    ],
    users: [
      {
        username: 'operator',
        firstName: 'Test',
        lastName: 'Operator',
        email: 'operator@example.test',
        emailVerified: true,
        enabled: true,
        credentials: [{ type: 'password', value: 'fixture-password', temporary: false }],
      },
    ],
  }
  for (const username of ['alice', 'bob']) {
    realm.users.push({
      username, firstName: 'Test', lastName: username,
      email: `${username}@example.test`, emailVerified: true, enabled: true,
      credentials: [{ type: 'password', value: 'fixture-password', temporary: false }],
    })
  }
  // This user has Space access, but no role granting the technical-panel client.
  const gateId = 'a5555555-5555-4555-8555-555555555555'
  realm.roles = { realm: [{ name: 'core-access' }] }
  realm.authenticatorConfig = [{ alias: 'core-role-missing', config: { condUserRole: 'core-access', negate: 'true' } }]
  const execution = (authenticator, requirement, priority, extra = {}) => ({
    authenticator,
    requirement,
    priority,
    authenticatorFlow: false,
    userSetupAllowed: false,
    ...extra,
  })
  const flow = (alias, topLevel, authenticationExecutions, extra = {}) => ({
    alias,
    providerId: 'basic-flow',
    builtIn: false,
    topLevel,
    authenticationExecutions,
    ...extra,
  })
  realm.authenticationFlows = [
    flow(
      'core-client-gate',
      true,
      [
        execution(undefined, 'REQUIRED', 10, { authenticatorFlow: true, flowAlias: 'core-identify' }),
        execution(undefined, 'CONDITIONAL', 20, { authenticatorFlow: true, flowAlias: 'core-role-check' }),
      ],
      { id: gateId },
    ),
    flow('core-identify', false, [
      execution('auth-cookie', 'ALTERNATIVE', 10),
      execution('auth-username-password-form', 'ALTERNATIVE', 20),
    ]),
    flow('core-role-check', false, [
      execution('conditional-user-role', 'REQUIRED', 10, { authenticatorConfig: 'core-role-missing' }),
      execution('deny-access-authenticator', 'REQUIRED', 20),
    ]),
  ]
  realm.clients.push({
    clientId: 'technical-panel',
    enabled: true,
    protocol: 'saml',
    redirectUris: [`https://localhost:${httpsPort}/core-callback`],
    authenticationFlowBindingOverrides: { browser: gateId },
    attributes: {
      'saml.assertion.signature': 'true',
      'saml.authnstatement': 'true',
      'saml.client.signature': 'false',
      'saml.force.post.binding': 'true',
      saml_idp_initiated_sso_url_name: 'technical-panel',
      saml_assertion_consumer_url_post: `https://localhost:${httpsPort}/core-callback`,
      saml_name_id_format: 'username',
    },
  })
  await writeFile('.integration-auth/realm.json', JSON.stringify(realm))
  await run('docker', [...saml, 'up', '-d', 'keycloak'])
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      await writeFile('.integration-auth/idp.xml', await descriptor(cert))
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  throw new Error('Keycloak did not become ready')
}

try {
  if (lock.draft && !process.env.ORPHEUS_SPACE_PATH && action !== 'stop') throw new Error('Draft contract requires ORPHEUS_SPACE_PATH')
  if (process.env.ORPHEUS_SPACE_PATH && action !== 'stop') {
    const source = resolve(process.env.ORPHEUS_SPACE_PATH)
    const snapshot = localSnapshot(source, lock.draft ? 'worktree' : lock.commit)
    if (snapshot.lock.sha256 !== lock.sha256) throw new Error('Local backend contract differs from the pinned snapshot')
    if (lock.draft) {
      environment.ORPHEUS_SPACE_CONTEXT = source
    } else {
      localContext = await mkdtemp(join(tmpdir(), 'orpheus-space-web-core-'))
      const archive = join(localContext, 'source.tar')
      execFileSync('git', ['-C', source, 'archive', '--output', archive, lock.commit])
      execFileSync('tar', ['-xf', archive, '-C', localContext])
      await rm(archive)
      environment.ORPHEUS_SPACE_CONTEXT = localContext
    }
  }
  if (action === 'stop') await run('docker', [...compose, 'down', '--remove-orphans'])
  else if (action === 'start') {
    await run('docker', [...compose, 'up', '-d', '--build', '--wait', '--wait-timeout', '180'])
    console.log(`Orpheus Space: http://127.0.0.1:${httpPort} (disposable databases, Orpheus catalogs, no workers)`)
  } else if (action === 'start-saml') {
    await setupSAML()
    await run('docker', [...saml, 'up', '-d', '--build', '--wait', '--wait-timeout', '180', 'db', 'migrate', 'space', 'ui', 'keycloak'])
    console.log(`Orpheus Space SAML: https://localhost:${httpsPort} (operator / fixture-password)`)
  } else {
    try {
      await run('docker', [...compose, 'up', '-d', '--build', '--wait', '--wait-timeout', '180'])
      await run('npx', ['playwright', 'test', 'e2e/backend.spec.ts'], { INTEGRATION_URL: `http://127.0.0.1:${httpPort}` })
      await setupSAML()
      await run('docker', [...saml, 'up', '-d', '--wait', '--wait-timeout', '180', 'space', 'ui'])
      await run('npx', ['playwright', 'test', 'e2e/backend.spec.ts'], {
        INTEGRATION_URL: `https://localhost:${httpsPort}`,
        INTEGRATION_SAML: '1',
      })
    } catch (error) {
      await run('docker', [...saml, 'logs', '--no-color', '--tail', '60']).catch(() => {})
      throw error
    } finally {
      await run('docker', [...saml, 'down', '--remove-orphans'])
    }
  }
} finally {
  if (localContext) await rm(localContext, { recursive: true })
}
