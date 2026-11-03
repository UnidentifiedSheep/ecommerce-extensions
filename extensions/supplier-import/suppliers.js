import { collectArmtekPage } from './adapters/armtek.js'
import { collectArmtekInvoice } from './adapters/armtek-invoice.js'
import { collectTmtrPage } from './adapters/tmtr.js'
import { collectFavoritPage } from './adapters/favorit.js'

export const supplierAdapters = [
  { host: 'etp.armtek.ru', supplier: 'Armtek', collect: collectArmtekInvoice, supports: path => /^\/invoice(?:\/|$)/.test(path) },
  { host: 'etp.armtek.ru', supplier: 'Armtek', collect: collectArmtekPage, supports: () => true },
  // Shipment details are a dialog; the collector verifies its DOM rather than assuming a URL.
  { host: 'market.tmtr.ru', supplier: 'Tmtr', collect: collectTmtrPage, supports: () => true },
  { host: 'lk.favorit-parts.ru', supplier: 'FavoritParts', collect: collectFavoritPage, supports: path => /^\/(?:analogues|order)(?:\/|$)/.test(path) },
]
export function getSupplierAdapter(address) {
  let url
  try { url = new URL(address) } catch { return undefined }
  if (url.protocol !== 'https:') return undefined
  return supplierAdapters.find(adapter => url.hostname === adapter.host && adapter.supports(url.pathname))
}
