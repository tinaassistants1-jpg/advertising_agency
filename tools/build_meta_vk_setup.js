const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, PageBreak,
} = require('docx');
const fs = require('fs');

const ACCENT = 'C6633A';
const DARK = '1C1815';
const GREY = '6B6259';
const BLUE = '2F5D8A';
const GREEN = '2E7D32';
const RED = 'B23A2E';

function tr(x, o = {}) { return new TextRun({ text: x, size: 21, ...o }); }
function P(runs, o = {}) {
  return new Paragraph({ spacing: { after: 85 }, children: Array.isArray(runs) ? runs : [tr(runs)], ...o });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: DARK })] });
}
function H2(text, color = ACCENT) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 70 },
    children: [new TextRun({ text, bold: true, size: 23, color })] });
}
function step(n, runs) {
  return new Paragraph({ spacing: { after: 55 }, indent: { left: 470, hanging: 320 },
    children: [new TextRun({ text: n + '  ', bold: true, size: 21, color: ACCENT }),
      ...(Array.isArray(runs) ? runs : [tr(runs)])] });
}
function note(runs) {
  return new Paragraph({ spacing: { after: 60 }, indent: { left: 470 },
    children: [new TextRun({ text: '↳ ', bold: true, size: 19, color: GREY }),
      ...(Array.isArray(runs) ? runs : [tr(runs, { size: 19, color: GREY })])] });
}
function warn(runs) {
  return new Paragraph({ spacing: { after: 80 }, indent: { left: 280 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: RED, space: 10 } },
    children: Array.isArray(runs) ? runs : [new TextRun({ text: runs, size: 21, color: RED })] });
}
function bullet(runs) {
  return new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 50 },
    children: Array.isArray(runs) ? runs : [tr(runs)] });
}
function code(t) { return new TextRun({ text: t, font: 'Consolas', size: 19, color: ACCENT }); }
function cell(runs, { header = false, w, fill } = {}) {
  const arr = Array.isArray(runs) ? runs : [tr(runs, { bold: header, color: header ? 'FFFFFF' : '000000', size: 19 })];
  return new TableCell({ width: { size: w, type: WidthType.DXA },
    shading: (header || fill) ? { type: ShadingType.CLEAR, fill: header ? DARK : fill, color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 70, right: 70 }, children: arr.map((a) => (a instanceof Paragraph ? a : new Paragraph({ children: [a] }))) });
}
function table(cols, headers, rows) {
  const TWt = cols.reduce((a, b) => a + b, 0);
  return new Table({ columnWidths: cols, width: { size: TWt, type: WidthType.DXA }, rows: [
    new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { header: true, w: cols[i] })) }),
    ...rows.map((r, ri) => new TableRow({ children: r.map((c, ci) => cell(c, { w: cols[ci], fill: ri % 2 ? 'F5EFE8' : undefined })) })),
  ]});
}

const children = [];

children.push(
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · настройка рекламных кабинетов МИГ', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Настройка Meta и VK для МИГ: пошагово', bold: true, size: 32, color: DARK })] }),
  new Paragraph({ spacing: { after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Дата: 21.08.2026. От нуля до первой кампании. Названия пунктов меню иногда меняются — логика верна, ищите по смыслу. Кнопки жмёте вы/команда по шагам.', { size: 20, color: GREY })] }),
);

// LEGAL FRAME
children.push(H1('Главное правило до старта (юр-граница)'));
children.push(warn([new TextRun({ text: 'Meta — только с ООО (Черногория) и только на диаспору за рубежом. ', bold: true, size: 21, color: RED }), new TextRun({ text: 'С 01.09.2025 реклама в Instagram/Facebook на РФ и от РФ-юрлица запрещена (штраф до 500 тыс ₽). Никогда не таргетируем Meta на пользователей внутри России.', size: 21, color: RED })]));
children.push(warn([new TextRun({ text: 'VK — от ИП МИГа. ', bold: true, size: 21, color: RED }), new TextRun({ text: 'Маркировка (erid, ЕРИР) идёт автоматически по ИНН. Категория «психология»: без «гарантий/исцеления», без эзотерики/НЛП/таро — иначе бан.', size: 21, color: RED })]));

// PART 0 — PREP
children.push(H1('Часть 0. Что собрать заранее'));
children.push(table([4400, 4300],
  ['Для VK (от ИП)', 'Для Meta (от ООО Черногория)'],
  [
    ['Доступ к кабинету ads.vk.ru от ИП (роль с правом кампаний/аудиторий)', 'Аккаунт Facebook-администратора + Business Manager'],
    ['ИНН/ОГРНИП ИП МИГа (для маркировки)', 'Реквизиты ООО Черногория (для верификации бизнеса)'],
    ['Выгрузка покупателей из AlfaCRM (телефоны+email)', 'Евро-карта ООО (Visa/Mastercard не РФ, с 3D-Secure)'],
    ['Доступ к коду лендинга (пиксель)', 'Доступ к коду лендинга (пиксель + CAPI)'],
    ['Скан лицензии на образование (может спросить модерация)', 'Страница Facebook (реанимировать ФБ МИГ)'],
  ]));

// PART 1 — VK
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Часть 1. VK Реклама — настройка'));

children.push(H2('1.1. Доступ и пиксель'));
children.push(step('1', 'Войти в ads.vk.ru под кабинетом ИП МИГа. Выдать роль агентству (Настройки → Доступы).'));
children.push(step('2', ['Меню → «Аудитории» → «Пиксель» → «Создать пиксель», имя ', code('MIG_PPK'), tr('. Скопировать код.')]));
children.push(step('3', ['Разработчик вставляет код в ', code('<head>'), tr(' лендинга на всех страницах. Проверить статус — зелёный.')]));
children.push(step('4', ['Настроить событие ', code('submit_lead'), tr(' на кнопку заявки/квиза.')]));

children.push(H2('1.2. Аудитории и look-alike'));
children.push(step('5', ['Подготовить файл покупателей: телефоны в формате ', code('79991234567'), tr(', почты в нижнем регистре, один контакт в строке.')]));
children.push(step('6', 'Аудитории → «Создать аудиторию» → «Загрузить список» → залить телефоны и почты. Имена: Покупатели_тел / Покупатели_почта.'));
children.push(note('норма совпадения 40–70%. Нужно ≥1000 для look-alike — если меньше, объединить с визиторами пикселя.'));
children.push(step('7', 'Аудитории → «Создать» → «Пиксель» → «все посетители 180 дней». Имя: Визиторы_180д.'));
children.push(step('8', 'Аудитории → «Создать» → «Похожая (look-alike)» на «Покупатели_тел». Ползунок — левая треть (точнее). Имя: LAL_Покупатели.'));

children.push(H2('1.3. Первая кампания'));
children.push(step('9', 'Кампании → «Создать» → цель «Сайт» (трафик на лендинг/квиз).'));
children.push(step('10', ['Аудитория: показывать ', new TextRun({ text: 'LAL_Покупатели', bold: true, size: 21 }), tr(' + отдельной группой ретаргет '), new TextRun({ text: 'Визиторы_180д', bold: true, size: 21 }), tr('. Исключить: Покупатели (уже купили).')]));
children.push(step('11', 'Дневной лимит на старт: 500–1000 ₽ (карантин от фрода), смотреть 3–4 дня.'));
children.push(step('12', 'Стратегия ставок: «Минимальная цена». Модель — по цели (лиды/трафик).'));
children.push(note([tr('Маркировка: VK сам генерит erid и передаёт в ЕРИР по ИНН ИП. Отдельно в ОРД не регистрируемся. Помнить про НДС при пополнении.', { color: GREEN, size: 19 })]));

// PART 2 — META
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Часть 2. Meta (Facebook/Instagram) — настройка'));
children.push(warn('Всё делаем под кабинетом ООО Черногория, в евро. Таргет — только диаспора (Израиль, Германия, Кипр, Сербия). НЕ РФ.'));

children.push(H2('2.1. Business Manager и верификация'));
children.push(step('1', 'Создать/войти в Business Manager: business.facebook.com → «Создать аккаунт» на данные ООО.'));
children.push(step('2', 'Настройки компании → «Центр безопасности» → пройти верификацию бизнеса (загрузить документы ООО). Занимает от пары дней.'));
children.push(note('без верификации часть функций (кастомные аудитории, CAPI) ограничена — начать заранее.'));
children.push(step('3', 'Создать рекламный аккаунт: Настройки → «Аккаунты» → «Рекламные аккаунты» → «Создать». Валюта — EUR.'));
children.push(step('4', 'Привязать евро-карту ООО (с 3D-Secure). Рублёвые карты не работают.'));
children.push(step('5', 'Реанимировать/создать страницу Facebook МИГ (нужна для запуска рекламы) + привязать Instagram.'));

children.push(H2('2.2. Пиксель + Conversions API'));
children.push(step('6', ['Events Manager → «Подключить источник» → «Веб» → создать пиксель ', code('MIG_PPK'), tr('. Код — в '), code('<head>'), tr(' лендинга.')]));
children.push(step('7', ['Настроить событие ', code('Lead'), tr(' на кнопку заявки/квиза.')]));
children.push(step('8', 'Подключить Conversions API (CAPI) — пиксель ловит 70–80% событий, связка пиксель+CAPI — 90–98%. Задача разработчика (или через коннектор Tilda/CMS).'));

children.push(H2('2.3. Аудитории и первая кампания'));
children.push(step('9', 'Когда пиксель наберёт визиторов — Audiences → Custom Audience (визиторы сайта) → потом Lookalike (1–3%).'));
children.push(step('10', 'Кампания → цель «Лиды» (или «Трафик» на старте). Advantage+ можно оставить, но на тесте — контролируемо (ABO).'));
children.push(step('11', ['Гео: ', new TextRun({ text: 'по одному гео на группу', bold: true, size: 21 }), tr(' (Кипр / Израиль / Германия / Сербия). Язык интерфейса — русский. Интересы: психология, обучение.')]));
children.push(step('12', 'Бюджет теста: €100–150 на гео, 3–5 дней. Масштаб победителя — +10–20% каждые 3–5 дней (не сбивать обучение).'));
children.push(note('стоп-правило: 400 € без заявки → стоп. Меряем цену ОПЛАТЫ, не регистрации.'));

// PART 3 — ORDER + CHECKLIST
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Часть 3. Порядок действий (что за чем)'));
children.push(table([1400, 7300],
  ['Шаг', 'Действие'],
  [
    ['1', 'Собрать доступы и реквизиты (Часть 0) — параллельно VK и Meta'],
    ['2', 'Пиксели VK + Meta на лендинг (быстро, разблокирует всё)'],
    ['3', 'VK: аудитории + look-alike (сид из AlfaCRM) → первая кампания (запуск раньше — кабинет готов)'],
    ['4', 'Meta: верификация бизнеса (идёт своим ходом, начать сразу) → карта → пиксель+CAPI'],
    ['5', 'Meta: первая кампания на 1–2 приоритетных гео (Кипр-Лимассол + Израиль)'],
    ['6', 'Через 3–4 дня — замер цены заявки/оплаты, перелив бюджета в лидера'],
  ]));

children.push(H1('Чек-лист запуска'));
children.push(bullet('[ ] Доступ к VK-кабинету от ИП выдан агентству'));
children.push(bullet('[ ] Выгрузка покупателей из AlfaCRM готова'));
children.push(bullet('[ ] Пиксель VK на лендинге, статус зелёный, событие submit_lead'));
children.push(bullet('[ ] VK: аудитории Покупатели / Визиторы / LAL собраны'));
children.push(bullet('[ ] VK: первая кампания запущена (лимит 500–1000 ₽/день)'));
children.push(bullet('[ ] Meta: Business Manager на ООО, верификация запущена'));
children.push(bullet('[ ] Meta: евро-карта привязана'));
children.push(bullet('[ ] Пиксель Meta + CAPI на лендинге, событие Lead'));
children.push(bullet('[ ] Meta: кампания на 1–2 гео диаспоры (€100–150/гео)'));
children.push(bullet('[ ] UTM на всех ссылках, метка источника в AlfaCRM'));

// WHAT I NEED
children.push(H1('Что мне нужно от вас, чтобы двигаться'));
children.push(bullet('Ссылка на лендинг ППК (проверю форму/квиз/кнопки).'));
children.push(bullet('Кто разработчик (вставить пиксели + CAPI).'));
children.push(bullet('ИНН/ОГРНИП ИП (VK-маркировка) + реквизиты ООО (Meta-верификация).'));
children.push(bullet('Выгрузка покупателей из AlfaCRM (для сида look-alike).'));
children.push(bullet('Есть ли уже евро-карта ООО для Meta.'));
children.push(P([new TextRun({ text: 'Как только пиксели встанут и придёт выгрузка — я собираю аудитории, пишу объявления (через журналиста) и запускаем тест по волнам из тест-плана.', italics: true, size: 21, color: DARK })], { spacing: { before: 120 } }));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/meta-vk-setup.docx', buf);
  console.log('OK');
});
