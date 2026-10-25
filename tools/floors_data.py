# Item format "id|name|type|weight"  (types: r room, l lab, f food, a hall, u utility, g gap, v not part of building)
# Stairs / WS / Elevator use the SAME names on every floor ("Stairs", "WS", "Elevator") so they render consistently.
# Stairs, WS and lift positions on G and 1 are copied from the 2nd floor (and 3rd for the bottom side), where the locations are almost the same.
S  = "sc|Stairs|u|0.6"
WS = "ws|WS|u|0.6"
FLOORS = [
 dict(b="AB2", f="G", name="Ground Floor", W=1000, H=640, court=(250, 205, 730, 435),
  centre="ramdas|Ramdas Pai Amphitheatre",
  top=dict(out=["014|DST PURSE Analytical Lab|l","016||r",S,"yuzeez|Yuzeez|f","devine|Devine|f","017||r",S,"019||r"],
           in_=["015|DS Lab|l","tma|TMA Pai Hall|a|2","018|SAIF|l","ws|WS|u|0.7"]),
  left=dict(out=["013|Biochem & Immunology Lab|l","012|Bio Sc. Lab 03|l","010|EnBio Mat RIC Lab|l",S,"007|Rxn Eng. Lab|l","006|FCSM Lab|l",WS,"005|Soil Mech Lab|l"],
            in_=["011|Robotics Lab|l","009|Comp. Int. Lab|l","008|Cloud Infra Lab|l","sharda|Smt. Sharda Pai Auditorium|a"]),
  right=dict(out=["020||r","021||r","023||r","025|Faculty of Design|r",S,"027||r","028||r","029||r","030||r"],
             in_=["022||r","024|Faculty of Design|r","026||r"]),
  # in-row (px weights over x 144..846): Italian Oven + Munchies under Smt. Sharda Pai; 003 right beside the Stairs, which sit directly in front of 026.
  # out-row: Entry to AB-2 at the centre of the building (x 430..570); 004, 002, 001 pushed to the right; 003 is in front of 004.
  bottom=dict(in_=["oven|Italian Oven|f|105","munchies|Munchies|f|105","_||g|246","003|Programming Lab|l|130","sc|Stairs|u|116"],
              out=["_||g|420","entry|Entry to AB-2|e|140","_||g|30","004||r|130","002||r|130","001||r|130"])),
 dict(b="AB2", f="1", name="First Floor", W=1000, H=640, court=(210, 150, 800, 470), centre="|Open courtyard · Ramdas Pai Amphitheatre",
  top=dict(out=["intel|Intel Unnati Lab|l|185","116||r|160","sc|Stairs|u|60","119||r|270","sc|Stairs|u|60","121||r|245"],
           in_=["115|ML Lab|l","117||r","118||r","120||r","ws|WS|u|0.7"]),
  left=dict(out=["113|Computing Lab|l","112|Cancer Res. Lab|l","110|Env. Bio Tech Lab|l",S,"108|AI & DS Lab|l","106|Structural Bio Lab|l",WS,"105|Print & Design Media Lab|l"],
            in_=["111|Cybersec Lab|l","109|Adv. Prog. Lab|l","107||r"]),
  right=dict(out=["122||r","123||r","124||r","126||r",S,"128||r","130||r","131||r","132||r"], in_=["125||r","127||r","129||r"]),
  bottom=dict(in_=["_||g|185","sc|Stairs|u|75","_||g|131","103||r|111","sc|Stairs|u|75","_||g|180"],
              out=["_||g|420","104||r|140","102||r|140","101||r|140","lift|Elevator|u|140"]),
  # small semicircular Mess at the far end of the bottom wall, with a gap before 104
  shapes=[dict(id="mess", name="Mess", t="f", cx=150, cy=630, r=80)]),
 dict(b="AB2", f="2", name="Second Floor", W=1000, H=640, court=(235, 200, 780, 450), centre="|Open courtyard · Ramdas Pai Amphitheatre",
  top=dict(out=["microbio|Microbiology & Chem. Eng. Lab|l|1.4","223||r","227||r",S,"228||r","229||r","230||r",S,"231||r","232||r"],
           in_=["224||r","225||r","226|Physics Lab 3|l","FB5|Bio Science|l|2","ws|WS|u|0.7"]),
  left=dict(out=["221||r","220||r","217|Lab|l",S,"214||r","212|MUJ-NLOT|l",WS,"211||r"],
            in_=["219||r","218||r","216||r","215||r","213|Design & Thinking Lab|l"]),
  right=dict(out=["233||r","234||r","235||r","237||r",S,"239||r","241||r","242||r","243||r"], in_=["236||r","238||r","240||r"]),
  bottom=dict(in_=["209|Centre for Cyber Prot. & Digital Sci.|l|1.6","sc|Stairs|u","207||r","205||r","sc|Stairs|u","203|AI Lab|l"],
              out=["210||r","208||r","206||r","204||r","202||r","201||r","lift|Elevator|u"])),
 # Third floor (from the hand sketch). Left outer column: FB04..FB01, an unlabelled room, 302, 301.
 # Left inner column: Stairs opposite FB03, then a second group Stairs / 303 / WS. Bottom inner row: 307, 310, 312, Stairs, WS.
 # Bottom outer row: Elevator, 304, 305, 306, 308, Stairs, 309, 311, 313, 314, Elevator.
 dict(b="AB2", f="3", name="Third Floor", W=760, H=900, court=(226, 10, 616, 700), centre="|Open courtyard · Ramdas Pai Amphitheatre",
  steps=[(230, 14, 382, 236, "Amphitheatre steps")],
  left=dict(od=132,
            out=["FB04||r","FB03||r","FB02||r","FB01||r","blank||n","302||r","301||r"],
            in_=["_||g|114.14","sc|Stairs|u|114.14","_||g|114.14","sc|Stairs|u|114.14","303||r|114.14","ws|WS|u|114.14","_||g|5.16"]),
  right=dict(out=["_||g|3.2","FB6||r","conf|Conference Room|a","315||r"]),
  bottom=dict(in_=["307||r","310||r","312||r","sc|Stairs|u","ws|WS|u"],
              out=["lift|Elevator|u","304||r","305||r","306||r","308||r","sc|Stairs|u","309||r","311||r","313||r","314||r","lift|Elevator|u"])),
 dict(b="AIC", f="LG", name="Lower Ground", W=1000, H=640, court=(300, 190, 740, 440),
  # Training Room and Pre-Incubator are laid out right after LG003, each exactly LG003's size
  centre=dict(after="LG003", items=["training|Training Room (AR/VR & 3D Print Lab)|l","preinc|Pre-Incubator Area|r"]),
  top=dict(out=["_||g|1","LG007||r|2","LG009||r|2","x||v|3"], in_=["_||g|1","LG008||r|2","LG010||r|2","x||v|3"]),
  left=dict(out=["LG006||r","LG005|AIC MV (?)|r","pantry|Pantry Area / Co-working Space|f|1.4","LG004||r","LG002||r","lrpd|LRPD Lab|l"],
            in_=["_||g|5","LG003||r"]),
  right=dict(out=["x||v"]),
  bottom=dict(out=["LG001|Data Eng. Lab|l|3","x||v|7"])),
]

def _col(x, w, items, y0=137, pitch=73.4, h=64):
    return [(it, x, round(y0 + i * pitch, 1), w, h) for i, it in enumerate(items)]
L = "lift|Lift|u"; WSS = "ws|WS|u"
FLOORS.append(dict(b="LHC", f="2", name="Second Floor", W=846, H=1600, court=(10, 10, 10, 10), centre=[],
  free=[("balcony|Balcony|u", 92, 22, 663, 92)]
   + _col(22, 121, [L, WSS, "220||r", "219||r", "218||r", L, "switch|Switch Room|u", "216||r", "215||r", "214||r", WSS, L])
   + _col(703, 123, [L, WSS, "201||r", "202||r", "203||r", "204||r", L, "db|DB Room|u", "205||r", "206||r", "207||r", WSS, L])
   + [("jodhpur|Jodhpur|r", 258, 211, 320, 106), ("jaisalmer|Jaisalmer|r", 258, 331, 320, 146), ("jaipur|Jaipur|r", 258, 574, 320, 187),
      ("211||r", 197, 219, 49, 60), ("212||r", 197, 371, 49, 59), ("213||r", 197, 760, 49, 59),
      ("210||r", 588, 318, 48, 70), ("209||r", 588, 574, 48, 71), ("208||r", 588, 787, 48, 70),
      ("terrace|Grand Staircase Terrace|a", 140, 1114, 567, 244)]))

# ───────────────────────── AB-1 (from hand sketches; coordinates are sketch pixels, scaled by free_floor) ─────────────────────────
# Rooms are (item, x1, y1, x2, y2).  WR = washroom, S = stairs, FB = faculty block, Comm. Room = communication room, ELC Room = electronics room.
def free_floor(b, f, name, x0, y0, s, xmax, ymax, rooms, outline=None, voids=()):
    T = lambda x, y: (round((x - x0) * s + 10, 1), round((y - y0) * s + 10, 1))
    free = []
    for it, x1, y1, x2, y2 in rooms:
        X, Y = T(x1, y1); X2, Y2 = T(x2, y2); free.append((it, X, Y, round(X2 - X, 1), round(Y2 - Y, 1)))
    d = dict(b=b, f=f, name=name, W=round((xmax - x0) * s + 20), H=round((ymax - y0) * s + 20), court=(10, 10, 10, 10), centre=[], free=free,
             voids=[([T(*p) for p in v[0]], v[1]) + ((T(*v[2]),) if len(v) > 2 else ()) for v in voids])
    if outline: d["outline"] = [T(*p) for p in outline]
    return d
ST = "sc|Stairs|u"; WR = "wr|WR|u"; AHU = "ahu|AHU|u"; COMM = "comm|Comm. Room|u"; LIFT = "lift|Lift|u"
CDOE = "Centre for Distance & Online Education"

AB1_G = free_floor("AB1", "G", "Ground Floor", 15, 50, .62, 1585, 1120, [
  ("005|Civil Eng. Lab|l", 50, 50, 170, 200), ("004|Bio Science Lab|l", 170, 50, 295, 200), ("003|Boys Common Room|r", 295, 50, 425, 200),
  ("002|Sports Room|r", 425, 50, 570, 200), ("001|DSW|r", 570, 50, 675, 200),
  ("027|EEE Lab|l", 920, 50, 1060, 200), ("025|Automobile Eng. Lab|l", 1060, 50, 1197, 200),
  ("024|Automotive Engine Assembly Lab|l", 1197, 50, 1318, 200), ("023|Commerce Faculty Block|r", 1318, 50, 1440, 200), (WR, 1455, 50, 1585, 135),
  (ST, 520, 205, 632, 275),
  (AHU, 15, 230, 200, 375), ("007||r", 15, 395, 200, 485), ("008||r", 15, 485, 200, 580), ("009||r", 15, 580, 200, 700), ("010||l", 15, 700, 200, 830),
  (AHU, 15, 900, 100, 1065),
  ("011|CN Lab|l", 100, 930, 285, 1120), ("surveying|Surveying Lab|l", 285, 930, 440, 1120), ("012|Civil Lab|l", 440, 930, 595, 1120), ("013|Strength of the Material Lab|l", 595, 930, 715, 1120),
  ("014|Idea Lab|l", 925, 930, 1040, 1120), ("015||l", 1040, 930, 1160, 1120), ("016|Heat & Mass Transfer Lab|l", 1160, 930, 1290, 1120), (WR, 1400, 1040, 1585, 1120),
  ("022||r", 1360, 330, 1585, 430), ("021||r", 1360, 430, 1585, 530), ("020||r", 1360, 530, 1585, 630), ("exit|Exit|e", 1360, 660, 1585, 745),
  ("018||r", 1360, 770, 1585, 835), ("019||r", 1360, 835, 1585, 895), ("017|BIONAC|r", 1360, 895, 1585, 985),
  ("cheffie|Cheffie|f", 755, 742, 920, 850),
 ], voids=[([(262, 252), (632, 252), (632, 240), (695, 240), (695, 357), (572, 357), (572, 820), (262, 820)], ""),
           ([(978, 240), (1312, 240), (1312, 785), (978, 785)], "")])

AB1_1 = free_floor("AB1", "1", "First Floor", 40, 20, .7, 1480, 1530, [
  ("105|Virtual Class|r", 195, 337, 310, 435), ("104|Fab Lab|l", 310, 337, 420, 435), ("103|Modeling & Simulation Lab|l", 420, 337, 545, 435),
  ("102|Admissions CDOE|r", 545, 337, 655, 435), ("101|Arduino Fab Lab|l", 655, 337, 745, 435),
  ("131||r", 840, 337, 925, 435), ("130||r", 925, 337, 1000, 435), ("129||r", 1000, 337, 1080, 435), ("128||r", 1080, 337, 1165, 435), ("127|Psychology Lab|l", 1165, 337, 1240, 435),
  (WR, 1285, 55, 1380, 135), ("elc|ELC Room|u", 1285, 195, 1380, 295), ("126|Network & Security Lab|l", 1380, 100, 1480, 337),
  ("125|B.Tech 1st Year Office|r", 1330, 390, 1480, 535), ("124|Academic CDOE II|r", 1330, 535, 1480, 660), ("123|CAD Lab|l", 1330, 660, 1480, 775),
  ("122|Big Data & ML Lab|l", 1330, 775, 1480, 880), ("121|Computer Lab|l", 1330, 880, 1480, 965), ("120|Computer Lab|l", 1330, 965, 1480, 1060),
  (ST, 1222, 700, 1295, 765),
  ("119||r", 1357, 1285, 1480, 1410), (WR, 1357, 1410, 1480, 1530), (COMM, 1195, 1200, 1295, 1280),
  (AHU, 52, 430, 215, 545), ("106|Ex. Dor Office|r", 52, 560, 215, 640), ("107||r", 52, 640, 215, 715), ("108||r", 52, 715, 215, 790), ("109||r", 52, 790, 215, 870),
  ("110||r", 52, 985, 215, 1110), (AHU, 52, 1120, 215, 1190),
  ("111|Computer Centre|l", 120, 1190, 285, 1280), ("112|Programming Lab|l", 285, 1190, 420, 1280),
  (WR, 322, 1098, 430, 1128), ("comm|Comm. Room 6|u", 455, 1105, 590, 1185),
  (WR, 575, 440, 665, 500), (ST, 690, 440, 765, 500),
  (ST, 590, 1035, 660, 1095), ("FB1|Faculty Block|r", 660, 1035, 765, 1095), (LIFT, 850, 1035, 960, 1100),
  ("113|Electronics & Simulation Lab|l", 420, 1280, 515, 1370), ("116|DBMS/OS Lab|l", 515, 1280, 610, 1370),
  ("114|Programming Lab|l", 420, 1370, 515, 1460), ("115|Data Communication Lab|l", 515, 1370, 610, 1460),
  ("117A||r", 750, 1280, 830, 1455), ("117D||r", 830, 1280, 915, 1455), ("117B||r", 750, 1455, 830, 1520), ("117C||r", 830, 1455, 915, 1520),
  ("118A||r", 962, 1280, 1043, 1455), ("118D||r", 1043, 1280, 1125, 1455), ("118B||r", 962, 1455, 1043, 1525), ("118C||r", 1043, 1455, 1125, 1525),
 ], outline=[(52, 337), (1285, 337), (1285, 35), (1480, 35), (1480, 1530), (1357, 1530), (1357, 1280), (1125, 1280), (1125, 1525), (962, 1525), (962, 1280),
             (915, 1280), (915, 1520), (750, 1520), (750, 1280), (610, 1280), (610, 1460), (420, 1460), (420, 1280), (52, 1280)],
 voids=[([(343, 500), (1222, 500), (1222, 1095), (960, 1095), (960, 1035), (850, 1035), (850, 1095), (765, 1095), (765, 1035), (590, 1035), (590, 1095), (343, 1095)], "")])

AB1_2 = free_floor("AB1", "2", "Second Floor", 25, 12, .7, 1265, 1585, [
  ("204|Microcontroller & System Simulation Lab|l", 68, 185, 160, 290), ("203|Integrated Electronics Lab|l", 160, 85, 258, 185),
  ("202|Power System Lab|l", 258, 185, 390, 290), ("201|Front Office Lab, Dept. of Hotel Management|l", 390, 185, 500, 290),
  ("229||r", 655, 185, 770, 290), ("228||r", 770, 185, 835, 290), ("227||r", 835, 185, 900, 290), ("226||r", 900, 185, 970, 290), ("225||r", 970, 185, 1052, 290),
  (WR, 1052, 12, 1110, 105), ("224B||r", 1110, 12, 1265, 105), ("224A||r", 1052, 105, 1265, 185),
  ("223||r", 1105, 190, 1265, 385), ("222||r", 1105, 385, 1265, 570), ("221||r", 1105, 570, 1265, 725), ("221A||r", 1105, 725, 1265, 860),
  ("220||r", 1105, 860, 1265, 1015), ("219||r", 1105, 1015, 1265, 1230),
  ("elc|ELC Room|u", 1055, 1300, 1150, 1470), ("218||r", 1150, 1300, 1265, 1440), ("tv|Television Program Production Studio|r", 1150, 1440, 1265, 1585), (WR, 1055, 1470, 1150, 1585),
  (AHU, 68, 295, 215, 365), ("205|Multiscale Simulation Research Centre|l", 68, 368, 215, 435), ("206|" + CDOE + "|r", 68, 435, 215, 495), ("207|" + CDOE + "|r", 68, 495, 215, 560),
  ("208|" + CDOE + "|r", 25, 583, 215, 688),
  ("209||r", 68, 820, 215, 890), ("210||r", 68, 890, 215, 962), ("211||r", 68, 962, 215, 1032),
  (AHU, 68, 1157, 180, 1325),
  ("212|" + CDOE + "|r", 180, 1235, 290, 1325), ("213|EE Lab|l", 290, 1235, 380, 1325), ("214|Advanced Robotics Lab|l", 380, 1235, 445, 1325),
  ("FB3|Faculty Block|r", 855, 1252, 920, 1298), (COMM, 968, 1230, 1045, 1298),
  ("215B|PLC Lab|l", 445, 1325, 540, 1440), ("216||r", 540, 1325, 637, 1440), ("215A||r", 445, 1440, 540, 1535), ("217||r", 540, 1440, 637, 1535),
  (WR, 422, 298, 478, 352), (ST, 550, 300, 607, 350), (ST, 258, 702, 325, 770), (WR, 985, 890, 1048, 958),
  ("FB2|Faculty Block|r", 715, 958, 790, 992), (LIFT, 815, 968, 882, 1008), (ST, 640, 1030, 700, 1065), (WR, 500, 1100, 552, 1150), (COMM, 572, 1118, 678, 1180),
 ], outline=[(68, 185), (160, 185), (160, 85), (258, 85), (258, 185), (1052, 185), (1052, 12), (1265, 12), (1265, 1585), (1055, 1585), (1055, 1298),
             (637, 1298), (637, 1535), (445, 1535), (445, 1325), (68, 1325), (68, 688), (25, 688), (25, 583), (68, 583)],
 voids=[([(285, 328), (1015, 328), (1015, 1165), (868, 1165), (868, 985), (678, 985), (678, 1138), (285, 1138)], "")])

AB1_3 = free_floor("AB1", "3", "Third Floor", 25, 82, .7, 1250, 1590, [
  ("304|Optoelectronics & Photonics Lab|l", 235, 82, 362, 295), ("305||r", 150, 100, 235, 185), ("306|Department Library, ECE|r", 150, 185, 235, 295),
  ("303|E&CE Lab 3|l", 362, 100, 470, 185), ("302|E&CE Lab 2|l", 362, 185, 470, 295), ("301|Communication Lab|l", 470, 100, 560, 295),
  ("307|Seminar Hall|a", 25, 300, 215, 385), ("308|Bioscience Lab 2|l", 25, 385, 150, 470), ("309||r", 25, 470, 150, 570), ("310||r", 25, 570, 150, 675),
  ("311||r", 25, 675, 150, 760), ("312||r", 25, 760, 150, 860),
  ("329||r", 610, 295, 700, 400), ("328||r", 700, 295, 780, 400), ("327||r", 780, 295, 855, 400), ("326||r", 855, 295, 930, 400), ("325||r", 930, 295, 1045, 400),
  (WR, 1045, 150, 1105, 250), ("324B||r", 1105, 140, 1250, 225), ("324A||r", 1105, 225, 1250, 295),
  ("323||r", 1105, 295, 1250, 470), ("322||r", 1105, 470, 1250, 590), ("321B||r", 1105, 590, 1250, 735), ("321A||r", 1105, 735, 1250, 890),
  ("320||r", 1105, 890, 1250, 1040), ("319||r", 1105, 1040, 1250, 1362),
  ("318||r", 1085, 1362, 1250, 1500), (WR, 1085, 1500, 1170, 1590),
  ("313|Central Analytics Facilities|l", 90, 1270, 190, 1360), ("314||r", 190, 1270, 275, 1360), ("315|NICOP Research Lab|l", 275, 1270, 365, 1360),
  ("316||r", 365, 1270, 455, 1360), ("317||r", 455, 1270, 527, 1360),
  ("FB5|Faculty Block|r", 785, 1308, 880, 1360), (COMM, 930, 1300, 1085, 1362),
  (WR, 330, 437, 385, 497), (ST, 478, 440, 535, 495), (ST, 202, 512, 275, 568),
  (WR, 285, 1155, 352, 1200), ("datacentre|Data Centre|r", 388, 1150, 500, 1202), (ST, 500, 1085, 560, 1135), ("FB4|Faculty Block|r", 640, 1080, 700, 1150),
  ("DHM||r", 770, 1200, 895, 1250),
 ], outline=[(25, 295), (150, 295), (150, 100), (235, 100), (235, 82), (362, 82), (362, 100), (560, 100), (560, 295), (1045, 295), (1045, 140), (1250, 140),
             (1250, 1590), (1085, 1590), (1085, 1360), (770, 1360), (770, 1500), (527, 1500), (527, 1360), (25, 1360)],
 voids=[([(228, 460), (925, 460), (925, 1210), (670, 1210), (670, 1055), (530, 1055), (530, 1180), (228, 1180)], ""),
        ([(527, 1360), (770, 1360), (770, 1500), (527, 1500)], "Open space")])

FLOORS[0:0] = [AB1_G, AB1_1, AB1_2, AB1_3]

# ───────────────────────── LHC Third Floor (from the supplied sketch; sketch pixels scaled by free_floor) ─────────────────────────
# Kept OUT of FLOORS on purpose: build_lhc_3.py renders it on its own, so regenerating the other floors never touches it.
# Annotations written beside the sketch's rooms ("A-F", "A-H", …) are kept as the room's second line. Their meaning is not stated in the sketch.
WSL = "ws|WS|u"
def _vcol(x1, x2, rows):          # a column of rooms: (item, y1, y2)
    return [(it, x1, a, x2, b) for it, a, b in rows]
LHC_3 = free_floor("LHC", "3", "Third Floor", 25, 0, 1.45, 772, 1020,
  [("grand|Grand Staircase|u", 138, 5, 608, 165)]
  # west column (x 143–175)
  + _vcol(143, 175, [(LIFT, 172, 205), (WSL, 205, 245), ("308|A-F|r", 292, 325), ("307|A-H|r", 325, 358), ("306|A-G|r", 358, 392), ("305|A-D|r", 392, 425),
                     ("D8||r", 425, 465), (LIFT, 465, 505), ("304|A-F|r", 505, 540), ("303|A-F|r", 540, 575), ("302|A-H|r", 575, 615), ("301|A-F|r", 615, 648),
                     ("blank||n", 650, 688), ("hod-w|HOD Cabin|a", 688, 785), ("pantry|Lounge Pantry|s", 785, 820)])
  # east column (x 577–608)
  + _vcol(577, 608, [(LIFT, 172, 212), ("wspantry|WS / Pantry|s", 212, 292), ("325|A-F|r", 331, 365), ("324|A-H|r", 365, 394), ("322|A-G|r", 394, 430),
                     ("D10|A-D|r", 430, 468), (WSL, 468, 500), (LIFT, 500, 535), ("321|A-D|r", 535, 592), ("320|A-F|r", 592, 628), ("319|A-H|r", 628, 663),
                     ("318|A-G|r", 663, 697), ("317|A-F|r", 697, 730), (WSL, 733, 765)])
  # seating blocks in the sitting area
  + _vcol(250, 517, [("309||r", 293, 321), ("310||r", 321, 350), ("311||r", 408, 429.75), ("312||r", 429.75, 451.5), ("313||r", 451.5, 473.25), ("314||r", 473.25, 495),
                     ("315||r", 557, 585), ("316||r", 585, 612)])
  # HOD cabin block (hatched cells are drawn but not selectable)
  + [("x||h", 250, 710, 310, 750), ("hod-s1|HOD Cabin|a", 310, 710, 370, 750), ("x||h", 370, 710, 428, 750), ("hod-s2|HOD Cabin|a", 428, 710, 488, 750),
     (LIFT, 198, 778, 240, 820), (LIFT, 500, 778, 545, 820)]
  # east of the building: fire exit and faculty lounge
  + [("fire|Fire Exit|e", 614, 214, 700, 262), ("lounge|Faculty Lounge|a", 614, 286, 745, 338)]
  # cabin row along the south side
  + [("dir1|Director Cabin 1|r", 35, 865, 148, 1012), ("dir2|Director Cabin 2|r", 148, 865, 260, 1012), ("ahu-w|AHU|u", 260, 865, 310, 1012),
     ("meeting|Meeting Room|a", 310, 865, 455, 1012), ("ahu-e|AHU|u", 455, 865, 508, 1012), ("dean2|Dean's Cabin 2|r", 508, 865, 612, 1012),
     ("dean1|Dean's Cabin 1|r", 612, 865, 735, 1012)],
  outline=[(138, 3), (610, 3), (610, 862), (737, 862), (737, 1014), (33, 1014), (33, 862), (138, 862)],
  voids=[([(177, 168), (575, 168), (575, 778), (177, 778)], "Sitting Area", (376, 222))])
