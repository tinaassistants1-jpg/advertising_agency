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

function tr(x, o = {}) { return new TextRun({ text: x, size: 20, ...o }); }
function P(runs, o = {}) {
  return new Paragraph({ spacing: { after: 100 }, children: Array.isArray(runs) ? runs : [tr(runs, { size: 22 })], ...o });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: DARK })] });
}

function cell(runs, { header = false, w, fill } = {}) {
  const arr = Array.isArray(runs) ? runs : [tr(runs, { bold: header, color: header ? 'FFFFFF' : '000000' })];
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: (header || fill) ? { type: ShadingType.CLEAR, fill: header ? DARK : fill, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({ children: arr })],
  });
}

// task table: Задача | Дедлайн | Зависит от | Риск/нота
const C = [3100, 1400, 3100, 3200];
const TW = C.reduce((a, b) => a + b, 0);
function thead() {
  return new TableRow({ tableHeader: true, children:
    ['Задача', 'Дедлайн', 'Зависит от', 'Риск / что нужно'].map((t, i) => cell(t, { header: true, w: C[i] })) });
}
function taskRow(a, d, dep, risk, fill) {
  return new TableRow({ children: [
    cell([tr(a, { bold: true })], { w: C[0], fill }),
    cell([tr(d, { bold: true, color: BLUE })], { w: C[1], fill }),
    cell(dep, { w: C[2], fill }),
    cell(risk, { w: C[3], fill }),
  ]});
}

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    properties: { page: { size: { width: 15840, height: 12240 }, orientation: 'landscape',
      margin: { top: 800, bottom: 800, left: 800, right: 800 } } },
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · зона ответственности Тины по МИГ', { size: 18, color: GREY })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Дорожная карта: сайты · реклама · маркетинг', bold: true, size: 36, color: DARK })] }),
      new Paragraph({ spacing: { after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
        children: [tr('Составлено 21.08.2026 (пятница). «Конец след. недели» = ориентир 31.08. Конференция +3 недели ≈ 11.09. Дедлайны — с ваших слов.', { size: 20, color: GREY })] }),

      // WS1 — SITES
      H1('1. Сайты (самый жёсткий срок)'),
      new Table({ columnWidths: C, width: { size: TW, type: WidthType.DXA }, rows: [
        thead(),
        taskRow('Сайт «Цифра» — верстка готова', 'до 31.08',
          'Прайс/контент «Цифры» от института; тексты (вычитка журналистом); пиксель ВК+Meta',
          'Кто верстальщик? Неделя на сайт — тесно. Нужен подтверждённый исполнитель + готовые тексты СЕЙЧАС.', 'FFE9E2'),
        taskRow('Сайт ППК — верстка готова', 'до 31.08',
          'Программа с датами (есть ✅); тарифы; оффер; форма заявки; пиксель',
          'Форма должна ловить лид (событие submit_lead/Lead). Без кнопки-действия трафик утечёт.', 'FFE9E2'),
        taskRow('Сайт конференции — верстка', 'до ~11.09',
          'Программа конференции; спикеры; даты; форма регистрации',
          'Есть 3 недели — запас. Собрать контент заранее, чтобы верстка не ждала.', 'FFFFFF'),
      ]}),
      P([new TextRun({ text: 'Критический путь сайтов: ', bold: true, size: 22 }), tr('тексты (+вычитка) → верстка → пиксель → форма заявки. Тексты — узкое место: без них верстальщик простаивает. Их готовим первыми.', { size: 22, color: RED })]),

      // WS2 — ADS
      H1('2. Реклама'),
      new Table({ columnWidths: C, width: { size: TW, type: WidthType.DXA }, rows: [
        thead(),
        taskRow('Настройка кабинета ВК Рекламы', 'до 31.08',
          'Доступ агентству от ИП; пиксель на сайтах; выгрузка покупателей из AlfaCRM',
          'Инструкция по пикселю готова. Нужен доступ + выгрузка для look-alike.', 'FFFFFF'),
        taskRow('Настройка кабинета Meta (ФБ)', 'до 31.08',
          'Кабинет ООО Черногория (евро); пиксель Meta',
          'НЕ через РФ. Кабинет на ООО — уточнить, есть ли доступ.', 'FFFFFF'),
        taskRow('Подключение eLama (Telegram Ads)', 'до 31.08',
          'Регистрация в eLama; пополнение',
          'Акция eLama до 31.08 — успеть в окно. Комиссия 10–15% — норма.', 'FFE9E2'),
        taskRow('Подготовка сообщества ВК к рекламе', 'до 31.08',
          'Оформление, закреп, вход в воронку (кнопка/бот)',
          'Сообщество = посадочная для рекламы. Без оформления реклама сольётся.', 'FFFFFF'),
        taskRow('Подготовка сообщества ФБ к рекламе', 'до 31.08',
          'Реанимация страницы, оформление, ЦА-диаспора',
          'Проверить, не под баном ли старая страница.', 'FFFFFF'),
        taskRow('Тесты ВК: посевы + реклама', 'с 01.09',
          'Кабинет + сообщество + пиксель готовы',
          'Малый бюджет-карантин от фрода. Цель теста — цена заявки, не охват.', 'F3EEE9'),
        taskRow('Реклама ФБ: креативы IG / сайт', 'с 01.09',
          'Кабинет Meta + креативы + сайт с пикселем',
          'Только на диаспору tier-1 (Израиль, Германия, Кипр, Сербия).', 'F3EEE9'),
      ]}),

      // WS3 — MARKETING
      H1('3. Маркетинг и продажи'),
      new Table({ columnWidths: C, width: { size: TW, type: WidthType.DXA }, rows: [
        thead(),
        taskRow('Бот + автовебинары (знакомство → отзывы → вся инфо о программе)', 'с 01.09',
          'Конструктор бота (~10–30 €/мес); записи от Александра; тексты (журналист)',
          'Большой блок. Разбить: сначала бот-скелет + 1 автовебинар, потом наполнение.', 'FFFFFF'),
        taskRow('Продающие сценарии вебинаров', 'с 25.08',
          'Скелет есть (в воронке); адаптация под спикеров',
          'Обкатать на ДОД 25.08 как первом живом вебинаре.', 'FFFFFF'),
        taskRow('Продающие сценарии бота', 'с 25.08',
          'Структура воронки бота (6 сообщений — есть черновик)',
          'Напишу, вычитка журналистом обязательна.', 'FFFFFF'),
        taskRow('Продающие сценарии видео', 'с 01.09',
          'Темы Золотовой (банк) + записи',
          'Каждое видео — под шаг воронки, с призывом.', 'FFFFFF'),
        taskRow('Сценарии каждой единицы контента (А–Я)', 'постоянно',
          'Контент-воронка (готова ✅)',
          'Шаблон «цель → крючок → польза → призыв» на каждый формат.', 'F3EEE9'),
      ]}),

      // FUNNELS
      H1('4. Ваши две воронки — проверка'),
      P([new TextRun({ text: 'Воронка А (тёплая, с телефонных баз): ', bold: true, size: 22, color: BLUE }),
         tr('база → ', { size: 22 }), tr('ЖИВОЙ звонок', { size: 22, bold: true }), tr(' с приглашением на ДОД → ДОД → собеседование → оплата.', { size: 22 })]),
      P([tr('✅ Верно. ', { size: 22, bold: true, color: GREEN }),
         tr('Условия легальности: (1) звонок живой, не робот-автообзвон; (2) без масс-СМС/email без согласия; (3) если база холодная — стоп-лист и только звонок. Добавить шаг: недошедшим на ДОД — запись + повторное приглашение.', { size: 22 })]),
      P([new TextRun({ text: 'Воронка Б (холодная, с сайта): ', bold: true, size: 22, color: BLUE }),
         tr('реклама ВК/ФБ → сайт → лид-магнит → звонок менеджера → ДОД → собеседование → оплата.', { size: 22 })]),
      P([tr('✅ Верно. ', { size: 22, bold: true, color: GREEN }),
         tr('Добавление: между лид-магнитом и звонком — бот-автопрогрев (не потерять тех, кто не взял трубку). Звонок легален: человек сам оставил телефон за лид-магнит = согласие на связь. Пиксель ловит визитора для ретаргета.', { size: 22 })]),
      P([new TextRun({ text: 'Общий низ обеих воронок: ', bold: true, size: 22 }),
         tr('ДОД → собеседование → оплата. Это правильно — единая точка сборки продаж.', { size: 22 })]),

      // QUESTIONS
      H1('5. Что мне нужно от вас, чтобы двигаться (без выдумок)'),
      P([new TextRun({ text: '1. Кто верстает сайты? ', bold: true, size: 22 }), tr('От этого зависит реальность срока 31.08. Если верстальщика нет — это риск №1.', { size: 22 })]),
      P([new TextRun({ text: '2. Чья телефонная база для Воронки А? ', bold: true, size: 22 }), tr('Клиенты/лиды МИГ (согласие есть) или холодная? От этого — что легально можно делать.', { size: 22 })]),
      P([new TextRun({ text: '3. Ссылки на сайты (когда будут) + доступ к коду ', bold: true, size: 22 }), tr('— для пикселей и проверки форм.', { size: 22 })]),
      P([new TextRun({ text: '4. Прайс/контент «Цифры» и конференции ', bold: true, size: 22 }), tr('— чтобы готовить тексты, пока идёт верстка.', { size: 22 })]),
      P([new TextRun({ text: 'Скажите, с чего начинаем — и я беру на себя тексты сайтов, сценарии бота/вебинаров и настройку рекламы по этой карте.', italics: true, size: 22, color: DARK })]),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/mig-roadmap.docx', buf);
  console.log('OK');
});
