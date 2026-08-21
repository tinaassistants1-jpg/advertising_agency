const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  BorderStyle, ShadingType, AlignmentType,
} = require('docx');
const fs = require('fs');

const ACCENT = 'C6633A';
const DARK = '1C1815';
const GREY = '6B6259';
const BLUE = '2F5D8A';
const RED = 'B23A2E';

function tr(x, o = {}) { return new TextRun({ text: x, size: 22, ...o }); }
function P(runs, o = {}) {
  return new Paragraph({ spacing: { after: 90 }, children: Array.isArray(runs) ? runs : [tr(runs)], ...o });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: DARK })] });
}
function msgHeader(n, when, goal) {
  return new Paragraph({ spacing: { before: 240, after: 40 },
    shading: { type: ShadingType.CLEAR, fill: DARK, color: 'auto' },
    children: [new TextRun({ text: `СООБЩЕНИЕ ${n}  ·  ${when}  ·  цель: ${goal}`, bold: true, size: 21, color: 'FFFFFF' })] });
}
// message body line (the actual bot text)
function body(text) {
  return new Paragraph({ spacing: { after: 80 }, indent: { left: 300 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 12 } },
    children: [tr(text)] });
}
function ph(text) {
  return new Paragraph({ spacing: { after: 80 }, indent: { left: 300 },
    children: [new TextRun({ text: '[ПОДТВЕРДИТЬ: ' + text + ']', bold: true, size: 20, color: RED })] });
}
function cta(text) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text: 'Кнопка: ', bold: true, size: 22 }), tr(text, { italics: true })] });
}

const children = [];

children.push(
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · воронка бота ППК', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Цепочка бота: 6 сообщений', bold: true, size: 34, color: DARK })] }),
  new Paragraph({ spacing: { after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Человек попал в бот (через квиз/лид-магнит), получил 9 лекций. Дальше — прогрев до ДОД и собеседования. Тон: коллегиальный, польза вперёд, продажа мягко.', { size: 20, color: GREY })] }),
  new Paragraph({ spacing: { after: 150 },
    children: [new TextRun({ text: '⚠️ Черновик — до публикации вычитка журналистом. Реальные кейсы/цены — только с подтверждения (красным).', bold: true, size: 20, color: RED })] }),
);

children.push(H1('Принципы цепочки'));
children.push(P([tr('• Никакой фейковой срочности («осталось 2 места», поддельные таймеры) — психологи считывают мгновенно и уходят.')]));
children.push(P([tr('• Дедлайн настоящий: ранняя цена до 30 сентября — её и называем, честно.')]));
children.push(P([tr('• Каждое сообщение сначала даёт пользу, потом — мягкий шаг дальше. Если человек не готов — лекции остаются с ним.')]));

// MSG 1
children.push(msgHeader(1, 'сразу после входа', 'отдать подарок + кто такой МИГ'));
children.push(body('Здравствуйте! Держите обещанное — подборка из 9 лекций преподавателей по сложным темам: суицидальный риск, острое горе, зависимости, РПП. Начните с любой, которая ближе прямо сейчас. [ссылка]'));
children.push(body('Коротко о нас: мы — Международный институт гештальта. Учим психологов не обходить тяжёлое стороной, а работать с ним в опоре на супервизию. Без «волшебных техник» — по-честному.'));
children.push(body('Если после лекций появятся вопросы — просто напишите сюда, я рядом.'));
children.push(cta('нет кнопки — это тёплое первое касание'));

// MSG 2
children.push(msgHeader(2, '+1 день', 'вовлечь: показать способ мышления'));
children.push(body('Один короткий случай для размышления. Клиентка приходит с тем, что «просто считает калории». Ещё через месяц выясняется — она не была в кафе с друзьями полгода, потому что там «нельзя контролировать еду».'));
children.push(body('Вопрос не в еде. Вопрос — где здесь граница между привычкой, тревогой и уже расстройством, и что с этим делает терапевт. Именно такие развилки мы разбираем в программе — не тему «РПП», а конкретный живой случай.'));
children.push(body('Как вам зашли лекции? Какая тема оказалась самой вашей?'));
children.push(cta('нет кнопки — вовлечение через вопрос'));

// MSG 3
children.push(msgHeader(3, '+2 дня', 'мост к программе + приглашение на ДОД'));
children.push(body('Если лекции откликнулись — расскажу, как это устроено в полном формате. Программа «Сложный случай» — это год, где вы разбираете реальные трудные случаи под супервизией: 16 модулей и 16 супервизорских групп.'));
children.push(body('Сердце — супервизии. Вы приносите свой случай, который «не идёт», и вместе с преподавателем и группой видите то, что в одиночку не заметить. Это то, за чем психологи возвращаются.'));
children.push(body('Ближайший шаг ни к чему не обязывает — День открытых дверей. Преподаватели вживую разбирают один случай, можно задать вопросы и посмотреть, как всё устроено.'));
children.push(ph('точная дата и время ближайшего ДОД'));
children.push(cta('«Записаться на День открытых дверей»'));

// MSG 4
children.push(msgHeader(4, '+4 дня (кто не записался)', 'снять барьер «потяну ли по времени/деньгам»'));
children.push(body('Самый честный вопрос, который задают перед программой: «а я потяну — по времени и по деньгам?». Отвечу прямо.'));
children.push(body('По времени: занятия — по пятницам раз в две недели и супервизии по понедельникам, всё расписание известно заранее, на год вперёд. Можно спланировать, а не «жить в неизвестности».'));
children.push(ph('условия рассрочки — есть ли, на сколько частей; цена тарифа «Практик»'));
children.push(body('По деньгам: есть рассрочка [если подтверждено], и до 30 сентября действует ранняя цена. Это не «успей купить», а просто честный факт — раньше выгоднее.'));
children.push(cta('«Посмотреть программу на ДОД»'));

// MSG 5
children.push(msgHeader(5, '+6 дней', 'доверие через реальную историю'));
children.push(body('Хочу поделиться историей — как коллега прошла этот путь.'));
children.push(ph('реальный кейс выпускницы/студентки — с её согласия. НЕ выдумываем. Если кейса нет — заменить на голос преподавателя: короткий фрагмент про то, как супервизия меняет работу'));
children.push(body('Если хотите увидеть эту атмосферу вживую и понять, ваше это или нет — приходите на День открытых дверей. Там всё честно: и сильные стороны программы, и для кого она НЕ подходит.'));
children.push(cta('«Прийти на День открытых дверей»'));

// MSG 6
children.push(msgHeader(6, '+8 дней', 'честный дедлайн + приглашение на собеседование'));
children.push(body('Последнее сообщение из этой серии — без давления. Программа стартует 4 декабря, набор идёт сейчас, а ранняя цена держится до 30 сентября. Дальше — обычная стоимость.'));
children.push(body('Если чувствуете, что это ваш год — следующий шаг не оплата, а разговор. Собеседование: не экзамен, а спокойная беседа о вашем случае и вашем годе. Поможем понять, подходит ли вам программа именно сейчас.'));
children.push(body('А если сейчас не время — это тоже нормально. Лекции остаются с вами, и я на связи, когда будете готовы.'));
children.push(cta('«Записаться на разговор (собеседование)»  +  «Записаться на ДОД»'));

// AFTER
children.push(H1('Что дальше, если заявки нет'));
children.push(P([tr('Долгий прогрев: 1 полезное касание в неделю (короткий разбор случая / фрагмент лекции) до следующего дедлайна или потока. Человек не «дожимается», а остаётся в тёплом контакте.')]));

children.push(H1('Данные, которые закроют красное'));
children.push(P([tr('• Дата и время ближайшего ДОД.')]));
children.push(P([tr('• Цена тарифа «Практик» и условия рассрочки.')]));
children.push(P([tr('• Реальный кейс выпускницы (с согласия) — для сообщения 5.')]));
children.push(P([new TextRun({ text: 'Дадите — заполню, отдам журналисту на вычитку, и цепочку можно грузить в бота.', italics: true, size: 22, color: DARK })]));

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/bot-chain-6-messages.docx', buf);
  console.log('OK');
});
