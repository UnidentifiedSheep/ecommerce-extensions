import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createGroupJson, createPurchaseJson, maxGroupProducts } from '../extensions/supplier-import/export.js'
import { getSupplierAdapter } from '../extensions/supplier-import/suppliers.js'
import { messages } from '../extensions/supplier-import/messages.js'

const fixture = async name => JSON.parse(await readFile(new URL(`fixtures/${name}.json`, import.meta.url)))

describe('supplier JSON contract', () => {
  it('exports the documented group without supplier-page fields', async () => {
    const expected = await fixture('group')
    const result = JSON.parse(createGroupJson({ supplier: expected.supplier, products: expected.products.map((row, i) => ({ ...row, key: String(i), sections: ['results'], internal: 'not exported' })) }))
    assert.deepEqual(result, expected)
  })
  it('preserves duplicate invoice positions, unit prices and returns', async () => {
    const expected = await fixture('purchase')
    const input = { ...expected, mode: 'purchase', products: expected.products.map((row, i) => ({ ...row, key: String(i) })) }
    assert.deepEqual(JSON.parse(createPurchaseJson(input)), expected)
    assert.throws(() => createGroupJson(input), /wrongMode/)
    assert.equal(JSON.parse(createPurchaseJson(input, new Set(['0']))).partial, true)
  })
  it('copies the full list by default, across preview pages', () => {
    const products = Array.from({ length: 55 }, (_, i) => ({ key: String(i), producer: 'MAN', sku: `SKU${i}`, name: 'Part' }))
    assert.equal(JSON.parse(createGroupJson({ supplier: 'Armtek', products })).products.length, 55)
  })
  it('round-trips quotes, backslashes and HTML as text', () => {
    const row = { key: '1', producer: 'MAN', sku: 'ABC', name: 'Fitting \\ "<img src=x>"' }
    assert.equal(JSON.parse(createGroupJson({ supplier: 'Armtek', products: [row] })).products[0].name, row.name)
  })
  it('enforces nonempty input and the 1000-position limit', () => {
    assert.throws(() => createGroupJson({ supplier: 'Armtek', products: [] }), /selection/)
    const products = Array.from({ length: maxGroupProducts + 1 }, (_, i) => ({ key: String(i), producer: 'MAN', sku: `SKU${i}`, name: 'Part' }))
    assert.throws(() => createGroupJson({ supplier: 'Armtek', products }), /limit/)
    assert.equal(JSON.parse(createGroupJson({ supplier: 'Armtek', products: products.slice(0, maxGroupProducts) })).products.length, 1000)
  })
  it('rejects invalid invoice quantities and unsafe totals', () => {
    const input = { supplier: 'Armtek', mode: 'purchase', products: [{ key: '1', count: 0, price: 1 }] }
    assert.throws(() => createPurchaseJson(input), /invoiceInvalid/)
    input.products[0] = { key: '1', count: 1000000000, price: Number.MAX_SAFE_INTEGER }
    assert.throws(() => createPurchaseJson(input), /invoiceInvalid/)
  })
  it('selects adapters by exact HTTPS host and path', () => {
    for (const [url, supplier] of [
      ['https://etp.armtek.ru/search/123', 'Armtek'],
      ['https://market.tmtr.ru/goods/A152', 'Tmtr'],
      ['https://lk.favorit-parts.ru/analogues/123', 'FavoritParts'],
    ]) assert.equal(getSupplierAdapter(url)?.supplier, supplier)
    assert.equal(getSupplierAdapter('https://etp.armtek.ru/invoice/index/1/2')?.collect.name, 'collectArmtekInvoice')
    assert.equal(getSupplierAdapter('https://market.tmtr.ru/orders/balance')?.collect.name, 'collectTmtrPage')
    for (const url of ['invalid', 'http://etp.armtek.ru/search', 'https://etp.armtek.ru.example.org/search', 'https://market.tmtr.ru.example.org/orders/balance', 'https://lk.favorit-parts.ru/search/']) assert.equal(getSupplierAdapter(url), undefined)
  })
  it('keeps permissions minimal and translations aligned', async () => {
    const manifest = JSON.parse(await readFile(new URL('../extensions/supplier-import/manifest.json', import.meta.url)))
    assert.deepEqual(manifest.permissions, ['activeTab', 'scripting', 'clipboardWrite'])
    for (const key of ['host_permissions', 'content_scripts', 'background']) assert.equal(manifest[key], undefined)
    for (const language of ['en', 'tr']) assert.deepEqual(Object.keys(messages[language]).sort(), Object.keys(messages.ru).sort())
  })
})
