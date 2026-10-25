"""
MapifyMUJ map builder. Edit floors_data.py (rooms per wall) and run: python3 build_maps.py
Outputs: maps/<bldg>_<floor>.svg (editable in Figma/Inkscape/Illustrator), maps/campus.json (room names/types), map.html (navigation page).
Floor geometry: each side of the building = outer rooms | corridor | inner rooms, so the corridor forms a loop with classes on both sides.
Item "id|name|type|weight": types r room, l lab, f food, a hall, u utility, g gap, v not part of building.
"""
import json, re, os, html, textwrap
from floors_data import FLOORS
BUILDINGS = {"AB2": "AB-2", "AIC": "AIC", "LHC": "LHC", "AB1": "AB-1", "AB3": "AB-3"}
TYPES = {"r": "Room", "l": "Lab", "f": "Food & café", "a": "Hall", "u": "Utility", "e": "Entrance"}
FILL = dict(r="#FFFFFF", l="#E7EFFD", f="#FFEFD6", a="#E3F3E8", u="#E2E6EC", s="#E2E6EC", e="#CFEAD6", n="#FFFFFF", h="url(#hatch)", v="url(#hatch)")   # h = hatched decoration (no label, not selectable)
PEN = "#1F3FD1"  # ballpoint-pen blue used for every FB room on every map
INK, CORR, CW, FONT = "#14181F", "#E9ECF0", 28, "Hanken Grotesk, Arial, Helvetica, sans-serif"
here = os.path.dirname(os.path.abspath(__file__))

def parse(s):
    p = s.split("|") + [""] * 4
    return dict(id=p[0], name=p[1], t=p[2], w=float(p[3] or 1))

def frac(items):  # share of the wall length that is real (not trailing void/gap)
    its = [parse(i) for i in items]; tot = sum(i["w"] for i in its); acc = 0; last = 0
    for i in its:
        acc += i["w"]
        if i["t"] not in "vg": last = acc
    return last / tot

def label(it, w, h):
    num = re.match(r"^[A-Za-z]{0,2}\d", it["id"])
    if it["t"] in "nh": return []                                        # unlabelled room (number not known yet)
    if it["t"] == "u": return [(it["name"] or it["id"], 11, True)]   # Stairs / WS / Elevator: same size everywhere
    if it["t"] == "s":                                                # service room (same look as "u") whose label wraps in narrow cells
        txt = it["name"] or it["id"]
        for fs in (11, 10, 9, 8):
            ch = max(int((w - 6) / (fs * .56)), 1); ls = textwrap.wrap(txt, ch, break_long_words=False) or [txt]
            if all(len(x) <= ch for x in ls) and len(ls) * fs * 1.2 <= h - 4: return [(l, fs, True) for l in ls]
        return [(txt, 8, True)]
    if it["t"] == "v": disp = "Not part of building"
    elif num and it["name"]:                                          # room number + its name underneath
        for fn in (9, 8.5, 8, 7.5, 7, 6.5):
            ch = max(int((w - 6) / (fn * .56)), 1); ls = textwrap.wrap(it["name"], ch, break_long_words=False)
            for fid in (14, 12, 11, 10):
                if fid * 1.2 + len(ls) * fn * 1.2 <= h - 4 and all(len(x) <= ch for x in ls):
                    return [(it["id"], fid, True)] + [(l, fn, False) for l in ls]
        disp = it["id"]
    else: disp = it["id"] if num else (it["name"] or it["id"])
    for fs in (14, 12, 10.5, 9, 8, 7):
        ch = max(int((w - 6) / (fs * .56)), 1); ls = textwrap.wrap(disp, ch, break_long_words=False) or [disp]
        if len(ls) * fs * 1.2 <= h - 4 and all(len(x) <= ch for x in ls): break
    return [(l, fs, True) for l in ls]

def build(fl):
    W, H = fl["W"], fl["H"]; cx1, cy1, cx2, cy2 = fl["court"]; b = fl["b"]
    layers = dict(corr=[], rooms=[], court=[]); rooms = []; pos = {}
    def depths(side, total):  # -> (outer depth, inner depth, has_corridor)
        L = fl.get(side)
        if not L or total <= 0: return 0, 0, False
        o, i = L.get("out"), L.get("in_")
        if o and i and L.get("od"): return L["od"], total - L["od"] - CW, True   # explicit outer depth
        if o and i: r = (total - CW) / 2; return r, r, True
        only = o or i
        if all(parse(x)["t"] in "vg" for x in only): return (total, 0, False) if o else (0, total, False)
        return ((total - CW, 0, True) if o else (0, total - CW, True))
    ot, it_, ct = depths("top", cy1 - 10) if cy1 > 10 else (0, 0, False)
    ob, ib, cb = depths("bottom", H - 10 - cy2)
    ol, il, cl = depths("left", cx1 - 10)
    orr, ir, cr = depths("right", W - 10 - cx2)
    top0 = 10 + ot + (CW if ct else 0); bot0 = H - 10 - ob - (CW if cb else 0)
    lx0 = 10 + ol + (CW if cl else 0); rx0 = W - 10 - orr - (CW if cr else 0)
    def room(it, x, y, w, h, door=None):
        if it["t"] == "g": return
        lines = label(it, w, h); k = ""
        fb = bool(re.match(r"^FB\d", it["id"]))
        if it["id"]: pos[it["id"]] = (x, y, w, h)
        if it["t"] not in "uvnhs":
            k = f'{b}-{it["id"]}'; rooms.append(dict(k=k, id=it["id"], name=it["name"], t=it["t"], b=b, f=fl["f"]))
        ttl = f'<title>{html.escape(it["id"] + (" · " + it["name"] if it["name"] else ""))}</title>' if k else ""
        gid = f' id="{k}"' if k else ""
        tot_h = sum(sz * 1.2 for _, sz, _ in lines); cur = y + h / 2 - tot_h / 2; tx = ""
        for txt, sz, bold in lines:
            tx += (f'<tspan x="{x + w/2:.1f}" y="{cur + sz * .95:.1f}" font-size="{sz}" font-weight="{600 if bold else 500}"'
                   f'{"" if bold else " fill-opacity=\".8\""}>{html.escape(txt)}</tspan>'); cur += sz * 1.2
        d = ""
        if door and it["t"] not in "uvs":  # door gap on the corridor-facing wall
            dx = {"top": (x + w*.3, y, x + w*.7, y), "bottom": (x + w*.3, y + h, x + w*.7, y + h),
                  "left": (x, y + h*.3, x, y + h*.7), "right": (x + w, y + h*.3, x + w, y + h*.7)}[door]
            d = f'<line x1="{dx[0]:.1f}" y1="{dx[1]:.1f}" x2="{dx[2]:.1f}" y2="{dx[3]:.1f}" stroke="{CORR}" stroke-width="4"/>'
        layers["rooms"].append(f'<g{gid}>{ttl}<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="3" fill="{"#FFFFFF" if fb else FILL[it["t"]]}" stroke="{PEN if fb else INK}" stroke-width="{1 if it["t"]=="v" else (1.8 if fb else 1.3)}"'
                     f'{" stroke-dasharray=\"4 3\"" if it["t"]=="v" else ""}/>{d}'
                     f'<text font-family="{FONT}" text-anchor="middle" fill="{"#5C6675" if it["t"]=="v" else (PEN if fb else INK)}">{tx}</text></g>')
    def run(items, x0, y0, x1, y1, horiz, door):
        its = [parse(i) for i in items]; tot = sum(i["w"] for i in its); L = (x1 - x0) if horiz else (y1 - y0); pos = 0
        for it in its:
            l = L * it["w"] / tot
            room(it, *((x0 + pos, y0, l, y1 - y0) if horiz else (x0, y0 + pos, x1 - x0, l)), door); pos += l
    def corr(x, y, w, h, horiz):
        if w > 0 and h > 0:
            layers["corr"].append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{CORR}"/>')
            cx, cy = (x, y + h/2) if horiz else (x + w/2, y)
            layers["corr"].append(f'<line x1="{cx:.1f}" y1="{cy:.1f}" x2="{(x+w) if horiz else cx:.1f}" y2="{cy if horiz else y+h:.1f}" stroke="#B8C0CC" stroke-width="1" stroke-dasharray="6 5"/>')
    ytop, ybot = 10 + ot, H - 10 - ob            # vertical range of left/right outer rows
    xl, xr = 10 + ol + (CW if cl else 0), W - 10 - orr - (CW if cr else 0)
    # corridor loop
    xa = 10 + ol; xb = W - 10 - orr
    if ct:
        f = frac(fl["top"].get("out") or fl["top"]["in_"]); corr(xa, 10 + ot, min(xb, 10 + (W - 20) * f) - xa, CW, True)
    if cb:
        f = frac(fl["bottom"].get("out") or fl["bottom"]["in_"]); corr(xa, H - 10 - ob - CW, min(xb, 10 + (W - 20) * f) - xa, CW, True)
    if cl:
        f = frac(fl["left"].get("out") or fl["left"]["in_"]); corr(10 + ol, 10 + ot if ct else 10, CW, (H - 10 - ob - (CW if cb else 0) * 0) - (10 + ot if ct else 10), False)
    if cr:
        corr(W - 10 - orr - CW, 10 + ot if ct else 10, CW, (H - 10 - ob) - (10 + ot if ct else 10), False)
    # rooms
    for side in ("top", "bottom", "left", "right"):
        L = fl.get(side)
        if not L: continue
        o, i = L.get("out"), L.get("in_")
        if side == "top" and cy1 > 10:
            if o: run(o, 10, 10, W - 10, 10 + ot, True, "bottom" if ct else None)
            if i: run(i, xl, top0, xr, cy1, True, "top")
        if side == "bottom":
            if o: run(o, 10, H - 10 - ob, W - 10, H - 10, True, "top" if cb else None)
            if i: run(i, xl, cy2, xr, bot0, True, "bottom")
        if side == "left":
            if o: run(o, 10, ytop if ct else 10, 10 + ol, ybot, False, "right" if cl else None)
            if i: run(i, lx0, cy1 if cy1 > 10 else 10, cx1, cy2, False, "left")
        if side == "right":
            if o: run(o, W - 10 - orr, ytop if ct else 10, W - 10, ybot, False, "left" if cr else None)
            if i: run(i, cx2, cy1 if cy1 > 10 else 10, rx0, cy2, False, "right")
    for vd in fl.get("voids", []):        # open areas / courtyards, drawn under the rooms; optional 3rd item = (x, y) of the label
        pts, lab = vd[0], vd[1]
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"
        layers["corr"].append(f'<path d="{d}" fill="#FFFFFF" stroke="#8A94A3" stroke-width="1.2" stroke-dasharray="6 5"/>')
        if lab:
            mx = sum(p[0] for p in pts) / len(pts); my = sum(p[1] for p in pts) / len(pts)
            if len(vd) > 2: mx, my = vd[2]
            layers["corr"].append(f'<text x="{mx:.1f}" y="{my:.1f}" font-size="12" font-style="italic" font-family="{FONT}" text-anchor="middle" fill="#5C6675">{html.escape(lab)}</text>')
    for raw, x, y, w, h in fl.get("free", []):   # free layout: absolute x, y, w, h (used for LHC)
        room(parse(raw), x, y, w, h)
    for x, y, w, h, txt in fl.get("steps", []):  # hatched block with a label (e.g. amphitheatre steps)
        layers["court"].append(f'<g><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="url(#hatch)" stroke="#8A94A3" stroke-dasharray="4 3"/>'
            f'<rect x="{x + w/2 - 72}" y="{y + h/2 - 12}" width="144" height="24" rx="12" fill="#F6F7F9" stroke="#8A94A3"/>'
            f'<text x="{x + w/2}" y="{y + h/2 + 4}" font-size="11" font-family="{FONT}" font-weight="600" text-anchor="middle" fill="#5C6675">{html.escape(txt)}</text></g>')
    for sh in fl.get("shapes", []):   # semicircle room, flat side on the bottom wall
        k = f'{b}-{sh["id"]}'; rooms.append(dict(k=k, id=sh["id"], name=sh["name"], t=sh["t"], b=b, f=fl["f"]))
        cx, cy, r = sh["cx"], sh["cy"], sh["r"]
        layers["rooms"].append(f'<g id="{k}"><title>{html.escape(sh["name"])}</title><path d="M{cx-r:.1f},{cy:.1f} A{r},{r} 0 0 1 {cx+r:.1f},{cy:.1f} Z" fill="{FILL[sh["t"]]}" stroke="{INK}" stroke-width="1.3"/>'
                     f'<text x="{cx:.1f}" y="{cy - r*.28:.1f}" font-size="12" font-family="{FONT}" font-weight="600" text-anchor="middle" fill="{INK}">{html.escape(sh["name"])}</text></g>')
    # courtyard (left empty on purpose) or inner rooms
    c = fl["centre"]; cy0 = max(cy1, 10)
    if isinstance(c, str):
        cid, ctext = c.split("|") if "|" in c else ("", c)
        gid = f' id="{b}-{cid}"' if cid else ""
        if cid: rooms.append(dict(k=f"{b}-{cid}", id=cid, name=ctext, t="a", b=b, f=fl["f"]))
        layers["court"].append(f'<g{gid}><rect x="{cx1+3}" y="{cy0+3}" width="{cx2-cx1-6}" height="{cy2-cy0-6}" rx="6" fill="#FFFFFF" fill-opacity="0.001" stroke="#8A94A3" stroke-dasharray="6 5"/>'
            f'<text x="{(cx1+cx2)/2}" y="{(cy0+cy2)/2}" font-size="13" font-family="{FONT}" font-style="italic" text-anchor="middle" fill="#5C6675">{html.escape(ctext)}</text>'
            f'<text x="{(cx1+cx2)/2}" y="{(cy0+cy2)/2+18}" font-size="11" font-family="{FONT}" text-anchor="middle" fill="#8A94A3">{BUILDINGS[b]} · {html.escape(fl["name"])}</text></g>')
    elif isinstance(c, dict):   # same-size rooms placed in a row after a reference room
        rx, ry, rw, rh = pos[c["after"]]
        for n, raw in enumerate(c["items"]): room(parse(raw), rx + rw * (n + 1), ry, rw, rh)
    else:
        run(c, cx1, cy0, cx2, cy2, True, None)
    g = lambda i, n, body: f'<g id="{i}" inkscape:label="{n}" inkscape:groupmode="layer">{"".join(body)}</g>'
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
           f'<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#C9CFD8" stroke-width="3"/></pattern></defs>'
           + (f'<path id="Building" d="M' + " L".join(f"{x:.1f},{y:.1f}" for x, y in fl["outline"]) + f' Z" fill="#F6F7F9" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>' if fl.get("outline") else f'<rect id="Building" x=".5" y=".5" width="{W-1}" height="{H-1}" rx="8" fill="#F6F7F9" stroke="{INK}"/>')
           + g("Corridor", "Corridor", layers["corr"]) + g("Rooms", "Rooms", layers["rooms"]) + g("Courtyard", "Courtyard", layers["court"]) + "</svg>")
    return svg, rooms

def main():
    os.makedirs(f"{here}/maps", exist_ok=True)
    camp = dict(buildings=[], rooms=[], types=TYPES); bm = {}; svgs = {}
    for fl in FLOORS:
        svg, rooms = build(fl); fn = f'{fl["b"]}_{fl["f"]}.svg'; open(f"{here}/maps/{fn}", "w").write(svg); svgs[fn] = svg
        if fl["b"] not in bm: bm[fl["b"]] = dict(id=fl["b"], name=BUILDINGS[fl["b"]], floors=[]); camp["buildings"].append(bm[fl["b"]])
        bm[fl["b"]]["floors"].append(dict(id=fl["f"], name=fl["name"], file=fn)); camp["rooms"] += rooms
    json.dump(camp, open(f"{here}/maps/campus.json", "w"), indent=1, ensure_ascii=False)
    page = open(f"{here}/template_map.html").read().replace("/*__EMBED__*/", json.dumps(dict(campus=camp, svgs=svgs), ensure_ascii=False))
    open(f"{here}/map.html", "w").write(page); print(len(camp["rooms"]), "rooms,", len(page)//1024, "KB")

if __name__ == "__main__": main()
