export function collectArmtekInvoice() {
  if (location.hostname !== 'etp.armtek.ru' || location.protocol !== 'https:' || !/^\/invoice(?:\/|$)/.test(location.pathname)) return { ok: false, code: 'unsupported' }
  const table = document.querySelector('#invoiceContainer table.invoice-table[id]')
  if (!table) return { ok: false, code: 'notSearch' }
  const clean = value => (value ?? '').replace(/\s+/g, ' ').trim()
  const text = element => clean(element?.textContent)
  const headers = [...table.tHead?.rows[0]?.cells ?? []]
  const column = pattern => headers.findIndex(cell => pattern.test(text(cell).toLowerCase()))
  const indices = { sku: column(/^артикул$/), producer: column(/^(бренд|производитель)$/), name: column(/^наименование$/), price: column(/^цена(?:\s|\()/), count: column(/^количество$/), returned: column(/^возвращено$/), sum: column(/^сумма(?:\s|\()/) }
  if (Object.values(indices).some(index => index < 0)) return { ok: false, code: 'invoiceInvalid' }
  const integer = value => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : undefined
  const cents = value => {
    const raw = value.replace(/\s/g, '')
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(raw)) return undefined
    const [whole, fraction = ''] = raw.replace(',', '.').split('.')
    const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    return Number.isSafeInteger(result) ? result : undefined
  }
  const rows = [...table.tBodies].flatMap(body => [...body.rows])
  if (rows.length > 20000) return { ok: false, code: 'limit' }
  const products = []
  let totalCents = 0
  for (const row of rows) {
    if (row.hidden || getComputedStyle(row).display === 'none' || !row.getClientRects().length) continue
    const cell = field => text(row.cells[indices[field]])
    const sku = cell('sku'), producer = cell('producer'), name = cell('name')
    const count = integer(cell('count')), returnedCount = integer(cell('returned')), priceCents = cents(cell('price')), lineCents = cents(cell('sum'))
    if (!producer || !name || name.length > 255 || sku.length < 3 || sku.length > 128 || !sku.replace(/[^a-zA-Z0-9а-яА-Я]/g, '')
      || count == null || count < 1 || count > 2147483647 || returnedCount == null || returnedCount > count || priceCents == null || lineCents !== priceCents * count) return { ok: false, code: 'invoiceInvalid' }
    totalCents += priceCents * count
    if (!Number.isSafeInteger(totalCents)) return { ok: false, code: 'invoiceInvalid' }
    products.push({ key: `invoice:${products.length}`, sku, producer, name, count, price: priceCents / 100, returnedCount, sections: ['results'] })
  }
  if (!products.length) return { ok: false, code: 'empty' }
  const currencyHeader = headers[indices.price]
  const currency = currencyHeader.querySelector('.glyphicon-ruble') ? 'RUB' : currencyHeader.querySelector('.glyphicon-usd') ? 'USD' : currencyHeader.querySelector('.glyphicon-euro') ? 'EUR' : null
  const info = text(document.getElementById(`${table.id}_info`))
  const range = info.match(/с\s+(\d+)\s+до\s+(\d+)\s+из\s+(\d+)/i)
  const partial = !!range && (Number(range[1]) !== 1 || Number(range[3]) !== products.length)
  return { ok: true, mode: 'purchase', supplier: 'Armtek', currency, partial, products, duplicates: 0, skipped: 0, moreAvailable: partial }
}
