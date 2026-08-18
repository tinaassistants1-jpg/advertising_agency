#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Парсер каталога психологов b17.ru для агентства Nova Leads (v2).

Собирает профили в таблицу с колонками:
  ФИО | Город/страна | Контакты (тел/TG/WA/email/соцсети) | Подход |
  Описание | Где учился | Активность на b17 | Сегмент | Что предложить |
  Текст первого сообщения (черновик) | Ссылка на профиль

ГЛАВНОЕ ПРО ТЕКСТ СООБЩЕНИЯ:
  Скрипт делает ЧЕРНОВИК-заготовку: подставляет имя и «зацепку» из
  описания в вычитанный журналистом шаблон. Перед отправкой ОБЯЗАТЕЛЬНО
  прочитай и поправь «зацепку» под человека — робот не чувствует нюанс.
  Это заготовка, а не «отправить не глядя».

ЭТИКА/ЗАКОН:
  Только открытые данные, что специалист опубликовал сам. Контакты — для
  ТОЧЕЧНОЙ переписки по одному (опрос/приглашение), НЕ для массовой
  рассылки (152-ФЗ/GDPR). Пауза между запросами обязательна.
"""

import csv, os, re, sys, time, random

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Установи библиотеки:  pip install requests beautifulsoup4 lxml")
    sys.exit(1)

# ================== НАСТРОЙКИ ==================
START_URLS = [
    "https://www.b17.ru/psiholog/limassol/",   # пример — замени/добавь свои
    # "https://www.b17.ru/psiholog/almaty/",
]
MAX_LISTING_PAGES = 3       # сколько страниц каталога листать
MAX_PROFILES = 60           # максимум профилей (0 = без лимита)
DELAY_MIN, DELAY_MAX = 3, 6 # пауза сек между запросами (НЕ меньше 2!)
OUTPUT_CSV = "b17_results.csv"

# Ссылка, которую подставляем в сообщение (страница ДОД). Проверь, что живая!
DOD_LINK = "https://mig.institute/product/den-otkrytyh-dverej-praktik/"

APPROACHES = [
    "гештальт", "психоанализ", "когнитивно-поведенч", "кпт", "кбт",
    "экзистенциальн", "психодрам", "телесн", "схема-терап", "эмдр", "emdr",
    "системн", "семейн", "арт-терап", "юнгианск", "клиент-центр", "нарратив",
]
# ================== КОД ==================
HEADERS = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
           "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"),
           "Accept-Language": "ru,en;q=0.9"}
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d[\d\-\s()]{8,}\d)")
YEARS_SITE_RE = re.compile(r"(\d{1,2})\s*лет\s*на\s*сайте", re.IGNORECASE)
STAZH_RE = re.compile(r"стаж[^\.\n]{0,30}?(\d{1,2})\s*(?:год|лет|года)", re.IGNORECASE)
CONSULT_RE = re.compile(r"(\d{1,5})\s*(?:онлайн-)?консультац", re.IGNORECASE)
OCHNO_RE = re.compile(r"обратил[аи]сь\s*очно\s*(\d{1,5})", re.IGNORECASE)
PUBL_RE = re.compile(r"публикаци[а-я]*\s*(\d{1,4})", re.IGNORECASE)
OTZYV_RE = re.compile(r"отзыв[а-я]*\s*(\d{1,4})", re.IGNORECASE)
MONTH_RE = re.compile(r"(\d{1,4})\s*человек[а]?\s*в\s*этом\s*месяце", re.IGNORECASE)
EDU_KEYS = ["образование", "училась", "учился", "закончила", "закончил",
            "окончила", "окончил", "институт", "университет", "ступень",
            "мги", "миг", "магистрат", "сертифицир", "обучалась", "обучение в"]

session = requests.Session(); session.headers.update(HEADERS)

def fetch(url):
    try:
        r = session.get(url, timeout=30)
        if r.status_code == 200:
            r.encoding = r.apparent_encoding or "utf-8"; return r.text
        print(f"  [!] {url} → {r.status_code}")
    except Exception as e:
        print(f"  [!] {url}: {e}")
    return None

def nap(): time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
def clean(t): return re.sub(r"\s+", " ", t).strip()

def collect_links(html, base="https://www.b17.ru"):
    soup = BeautifulSoup(html, "html.parser"); links = set()
    for a in soup.find_all("a", href=True):
        h = a["href"]
        if re.match(r"^/([a-zA-Z0-9_\-]+|id\d+)/?$", h):
            first = h.strip("/").split("/")[0]
            if first in {"psiholog","forum","blog","trainings","consult","article",
                         "reklama","about","help","login","tags","cabinet","search"}:
                continue
            links.add(base + h)
    return links

def next_page(url, page):
    base = url.split("?")[0]
    return f"{base}?page={page}"

def sentences_with(text, keys):
    """Вернуть предложения, где встречается одно из ключевых слов."""
    out = []
    for s in re.split(r"(?<=[.!?])\s+", text):
        low = s.lower()
        if any(k in low for k in keys) and 15 < len(s) < 300:
            out.append(clean(s))
    return out

def draft_message(name, about, approaches):
    """Черновик первого сообщения: имя + зацепка из описания."""
    first_name = name.split()[0] if name else "Здравствуйте"
    # ищем «человеческую» зацепку: про развитие/учёбу/эмиграцию/подход
    hook = ""
    hooks = sentences_with(about, ["учусь","развива","супервиз","магистрат",
                                   "эмиграц","переезд","за рубеж","практик"])
    if hooks:
        hook = hooks[0]
    hook_line = (f"зацепилась за то, что вы пишете о себе — {hook.rstrip('.').lower()}"
                 if hook else "зацепилась за то, что вы пишете о себе")
    return (
        f"{first_name}, здравствуйте! Я Тина, пишу от Международного института "
        f"гештальта — мы онлайн, головной офис в Черногории.\n\n"
        f"Наткнулась на вашу анкету на b17 — и {hook_line}. Нам это близко.\n\n"
        f"25 августа у нас день открытых дверей: учредитель и преподаватели "
        f"расскажут о программах и институте, без записи на курс — просто "
        f"познакомиться. Бесплатно.\n\n"
        f"Скинуть ссылку?\n[{DOD_LINK}]\n"
        f"⚠️ ПОДПРАВЬ ЗАЦЕПКУ ПОД ЧЕЛОВЕКА ПЕРЕД ОТПРАВКОЙ"
    )

def classify(approaches, stazh, about):
    """Сегмент + что предложить (по правке ЦА 18.08)."""
    low = about.lower()
    st = int(stazh) if stazh.isdigit() else None
    is_gestalt = "гештальт" in approaches
    growing = any(w in low for w in ["учусь","развива","супервиз","магистрат","ступень"])
    if st is not None and st >= 15:
        return ("Мэтр (15+ лет)", "НЕ ППК. Амбассадор / клиент агентства "
                "(продвижение практики) / мероприятия мирового уровня")
    if is_gestalt and (growing or (st is not None and 2 <= st <= 7)):
        return ("Ядро ЦА ППК", "ППК «Сложный случай» + ДОД 25.08 (практикует, "
                "но в развитии — точное попадание)")
    if growing or (st is not None and st <= 2):
        return ("Начинающий", "Базовый курс / бесплатные лекции / ДОД")
    return ("Практик (уточнить)", "ДОД 25.08 для знакомства; сегмент уточнить в диалоге")

def parse_profile(html, url):
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text("\n")

    name = ""
    if soup.title and soup.title.string:
        name = clean(soup.title.string.split("|")[0].split("—")[0])
    h1 = soup.find("h1")
    if h1 and clean(h1.get_text()): name = clean(h1.get_text())

    city = ""
    m = re.search(r"(?:город|г\.)\s*:?\s*([А-ЯЁA-Z][а-яёa-z\-]+)", text, re.IGNORECASE)
    if m: city = m.group(1)

    low = text.lower()
    approaches = ", ".join(sorted({a for a in APPROACHES if a in low}))

    stazh = ""
    m = STAZH_RE.search(text)
    if m: stazh = m.group(1)

    # контакты
    emails, phones, socials, tg, wa = set(), set(), set(), set(), set()
    for a in soup.find_all("a", href=True):
        h = a["href"]
        if h.startswith("mailto:"): emails.add(h[7:].split("?")[0])
        elif h.startswith("tel:"): phones.add(h[4:])
        elif "t.me/" in h: tg.add(h)
        elif "wa.me/" in h or "whatsapp" in h: wa.add(h)
        elif any(s in h for s in ("instagram.com/","vk.com/","facebook.com/")):
            socials.add(h)
    for e in EMAIL_RE.findall(text): emails.add(e)
    for ph in PHONE_RE.findall(text):
        if len(re.sub(r"\D","",ph)) >= 10: phones.add(clean(ph))

    # описание (о себе)
    about = ""
    d = soup.find("meta", attrs={"name":"description"})
    if d and d.get("content"): about = clean(d["content"])
    if not about:
        ogd = soup.find("meta", property="og:description")
        if ogd and ogd.get("content"): about = clean(ogd["content"])
    about = about[:600]

    # где учился
    edu = " / ".join(sentences_with(text, EDU_KEYS)[:2])[:400]

    # активность на b17
    act = []
    for rx, label in [(YEARS_SITE_RE,"{} лет на сайте"),
                      (CONSULT_RE,"{} онлайн-консультаций"),
                      (OCHNO_RE,"обратились очно {}"),
                      (PUBL_RE,"публикаций {}"),
                      (OTZYV_RE,"отзывов {}"),
                      (MONTH_RE,"{} чел. в этом месяце")]:
        mm = rx.search(text)
        if mm: act.append(label.format(mm.group(1)))
    activity = " · ".join(act)

    segment, offer = classify(approaches, stazh, about)
    message = draft_message(name, about, approaches)

    return {
        "ФИО": name, "Город/страна": city,
        "Телефон": " | ".join(sorted(phones)),
        "Telegram": " | ".join(sorted(tg)),
        "WhatsApp": " | ".join(sorted(wa)),
        "Email": " | ".join(sorted(emails)),
        "Соцсети": " | ".join(sorted(socials)),
        "Подход": approaches, "Стаж (лет)": stazh,
        "Описание": about, "Где учился": edu,
        "Активность на b17": activity,
        "Сегмент": segment, "Что предложить": offer,
        "Текст первого сообщения (черновик)": message,
        "Ответил?": "", "Записался на ДОД?": "",
        "Ссылка на профиль": url,
    }

FIELDS = ["ФИО","Город/страна","Телефон","Telegram","WhatsApp","Email","Соцсети",
          "Подход","Стаж (лет)","Описание","Где учился","Активность на b17",
          "Сегмент","Что предложить","Текст первого сообщения (черновик)",
          "Ответил?","Записался на ДОД?","Ссылка на профиль"]

def load_seen(path):
    seen = set()
    if os.path.exists(path):
        with open(path, encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                seen.add(row.get("Ссылка на профиль",""))
    return seen

def main():
    print("=== Парсер b17.ru v2 (Nova Leads) ===")
    seen = load_seen(OUTPUT_CSV)
    if seen: print(f"Уже собрано ранее: {len(seen)} — дубли пропущу.")
    urls = []
    for start in START_URLS:
        print(f"\nКаталог: {start}")
        for page in range(1, MAX_LISTING_PAGES+1):
            purl = start if page == 1 else next_page(start, page)
            print(f"  страница {page}")
            html = fetch(purl)
            if not html: break
            for l in collect_links(html):
                if l not in seen and l not in urls: urls.append(l)
            nap()
    if MAX_PROFILES: urls = urls[:MAX_PROFILES]
    print(f"\nПрофилей к сбору: {len(urls)}")
    if not urls:
        print("Пусто. Проверь START_URLS — открывается ли в браузере, нет ли капчи.")
        return
    new = not os.path.exists(OUTPUT_CSV)
    with open(OUTPUT_CSV, "a", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if new: w.writeheader()
        for i, url in enumerate(urls, 1):
            print(f"[{i}/{len(urls)}] {url}")
            html = fetch(url)
            if not html: continue
            try:
                row = parse_profile(html, url); w.writerow(row); f.flush()
                got = "контакт+" if (row["Телефон"] or row["Telegram"] or row["Email"]) else "без контакта"
                print(f"    ✓ {row['ФИО'][:35]} | {row['Сегмент']} | {got}")
            except Exception as e:
                print(f"    [!] {e}")
            nap()
    print(f"\nГотово → {OUTPUT_CSV} (открой в Excel). Проверь черновики сообщений перед отправкой!")

if __name__ == "__main__":
    main()
