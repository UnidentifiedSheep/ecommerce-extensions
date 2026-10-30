/* global chrome */
import { getSupplierAdapter } from './suppliers.js'
import { createGroupJson, createPurchaseJson } from './export.js'
import { messages } from './messages.js'

const button = document.getElementById('copy')
const status = document.getElementById('status')
let locale = navigator.language.slice(0, 2)
try { locale = localStorage.getItem('locale') || locale } catch { /* Keep browser-default language. */ }
if (!Object.hasOwn(messages, locale)) locale = 'ru'
document.documentElement.lang = locale
let busy = false, resetTimer
const errorCodes = ['unsupported', 'notSearch', 'empty', 'limit', 'changed', 'invoiceInvalid', 'copyFailed']
function render(key = 'copy') {
  button.textContent = messages[locale][key]
  button.disabled = busy
  button.setAttribute('aria-busy', String(busy))
}

button.addEventListener('click', async () => {
  if (busy) return
  clearTimeout(resetTimer)
  busy = true
  status.hidden = true
  render('reading')
  let label = 'copy'
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const adapter = getSupplierAdapter(tab?.url ?? '')
    if (!adapter || tab.id == null) throw new Error('unsupported')
    const [execution] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: adapter.collect })
    const data = execution?.result
    if (!data?.ok) throw new Error(errorCodes.includes(data?.code) ? data.code : 'readFailed')
    if (data.supplier !== adapter.supplier) throw new Error('readFailed')
    const json = data.mode === 'purchase' ? createPurchaseJson(data) : createGroupJson(data)
    const [current] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (current?.id !== tab.id || current?.url !== tab.url) throw new Error('changed')
    try { await navigator.clipboard.writeText(json) } catch { throw new Error('copyFailed') }
    label = 'copied'
    resetTimer = setTimeout(() => render(), 1800)
  } catch (cause) {
    const key = errorCodes.includes(cause?.message) ? cause.message : 'readFailed'
    status.textContent = messages[locale][key]
    status.hidden = false
  } finally {
    busy = false
    render(label)
  }
})
render()
