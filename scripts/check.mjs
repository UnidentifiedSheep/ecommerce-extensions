import { readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist'].includes(entry.name)) continue
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) await check(path)
    else if (/\.(?:mjs|js)$/.test(entry.name)) execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' })
  }
}
await check('.')
console.log('JavaScript syntax checked')
