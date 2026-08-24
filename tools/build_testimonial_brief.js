const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType,
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
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, bold: true, size: 27, color: DARK })] });
}
function H2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 190, after: 65 },
    children: [new TextRun({ text, bold: true, size: 23, color: ACCENT })] });
}
function bullet(runs) {
  return new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 55 },
    children: Array.isArray(runs) ? runs : [tr(runs)] });
}
function q(n, text) {
  return new Paragraph({ spacing: { after: 60 }, indent: { left: 420, hanging: 320 },
    children: [new TextRun({ text: n + '. ', bold: true, size: 21, color: BLUE }), new TextRun({ text: '«' + text + '»', size: 21 })] });
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
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'ТЗ на видеоотзывы студентов ППК', bold: true, size: 32, color: DARK })] }),
  new Paragraph({ spacing: { after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Дата: 23.08.2026. Для записи в Zoom (понедельник). Цель — живые продающие отзывы для соцсетей, сайта ППК и рекламы.', { size: 20, color: GREY })] }),
);

children.push(H1('1. Цель и принцип'));
children.push(P([new TextRun({ text: 'Цель: ', bold: true }), tr('видеоотзыв, который вызывает доверие и желание прийти на ППК. Не «реклама института», а честный рассказ коллеги.')]));
children.push(bullet([new TextRun({ text: 'Только правда. ', bold: true }), tr('Отзыв реальный, слова свои. Заученный текст и «рекламный» тон психологи считывают мгновенно — доверие падает. По закону о рекламе отзыв тоже должен быть достоверным.')]));
children.push(bullet([new TextRun({ text: 'Конкретика вместо общих слов. ', bold: true }), tr('«Мне очень понравилось» не продаёт. Продаёт «я перестала бояться клиентов с суицидальным риском — вот что изменилось».')]));
children.push(bullet([new TextRun({ text: 'Согласие — ДО записи. ', bold: true, color: RED }), tr('Подписать формы согласия перед съёмкой (иначе нельзя публиковать и давать в рекламу).')]));

children.push(H1('2. Кого приглашать'));
children.push(bullet('Выпускники ППК, у кого есть живой результат и кто готов говорить искренне.'));
children.push(bullet('Разные типажи: недавний выпускник и «матёрый», разные темы (травма, зависимости, РПП, телесность) — чтобы отзывы попадали в разных зрителей.'));
children.push(bullet('Кто уже согласен на письменное разрешение (по словам Саши — такие есть).'));

children.push(H1('3. Структура отзыва (продающая арка)'));
children.push(P([tr('Ведём человека по 5 шагам — так рассказ сам собой продаёт, без «купите». Не зачитывать, а разговорить вопросами (раздел 4).')]));
children.push(table([1500, 3400, 3800],
  ['Шаг', 'О чём', 'Что должно прозвучать'],
  [
    ['1. Кто я / точка А', 'кем был до программы', 'практикующий психолог, но было место, где замирал/боялся'],
    ['2. Боль', 'что не получалось', 'конкретный страх: сложный случай, нет опоры, не с кем разобрать'],
    ['3. Почему ППК', 'что выбрал и с сомнениями', 'что останавливало (цена/время) и почему всё же пошёл'],
    ['4. Что изменилось', 'точка Б, конкретно', 'супервизия, разбор своих случаев, «теперь беру то, что раньше боялся»'],
    ['5. Кому рекомендую', 'для кого программа', 'адресно: «если вы застреваете на сложном — вам сюда»'],
  ]));

children.push(H1('4. Вопросы для Zoom (разговорить, не зачитывать)'));
children.push(H2('Разогрев (в кадр не идёт)'));
children.push(q('0', 'Расскажите в двух словах, кто вы и сколько практикуете — просто чтобы освоиться.'));
children.push(H2('Точка А и боль'));
children.push(q('1', 'Вспомните момент ДО программы, когда в работе вы почувствовали, что упираетесь в потолок. Что это была за ситуация?'));
children.push(q('2', 'Был ли клиент или тема, перед которыми вы внутренне сжимались? Расскажите, не называя имён.'));
children.push(q('3', 'Чего вам тогда не хватало — знаний, опоры, чего-то ещё?'));
children.push(H2('Решение и сомнения'));
children.push(q('4', 'Что заставило вас выбрать именно ППК? Было ли что-то, что останавливало перед решением?'));
children.push(q('5', 'Что вы сказали бы себе тогдашнему, который сомневался?'));
children.push(H2('Точка Б — результат (самое важное)'));
children.push(q('6', 'Что конкретно изменилось в вашей работе после программы? Приведите пример.'));
children.push(q('7', 'Какой случай вы теперь берёте спокойно, хотя раньше побоялись бы?'));
children.push(q('8', 'Что вам дала супервизия — разбор своих случаев рядом с коллегами?'));
children.push(q('9', 'Что было для вас неожиданным, приятным открытием на программе?'));
children.push(H2('Рекомендация'));
children.push(q('10', 'Кому эта программа точно подойдёт? А кому, может быть, рано?'));
children.push(q('11', 'Если бы у вас была одна фраза для коллеги, который сомневается, — что бы вы сказали?'));
children.push(P([new TextRun({ text: 'Приём: ', bold: true }), tr('после ответа спрашивайте «а можно пример?» — примеры и есть то, что продаёт. Не торопите, дайте паузы.')]));

children.push(H1('5. Технические требования'));
children.push(table([3000, 5700],
  ['Параметр', 'Как надо'],
  [
    ['Запись', 'Zoom, включить запись; попросить спикера тоже сесть в тихом месте'],
    ['Кадр', 'по возможности снять ДВА варианта: горизонт (сайт) + вертикаль/квадрат (рилсы, сторис)'],
    ['Свет', 'лицо к окну или лампе, не против света; лицо хорошо видно'],
    ['Звук', 'тихая комната, наушники с микрофоном лучше встроенного; проверить до старта'],
    ['Фон', 'нейтральный, спокойный; без бардака и мелькания'],
    ['Длина', 'разговор 10–15 мин → нарежем; на каждого нужно 2–3 сильных фрагмента'],
    ['Дубли', 'если запнулся на важной мысли — попросить повторить спокойно ещё раз'],
  ]));

children.push(H1('6. Как используем (нарезка под форматы)'));
children.push(bullet([new TextRun({ text: 'Рилс/сторис 30–60 сек: ', bold: true }), tr('сильный крючок в первые 3 сек (боль или результат) → короткий рассказ → «если узнали себя — ссылка».')]));
children.push(bullet([new TextRun({ text: 'Отзыв на сайт 1–2 мин: ', bold: true }), tr('вся арка (А → боль → изменение → рекомендация).')]));
children.push(bullet([new TextRun({ text: 'В рекламу: ', bold: true }), tr('только с подписанным согласием (цель «реклама» отмечена в форме). Один отзыв = несколько нарезок под разные темы.')]));
children.push(bullet([new TextRun({ text: 'Субтитры обязательны ', bold: true }), tr('— большинство смотрит без звука.')]));

children.push(H1('7. Чего НЕ делать'));
children.push(bullet('Не давать зачитывать написанный текст — сразу видно, доверие падает.'));
children.push(bullet('Не подсказывать оценки («скажите, что это лучшая программа») — только свои слова.'));
children.push(bullet('Не обещать за спикера результат («вы точно станете крутым») — только его личный опыт.'));
children.push(bullet('Не публиковать до подписи согласия. Не раскрывать данные реальных клиентов спикера.'));

children.push(H1('8. Чек-лист перед записью'));
children.push(P([tr('☐ Подписаны формы согласия (изображение + распространение; GDPR — для ЕС)')]));
children.push(P([tr('☐ Проверены свет и звук у спикера')]));
children.push(P([tr('☐ Спикер знает 5 шагов арки, но говорит своими словами')]));
children.push(P([tr('☐ Запись Zoom включена')]));
children.push(P([tr('☐ После записи — отметить 2–3 лучших фрагмента и тему каждого')]));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/testimonial-brief.docx', buf);
  console.log('OK');
});
