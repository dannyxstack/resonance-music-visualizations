"""Generate the 48 contiguous state shapes from the Census boundary ZIP.

Usage: python3 scripts/generate-america-states-data.py /path/to/cb_2025_us_state_20m.zip
"""

import json
import struct
import sys
import zipfile
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public/visualizers/america-states/states.json"
archive_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/us-states-2025.zip")

with zipfile.ZipFile(archive_path) as archive:
    shp = archive.read("cb_2025_us_state_20m.shp")
    dbf = archive.read("cb_2025_us_state_20m.dbf")

header_length = struct.unpack_from("<H", dbf, 8)[0]
record_length = struct.unpack_from("<H", dbf, 10)[0]
fields = []
offset = 1
for position in range(32, header_length - 1, 32):
    field = dbf[position:position + 32]
    name = field[:11].split(b"\0", 1)[0].decode("ascii")
    width = field[16]
    fields.append((name, offset, width))
    offset += width

states = []
cursor = 100
record_index = 0
while cursor < len(shp):
    _, words = struct.unpack_from(">ii", shp, cursor)
    record = cursor + 8
    kind = struct.unpack_from("<i", shp, record)[0]
    row = dbf[header_length + record_index * record_length:header_length + (record_index + 1) * record_length]
    attributes = {name: row[start:start + width].decode("utf-8").strip() for name, start, width in fields}
    if kind == 5:
        xmin, ymin, xmax, ymax = struct.unpack_from("<4d", shp, record + 4)
        if xmin > -130 and xmax < -60 and ymin >= 24 and ymax < 51 and attributes["STUSPS"] != "DC":
            part_count, point_count = struct.unpack_from("<ii", shp, record + 36)
            parts = struct.unpack_from(f"<{part_count}i", shp, record + 44)
            coordinates = record + 44 + part_count * 4
            rings = []
            for start, end in zip(parts, (*parts[1:], point_count)):
                ring = [list(struct.unpack_from("<2d", shp, coordinates + index * 16)) for index in range(start, end)]
                if len(ring) >= 4:
                    rings.append([[round(lon, 4), round(lat, 4)] for lon, lat in ring])
            states.append({
                "code": attributes["STUSPS"], "name": attributes["NAME"],
                "lon": round((xmin + xmax) / 2, 4), "lat": round((ymin + ymax) / 2, 4),
                "rings": rings,
            })
    cursor += 8 + words * 2
    record_index += 1

states.sort(key=lambda state: state["lon"])
assert len(states) == 48 and len({state["code"] for state in states}) == 48
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(states, separators=(",", ":")) + "\n")
print(f"Wrote {len(states)} contiguous states to {OUT}")
