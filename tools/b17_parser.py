#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер каталога психологов b17.ru для агентства Nova Leads.

ЧТО ДЕЛАЕТ:
  1. По списку страниц-каталогов (город/специализация) собирает ссылки
     на профили психологов.
  2. Заходит в каждый профиль и вытаскивает: имя, город, подход/
     специализацию, стаж, цены, ОТКРЫТЫЕ контакты (email/телефон/
     соцсети, если специалист сам их опубликовал), текст «о себе».
  3. Пишет всё в CSV (открывается в Excel/Google Sheets).

ПОЧЕМУ ТАК НАПИСАНО:
  Контакты, цены и стаж ищутся по УНИВЕРСАЛЬНЫМ шаблонам (регулярки),
  а не по классам вёрстки — поэтому скрипт не сломается, если b17
  поменяет дизайн. Имя/город берутся из заголовков и meta-тегов.
  Каждый профиль сохраняется отдельно: если один сломался — остальные
  собираются дальше.

ВАЖНО (этика и закон):
  - Берём ТОЛЬКО то, что специалист опубликовал сам в открытом профиле.
  - Пауза между запросами (DELAY) — обязательна, не убирай: это и
    вежливо к сайту, и защищает от блокировки.
  - Собранные контакты — для ТОЧЕЧНОЙ деловой переписки/опроса по
    одному, НЕ для массовой рассылки (152-ФЗ/GDPR). См. лист «Правила»
    в docs/clients/platforms-db.xlsx.
"""

import csv
import os
import re
import sys
import time
import random

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Нужны библиотеки. Установи одной командой:")
    print("    pip install requests beautifulsoup4 lxml")
    sys.exit(1)

# ================== НАСТРОЙКИ (правь этот блок) ==================

# Страницы-каталоги, с которых собираем профили.
# Открой b17.ru, выбери город/фильтр, скопируй адрес из строки браузера.
# Можно несколько. Примеры (проверь, что открываются в браузере):
START_URLS = [
    "https://www.b17.ru/psiholog/limassol/",   # пример: Лимассол
    # "https://www.b17.ru/psiholog/tel-aviv/",
    # "https://www.b17.ru/psiholog/",           # все — очень много
]

# Сколько страниц каталога пролистать на каждый START_URL
# (у b17 пагинация ?page=2, ?page=3 …). Начни с 2–3 для теста.
MAX_LISTING_PAGES = 3

# Максимум профилей всего (защита от «собрал пол-интернета»). 0 = без лимита.
MAX_PROFILES = 60

# Пауза между запросами в секундах (случайная в этом диапазоне).
# НЕ СТАВЬ МЕНЬШЕ 2 — иначе бан. 3–6 — безопасно.
DELAY_MIN, DELAY_MAX = 3, 6

# Файл результата (откроется в Excel; utf-8-sig — чтобы кириллица не билась).
OUTPUT_CSV = "b17_results.csv"

# Ключевые слова подходов — по ним размечаем специализацию из текста.
APPROACHES = [
    "гештальт", "психоанализ", "когнитивно-поведенч", "кпт", "кбт",
    "экзистенциальн", "психодрам", "телесн", "схема-терап", "эмдр", "emdr",
    "системн", "семейн", "арт-терап", "юнгианск", "клиент-центр",
]

# ================== КОД (ниже можно не трогать) ==================

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/126.0 Safari/537.36"),
    "Accept-Language": "ru,en;q=0.9",
}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
# Телефоны в международном/российском формате
PHONE_RE = re.compile(r"(?:\+?\d[\d\-\s()]{8,}\d)")
# Цены: 2000 ₽, 3 000 руб, 50 €, от 60 евро, $80
PRICE_RE = re.compile(
    r"(?:от\s*)?\d[\d\s]{1,7}\s*(?:₽|руб|р\.|€|евро|\$|USD|у\.?е\.?)",
    re.IGNORECASE,
)
STAZH_RE = re.compile(r"стаж[^\.\n]{0,40}?(\d{1,2})\s*(?:год|лет|года)", re.IGNORECASE)

session = requests.Session()
session.headers.update(HEADERS)


def fetch(url):
    """Скачать страницу, вернуть текст HTML или None."""
    try:
        r = session.get(url, timeout=30)
        if r.status_code == 200:
            r.encoding = r.apparent_encoding or "utf-8"
            return r.text
        print(f"  [!] {url} → код {r.status_code}")
    except Exception as e:
        print(f"  [!] ошибка загрузки {url}: {e}")
    return None


def sleep_polite():
    time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))


def collect_profile_links(listing_html, base="https://www.b17.ru"):
    """Из страницы-каталога вытащить ссылки на профили специалистов."""
    soup = BeautifulSoup(listing_html, "html.parser")
    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # профили b17 обычно вида /id123456/ или /имя-слаг/ внутри карточки
        if re.match(r"^/([a-zA-Z0-9_\-]+|id\d+)/?$", href):
            # отсекаем служебные разделы
            if href.strip("/").split("/")[0] in {
                "psiholog", "forum", "blog", "trainings", "consult",
                "article", "reklama", "about", "help", "login", "tags",
                "cabinet", "search", "moscow", "spb",
            }:
                continue
            links.add(base + href)
    return links


def next_listing_page(url, page):
    """Сформировать URL следующей страницы каталога."""
    if "?" in url:
        base = url.split("?")[0]
    else:
        base = url
    return f"{base}?page={page}"


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def parse_profile(html, url):
    """Достать поля из страницы профиля."""
    soup = BeautifulSoup(html, "html.parser")
    full_text = soup.get_text("\n")

    # Имя: из <title> или <h1> или og:title
    name = ""
    if soup.title and soup.title.string:
        name = clean(soup.title.string.split("|")[0].split("—")[0])
    h1 = soup.find("h1")
    if h1 and clean(h1.get_text()):
        name = clean(h1.get_text())
    og = soup.find("meta", property="og:title")
    if not name and og and og.get("content"):
        name = clean(og["content"])

    # Город: ищем по метке или в тексте
    city = ""
    m = re.search(r"(?:город|г\.)\s*:?\s*([А-ЯЁA-Z][а-яёa-z\-]+)",
                  full_text, re.IGNORECASE)
    if m:
        city = m.group(1)

    # Подход/специализация: по ключевым словам
    low = full_text.lower()
    found = [a for a in APPROACHES if a in low]
    approaches = ", ".join(sorted(set(found)))

    # Стаж
    stazh = ""
    m = STAZH_RE.search(full_text)
    if m:
        stazh = m.group(1)

    # Цены (первые 3 уникальные)
    prices = []
    for p in PRICE_RE.findall(full_text):
        p = clean(p)
        if p not in prices:
            prices.append(p)
        if len(prices) >= 3:
            break

    # Открытые контакты: mailto/tel-ссылки надёжнее, чем текст
    emails, phones, socials = set(), set(), set()
    for a in soup.find_all("a", href=True):
        h = a["href"]
        if h.startswith("mailto:"):
            emails.add(h[7:].split("?")[0])
        elif h.startswith("tel:"):
            phones.add(h[4:])
        elif any(s in h for s in ("t.me/", "wa.me/", "instagram.com/",
                                  "vk.com/", "facebook.com/", "whatsapp")):
            socials.add(h)
    # плюс из текста (что человек сам вписал)
    for e in EMAIL_RE.findall(full_text):
        emails.add(e)
    for ph in PHONE_RE.findall(full_text):
        ph = clean(ph)
        if len(re.sub(r"\D", "", ph)) >= 10:
            phones.add(ph)

    # «О себе»: og:description или meta description или первый большой абзац
    about = ""
    d = soup.find("meta", attrs={"name": "description"})
    if d and d.get("content"):
        about = clean(d["content"])
    if not about:
        ogd = soup.find("meta", property="og:description")
        if ogd and ogd.get("content"):
            about = clean(ogd["content"])
    about = about[:500]

    return {
        "Имя": name,
        "Город": city,
        "Подход/специализация": approaches,
        "Стаж (лет)": stazh,
        "Цены": " | ".join(prices),
        "Email": " | ".join(sorted(emails)),
        "Телефон": " | ".join(sorted(phones)),
        "Соцсети": " | ".join(sorted(socials)),
        "О себе (фрагмент)": about,
        "Ссылка на профиль": url,
    }


def load_seen(path):
    """Уже собранные ссылки — чтобы можно было прервать и продолжить."""
    seen = set()
    if os.path.exists(path):
        with open(path, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                seen.add(row.get("Ссылка на профиль", ""))
    return seen


def main():
    print("=== Парсер b17.ru (Nova Leads) ===")
    seen = load_seen(OUTPUT_CSV)
    if seen:
        print(f"Уже собрано ранее: {len(seen)} — продолжаю, дубли пропущу.")

    # 1) собрать ссылки на профили
    profile_urls = []
    for start in START_URLS:
        print(f"\nКаталог: {start}")
        for page in range(1, MAX_LISTING_PAGES + 1):
            purl = start if page == 1 else next_listing_page(start, page)
            print(f"  страница {page}: {purl}")
            html = fetch(purl)
            if not html:
                break
            links = collect_profile_links(html)
            print(f"    найдено профилей на странице: {len(links)}")
            for l in links:
                if l not in seen and l not in profile_urls:
                    profile_urls.append(l)
            sleep_polite()
    if MAX_PROFILES:
        profile_urls = profile_urls[:MAX_PROFILES]
    print(f"\nВсего профилей к сбору: {len(profile_urls)}")
    if not profile_urls:
        print("Ничего не найдено. Проверь START_URLS (открой ссылку в браузере).")
        return

    # 2) пройти по профилям, писать в CSV по ходу
    fields = ["Имя", "Город", "Подход/специализация", "Стаж (лет)", "Цены",
              "Email", "Телефон", "Соцсети", "О себе (фрагмент)",
              "Ссылка на профиль"]
    new_file = not os.path.exists(OUTPUT_CSV)
    with open(OUTPUT_CSV, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        if new_file:
            writer.writeheader()
        for i, url in enumerate(profile_urls, 1):
            print(f"[{i}/{len(profile_urls)}] {url}")
            html = fetch(url)
            if not html:
                continue
            try:
                row = parse_profile(html, url)
                writer.writerow(row)
                f.flush()
                got = "контакт есть" if (row["Email"] or row["Телефон"]) else "без контакта"
                print(f"    ✓ {row['Имя'][:40]} | {row['Подход/специализация'][:30]} | {got}")
            except Exception as e:
                print(f"    [!] не разобрал профиль: {e}")
            sleep_polite()

    print(f"\nГотово. Результат: {OUTPUT_CSV} (открой в Excel/Google Sheets).")


if __name__ == "__main__":
    main()
