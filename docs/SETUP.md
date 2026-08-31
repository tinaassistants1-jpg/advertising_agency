# Установка и запуск

## 1. Ключ Claude

1. Зайти на [console.anthropic.com](https://console.anthropic.com) → **Settings → API keys** → **Create key**.
2. Скопировать ключ (`sk-ant-...`) — он показывается один раз.
3. Пополнить баланс: **Settings → Billing**. Без баланса запросы будут отклоняться.

## 2. Telegram-бот

1. Написать [@BotFather](https://t.me/BotFather) → `/newbot`.
2. Задать имя (видно людям) и username (обязан заканчиваться на `bot`, например `maison_riich_bot`).
3. Скопировать токен вида `1234567890:AA...`.

**Обязательно для групп** — иначе бот увидит только команды, но не обычные сообщения:

```
/setprivacy → выбрать бота → Disable
```

Полезные настройки там же: `/setdescription`, `/setabouttext`, `/setuserpic`.

## 3. Токен GitHub для памяти Дома

Без него ассистент память только читает. Чтобы он мог записывать журнал, идеи, каноны и задачи:

1. [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new) — **fine-grained token**.
2. **Repository access** → Only select repositories → `AI-Creative-OS`.
3. **Permissions** → Repository permissions → **Contents: Read and write**.
4. Срок — год, дальше перевыпустить.

Больше прав давать не нужно: ассистенту хватает записи в файлы одного репозитория.

## 4. Свой Telegram ID

Написать [@userinfobot](https://t.me/userinfobot) — он ответит числом. Это значение идёт в `ADMIN_IDS`: только эти пользователи смогут менять персону чата и включать режим комьюнити.

Если `ADMIN_IDS` оставить пустым, настройки сможет менять кто угодно в чате. Для групп это лучше заполнить.

## 5. Конфигурация

```bash
cp .env.example .env
```

Минимум для старта — `ANTHROPIC_API_KEY` и `TELEGRAM_BOT_TOKEN`. Остальное имеет разумные значения по умолчанию.

## 6. Запуск

**Локально:**

```bash
npm install
npm run build
npm start
```

**Docker (рекомендуется для сервера):**

```bash
docker compose up -d
docker compose logs -f     # смотреть логи
```

База (история чатов и напоминания) лежит в томе `assistant-data` и переживает пересборку контейнера.

**На сервере без Docker** — через systemd:

```ini
# /etc/systemd/system/maison-assistant.service
[Unit]
Description=Maison Tina Riich assistant
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/advertising_agency
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
User=assistant

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now maison-assistant
sudo journalctl -u maison-assistant -f
```

Ассистент работает через long polling — публичный IP, домен и сертификат не нужны. Хватит любой VPS.

## 7. Подключение группы

1. Добавить бота в группу.
2. Дать права администратора (иначе в некоторых группах он не увидит сообщения).
3. Отправить `/status` — убедиться, что персона `Арина`, а режим комьюнити включён.
4. При необходимости: `/community off`, чтобы Арина писала только по обращению.

## Проверка, что всё работает

| Что делаем | Что должно произойти |
|---|---|
| Написать боту в личку «привет» | Отвечает Рич |
| `/status` в личке | Показывает персону, модель, статус памяти |
| Прислать в личку картинку | Разбор по канонам Дома |
| «Напомни через 5 минут проверить бота» | Подтверждение, затем через 5 минут — напоминание |
| «Запиши в журнал: настроили ассистента» | Коммит в `journal.md` со ссылкой |
| В группе: «Арина, привет» | Отвечает Арина |
| В группе просто «привет» | Молчит (это правильно) |

## Что может пойти не так

**Бот молчит в группе.** Не выключен privacy mode у BotFather (`/setprivacy` → Disable) — бот просто не получает обычные сообщения. Переподключить бота к группе после смены настройки.

**«Запись в память выключена».** Не задан `GITHUB_TOKEN`, либо у токена нет права **Contents: Read and write**, либо он не выдан на репозиторий из `MEMORY_REPO`.

**Ошибка конфигурации при старте.** Процесс печатает, какой именно переменной не хватает, и завершается — смотреть первые строки лога.

**Напоминание не пришло.** Проверить `TIMEZONE`: время считается в этом поясе. Разовые напоминания проверяются раз в минуту, так что возможна задержка до минуты.

**429 или ошибка баланса от Claude.** Пополнить баланс в консоли Anthropic либо снизить `CLAUDE_EFFORT` до `low`.
