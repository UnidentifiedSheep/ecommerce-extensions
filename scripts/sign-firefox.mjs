import { execFileSync } from 'node:child_process'
import { mkdir, readdir, copyFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const issuer = process.env.AMO_JWT_ISSUER
const secret = process.env.AMO_JWT_SECRET
if (!issuer || !secret) throw new Error('Set AMO_JWT_ISSUER and AMO_JWT_SECRET in repository Actions secrets. Never put their values in source files.')

const root = new URL('../', import.meta.url)
const artifacts = new URL('dist/firefox-signing/', root)
await rm(artifacts, { recursive: true, force: true })
await mkdir(artifacts, { recursive: true })
execFileSync(process.execPath, [
  fileURLToPath(new URL('node_modules/web-ext/bin/web-ext.js', root)),
  'sign', '--channel', 'unlisted', '--no-input', '--no-config-discovery',
  '--source-dir', 'extensions/supplier-import',
  '--artifacts-dir', fileURLToPath(artifacts),
  '--approval-timeout', '900000',
], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, WEB_EXT_API_KEY: issuer, WEB_EXT_API_SECRET: secret },
})
const files = (await readdir(artifacts)).filter(name => name.endsWith('.xpi'))
if (files.length !== 1) throw new Error('Mozilla has not returned one signed XPI. Do not publish an unsigned file; inspect the AMO submission/review status.')
await copyFile(new URL(files[0], artifacts), new URL('dist/supplier-import-firefox.xpi', root))
console.log('Signed Firefox XPI ready')
