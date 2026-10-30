import { it } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { firefoxUpdate } from '../scripts/firefox-update.mjs'

it('refuses signing before running web-ext when Mozilla keys are missing', () => {
  assert.throws(() => execFileSync(process.execPath, ['scripts/sign-firefox.mjs'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, AMO_JWT_ISSUER: '', AMO_JWT_SECRET: '' },
    stdio: 'pipe',
  }), error => error.status === 1 && error.stderr.toString().includes('Set AMO_JWT_ISSUER and AMO_JWT_SECRET'))
})

it('pins Firefox updates to the signed version, extension ID and artifact hash', async () => {
  const manifest = JSON.parse(await readFile(new URL('../extensions/supplier-import/manifest.json', import.meta.url)))
  const bytes = Buffer.from('test artifact bytes, not an installable XPI')
  const update = firefoxUpdate(manifest, bytes).addons[manifest.browser_specific_settings.gecko.id].updates[0]
  assert.equal(update.version, manifest.version)
  assert.equal(update.update_link, `https://github.com/UnidentifiedSheep/ecommerce-extensions/releases/download/supplier-import-v${manifest.version}/supplier-import-firefox.xpi`)
  assert.equal(update.update_hash, `sha256:${createHash('sha256').update(bytes).digest('hex')}`)
  assert.notEqual(firefoxUpdate(manifest, Buffer.from('different')).addons[manifest.browser_specific_settings.gecko.id].updates[0].update_hash, update.update_hash)
  assert.throws(() => firefoxUpdate(manifest, Buffer.alloc(0)), /signed Firefox XPI/)
  assert.throws(() => firefoxUpdate({ ...manifest, version: '../invalid' }, bytes), /numeric manifest version/)
})
