# Firefox: постоянная установка без публикации в каталоге

Используется канал Mozilla Add-ons **unlisted**: Mozilla подписывает расширение, но не размещает его в публичном каталоге. Пользователь получает подписанный XPI из GitHub Releases и подтверждает установку в обычном Firefox 142+. Он сохраняется после перезапуска. Загрузка через `about:debugging` остаётся временным способом для разработки.

## Один раз настроить Mozilla

1. Создайте аккаунт разработчика на https://addons.mozilla.org/developers/ и примите условия Mozilla.
2. Откройте https://addons.mozilla.org/developers/addon/api/key/ и создайте API credentials.
3. В [Actions secrets репозитория](https://github.com/UnidentifiedSheep/ecommerce-extensions/settings/secrets/actions) добавьте **Repository secrets**:
   - `AMO_JWT_ISSUER` — JWT issuer (API key).
   - `AMO_JWT_SECRET` — JWT secret (API secret).

Не отправляйте значения в чат, не добавляйте их в файлы или GitHub Variables. Workflow передаёт ключи официальному `web-ext` через окружение, не через аргументы командной строки. Секреты не нужны для тестов и сборки ZIP.

## Выпуск

1. Сохраните постоянный ID `supplier-import@all-vp-n.ru`; его нельзя менять после первой установки.
2. Увеличьте `extensions/supplier-import/manifest.json` version. Проверьте `npm run check` и после `npm ci --ignore-scripts` — `npm run firefox:lint`.
3. После согласованного слияния PR в main workflow передаст исходники в Mozilla через `web-ext sign --channel unlisted`. Код не минифицируется сборщиком; отправляется тот же читаемый исходный код.
4. После получения подписанного файла workflow создаст полный релиз с:
   - `supplier-import-extension.zip` для ручной установки Chrome/Edge;
   - `supplier-import-firefox.xpi` для постоянной установки Firefox;
   - `firefox-updates.json` для автоматических обновлений;
   - `SHA256SUMS.txt`.

Релиз сначала создаётся черновиком и публикуется только после загрузки всех файлов. Без ключей или при незавершённой подписи новый релиз не публикуется: предыдущий остаётся доступен. Mozilla может отправить выпуск на ручную проверку; workflow ждёт до 15 минут. В таком случае проверьте статус в кабинете AMO; наличие ветки/ZIP само по себе не означает получение подписи. Уже опубликованные релизы не переписываются.

## Установка и обновления

После первого успешного подписанного релиза скачайте [supplier-import-firefox.xpi](https://github.com/UnidentifiedSheep/ecommerce-extensions/releases/latest/download/supplier-import-firefox.xpi). Если Firefox не предложил установку при открытии файла: `about:addons` → шестерёнка → «Установить дополнение из файла» → выбрать XPI.

Дальнейшие обновления Firefox проверяет по `update_url` в манифесте. Метаданные указывают на конкретный релиз и SHA256 именно подписанного XPI; после публикации новая версия становится доступна в обычном цикле проверки обновлений Firefox. Пользователь может запустить поиск обновлений вручную в `about:addons`. Пересборка фронта не нужна.

Неподписанный ZIP нельзя просто переименовать в XPI: обычный Firefox его постоянно не установит. До публикации подписанного релиза прежняя инструкция `about:debugging` остаётся единственным подготовленным способом установки.
