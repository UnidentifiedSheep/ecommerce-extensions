import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export function firefoxUpdate(manifest, xpi) {
  const gecko = manifest.browser_specific_settings?.gecko
  if (!gecko?.id || !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(manifest.version)) throw new Error('Firefox ID and a numeric manifest version are required')
  if (!Buffer.isBuffer(xpi) || xpi.length === 0) throw new Error('A signed Firefox XPI is required')
  const base = 'https://github.com/UnidentifiedSheep/ecommerce-extensions/releases'
  if (gecko.update_url !== `${base}/latest/download/firefox-updates.json`) throw new Error('Unexpected Firefox update URL')
  return { addons: { [gecko.id]: { updates: [{
    version: manifest.version,
    update_link: `${base}/download/supplier-import-v${manifest.version}/supplier-import-firefox.xpi`,
    update_hash: `sha256:${createHash('sha256').update(xpi).digest('hex')}`,
    applications: { gecko: { strict_min_version: gecko.strict_min_version } },
  }] } } }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = new URL('../', import.meta.url)
  const manifest = JSON.parse(await readFile(new URL('extensions/supplier-import/manifest.json', root)))
  const signedXpi = await readFile(new URL('dist/supplier-import-firefox.xpi', root))
  await writeFile(new URL('dist/firefox-updates.json', root), JSON.stringify(firefoxUpdate(manifest, signedXpi), null, 2) + '\n')
  console.log('Firefox update metadata ready')
}
