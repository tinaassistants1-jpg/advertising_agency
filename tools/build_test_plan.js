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

function tr(x, o = {}) { return new TextRun({ text: x, size: 20, ...o }); }
function P(runs, o = {}) {
  return new Paragraph({ spacing: { after: 90 }, children: Array.isArray(runs) ? runs : [tr(runs, { size: 22 })], ...o });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: DARK })] });
}
function H2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 70 },
    children: [new TextRun({ text, bold: true, size: 24, color: ACCENT })] });
}
function bullet(runs, level = 0) {
  return new Paragraph({ numbering: { reference: 'b', level }, spacing: { after: 55 },
    children: Array.isArray(runs) ? runs : [tr(runs, { size: 22 })] });
}
function cell(runs, { header = false, w, fill } = {}) {
  const arr = Array.isArray(runs) ? runs : [tr(runs, { bold: header, color: header ? 'FFFFFF' : '000000', size: 18 })];
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: (header || fill) ? { type: ShadingType.CLEAR, fill: header ? DARK : fill, color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    children: arr.map((a) => (a instanceof Paragraph ? a : new Paragraph({ children: [a] }))),
  });
}
function table(cols, headers, rows) {
  const TWt = cols.reduce((a, b) => a + b, 0);
  return new Table({ columnWidths: cols, width: { size: TWt, type: WidthType.DXA }, rows: [
    new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { header: true, w: cols[i] })) }),
    ...rows.map((r, ri) => new TableRow({ children: r.map((c, ci) =>
      cell(c, { w: cols[ci], fill: ri % 2 ? 'F5EFE8' : undefined })) })),
  ]});
}

const children = [];

children.push(
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · таргетолог', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Тест-план по каналам: ППК «Сложный случай»', bold: true, size: 34, color: DARK })] }),
  new Paragraph({ spacing: { after: 130 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Дата: 21.08.2026. Цель — за 2–3 недели найти канал(ы) с самой низкой ценой ОПЛАТЫ и держать CAC ≤ 250 € (реальная планка Тины). Бюджеты — ориентиры на бенчмарках; финальные суммы утверждает Тина.', { size: 20, color: GREY })] }),
);

// PRINCIPLE
children.push(H1('Принцип теста (как таргетолог принимает решение)'));
children.push(bullet([new TextRun({ text: 'Меряем цену ОПЛАТЫ, а не регистрации. ', bold: true }), tr('Дешёвая регистрация ≠ дешёвый студент. Деньги — в канал-лидер по стоимости оплаченного, а не заявки.')]));
children.push(bullet([new TextRun({ text: 'Планка CAC = 250 € ', bold: true }), tr('(факт Тины). Канал, где студент выходит дороже 250 € и не дешевеет, — останавливаем.')]));
children.push(bullet([new TextRun({ text: 'Один тест = одна переменная. ', bold: true }), tr('Не мешаем в одной группе разные аудитории/креативы — иначе не поймём, что сработало.')]));
children.push(bullet([new TextRun({ text: 'Запускаем волнами, ', bold: true }), tr('от самого тёплого и дешёвого к холодному и дорогому. Не всё сразу.')]));

// WAVES
children.push(H1('Очередь запуска (волны)'));
children.push(table([1500, 3400, 2400, 2100],
  ['Волна', 'Канал', 'Тип аудитории', 'Когда'],
  [
    ['Волна 0', 'Тёплая база: звонки менеджера + реактивация 200 студентов/пулов', 'Самая тёплая (знают МИГ)', 'Сразу (не реклама)'],
    ['Волна 1', 'VK Реклама от ИП: look-alike покупателей + ретаргет пикселя', 'Тёплая/похожая на купивших', 'После пикселя + доступа'],
    ['Волна 2', 'Telegram: посевы в каналах психологов + Telegram Ads (eLama)', 'Холодная целевая', '+1 неделя'],
    ['Волна 3', 'Meta на диаспору (ООО Черногория): Кипр, Израиль, Германия, Сербия', 'Холодная диаспора', 'Параллельно, отд. бюджет €'],
    ['Фон', 'Google Search — защита бренда МИГ (перехват «МИГиП/МГИ» путаницы)', 'Горячий спрос', 'Дёшево, постоянно'],
  ]));

// MATRIX (landscape-ish; keep portrait but compact)
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Матрица теста по каналам'));
children.push(P([tr('Легенда цен: ', { size: 18, color: GREY }), new TextRun({ text: '[Б]', bold: true, size: 17, color: ACCENT }), tr(' — бенчмарк рынка (не гарантия). Стоп-правила — из воронки ss-ad-funnel.', { size: 18, color: GREY })]));
children.push(table([1500, 1500, 2350, 1450, 2100],
  ['Канал', 'Гео / цель', 'Что тестируем (2–3 варианта)', 'Тест-бюджет [Б]', 'Стоп / целевой KPI'],
  [
    ['Тёплая база (звонки)', 'РФ+СНГ / запись на ДОД', 'Скрипт-подарок (9 лекций) → ДОД. Сегменты: студенты · пулы лидов · выпускники', '0 € (ФОТ менеджера)', 'KPI: доходимость до ДОД, оплаты. Ждём выше рекламы'],
    ['VK Реклама от ИП', 'РФ / регистрация на вебинар/ДОД', 'A: look-alike покупателей · B: ретаргет визиторов · C: интересы (психология)', '3–5 тыс ₽ на связку ×3 ≈ 10–15 тыс ₽', 'Стоп: 150 € без регистрации. Цель: рег. 80–200 ₽'],
    ['Telegram посевы', 'РФ / подписка в бот', '2–3 канала психологов разного размера', '5–10 тыс ₽', 'Цель: подписчик 150–250 ₽. Стоп: дорогой/накрутка'],
    ['Telegram Ads (eLama)', 'РФ / подписка в бот', 'Таргет по каналам психологии + смежное саморазвитие', 'вход ~250 € + комиссия (образование БЕЗ льготы ~20%) + НДС', 'Цель: подписчик ≤250 ₽. Дороже — в посевы'],
    ['Meta (ООО Черногория)', 'Кипр/Израиль/Германия/Сербия / рег. на автовебинар', 'По 1 гео: FB-группы-интересы + look-alike (когда пиксель наберёт)', '€100–150 на гео × 2 гео ≈ €200–300', 'Стоп: 400 € без заявки. Цель: цена рег. считаем свою'],
    ['Google бренд', 'Все гео / на сайт', 'Брендовые запросы МИГ + категорийные', '3–5 тыс ₽/мес', 'Дёшево; защита от путаницы брендов'],
  ]));
children.push(P([new TextRun({ text: 'Суммарный тестовый бюджет-ориентир: ', bold: true }), tr('~30–45 тыс ₽ (РФ-каналы) + ~€200–300 (Meta-диаспора отдельно, в евро с ООО). Это ОРИЕНТИР для оценки; финал утверждаете вы. Можно стартовать только с Волны 0–1 (тёплая база + VK) почти без бюджета и добавлять по мере результата.', {})]));

// METRICS
children.push(H1('Что меряем на каждом канале (единые метрики)'));
children.push(table([2600, 6100],
  ['Метрика', 'Зачем'],
  [
    ['Цена регистрации / подписчика', 'верх воронки — дёшево ли заходим'],
    ['Доходимость до вебинара/ДОД', 'у образования низкая (~31%) — следим отдельно'],
    ['Заявка на собеседование', 'середина воронки — реальный интерес'],
    ['Цена ОПЛАТЫ (CAC по каналу)', 'ГЛАВНАЯ. По ней распределяем бюджет'],
    ['Источник в AlfaCRM (UTM)', 'чтобы знать, какой канал дал студента'],
  ]));

// DECISION
children.push(H1('Как принимаем решение (через 2–3 недели)'));
children.push(bullet('Считаем по каждому каналу цену оплаченного студента (не регистрации).'));
children.push(bullet([new TextRun({ text: 'Канал-лидер ', bold: true }), tr('(ниже 250 € за студента) — доливаем бюджет, масштабируем на +10–20% каждые 3–5 дней (чтобы не сбить обучение алгоритма).')]));
children.push(bullet([new TextRun({ text: 'Канал-аутсайдер ', bold: true }), tr('(дороже 250 € и не дешевеет) — стоп или переделка креатива/аудитории.')]));
children.push(bullet('Первый ДОД 25.08 — калибровочная точка: замеряем реальную доходимость и конверсию, уточняем прогноз.'));

// PREREQS
children.push(H1('Обязательно ДО старта (иначе тест слепой)'));
children.push(bullet('Пиксели VK + Meta на лендинге (инструкция готова).'));
children.push(bullet('Доступ агентству к кабинету VK от ИП + выгрузка покупателей из AlfaCRM (сид look-alike).'));
children.push(bullet('Telegram-бот с лид-магнитом (9 лекций) — точка захвата.'));
children.push(bullet('UTM-метки на все ссылки + метка источника в AlfaCRM.'));
children.push(bullet('Кабинет Meta на ООО Черногория с евро-картой (для диаспоры).'));

// HONESTY
children.push(H1('Честные оговорки'));
children.push(bullet('Бенчмарки цен — ориентиры рынка, НЕ гарантия. Реальные цифры даст только наш тест.'));
children.push(bullet('Планка 250 € — ваш факт; LTV/юнит-экономику уточняем по AlfaCRM (5 цифр из «Реестра цифр»).'));
children.push(bullet('Льгота eLama НЕ распространяется на образование — Telegram Ads для нас дороже стандартных условий, учтено.'));
children.push(bullet([new TextRun({ text: 'Тексты объявлений ', bold: true }), tr('— через журналиста; без «гарантий/исцеления» (VK банит категорию психологии за это).')]));
children.push(P([new TextRun({ text: 'Следующий шаг после утверждения: ', bold: true, color: DARK }), tr('беру Волну 0–1 (скрипт звонка готов, настройка VK расписана) и запускаем. Скажите бюджет — адаптирую суммы под него.', {})], { spacing: { before: 140 } }));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/channel-test-plan.docx', buf);
  console.log('OK');
});
