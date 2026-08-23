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
function bullet(runs) {
  return new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 55 },
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
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · после встречи с учредителем', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Итоги встречи с учредителем: решения, действия, флаги', bold: true, size: 30, color: DARK })] }),
  new Paragraph({ spacing: { after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Дата: 23.08.2026. По расшифровке встречи (запись 7). Свод для работы: что решено, дорожная карта, что подтвердить, честные риски.', { size: 20, color: GREY })] }),
);

children.push(H1('1. Что решено (стратегия этого потока)'));
children.push(bullet([new TextRun({ text: 'Продажи через ЗВОНКИ. ', bold: true }), tr('Менеджер звонит по базам → приглашает на ДОД → собеседование → оплата. Лид обрабатываем в течение часа/дня, не через неделю.')]));
children.push(bullet([new TextRun({ text: 'Вебинарная воронка и бот — ОТЛОЖЕНЫ ', bold: true }), tr('на следующий поток (к 04.12 качественно не успеть). Наш бот v3 — задел на будущее, не блокер.')]));
children.push(bullet([new TextRun({ text: 'Продаём ПРАКТИК. ', bold: true }), tr('Дорогой профессиональный — только по звонку-презентации.')]));
children.push(bullet([new TextRun({ text: 'Два потока разделены: ', bold: true }), tr('холодные звонки → новый менеджер (отдельные группы); реклама/сайт → текущий отдел продаж. Не воюем с текущим отделом.')]));

children.push(H1('2. Дорожная карта на 2 недели (ваши обещания)'));
children.push(table([4900, 2100, 1700],
  ['Задача', 'Срок', 'Статус'],
  [
    ['Сайт «Цифра» — правки + вёрстка', 'до конца след. недели', '🟡'],
    ['Сайт ППК — в стиле (вёрстка может позже)', 'до конца след. недели', '🟡'],
    ['Менеджер на звонки: посадить + обучить', 'со вторника', '🟡'],
    ['Рекламные кабинеты ВК + Meta', '2 недели', '🟡 (инструкция готова)'],
    ['Написать Саше про даты ДОД (сентябрь)', '—', '⬜'],
    ['4–5 видеоотзывов в Zoom (с Сашей)', 'понедельник', '⬜'],
    ['С Миленой: ВК-сообщество + 20 постов, реанимация ФБ', '—', '⬜'],
  ]));

children.push(H1('3. Что КРИТИЧНО подтвердить у МИГа'));
children.push(P([new TextRun({ text: '⚠️ Телефония с записью звонков — блокер №1. ', bold: true, color: RED }), tr('Без неё менеджер не сядет со вторника, и вся дорожная карта встаёт. Чёткого «да» в записи не было — добить письменно.')]));
children.push(bullet('Группы WhatsApp/Telegram на владении института (Саша/Женя создают).'));
children.push(bullet('Саша пишет преподавателям про даты сентябрьских ДОД (кто ставит задачу — не решено; это задача на день).'));

children.push(H1('4. Базы для звонков (бесплатный лидген)'));
children.push(table([4400, 1600, 2700],
  ['База', 'Объём', 'Ожидание'],
  [
    ['Бывшие студенты ППК (+Саша)', '55', '~3% оплат сразу'],
    ['Холодные из другого института', '500', '~10 оплат с 1 ДОД'],
    ['B17 спарсенная (у Саши, НЕ использована)', '6400', 'звонить/приглашать'],
    ['Отвалившиеся лиды', '~400', 'годовой прогрев + комьюнити'],
    ['B17 вручную (фильтр гештальт)', 'без лимита', 'по всем странам'],
  ]));
children.push(P([new TextRun({ text: 'Скрипт звонка у нас готов ', bold: true }), tr('(подарок 9 лекций → приглашение на ДОД). Рассрочку — проговаривать (банковская + Долями).')]));

children.push(H1('5. Что закрылось из наших «красных» placeholder’ов'));
children.push(bullet([new TextRun({ text: 'Рассрочка — ЕСТЬ ', bold: true, color: GREEN }), tr('(банковская + Долями). Ставим в тексты сайта, бота, скрипт возражения «дорого».')]));
children.push(bullet([new TextRun({ text: 'Реальные отзывы — БУДУТ ', bold: true, color: GREEN }), tr('(видео с письменным согласием, пн). Закрывает placeholder «кейс выпускницы» + можно в рекламу и на сайт.')]));
children.push(bullet([new TextRun({ text: '«Интервью» → «собеседование» ', bold: true }), tr('— правка учтена (уже так в наших текстах).')]));
children.push(P([new TextRun({ text: 'Осталось красным: ', bold: true }), tr('цена «Практик», точные даты сентябрьских ДОД, 5 цифр юнит-экономики из AlfaCRM.')]));

children.push(H1('6. Честные флаги (по правилу правды)'));
children.push(bullet([new TextRun({ text: 'Гипотеза «звонки дадут 10%» — ваша, из других сфер, ', bold: true }), tr('не проверена в психологии (вы сами это проговорили). Расчёт 1000→100→10 оптимистичен. Честный способ доказать — тест 50/50 (половина лидов в переписку, половина на звонки), сверить конверсию. Это снимет спор и с Женей.')]));
children.push(bullet([new TextRun({ text: 'Телефония — единственная точка отказа. ', bold: true, color: RED }), tr('Всё держится на ней. Если к вторнику не подключат — двигаем старт звонков, не менеджера виним.')]));
children.push(bullet([new TextRun({ text: 'Отдел продаж (РОП/хантеры) — не ваша зона и не решено. ', bold: true }), tr('Женя взял паузу, советуется с Сашей. Ваша граница (маркетинг/дизайн/кабинеты) — правильная. Не берите на себя стройку отдела продаж — это отдельная роль.')]));
children.push(bullet([new TextRun({ text: 'Напряжение с Валей — реально. ', bold: true }), tr('Параллельная ветвь (а не замена) — верный ход, чтобы не спровоцировать конфликт. Держитесь этой рамки.')]));

children.push(H1('7. Как наши готовые активы ложатся на новый фокус'));
children.push(table([3400, 5300],
  ['Актив (готов)', 'Куда идёт сейчас'],
  [
    ['Скрипт звонка + регламент', 'менеджер садится со вторника'],
    ['Тексты сайта ППК + квиз', 'верстальщику (вёрстка на след. неделе)'],
    ['Настройка ВК + Meta (инструкция)', 'кабинеты за 2 недели'],
    ['Тест-план каналов', 'посевы ВК 100 € + реклама на сайт'],
    ['План «60 Практиков»', 'общая рамка; ядро — тёплая база + звонки'],
    ['Бот v3 / вебинары', 'СЛЕДУЮЩИЙ поток (отложено)'],
  ]));

children.push(H1('8. Мои ближайшие шаги (предлагаю)'));
children.push(bullet('Обновить тексты сайта/скрипта: вписать рассрочку (банковская + Долями) как факт.'));
children.push(bullet('Подготовить ТЗ на видеоотзывы (пн): какие вопросы задать, чтобы отзыв продавал и годился в рекламу.'));
children.push(bullet('Собрать для менеджера пакет: скрипт + возражения + промо-кит + структура групп TG/WhatsApp.'));
children.push(bullet('Дожать чек-лист «что подтвердить у МИГа» (телефония!) — оформить одним сообщением Жене/Саше.'));
children.push(P([new TextRun({ text: 'Скажите, что берём первым — и с чего начать. Моя рекомендация: (1) пакет менеджера к вторнику, (2) ТЗ видеоотзывов к понедельнику. Они на ближайших дедлайнах.', italics: true, size: 21, color: DARK })], { spacing: { before: 120 } }));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/founder-meeting-tracker.docx', buf);
  console.log('OK');
});
