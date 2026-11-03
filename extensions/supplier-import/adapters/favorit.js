// Self-contained for execution in the supplier tab's isolated world.
export function collectFavoritPage() {
  if (location.hostname !== 'lk.favorit-parts.ru' || location.protocol !== 'https:') return { ok: false, code: 'unsupported' }
  const clean = value => (value ?? '').replace(/\s+/g, ' ').trim()
  const text = element => clean(element?.textContent)
  const visible = element => element && !element.hidden && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0
  if (/^\/order(?:\/|$)/.test(location.pathname)) {
    const table = document.querySelector('table.table-orders-list')
    if (!visible(table)) return { ok: false, code: 'notSearch' }
    const headers = [...table.tHead?.rows[0]?.cells ?? []]
    // Read the label without the sort arrow appended by Favorit's table headers.
    const header = cell => text(cell.querySelector('b') ?? cell).toLowerCase()
    const column = pattern => headers.findIndex(cell => pattern.test(header(cell)))
    const indices = { producer: column(/^(производитель|бренд)$/), sku: column(/^(номер|артикул)$/), name: column(/^наименование$/), count: column(/^(количество|кол-во)$/), price: column(/^цена(?:[\s,]|$)/), sum: column(/^сумма(?:[\s,]|$)/) }
    if (Object.values(indices).some(index => index < 0)) return { ok: false, code: 'invoiceInvalid' }
    const cents = value => {
      const match = value.replace(/\s/g, '').match(/^(\d+)(?:[.,](\d{1,2}))?$/)
      if (!match) return undefined
      const result = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
      return Number.isSafeInteger(result) ? result : undefined
    }
    const currencyOf = value => /руб|RUB|₽/i.test(value) ? 'RUB' : /USD|\$/i.test(value) ? 'USD' : /EUR|€/i.test(value) ? 'EUR' : /TRY|₺/i.test(value) ? 'TRY' : null
    const currency = currencyOf(header(headers[indices.price]))
    if (currency !== currencyOf(header(headers[indices.sum]))) return { ok: false, code: 'invoiceInvalid' }
    const orderRows = [...table.tBodies].flatMap(body => [...body.rows])
    if (orderRows.length > 20000) return { ok: false, code: 'limit' }
    const invoiceProducts = []
    let totalCents = 0, documentTotal, partial = false
    for (const row of orderRows) {
      if (!visible(row)) { partial = true; continue }
      if (row.cells.length === 2 && row.cells[0].colSpan > 1 && /^итого:?$/i.test(text(row.cells[0]))) {
        if (documentTotal != null) return { ok: false, code: 'invoiceInvalid' }
        documentTotal = cents(text(row.cells[1]))
        if (documentTotal == null) return { ok: false, code: 'invoiceInvalid' }
        continue
      }
      const cell = field => row.cells[indices[field]]
      const fullText = field => clean(cell(field)?.querySelector('[title]')?.getAttribute('title')) || text(cell(field))
      const producer = fullText('producer'), sku = fullText('sku'), name = fullText('name')
      const quantity = text(cell('count')).replace(/\s/g, '')
      const count = /^\d+$/.test(quantity) ? Number(quantity) : NaN
      const priceCents = cents(text(cell('price'))), lineCents = cents(text(cell('sum')))
      if (!producer || !name || name.length > 255 || sku.length < 3 || sku.length > 128 || !sku.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '')
        || !Number.isSafeInteger(count) || count < 1 || count > 2147483647 || priceCents == null || lineCents == null
        || !Number.isSafeInteger(priceCents * count) || lineCents !== priceCents * count) return { ok: false, code: 'invoiceInvalid' }
      totalCents += lineCents
      if (!Number.isSafeInteger(totalCents)) return { ok: false, code: 'invoiceInvalid' }
      invoiceProducts.push({ key: `invoice:${invoiceProducts.length}`, producer, sku, name, count, price: priceCents / 100, returnedCount: 0, sections: ['results'] })
    }
    if (!invoiceProducts.length) return { ok: false, code: 'empty' }
    partial ||= visible(document.querySelector('.pagination, .pager')) || false
    if (documentTotal == null || (!partial && documentTotal !== totalCents) || documentTotal < totalCents) return { ok: false, code: 'invoiceInvalid' }
    return { ok: true, mode: 'purchase', supplier: 'FavoritParts', currency, partial, products: invoiceProducts, duplicates: 0, skipped: 0, moreAvailable: partial }
  }
  if (!/^\/analogues(?:\/|$)/.test(location.pathname)) return { ok: false, code: 'unsupported' }
  const rows = [...document.querySelectorAll('.dev__new__style_not_analog__serach__row, .dev__new__style_analog__serach__row')]
  if (!rows.length) return { ok: false, code: 'notSearch' }
  if (rows.length > 20000) return { ok: false, code: 'limit' }
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
