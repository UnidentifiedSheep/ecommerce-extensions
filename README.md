# ECommerce extensions

Расширения браузера для ECommerce SpareParts. Основной фронт: [ECommerceSparePartsFront](https://github.com/UnidentifiedSheep/ECommerceSparePartsFront).

## Установка

1. [Скачать актуальный ZIP](https://github.com/UnidentifiedSheep/ecommerce-extensions/releases/latest/download/supplier-import-extension.zip) и распаковать в отдельную постоянную папку.
2. Открыть `chrome://extensions` или `edge://extensions`, включить режим разработчика.
3. Нажать «Загрузить распакованное расширение» и выбрать папку с `manifest.json`.
4. На сайте поставщика нажать значок расширения → «Собрать со страницы» → «Копировать JSON».
5. Вставить JSON в импорт групп товаров или закупки SpareParts. Ненужные позиции можно убрать после проверки на фронте.

Для обновления замените файлы в той же папке и нажмите «Обновить» на карточке расширения. Установка и обновления вручную; браузерный магазин не используется.

Поддержаны Armtek, Truck Motors и Favorit Parts; закупки — по фактурам Armtek. Подробнее: [инструкция расширения](extensions/supplier-import/README.md), [JSON-контракт](docs/json-contract.md).

## Разработка

Нужен Node.js 22+. Устанавливать npm-пакеты не требуется.

```sh
npm test
npm run build
npm run check
```

Архив: `dist/supplier-import-extension.zip`. Сборка детерминирована и использует только явно перечисленные файлы, без страниц поставщиков, тестов и локальных данных. Runtime-код перенесён из фронта без изменения поведения; тесты больше не импортируют его TypeScript-модели.

## Релизы

Изменения после первоначального переноса — через PR. Для выпуска новой версии измените `extensions/supplier-import/manifest.json`, проверьте `npm run check` и смержите согласованный PR в `main`. GitHub Actions соберёт и опубликует ZIP и SHA256 в релизе `supplier-import-v<version>`. Workflow можно также запустить вручную. Уже опубликованная версия не перезаписывается: для обновления увеличьте номер версии.

Фронт скачивает ZIP по постоянной ссылке `releases/latest/download/supplier-import-extension.zip`, поэтому новый релиз не требует пересборки фронта.
