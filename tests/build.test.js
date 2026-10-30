import { it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { crc32 } from 'node:zlib'

it('builds a deterministic ZIP containing only installable extension files', async () => {
  const root = new URL('../', import.meta.url)
  execFileSync(process.execPath, ['scripts/build-supplier-extension.mjs'], { cwd: root })
  const first = await readFile(new URL('dist/supplier-import-extension.zip', root))
  execFileSync(process.execPath, ['scripts/build-supplier-extension.mjs'], { cwd: root })
  assert.deepEqual(await readFile(new URL('dist/supplier-import-extension.zip', root)), first)
  const names = []
  let offset = 0
  while (first.readUInt32LE(offset) === 0x04034b50) {
    const size = first.readUInt32LE(offset + 18), nameLength = first.readUInt16LE(offset + 26)
    const name = first.subarray(offset + 30, offset + 30 + nameLength).toString()
    const start = offset + 30 + nameLength + first.readUInt16LE(offset + 28)
    const data = first.subarray(start, start + size)
    assert.equal(crc32(data), first.readUInt32LE(offset + 14))
    assert.deepEqual(data, await readFile(new URL(`extensions/supplier-import/${name}`, root)))
    assert(!/test|fixture|node_modules|\.git/.test(name))
    names.push(name)
    offset = start + size
  }
  assert.equal(names.length, 15)
  assert(names.includes('manifest.json'))
  assert(names.includes('adapters/armtek-invoice.js'))
  assert.equal(first.readUInt32LE(offset), 0x02014b50)
  assert.equal(first.readUInt32LE(first.length - 22), 0x06054b50)
  assert.equal(first.readUInt16LE(first.length - 12), names.length)
})
