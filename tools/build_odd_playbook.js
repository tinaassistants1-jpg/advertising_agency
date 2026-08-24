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
    children: [new TextRun({ text, bold: true, size: 27, color: DARK })] });
}
function H2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 190, after: 65 },
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
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Онлайн День открытых дверей: сценарий на запись в собеседование', bold: true, size: 28, color: DARK })] }),
  new Paragraph({ spacing: { after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Дата: 23.08.2026. Цель ДОД — не «рассказать про институт», а довести МАКСИМУМ дошедших до записи на собеседование. Формат — онлайн (Zoom), ~2 часа.', { size: 20, color: GREY })] }),
);

// PRINCIPLE
children.push(H1('1. Главный принцип (почему массово записываются)'));
children.push(P([tr('Люди записываются на собеседование не потому, что их дожали, а потому что: (1) получили реальную ценность и увидели силу метода, (2) поняли, что собеседование — лёгкий и полезный шаг, а не экзамен, (3) есть честная причина не откладывать.')]));
children.push(table([3000, 5700],
  ['Рычаг массовости', 'Как реализуем на ДОД'],
  [
    ['Ценность вперёд', 'живой разбор одного сложного случая — зритель видит, КАК думает терапевт'],
    ['Низкий порог собеседования', '«это не экзамен, а разговор про ваш случай и ваш год» — не страшно'],
    ['Настоящая причина сейчас', 'ранняя цена до 30.09 + ограниченные слоты собеседований (реально, без фейка)'],
    ['Социальное доказательство', '5 видеоотзывов выпускников (с согласия) — показать фрагмент'],
    ['Снятие барьера «потяну ли»', 'честно про «как ложится в год» + рассрочка (банковская + Долями)'],
    ['Запись прямо в эфире', 'ссылка + QR в момент пика интереса, менеджер дожимает по горячим следам'],
  ]));

// TIMING
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('2. Тайминг ДОД (~2 часа)'));
children.push(table([1500, 2600, 4600],
  ['Время', 'Блок', 'Что происходит'],
  [
    ['0–10 мин', 'Открытие', 'Кто в эфире, правило «камеры включаем», «запись будет всем». Снять тревогу, задать рамку. Попросить в чате: откуда вы и с какой темой тяжелее всего'],
    ['10–70 мин', 'ЯДРО: разбор случая', 'Преподаватель вживую разбирает ОДИН сложный случай (конкретный, не тему). Показывает ход мысли. Вовлекает зал: «а вы что бы сделали?»'],
    ['70–85 мин', 'Мост к программе', 'Экскурсия: «такие случаи мы разбираем в супервизиях — вот как устроено». НЕ продажа, а показ механики (см. раздел 4)'],
    ['85–100 мин', 'Приглашение + отзывы', 'Фрагмент видеоотзыва. Приглашение на собеседование + оффер (ранняя цена, рассрочка). Ссылка + QR в чат'],
    ['100–120 мин', 'Вопросы', 'Каждый вопрос про даты/деньги → отвечаем через «как ложится в год» + «это разберём на собеседовании». Повторяем ссылку'],
  ]));

// WHAT TO SAY ABOUT PPK
children.push(H1('3. Что говорить про ППК (как обозначить программу)'));
children.push(P([new TextRun({ text: 'Принцип: не пересказ учебного плана, а ОТВЕТ на боль. ', bold: true }), tr('Психолог пришёл, потому что застревает на сложном. Программу подаём как опору.')]));
children.push(H2('Скелет рассказа (3 минуты, в блоке «мост»)'));
children.push(say('«Случай, который мы сейчас разобрали, — это ровно то, чем мы занимаемся в программе. Только там это ВАШИ реальные случаи, и рядом супервизор».'));
children.push(say('«Программа «Сложный случай» — это год: 16 учебных модулей и 16 супервизий. Сердце — супервизорские группы, где вы приносите случай, который не идёт, и вместе с преподавателем видите то, что в одиночку не заметить».'));
children.push(say('«Мы не обходим тяжёлое стороной — суицидальный риск, острое горе, РПП, зависимости, телесность. Учимся с этим работать в опоре, а не в тревоге».'));
children.push(say('«Старт 4 декабря, расписание известно на год вперёд — пятница раз в две недели. Есть рассрочка: банковская и Долями».'));
children.push(P([new TextRun({ text: 'Чего НЕ делать: ', bold: true, color: RED }), tr('не зачитывать список тем как программу вуза, не обещать «станете гуру», не давить.')]));
children.push(ph('точные новые темы/преподаватели потока; цена «Практик» (ранняя/обычная); условия рассрочки'));

// HOW TO DRIVE SIGNUP
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('4. Как обозначить собеседование, чтобы записывались массово'));
children.push(H2('Переформатировать смысл собеседования'));
children.push(say('«Следующий шаг — не оплата, а разговор. Собеседование это не экзамен и не проверка. Это 30 минут про ВАШ случай и ВАШ год: подходит ли вам программа именно сейчас, как она ляжет в вашу практику. Даже если решите не идти — уйдёте с ясностью».'));
children.push(note('это снимает страх («вдруг не пройду») и делает шаг желанным, а не рискованным.'));
children.push(H2('Дать честную причину не откладывать'));
children.push(bullet([new TextRun({ text: 'Ранняя цена до 30.09 ', bold: true }), tr('— реальный дедлайн, называем спокойно: «раньше — выгоднее, это просто факт».')]));
children.push(bullet([new TextRun({ text: 'Ограниченные слоты собеседований ', bold: true }), tr('— если правда ограничены (Женя/Анжела ведут): «мест на собеседования на этой неделе N, дальше — следующая волна». Только если это ПРАВДА.')]));
children.push(P([new TextRun({ text: 'НИКОГДА: ', bold: true, color: RED }), tr('фейковые таймеры, «осталось 2 места» неправда. Психологи считывают — потеряем всех.')]));
children.push(H2('Механика записи в эфире'));
children.push(bullet('В момент приглашения — ссылка на запись + QR-код на слайд (продублировать в чат 2–3 раза).'));
children.push(bullet('Квал-вопрос при записи: «на какой ваш случай хотите опору?» — человек уже думает о своём, вовлекается.'));
children.push(bullet('Попросить прямо: «сейчас, пока помните, — запишитесь, выберите удобное время».'));
children.push(bullet([new TextRun({ text: 'Дожим по горячим следам: ', bold: true }), tr('менеджер звонит/пишет дошедшим в тот же день — записывает тех, кто заинтересовался, но не оставил заявку.')]));
children.push(ph('ссылка на форму записи на собеседование + слоты Женя/Анжела'));

// ONLINE ENGAGEMENT
children.push(H1('5. Как удержать онлайн (чтобы досидели до конца)'));
children.push(bullet('Камеры включены (просьба на входе) — живой контакт, а не вебинар «в пустоту».'));
children.push(bullet('Каждые 7–10 минут — вопрос в чат/руку: «а вы бы как?». Пауза без действий = отвал.'));
children.push(bullet('Разбор ОДНОГО случая целиком (интрига: чем закончится) — держит до финала.'));
children.push(bullet('Обещать в начале: «в конце дам [полезное] и отвечу на вопросы» — причина досидеть.'));
children.push(bullet('Не читать со слайдов монотонно — живая речь, истории, эмоция.'));

// ROLES
children.push(H1('6. Роли на ДОД'));
children.push(table([2600, 6100],
  ['Кто', 'Что делает'],
  [
    ['Преподаватель-ведущий', 'разбор случая, экспертность, «мост» к супервизиям'],
    ['Ведущий-модератор (Тина или менеджер)', 'открытие/закрытие, следит за чатом, вбрасывает ссылку/QR, продающая часть оффера'],
    ['Менеджер', 'фиксирует, кто заинтересовался; дожим по горячим следам после эфира'],
    ['Женя / Анжела', 'проводят собеседования (следующий шаг)'],
  ]));

// AFTER
children.push(H1('7. После ДОД (не терять дошедших)'));
children.push(bullet('В тот же день — письмо/сообщение дошедшим: «спасибо, вот следующий шаг — собеседование» + ссылка + запись эфира.'));
children.push(bullet('Недошедшим — запись + «почему стоит прийти на собеседование».'));
children.push(bullet('Менеджер звонит по горячим следам (раздел 4), записывает на собеседование.'));
children.push(bullet('Замерить: регистраций → дошло → записались на собеседование → оплат. Это калибрует всю модель.'));

// CHECKLIST
children.push(H1('8. Чек-лист подготовки'));
children.push(P([tr('☐ Выбран конкретный случай для разбора (сильная тема — телесность/сексология даёт много рег.)')]));
children.push(P([tr('☐ Слайд с QR + ссылкой на запись на собеседование готов')]));
children.push(P([tr('☐ Фрагмент видеоотзыва (30–60 сек) готов к показу')]));
children.push(P([tr('☐ Цифры под рукой: старт 04.12, ранняя цена до 30.09, рассрочка')]));
children.push(P([tr('☐ Менеджер готов дожимать по горячим следам в тот же день')]));
children.push(P([tr('☐ Ссылка на запись эфира — разослать после')]));

children.push(P([new TextRun({ text: 'Красное (цена, темы потока, ссылка на собеседование, слоты) — от МИГа. Как придёт, сценарий полностью боевой. Первый ДОД 25.08 — заодно замерим реальные конверсии.', italics: true, size: 21, color: DARK })], { spacing: { before: 120 } }));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/odd-playbook.docx', buf);
  console.log('OK');
});
