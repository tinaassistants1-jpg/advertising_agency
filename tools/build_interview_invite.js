const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, ShadingType, AlignmentType } = require('docx');
const fs = require('fs');
const ACCENT = 'C6633A', DARK = '1C1815', GREY = '6B6259', RED = 'B23A2E', GREEN = '2E7D32';

function tr(x, o = {}) { return new TextRun({ text: x, size: 22, ...o }); }
function H1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 90 }, children: [new TextRun({ text, bold: true, size: 27, color: DARK })] }); }
function stage(text) { return new Paragraph({ spacing: { before: 120, after: 70 }, children: [new TextRun({ text: text, italics: true, size: 20, color: GREY })] }); }
function speech(text) {
  const parts = text.split('\n');
  const runs = [];
  parts.forEach((p, i) => runs.push(i ? new TextRun({ text: p, size: 23, break: 2 }) : new TextRun({ text: p, size: 23 })));
  return new Paragraph({ spacing: { after: 100 }, indent: { left: 300 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 12 } }, children: runs });
}
function ph(text) { return new Paragraph({ spacing: { after: 90 }, children: [new TextRun({ text: '[ПОДСТАВИТЬ: ' + text + ']', bold: true, size: 20, color: RED })] }); }
function P(runs, o = {}) { return new Paragraph({ spacing: { after: 85 }, children: Array.isArray(runs) ? runs : [tr(runs)], ...o }); }

const children = [
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · для ведущего ДОД', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Приглашение на собеседование — текст слово в слово', bold: true, size: 30, color: DARK })] }),
  new Paragraph({ spacing: { after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Говорит ведущий/модератор на ДОД, ~2–3 минуты. Читать не по бумажке — своими интонациями, но смыслы сохранить.', { size: 20, color: GREY })] }),
  new Paragraph({ spacing: { after: 130 }, children: [new TextRun({ text: '⚠️ Черновик — перед использованием вычитка журналистом. Красное подставить реальными данными.', bold: true, size: 20, color: RED })] }),

  H1('1. Основной текст (после разбора случая)'),
  stage('Переход от разбора к приглашению:'),
  speech('Смотрите, я хочу предложить вам следующий шаг — и сразу скажу, какой, чтобы не было тревоги.\nЭто не оплата и не «записывайтесь скорее». Это собеседование — спокойный разговор один на один, минут на тридцать. Не экзамен и не проверка, подходите вы или нет. Наоборот: мы вместе смотрим на ВАШ случай — тот, что не идёт, — и на ВАШ год: как программа может лечь в вашу практику, потянете ли по времени, что вам это реально даст. И даже если после разговора вы решите, что сейчас не время, — вы всё равно уйдёте с ясностью про свой случай. Это уже полезно.'),
  stage('Кто проводит (доверие):'),
  speech('Проводят собеседования [Женя / Анжела] — ведущие супервизорских групп. То есть вы говорите с человеком, который потом будет рядом с вами в этой работе.'),
  ph('имена ведущих собеседования'),
  stage('Как записаться (действие):'),
  speech('Как записаться: я сейчас даю ссылку — она в чате и вот на экране (QR). Открываете, выбираете удобное время. Минута.'),
  ph('ссылка на запись + QR-слайд'),
  stage('Две честные причины сейчас (без давления):'),
  speech('И два честных момента, без давления. Первый — до 30 сентября действует ранняя цена. Это не «успейте купить», это просто факт: раньше — выгоднее. Второй — собеседования ведут два человека, слотов на неделю немного, поэтому если чувствуете «да, хочу поговорить» — лучше выбрать время сейчас, пока помните и пока оно есть.'),
  ph('подтвердить: ранняя цена до 30.09; слоты действительно ограничены — говорить только если ПРАВДА'),
  stage('Работа с сомнением в моменте:'),
  speech('А если сомневаетесь — это как раз повод прийти на собеседование, а не отказаться: там и разберёмся, ваше это сейчас или нет. Ничего не теряете.'),
  stage('Закрытие блока:'),
  speech('Ссылку продублирую в конце. А сейчас — запишитесь, выберите время. И давайте перейдём к вашим вопросам.'),

  H1('2. Если в вопросах всплывёт «дорого»'),
  speech('Про деньги — коротко: есть рассрочка, банковская и «Долями». Как именно ляжет под вас — это тоже спокойно обсудим на собеседовании, без обязательств.'),

  H1('3. Повтор в самом конце эфира (обязательно)'),
  speech('Напоминаю: ссылка на запись в собеседование — в чате. Выберите удобное время, пока помните. До встречи один на один.'),

  H1('4. Короткий текст в чат / на слайд'),
  new Paragraph({ spacing: { after: 90 }, shading: { type: ShadingType.CLEAR, fill: 'F3EEE9', color: 'auto' },
    children: [new TextRun({ text: '📌 Запись на собеседование (30 мин, разговор про ваш случай и ваш год) — [ссылка]', bold: true, size: 21 })] }),
  new Paragraph({ spacing: { after: 120 }, shading: { type: ShadingType.CLEAR, fill: 'F3EEE9', color: 'auto' },
    children: [tr('Ранняя цена до 30.09 · рассрочка есть · слотов немного', { size: 20 })] }),

  H1('5. Вариант для тёплой аудитории (бывшие студенты ППК)'),
  P([tr('Если в зале много уже учившихся — заменить первый абзац на:')]),
  speech('Вы уже знаете, как у нас всё устроено, поэтому скажу коротко: следующий шаг — собеседование, разговор про то, что изменилось в программе и как новый поток может лечь именно в вашу практику сейчас. Ссылка в чате, выберите время.'),

  H1('Памятка ведущему'),
  P([tr('• Говорить в момент пика интереса — сразу после сильного разбора, не в самом конце.')]),
  P([tr('• Ссылку/QR держать на экране, пока говорите, и продублировать в чат 2–3 раза.')]),
  P([tr('• Не торопить, не повышать голос на «слотах» — спокойный факт, а не крик.')]),
  P([tr('• После эфира менеджер дожимает дошедших по горячим следам (в тот же день).')]),
];

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync('/home/user/advertising_agency/docs/clients/interview-invite-script.docx', buf); console.log('OK'); });
