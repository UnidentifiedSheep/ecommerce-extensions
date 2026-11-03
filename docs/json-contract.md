# JSON interchange contract

The extension reads supplier pages and copies JSON; it never connects to the ECommerce API. Consumer: the JSON import dialogs in ECommerceSparePartsFront. Update both repositories when changing this contract.

## Cross-reference groups

```json
{"supplier":"Armtek","products":[{"producer":"MAN","sku":"9048305903","name":"Part"}]}
```

`supplier`: `Armtek`, `Tmtr` or `FavoritParts`. `products`: 1–1000 references with string `producer`, `sku`, `name`. The frontend also accepts legacy input and multiple groups, but the extension exports one modern group. All products in that group, including their existing groups, will be linked during explicit frontend import. Exclude unrelated positions in the frontend preview before writing.

## Purchases

```json
{"type":"purchase","supplier":"Armtek","currency":"RUB","partial":false,"products":[{"producer":"ZEKKERT","sku":"SR1035","name":"Roller","count":1,"price":651,"returnedCount":0}]}
```

`currency`: detected ISO currency code or `null`; `partial`: whether only part of the invoice was collected. `count`: positive integer. `price`: unit price, nonnegative number with at most two fractional digits. `returnedCount`: integer between zero and count, not subtracted automatically. Preserve duplicate lines and their individual prices/quantities; purchase positions are never cross-linked. Missing frontend products may be created with explicit confirmation; the document remains a draft until saved.

Purchase sources: Armtek invoices and the open Truck Motors balance document dialog titled `Отгрузка`. Truck Motors exports `supplier: "Tmtr"`, reads the brand/SKU/name/quantity/unit-price columns and checks each line total. Shipment rows have `returnedCount: 0`; payment and return documents are excluded. Hidden rows and incomplete or unreadable visible pagination set `partial: true`. Detection uses the open document DOM on the exact HTTPS supplier host, so it does not depend on a specific balance-page URL.

Favorit Parts individual orders (`/order/…`) export `supplier: "FavoritParts"`. Table header labels identify producer, SKU, name, quantity, unit price and line total. The collector excludes the `Итого` row and verifies the document total; duplicate positions remain separate and `returnedCount` is zero. Hidden product rows or visible pagination set `partial: true`. Supplier warehouse, order number and account data are excluded.

Unknown currencies, partial invoices and returns require review in the frontend. No account, customer or invoice identifiers are exported. Examples used by standalone tests are in `tests/fixtures/`.
