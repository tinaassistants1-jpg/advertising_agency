const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType,
} = require('docx');
const fs = require('fs');

const ACCENT = 'C6633A';
const DARK = '1C1815';
const GREY = '6B6259';
const GREEN = '2E7D32';
const RED = 'B23A2E';

function tr(x, o = {}) { return new TextRun({ text: x, size: 20, ...o }); }

function cell(runs, { header = false, w, fill, align } = {}) {
  const children = Array.isArray(runs) ? runs : [tr(runs, { bold: header, color: header ? 'FFFFFF' : '000000' })];
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: (header || fill) ? { type: ShadingType.CLEAR, fill: header ? DARK : fill, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({ alignment: align || AlignmentType.LEFT, children })],
  });
}

// columns
const C = [2600, 1500, 1500, 3400];
const TW = C.reduce((a, b) => a + b, 0);

function headerRow(cells) {
  return new TableRow({ tableHeader: true, children: cells.map((txt, i) => cell(txt, { header: true, w: C[i] })) });
}
function row(name, value, status, src) {
  const isFact = status === 'ФАКТ';
  const statusRun = [tr(status, { bold: true, color: isFact ? GREEN : RED })];
  return new TableRow({ children: [
    cell([tr(name, { bold: true })], { w: C[0] }),
    cell(value, { w: C[1] }),
    cell(statusRun, { w: C[2], fill: isFact ? 'E8F0E6' : 'F5E5E2' }),
    cell(src, { w: C[3] }),
  ]});
}

function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, color: DARK })] });
}
function P(runs) {
  return new Paragraph({ spacing: { after: 100 }, children: Array.isArray(runs) ? runs : [tr(runs, { size: 22 })] });
}

const factRows = [
  row('Стоимость привлечения платящего клиента (сейчас)', '≈ 250 €', 'ФАКТ', 'Тина, 21.08.2026'),
  row('Цель ППК «Сложный случай»', '20 «Практиков» мин / 60 макс', 'ФАКТ', 'Тина'),
  row('Старт ППК / набор / ранняя цена', '04.12 / до 04.11 / до 30.09', 'ФАКТ', 'Тина'),
  row('Студентов в институте сейчас', '≈ 200 (158 базовый + др.)', 'ФАКТ', 'Александр (команда), 18.08'),
  row('Структура ППК', '16 модулей + 16 супервизий', 'ФАКТ', 'Александр'),
  row('Семинар «Через мифы к себе»', '10 000 ₽, 20 мест', 'ФАКТ', 'Тина / Александр'),
  row('Тест-бюджет семинара / общий', '5 000 ₽ / 20–30 тыс ₽', 'ФАКТ', 'Тина'),
];

const estRows = [
  row('Цена базового курса', '250 €/мес', 'ОЦЕНКА', 'Ресёрч рынка — подтвердить у института'),
  row('Годовой отток студентов', '30%', 'ОЦЕНКА', 'Бенчмарк ДПО 25–40% — НЕ данные МИГа'),
  row('Валовая маржа', '65%', 'ОЦЕНКА', 'Бенчмарк онлайн-школ 55–75% — НЕ данные МИГа'),
  row('LTV — выручка со студента', '≈ 6 330 €', 'ОЦЕНКА', 'Выведено из трёх допущений выше'),
  row('LTV — маржа со студента', '≈ 4 100 €', 'ОЦЕНКА', 'Выведено; НЕ факт'),
  row('«Потолок» CAC (край безубытка)', '650 / 1 350 €', 'ОЦЕНКА', 'Выведено из LTV — в материалы клиента НЕ ставим'),
  row('CAC 2025 / конверсия вебинара', '72 € / 7,2%', 'ОЦЕНКА', 'Требует подтверждения по AlfaCRM'),
  row('Цены «Цифра»', '200–800 €', 'ОЦЕНКА', 'Ресёрч — подтвердить прайс у института'),
];

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 900, right: 900 } } },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · дисциплина цифр', { size: 18, color: GREY })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Реестр цифр ППК: факт или оценка', bold: true, size: 38, color: DARK })] }),
      new Paragraph({ spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
        children: [tr('Дата: 21.08.2026. Правило: у каждой цифры — статус и источник. Зелёное (ФАКТ) можно показывать учредителю. Красное (ОЦЕНКА) — только для внутренних прикидок, в материалы клиента НЕ идёт, пока институт не подтвердит.', { size: 20, color: GREY })] }),

      H1('✅ Факты — подтверждены (можно опираться и показывать)'),
      new Table({ columnWidths: C, width: { size: TW, type: WidthType.DXA },
        rows: [headerRow(['Показатель', 'Значение', 'Статус', 'Источник']), ...factRows] }),

      H1('⚠️ Оценки — НЕ данные МИГа (проверить перед использованием)'),
      new Table({ columnWidths: C, width: { size: TW, type: WidthType.DXA },
        rows: [headerRow(['Показатель', 'Значение', 'Статус', 'Что подтвердить']), ...estRows] }),

      H1('Что нужно от института, чтобы «оценки» стали «фактами»'),
      P([tr('Пять цифр из AlfaCRM/бухгалтерии закрывают почти всю экономику:', { size: 22 })]),
      P([new TextRun({ text: '1. ', bold: true, size: 22 }), tr('Реальный средний чек (базовый курс, ППК, «Цифра»).', { size: 22 })]),
      P([new TextRun({ text: '2. ', bold: true, size: 22 }), tr('Сколько студентов переходит на следующую ступень (а сколько уходит).', { size: 22 })]),
      P([new TextRun({ text: '3. ', bold: true, size: 22 }), tr('Себестоимость одного студента (гонорары + площадка).', { size: 22 })]),
      P([new TextRun({ text: '4. ', bold: true, size: 22 }), tr('Реальная стоимость привлечения клиента по каналам (сейчас известно только среднее ≈250 €).', { size: 22 })]),
      P([new TextRun({ text: '5. ', bold: true, size: 22 }), tr('Конверсия и цена лида в прошлых запусках (вебинары 2025).', { size: 22 })]),
      P([new TextRun({ text: 'Дадите эти пять — пересчитаю юнит-экономику на ваших данных, и таблица станет полностью зелёной.', italics: true, size: 22, color: DARK })]),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/numbers-register.docx', buf);
  console.log('OK');
});
