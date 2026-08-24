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
function H2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 65 },
    children: [new TextRun({ text, bold: true, size: 23, color: ACCENT })] });
}
function say(text) {
  return new Paragraph({ spacing: { after: 80 }, indent: { left: 300 },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: ACCENT, space: 10 } },
    children: [new TextRun({ text: '«' + text + '»', italics: true, size: 21, color: '2B2622' })] });
}
function note(runs) {
  return new Paragraph({ spacing: { after: 80 }, indent: { left: 300 },
    children: [new TextRun({ text: '↳ ', bold: true, size: 19, color: GREY }),
      ...(Array.isArray(runs) ? runs : [tr(runs, { size: 19, color: GREY })])] });
}
function ph(text) {
  return new Paragraph({ spacing: { after: 80 },
    children: [new TextRun({ text: '[ПОДТВЕРДИТЬ: ' + text + ']', bold: true, size: 19, color: RED })] });
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
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · для МИГ', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Пакет менеджера по звонкам (ППК «Сложный случай»)', bold: true, size: 30, color: DARK })] }),
  new Paragraph({ spacing: { after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Дата: 23.08.2026. Всё, с чем менеджер садится звонить. Воронка: звонок → ДОД → собеседование → оплата. Звонит человек, не робот.', { size: 20, color: GREY })] }),
);

// 1 ROLE
children.push(H1('1. Роль, цель, главное правило'));
children.push(P([new TextRun({ text: 'Цель звонка — НЕ продать сходу, ', bold: true }), tr('а по-человечески пригласить на День открытых дверей (ДОД). Продажа — дальше: на ДОД и собеседовании.')]));
children.push(bullet([new TextRun({ text: 'Обрабатывать быстро: ', bold: true }), tr('заявку/контакт — в течение часа или того же дня. Промедление = потеря лида.')]));
children.push(bullet([new TextRun({ text: 'Тон: ', bold: true }), tr('спокойный, тёплый, коллегиальный. Мы звоним коллегам-психологам, не «впариваем».')]));
children.push(bullet([new TextRun({ text: 'Две базы — два скрипта: ', bold: true }), tr('тёплая (уже знают МИГ) и холодная (не знают). Ниже оба.')]));

// 2 LEGAL
children.push(H1('2. Юридическая гигиена (обязательно)'));
children.push(bullet([new TextRun({ text: 'Только живой звонок. ', bold: true, color: RED }), tr('Без робота-автообзвона.')]));
children.push(bullet([new TextRun({ text: 'Согласие голосом перед отправкой. ', bold: true }), tr('Прежде чем слать материалы — спросить разрешение, отметить в CRM.')]));
children.push(bullet([new TextRun({ text: 'Стоп-лист. ', bold: true }), tr('Сказал «не звоните» — заносим, больше не набираем.')]));
children.push(bullet([new TextRun({ text: 'Время звонков ', bold: true }), tr('— рабочие часы; для разных стран учитывать часовой пояс.')]));

// 3 WARM SCRIPT
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('3. Скрипт А — ТЁПЛАЯ база'));
children.push(P([new TextRun({ text: 'Кому: ', bold: true }), tr('бывшие студенты ППК (55), отвалившиеся лиды (~400), кто уже знает институт.')]));
children.push(H2('Открытие'));
children.push(say('Здравствуйте, [Имя]! Это [Имя менеджера], менеджер Международного института гештальта. Буквально пара минут — удобно?'));
children.push(note('неудобно → «когда лучше перезвонить?» → записать, попрощаться.'));
children.push(H2('Суть + прогрев'));
children.push(say('Хочу коротко рассказать про наше обновление: мы обновили программу повышения квалификации «Сложный случай» — новые темы, преподаватели. И приглашаю вас на День открытых дверей, посмотреть вживую.'));
children.push(say('И важное: у нас появилась рассрочка — банковская и «Долями». Так что вопрос оплаты теперь решается мягче.'));
children.push(ph('точная дата/время ближайшего ДОД + новые темы/преподаватели этого потока'));
children.push(H2('Если не готов на ДОД — подарок'));
children.push(say('Если пока не до этого — у нас есть подборка из 9 лекций по сложным случаям. Полезно для практики. Прислать? Куда удобнее — в Telegram или WhatsApp?'));
children.push(note([tr('90% скажут «да». Это лид-магнит, который дальше снова ведёт на ДОД. ', {}), new TextRun({ text: 'Сразу добавляем в группу по выбранному мессенджеру.', bold: true })]));

// 4 COLD SCRIPT
children.push(H1('4. Скрипт Б — ХОЛОДНАЯ база'));
children.push(P([new TextRun({ text: 'Кому: ', bold: true }), tr('500 из другого института, 6400 с B17, B17 вручную (фильтр гештальт). Не знают МИГ.')]));
children.push(H2('Открытие'));
children.push(say('Здравствуйте, [Имя]! Меня зовут [Имя менеджера], я из Международного института гештальта. Нашла вас как практикующего психолога. Удобно минуту?'));
children.push(H2('Подарок первый (располагает)'));
children.push(say('Мы открываем программу по работе со сложными случаями и дарим коллегам подборку из 9 лекций — суицидальный риск, острое горе, РПП, зависимости. Без условий, просто в подарок. Куда прислать — Telegram или WhatsApp?'));
children.push(H2('Мост к ДОД'));
children.push(say('И приглашаю на День открытых дверей: преподаватели вживую разбирают один сложный случай, можно задать вопросы. Вход свободный. Записать вас и прислать ссылку вместе с лекциями?'));
children.push(note('согласие голосом → добавить в группу → отправить обещанное сразу.'));

// 5 OBJECTIONS
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('5. Работа с возражениями'));
children.push(table([2400, 6300],
  ['Возражение', 'Что ответить'],
  [
    ['«Дорого»', 'Появилась рассрочка — банковская и «Долями», можно частями. Давайте покажу на ДОД, как программа окупается для практики. (Часто «дорого» = «нет возможности сейчас» — рассрочка снимает.)'],
    ['«Нет времени»', 'Понимаю. Расписание известно на год вперёд — пятница раз в две недели. На ДОД покажем сетку, вы сами оцените, ложится ли. Прислать ссылку?'],
    ['«Уже учился на ППК»', 'Темы каждый год разные — в этом потоке [новые темы]. Многие возвращаются. Приглашаю на вебинар-знакомство с новой темой / на ДОД.'],
    ['«Подумаю»', 'Конечно. Лекции всё равно пришлю — посмотрите в удобное время. И ссылку на ДОД оставлю, решите ближе к дате.'],
    ['«Я не в гештальте»', 'Программа про работу со сложными случаями — полезна в любом подходе. На ДОД честно скажем, подойдёт ли вам.'],
    ['«Пришлите в мессенджер»', 'Да, сейчас пришлю в [Telegram/WhatsApp] и добавлю в нашу группу, где вся информация и ответы на вопросы.'],
  ]));

// 6 AFTER CALL
children.push(H1('6. Что делать сразу после звонка'));
children.push(bullet('Внести результат в CRM: согласие / подумает / отказ / стоп-лист + пометить базу (тёплая/холодная, источник).'));
children.push(bullet('Добавить в группу по выбранному мессенджеру (Telegram или WhatsApp).'));
children.push(bullet('Отправить обещанное (9 лекций + ссылка на ДОД) — в тот же день.'));
children.push(bullet('Поставить себе напоминание довести до ДОД (см. раздел 7).'));

// 7 DRIVE TO ODD
children.push(H1('7. Доведение до ДОД (вручную, не рассылками)'));
children.push(P([new TextRun({ text: 'Принцип встречи: ', bold: true }), tr('всех, кто получил лид-магнит или согласился, доводим до ДОД ЛИЧНО — не автописьмами.')]));
children.push(bullet('За несколько дней до ДОД — личное сообщение/звонок: «ждём вас, вот ссылка».'));
children.push(bullet('За 1 день и за 2 часа — короткое напоминание.'));
children.push(bullet([new TextRun({ text: 'Подбор слота: ', bold: true }), tr('«во сколько вам удобно?» → предложить ближайший ДОД в удобное время (в сентябре их несколько).')]));
children.push(bullet([new TextRun({ text: 'После ДОД — по горячим следам: ', bold: true }), tr('позвонить дошедшим и записать на собеседование, пока интерес живой.')]));

// 8 PROMO KIT
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('8. Промо-кит (что отправлять)'));
children.push(table([3000, 5700],
  ['Материал', 'Когда отправлять'],
  [
    ['Ссылка на сайт ППК', 'всем заинтересованным (подробности программы)'],
    ['9 лекций (лид-магнит)', 'кто не готов сразу / как подарок в холодную'],
    ['Ссылка на регистрацию ДОД', 'кто согласился прийти'],
    ['Видеоотзывы выпускников', 'для сомневающихся (когда будут готовы, с согласия)'],
    ['Картинки/маркетинг-кит (темы, преподаватели)', 'в переписке для наглядности'],
    ['Инфо про рассрочку (банковская + Долями)', 'при возражении «дорого»'],
  ]));
children.push(ph('ссылки: сайт ППК, регистрация ДОД, папка лид-магнита (9 лекций); цена «Практик»'));

// 9 GROUPS
children.push(H1('9. Группы Telegram / WhatsApp'));
children.push(bullet([new TextRun({ text: 'Владение — на МИГе ', bold: true }), tr('(создаёт Саша/Женя, для корпоративной безопасности). Менеджер ведёт.')]));
children.push(bullet('Две группы: Telegram и WhatsApp — человека добавляем туда, где ему удобнее.'));
children.push(bullet('В группе: анонсы ДОД, ответы на вопросы, полезные материалы, отзывы. Это «тёплая комната» перед ДОД.'));

// 10 KPI
children.push(H1('10. KPI и ежедневный отчёт'));
children.push(table([4400, 4300],
  ['Метрика (в день/неделю)', 'Зачем'],
  [
    ['Сделано звонков', 'объём работы'],
    ['Дозвонов (взяли трубку)', 'качество базы + время звонков'],
    ['Записей на ДОД', 'главный промежуточный результат'],
    ['Дошли до ДОД', 'качество доведения'],
    ['Собеседований / оплат', 'итог'],
  ]));
children.push(P([new TextRun({ text: 'Формат: ', bold: true }), tr('таблица, заполняется каждый день. Раз в неделю — сверка конверсии (звонок → ДОД → оплата). Звонки записываются (телефония) — для обучения и качества.')]));
children.push(P([new TextRun({ text: 'Оплата менеджера: ', bold: true }), tr('фикс + % с оплаты. Стартовый фикс — по договорённости.')]));

// 11 CHECKLIST
children.push(H1('11. Чек-лист первого дня'));
children.push(P([tr('☐ Телефония с записью подключена и проверена')]));
children.push(P([tr('☐ Группы Telegram и WhatsApp созданы (владение МИГа)')]));
children.push(P([tr('☐ Скрипты А и Б под рукой, отрепетированы')]));
children.push(P([tr('☐ Ссылки готовы: сайт, регистрация ДОД, 9 лекций')]));
children.push(P([tr('☐ Дата ближайшего ДОД известна')]));
children.push(P([tr('☐ CRM открыта, поля для отметок готовы')]));
children.push(P([tr('☐ Стоп-лист заведён')]));

children.push(P([new TextRun({ text: 'Красное (цена, дата ДОД, ссылки, телефония) закрывается ответами от МИГа — как придут, пакет полностью боевой.', italics: true, size: 21, color: DARK })], { spacing: { before: 120 } }));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/manager-pack.docx', buf);
  console.log('OK');
});
