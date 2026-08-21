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
  return new Paragraph({ spacing: { after: 90 }, children: Array.isArray(runs) ? runs : [tr(runs)], ...o });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 110 },
    children: [new TextRun({ text, bold: true, size: 30, color: DARK })] });
}
function H2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 80 },
    children: [new TextRun({ text, bold: true, size: 25, color: ACCENT })] });
}
function H3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 170, after: 60 },
    children: [new TextRun({ text, bold: true, size: 22, color: BLUE })] });
}
function bullet(runs, level = 0) {
  return new Paragraph({ numbering: { reference: 'b', level }, spacing: { after: 55 },
    children: Array.isArray(runs) ? runs : [tr(runs)] });
}
// source tag helper
function src(name) { return new TextRun({ text: ' (' + name + ')', size: 18, italics: true, color: GREY }); }
function tag(kind) {
  const map = { fact: ['ФАКТ', GREEN], bench: ['БЕНЧМАРК', ACCENT], study: ['ИССЛЕД.', BLUE], prac: ['ПРАКТИКА', GREY] };
  const [t, c] = map[kind];
  return new TextRun({ text: '[' + t + '] ', bold: true, size: 17, color: c });
}

function cell(runs, { header = false, w, fill } = {}) {
  const arr = Array.isArray(runs) ? runs : [tr(runs, { bold: header, color: header ? 'FFFFFF' : '000000', size: 19 })];
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: (header || fill) ? { type: ShadingType.CLEAR, fill: header ? DARK : fill, color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ children: arr })],
  });
}

// generic table builder
function table(cols, headers, rows) {
  const TWt = cols.reduce((a, b) => a + b, 0);
  return new Table({ columnWidths: cols, width: { size: TWt, type: WidthType.DXA }, rows: [
    new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { header: true, w: cols[i] })) }),
    ...rows.map((r, ri) => new TableRow({ children: r.map((c, ci) =>
      cell(Array.isArray(c) ? c : c, { w: cols[ci], fill: ri % 2 ? 'F5EFE8' : undefined })) })),
  ]});
}

const children = [];

// COVER
children.push(
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · база знаний таргетолога', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Методы привлечения лидов: трафик, страны, связки, покупатель', bold: true, size: 34, color: DARK })] }),
  new Paragraph({ spacing: { after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Дата: 21.08.2026. Свод пяти исследований (платформы и методология · РФ/СНГ · диаспора · дальние рынки и мировые вебинары · покупательская психология). Ниша: онлайн-образование психологов, русскоязычная аудитория.', { size: 20, color: GREY })] }),
);

// LEGEND
children.push(
  H1('Как читать документ (важно)'),
  P([tag('fact'), tr('— подтверждённое правило/документ рекламной платформы. '), tag('bench'), tr('— рыночная оценка (варьируется). '), tag('study'), tr('— научное/индустриальное исследование. '), tag('prac'), tr('— маркетинговый кейс/блог.')]),
  P([new TextRun({ text: 'Честная оговорка: ', bold: true, color: RED }), tr('часть цифр агенты собрали из поисковой выдачи (первоисточники заблокированы прокси окружения). Такие числа — ориентир; ПЕРЕД публикацией в клиентских материалах их надо перепроверить в первоисточнике. В этом документе они годятся для планирования, не для сайта.')]),
);

// SECTION I — BY GOAL
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Раздел I. Методы по ЦЕЛИ трафика'));

children.push(H2('A. Трафик на САЙТ/лендинг → ЛИД (заявка, контакт)'));
children.push(table([2400, 2100, 4500],
  ['Метод', 'Ориентир цены', 'Суть и источник'],
  [
    ['Яндекс Директ (Поиск + РСЯ)', 'рег. 150–300 ₽ (мягкие ниши)', [tag('bench'), tr('«горячий» спрос + догрев; в 2026 считают «цену дошедшего до вебинара», не голый CPL'), src('vc.ru 2026')]],
    ['VK Реклама (лид-форма/сайт)', 'рег. 80–200 ₽; лид 200–900 ₽', [tag('bench'), tr('рабочая лошадка РФ; кейс психошколы: 298 рег. по 103 ₽'), src('vk.ru кейс 2025')]],
    ['Квиз-лендинг (тест вместо гайда)', 'CPL −20–30%', [tag('bench'), tr('конверсия квиза 10–35% против 3–7% у обычного лендинга; opt-in квиза ~40% vs ~5% у PDF'), src('madtest 2025; Interact 2026')]],
    ['VK лид-формы (без сайта)', 'часто самый дешёвый лид', [tag('prac'), tr('заявка внутри VK; кейс 30 рег. по 385 ₽'), src('promoexpert 2025')]],
    ['Авито', 'лид от 100–133 ₽', [tag('prac'), tr('дешёвый холодный трафик, регионы; связка с Telegram'), src('vc.ru 2025')]],
  ]));

children.push(H2('B. Трафик на ПОДПИСЧИКОВ (Telegram-бот/канал, VK-сообщество)'));
children.push(table([2400, 2100, 4500],
  ['Метод', 'Ориентир цены', 'Суть и источник'],
  [
    ['Telegram Ads (через eLama)', 'подписчик-психолог 150–250 ₽', [tag('bench'), tr('вход от 250 € vs 2 млн € напрямую; ВНИМАНИЕ: льгота eLama НЕ на образование'), src('GetCourse 2026; Cossa/eLama 2025')]],
    ['Посевы в Telegram-каналах', 'CPV от 150 ₽/1000 показов', [tag('bench'), tr('нативный пост у админов; малые каналы — выше вовлечённость'), src('eLama 2025')]],
    ['Взаимопиар / TG-папки', 'бесплатно', [tag('prac'), tr('чаты ВП, «пост на час», смежные вертикали'), src('vc.ru 2025')]],
    ['VK-сообщества', 'таргет на подписку', [tag('fact'), tr('связка «сообщество + лид-форма» для мягких ниш'), src('ads.vk.ru 2025')]],
    ['Инфлюенсеры (натив)', 'интеграция от ~100k ₽', [tag('bench'), tr('натив = 120–180% базового поста'), src('eLama 2026')]],
  ]));

children.push(H2('C. Трафик на ЗАПИСЬ НА ВЕБИНАР / автовебинар'));
children.push(bullet([tag('bench'), tr('Механика РФ: трафик → регистрация на бесплатный вебинар/в бот → прогрев в мессенджере → вебинар → продажа. Регистрация ~150 ₽; доходимость 1/3–1/4'), src('vc.ru/salebot 2025')]));
children.push(bullet([tag('study'), tr('Конверсия лендинга регистрации ~30% на холоде (топ — до 59%)'), src('ON24 2025; Contrast 2026')]));
children.push(bullet([tag('study'), tr('ВАЖНО: у ОБРАЗОВАТЕЛЬНЫХ вебинаров доходимость самая низкая — ~31% против ~40% в среднем. Значит напоминания и ретаргет для нас критичны'), src('Contrast 2026')]));
children.push(bullet([tag('bench'), tr('3 письма-напоминания = +~28% к доходимости; каденция «за неделю / за 1 день / за 1 час» — стандарт; day-of даёт ~38% живой аудитории'), src('WebinarNinja / ON24 2025')]));
children.push(bullet([tag('bench'), tr('Лид с вебинара ~$72 против >$800 с других каналов — объективно дешёвый канал'), src('Zoom 2025')]));
children.push(bullet([tag('bench'), tr('Мессенджер-бот вытесняет email в прогреве: open rate бота 85–95% против 15–25% у email; email дешевле (~2 ₽/письмо) как первое касание'), src('habr/mindbox 2025')]));

// SECTION II — BY COUNTRY
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Раздел II. По странам: где какой канал главный'));

children.push(H2('РФ и СНГ'));
children.push(P([new TextRun({ text: '⚠️ Meta запрещена: ', bold: true, color: RED }), tag('fact'), tr('с 01.09.2025 реклама в Instagram/Facebook в РФ запрещена полностью, включая нативные интеграции у блогеров (ст.14.3 КоАП, штраф до 500 тыс. ₽). Весь платный трафик РФ = VK, Telegram, Яндекс, Авито, ОК.'), src('РБК/Meduza/Setters 2025')]));
children.push(bullet([tag('fact'), tr('VK Реклама: look-alike от 1000 чел. в сиде; VK сам генерит erid и передаёт в ЕРИР — отдельно в ОРД не идём'), src('Справка VK 2025')]));
children.push(bullet([tag('fact'), tr('VK запрещает эзотерику/НЛП/таро и бан за «гарантии/исцеление» — тексты только через обучение и лид-магнит, без обещаний результата'), src('Справка VK, ред. 28.02.2025')]));
children.push(bullet([tag('fact'), tr('Казахстан — Instagram НЕ запрещён, работает; двуязычные креативы RU/KZ повышают доверие'), src('competent.kz 2025')]));

children.push(H2('Русскоязычная диаспора (Meta — только с ООО Черногория, не на РФ)'));
children.push(table([1900, 3400, 3700],
  ['Страна', 'Главный канал', 'Заметки'],
  [
    ['Израиль', 'Telegram + доски (isra.com/do, orbita)', [tag('fact'), tr('крупный самост. рынок; развитая RU-инфраструктура'), src('выдача 2025')]],
    ['Германия', 'FB-группы городов (germany.ru) + Telegram релокантов + Google', [tag('fact'), tr('старая волна в FB, новая в TG; платёжеспособны, гуглят услуги')]],
    ['Кипр (Лимассол — пилот)', 'Facebook-группы («Русский Кипр» и др.)', [tag('bench'), tr('диаспора до ~120 тыс. (~10%); FB — первичная соц-инфраструктура экспатов')]],
    ['Сербия', 'FB («Понаехали! Сербия») + плотный Telegram', [tag('fact'), tr('крупные релокантские группы')]],
    ['Черногория', 'Telegram (@openmonte) + FB', [tag('fact'), tr('очень активное комьюнити; здесь же наше ООО')]],
    ['Турция', 'Telegram (Анталья/Стамбул чаты) + Instagram + Google', [tag('bench'), tr('кейс: ROAS 340% на Google Search')]],
    ['ОАЭ — ПАУЗА', 'Telegram + Instagram', [tag('fact'), tr('с 01.02.2026 Advertiser Permit (штраф до 1 млн AED); применимость к рекламе извне НЕ ясна — держим паузу до юр-заключения')]],
  ]));
children.push(P([new TextRun({ text: 'Оплата: ', bold: true }), tag('fact'), tr('Meta и Telegram Ads — только с не-РФ карты/юрлица (ООО Черногория, EUR/USD); рублёвые карты не привязываются. Таргет на пользователей ВНУТРИ РФ через Meta — рискован; только заграница.'), src('platipomiru/DTF 2025–2026')]));

children.push(H2('Дальние рынки (мировые приёмы, переносимая механика)'));
children.push(bullet([new TextRun({ text: 'Бразилия: ', bold: true }), tag('bench'), tr('WhatsApp №1; Click-to-WhatsApp Ads дают −3–5× CPL; доминирует модель «запуска» (Fórmula de Lançamento: серия бесплатных уроков → вебинар → окно продаж с дедлайном)'), src('PayPerWA 2026; ericorocha')]));
children.push(bullet([new TextRun({ text: 'Таиланд: ', bold: true }), tag('bench'), tr('LINE — главный инструмент лидов (read rate 80–94% против 10–15% email); воронка: LINE Ad → друг Official Account → чат-бот → продажа'), src('OurGreenfish 2025')]));
children.push(bullet([new TextRun({ text: 'Индонезия: ', bold: true }), tag('bench'), tr('WhatsApp + TikTok/Instagram; лид-магнит = бесплатные мини-курсы/LIVE (кейс RevoU)'), src('Taksu 2025')]));
children.push(bullet([new TextRun({ text: 'Перенос на нас: ', bold: true, color: GREEN }), tr('где на Западе WhatsApp/LINE — у нас Telegram/VK. Механика та же: реклама → мессенджер-бот → прогрев → вебинар/продажа.')]));

// SECTION III — COMBOS
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Раздел III. Связки (что с чем комбинируют)'));
children.push(table([2600, 2100, 4300],
  ['Связка', 'Конверсия (ориентир)', 'Где и как'],
  [
    ['Квиз → лид-магнит → вебинар → звонок', 'opt-in квиза ~40%', [tag('bench'), tr('квиз кратно бьёт PDF; для психологов — «диагностический» квиз (готовы ли к сложным случаям), не продающий'), src('Interact/ScoreApp 2026')]],
    ['Трипваер → основной продукт', 'микро-покупка снимает барьер', [tag('prac'), tr('дешёвый продукт ($7–37 / ~3000 ₽) → апселл на ППК идёт легче'), src('OptinMonster')]],
    ['Марафон/челлендж → продажа', 'оплата 5–12%', [tag('prac'), tr('5–10 дней с «быстрой победой»; предстартовая e-серия +25–40% к оплате'), src('communipass 2026')]],
    ['Evergreen-вебинар + дедлайн', 'холод 1–3% в покупку', [tag('prac'), tr('западный автопилот (Deadline Funnel); продаёт продукты $300–1000; живой конвертит выше'), src('ClickFunnels 2026')]],
    ['Telegram-бот автоворонка', '«родная» рынку РФ', [tag('prac'), tr('Telegram Ads → бот → польза → квалификация → прогрев → продукт'), src('BotHelp кейс')]],
  ]));

// SECTION IV — BUYER
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Раздел IV. Что влияет на русскоязычного покупателя'));
children.push(bullet([tag('study'), tr('Отзывы и соцдоказательство — решающий фактор; рекомендациям знакомых доверяют ~26%, отзывам ~25% (самые «достойные доверия» каналы)'), src('Data Insight 2025; ВЦИОМ 2023–2024')]));
children.push(bullet([tag('study'), tr('Мировой контекст (диаспора): 88–92% доверяют рекомендациям знакомых больше любого канала'), src('Nielsen 2021')]));
children.push(bullet([tag('study'), tr('Доверие к эксперту зависит от ТЕМАТИЧЕСКОЙ экспертности, не от известности; блогерам в целом доверяют лишь 33%; 97% хотят честной пометки «реклама»'), src('AdIndex/Anketolog 2024')]));
children.push(bullet([tag('study'), tr('Россияне «перестают верить глянцу, выбирают искренность»; ценят ненавязчивую полезную рекламу; страх инфоперегрузки'), src('НАФИ 2023–2024')]));
children.push(bullet([tag('study'), tr('Искусственная срочность/дефицит повышают импульс, НО разрушают доверие и лояльность; этичный дедлайн = правдивый и прозрачный'), src('Journal of Retailing 2022')]));
children.push(bullet([tag('prac'), tr('Рассрочка/BNPL повышает конверсию; для дорогого продукта — способ оплаты влияет на решение'), src('TAdviser 2023–2025')]));
children.push(bullet([tag('study'), tr('Медиасреда: Telegram — 49% населения 12+ ежедневно, охват 64,7 млн; соцсети+мессенджеры ~25% интернет-времени'), src('Mediascope 2024')]));

// SECTION V — PSYCHOLOGISTS
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Раздел V. Психологи как покупатели обучения (для МИГ — главное)'));
children.push(bullet([tag('study'), tr('Внутренняя мотивация к развитию сильнее внешнего давления; 91,7% практиков учились бы и без обязаловки — покупают из ценности, а не из-под палки'), src('BMC Med Education 2025; опрос 204 психологов')]));
children.push(bullet([tag('study'), tr('Супервизия — ключевой элемент профразвития; профидентичность формируется через личную терапию и супервизию (активно обсуждается в русскоязычном поле = ценностный крючок)'), src('PMC6706910 2019; Психологическая газета 2025')]));
children.push(bullet([tag('study'), tr('Аккредитация EAGT = единые стандарты + «портируемость» квалификации по Европе и связь с ECP — признание и мобильность как аргумент'), src('EAGT Training Standards')]));
children.push(bullet([tag('study'), tr('Барьеры: цена, время, локация, выгорание (эмоц. истощение ~40%, у психотерапевтов до ~55%)'), src('European Psychiatry, мета-анализ')]));
children.push(P([new TextRun({ text: '★ Самое важное для оффера: ', bold: true, color: GREEN }), tag('study'), tr('85% клиницистов называют тревогу/сильные эмоции барьером при работе с суицидальными клиентами; суицидальные пациенты вызывают страх, беспомощность, чувство некомпетентности. Наш продукт «Сложный случай» бьёт ровно в эту задокументированную профессиональную тревогу — честный, сильный оффер.'), src('Community Mental Health J. 2024; Boston Suicide Study Group')]));
children.push(bullet([tag('study'), tr('Как ищут обучение: от КОЛЛЕГ — «если рекомендует тот, кого уважаю, попробую»; рекомендация снижает риск выбора. Сигналы доверия: аккредитация, репутация, свежие отзывы, прозрачная цена'), src('PMC3361756; accessplanit')]));

// SECTION VI — CONCLUSIONS FOR MIG
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Раздел VI. Выводы для МИГ — что берём в работу'));
children.push(bullet([new TextRun({ text: 'Каналы по гео: ', bold: true }), tr('РФ — VK + Telegram(eLama) + Директ + Авито. Диаспора — Meta с ООО Черногория (Кипр/Сербия/Германия — FB-группы; Израиль/Турция — Telegram) + Google для защиты бренда. ОАЭ — пауза.')]));
children.push(bullet([new TextRun({ text: 'Сайт: ', bold: true }), tr('вместо «оставьте почту за гайд» — квиз-диагностика («готовы ли вы к сложным случаям») → кратно выше конверсия.')]));
children.push(bullet([new TextRun({ text: 'Воронка: ', bold: true }), tr('реклама → Telegram-бот (родной рынку) → прогрев → вебинар/ДОД → собеседование → оплата. Живой вебинар приоритетнее автовебинара по конверсии.')]));
children.push(bullet([new TextRun({ text: 'Вебинар: ', bold: true }), tr('обязательны напоминания «за неделю / день / час» + ретаргет — у образования доходимость ниже средней.')]));
children.push(bullet([new TextRun({ text: 'Оффер: ', bold: true }), tr('строить на страхе сложных случаев (документирован) + ценности супервизии и сообщества + аккредитации EAGT. Рассрочку — первой строкой.')]));
children.push(bullet([new TextRun({ text: 'Триггеры: ', bold: true, color: RED }), tr('НИКАКИХ фейковых таймеров и «осталось 2 места» — психологи считывают манипуляцию мгновенно и уходят. Только правдивые дедлайны (ранняя цена до 30.09 — реальна).')]));
children.push(bullet([new TextRun({ text: 'Доверие: ', bold: true }), tr('реальные отзывы (с согласия), имя преподавателя, рекомендации коллег, прозрачная цена. Соцдоказательство — сильнейший рычаг для этой аудитории.')]));

// SECTION VII — GAPS
children.push(H1('Раздел VII. Честные пробелы — что доверифицировать/протестировать'));
children.push(bullet('CPL по русской диаспоре в 7 странах — публичных цифр нет; считаем на своём тесте (Кипр-Лимассол + Израиль/Турция).'));
children.push(bullet('UAE Advertiser Permit — точная стоимость и применимость к рекламе извне: подтвердить у UAE Media Council до любых действий по ОАЭ.'));
children.push(bullet('Ряд цифр (квиз-бенчмарки, «85% клиницистов», доверие отзывам) собраны из выдачи — перед сайтом прогнать через первоисточник.'));
children.push(bullet('Российских исследований мотивации ИМЕННО психологов к ДПО в цифрах не нашли — есть западные + качественные русские; LTV/готовность платить — проверить по AlfaCRM.'));
children.push(bullet('Актуальные комиссия/порог eLama на образование и точные бюджеты/ставки VK — подтвердить в кабинете при запуске.'));
children.push(P([new TextRun({ text: 'Итог: ', bold: true, color: DARK }), tr('это карта методов и приёмов с честными метками достоверности. Следующий шаг — на её основе собрать тест-план по каналам с реальными бюджетами и KPI по цене оплаты (не регистрации).', {})], { spacing: { before: 140 } }));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } },
    { level: 1, format: 'bullet', text: '–', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 900, hanging: 260 } } } },
  ]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/leadgen-methods-research.docx', buf);
  console.log('OK');
});
