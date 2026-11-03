import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import { collectTmtrPage } from '../extensions/supplier-import/adapters/tmtr.js'
import { createPurchaseJson, createGroupJson } from '../extensions/supplier-import/export.js'

function element(textContent = '', options = {}) {
  return { textContent, hidden: false, classList: { contains: () => false }, getClientRects() { return this.hidden ? [] : [{}] }, ...options }
}
function row(overrides = {}) {
  const values = { producer: 'MAN', article: 'TEST-123', nomenclature: 'Synthetic part', number: '3', price: '1\u00a0880,38\u00a0₽', amount: '5\u00a0641,14\u00a0₽', ...overrides }
  return element('', { querySelector: selector => values[selector.replace('.mat-column-', '')] == null ? null : element(values[selector.replace('.mat-column-', '')]) })
}
function collect(rows, options = {}) {
  const table = element('', {
    querySelector: selector => selector === `thead .mat-column-${options.missingColumn}` ? null : element('Column'),
    querySelectorAll: selector => selector === 'tbody tr' ? rows : [],
  })
  const invoice = element('', { querySelector: selector => selector === 'h1' ? element(options.title ?? 'Детали документа / Отгрузка TEST')
    : selector === 'table.table_delivery_product' ? table : selector === 'mat-paginator' && options.range != null ? element('', { querySelector: () => element(options.range) }) : null })
  const selectors = []
  const result = runInNewContext(`(${collectTmtrPage.toString()})()`, {
    location: { hostname: options.hostname ?? 'market.tmtr.ru', protocol: options.protocol ?? 'https:', pathname: options.path ?? '/orders/balance' },
    document: { querySelector: selector => { selectors.push(selector); return selector === '#orders_balance_detail_dialog' ? invoice : null } },
    getComputedStyle: node => ({ display: node.hidden ? 'none' : 'block', visibility: 'visible' }),
  })
  return { result: JSON.parse(JSON.stringify(result)), selectors }
}

describe('TMTR shipment purchase collector', () => {
  it('runs without module closures and exports purchase JSON rather than a cross group', () => {
    const { result, selectors } = collect([row()])
    assert.equal(result.ok, true)
    assert.deepEqual(JSON.parse(createPurchaseJson(result)), {
      type: 'purchase', supplier: 'Tmtr', currency: 'RUB', partial: false,
      products: [{ producer: 'MAN', sku: 'TEST-123', name: 'Synthetic part', count: 3, price: 1880.38, returnedCount: 0 }],
    })
    assert.deepEqual(selectors, ['#orders_balance_detail_dialog'])
    assert.throws(() => createGroupJson(result), /wrongMode/)
  })
  it('preserves duplicate lines with individual quantities and prices', () => {
    const result = collect([row(), row({ number: '1', price: '2 000,00 ₽', amount: '2 000,00 ₽' })]).result
    const products = JSON.parse(createPurchaseJson(result)).products
    assert.equal(products.length, 2)
    assert.deepEqual(products.map(product => [product.count, product.price]), [[3, 1880.38], [1, 2000]])
  })
  it('keeps unknown currency explicit and accepts a zero unit price', () => {
    const result = collect([row({ price: '0', amount: '0' })]).result
    assert.equal(result.ok, true)
    assert.equal(result.currency, null)
    assert.equal(result.products[0].price, 0)
  })
  it('detects ISO and symbol currencies without exporting currency text as price', () => {
    for (const [marker, currency] of [['₽', 'RUB'], ['руб.', 'RUB'], ['USD', 'USD'], ['€', 'EUR'], ['₺', 'TRY']]) {
      const result = collect([row({ number: '1', price: `10.50 ${marker}`, amount: `10,50 ${marker}` })]).result
      assert.equal(result.currency, currency)
      assert.equal(result.products[0].price, 10.5)
    }
  })
  it('rejects an incomplete or inconsistent shipment without copying a subset of valid lines', () => {
    for (const override of [
      { article: '' }, { producer: '' }, { nomenclature: '' }, { number: '0' }, { number: '-1' }, { number: '1,5' },
      { number: '2147483648' }, { price: '-10 ₽' }, { price: '10,123 ₽' }, { amount: '0 ₽' },
      { price: '999999999999999999 ₽' }, { amount: '5641,14 USD' },
    ]) assert.equal(collect([row(), row(override)]).result.code, 'invoiceInvalid', JSON.stringify(override))
    assert.equal(collect([row()], { missingColumn: 'price' }).result.code, 'invoiceInvalid')
  })
  it('marks hidden rows and incomplete or unknown pagination as partial', () => {
    const hidden = row(); hidden.hidden = true
    assert.equal(collect([row(), hidden]).result.partial, true)
    for (const range of ['1 – 1 из 10', '2 – 2 of 10', 'Loading…']) assert.equal(collect([row()], { range }).result.partial, true)
    assert.equal(collect([row()], { range: '1 – 1 из 1' }).result.partial, false)
  })
  it('does not treat payment or return documents as purchases or fall back to background products', () => {
    for (const title of ['Детали документа / Оплата TEST', 'Детали документа / Возврат TEST']) {
      const { result, selectors } = collect([row()], { title, path: '/goods/TEST' })
      assert.equal(result.code, 'notSearch')
      assert.deepEqual(selectors, ['#orders_balance_detail_dialog'])
    }
    assert.equal(collect([]).result.code, 'empty')
    assert.equal(collect(Array.from({ length: 20001 }, () => row())).result.code, 'limit')
  })
  it('requires the exact HTTPS host even when a matching dialog is present', () => {
    assert.equal(collect([row()], { protocol: 'http:' }).result.code, 'unsupported')
    assert.equal(collect([row()], { hostname: 'market.tmtr.ru.example.org' }).result.code, 'unsupported')
  })
  it('keeps collecting cross groups on product pages and refuses unrelated pages without a shipment dialog', () => {
    const productRow = element('', { closest: () => null, querySelector: selector => ({
      '.brand-article-cell': element(), '.brand-article-cell .brand': element('MAN'),
      '.brand-article-cell .article': element('TEST-123'), ':scope > .name': element('Synthetic part'),
    })[selector] ?? null })
    const table = element('', { querySelectorAll: () => [productRow], querySelector: () => null })
    const context = {
      location: { hostname: 'market.tmtr.ru', protocol: 'https:', pathname: '/goods/TEST' },
      document: { querySelector: selector => selector === '#goods_table' ? table : null },
      getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    }
    const result = JSON.parse(JSON.stringify(runInNewContext(`(${collectTmtrPage.toString()})()`, context)))
    assert.equal(JSON.parse(createGroupJson(result)).products.length, 1)
    context.location.pathname = '/cart'
    assert.equal(runInNewContext(`(${collectTmtrPage.toString()})()`, context).code, 'unsupported')
  })
})
