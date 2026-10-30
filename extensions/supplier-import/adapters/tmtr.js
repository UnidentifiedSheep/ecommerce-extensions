// Self-contained for chrome.scripting.executeScript's isolated world.
export function collectTmtrPage() {
  if (location.hostname !== 'market.tmtr.ru' || location.protocol !== 'https:' || !/^\/goods\/[^/]+\/?$/.test(location.pathname)) return { ok: false, code: 'unsupported' }
  const table = document.querySelector('#goods_table')
  if (!table) return { ok: false, code: 'notSearch' }
  const rows = [...table.querySelectorAll('.flex-subgrid')].filter(row => row.querySelector('.brand-article-cell'))
  if (rows.length > 20000) return { ok: false, code: 'limit' }
  const text = element => (element?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const visible = element => element && !element.hidden && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0
  const products = new Map()
  let duplicates = 0, skipped = 0
  for (const row of rows) {
    if (!visible(row)) continue
    const producer = text(row.querySelector('.brand-article-cell .brand'))
    const sku = text(row.querySelector('.brand-article-cell .article'))
    const name = text(row.querySelector(':scope > .name'))
    const normalizedSku = sku.replace(/[^a-zA-Z0-9а-яА-Я]/g, '').toUpperCase()
    if (!producer || sku.length < 3 || sku.length > 128 || !normalizedSku || !name || name.length > 255) { skipped++; continue }
    const section = row.closest('cdk-virtual-scroll-viewport') ? 'replacements' : 'results'
    const key = `${producer.toUpperCase()}:${normalizedSku}`
    const previous = products.get(key)
    if (previous) {
      duplicates++
      if (!previous.sections.includes(section)) previous.sections.push(section)
    } else products.set(key, { key, sku, producer, name, sections: [section] })
  }
  if (!products.size) return { ok: false, code: 'empty', skipped }
  const viewport = table.querySelector('cdk-virtual-scroll-viewport')
  const itemSize = Number(viewport?.getAttribute('itemsize'))
  const spacerHeight = parseFloat(viewport?.querySelector('.cdk-virtual-scroll-spacer')?.style.height ?? '0')
  const rendered = rows.filter(row => row.closest('cdk-virtual-scroll-viewport')).length
  const expected = itemSize > 0 ? Math.ceil(spacerHeight / itemSize) : rendered
  return { ok: true, supplier: 'Tmtr', products: [...products.values()], duplicates, skipped,
    virtualized: !!viewport, moreAvailable: expected > rendered || !!viewport && viewport.scrollTop > 0 }
}
