import { supplierAdapters } from './suppliers.js'

export const maxGroupProducts = 1000

export function createGroupJson({ supplier, products, mode }, selected = new Set(products.map(product => product.key))) {
  if (mode === 'purchase') throw new Error('wrongMode')
  if (!supplierAdapters.some(adapter => adapter.supplier === supplier)) throw new Error('unsupported')
  const chosen = products.filter(product => selected.has(product.key))
  if (!chosen.length) throw new Error('selection')
  if (chosen.length > maxGroupProducts) throw new Error('limit')
  return JSON.stringify({ supplier, products: chosen.map(({ producer, sku, name }) => ({ producer, sku, name })) }, null, 2)
}

export function createPurchaseJson({ supplier, products, mode, currency, partial }, selected = new Set(products.map(product => product.key))) {
  if (mode !== 'purchase' || !supplierAdapters.some(adapter => adapter.supplier === supplier)) throw new Error('unsupported')
  const chosen = products.filter(product => selected.has(product.key))
  if (!chosen.length) throw new Error('selection')
  if (chosen.length > maxGroupProducts) throw new Error('limit')
  let sum = 0
  for (const row of chosen) {
    sum += Math.round(row.price * 100) * row.count
    if (!Number.isInteger(row.count) || row.count <= 0 || !Number.isFinite(row.price) || row.price < 0 || !Number.isSafeInteger(sum)) throw new Error('invoiceInvalid')
  }
  return JSON.stringify({ type: 'purchase', supplier, currency: currency ?? null, partial: !!partial || chosen.length !== products.length,
    products: chosen.map(({ producer, sku, name, count, price, returnedCount }) => ({ producer, sku, name, count, price, returnedCount: returnedCount ?? 0 })) }, null, 2)
}
