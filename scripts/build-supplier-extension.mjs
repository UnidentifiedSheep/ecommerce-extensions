import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../extensions/supplier-import/', import.meta.url)
const names = ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'messages.js', 'export.js', 'suppliers.js', 'adapters/armtek.js', 'adapters/armtek-invoice.js', 'adapters/tmtr.js', 'adapters/favorit.js', '_locales/ru/messages.json', '_locales/en/messages.json', '_locales/tr/messages.json', 'README.md']
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})
function crc32(data) {
  let crc = 0xffffffff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// Small deterministic ZIP (stored entries), using only Node's standard library.
// An explicit file list keeps tests, page snapshots and local files out of the download.
const entries = [], directory = []
let offset = 0, directorySize = 0
for (const name of names) {
  const data = await readFile(new URL(name, root)), filename = Buffer.from(name), checksum = crc32(data)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(33, 12)
  local.writeUInt32LE(checksum, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(33, 14)
  central.writeUInt32LE(checksum, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42)
  entries.push(local, filename, data); directory.push(central, filename)
  offset += local.length + filename.length + data.length; directorySize += central.length + filename.length
}
const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(names.length, 8); end.writeUInt16LE(names.length, 10); end.writeUInt32LE(directorySize, 12); end.writeUInt32LE(offset, 16)
const destination = new URL('../dist/supplier-import-extension.zip', import.meta.url)
await mkdir(new URL('.', destination), { recursive: true })
await writeFile(destination, Buffer.concat([...entries, ...directory, end]))
console.log(`Supplier extension: ${names.length} files → ${fileURLToPath(destination)}`)
