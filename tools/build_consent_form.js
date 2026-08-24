const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  BorderStyle, AlignmentType, ShadingType, PageBreak,
} = require('docx');
const fs = require('fs');

const ACCENT = 'C6633A';
const DARK = '1C1815';
const GREY = '6B6259';
const RED = 'B23A2E';
const BLUE = '2F5D8A';

function tr(x, o = {}) { return new TextRun({ text: x, size: 22, ...o }); }
function P(runs, o = {}) {
  return new Paragraph({ spacing: { after: 110 }, children: Array.isArray(runs) ? runs : [tr(runs)], ...o });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 110 },
    children: [new TextRun({ text, bold: true, size: 26, color: DARK })] });
}
function block(label) {
  return new Paragraph({ spacing: { before: 220, after: 90 },
    shading: { type: ShadingType.CLEAR, fill: DARK, color: 'auto' },
    children: [new TextRun({ text: label, bold: true, size: 22, color: 'FFFFFF' })] });
}
function fill(label, line = '____________________________________________') {
  return new Paragraph({ spacing: { after: 130 },
    children: [tr(label + ' '), new TextRun({ text: line, size: 22 })] });
}
function ph(text) {
  return new Paragraph({ spacing: { after: 110 },
    children: [new TextRun({ text: '[ЗАПОЛНИТЬ / УТОЧНИТЬ У ЮРИСТА: ' + text + ']', bold: true, size: 20, color: RED })] });
}
function bullet(runs) {
  return new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 70 },
    children: Array.isArray(runs) ? runs : [tr(runs)] });
}
function chk(text) {
  return new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: '☐  ', size: 24 }), tr(text)] });
}
function disc(runs) {
  return new Paragraph({ spacing: { after: 120 }, indent: { left: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: RED, space: 10 } },
    children: Array.isArray(runs) ? runs : [new TextRun({ text: runs, size: 21, color: RED })] });
}

const children = [];

// COVER + DISCLAIMER
children.push(
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · для МИГ · ПРОЕКТ (заверить у юриста)', { size: 18, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: 'СОГЛАСИЕ', bold: true, size: 32, color: DARK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 },
    children: [new TextRun({ text: 'на использование видеоотзыва (изображение, голос, имя) и на обработку и распространение персональных данных', bold: true, size: 22, color: DARK })] }),
);
children.push(disc([new TextRun({ text: '⚠️ Это ПРОЕКТ, подготовленный маркетинговым агентством, НЕ юридический документ. ', bold: true, size: 21, color: RED }), new TextRun({ text: 'Перед подписанием обязательно заверить у юриста МИГа: (1) кто именно оператор при нескольких юрлицах (ООО/ИП/самозанятый) — от его имени публикация и его реквизиты; (2) финальная компоновка (закон требует, чтобы согласие на распространение по ст. 10.1 было ОТДЕЛЬНЫМ); (3) GDPR-часть для клиентов из ЕС. Структура ниже опирается на ст. 152.1 ГК РФ, ст. 9, 10.1, 11 152-ФЗ, Приказ Роскомнадзора № 18, GDPR.', size: 21, color: RED })]));

// SUBJECT DATA
children.push(block('ДАННЫЕ ЛИЦА, ДАЮЩЕГО СОГЛАСИЕ (СУБЪЕКТА)'));
children.push(fill('Фамилия, имя, отчество:'));
children.push(fill('Паспорт: серия, номер:', '________________  дата выдачи: ______________'));
children.push(fill('Кем выдан:'));
children.push(fill('Адрес регистрации:'));
children.push(fill('Телефон / email:'));

// OPERATOR
children.push(block('ОПЕРАТОР (кто использует и обрабатывает данные)'));
children.push(ph('точное наименование / ФИО оператора, ИНН, адрес — определить, какое ЛИЦО МИГа является оператором (ООО в Черногории / ИП в РФ / самозанятый). Публикация в РФ и обработка ПДн должны идти от его имени'));
children.push(fill('Оператор:'));
children.push(fill('ИНН:', '________________  Адрес: ____________________________'));
children.push(fill('Обработку по поручению оператора осуществляет (агентство/подрядчик, если есть):'));

// PART 1
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('ЧАСТЬ 1. Согласие на использование изображения и обработку персональных данных'));
children.push(P([tr('В соответствии со ст. 152.1 Гражданского кодекса РФ и ст. 9 Федерального закона № 152-ФЗ «О персональных данных» я даю согласие Оператору на использование моего видеоотзыва и обработку моих персональных данных.')]));

children.push(P([new TextRun({ text: 'Я разрешаю использовать: ', bold: true })]));
children.push(bullet('моё изображение (фото и видеозапись), в том числе в смонтированном виде;'));
children.push(bullet('мой голос (аудиозапись);'));
children.push(bullet('моё имя (ФИО или имя, как согласовано);'));
children.push(bullet('содержание моих высказываний (текст отзыва).'));

children.push(P([new TextRun({ text: 'Цели использования: ', bold: true })]));
children.push(bullet('размещение в социальных сетях Оператора;'));
children.push(bullet('размещение на сайте образовательной программы (ППК «Сложный случай») и сайте института;'));
children.push(bullet([new TextRun({ text: 'использование в РЕКЛАМЕ, в том числе таргетированной ', bold: true }), tr('(социальные сети, рекламные кабинеты).')]));

children.push(P([new TextRun({ text: 'Площадки и способы использования: ', bold: true })]));
children.push(ph('перечислить конкретные ресурсы: сайт mig.institute (и адрес страницы ППК), конкретные сообщества/аккаунты соцсетей, рекламные кабинеты VK / Meta'));
children.push(fill('Площадки:'));
children.push(P([tr('Способы: публикация, монтаж, включение в рекламные и информационные материалы, копирование, доведение до всеобщего сведения.')]));

children.push(P([new TextRun({ text: 'Перечень персональных данных: ', bold: true }), tr('ФИО (имя), изображение, голос, содержание высказываний, а также данные, указанные в этом согласии.')]));
children.push(P([new TextRun({ text: 'Срок действия согласия: ', bold: true })]));
children.push(ph('указать срок, напр. «5 лет» или «до отзыва согласия»'));
children.push(fill('Срок:'));
children.push(P([new TextRun({ text: 'Возмездность: ', bold: true }), tr('согласие даётся  ☐ безвозмездно   ☐ на возмездной основе (условия: __________).')]));
children.push(P([new TextRun({ text: 'Способ отзыва согласия: ', bold: true }), tr('письменным заявлением на адрес/email Оператора (см. выше).')]));

children.push(P([tr('Подпись субъекта (Часть 1): ______________ / ______________________   Дата: ____________', { bold: true })], { spacing: { before: 140 } }));

// PART 2
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('ЧАСТЬ 2. Отдельное согласие на распространение персональных данных (ст. 10.1 152-ФЗ)'));
children.push(disc([new TextRun({ text: 'По закону это согласие оформляется ОТДЕЛЬНО и подписывается отдельно. ', bold: true, size: 21, color: RED }), new TextRun({ text: 'Молчание согласием не считается.', size: 21, color: RED })]));
children.push(P([tr('В соответствии со ст. 10.1 Федерального закона № 152-ФЗ и Приказом Роскомнадзора № 18 я даю согласие на распространение (раскрытие неограниченному кругу лиц) моих персональных данных.')]));
children.push(fill('Оператор (наименование/ФИО, ИНН, адрес):'));
children.push(P([new TextRun({ text: 'Информационные ресурсы, на которых будет осуществляться распространение: ', bold: true })]));
children.push(ph('обязательно указать адреса сайта и страниц соцсетей, где будут публиковаться данные'));
children.push(fill('Ресурсы (адреса):'));
children.push(P([new TextRun({ text: 'Категории и перечень ПДн для распространения: ', bold: true }), tr('изображение, видео, голос, имя, содержание отзыва.')]));
children.push(P([new TextRun({ text: 'Условия и запреты передачи (устанавливает субъект, по желанию): ', bold: true })]));
children.push(fill('Условия/запреты:'));
children.push(P([new TextRun({ text: 'Срок действия согласия на распространение: ', bold: true })]));
children.push(fill('Срок:'));
children.push(P([tr('Я вправе в любое время потребовать прекратить распространение моих ПДн; Оператор прекращает распространение в течение 3 (трёх) рабочих дней с момента получения требования. Уже показанные/скопированные третьими лицами материалы Оператор не всегда может изъять.')]));
children.push(P([tr('Подпись субъекта (Часть 2, распространение): ______________ / ______________________   Дата: ____________', { bold: true })], { spacing: { before: 140 } }));

// PART 3 GDPR
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('ЧАСТЬ 3. Для субъектов из ЕС (GDPR) — заполняется, если человек в ЕС'));
children.push(disc([new TextRun({ text: 'Этот блок — только для резидентов ЕС. Требует отдельной проверки юриста, особенно передача данных в РФ. ', bold: true, size: 21, color: RED })]));
children.push(P([tr('Правовое основание обработки — согласие (ст. 6(1)(a) GDPR; при данных о здоровье в содержании ролика — явное согласие по ст. 9(2)(a)).')]));
children.push(P([new TextRun({ text: 'Контролёр (controller): ', bold: true })]));
children.push(ph('наименование контролёра, контакт, представитель в ЕС / DPO при наличии'));
children.push(P([new TextRun({ text: 'Мои права (GDPR): ', bold: true }), tr('доступ к данным, исправление, удаление («право быть забытым», ст. 17), возражение, отзыв согласия в любой момент (так же просто, как дано).')]));
children.push(P([new TextRun({ text: 'Трансграничная передача в РФ: ', bold: true })]));
children.push(ph('РФ не имеет решения об адекватности ЕК — нужны надлежащие гарантии (SCC, ст. 46) ЛИБО явное согласие на передачу (ст. 49(1)(a)). Формулировку утверждает юрист'));
children.push(P([tr('Подпись субъекта (Часть 3, GDPR): ______________ / ______________________   Дата: ____________', { bold: true })], { spacing: { before: 120 } }));

// FINAL SIGN
children.push(H1('Подтверждение'));
children.push(P([tr('Я подтверждаю, что отзыв основан на моём реальном опыте, дан добровольно, содержание достоверно; текст согласия мне понятен.')]));
children.push(fill('ФИО полностью (от руки):'));
children.push(fill('Подпись:', '______________________     Дата: ____________'));

// LAWYER CHECKLIST
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Памятка: что проверить у юриста МИГа перед подписанием'));
children.push(chk('Кто оператор при нескольких юрлицах (ООО Черногория / ИП РФ / самозанятый) — чьи реквизиты и ИНН вписывать.'));
children.push(chk('Компоновка: согласие на распространение (ст. 10.1) — отдельным блоком/формой, отдельной подписью (сделано, но заверить).'));
children.push(chk('Точные формулировки по ст. 9 ч. 4 и Приказу Роскомнадзора № 18 (полный обязательный состав).'));
children.push(chk('Является ли использование видео биометрией (ст. 11 152-ФЗ) — оценка юриста.'));
children.push(chk('GDPR: применимость к конкретному человеку + основание передачи данных в РФ (SCC / явное согласие).'));
children.push(chk('Содержание каждого ролика — нет ли данных о здоровье/психике (ужесточает режим).'));
children.push(chk('Маркировка рекламы (ст. 18.1 38-ФЗ, ОРД/ЕРИР) при запуске платного размещения.'));
children.push(chk('Если автор отзыва младше 18 — согласие законного представителя.'));

children.push(H1('Как пользоваться (практика)'));
children.push(bullet('Печатаем на 1 человека 1 комплект. Часть 3 — только для тех, кто в ЕС.'));
children.push(bullet('Каждую часть подписывают ОТДЕЛЬНО (три подписи + финальная).'));
children.push(bullet('Заполняем оператора и площадки заранее (после ответа юриста) — не от руки на месте.'));
children.push(bullet('Скан/фото подписанного храним; оригинал — у оператора.'));
children.push(bullet('При отзыве согласия — прекращаем распространение за 3 рабочих дня, фиксируем дату.'));

children.push(P([new TextRun({ text: 'Источники норм: ст. 152.1 ГК РФ; ст. 9, 10.1, 11 152-ФЗ; Приказ Роскомнадзора № 18 (действует до 01.09.2027); ст. 5, 18.1 38-ФЗ; GDPR ст. 6, 7, 9, 17, 46, 49. Точные редакции — за юристом.', italics: true, size: 19, color: GREY })], { spacing: { before: 140 } }));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }]}]},
  styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/consent-video-testimonial.docx', buf);
  console.log('OK');
});
