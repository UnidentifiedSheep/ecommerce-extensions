/* global chrome */
import { getSupplierAdapter } from './suppliers.js'
import { createGroupJson, createPurchaseJson, maxGroupProducts } from './export.js'
import { messages } from './messages.js'

const element = id => document.getElementById(id)
let locale = navigator.language.slice(0, 2)
try { locale = localStorage.getItem('locale') || locale } catch { /* Browser policy can disable local storage. */ }
if (!Object.hasOwn(messages, locale)) locale = 'ru'
let result, source, snapshot, busy = false, page = 0, status
const pageSize = 50
function t(key, params = {}) { return (messages[locale][key] || key).replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? '')) }
function showStatus(key, params = {}, error = false) { status = { key, params, error }; renderStatus() }
function renderStatus() {
  element('status').hidden = !status
  element('status').textContent = status ? t(status.key, status.params) : ''
  element('status').classList.toggle('error', !!status?.error)
}
function renderControls() {
  document.querySelectorAll('button, select, input').forEach(control => { control.disabled = busy })
  element('copy').disabled = busy || !result?.products.length || result.products.length > maxGroupProducts
  element('previous').disabled = busy || page === 0
  element('next').disabled = busy || !result || (page + 1) * pageSize >= result.products.length
  if (!result) return
  element('summary').textContent = t('summary', { total: result.products.length, duplicates: result.duplicates, max: maxGroupProducts })
  if (result.mode === 'purchase') {
    const total = result.products.reduce((sum, row) => sum + Math.round(row.price * 100) * row.count, 0) / 100
    element('summary').textContent += ` · ${total.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${result.currency ?? ''}`
  }
}
function renderRows() {
  const body = element('products'); body.replaceChildren()
  if (!result) return
  result.products.slice(page * pageSize, (page + 1) * pageSize).forEach(product => {
    const row = document.createElement('tr'), reference = document.createElement('td'), name = document.createElement('td')
    const sku = document.createElement('strong'), producer = document.createElement('small')
    sku.textContent = product.sku; producer.textContent = product.producer; name.textContent = product.name
    reference.append(sku, producer); row.append(reference, name)
    if (result.mode === 'purchase') {
      const count = document.createElement('td'), price = document.createElement('td')
      count.textContent = String(product.count); price.textContent = product.price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      if (product.returnedCount) { const returned = document.createElement('small'); returned.textContent = t('returned', { count: product.returnedCount }); name.append(returned) }
      row.append(count, price)
    }
    body.append(row)
  })
  element('page').textContent = t('page', { page: page + 1, pages: Math.ceil(result.products.length / pageSize) })
}
function render() {
  document.documentElement.lang = locale
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n) })
  element('locale').value = locale; element('locale').setAttribute('aria-label', t('language'))
  element('preview').hidden = !result
  element('export').hidden = !result
  element('intro').hidden = !!result
  if (result) {
    const purchase = result.mode === 'purchase'
    element('group-info').hidden = purchase
    element('count-header').hidden = !purchase; element('price-header').hidden = !purchase
    document.body.classList.toggle('purchase', purchase)
    element('import-hint').textContent = t(purchase ? 'purchaseImportHint' : 'importHint')
    const supplierName = { Tmtr: 'Truck Motors', FavoritParts: 'Favorit Parts', Armtek: 'Armtek' }[result.supplier] ?? result.supplier
    element('preview-heading').textContent = `${t(purchase ? 'purchasePreview' : 'preview')} · ${supplierName}`
    element('loaded').textContent = t(purchase ? result.partial ? 'invoicePartial' : 'purchaseHint' : result.virtualized ? 'virtualized' : result.moreAvailable ? 'loaded' : 'complete')
    element('skipped').hidden = !result.skipped
    element('skipped').textContent = t('skipped', { count: result.skipped })
  }
  renderRows(); renderControls(); renderStatus()
}
async function readPage(expected) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (expected && (tab?.id !== expected.id || tab?.url !== expected.url)) throw new Error('changed')
  const adapter = getSupplierAdapter(tab?.url ?? '')
  if (!adapter || tab.id == null) throw new Error('unsupported')
  const [execution] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: adapter.collect })
  const data = execution?.result
  if (!data?.ok) throw new Error(['unsupported', 'notSearch', 'empty', 'limit', 'invoiceInvalid'].includes(data?.code) ? data.code : 'readFailed')
  if (data.supplier !== adapter.supplier) throw new Error('readFailed')
  return { data, tab: { id: tab.id, url: tab.url } }
}
function readError(cause) { return ['unsupported', 'notSearch', 'empty', 'limit', 'changed', 'invoiceInvalid'].includes(cause?.message) ? cause.message : 'readFailed' }
element('scan').addEventListener('click', async () => {
  if (busy) return
  busy = true; result = undefined; page = 0; showStatus('reading'); render()
  try {
    const read = await readPage()
    result = read.data; source = read.tab; snapshot = JSON.stringify(result)
    status = undefined
    if (result.products.length > maxGroupProducts) showStatus('limit', {}, true)
  } catch (cause) { showStatus(readError(cause), {}, true) }
  finally { busy = false; render() }
})
async function copyJson() {
  if (busy || !result?.products.length || result.products.length > maxGroupProducts) return
  busy = true; showStatus('reading'); renderControls()
  try {
    const current = await readPage(source)
    if (JSON.stringify(current.data) !== snapshot) throw new Error('changed')
  } catch (cause) {
    result = undefined; busy = false; showStatus(readError(cause), {}, true); render(); return
  }
  try {
    const json = result.mode === 'purchase' ? createPurchaseJson(result) : createGroupJson(result)
    await navigator.clipboard.writeText(json)
    showStatus('copied')
  } catch { showStatus('copyFailed', {}, true) }
  finally { busy = false; renderControls() }
}
element('copy').addEventListener('click', () => { void copyJson() })
element('previous').addEventListener('click', () => { if (page > 0) { page--; renderRows(); renderControls() } })
element('next').addEventListener('click', () => { if (result && (page + 1) * pageSize < result.products.length) { page++; renderRows(); renderControls() } })
element('locale').addEventListener('change', event => {
  locale = event.target.value
  try { localStorage.setItem('locale', locale) } catch { /* Keep the current session usable. */ }
  render()
})
render()
