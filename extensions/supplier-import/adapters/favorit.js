// Self-contained for execution in the supplier tab's isolated world.
export function collectFavoritPage() {
  if (location.hostname !== 'lk.favorit-parts.ru' || location.protocol !== 'https:' || !/^\/analogues(?:\/|$)/.test(location.pathname)) return { ok: false, code: 'unsupported' }
  const rows = [...document.querySelectorAll('.dev__new__style_not_analog__serach__row, .dev__new__style_analog__serach__row')]
  if (!rows.length) return { ok: false, code: 'notSearch' }
  if (rows.length > 20000) return { ok: false, code: 'limit' }
  const clean = value => (value ?? '').replace(/\s+/g, ' ').trim()
  const text = element => clean(element?.textContent)
  const visible = element => element && !element.hidden && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0
  const products = new Map()
  let duplicates = 0, skipped = 0
  for (const row of rows) {
    if (!visible(row)) continue
    // The other half contains warehouse offers, not product identity.
    const identity = row.firstElementChild
    const brand = identity?.querySelector('a[href^="/brand/"]')
    const article = identity?.querySelector('a[href^="/search/"]')
    const nameElement = [...identity?.querySelectorAll('div.disable--wrap--text[title]') ?? []]
      .find(element => !element.contains(brand) && !element.contains(article))
    const producer = clean(brand?.closest('.disable--wrap--text')?.getAttribute('title')) || text(brand)
    const sku = clean(article?.getAttribute('title')) || text(article)
    const name = clean(nameElement?.getAttribute('title')) || text(nameElement)
    const normalizedSku = sku.replace(/[^a-zA-Z0-9а-яА-Я]/g, '').toUpperCase()
    if (!producer || sku.length < 3 || sku.length > 128 || !normalizedSku || !name || name.length > 255) { skipped++; continue }
    const section = row.classList.contains('dev__new__style_not_analog__serach__row') ? 'results' : 'replacements'
    const key = `${producer.toUpperCase()}:${normalizedSku}`
    const previous = products.get(key)
    if (previous) {
      duplicates++
      if (!previous.sections.includes(section)) previous.sections.push(section)
    } else products.set(key, { key, sku, producer, name, sections: [section] })
  }
  if (!products.size) return { ok: false, code: 'empty', skipped }
  return { ok: true, supplier: 'FavoritParts', products: [...products.values()], duplicates, skipped, moreAvailable: false }
}
