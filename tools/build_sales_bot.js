const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, PageBreak,
} = require('docx');
const fs = require('fs');

const ACCENT = 'C6633A';
const DARK = '1C1815';
const GREY = '6B6259';
const BLUE = '2F5D8A';
const GREEN = '2E7D32';
const RED = 'B23A2E';
const PURP = '6A4C93';

function tr(x, o = {}) { return new TextRun({ text: x, size: 21, ...o }); }
function P(runs, o = {}) {
  return new Paragraph({ spacing: { after: 85 }, children: Array.isArray(runs) ? runs : [tr(runs)], ...o });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: DARK })] });
}
function H2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 210, after: 70 },
    children: [new TextRun({ text, bold: true, size: 24, color: ACCENT })] });
}
function node(label) {
  return new Paragraph({ spacing: { before: 200, after: 40 },
    shading: { type: ShadingType.CLEAR, fill: DARK, color: 'auto' },
    children: [new TextRun({ text: label, bold: true, size: 20, color: 'FFFFFF' })] });
}
function bot(text) {
  const parts = text.split('\n');
  const runs = [new TextRun({ text: '🤖 ', size: 20 })];
  parts.forEach((p, i) => {
    if (i > 0) runs.push(new TextRun({ text: p, size: 21, break: 1 }));
    else runs.push(tr(p));
  });
  return new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: ACCENT, space: 10 } },
    children: runs });
}
function btns(arr) {
  return new Paragraph({ spacing: { after: 50 }, indent: { left: 280 },
    children: [new TextRun({ text: 'Кнопки: ', bold: true, size: 20, color: BLUE }),
      tr(arr.map((b) => '[ ' + b + ' ]').join('   '), { size: 20, color: BLUE })] });
}
function arrow(text) {
  return new Paragraph({ spacing: { after: 70 }, indent: { left: 420 },
    children: [new TextRun({ text: '↳ ' + text, size: 19, italics: true, color: GREY })] });
}
function ph(text) {
  return new Paragraph({ spacing: { after: 70 }, indent: { left: 280 },
    children: [new TextRun({ text: '[ПОДТВЕРДИТЬ: ' + text + ']', bold: true, size: 19, color: RED })] });
}
function bullet(runs) {
  return new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 50 },
    children: Array.isArray(runs) ? runs : [tr(runs)] });
}
function cell(runs, { header = false, w, fill } = {}) {
  const arr = Array.isArray(runs) ? runs : [tr(runs, { bold: header, color: header ? 'FFFFFF' : '000000', size: 19 })];
  return new TableCell({ width: { size: w, type: WidthType.DXA },
    shading: (header || fill) ? { type: ShadingType.CLEAR, fill: header ? DARK : fill, color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [new Paragraph({ children: arr })] });
}
function table(cols, headers, rows) {
  const TWt = cols.reduce((a, b) => a + b, 0);
  return new Table({ columnWidths: cols, width: { size: TWt, type: WidthType.DXA }, rows: [
    new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { header: true, w: cols[i] })) }),
    ...rows.map((r, ri) => new TableRow({ children: r.map((c, ci) => cell(c, { w: cols[ci], fill: ri % 2 ? 'F5EFE8' : undefined })) })),
  ]});
}

const children = [];

children.push(
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · продающий бот ППК (v2)', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Продающий бот «Сложный случай»: карта, ветвление, геймификация', bold: true, size: 30, color: DARK })] }),
  new Paragraph({ spacing: { after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Дата: 21.08.2026. Переработка после обратной связи: это не рассылка, а интерактивная воронка с ветвлением, сегментацией, геймификацией, скорингом и отработкой возражений.', { size: 20, color: GREY })] }),
);

// WHAT WAS WRONG
children.push(H1('Что было слабо в первой версии (честно)'));
children.push(bullet([tr('Линейная рассылка на всех одинаково — ноль ветвления.')]));
children.push(bullet([tr('Монолог бота, а не диалог — почти нет кнопок и выборов.')]));
children.push(bullet([tr('Нет сегментации: студент 2-й ступени и опытный практик получали одно и то же.')]));
children.push(bullet([tr('Нет геймификации и интерактива — нечем вовлечь и удержать.')]));
children.push(bullet([tr('Нет скоринга — горячий лид не отделялся от холодного.')]));
children.push(P([new TextRun({ text: 'Ниже — как должно быть.', bold: true, color: GREEN })]));

// PRINCIPLES
children.push(H1('7 принципов продающего бота'));
children.push(table([3000, 5700],
  ['Принцип', 'Как реализуем'],
  [
    ['Диалог, не монолог', 'каждый шаг — вопрос с кнопками; человек кликает, а не читает'],
    ['Сегментация на входе', '3 быстрых вопроса → тег (ступень / страшная тема / есть ли супервизия) → персональный путь'],
    ['Геймификация', '«Симулятор сложного случая»: пользователь — терапевт, делает ходы, получает баллы и разбор'],
    ['Микро-согласия (yes-ladder)', 'маленькие «да» ведут к большому: пройти симулятор → забрать разбор → прийти на ДОД'],
    ['Отработка возражений', 'кнопки «Дорого / Нет времени / Не мой уровень» — каждая ведёт в свою ветку-ответ'],
    ['Лид-скоринг', 'за действия начисляем очки; горячий (≥порога) — автоуведомление менеджеру'],
    ['Поведенческие триггеры', 'открыл/не открыл, прошёл/бросил → разные до-касания, а не один пуш всем'],
  ]));

// MAP
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Карта бота (узлы и ветви)'));

children.push(node('УЗЕЛ 0 · ПРИВЕТСТВИЕ + ВЫБОР ПУТИ'));
children.push(bot('Здравствуйте! Я проведу вас коротким маршрутом: поможем понять, где у вас в работе опора, а где — зона роста. Плюс подарю подборку лекций. С чего начнём?'));
children.push(btns(['🎮 Пройти симулятор случая (2 мин)', '🎁 Забрать 9 лекций', '📄 Узнать про программу']));
children.push(arrow('любой выбор ведёт в УЗЕЛ 1 (сегментация) — сначала узнаём, кто перед нами'));

children.push(node('УЗЕЛ 1 · СЕГМЕНТАЦИЯ (3 быстрых вопроса, сохраняем теги)'));
children.push(bot('Пара вопросов, чтобы не грузить лишним. Кто вы сейчас?'));
children.push(btns(['Студент 2–3 ступени', 'Практикую 3–5 лет', 'Опытный практик / выпускник']));
children.push(bot('Какая тема заставляет вас внутренне напрягаться сильнее всего?'));
children.push(btns(['Суицид / риск', 'Острое горе', 'РПП', 'Зависимости', 'Телесность / травма']));
children.push(bot('Есть ли сейчас, куда отнести трудный случай — супервизия или интервизия?'));
children.push(btns(['Да, регулярно', 'Иногда', 'Нет, я один']));
children.push(arrow('теги (ступень + тема + супервизия) → персонализируют дальше ВСЁ: лекции, примеры, оффер. Начисляем стартовый скоринг.'));

children.push(node('УЗЕЛ 2 · ПЕРСОНАЛЬНЫЙ ПОДАРОК'));
children.push(bot('Держите — но не всё подряд, а под вашу тему. Вы отметили «[выбранная тема]». Вот 3 лекции по ней в первую очередь + полная подборка из 9. [ссылки]'));
children.push(arrow('персонализация выдачи = резко выше открываемость. Ставим триггер: «открыл лекцию?» (см. УЗЕЛ 7)'));
children.push(btns(['🎮 А теперь — симулятор случая', 'Пока почитаю лекции']));

// GAMIFICATION
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('УЗЕЛ 3 · ГЕЙМИФИКАЦИЯ — «Симулятор сложного случая»'));
children.push(P([new TextRun({ text: 'Механика: ', bold: true }), tr('пользователь — терапевт, бот — клиент. 3 хода, на каждом выбор из кнопок. После выбора — мгновенная реакция + микро-разбор «что это дало» + баллы. В конце — уровень готовности и персональный маршрут. Это ГЛАВНЫЙ вовлекающий элемент.')]));

children.push(node('Ход 1'));
children.push(bot('Играем. Ко мне пришла клиентка. Я говорю её словами:\n«Не знаю, зачем пришла… подруга настояла. У меня всё нормально, просто сплю плохо.»\nВаш первый ход?'));
children.push(btns(['Спросить про сон подробнее', 'Спросить, почему подруга настояла', 'Отразить: «всё нормально — но вы здесь»']));
children.push(arrow('«про сон» → +1: «рабочий ход, но пока в контенте». «почему подруга» → +2: «вы пошли в контакт и контекст — сильно». «отразить» → +3: «вы заметили рассогласование — так думает опытный терапевт».'));
children.push(bot('[реакция под выбор] + короткий комментарий-разбор. Прогресс: ▓▓░ 2/3'));

children.push(node('Ход 2 (эскалация)'));
children.push(bot('Клиентка тихо: «Иногда думаю — если бы я просто не проснулась, было бы легче всем.»\nЧто делаете?'));
children.push(btns(['Прямо спросить про суицидальные мысли', 'Сменить тему, чтобы не спугнуть', 'Уточнить: «расскажите, когда так думаете»']));
children.push(arrow('«прямо спросить» → +3: «да — прямой вопрос о суициде не подталкивает, а спасает (это подтверждено исследованиями)». «сменить тему» → +0: «понятный страх, но так мы теряем главное — покажу на программе, как оставаться в контакте». «уточнить» → +2.'));
children.push(bot('[реакция] + «Именно здесь у большинства терапевтов включается тревога — и это нормально.» Прогресс: ▓▓▓ 3/3'));

children.push(node('Ход 3 · Финал + награда'));
children.push(bot('Вы прошли то, что на программе разбирается вживую 16 раз за год — но там это ваши реальные случаи и рядом супервизор. Ваш результат:'));
children.push(bot('🏅 Уровень готовности: [по баллам — «Крепкая опора / Вы в пути / Честный старт»]. Судя по ответам, вам особенно зайдут супервизии по теме «[выбранная тема]».'));
children.push(arrow('награда = персональный «маршрут»: что именно в программе закрывает его зону роста. Плюс скоринг за прохождение.'));
children.push(btns(['Хочу так разбирать свои случаи →', 'Показать программу']));

// INTENT BRANCHING
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('УЗЕЛ 4 · РАЗВИЛКА НАМЕРЕНИЯ (ядро продажи)'));
children.push(bot('Как вам удобнее сделать следующий шаг? Ни один из них ничего не стоит.'));
children.push(btns(['🗣 Готов на разговор (собеседование)', '👀 Хочу посмотреть вживую (ДОД)', '🤔 Пока думаю']));
children.push(arrow('«разговор» → ГОРЯЧИЙ: скоринг макс, автоуведомление менеджеру + сбор контакта/слота. «ДОД» → запись + напоминания. «думаю» → ветка возражений (УЗЕЛ 5).'));
children.push(ph('дата ДОД, ссылка на запись; слоты собеседований (Женя/Анжела)'));

children.push(H1('УЗЕЛ 5 · ОТРАБОТКА ВОЗРАЖЕНИЙ (по кнопкам)'));
children.push(bot('Что именно останавливает? Отвечу честно.'));
children.push(btns(['💰 Дорого', '⏰ Нет времени', '🎓 Не мой уровень', '💻 Формат / далеко']));
children.push(table([2100, 6600],
  ['Кнопка', 'Ответ бота (суть)'],
  [
    ['💰 Дорого', [new Paragraph({children:[tr('честно про рассрочку + раннюю цену до 30.09 (реальный дедлайн, без давления) + «во что это вложение: не курс, а год супервизии»', {size:19})]}), new Paragraph({children:[new TextRun({text:'[ПОДТВЕРДИТЬ: цена и рассрочка]', bold:true, size:18, color:RED})]})]],
    ['⏰ Нет времени', 'расписание известно на год вперёд, пятница раз в 2 недели; «покажу сетку — решите сами»'],
    ['🎓 Не мой уровень', 'по тегу ступени: для студентов 2–3 ступени и практиков — как раз; «на ДОД честно скажем, если рано»'],
    ['💻 Формат', 'формат обучения [подтвердить: онлайн/смешанный]; записи занятий; как устроены супервизии онлайн'],
  ]));
children.push(arrow('после любого ответа — мягкий возврат: [ Записаться на ДОД ] [ Задать свой вопрос человеку ]'));

// SCORING
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Лид-скоринг (кто «горячий» → менеджеру)'));
children.push(table([5200, 1600, 1900],
  ['Действие в боте', 'Баллы', 'Порог'],
  [
    ['Прошёл сегментацию', '+1', ''],
    ['Открыл лекции', '+1', ''],
    ['Прошёл симулятор до конца', '+3', ''],
    ['Нажал «Готов на разговор»', '+5', 'ГОРЯЧИЙ'],
    ['Записался на ДОД', '+4', 'тёплый'],
    ['Открыл ветку «Дорого» (думает о покупке)', '+2', ''],
    ['Задал вопрос человеку', '+3', 'тёплый'],
  ]));
children.push(P([new TextRun({ text: 'Правило: ', bold: true }), tr('≥8 баллов ИЛИ «Готов на разговор» → бот шлёт менеджеру уведомление с тегами (ступень, тема, что делал) — менеджер звонит подготовленным, а не вслепую.')]));

// BEHAVIOR TRIGGERS
children.push(H1('УЗЕЛ 7 · Поведенческие триггеры (не пуш всем, а по действию)'));
children.push(table([3400, 5300],
  ['Условие', 'Что делает бот'],
  [
    ['Не открыл лекции 2 дня', 'напоминание + «с какой темы вам начать? подскажу» (кнопки тем)'],
    ['Прошёл симулятор, но не выбрал шаг', 'через день: «остался один вопрос — вам ближе посмотреть вживую или сразу поговорить?»'],
    ['Записался на ДОД', 'напоминания за неделю / день / час (у образования низкая доходимость — критично)'],
    ['Открыл «Дорого», но не записался', 'через день: рассрочка + «давайте разберём, окупается ли это для вашей практики»'],
    ['Молчит 7 дней', 'долгий прогрев: 1 полезное касание/неделю (разбор случая), без дожима'],
  ]));

// LONG NURTURE + CONSTRUCTOR
children.push(H1('Долгий прогрев и что нужно от конструктора'));
children.push(bullet([new TextRun({ text: 'Конструктор: ', bold: true }), tr('BotHelp / SaleBot / подобный — нужны: кнопки/быстрые ответы, теги/переменные, ветвление по тегам, отложенные сообщения, вебхуки в CRM, счётчик (скоринг) через переменные.')]));
children.push(bullet([new TextRun({ text: 'Интеграции: ', bold: true }), tr('AlfaCRM (передать лид + теги + скоринг), уведомление менеджеру (в его Telegram), пиксель-события на ключевых шагах.')]));
children.push(bullet([new TextRun({ text: 'Аналитика: ', bold: true }), tr('меряем воронку ПО УЗЛАМ: дошёл до симулятора / прошёл / выбрал шаг / записался — видно, где отвал.')]));

// DATA + NOTES
children.push(H1('Что нужно подтвердить перед запуском'));
children.push(bullet('Дата/время ДОД + ссылка на запись симулятора-результата.'));
children.push(bullet('Цена «Практик» + рассрочка (для ветки «Дорого»).'));
children.push(bullet('Формат обучения (онлайн/смешанный) — для ветки «Формат».'));
children.push(bullet('Слоты собеседований (Женя/Анжела) для «горячих».'));
children.push(bullet('Реплики симулятора — согласовать с преподавателем/методистом (клинически корректно).'));
children.push(P([new TextRun({ text: 'Все тексты — через журналиста перед запуском. Реплики про суицид — проверить у методиста МИГ на клиническую точность (тут ошибиться нельзя).', bold: true, size: 21, color: RED })], { spacing: { before: 120 } }));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/sales-bot-v2.docx', buf);
  console.log('OK');
});
