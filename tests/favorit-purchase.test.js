import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { collectFavoritPage } from '../extensions/supplier-import/adapters/favorit.js'
import { createPurchaseJson } from '../extensions/supplier-import/export.js'

const labels = { producer: 'Производитель', sku: 'Номер', name: 'Наименование', storage: 'Склад', count: 'Количество', price: 'Цена, руб.', sum: 'Сумма, руб.' }
const element = (textContent = '', options = {}) => ({ textContent, hidden: false, getClientRects() { return this.hidden ? [] : [{}] }, querySelector: () => null, ...options })
function collect(items = [{}], options = {}) {
  const columns = options.columns ?? Object.keys(labels)
  const headers = columns.map(key => element(`${labels[key]} ▼`, { querySelector: () => element(labels[key]) }))
  const rows = items.map(override => {
    const values = { producer: 'MAN', sku: 'TEST-123', name: 'Part', storage: 'WH', count: '2', price: '10,50', sum: '21,00', ...override }
    const cells = columns.map(key => element(values[key], { querySelector: () => key === 'name' && values.fullName ? { getAttribute: () => values.fullName } : null }))
    return element('', { cells, hidden: !!values.hidden })
  })
  if (!options.noFooter) rows.push(element('', { cells: [element('Итого:', { colSpan: 6 }), element(options.total ?? '21,00')] }))
  const table = element('', { tHead: { rows: [{ cells: headers }] }, tBodies: [{ rows }] })
  const result = runInNewContext(`(${collectFavoritPage.toString()})()`, {
    location: { hostname: options.hostname ?? 'lk.favorit-parts.ru', protocol: options.protocol ?? 'https:', pathname: options.path ?? '/order/test/' },
    document: { querySelector: selector => selector === 'table.table-orders-list' ? table : options.pagination && selector === '.pagination, .pager' ? element('1 2') : null },
    getComputedStyle: node => ({ display: node.hidden ? 'none' : 'block', visibility: 'visible' }),
  })
  return JSON.parse(JSON.stringify(result))
}

describe('Favorit order purchase collector', () => {
  it('runs in an isolated world and copies unit prices without the total row or warehouse column', () => {
    const result = collect([{ name: 'Part…', fullName: 'Complete product name' }])
    assert.equal(result.ok, true)
    assert.deepEqual(JSON.parse(createPurchaseJson(result)), {
      type: 'purchase', supplier: 'FavoritParts', currency: 'RUB', partial: false,
      products: [{ producer: 'MAN', sku: 'TEST-123', name: 'Complete product name', count: 2, price: 10.5, returnedCount: 0 }],
    })
  })
  it('maps reordered columns by labels instead of reading fixed positions or sort arrows', () => {
    const result = collect([{}], { columns: ['sum', 'name', 'count', 'producer', 'price', 'sku', 'storage'] })
    assert.equal(result.ok, true)
    assert.equal(result.products[0].sku, 'TEST-123')
    assert.equal(result.products[0].price, 10.5)
  })
  it('keeps duplicate positions separate and checks the complete document total', () => {
    const result = collect([{}, { count: '1', price: '5,00', sum: '5,00' }], { total: '26,00' })
    assert.equal(result.products.length, 2)
    assert.deepEqual(result.products.map(row => [row.count, row.price]), [[2, 10.5], [1, 5]])
    assert.equal(collect([{}], { total: '20,99' }).code, 'invoiceInvalid')
    assert.equal(collect([{}], { total: '21,01' }).code, 'invoiceInvalid')
    assert.equal(collect([{}], { noFooter: true }).code, 'invoiceInvalid')
  })
  it('rejects an invalid line instead of copying only the valid subset', () => {
    for (const overrides of [{ producer: '' }, { sku: '' }, { name: '' }, { count: '0' }, { count: '1.5' },
      { price: '-1' }, { price: '1,234' }, { sum: '20,99' }, { count: '2147483648' }, { price: '99999999999999999999' }]) {
      assert.equal(collect([{}, overrides]).code, 'invoiceInvalid', JSON.stringify(overrides))
    }
    assert.equal(collect([{}], { columns: ['producer', 'sku', 'name', 'count', 'sum'] }).code, 'invoiceInvalid')
  })
  it('marks hidden positions and pagination as partial and rejects totals below the collected sum', () => {
    const result = collect([{}, { count: '1', price: '5', sum: '5', hidden: true }], { total: '26,00' })
    assert.equal(result.ok, true)
    assert.equal(result.partial, true)
    assert.equal(result.products.length, 1)
    assert.equal(collect([{}], { pagination: true }).partial, true)
    assert.equal(collect([{}], { pagination: true, total: '20,00' }).code, 'invoiceInvalid')
  })
  it('accepts free positions but rejects empty and oversized documents', () => {
    assert.equal(collect([{ price: '0', sum: '0' }], { total: '0' }).products[0].price, 0)
    assert.equal(collect([]).code, 'empty')
    assert.equal(collect(Array.from({ length: 20001 }, () => ({}))).code, 'limit')
  })
  it('only reads individual orders on the exact HTTPS supplier host', () => {
    for (const options of [{ hostname: 'lk.favorit-parts.ru.example.org' }, { protocol: 'http:' }, { path: '/orders/' }, { path: '/cart/' }]) {
      assert.equal(collect([{}], options).code, 'unsupported')
    }
    assert.equal(collect([{}], { path: '/order/version/react/test/' }).ok, true)
  })
})
