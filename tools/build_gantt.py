# -*- coding: utf-8 -*-
"""Контент-план + диаграмма Ганта: синхронизация ППК «Сложный случай»
и «Цифра». Данные — факты клиента (даты, тарифы, вебинары)."""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook(); wb.remove(wb.active)
H1=Font(name='Arial',size=13,bold=True,color='1F3864')
H2=Font(name='Arial',size=10,bold=True,color='2E5496')
TH=Font(name='Arial',size=8,bold=True,color='FFFFFF')
B=Font(name='Arial',size=9); BB=Font(name='Arial',size=9,bold=True)
SM=Font(name='Arial',size=8,italic=True,color='7F7F7F')
WHT=Font(name='Arial',size=8,bold=True,color='FFFFFF')
FTH=PatternFill('solid',fgColor='2E5496')
PPK=PatternFill('solid',fgColor='4472C4')     # синий — ППК
CIF=PatternFill('solid',fgColor='C6633A')     # терракота — Цифра
COM=PatternFill('solid',fgColor='548235')     # зелёin — общее
MS =PatternFill('solid',fgColor='C00000')     # красный — веха
FY =PatternFill('solid',fgColor='FFF2CC')
FGrey=PatternFill('solid',fgColor='F2F2F2')
WR=Alignment(wrap_text=True,vertical='top'); CT=Alignment(horizontal='center',vertical='center')
tn=Side(style='thin',color='D9D9D9'); BD=Border(left=tn,right=tn,top=tn,bottom=tn)

WEEKS=[("W01","17–23.08"),("W02","24–30.08"),("W03","31.08–06.09"),("W04","07–13.09"),
("W05","14–20.09"),("W06","21–27.09"),("W07","28.09–04.10"),("W08","05–11.10"),
("W09","12–18.10"),("W10","19–25.10"),("W11","26.10–01.11"),("W12","02–08.11"),
("W13","09–15.11"),("W14","16–22.11"),("W15","23–29.11"),("W16","30.11–06.12"),
("W17","07–13.12")]
NW=len(WEEKS)

# ============ ЛИСТ 1: ГАНТ ============
ws=wb.create_sheet("Гант"); ws.sheet_view.showGridLines=False
ws.column_dimensions['A'].width=40
for i in range(NW): ws.column_dimensions[get_column_letter(2+i)].width=6
ws.cell(row=1,column=1,value='Диаграмма Ганта: ППК «Сложный случай» + «Цифра»').font=H1
ws.cell(row=2,column=1,value='Синий = ППК · Терракота = Цифра · Зелёный = общий трафик/контент · ★ красный = веха/дедлайн. Старт ППК 04.12, Цифра 11.11.').font=SM
# шапка недель
r=4
c=ws.cell(row=r,column=1,value='Поток работ'); c.font=TH; c.fill=FTH; c.border=BD; c.alignment=WR
for i,(w,d) in enumerate(WEEKS):
    cc=ws.cell(row=r,column=2+i,value=w); cc.font=TH; cc.fill=FTH; cc.border=BD; cc.alignment=CT
r=5
c=ws.cell(row=r,column=1,value='(даты недель →)'); c.font=SM; c.border=BD
for i,(w,d) in enumerate(WEEKS):
    cc=ws.cell(row=r,column=2+i,value=d); cc.font=Font(name='Arial',size=6,color='7F7F7F'); cc.border=BD; cc.alignment=CT

def bar(row, name, start_w, end_w, fill, label=""):
    """Полоса Ганта: недели start_w..end_w (1-индекс) закрасить."""
    c=ws.cell(row=row,column=1,value=name); c.font=B; c.border=BD; c.alignment=WR
    for i in range(NW):
        cc=ws.cell(row=row,column=2+i); cc.border=BD; cc.alignment=CT
        if start_w-1 <= i <= end_w-1:
            cc.fill=fill
            if i==start_w-1 and label:
                cc.value=label; cc.font=WHT

def milestone(row, col_w, text):
    cc=ws.cell(row=row,column=1+col_w); cc.value='★'; cc.fill=MS; cc.font=WHT; cc.alignment=CT; cc.border=BD

r=6
# --- ППК ---
ws.cell(row=r,column=1,value='ППК «СЛОЖНЫЙ СЛУЧАЙ»').font=H2; r+=1
bar(r,'Реактивация тёплых пулов (53 + выпускники)',1,4,PPK); r+=1
bar(r,'ДОД 25.08 (★ 25.08)',2,2,PPK); milestone(r,2,''); r+=1
bar(r,'Вебинары ППК (сент/окт ×3)',5,10,PPK); r+=1
bar(r,'Пуш ранней цены (★ 30.09)',6,7,PPK); milestone(r,7,''); r+=1
bar(r,'Вторая ступень цены (★ 01.11)',11,11,PPK); milestone(r,11,''); r+=1
bar(r,'Финал набора (★ 04.11)',11,12,PPK); milestone(r,12,''); r+=1
bar(r,'Добор + онбординг',12,16,PPK); r+=1
bar(r,'★ СТАРТ ППК 04.12',16,16,PPK); milestone(r,16,''); r+=1
# --- Цифра ---
ws.cell(row=r,column=1,value='«ЦИФРА» (продвижение практики)').font=H2; r+=1
bar(r,'Пуш Early Bird (★ 31.08 конец EB)',1,2,CIF); milestone(r,2,''); r+=1
bar(r,'Прогрев-контент Цифры',3,12,CIF); r+=1
bar(r,'Вебинар Цифры (как брать клиентов)',9,9,CIF); r+=1
bar(r,'Пуш к старту (★ 11.11)',12,13,CIF); milestone(r,13,''); r+=1
bar(r,'★ СТАРТ ЦИФРЫ 11.11',13,13,CIF); milestone(r,13,''); r+=1
# --- Общее ---
ws.cell(row=r,column=1,value='ОБЩИЙ ТРАФИК И КОНТЕНТ').font=H2; r+=1
bar(r,'VK/посевы (машина трафика, от ИП)',4,13,COM); r+=1
bar(r,'Автовебинар (кормит оба продукта)',8,17,COM); r+=1
bar(r,'Контент-рубрики (посты/письма)',1,17,COM); r+=1
bar(r,'Пиксель + сбор сидов look-alike',3,17,COM); r+=1

# ============ ЛИСТ 2: КОНТЕНТ-ПЛАН ============
ws2=wb.create_sheet("Контент-план"); ws2.sheet_view.showGridLines=False
for col,w in zip("ABCDEFGH",[7,13,26,15,16,40,14,20]): ws2.column_dimensions[col].width=w
ws2.cell(row=1,column=1,value='Контент-план по неделям (оба продукта в одном потоке)').font=H1
ws2.cell(row=2,column=1,value='Фокус недели чередуется, чтобы Цифра и ППК не конкурировали. Все тексты — через вычитку журналистом.').font=SM
hdr=['Неделя','Даты','Фокус недели','Канал','Формат','Тема / сообщение','Продукт','CTA']
for i,h in enumerate(hdr,1):
    c=ws2.cell(row=4,column=i,value=h); c.font=TH; c.fill=FTH; c.border=BD; c.alignment=WR
plan=[
 ("W01","17–23.08","Разгон ДОД + EB Цифры","WhatsApp/Email","Реактивация + письмо","Реактивация пулов на ДОД; выпускникам «что починили»; Цифра — «EB до 31.08»","Оба","ДОД / купить Цифру EB"),
 ("W02","24–30.08","ДОД + дедлайн EB Цифры","Zoom/Email","Событие + дожим","ДОД 25.08 (практикующие); последний зов EB Цифры 31.08","Оба","Заявка / оплата EB"),
 ("W03","31.08–06.09","Экспертный контент ППК","TG+Email","Сложный случай №1","РПП: разбор случая (крючок ППК); подводка к вебинару","ППК","На 9 лекций"),
 ("W04","07–13.09","Запуск трафика","VK/посевы","Реклама + пост","Старт VK/посевов от ИП; «как ложится в год»","ППК","На сайт/лендинг"),
 ("W05","14–20.09","Вебинар ППК №1","Zoom","Живой вебинар","Телесность/сексуальность (100+ рег.)","ППК","Заявка на интервью"),
 ("W06","21–27.09","Прогрев на дедлайн","Email/VK","Ретаргет + письмо","«Ранняя цена ППК до 30.09»; ретаргет событий","ППК","На оплату"),
 ("W07","28.09–04.10","Дедлайн ранней цены","Email/TG","3 письма дедлайна","28/29/30.09 — закрытие ранней цены; замер №1","ППК","Оплата"),
 ("W08","05–11.10","Вебинар ППК №2 + автоворонка","Zoom/бот","Вебинар + автовеб","Клиника (зависимости/РПП); запуск автовебинара","ППК","Заявка / бот"),
 ("W09","12–18.10","Вебинар Цифры","Zoom","Живой вебинар","«Где брать клиентов» — боль 83% (касдев n=170)","Цифра","Запись на Цифру"),
 ("W10","19–25.10","Вебинар ППК №3 + замер","Zoom","Вебинар","Знакомство с ведущими; замер №2","ППК","На интервью"),
 ("W11","26.10–01.11","Вторая ступень + дожим","Email/звонки","Дедлайн + личные","Ступень цены 01.11; личный дожим интервью","ППК","Оплата"),
 ("W12","02–08.11","Финал набора ППК","Email/WA","Последний день","Набор ППК закрывается 04.11; waitlist; переключение на Цифру","Оба","Оплата / waitlist"),
 ("W13","09–15.11","Старт Цифры","Email/TG","Старт + онбординг","Цифра стартует 11.11; онбординг; кросс-оффер ППК-студентам","Цифра","Оплата Цифры"),
 ("W14","16–22.11","Контент + добор ППК","TG/Email","Экспертный + добор","Голоса выпускников; добор ППК до 04.12","Оба","На оплату"),
 ("W15","23–29.11","Прогрев к старту ППК","Email/бот","Обратный отсчёт","Кто в группе, первый модуль; автовебинар на холод","ППК","Оплата/бот"),
 ("W16","30.11–06.12","Старт ППК","Email/TG","Старт + онбординг","ППК стартует 04.12; онбординг без волны негатива","ППК","Онбординг"),
 ("W17","07–13.12","Пост-старт + база-2027","TG/Email","Отчёт + waitlist","Первые впечатления; waitlist на следующий поток","Оба","В след. поток"),
]
for r2,row in enumerate(plan,5):
    prod=row[6]
    fill = PatternFill('solid',fgColor='DEE7F5') if prod=="ППК" else (PatternFill('solid',fgColor='F4E0D6') if prod=="Цифра" else PatternFill('solid',fgColor='E6EFE0'))
    for i,v in enumerate(row,1):
        c=ws2.cell(row=r2,column=i,value=v); c.font=(BB if i==1 else B); c.border=BD; c.alignment=WR
        if i in (3,7): c.fill=fill

# ============ ЛИСТ 3: КЛЮЧЕВЫЕ ДАТЫ ============
ws3=wb.create_sheet("Ключевые даты"); ws3.sheet_view.showGridLines=False
for col,w in zip("ABCD",[14,30,14,44]): ws3.column_dimensions[col].width=w
ws3.cell(row=1,column=1,value='Ключевые даты и дедлайны').font=H1
for i,h in enumerate(['Дата','Событие','Продукт','Что делаем'],1):
    c=ws3.cell(row=3,column=i,value=h); c.font=TH; c.fill=FTH; c.border=BD; c.alignment=WR
dates=[
 ("25.08","День открытых дверей (практикующие)","ППК","Нагнать 90–140 рег.; заявки на интервью ≤1 ч"),
 ("31.08","Конец Early Bird","Цифра","Последний дожим EB −15%"),
 ("30.09","Конец ранней цены","ППК","3 письма дедлайна; замер №1 (цель 8 оплат)"),
 ("01.11","Вторая ступень цены","ППК","Новый дедлайн решения (не скидка)"),
 ("04.11","Закрытие набора ППК","ППК","Финал; решение о доборе до 04.12; waitlist"),
 ("11.11","СТАРТ «Цифры»","Цифра","Онбординг; кросс-оффер студентам ППК"),
 ("04.12","СТАРТ ППК «Сложный случай»","ППК","Онбординг без волны негатива"),
]
for r3,row in enumerate(dates,4):
    fill = FY if row[0] in ("30.09","04.11","11.11","04.12") else None
    for i,v in enumerate(row,1):
        c=ws3.cell(row=r3,column=i,value=v); c.font=(BB if i==1 else B); c.border=BD; c.alignment=WR
        if fill: c.fill=fill

# ============ ЛИСТ 4: ЛОГИКА СИНХРОНИЗАЦИИ ============
ws4=wb.create_sheet("Логика синхронизации"); ws4.sheet_view.showGridLines=False
ws4.column_dimensions['A'].width=100
ws4.cell(row=1,column=1,value='Как два продукта не конкурируют, а усиливают друг друга').font=H1
notes=[
 "1. РАЗНЕСЛИ ПИКИ ПРОДАЖ. Цифра давит в августе (EB до 31.08), ППК — в сентябре (ранняя цена 30.09) и октябре (набор до 04.11). Старт Цифры 11.11 попадает в «паузу» ППК между закрытием набора и стартом — не мешают.",
 "2. ОДНА АУДИТОРИЯ, ДВА ПРОДУКТА. И ППК, и Цифра — для практикующих психологов 3–5 лет. Поэтому весь контент-трафик (VK, посевы, автовебинар) общий: приводим психолога один раз, дальше предлагаем то, что ближе.",
 "3. КРОСС-ПРОДАЖА. Цифра (как брать клиентов) и ППК (клиническая глубина) дополняют друг друга. Студенту ППК в ноябре предлагаем Цифру; покупателю Цифры — ППК на следующий поток. Тариф «Профессионал» ППК уже включает «Цифровой гештальт» — связка заложена.",
 "4. ВЕБИНАРЫ — ГЛАВНЫЙ КОНВЕРТЕР ОБОИХ. 3 вебинара ППК (клиника) + 1 вебинар Цифры (где брать клиентов, боль 83% по касдеву). Каждый вебинар греет всю базу, а оффер в конце — под актуальный продукт недели.",
 "5. ЧЕРЕДОВАНИЕ ФОКУСА. Не даём два оффера в одном письме. Неделя = один фокус (см. столбец «Продукт»). Экспертный контент между офферами — общий (рубрики: сложный случай, как ложится в год, голоса выпускников).",
 "6. ТРАФИК-МАШИНА РАБОТАЕТ НА ОБА. VK/посевы от ИП + автовебинар с октября собирают тёплую базу и пиксель-сиды. Холодные лиды с длинным циклом закрываются на Цифру (короткий цикл, дешевле) ИЛИ дозревают к следующему ППК.",
 "ЧЕСТНО: даты Цифры (EB до 31.08, старт 11.11) и часть тарифов — по вводным на 18.08; если сдвинутся, пересоберём календарь. Вебинар Цифры поставлен на W09 — согласовать спикера и тему с методологом.",
]
for r4,n in enumerate(notes,3):
    c=ws4.cell(row=r4,column=1,value=n); c.font=(BB if n.startswith("ЧЕСТНО") else B); c.alignment=WR
    if n.startswith("ЧЕСТНО"): c.fill=FY

wb.save('content-gantt-ppk-cifra.xlsx'); print('OK', wb.sheetnames)
