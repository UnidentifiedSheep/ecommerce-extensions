// Self-contained for chrome.scripting.executeScript's isolated world.
export function collectTmtrPage() {
  if (location.hostname !== 'market.tmtr.ru' || location.protocol !== 'https:') return { ok: false, code: 'unsupported' }
  const text = element => (element?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const visible = element => element && !element.hidden && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0
  const invoice = document.querySelector('#orders_balance_detail_dialog')
  if (visible(invoice)) {
    // The balance screen also opens payments and returns: only shipments are purchases.
    if (!/(?:^|[\s/])отгрузка(?:\s|$)/i.test(text(invoice.querySelector('h1')))) return { ok: false, code: 'notSearch' }
    const invoiceTable = invoice.querySelector('table.table_delivery_product')
    if (!invoiceTable) return { ok: false, code: 'notSearch' }
    const columns = ['producer', 'article', 'nomenclature', 'number', 'price', 'amount']
    if (columns.some(column => !invoiceTable.querySelector(`thead .mat-column-${column}`))) return { ok: false, code: 'invoiceInvalid' }
    const invoiceRows = [...invoiceTable.querySelectorAll('tbody tr')].filter(row => !row.classList.contains('mat-mdc-no-data-row'))
    if (invoiceRows.length > 20000) return { ok: false, code: 'limit' }
    const money = value => {
      const match = value.replace(/\s/g, '').match(/^(\d+)(?:[.,](\d{1,2}))?(₽|руб\.?|RUB|\$|USD|€|EUR|₺|TRY)?$/i)
      if (!match) return undefined
      const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
      if (!Number.isSafeInteger(cents)) return undefined
      const marker = (match[3] ?? '').toUpperCase()
      const currency = /^(₽|РУБ\.?|RUB)$/.test(marker) ? 'RUB' : /^(\$|USD)$/.test(marker) ? 'USD' : /^(€|EUR)$/.test(marker) ? 'EUR' : /^(₺|TRY)$/.test(marker) ? 'TRY' : null
      return { cents, currency }
    }
    const invoiceProducts = []
    const currencies = new Set()
    let totalCents = 0, partial = false
    for (const row of invoiceRows) {
      if (!visible(row)) { partial = true; continue }
      const cell = column => text(row.querySelector(`.mat-column-${column}`))
      const producer = cell('producer'), sku = cell('article'), name = cell('nomenclature')
      const quantity = cell('number').replace(/\s/g, '')
      const count = /^\d+$/.test(quantity) ? Number(quantity) : NaN
      const price = money(cell('price')), amount = money(cell('amount'))
      if (!producer || !name || name.length > 255 || sku.length < 3 || sku.length > 128 || !sku.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '')
        || !Number.isSafeInteger(count) || count < 1 || count > 2147483647 || !price || !amount
        || !Number.isSafeInteger(price.cents * count) || amount.cents !== price.cents * count) return { ok: false, code: 'invoiceInvalid' }
      if (price.currency) currencies.add(price.currency)
      if (amount.currency) currencies.add(amount.currency)
      if (currencies.size > 1) return { ok: false, code: 'invoiceInvalid' }
      totalCents += amount.cents
      if (!Number.isSafeInteger(totalCents)) return { ok: false, code: 'invoiceInvalid' }
      invoiceProducts.push({ key: `invoice:${invoiceProducts.length}`, producer, sku, name, count, price: price.cents / 100, returnedCount: 0, sections: ['results'] })
    }
    if (!invoiceProducts.length) return { ok: false, code: 'empty' }
    const paginator = invoice.querySelector('mat-paginator')
    if (visible(paginator)) {
      const range = text(paginator.querySelector('.mat-mdc-paginator-range-label')).match(/(\d+)\s*[-–—]\s*(\d+)\s+(?:из|of)\s+(\d+)/i)
      partial ||= !range || Number(range[1]) !== 1 || Number(range[2]) !== invoiceProducts.length || Number(range[3]) !== invoiceProducts.length
    }
    return { ok: true, mode: 'purchase', supplier: 'Tmtr', currency: [...currencies][0] ?? null, partial, products: invoiceProducts, duplicates: 0, skipped: 0, moreAvailable: partial }
  }
  if (!/^\/goods\/[^/]+\/?$/.test(location.pathname)) return { ok: false, code: 'unsupported' }
  const table = document.querySelector('#goods_table')
  if (!table) return { ok: false, code: 'notSearch' }
  const rows = [...table.querySelectorAll('.flex-subgrid')].filter(row => row.querySelector('.brand-article-cell'))
  if (rows.length > 20000) return { ok: false, code: 'limit' }
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
