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

function tr(x, o = {}) { return new TextRun({ text: x, size: 22, ...o }); }
function P(runs, o = {}) {
  return new Paragraph({ spacing: { after: 100 }, children: Array.isArray(runs) ? runs : [tr(runs)], ...o });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: DARK })] });
}
function H2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 70 },
    children: [new TextRun({ text, bold: true, size: 24, color: ACCENT })] });
}
function bullet(runs, level = 0) {
  return new Paragraph({ numbering: { reference: 'b', level }, spacing: { after: 60 },
    children: Array.isArray(runs) ? runs : [tr(runs)] });
}
// speech line: manager says
function say(text) {
  return new Paragraph({ spacing: { after: 90 }, indent: { left: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 12 } },
    children: [new TextRun({ text: '«' + text + '»', italics: true, size: 22, color: '2B2622' })] });
}
function note(runs) {
  return new Paragraph({ spacing: { after: 90 },
    children: [new TextRun({ text: '↳ ', bold: true, size: 20, color: GREY }),
      ...(Array.isArray(runs) ? runs : [tr(runs, { size: 20, color: GREY })])] });
}

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } },
    { level: 1, format: 'bullet', text: '–', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 900, hanging: 260 } } } },
  ]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · онбординг менеджера продаж', { size: 18, color: GREY })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Скрипт звонка + регламент менеджера', bold: true, size: 38, color: DARK })] }),
      new Paragraph({ spacing: { after: 180 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
        children: [tr('Дата: 21.08.2026. Воронка А: база → живой звонок → приглашение на День открытых дверей (ДОД) → собеседование → оплата. Звонит человек, НЕ робот.', { size: 20, color: GREY })] }),

      H1('1. Роль и цель менеджера'),
      P([tr('Цель звонка — ', {}), tr('НЕ продать сходу', { bold: true }), tr('. Цель — по-человечески познакомить с институтом, подарить пользу и пригласить на День открытых дверей. Продажа происходит дальше: на ДОД и собеседовании.')]),
      bullet([tr('Один звонок = одна задача: ', { bold: true }), tr('довести до записи на ДОД (или до согласия получить материалы).')]),
      bullet([tr('Тон: ', { bold: true }), tr('спокойный, коллегиальный, без давления и «впаривания». Мы звоним коллегам-психологам.')]),

      H1('2. Юридическая гигиена — обязательно'),
      P([tr('Это защищает институт от штрафов ФАС (ст.18 ФЗ «О рекламе»). Нарушение — штраф даже за одну жалобу.', { color: RED })]),
      bullet([tr('Только живой звонок. ', { bold: true, color: RED }), tr('Никакого робота-автообзвона и автодозвона.')]),
      bullet([tr('Согласие голосом перед отправкой. ', { bold: true }), tr('Прежде чем слать что-либо в мессенджер/на почту — спросить разрешение и зафиксировать в CRM («клиент согласен получить материалы»).')]),
      bullet([tr('Без масс-СМС и масс-email ', { bold: true }), tr('по холодной базе без согласия — запрещено.')]),
      bullet([tr('Стоп-лист. ', { bold: true }), tr('Сказал «не звоните» — заносим в стоп-лист, больше не набираем. Ведём отдельный список.')]),
      bullet([tr('Время звонков ', { bold: true }), tr('— рабочие часы, без раннего утра и позднего вечера.')]),

      H1('3. Скрипт звонка (с ветками)'),

      H2('А. Открытие (15 секунд — снять напряжение)'),
      say('Здравствуйте, [Имя]! Меня зовут [Имя], я из Международного института гештальта. Вам сейчас удобно минуту поговорить?'),
      note([tr('Если «неудобно» → ', {}), tr('«Когда лучше перезвонить?»', { italics: true }), tr(' — записать время, попрощаться.')]),

      H2('Б. Зачем звоню + подарок (без условий)'),
      say('Мы сейчас открываем программу по работе со сложными случаями в терапии. И я звоню коллегам, чтобы подарить нашу подборку — 9 лекций преподавателей по сложным темам: суицидальный риск, острое горе, РПП, зависимости. Просто в подарок, без всяких условий. Подскажете, куда удобнее прислать — в Telegram или на почту?'),
      note([tr('Ключ: ', { bold: true }), tr('подарок первый, безусловно. Это располагает и даёт законное согласие на отправку.')]),

      H2('В. Мост к Дню открытых дверей'),
      say('И ещё — у нас скоро День открытых дверей: преподаватели вживую разбирают один сложный случай, можно задать вопросы и посмотреть, как устроена программа. Вход свободный. Хотите, я вас запишу и пришлю ссылку вместе с лекциями?'),
      note([tr('Если «да» → ', {}), tr('взять подтверждение даты, записать в CRM, отправить обещанное сразу после звонка.')]),

      H2('Г. Ветки ответов'),
      P([tr('Согласие: ', { bold: true, color: GREEN }), tr('«Отлично! Записала вас. Сегодня же пришлю лекции и ссылку на ДОД. До встречи!»')]),
      P([tr('Сомнение («подумаю»): ', { bold: true, color: BLUE }), tr('«Конечно. Лекции всё равно пришлю — посмотрите в удобное время. А ссылку на ДОД оставлю, решите ближе к дате. Хорошо?»')]),
      P([tr('Отказ: ', { bold: true }), tr('«Поняла, спасибо! Хорошего дня.» — без давления, занести результат в CRM.')]),
      P([tr('«Не звоните мне»: ', { bold: true, color: RED }), tr('«Извините за беспокойство, вношу в список — больше не побеспокоим.» → стоп-лист.')]),
      P([tr('Не взял трубку: ', { bold: true }), tr('перезвон 1 раз в другое время. Не дозвонились дважды — оставить в покое (не долбить).')]),

      H1('4. Что делать сразу после звонка'),
      bullet('Внести результат в CRM: согласие / подумает / отказ / стоп-лист.'),
      bullet('Отправить обещанное (лекции + ссылку на ДОД) — в тот же день, пока тёплый контакт.'),
      bullet('Поставить напоминание: за 1 день и за 2 часа до ДОД — короткое сообщение «ждём вас».'),
      bullet([tr('Пометить источник ', {}), tr('(какая база, какой список) — чтобы считать, что работает.')]),

      H1('5. KPI и мотивация (структура — суммы впишет Тина)'),
      bullet([tr('Фикс + процент с оплаты. ', { bold: true }), tr('Оклад за процесс (звонки, дисциплина CRM) + % за результат (оплаченные студенты).')]),
      bullet([tr('Метрики процесса: ', { bold: true }), tr('дозвонов в день, записей на ДОД, доходимость до ДОД.')]),
      bullet([tr('Метрики результата: ', { bold: true }), tr('собеседований, оплат. Главная — оплаты.')]),
      note([tr('Конкретные суммы фикса и % не проставляю — это ваше решение и внутренние данные. Дам ориентир, если пришлёте вилку бюджета на сотрудника.', { size: 20, color: GREY })]),

      H1('6. Телефония (что нужно завести)'),
      bullet('Онлайн-телефония с записью разговоров (для обучения и качества).'),
      bullet('Интеграция с CRM (AlfaCRM), чтобы звонки и статусы были в одном месте.'),
      bullet('Отдельный рабочий номер (не личный менеджера).'),

      H1('7. Чего НЕ делаем (чтобы не было жалоб)'),
      bullet([tr('Не давим, не звоним по 5 раз, не спорим с отказом.', {})]),
      bullet([tr('Не отправляем ничего без устного согласия.', {})]),
      bullet([tr('Не используем робота и автодозвон.', {})]),
      bullet([tr('Не обещаем того, чего нет (реальные даты, реальная программа).', {})]),

      P([tr('Следующий документ — скрипт собеседования ', { italics: true, color: DARK }), tr('(шаг после ДОД: Женя / Анжела → оффер → оплата). Сделаю по вашему сигналу.', { italics: true, color: DARK })], { spacing: { before: 160 } }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/manager-call-script.docx', buf);
  console.log('OK');
});
