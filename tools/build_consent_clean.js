const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  BorderStyle, AlignmentType, PageBreak,
} = require('docx');
const fs = require('fs');

function tr(x, o = {}) { return new TextRun({ text: x, size: 24, font: 'Times New Roman', ...o }); }
function P(runs, o = {}) {
  return new Paragraph({ spacing: { after: 130 }, alignment: AlignmentType.JUSTIFIED,
    children: Array.isArray(runs) ? runs : [tr(runs)], ...o });
}
function center(text, o = {}) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text, font: 'Times New Roman', ...o })] });
}
function fieldline(label) {
  return new Paragraph({ spacing: { after: 150 },
    children: [tr(label + ' '), new TextRun({ text: '________________________________________________', font: 'Times New Roman', size: 24 })] });
}
function num(n, runs) {
  return new Paragraph({ spacing: { after: 110 }, alignment: AlignmentType.JUSTIFIED,
    indent: { left: 400, hanging: 300 },
    children: [tr(n + '. '), ...(Array.isArray(runs) ? runs : [tr(runs)])] });
}
function sub(runs) {
  return new Paragraph({ spacing: { after: 90 }, indent: { left: 500 },
    children: [tr('— '), ...(Array.isArray(runs) ? runs : [tr(runs)])] });
}
function signline() {
  return new Paragraph({ spacing: { before: 160, after: 120 },
    children: [tr('Подпись ________________ / ________________________     Дата «___» __________ 20___ г.')] });
}

// ---------- FORM 1 ----------
const f1 = [
  center('СОГЛАСИЕ', { bold: true, size: 30 }),
  center('на использование изображения и обработку персональных данных', { bold: true, size: 24 }),
  new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 6 } }, children: [tr('')] }),

  fieldline('Я,'),
  fieldline('паспорт: серия, номер'),
  fieldline('выдан (кем, когда)'),
  fieldline('адрес регистрации'),
  fieldline('телефон, эл. почта'),

  P([tr('даю согласие в соответствии со статьёй 152.1 Гражданского кодекса Российской Федерации и статьёй 9 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных»')]),
  fieldline('Оператору (наименование/ФИО, ИНН, адрес):'),

  P([tr('на использование моего видеоотзыва и обработку моих персональных данных на следующих условиях.', { bold: true })]),

  P([tr('1. Разрешаю использовать:', { bold: true })]),
  sub('моё изображение (фотографии и видеозапись), в том числе в смонтированном виде;'),
  sub('мой голос (аудиозапись);'),
  sub('моё имя;'),
  sub('содержание моих высказываний (текст отзыва).'),

  P([tr('2. Цели использования:', { bold: true })]),
  sub('размещение в социальных сетях Оператора;'),
  sub('размещение на сайте образовательной программы и сайте Оператора;'),
  sub('использование в рекламе, в том числе таргетированной, в социальных сетях и рекламных системах.'),

  P([tr('3. Площадки и способы использования:', { bold: true })]),
  fieldline('перечень ресурсов (адреса сайтов, страниц, рекламных кабинетов):'),
  P([tr('Способы: публикация, монтаж, включение в рекламные и информационные материалы, копирование, доведение до всеобщего сведения.')]),

  P([tr('4. Перечень персональных данных:', { bold: true }), tr(' имя, изображение, голос, содержание высказываний, а также данные, указанные в настоящем согласии.')]),
  P([tr('5. Срок действия согласия:', { bold: true })]),
  fieldline(''),
  P([tr('6. Согласие даётся:', { bold: true }), tr('   ☐ безвозмездно     ☐ на возмездной основе (условия: ____________________).')]),
  P([tr('7. Способ отзыва согласия:', { bold: true }), tr(' письменное заявление в адрес Оператора (почтовый адрес или электронная почта, указанные выше). При отзыве согласия обработка прекращается в сроки, установленные законодательством.')]),
  P([tr('Настоящее согласие мне понятно, дано добровольно; отзыв основан на моём реальном опыте, сведения достоверны.')]),
  signline(),
];

// ---------- FORM 2 ----------
const f2 = [
  center('СОГЛАСИЕ', { bold: true, size: 30 }),
  center('на обработку персональных данных, разрешённых субъектом персональных данных для распространения', { bold: true, size: 24 }),
  new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 6 } }, children: [tr('')] }),

  fieldline('Я,'),
  fieldline('паспорт: серия, номер'),
  fieldline('телефон, эл. почта'),

  P([tr('в соответствии со статьёй 10.1 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» даю согласие на распространение (раскрытие неограниченному кругу лиц) моих персональных данных')]),
  fieldline('Оператору (наименование/ФИО, ИНН, адрес):'),

  P([tr('1. Информационные ресурсы Оператора, посредством которых осуществляется распространение:', { bold: true })]),
  fieldline('адреса сайта и страниц в социальных сетях:'),

  P([tr('2. Категории и перечень персональных данных, разрешённых для распространения:', { bold: true }), tr(' изображение (фото и видео), голос, имя, содержание отзыва.')]),

  P([tr('3. Условия и запреты на обработку (устанавливаются субъектом по желанию):', { bold: true })]),
  fieldline(''),

  P([tr('4. Срок действия согласия на распространение:', { bold: true })]),
  fieldline(''),

  P([tr('5.', { bold: true }), tr(' Я вправе в любое время потребовать прекратить распространение моих персональных данных. Оператор обязан прекратить распространение в течение 3 (трёх) рабочих дней с момента получения требования либо на основании решения суда.')]),
  P([tr('6.', { bold: true }), tr(' Молчание или бездействие не является согласием на распространение персональных данных.')]),
  signline(),
];

// ---------- FORM 3 (GDPR) ----------
const f3 = [
  center('СОГЛАСИЕ (для субъектов, находящихся в ЕС) / CONSENT (for EU data subjects)', { bold: true, size: 26 }),
  center('на обработку и распространение персональных данных в соответствии с GDPR', { bold: true, size: 24 }),
  new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 6 } }, children: [tr('')] }),

  fieldline('Я, / I,'),
  fieldline('контактные данные / contact details'),

  P([tr('даю согласие на обработку моих персональных данных на основании статьи 6(1)(a) Регламента (ЕС) 2016/679 (GDPR), а в части данных особых категорий (при их наличии в содержании отзыва) — на основании статьи 9(2)(a) GDPR.')]),
  fieldline('Контролёр (controller): наименование, контакт, представитель в ЕС / DPO (при наличии)'),

  P([tr('1. Цели:', { bold: true }), tr(' размещение видеоотзыва (изображение, голос, имя, высказывания) в социальных сетях, на сайте образовательной программы и в рекламе.')]),
  P([tr('2. Категории данных:', { bold: true }), tr(' изображение, видео, голос, имя, содержание отзыва.')]),
  P([tr('3. Срок хранения:', { bold: true })]),
  fieldline(''),
  P([tr('4. Мои права:', { bold: true }), tr(' доступ к данным, исправление, удаление (право быть забытым, ст. 17 GDPR), ограничение и возражение против обработки, отзыв согласия в любой момент (так же просто, как оно дано).')]),
  P([tr('5. Передача данных за пределы ЕС (в том числе в Российскую Федерацию):', { bold: true })]),
  fieldline('основание передачи (стандартные договорные положения ст. 46 GDPR либо явное согласие ст. 49(1)(a)):'),
  P([tr('Согласие является свободным, конкретным, информированным и недвусмысленным. / The consent is freely given, specific, informed and unambiguous.')]),
  signline(),
];

const doc = new Document({
  styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
  sections: [{
    properties: { page: { margin: { top: 1100, bottom: 1100, left: 1200, right: 1200 } } },
    children: [
      ...f1,
      new Paragraph({ children: [new PageBreak()] }),
      ...f2,
      new Paragraph({ children: [new PageBreak()] }),
      ...f3,
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/consent-forms-clean.docx', buf);
  console.log('OK');
});
