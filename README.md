# ApiCreditBot
Данный бот был создан для того, чтобы в автоматическом режиме перебирать предоставленные ИНН и контактную инфомрацию на предмет наличия продуктов у компании в банке "Альфа-Банк". Если продуктов не имеется, то такие ИНН переносятся в файл **to_accept.txt** для дальнейшей обработки и предложения продуктов. 

Бот работает на **NodeJS v.20+** и имеет в своём арсенале следующие зависимости:
1. **Telegraf** (*основная библиотека на которой работает бот*),
2. **Axios** (*вспомогательная библиотека для работы с загружаемыми файлами*),
3. **FS** (*библиотека для работы с файлами на сервере (копирование, клонирование, удаление*),
4. **dotenv** (*библиотека для конфигурационных файлов .env*),
5. **xlsx** (*библиотека для обработки файлов Microsoft Excel*)

[1.История обновлений](#история-обновлений)

[2.Установка и деплой бота на сервер](#установка-бота)
## История обновлений
### Обновление 0.0.1
- Реализована возможность загрузки файла XLSX со списком ИНН и контактной информации, по которой будет производиться "чек" (поиск) по базе клиентов Альфа-Банка.
- Реализована система вывода информации по каждому запросу по коду продукта банка, которая будет оповещать о том, имеет ли ИНН тот или иной продукт
- Реализована возможность записи ИНН в файл, если он не имеет ни одного продукта в банке
- Реализован интерактивный режим в боте:

> *Загружаете файл, после чего бот просит указать колонку с ИНН (если колонок много и файл не был подготовлен для конкретной задачи), далее бот просит указать колонку с телефонами (необходимо для тела запроса в банк). Далее бот начинает перебор инфомрации и "чек" ИНН из предоставленного файла, затем предоставляет информацию в чат*

### Установка бота:
1. Установить на сервер NodeJS v.20+
2. Клонировать репозиторий
3. Установить зависимости (*npm install*)
4. Создать файл .env и вписать туда строки токенов на API банка и токен телеграмм бота:
> ALFA_API_KEY=ваш_ключ_от_альфа_банка
>
> TELEGRAM_BOT_TOKEN=ваш_токен_бота
6. Запустить бота (*node index.js*)
