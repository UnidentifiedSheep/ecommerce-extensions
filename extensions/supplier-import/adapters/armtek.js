// Self-contained: Chrome serializes this function into the active tab's isolated world.
export function collectArmtekPage() {
  if (location.hostname !== 'etp.armtek.ru' || location.protocol !== 'https:') return { ok: false, code: 'unsupported' }
  const table = document.querySelector('#component-search-table-SRCDATA')
  if (!table) return { ok: false, code: 'notSearch' }
  const rows = [...table.querySelectorAll('tbody > tr')].filter(row => row.closest('table') === table)
  if (rows.length > 20000) return { ok: false, code: 'limit' }
  const text = element => (element?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const visible = element => element && !element.hidden && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0
  const products = new Map()
  let section = 'results', duplicates = 0, skipped = 0
  for (const row of rows) {
    if (row.classList.contains('section-result')) {
      const label = text(row).toLowerCase()
      section = label.includes('возможные замены') ? 'replacements' : label.includes('результаты поиска') ? 'results' : null
      continue
    }
    if (!visible(row)) continue
    const brand = row.querySelector('.brand-name')
    if (!brand) continue // Offer continuation rows carry no separate product identity.
    if (!section) { skipped++; continue }
    const link = row.querySelector('.pin-name a[pin]')
    const sku = (link?.getAttribute('pin') || text(link)).trim()
    const producer = text(brand)
    const name = text(row.querySelector('.name-text'))
    const normalizedSku = sku.replace(/[^a-zA-Z0-9а-яА-Я]/g, '').toUpperCase()
    if (!producer || sku.length < 3 || sku.length > 128 || !normalizedSku || !name || name.length > 255) { skipped++; continue }
    const key = `${producer.toUpperCase()}:${normalizedSku}`
    const previous = products.get(key)
    if (previous) {
      duplicates++
      if (!previous.sections.includes(section)) previous.sections.push(section)
    } else products.set(key, { key, sku, producer, name, sections: [section] })
  }
  if (!products.size) return { ok: false, code: 'empty', skipped }
  return { ok: true, supplier: 'Armtek', products: [...products.values()], duplicates, skipped, moreAvailable: !!visible(document.querySelector('#more-articles')) }
}
