const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  BorderStyle, AlignmentType, ShadingType, Table, TableRow, TableCell, WidthType,
} = require('docx');
const fs = require('fs');

const ACCENT = 'C6633A';
const DARK = '1C1815';
const GREY = '6B6259';
const BLUE = '2F5D8A';
const GREEN = '2E7D32';
const RED = 'B23A2E';

function tr(x, o = {}) { return new TextRun({ text: x, size: 22, ...o }); }
function P(runs, o = {}) {
  return new Paragraph({ spacing: { after: 90 }, children: Array.isArray(runs) ? runs : [tr(runs)], ...o });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: DARK })] });
}
function H2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 210, after: 70 },
    children: [new TextRun({ text, bold: true, size: 24, color: ACCENT })] });
}
function screen(label) {
  return new Paragraph({ spacing: { before: 210, after: 70 },
    shading: { type: ShadingType.CLEAR, fill: DARK, color: 'auto' },
    children: [new TextRun({ text: label, bold: true, size: 21, color: 'FFFFFF' })] });
}
function q(text) {
  return new Paragraph({ spacing: { before: 150, after: 50 },
    children: [new TextRun({ text, bold: true, size: 23, color: BLUE })] });
}
function opt(letter, text, pts) {
  return new Paragraph({ spacing: { after: 40 }, indent: { left: 360 },
    children: [
      new TextRun({ text: letter + ') ', bold: true, size: 22 }),
      tr(text),
      new TextRun({ text: '  — ' + pts + ' балл' + (pts === 1 ? '' : pts === 0 ? 'ов' : 'а'), size: 18, italics: true, color: GREY }),
    ] });
}
function result(range, title, color, body, cta) {
  const arr = [
    new Paragraph({ spacing: { before: 160, after: 50 },
      children: [new TextRun({ text: range + ' — «' + title + '»', bold: true, size: 24, color })] }),
  ];
  body.forEach((b) => arr.push(new Paragraph({ spacing: { after: 80 }, indent: { left: 260 },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color, space: 10 } },
    children: [tr(b)] })));
  arr.push(new Paragraph({ spacing: { after: 120 }, indent: { left: 260 },
    children: [new TextRun({ text: 'CTA: ', bold: true, size: 22 }), tr(cta, { italics: true })] }));
  return arr;
}

const children = [];

children.push(
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · лид-магнит для лендинга ППК', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Квиз «Готовы ли вы к сложному случаю?»', bold: true, size: 34, color: DARK })] }),
  new Paragraph({ spacing: { after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Диагностический квиз-самооценка для психолога. Захватывает контакт → ведёт на ДОД. Не продающий тест: результат честный (психологи считывают манипуляцию мгновенно).', { size: 20, color: GREY })] }),
  new Paragraph({ spacing: { after: 150 },
    children: [new TextRun({ text: '⚠️ Черновик копирайтера — перед публикацией вычитка журналистом. Цифру «85% клиницистов» перед сайтом подтвердить в первоисточнике.', bold: true, size: 20, color: RED })] }),
);

children.push(H1('Логика квиза (для верстальщика/квиз-мастера)'));
children.push(P([tr('Цель — не «продать тестом», а дать психологу честное зеркало: где у него опора, а где нет. Это располагает и бьёт в реальную профтревогу. Механика: интро → 7 вопросов → экран захвата контакта → персональный честный результат + подарок (9 лекций) + приглашение на ДОД.')]));
children.push(P([new TextRun({ text: 'Почему так, а не «пройди тест и купи»: ', bold: true }), tr('исследования (Раздел V) — психологи уходят от искусственного давления. Наш козырь — честность и польза.')]));

// INTRO
children.push(H1('Экраны квиза'));
children.push(screen('ЭКРАН 0 · ИНТРО (первый экран квиза)'));
children.push(P([new TextRun({ text: 'Заголовок: ', bold: true }), tr('«Готовы ли вы к сложному случаю? Профессиональная самодиагностика за 2 минуты».')]));
children.push(P([new TextRun({ text: 'Подзаголовок: ', bold: true }), tr('«7 вопросов о том, что реально приходит в кабинет — суицидальный риск, горе, зависимости, РПП. Честный результат + подборка из 9 лекций преподавателей в подарок».')]));
children.push(P([new TextRun({ text: 'Кнопка: ', bold: true }), tr('«Начать самодиагностику».')]));

// QUESTIONS
children.push(screen('ВОПРОСЫ (каждый — один экран, вариант = балл)'));

children.push(q('Вопрос 1. Клиент говорит, что не хочет жить, появляются суицидальные мысли. Что ближе к вам?'));
children.push(opt('А', 'Знаю, как оценить риск, чувствую опору и действую', 2));
children.push(opt('Б', 'Справляюсь, но внутри — сильная тревога', 1));
children.push(opt('В', 'Теряюсь, беру паузу «подумать», теряю контакт', 0));

children.push(q('Вопрос 2. Клиент застрял в горе годами — оно не отпускает.'));
children.push(opt('А', 'Понимаю, где норма, а где осложнённое горе, и веду', 2));
children.push(opt('Б', 'Работаю интуитивно, без чёткой опоры', 1));
children.push(opt('В', 'Не уверен, где грань и куда двигаться', 0));

children.push(q('Вопрос 3. Пищевое поведение клиента — на грани с психиатрией (РПП).'));
children.push(opt('А', 'Знаю, где моя зона, а где нужен психиатр', 2));
children.push(opt('Б', 'Работаю, но границу нащупываю на ходу', 1));
children.push(opt('В', 'Боюсь навредить, избегаю таких клиентов', 0));

children.push(q('Вопрос 4. Зависимость (алкоголь, ПАВ) — у клиента или в его семье.'));
children.push(opt('А', 'Есть рамка: понимаю семейную динамику и 12 шагов', 2));
children.push(opt('Б', 'Отчасти, но системно не выстроено', 1));
children.push(opt('В', 'Чувствую себя некомпетентно в этой теме', 0));

children.push(q('Вопрос 5. Когда случай по-настоящему трудный — есть куда его «отнести»?'));
children.push(opt('А', 'Да — регулярная супервизия или интервизия', 2));
children.push(opt('Б', 'Иногда, несистемно', 1));
children.push(opt('В', 'Нет, разбираюсь в одиночку', 0));

children.push(q('Вопрос 6. Телесность, травма насилия, разрушенная сексуальность.'));
children.push(opt('А', 'Есть подготовка и опора, чтобы туда идти', 2));
children.push(opt('Б', 'Касаюсь осторожно', 1));
children.push(opt('В', 'Обхожу стороной', 0));

children.push(q('Вопрос 7. Что вы чувствуете перед по-настоящему сложным клиентом?'));
children.push(opt('А', 'Интерес и собранность', 2));
children.push(opt('Б', 'Смешанное: интерес и тревога', 1));
children.push(opt('В', 'Страх навредить, замирание', 0));

// LEAD CAPTURE
children.push(screen('ЭКРАН ЗАХВАТА КОНТАКТА (перед показом результата)'));
children.push(P([new TextRun({ text: 'Текст: ', bold: true }), tr('«Ваш результат готов. Куда прислать разбор + подборку из 9 лекций по сложным темам?»')]));
children.push(P([new TextRun({ text: 'Поля: ', bold: true }), tr('Имя · Telegram или email (одно обязательное). Галочка согласия на обработку данных (152-ФЗ).')]));
children.push(P([new TextRun({ text: 'Кнопка: ', bold: true }), tr('«Показать результат и забрать лекции».')]));
children.push(P([new TextRun({ text: 'Важно: ', bold: true, color: RED }), tr('результат показываем В ЛЮБОМ случае (не прячем за платой) — иначе теряем доверие. Контакт — за подарок (9 лекций), а не за результат.')]));

// RESULTS
children.push(screen('РЕЗУЛЬТАТЫ (сумма баллов 0–14)'));
result('11–14 баллов', 'Крепкая опора', GREEN,
  ['У вас уже есть каркас для сложной работы — и это редкость. Но даже опытные терапевты растут в супервизорском сообществе, где случай можно разобрать не в одиночку.',
   'ППК «Сложный случай» — это не «база заново», а углубление и живая супервизия рядом с коллегами вашего уровня.'],
  '«Посмотрите программу вживую на Дне открытых дверей» → запись на ДОД.').forEach((c) => children.push(c));
result('6–10 баллов', 'Вы в пути', BLUE,
  ['Вы уже работаете, но по части тем опоры пока нет — и это нормально, так у большинства практиков. Разница между «справляюсь» и «уверен» — это супервизия и разбор реальных случаев.',
   'Ровно это — сердце ППК: 16 супервизий, где вы приносите свой трудный случай и получаете поддержку.'],
  '«Приходите на разбор одного случая на Дне открытых дверей» → запись на ДОД.').forEach((c) => children.push(c));
result('0–5 баллов', 'Честный старт', ACCENT,
  ['Вы честны с собой — а это первый профессиональный навык. Тревога перед сложным клиентом есть у большинства терапевтов (по исследованиям — до 85% клиницистов называют её барьером в работе с суицидальными клиентами). Вы не одни.',
   'ППК даёт то, чего не хватает в одиночной практике: опору, супервизию и рамку для самых тяжёлых тем.'],
  '«Начните с Дня открытых дверей — это ни к чему не обязывает» → запись на ДОД.').forEach((c) => children.push(c));

// TECH
children.push(H1('Технические требования (квиз-мастеру / верстальщику)'));
children.push(P([new TextRun({ text: 'Инструмент: ', bold: true }), tr('Marquiz / Тilda-квиз / встроенный квиз лендинга — что удобнее. Главное — контакт падает в CRM (AlfaCRM) или на почту/в Telegram.')]));
children.push(P([new TextRun({ text: 'События пикселя на отправку контакта: ', bold: true }), new TextRun({ text: 'submit_lead', font: 'Consolas', size: 20, color: ACCENT }), tr(' (VK) и '), new TextRun({ text: 'Lead', font: 'Consolas', size: 20, color: ACCENT }), tr(' (Meta).')]));
children.push(P([new TextRun({ text: 'UTM: ', bold: true }), tr('сохранять источник (какой канал привёл) вместе с заявкой.')]));
children.push(P([new TextRun({ text: 'Автоотправка: ', bold: true }), tr('после заявки — сразу письмо/сообщение в бот с 9 лекциями + ссылка на ДОД.')]));
children.push(P([new TextRun({ text: 'Мобильная версия: ', bold: true }), tr('в приоритете — большинство пройдут с телефона.')]));
children.push(P([new TextRun({ text: 'Длина: ', bold: true }), tr('7 вопросов — не удлинять (чем короче, тем выше доходимость до конца).')]));

// NOTES
children.push(H1('Оговорки (честно)'));
children.push(P([tr('• Результаты не «пугают, чтобы продать» — они правдивы и полезны. Это осознанный выбор под аудиторию психологов.')]));
children.push(P([tr('• Цифра «85% клиницистов» — из исследования (Community Mental Health J., 2024), собранного через поисковую выдачу; перед публикацией на сайте подтвердить в первоисточнике или убрать конкретный процент, оставив «у большинства терапевтов».')]));
children.push(P([tr('• Перед запуском — вычитка журналистом (правило агентства).')]));

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/ppk-quiz.docx', buf);
  console.log('OK');
});
