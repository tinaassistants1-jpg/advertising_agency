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
  parts.forEach((p, i) => { runs.push(i > 0 ? new TextRun({ text: p, size: 21, break: 1 }) : tr(p)); });
  return new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: ACCENT, space: 10 } }, children: runs });
}
function meter(text) {
  return new Paragraph({ spacing: { after: 60 }, indent: { left: 280 },
    children: [new TextRun({ text: '📊 ' + text, size: 20, bold: true, color: GREEN })] });
}
function btns(arr) {
  return new Paragraph({ spacing: { after: 50 }, indent: { left: 280 },
    children: [new TextRun({ text: 'Кнопки: ', bold: true, size: 20, color: BLUE }),
      tr(arr.map((b) => '[ ' + b + ' ]').join('   '), { size: 20, color: BLUE })] });
}
function react(text) {
  return new Paragraph({ spacing: { after: 40 }, indent: { left: 420 },
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
  const arr = Array.isArray(runs) ? runs : [tr(runs, { bold: header, color: header ? 'FFFFFF' : '000000', size: 18 })];
  return new TableCell({ width: { size: w, type: WidthType.DXA },
    shading: (header || fill) ? { type: ShadingType.CLEAR, fill: header ? DARK : fill, color: 'auto' } : undefined,
    margins: { top: 40, bottom: 40, left: 70, right: 70 }, children: arr.map((a) => (a instanceof Paragraph ? a : new Paragraph({ children: [a] }))) });
}
function table(cols, headers, rows) {
  const TWt = cols.reduce((a, b) => a + b, 0);
  return new Table({ columnWidths: cols, width: { size: TWt, type: WidthType.DXA }, rows: [
    new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { header: true, w: cols[i] })) }),
    ...rows.map((r, ri) => new TableRow({ children: r.map((c, ci) => cell(c, { w: cols[ci], fill: ri % 2 ? 'F5EFE8' : undefined })) })),
  ]});
}
function ba(before, after) { // было/стало pair cells
  return [
    [new Paragraph({ children: [new TextRun({ text: before, size: 18, color: GREY, strike: false })] })],
    [new Paragraph({ children: [new TextRun({ text: after, size: 18, color: DARK })] })],
  ];
}

const children = [];

children.push(
  new Paragraph({ spacing: { after: 40 }, children: [tr('Nova Leads · продающий бот ППК (v3, после ревью-панели)', { size: 18, color: GREY })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Бот «Сложный случай» v3: было / стало', bold: true, size: 32, color: DARK })] }),
  new Paragraph({ spacing: { after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 } },
    children: [tr('Дата: 21.08.2026. Прогнали v2 через трёх специалистов: журналист-редактор, методолог (клиника + гештальт + образование), специалист по геймификации. Ниже — их правки, внесённые в v3.', { size: 20, color: GREY })] }),
);

// PANEL
children.push(H1('Кого позвали и что сказали (коротко)'));
children.push(bullet([new TextRun({ text: '📝 Журналист: ', bold: true }), tr('убрать оценочность и продающие штампы, «симулятор» → «разбор», честность показывать делом, а не декларировать.')]));
children.push(bullet([new TextRun({ text: '🩺 Методолог: ', bold: true }), tr('исправить клиническую ошибку («спасает»→«не подталкивает»), не учить пропускать оценку риска, снять баллы с суицидального хода, дисклеймер + телефон доверия, язык гештальта.')]));
children.push(bullet([new TextRun({ text: '🎮 Геймификация: ', bold: true }), tr('баллы → шкала контакта с клиенткой, последствие вместо оценки, «Карта готовности» вместо медали, выбор кейса по своей теме, «случай недели».')]));

// KEY CHANGES SUMMARY
children.push(H1('Главные правки (сводка)'));
children.push(bullet([tr('Клиника: «прямой вопрос спасает» → «не подталкивает» (Dazzi et al., 2014 — подтвердить у клинициста МИГ).')]));
children.push(bullet([tr('Клиника: убрана ложная развилка «спросить ИЛИ феноменология» — объединено в один верный ход (риск не пропускаем).')]));
children.push(bullet([tr('Этика: баллы и медаль сняты с суицидального содержания; добавлен дисклеймер + телефон доверия на входе.')]));
children.push(bullet([tr('Геймификация: очки → «шкала контакта» (альянс, а не аркада); баллы остаются только за кулисами для скоринга.')]));
children.push(bullet([tr('Опыт: сначала реакция клиентки (переживание), потом разбор — «ага» рождается, а не диктуется.')]));
children.push(bullet([tr('Тон: убраны штампы воронки продаж; «но» → «и всё же» (гештальт); право «просто смотреть» без оправданий.')]));
children.push(bullet([tr('Награда: «Уровень готовности» → «Карта готовности» — документ для рефлексии, не оценка.')]));
children.push(bullet([tr('Новое: выбор кейса по своей пугающей теме; «случай недели» как retention-петля.')]));

// BEFORE/AFTER TABLE
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('БЫЛО → СТАЛО по узлам'));
const C3 = [1500, 3600, 3600];
children.push(table(C3, ['Узел', 'БЫЛО (v2)', 'СТАЛО (v3)'], [
  ['Приветствие', 'кнопка «Пройти симулятор случая»', '«Разобрать случай» — формат супервизии, а не тренажёр для новичков'],
  ['Сегментация', '«чтобы не грузить лишним… внутренне напрягаться»', '«три коротких вопроса… где внутри что-то сжимается»; вариант «или пока сам(а)» без осуждения'],
  ['Подарок', '«Держите — но не всё подряд»', '«Вы назвали [тему] — начну с неё… рядом вся подборка, если захотите шире» (без микроманипуляции)'],
  ['Ход 2 (суицид)', 'реакция: «прямой вопрос спасает (подтверждено)»; баллы +3', '«не подталкивает (Dazzi 2014); вход в оценку риска»; баллы сняты, показана реакция клиентки'],
  ['Развилка «сменить тему»', '+0, читается как «вы проиграли»', '«понятный импульс… но молчание оставляет её одну» — без стыда, с доказательной базой'],
  ['Финал', '«🏅 Уровень готовности»', '«Карта готовности к сложным темам» — документ для рефлексии, 3–4 оси, микрошаг в подарок'],
  ['Развилка намерения', '«Готов на разговор» / «Пока думаю»', '«Можно поговорить» / «Пока просто смотрю» — на равных, без позиции оправдания'],
  ['Возражения', '«Отвечу честно»', '«Скажу как есть — без "запишитесь прямо сейчас"» (честность делом)'],
]));

// FULL V3 SCRIPT
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('Бот v3 — сценарий ключевых узлов'));

children.push(node('УЗЕЛ 0 · ПРИВЕТСТВИЕ'));
children.push(bot('Здравствуйте. Здесь можно за пару минут посмотреть на свою практику со стороны: где уже есть устойчивость, а где пока нащупываешь. И забрать подборку лекций — просто так, без обмена. С чего начнём?'));
children.push(btns(['Разобрать случай', 'Забрать лекции', 'Про программу']));

children.push(node('УЗЕЛ 1 · СЕГМЕНТАЦИЯ'));
children.push(bot('Три коротких вопроса — чтобы дальше говорить по делу. Как вы сейчас работаете?'));
children.push(btns(['Студент 2–3 ступени', 'Практикую 3–5 лет', 'Опытный практик / выпускник']));
children.push(bot('С какими темами бывает тяжелее всего — где внутри что-то сжимается?'));
children.push(btns(['Суицид / риск', 'Острое горе', 'РПП', 'Зависимости', 'Телесность / травма']));
children.push(bot('Есть куда отнести сложный случай — супервизия, интервизия? Или пока в основном сам(а)?'));
children.push(btns(['Да, регулярно', 'Иногда', 'Пока сам(а)']));
children.push(react('теги (ступень + тема + супервизия) персонализируют всё дальше. Скоринг — за кулисами.'));

children.push(node('УЗЕЛ 2 · ПОДАРОК (персональный)'));
children.push(bot('Вы назвали «[тема]» — начну с неё. Вот три лекции прицельно по теме, и рядом вся подборка, если захотите шире. [ссылки]'));

// SIMULATOR
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('УЗЕЛ 3 · РАЗБОР СЛУЧАЯ (ядро, переработано)'));

children.push(node('Вход · дисклеймер + выбор кейса'));
children.push(bot('Небольшая учебная модель одного эпизода — не протокол и не замена супервизии. Разберём случай по теме, которую вы отметили, — «[тема]». Или выберите другую.'));
children.push(P([new TextRun({ text: 'Дисклеймер (обязателен): ', bold: true, color: RED }), tr('«Если сейчас тяжело вам самим — это важнее любого разбора. Телефон доверия: 8-800-2000-122 (РФ, круглосуточно, бесплатно)».')]));
children.push(ph('актуальный телефон доверия под гео аудитории (РФ/диаспора)'));
children.push(btns(['Начать разбор']));

children.push(node('Ход 1 · установление контакта'));
children.push(meter('Контакт с клиенткой: ●●● устойчивый'));
children.push(bot('Играем: вы — терапевт, я — клиентка. Мои слова:\n«Не знаю, зачем пришла… подруга настояла. У меня всё нормально, просто сплю плохо.»\nВаш первый ход?'));
children.push(btns(['Пойти за жалобой — сон', '«А что заметила подруга?»', 'Отразить: «всё нормально — и всё же вы здесь»']));
children.push(react('«отразить» — реакция клиентки: «(пауза) …ну, вообще-то не совсем нормально». Контакт держится. Разбор (гештальт): вы остались с тем, что есть здесь и сейчас — рассогласование слов и присутствия.'));
children.push(react('«про сон» — клиентка охотно уходит в детали сна; контакт есть, но фигура не проступает. Разбор: пошли за содержанием, а не за контактом.'));

children.push(node('Ход 2 · риск (переработано методологом)'));
children.push(meter('Контакт: ●●● устойчивый'));
children.push(bot('Клиентка тише:\n«Иногда думаю — если бы я просто не проснулась, было бы легче всем.»\nВаш ход?'));
children.push(btns(['Тепло назвать и прямо спросить о риске', 'Остаться только в чувствах', 'Мягко увести в безопасное']));
children.push(react('ЛУЧШИЙ ход «тепло назвать + прямо спросить» — клиентка: «(смотрит на вас) …меня об этом ещё прямо не спрашивали». Контакт: устойчивый. Разбор (гештальт): она обратила боль на себя — то, что могло идти вовне, развернулось против себя (ретрофлексия — формулировку заверить у преподавателя). Вы вернули её в контакт здесь-и-сейчас И прямо назвали то, что проступило. Прямой вопрос не подталкивает к суициду (Dazzi et al., 2014 — подтвердить у клинициста); он вход в оценку риска: есть ли план, намерение, что удерживает.'));
children.push(react('«остаться только в чувствах» — тепло есть, но риск не прояснён. Разбор: с активной суицидальной темой прояснение риска пропускать нельзя — на программе учим держать И контакт, И безопасность.'));
children.push(react('«увести в безопасное» — клиентка: «(отодвинулась, замолчала) …да, наверное. Ну что там со сном». Контакт: рвётся. Разбор: понятный импульс «не спугнуть», но молчание оставляет её одну — мы потеряли момент, когда она приоткрылась.'));

children.push(node('Ход 3 · реальное клиническое решение (не награда)'));
children.push(bot('Риск прояснился: мысли пассивные, без плана и намерения. Ваше решение сейчас?'));
children.push(btns(['Продолжаю работу сам(а)', 'Беру на супервизию', 'Подключаю психиатра / направляю']));
children.push(react('каждый выбор — вдумчивое последствие без очков. Затем мост:'));
children.push(bot('Это была одна развилка на выдуманном случае — три минуты. На супервизии на такой уходит час: рядом ваш реальный клиент и супервизор, который видит, где вы отвернулись. Здесь были ещё две развилки, где опытный супервизор пошёл бы иначе — их разбирают вживую.'));
children.push(P([new TextRun({ text: 'Подарок-вынос (ценность без покупки): ', bold: true, color: GREEN }), tr('«Заберите фразу-образец — как тепло и прямо спросить о суицидальных мыслях, не отворачиваясь от человека».')]));
children.push(ph('точная фраза-образец — согласовать с преподавателем МИГ'));

children.push(node('Награда · «Карта готовности» (вместо медали)'));
children.push(bot('Ваша карта готовности к сложным темам (это не оценка — зеркало для рефлексии):'));
children.push(react('4 оси качественно: контакт · оценка риска · удержание рамки · работа со своей тревогой — «опора есть / зона роста». Плюс ваша тема из сегментации. Плюс один микрошаг, полезный, даже если не купите: «на ближайшей интервизии принесите случай по теме [X] — вот 3 вопроса к нему». Отдаём сохраняемым PDF/картинкой.'));
children.push(bot('Открылся супервизорский разбор этого случая — как преподаватель читал сцену.'));
children.push(ph('30–60 сек видео/текст реального преподавателя'));
children.push(btns(['Хочу так разбирать свои случаи', 'Пройти сцену иначе']));

// NODES 4-5 (reworded)
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1('УЗЕЛ 4 · Развилка намерения (переписано журналистом)'));
children.push(bot('Если захочется дальше — вот три спокойных варианта. Ни один ни к чему не обязывает и ничего не стоит.'));
children.push(btns(['Можно поговорить', 'Прийти на день открытых дверей', 'Пока просто смотрю']));
children.push(react('«поговорить» → горячий: скоринг макс + менеджеру с тегами. «ДОД» → запись + напоминания. «смотрю» → возражения (узел 5) без дожима.'));
children.push(ph('дата ДОД, ссылка; слоты собеседований (Женя/Анжела)'));

children.push(H1('УЗЕЛ 5 · Возражения (переписано)'));
children.push(bot('Что останавливает? Скажу как есть — без «запишитесь прямо сейчас».'));
children.push(btns(['Дорого', 'Не вписывается по времени', 'Кажется, не мой уровень', 'Вопрос про формат']));
children.push(table([2200, 6500], ['Кнопка', 'Ответ (суть)'], [
  ['Дорого', [new Paragraph({children:[tr('рассрочка + ранняя цена до 30.09 (реальный дедлайн) + «это не курс, а год супервизии рядом»',{size:18})]}), new Paragraph({children:[new TextRun({text:'[ПОДТВЕРДИТЬ: цена, рассрочка]',bold:true,size:17,color:RED})]})]],
  ['Не вписывается по времени', 'расписание на год вперёд, пятница раз в 2 недели; «покажу сетку — решите сами»'],
  ['Кажется, не мой уровень', 'по тегу ступени; «на ДОД честно скажем, если рано» — без лести'],
  ['Формат', 'формат [подтвердить]; записи занятий; как устроены онлайн-супервизии'],
]));

// NEW MECHANICS
children.push(H1('Новые механики (от геймификатора)'));
children.push(bullet([new TextRun({ text: 'Выбери свой случай: ', bold: true }), tr('кейс в разборе — по теме, которую человек сам отметил как пугающую (автономия + релевантность + точный угол для менеджера). Движок один, контент разный.')]));
children.push(bullet([new TextRun({ text: '«Случай недели»: ', bold: true }), tr('раз в неделю новый короткий кейс по теме подписчика, финал мостит к ДОД/супервизии. Opt-in, без стриков и наказаний — тёплое касание вместо дожима.')]));
children.push(bullet([new TextRun({ text: 'Шкала контакта вместо очков: ', bold: true }), tr('«устойчивый → хрупкий → рвётся» — терапевт мыслит альянсом, а не баллами. Очки живут за кулисами только для скоринга.')]));
children.push(bullet([new TextRun({ text: 'Карта готовности как артефакт: ', bold: true }), tr('сохраняемый документ для рефлексии, которым не стыдно поделиться с супервизором (органический охват). Никаких «я набрал X, а ты?».')]));

// RED FLAGS
children.push(H1('Красные флаги — НЕ выпускать без проверки'));
children.push(bullet([new TextRun({ text: '[КРИТИЧНО] ', bold: true, color: RED }), tr('Все реплики про суицид + ссылки (Dazzi 2014; DeCou & Schumann 2018; Zero Suicide / C-SSRS) — финальная заверка у клинициста/преподавателя МИГ. Я дала направление, клиническую заверку заменить не могу.')]));
children.push(bullet([new TextRun({ text: '[КРИТИЧНО] ', bold: true, color: RED }), tr('Дисклеймер + актуальный телефон доверия под гео — обязателен на входе в разбор.')]));
children.push(bullet([tr('Термин «ретрофлексия» к аутоагрессии — формулировку утвердить у преподавателя МИГ (их школа, их язык).')]));
children.push(bullet([tr('Цифры «16 супервизий», «85% клиницистов» — источник/год перед публикацией (16 супервизий — наш факт из расписания Александра, вернуть корректно).')]));
children.push(bullet([tr('Финальные тексты — через журналиста (правило очеловечивания). Данные красным (цена, дата ДОД, слоты) — от института.')]));

// GROWTH
children.push(H1('Оценка роста'));
children.push(P([tr('Ваша оценка была: v1 — «3 с минусом», v2 — «5 из 10». После ревью-панели v3 стал: (1) клинически безопасным, (2) этичным на тяжёлой теме, (3) вовлекающим по-взрослому без аркады, (4) в языке гештальта и без ИИ-следа. Что осталось для «выше 8»: заверка клинициста, реальные данные (цена/дата/кейс/видео преподавателя) и запуск с замером воронки по узлам.', {})]));

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [
    { level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 460, hanging: 260 } } } }]}]},
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('/home/user/advertising_agency/docs/clients/sales-bot-v3-reviewed.docx', buf);
  console.log('OK');
});
