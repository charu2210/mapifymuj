#!/usr/bin/env python3
"""Generates sample timetable screenshots / PDFs used to test the importer (tests/fixtures/).
   python3 tools/make_sample_timetables.py
The data is invented; room ids are real ones from the floor plans, plus two deliberately bad rooms
('127' exists in two buildings, 'XYZ 404' exists nowhere) so the "correct the room" path is exercised."""
import os
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

OUT = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures')
os.makedirs(OUT, exist_ok=True)
F = '/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf'
font = lambda sz, b=False: ImageFont.truetype(F % ('Bold' if b else 'Regular'), sz)

DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
PERIODS = ['9:00 - 9:50', '9:50 - 10:40', '10:40 - 11:30', '11:30 - 12:20', '12:20 - 1:10', '2:00 - 2:50']
# (day index, first period, number of periods, code, name, room, faculty)
CLASSES = [
    (0, 0, 1, 'DSE2201', 'Relational DB Mgmt Systems', 'AB2-127', 'Dr. Neeraj Verma'),
    (0, 2, 2, 'DSE2231', 'Computer Networks Lab', 'AB2-213', 'Dr. Santosh Rajak'),
    (1, 1, 1, 'MAS2001', 'Statistics & Probability', 'AB2-127', 'Dr. Vijaypal Poonia'),
    (1, 3, 1, 'DSE2202', 'Computer Networks', 'LHC-216', 'Dr. Santosh Rajak'),
    (2, 0, 2, 'DSE2230', 'RDBMS Lab', 'AB2-213', 'Dr. Shitanshu Jain'),
    (2, 4, 1, 'DSE2240', 'Cloud Computing', '127', 'Dr. Malvinder Bali'),
    (3, 2, 1, 'DSE2220', 'Machine Learning', 'AB3-012', 'Mr. Ashish Pandey'),
    (4, 1, 1, 'DSE2270', 'PBL-2', 'XYZ 404', 'Dr. Santosh Rajak'),
    (4, 3, 1, 'MAS2001', 'Statistics & Probability', 'AB2-127', 'Dr. Vijaypal Poonia'),
]

def cell(d, box, c, tint):
    x0, y0, x1, y1 = box
    d.rectangle(box, fill=tint, outline='#555', width=2)
    cx = (x0 + x1) // 2
    lines = [(c[3], font(21, True)), (c[4], font(17)), (c[5], font(19, True)), (c[6], font(15))]
    h = sum(f.size + 6 for _, f in lines); y = (y0 + y1 - h) // 2
    for t, f in lines:
        w = d.textlength(t, font=f); d.text((cx - w / 2, y), t, font=f, fill='#111'); y += f.size + 6

def grid(days_as_rows):
    CW, RH, LW, HH = 230, 150, 150, 70
    if days_as_rows:
        W, H = LW + CW * len(PERIODS) + 20, HH + RH * len(DAYS) + 20
    else:
        W, H = LW + CW * len(DAYS) + 20, HH + (RH - 10) * len(PERIODS) + 20
    im = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(im)
    rh = RH if days_as_rows else RH - 10
    def centre(t, box, f, fill='#111'):
        x0, y0, x1, y1 = box; w = d.textlength(t, font=f)
        d.text(((x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - f.size / 2), t, font=f, fill=fill)
    if days_as_rows:
        for i, p in enumerate(PERIODS):
            b = (LW + i * CW, 0, LW + (i + 1) * CW, HH); d.rectangle(b, fill='#0F766E', outline='#555', width=2); centre(p, b, font(20, True), 'white')
        for j, dn in enumerate(DAYS):
            b = (0, HH + j * rh, LW, HH + (j + 1) * rh); d.rectangle(b, fill='#E1F4F1', outline='#555', width=2); centre(dn, b, font(22, True))
            for i in range(len(PERIODS)):
                d.rectangle((LW + i * CW, HH + j * rh, LW + (i + 1) * CW, HH + (j + 1) * rh), outline='#555', width=2)
        for c in CLASSES:
            j, i, n = c[0], c[1], c[2]
            cell(d, (LW + i * CW + 3, HH + j * rh + 3, LW + (i + n) * CW - 3, HH + (j + 1) * rh - 3), c, '#FFF3E0' if n > 1 else '#F4F8FF')
    else:
        for j, dn in enumerate(DAYS):
            b = (LW + j * CW, 0, LW + (j + 1) * CW, HH); d.rectangle(b, fill='#0F766E', outline='#555', width=2); centre(dn, b, font(22, True), 'white')
        for i, p in enumerate(PERIODS):
            b = (0, HH + i * rh, LW, HH + (i + 1) * rh); d.rectangle(b, fill='#E1F4F1', outline='#555', width=2); centre(p, b, font(19, True))
            for j in range(len(DAYS)):
                d.rectangle((LW + j * CW, HH + i * rh, LW + (j + 1) * CW, HH + (i + 1) * rh), outline='#555', width=2)
        for c in CLASSES:
            j, i, n = c[0], c[1], c[2]
            cell(d, (LW + j * CW + 3, HH + i * rh + 3, LW + (j + 1) * CW - 3, HH + (i + n) * rh - 3), c, '#FFF3E0' if n > 1 else '#F4F8FF')
    return im

def phone_list():
    W = 1080; im = Image.new('RGB', (W, 3000), '#F5F7FA'); d = ImageDraw.Draw(im); y = 40
    d.text((40, y), 'My Timetable', font=font(48, True), fill='#111'); y += 90
    for j, dn in enumerate(DAYS):
        day = [c for c in CLASSES if c[0] == j]
        d.text((40, y), dn, font=font(38, True), fill='#0F766E'); y += 62
        for c in day:
            a = PERIODS[c[1]].split(' - ')[0]; b = PERIODS[c[1] + c[2] - 1].split(' - ')[1]
            d.rounded_rectangle((40, y, W - 40, y + 190), 18, fill='white', outline='#CBD5E1', width=2)
            d.text((70, y + 22), f'{a} - {b}', font=font(30, True), fill='#111')
            d.text((70, y + 70), f'{c[3]}  {c[4]}', font=font(32), fill='#111')
            d.text((70, y + 120), f'Venue: {c[5]}   |   {c[6]}', font=font(28), fill='#475569')
            y += 215
        y += 20
    return im.crop((0, 0, W, y + 20))

def pdf_list(path):
    c = canvas.Canvas(path, pagesize=A4); w, h = A4; y = h - 60
    c.setFont('Helvetica-Bold', 16); c.drawString(50, y, 'Semester IV - Weekly Timetable'); y -= 32
    for j, dn in enumerate(DAYS):
        c.setFont('Helvetica-Bold', 12); c.drawString(50, y, dn); y -= 18
        c.setFont('Helvetica', 10.5)
        for k in [k for k in CLASSES if k[0] == j]:
            a = PERIODS[k[1]].split(' - ')[0]; b = PERIODS[k[1] + k[2] - 1].split(' - ')[1]
            c.drawString(66, y, f'{a} - {b}'); c.drawString(150, y, f'{k[3]}  {k[4]}'); c.drawString(380, y, k[5]); c.drawString(450, y, k[6]); y -= 16
        y -= 10
    c.save()

grid(True).save(os.path.join(OUT, 'grid_days_rows.png'))
grid(False).save(os.path.join(OUT, 'grid_days_cols.png'))
phone_list().save(os.path.join(OUT, 'list_phone.png'))
pdf_list(os.path.join(OUT, 'list_text.pdf'))
print('written to', os.path.abspath(OUT))
