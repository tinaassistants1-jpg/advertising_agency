# Парсер Telegram-аккаунтов из групп и каналов

CLI-инструмент на Telethon (MTProto): собирает аккаунты из чатов, групп и каналов
в SQLite с дедупликацией и выгружает в CSV / XLSX / JSON / JSONL / TXT.

---

## Что Telegram реально отдаёт

Это главное ограничение, от которого зависит выбор режима. Обойти его нельзя —
ни этим инструментом, ни любым другим.

| Источник | Список аккаунтов | Как забирать |
|---|---|---|
| Группа / супергруппа, где вы состоите | да, до ~10 000 за проход | `--mode members` (+ `--deep` сверх лимита) |
| Канал (broadcast), вы **не** админ | **нет**, подписчики закрыты | `--mode comments / messages / reactions` |
| Канал, вы админ | да | `--mode members` |
| Приватный чат по инвайт-ссылке | только после вступления аккаунтом | сначала вступить, затем `@username` или id |

Телефон виден только у контактов и у тех, кто открыл его настройками приватности.
Точное «был(а) в сети» — тоже по настройкам приватности; иначе доступны лишь
категории `online / recently / last_week / last_month / long_ago`.

## Режимы сбора

| Режим | Что собирает |
|---|---|
| `members` | участников группы/супергруппы |
| `admins` | администраторов и владельца |
| `messages` | авторов сообщений в истории (+ счётчик сообщений) |
| `comments` | комментаторов канала — из связанного чата обсуждений |
| `reactions` | тех, кто ставил реакции на посты |
| `all` | все режимы подряд; недоступные пропускаются с предупреждением |

---

## Установка

```bash
cd telegram-parser
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Ключи API — на https://my.telegram.org → **API development tools**:

```bash
cp .env.example .env      # вписать TG_API_ID и TG_API_HASH
python -m tg_parser login # код придёт в Telegram, сессия сохранится в *.session
```

Файл `*.session` = полный доступ к аккаунту. Он в `.gitignore` — не коммитить,
не пересылать.

---

## Использование

```bash
# участники группы -> CSV
python -m tg_parser parse @my_chat --mode members --out exports/chat.csv

# крупная группа: обход лимита ~10 000 перебором поисковых префиксов (дольше)
python -m tg_parser parse @big_chat --mode members --deep

# канал: подписчики закрыты — берём комментаторов и реакции за 30 дней
python -m tg_parser parse @some_channel --mode comments,reactions --since 30d

# активные авторы: последние 5000 сообщений, минимум 3 сообщения от человека
python -m tg_parser parse @my_chat --mode messages --limit 5000 --min-messages 3

# несколько целей за раз, все доступные режимы
python -m tg_parser parse @chat1 @chat2 -1001234567890 --mode all

# выгрузка накопленной базы с фильтрами
python -m tg_parser export --out exports/leads.xlsx --only-username --last-seen last_week
python -m tg_parser export --out exports/usernames.txt   # только @username, по строке

python -m tg_parser stats   # что уже в базе
python -m tg_parser reset   # очистить базу (спросит подтверждение)
```

Цель задаётся как `@username`, `https://t.me/username`, `t.me/username/123`
или числовой id (`-1001234567890`).

### Ключевые опции

| Опция | Смысл |
|---|---|
| `--mode` | режимы через запятую или `all` |
| `--limit` | участников / просматриваемых сообщений |
| `--since` | не глубже даты: `2026-01-31`, `30d`, `12h`, `4w` |
| `--deep` | обход лимита ~10 000 участников |
| `--out`, `--format` | файл и формат выгрузки (`csv/json/jsonl/xlsx/txt`) |
| `--db` | другой файл базы (по умолчанию `data/accounts.db`) |

### Фильтры

`--include-bots` · `--include-deleted` · `--skip-scam` · `--only-username` ·
`--only-phone` · `--only-premium` · `--last-seen {online,offline,recently,last_week,last_month}` ·
`--name-match РЕГУЛЯРКА` · `--min-messages N`

Боты и удалённые аккаунты отбрасываются по умолчанию.

---

## Как устроено

```
tg_parser/
  cli.py            команды: login / parse / export / stats / reset
  client.py         Telethon-клиент, авторизация, прокси
  config.py         настройки из .env
  models.py         UserRecord — единая модель аккаунта
  storage.py        SQLite: users + sightings, дедупликация
  filters.py        отбор аккаунтов
  exporters.py      csv / json / jsonl / xlsx / txt
  utils.py          журнал действий, троттлинг, FloodWait, разбор ссылок
  collectors/       members · admins · messages · comments · reactions
tests/              42 теста, без обращений к сети
```

**Дедупликация.** `users` — одна строка на аккаунт, `sightings` — где и каким
методом он встретился. Один человек в трёх чатах = одна строка в выгрузке со
списком источников. Повторный запуск обновляет профиль и не плодит дублей;
уже известные `username`/`phone` не затираются пустыми значениями.

**Лимиты Telegram.** Между тяжёлыми запросами выдерживается пауза
(`TG_REQUEST_DELAY`, по умолчанию 0.7 с). `FloodWaitError` короче
`TG_FLOOD_SLEEP_THRESHOLD` Telethon пережидает сам, длинный — обрабатывается
повтором сбора (`TG_MAX_RETRIES`); собранное уже лежит в базе, поэтому повтор
безопасен. Если ловите FloodWait часто — увеличьте `TG_REQUEST_DELAY`.

**Журнал действий.** Каждое действие пишется в `logs/tg_parser.log` в формате
`action=… target=… result=…`. Разрушительные операции (`reset`, перезапись
существующего файла выгрузки) требуют подтверждения; без TTY они отменяются.

## Тесты

```bash
python -m unittest discover -s tests -t .
```

Сеть не нужна: сборщики проверяются на фейковом клиенте.

---

## Ответственность

Инструмент собирает **персональные данные**. Прежде чем использовать:

* публичность чата не отменяет ни GDPR, ни 152-ФЗ — для обработки нужно
  законное основание, а у людей есть право на удаление;
* массовая рассылка собранным контактам нарушает [Terms of Service Telegram](https://telegram.org/tos)
  и ведёт к блокировке аккаунта; парсинг с основного аккаунта рискован;
* собирайте минимум необходимого, храните ограниченное время, не публикуйте
  выгрузки — в них живые люди.

Штатное применение: аналитика собственного сообщества, модерация, перенос
своей аудитории, исследования с законным основанием.
