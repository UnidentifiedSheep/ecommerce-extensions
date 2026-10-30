# SpareParts: supplier import

Version 0.4.1. Chrome / Edge (Manifest V3). One extension, separate adapters per supplier and page type.

| Supplier | Supported pages | JSON supplier |
| --- | --- | --- |
| Armtek | https://etp.armtek.ru search results | Armtek |
| Armtek purchase | https://etp.armtek.ru/invoice/… | Armtek |
| Truck Motors | https://market.tmtr.ru/goods/… | Tmtr |
| Favorit Parts | https://lk.favorit-parts.ru/analogues/… | FavoritParts |

## Установка и использование

1. В SpareParts откройте Контроль → Расширения. Скачайте ZIP и распакуйте в отдельную папку.
2. Откройте chrome://extensions (Chrome) или edge://extensions (Edge).
3. Включите режим разработчика, нажмите «Загрузить распакованное расширение» и выберите папку с manifest.json.
4. Откройте поддерживаемую страницу поставщика, нажмите значок расширения → «Собрать со страницы».
5. Проверьте поставщика и собранные строки. Нажмите «Копировать JSON» — копируется весь собранный список. Выбор позиций и скачивание JSON в расширении отсутствуют.
6. Для групп: Товары → ⋯ → Импорт групп из JSON. Для закупок: окно создания закупки → выберите валюту и склад → ⋯ → Импорт закупки из JSON. Вставьте данные и проверьте их перед записью.

Расширение читает только строки, присутствующие в DOM страницы. На Armtek сначала загрузите нужные результаты кнопкой «Показать ещё» и повторите сбор. На Truck Motors аналоги находятся в виртуальном списке: прокрутка может менять набор присутствующих строк, сбор не гарантирует все аналоги. Проверьте состав в предпросмотре. Автоматической прокрутки и накопления строк между сборами нет.

В группах кроссов повторы предложений одного артикула и производителя удаляются. До 1000 собранных товаров копируются одной группой. Ненужные строки можно убрать после резолва в предпросмотре импорта SpareParts; повторная проверка их не возвращает. При импорте полные кроссы объединят также существующие группы. Производитель создаётся через «+» в селекторе без дополнительного диалога.

Фактуры Armtek распознаются как закупка автоматически. Количество и цена за единицу переносятся из одноимённых колонок, повторные позиции сохраняются раздельно. Проверяется сумма каждой строки. Возвраты не вычитаются; returnedCount хранится отдельно. Частичная фактура или выбор части строк отмечаются partial. Фронт сверяет валюту и требует проверки при возвратах, неполных данных или неизвестной валюте. Предпросмотр резолвит товары; недостающие можно создать отдельной явно подписанной кнопкой с учётом прав. Созданные товары сохраняются сразу, кроссы не создаются. Позиции добавляются в черновик закупки, сама закупка сохраняется обычной кнопкой. Другие страницы закупок пока не поддерживаются.

Для обновления замените файлы в той же папке и нажмите «Обновить» на карточке расширения.

## Installation and use

In SpareParts, open Control → Extensions, download and extract the ZIP. In chrome://extensions or edge://extensions, enable Developer mode and Load unpacked. Select the folder containing manifest.json. Collect and review data, then copy the full list as JSON. The extension has no product selection or JSON download. Remove unwanted positions in the SpareParts import preview; rechecking preserves exclusions. Create a producer directly with + in its selector, without an extra dialog. For groups use Products → ⋯ → Import groups from JSON. For purchases open the create-purchase dialog, select currency and warehouse, then ⋯ → Import purchase from JSON. Replace files in the same folder and reload the extension to update.

Only rows currently in the DOM are collected. On Armtek, load more results before collecting. Truck Motors uses a virtual list; scrolling may replace rows. There is no automatic scrolling or accumulation. For groups, duplicate offers are removed and up to 1000 products form one full cross-reference group. Armtek invoices are exported as purchases: unit prices, quantities and repeated positions are preserved, each line total is verified. Returns are kept separately without changing quantities; partial data is marked. Review currency, returns and completeness in the frontend. Missing products can be created with an explicit button and appropriate permissions; they persist immediately without cross links. Positions are appended to a draft; purchase saving is separate. Other purchase pages are not supported yet.

## Kurulum ve kullanım

SpareParts üzerinde Kontrol → Eklentiler sayfasından ZIP'i indirip çıkarın. chrome://extensions veya edge://extensions üzerinde Geliştirici modunu açın ve manifest.json içeren klasörü Paketlenmemiş öğe yükle ile seçin. Verileri toplayıp kontrol edin, tüm listeyi JSON olarak kopyalayın. Eklentide ürün seçimi veya JSON indirme yoktur. Gereksiz kalemleri SpareParts içe aktarma önizlemesinde çıkarın; tekrar kontrol bunları geri getirmez. Üreticiyi seçicide + ile ek diyalog olmadan oluşturun. Gruplar için Ürünler → ⋯ → JSON'dan grup içe aktar; satın alma için oluşturma penceresinde para birimi ve depo seçip ⋯ → JSON'dan satın alma içe aktar kullanın. Güncellemek için dosyaları değiştirip eklentiyi yeniden yükleyin.

Yalnızca DOM'daki satırlar toplanır. Armtek üzerinde önce gereken sonuçları yükleyin. Truck Motors sanal liste kullanır; kaydırma satırları değiştirebilir. Otomatik kaydırma veya biriktirme yoktur. Gruplarda tekrarlar çıkarılır ve en fazla 1000 ürün kros grubu oluşturur. Armtek faturaları satın alma olarak tanınır: birim fiyat, miktar ve tekrarlanan kalemler korunur; satır toplamı kontrol edilir. İadeler miktardan çıkarılmaz, eksik veri işaretlenir. Para birimi, iadeler ve eksiksizliği kontrol edin. Eksik ürünler açıkça etiketli düğmeyle yetkilere göre oluşturulabilir; hemen kaydedilir, kros bağlanmaz. Kalemler taslağa eklenir, satın alma ayrıca kaydedilir. Diğer satın alma sayfaları henüz desteklenmez.

## Access and adding suppliers

No backend connection, tokens, cookies, remote scripts or background collection in the extension. Reading happens after clicking Collect from page, using activeTab and scripting. Clipboard access is used by Copy JSON. Exact HTTPS hosts and paths select self-contained isolated-world collectors. Exports contain product references and names; purchase exports additionally contain quantities, unit prices, currency, returns and partial-data status. No account or customer details are exported. Add an adapter and registry entry, update instructions/translations, bump the manifest version and include the adapter in the archive builder.
