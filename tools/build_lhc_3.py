"""Renders ONLY the LHC Third Floor plan (LHC_3.svg) with the same generator as the other maps and saves its room list.
Run:  python3 build_lhc_3.py [output-dir]      (default ../public/maps)"""
import sys, os, json
from build_maps import build
from floors_data import LHC_3
here = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..", "public", "maps")
svg, rooms = build(LHC_3)
open(os.path.join(out, "LHC_3.svg"), "w").write(svg)
json.dump(rooms, open(os.path.join(here, "lhc_3_rooms.json"), "w"), indent=1, ensure_ascii=False)
print(len(rooms), "rooms,", LHC_3["W"], "x", LHC_3["H"])
