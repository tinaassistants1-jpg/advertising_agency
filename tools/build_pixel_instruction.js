const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, LevelFormat, ExternalHyperlink
} = require('docx');
const fs = require('fs');

const ACCENT = 'C6633A';
const DARK = '1C1815';
const GREY = '6B6259';

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text, bold: true, size: 30, color: DARK })],
  });
}
function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, color: ACCENT })],
  });
}
function P(runs, opts = {}) {
  const children = Array.isArray(runs) ? runs : [new TextRun({ text: runs, size: 22 })];
  return new Paragraph({ spacing: { after: 100 }, children, ...opts });
}
function Bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { after: 60 },
    children: Array.isArray(text) ? text : [new TextRun({ text, size: 22 })],
  });
}
function Num(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'steps', level },
    spacing: { after: 60 },
    children: Array.isArray(text) ? text : [new TextRun({ text, size: 22 })],
  });
}
function code(t) {
  return new TextRun({ text: t, font: 'Consolas', size: 20, color: ACCENT });
}
function b(t) { return new TextRun({ text: t, bold: true, size: 22 }); }
function t(x) { return new TextRun({ text: x, size: 22 }); }

// simple 2-col table helper
function cell(text, { header = false, w } = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, fill: ACCENT, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: header, size: 20, color: header ? 'FFFFFF' : '000000' })],
    })],
  });
}

const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 260 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 900, hanging: 260 } } } },
      ]},
      { reference: 'steps', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 260 } } } },
      ]},
    ],
  },
  styles: {
    default: { document: { run: { font: 'Calibri', size: 22 } } },
  },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    children: [
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: 'Nova Leads · инструкция для Тины', size: 18, color: GREY })],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: 'Пиксели ВК и Meta на лендинг ППК', bold: true, size: 40, color: DARK })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
        children: [new TextRun({ text: 'Дата: 21.08.2026. Цель — трафик с рекламы ВК и Meta на лендинг, чтобы считать заявки и удешевлять рекламу.', size: 20, color: GREY })],
      }),

      H1('Зачем это нужно (простыми словами)'),
      P([t('Пиксель — это маленький невидимый код на сайте. Он считает, кто зашёл на лендинг и кто оставил заявку. '), b('Без пикселя реклама «слепая» и стоит в 2–3 раза дороже'), t(': алгоритм не понимает, кого ему приводить.')]),
      P([b('Нужны два пикселя: '), t('один от ВК Рекламы, второй от Meta (Facebook). Оба ставятся на лендинг один раз — 10 минут работы разработчика.')]),

      H1('Пиксель ВК — где взять'),
      Num([b('Зайти в ВК Рекламу '), t('(ads.vk.com) под кабинетом ИП МИГа.')]),
      Num([t('Меню слева → '), b('«Аудитории»'), t(' → вкладка '), b('«Пиксель»'), t(' (или «Пиксели»).')]),
      Num([t('Кнопка '), b('«Создать пиксель»'), t('. Имя: '), code('MIG_PPK'), t('.')]),
      Num([t('Скопировать код — он начинается с '), code('<script>'), t(' и содержит слово VK. Прислать разработчику или мне.')]),

      H1('Пиксель Meta (Facebook) — где взять'),
      P([b('Важно: '), t('делать под кабинетом ООО (Черногория), НЕ под РФ. Meta работает в евро на европейское юрлицо.')]),
      Num([t('Зайти на '), b('business.facebook.com'), t(' под кабинетом ООО.')]),
      Num([t('Меню → '), b('Events Manager'), t(' (Управление событиями).')]),
      Num([b('«Подключить источник данных»'), t(' → выбрать '), b('«Веб»'), t(' → создать пиксель. Имя: '), code('MIG_PPK'), t('.')]),
      Num([t('Скопировать код пикселя. Прислать разработчику или мне.')]),

      H1('Куда вставить (задача разработчика)'),
      Bullet([t('Оба кода — в раздел '), code('<head>'), t(' лендинга, на '), b('все страницы'), t('.')]),
      Bullet([b('Если лендинг на Tilda: '), t('Настройки сайта → «Аналитика и SEO» → поле «HTML-код в head» → вставить оба кода.')]),
      Bullet([b('Если другой конструктор: '), t('искать поле «код в head» / «интеграции» / «пользовательский код».')]),

      H1('Событие «заявка» (обязательно)'),
      P([t('Попросить разработчика повесить на кнопку заявки (форма ДОД / вебинар / лид-магнит) событие. Тогда реклама учится приводить не «зевак», а тех, кто оставляет заявку.')]),
      (function () {
        const W = 9000, c1 = 4500, c2 = 4500;
        return new Table({
          columnWidths: [c1, c2],
          width: { size: W, type: WidthType.DXA },
          rows: [
            new TableRow({ tableHeader: true, children: [cell('Платформа', { header: true, w: c1 }), cell('Название события', { header: true, w: c2 })] }),
            new TableRow({ children: [cell('ВК Реклама', { w: c1 }), cell('submit_lead', { w: c2 })] }),
            new TableRow({ children: [cell('Meta', { w: c1 }), cell('Lead', { w: c2 })] }),
          ],
        });
      })(),

      H1('Как проверить, что пиксель работает'),
      Num([t('Зайти на свой лендинг с телефона или компьютера.')]),
      Num([t('Через 10–20 минут открыть кабинет — у пикселя статус станет '), b('зелёный / «получены данные»'), t('.')]),
      Num([t('Оставить тестовую заявку → в Events Manager / ВК должно появиться событие '), code('Lead'), t(' / '), code('submit_lead'), t('.')]),

      H1('Что мне прислать после настройки'),
      Bullet('Ссылку на лендинг ППК.'),
      Bullet('Подтверждение, что оба пикселя стоят и статус зелёный.'),
      Bullet('Доступ агентству к кабинету ВК от ИП (роль с правом создавать аудитории и кампании).'),
      P([b('Дальше по плану: '), t('выгрузка покупателей из AlfaCRM → сид → look-alike → запуск рекламы ВК и Meta на лендинг. Настройка сидов уже расписана отдельно.')], { spacing: { before: 120, after: 40 } }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/pixel-instruction.docx', buf);
  console.log('OK');
});
