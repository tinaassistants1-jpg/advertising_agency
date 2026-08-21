const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType,
} = require('docx');
const fs = require('fs');

const ACCENT = 'C6633A';
const DARK = '1C1815';
const GREY = '6B6259';
const BLUE = '2F5D8A';

function tr(x, o = {}) { return new TextRun({ text: x, size: 20, ...o }); }
function P(runs, o = {}) {
  return new Paragraph({ spacing: { after: 100 }, children: Array.isArray(runs) ? runs : [tr(runs, { size: 22 })], ...o });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: DARK })] });
}
function H2(text, color = ACCENT) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color })] });
}

function cell(runs, { header = false, w, fill, bold } = {}) {
  const children = Array.isArray(runs) ? runs : [tr(runs, { bold: header || bold, color: header ? 'FFFFFF' : '000000' })];
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: (header || fill) ? { type: ShadingType.CLEAR, fill: header ? DARK : fill, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: children.map((c) => new Paragraph({ children: [c] })),
  });
}

// Stage table: 5 columns
const C = [1450, 2050, 2450, 1650, 1400];
const TW = C.reduce((a, b) => a + b, 0);

function stageHeader() {
  return new TableRow({ tableHeader: true, children:
    ['Шаг воронки', 'Цель шага', 'Форматы контента', 'Ведёт на след. шаг (призыв)', 'Метрика'].map((t, i) => cell(t, { header: true, w: C[i] })) });
}
function stageRow(a, b, c, d, e, fill) {
  return new TableRow({ children: [
    cell([tr(a, { bold: true, color: BLUE })], { w: C[0], fill }),
    cell(b, { w: C[1], fill }),
    cell(c, { w: C[2], fill }),
    cell(d, { w: C[3], fill }),
    cell(e, { w: C[4], fill }),
  ]});
}

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    properties: { page: { size: { width: 15840, height: 12240 }, orientation: 'landscape',
      margin: { top: 800, bottom: 800, left: 800, right: 800 } } },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · ТЗ для СММ-менеджера', { size: 18, color: GREY })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Контент-воронка продаж ППК «Сложный случай»', bold: true, size: 36, color: DARK })] }),
      new Paragraph({ spacing: { after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
        children: [tr('Дата: 21.08.2026. Это НЕ контент-план (календарь постов), а воронка: у каждого поста есть работа — довести психолога от «не знает нас» до «студент ППК». Цифры-конверсии — ориентир по рынку, не факт МИГа.', { size: 20, color: GREY })] }),

      P([new TextRun({ text: 'Аудитория: ', bold: true, size: 22 }), tr('психологи — практикующие 3–5 лет, студенты 2–3 ступени, кто мечтает уверенно брать сложные случаи. Продукт-цель: тариф «Практик» в ППК. Второй продукт для допродажи: «Цифра».', { size: 22 })]),

      new Table({ columnWidths: C, width: { size: TW, type: WidthType.DXA }, rows: [
        stageHeader(),
        stageRow('1. Охват (незнакомцы)',
          'Попасть в ленту психолога, которого мы не знаем',
          'Рилсы/клипы на «сложные темы» (крючки Золотовой: суицид, острое горе, РПП, зависимости). Полезное + живой язык терапевта',
          'Досмотр → подписка на сообщество/канал',
          'Охват, досмотр, подписки', 'FFFFFF'),
        stageRow('2. Доверие (подписчик)',
          'Доказать: МИГ умеет разбирать сложное',
          'Разбор ОДНОГО случая, интервью преподавателей, «как я думаю над случаем», отрывки записей (~20 готово)',
          'Сохранение, коммент → «забери запись/лекции»',
          'Сохранения, комменты, переходы', 'F3EEE9'),
        stageRow('3. Захват контакта',
          'Получить контакт в бота (вход в воронку)',
          'Пост-анонс лид-магнита: 9 лекций / запись вебинара в обмен на подписку в Telegram-бота',
          'Клик → подписка в бота (пиксель ловит)',
          'Кол-во контактов, цена контакта', 'FFFFFF'),
        stageRow('4. Рассмотрение (лид)',
          'Показать, ЧТО такое ППК и чем отличается',
          'Как устроены 16 супервизий, кто преподаёт, отзывы студентов (с согласия), «как ложится в год»',
          'Регистрация на живой вебинар / ДОД',
          'Регистрации на вебинар', 'F3EEE9'),
        stageRow('5. Продажа',
          'Довести до оплаты',
          'Живой продающий вебинар → приглашение на собеседование; серия писем/сообщений бота',
          'Заявка на собеседование → оплата',
          'Собеседования, оплаты', 'FFE9E2'),
        stageRow('6. Удержание, допродажа',
          'Поднять LTV и запустить сарафан',
          'Контент для студентов, кейсы, анонс «Цифра», «приведи коллегу»',
          'Покупка «Цифры» / реферал',
          'Повторные покупки, рефералы', 'FFFFFF'),
      ]}),

      H1('Как это отличается от обычного контент-плана'),
      P([new TextRun({ text: '• Каждый пост привязан к шагу воронки. ', bold: true, size: 22 }), tr('Если пост не двигает человека вниз — он не выходит.', { size: 22 })]),
      P([new TextRun({ text: '• Метрика — не лайки, а заявки и оплаты. ', bold: true, size: 22 }), tr('СММ отчитывается «сколько контактов и регистраций дал контент», а не «сколько охватов».', { size: 22 })]),
      P([new TextRun({ text: '• Каждый пост имеет призыв. ', bold: true, size: 22 }), tr('Нет «просто пользы» — есть «посмотри → подпишись → забери → зарегистрируйся».', { size: 22 })]),

      H1('Что требуем от СММ-менеджера (ТЗ в 5 пунктах)'),
      P([new TextRun({ text: '1. Раскладку контента по 6 шагам, ', bold: true, size: 22 }), tr('а не «10 постов на неделю». Сколько единиц контента на каждый шаг.', { size: 22 })]),
      P([new TextRun({ text: '2. У каждого поста — цель и призыв ', bold: true, size: 22 }), tr('(на какой шаг ведёт).', { size: 22 })]),
      P([new TextRun({ text: '3. UTM-метки на все ссылки ', bold: true, size: 22 }), tr('— чтобы видеть, какой пост дал заявку.', { size: 22 })]),
      P([new TextRun({ text: '4. Еженедельный отчёт по воронке: ', bold: true, size: 22 }), tr('контакты, регистрации, заявки — не охваты.', { size: 22 })]),
      P([new TextRun({ text: '5. Работа с готовым: ', bold: true, size: 22 }), tr('~20 записей и темы Золотовой — это банк контента, новые гайды под лидген не делаем.', { size: 22 })]),

      H1('Каналы под воронку'),
      P([new TextRun({ text: 'Шаги 1–2 (охват, доверие): ', bold: true, size: 22 }), tr('рилсы ВК/Telegram-канал, сообщество ВК, реанимация ФБ на диаспору.', { size: 22 })]),
      P([new TextRun({ text: 'Шаг 3 (захват): ', bold: true, size: 22 }), tr('Telegram-бот + лендинг с пикселем.', { size: 22 })]),
      P([new TextRun({ text: 'Шаги 4–5 (рассмотрение, продажа): ', bold: true, size: 22 }), tr('вебинар + собеседование + рассылка бота + email.', { size: 22 })]),
      P([new TextRun({ text: 'Реклама (ВК/Meta) ', bold: true, size: 22 }), tr('усиливает шаги 1 и 3 — гонит трафик в охват и на захват контакта.', { size: 22 })]),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/content-funnel-ppk.docx', buf);
  console.log('OK');
});
