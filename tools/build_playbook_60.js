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
function phase(letter, title) {
  return new Paragraph({ spacing: { before: 240, after: 60 },
    shading: { type: ShadingType.CLEAR, fill: DARK, color: 'auto' },
    children: [new TextRun({ text: `ФАЗА ${letter} · ${title}`, bold: true, size: 22, color: 'FFFFFF' })] });
}
function step(n, runs) {
  return new Paragraph({ spacing: { after: 55 }, indent: { left: 460, hanging: 300 },
    children: [new TextRun({ text: n + '. ', bold: true, size: 21, color: ACCENT }),
      ...(Array.isArray(runs) ? runs : [tr(runs)])] });
}
function note(runs) {
  return new Paragraph({ spacing: { after: 60 }, indent: { left: 460 },
    children: [new TextRun({ text: '↳ ', bold: true, size: 19, color: GREY }),
      ...(Array.isArray(runs) ? runs : [tr(runs, { size: 19, color: GREY })])] });
}
function bullet(runs) {
  return new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 50 },
    children: Array.isArray(runs) ? runs : [tr(runs)] });
}
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
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · план продаж ППК', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Как продать 60 мест тарифа «Практик»: от А до Я', bold: true, size: 32, color: DARK })] }),
  new Paragraph({ spacing: { after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Дата: 21.08.2026. Цель: 60 оплат «Практик» (максимум; минимум-порог — 20). Старт программы 04.12, набор до 04.11, ранняя цена до 30.09. Окно продаж — ~11 недель.', { size: 20, color: GREY })] }),
  new Paragraph({ spacing: { after: 150 },
    children: [new TextRun({ text: 'Цифры целей/дат — факты (Тина). Цифры конверсий — оценка на бенчмарках, откалибруем первым ДОД и данными AlfaCRM.', bold: true, size: 20, color: RED })] }),
);

// MATH
children.push(H1('Математика набора: сколько нужно на входе (модель)'));
children.push(P([tr('Считаем ОБРАТНО от 60 оплат, двумя потоками. Все конверсии — оценка [О], не факт.')]));
children.push(table([3400, 1500, 3800],
  ['Поток', 'Даёт оплат', 'Логика (оценка)'],
  [
    ['ТЁПЛЫЙ: 200 студентов + 95 лидов + 56 выпускников (≈350 контактов)', '~30–40', '[О] звонок + вебинар + собеседование; тёплые конвертят в разы выше холода (факт 2025: 7,2% с вебинаром)'],
    ['ПЛАТНЫЙ трафик (VK/Telegram/Meta)', '~20–30', '[О] реклама → бот → вебинар → собеседование; холодная конверсия 1–3%'],
    ['РЕФЕРАЛЫ 200 студентов («приведи коллегу»)', '+5–10', '[О] сарафан почти бесплатно'],
  ]));
children.push(P([new TextRun({ text: 'Ключевой вывод: ', bold: true, color: GREEN }), tr('основа 60 мест — не реклама, а ТЁПЛАЯ база + собеседование. Реклама добирает верх. Это совпадает с честным ответом «канал с высшей вероятностью — тёплые».')]));
children.push(P([new TextRun({ text: 'Воронка платного потока (на 30 оплат, оценка): ', bold: true }), tr('оплата ← собеседование (60%) ← заявка (80% доходят) ← дошедший на вебинар (~15% дают заявку) ← регистрация (доходимость ~31% у образования) ← лид. Итог: ~30 оплат требуют ≈ 1500–2500 регистраций холодного трафика.')]));
children.push(P([new TextRun({ text: 'Бюджет платного (оценка): ', bold: true }), tr('30 оплат × CAC ≤ 250 € = ориентир ≤ 7 500 € на весь холодный набор. Финал — по факту цены оплаты в тесте.')]));

// PHASES
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Пошагово: от А до Я'));

children.push(phase('A', 'Инфраструктура (неделя 1 — до старта трафика)'));
children.push(step(1, [tr('Пиксели VK + Meta на лендинг ППК (инструкция готова). ', {}), new TextRun({ text: 'Без этого реклама слепая.', italics: true, color: RED, size: 20 })]));
children.push(step(2, 'Лендинг ППК с формой заявки + квиз «Готовы ли вы к сложному случаю» (готов). Событие submit_lead / Lead.'));
children.push(step(3, 'Telegram-бот с разбором случая + 9 лекций (сценарий v3 готов; реплики про суицид — заверить у преподавателя).'));
children.push(step(4, 'Доступ агентству к кабинету VK от ИП + выгрузка покупателей из AlfaCRM (сид look-alike).'));
children.push(step(5, 'Кабинет Meta на ООО Черногория (евро-карта) — для диаспоры.'));
children.push(step(6, 'Телефония с записью для менеджера + метки источника (UTM) в AlfaCRM.'));
children.push(note('Пока строится инфраструктура — параллельно идёт Фаза B (тёплая база не ждёт).'));

children.push(phase('B', 'Тёплый контур (недели 1–3, главный источник)'));
children.push(step(7, 'Менеджер обзванивает ~350 тёплых по скрипту-подарку (готов): «дарю 9 лекций» → приглашение на ДОД. Живой звонок, не робот.'));
children.push(step(8, 'Сегменты в порядке: текущие 200 студентов → 95 лидов → 56 выпускников. Каждый результат — в AlfaCRM.'));
children.push(step(9, 'Реферальная механика: студентам — «приведи коллегу на ППК» (тёплый сарафан).'));
children.push(note([tr('Это поток с высшей вероятностью оплаты. Отсюда — большая часть из 60.', { color: GREEN })]));

children.push(phase('C', 'Контент-прогрев (недели 1–11, постоянно)'));
children.push(step(10, 'Контент-воронка (готова): рилсы на сложные темы → подписка → лид-магнит → бот. СММ отчитывается по заявкам, не охватам.'));
children.push(step(11, 'Сообщества ВК + реанимация ФБ на диаспору — оформить под приём рекламного трафика.'));
children.push(step(12, 'Интервью преподавателей (Золотова, Каримова, Эльнара — слоты есть) → контент доверия.'));

children.push(phase('D', 'Платный трафик (недели 3–10, тест-план волнами)'));
children.push(step(13, 'Волна 1 — VK от ИП: look-alike покупателей + ретаргет визиторов. Тест 3–5 тыс ₽ на связку.'));
children.push(step(14, 'Волна 2 — Telegram: посевы в каналах психологов + Telegram Ads (eLama; помним — образование без льготы).'));
children.push(step(15, 'Волна 3 — Meta на диаспору (Кипр/Израиль/Германия/Сербия) с ООО. Google — фон, защита бренда МИГ.'));
children.push(step(16, 'Стоп-правила: канал потратил 150 € без регистрации / 400 € без заявки → стоп. Деньги — в лидера по цене ОПЛАТЫ.'));

children.push(phase('E', 'Вебинары и ДОД (недели 2–10, конвертер ×7)'));
children.push(step(17, 'ДОД 25.08 — первый живой вебинар: обкатать сценарий, замерить доходимость и конверсию (калибровка модели).'));
children.push(step(18, 'Регулярные живые вебинары по сильным темам (телесность/сексология даёт 100+ рег.) → приглашение на собеседование в эфире.'));
children.push(step(19, 'Автовебинар из лучшей записи — для холодного добора круглосуточно.'));
children.push(step(20, 'Напоминания за неделю / день / час (у образования доходимость ~31% — критично).'));

children.push(phase('F', 'Собеседования → оплата (недели 2–11)'));
children.push(step(21, 'Собеседования ведут Женя / Анжела: не экзамен, а разговор про случай и год. Квал-вопрос про даты ДО брони.'));
children.push(step(22, 'Конверсия собеседование→оплата ~60% [О]. Оффер: ранняя цена до 30.09, рассрочка первой строкой.'));
children.push(step(23, 'Онбординг оплативших (куратор + памятка) → задел на LTV и «Цифру».'));

children.push(phase('G', 'Замер и оптимизация (еженедельно)'));
children.push(step(24, 'Дашборд воронки по шагам: цена регистрации → доходимость → заявка → цена ОПЛАТЫ по каналу.'));
children.push(step(25, 'Еженедельная сверка: сколько из 60 закрыто, какой канал дешевле, куда переливать бюджет.'));
children.push(step(26, 'Держим CAC ≤ 250 €. Канал дороже и не дешевеет → стоп/переделка.'));

children.push(phase('H', 'Дожим к дедлайнам (честный, без фейков)'));
children.push(step(27, '30.09 — ранняя цена: за 1–2 недели усилить касания «раньше выгоднее» (реальный факт, не выдуманный таймер).'));
children.push(step(28, '04.11 — закрытие набора: финальная волна по тёплым + недозакрытым собеседованиям.'));
children.push(step(29, '04.12 — старт. Недобор до 60 — переводим в поток-2027 через автовебинар (база не пропадает).'));

// TIMELINE
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Таймлайн (21.08 → 04.12)'));
children.push(table([2200, 3100, 3400],
  ['Период', 'Фокус', 'Контрольная точка'],
  [
    ['Неделя 1 (сейчас)', 'Инфраструктура (A) + старт обзвона тёплых (B)', 'Пиксель стоит, менеджер звонит'],
    ['25.08', 'Первый ДОД (E) — калибровка', 'Реальные конверсии замерены'],
    ['Недели 2–4', 'Тёплый контур + контент + Волна 1 VK', 'Первые оплаты из тёплых'],
    ['до 30.09', 'Дожим ранней цены (H)', 'Пик оплат №1'],
    ['Недели 5–9', 'Платный трафик волнами + вебинары', 'Канал-лидер найден, масштаб'],
    ['до 04.11', 'Закрытие набора', 'Финальный счёт по 60'],
    ['04.12', 'Старт программы', 'Недобор → поток-2027'],
  ]));

// ROLES
children.push(H1('Кто что делает'));
children.push(table([2600, 6100],
  ['Роль', 'Зона'],
  [
    ['Тина (маркетинг)', 'стратегия, тексты, настройка рекламы, координация, отчёт по лидам'],
    ['Менеджер (0,5 ставки)', 'обзвон тёплых, собеседования-первичка, CRM'],
    ['Женя / Анжела', 'собеседования → оплата'],
    ['Александр + преподаватели', 'контент, вебинары, заверка клинических реплик'],
    ['СММ-подрядчик', 'контент-воронка по 6 шагам, сообщества'],
    ['Верстальщик / бот-мастер', 'лендинг, квиз, бот, пиксели'],
  ]));

// FROM INSTITUTE
children.push(H1('Что нужно от института (закрыть красное)'));
children.push(bullet('Цена «Практик» (ранняя/обычная) + условия рассрочки.'));
children.push(bullet('Дата ДОД + формат/длительность программы.'));
children.push(bullet('5 цифр для юнит-экономики (из «Реестра цифр») — уточнить реальный CAC/LTV.'));
children.push(bullet('Реальные отзывы/кейс выпускницы (с согласия).'));
children.push(bullet('Заверка клинических реплик бота у преподавателя.'));

// RISKS
children.push(H1('Честные риски'));
children.push(bullet([new TextRun({ text: 'Окно короче цикла. ', bold: true }), tr('Окно продаж ~79 дней (до 04.11), а цикл решения психолога — 100–200 дней. Тёплые решают быстрее (уже доверяют) — поэтому ставка на них. Холодные — задел на 2027.')]));
children.push(bullet([new TextRun({ text: '60 — амбициозная планка. ', bold: true }), tr('Реалистичный «твёрдый» результат — минимум 20 (порог), тёплая база + рефералы закрывают ядро. 60 требует, чтобы сработал ещё и платный поток.')]));
children.push(bullet([new TextRun({ text: 'Конверсии — оценка. ', bold: true }), tr('Первый ДОД 25.08 даст реальные цифры — после него пересчитаю модель и скажу, достижимы ли 60 при текущем бюджете.')]));
children.push(P([new TextRun({ text: 'Всё, что нужно для старта Фазы A–B, у нас уже готово (скрипт звонка, воронка, квиз, бот, тест-план, настройка VK). Скажите — запускаемся.', italics: true, size: 21, color: DARK })], { spacing: { before: 140 } }));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/playbook-60-praktik.docx', buf);
  console.log('OK');
});
