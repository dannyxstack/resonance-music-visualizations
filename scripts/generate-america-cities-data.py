"""Build the America Cities static data from 2025 U.S. Census files.

Download the three files listed in data-source.md to /tmp, then run this script.
Only Python's standard library is required.
"""

import json
import re
import struct
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/visualizers/america-cities"
NAMESPACE = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
STATE_CODES = dict(pair.split(":") for pair in (
    "Arizona:AZ California:CA Colorado:CO District_of_Columbia:DC Florida:FL "
    "Georgia:GA Illinois:IL Indiana:IN Kentucky:KY Maryland:MD Massachusetts:MA "
    "Michigan:MI Minnesota:MN Missouri:MO Nebraska:NE Nevada:NV New_Mexico:NM "
    "New_York:NY North_Carolina:NC Ohio:OH Oklahoma:OK Oregon:OR Pennsylvania:PA "
    "Tennessee:TN Texas:TX Virginia:VA Washington:WA Wisconsin:WI"
).split())
STATE_CODES = {key.replace("_", " "): value for key, value in STATE_CODES.items()}


def census_cities():
    with zipfile.ZipFile("/tmp/us-city-2025.xlsx") as book:
        strings = ["".join(item.itertext()) for item in ET.fromstring(book.read("xl/sharedStrings.xml"))]
        sheet = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
    cities = []
    for row in sheet.findall(".//m:sheetData/m:row", NAMESPACE):
        cells = {}
        for cell in row.findall("m:c", NAMESPACE):
            value = cell.find("m:v", NAMESPACE)
            if value is None:
                continue
            letter = re.match(r"[A-Z]+", cell.attrib["r"]).group()
            cells[letter] = strings[int(value.text)] if cell.attrib.get("t") == "s" else value.text
        if not cells.get("A", "").isdigit():
            continue
        rank = int(cells["A"])
        if rank > 50:
            break
        name, state = cells["B"].rsplit(", ", 1)
        cities.append({"rank": rank, "name": name, "state": STATE_CODES[state], "population": int(cells["I"])})
    assert len(cities) == 50
    return cities


def attach_coordinates(cities):
    with zipfile.ZipFile("/tmp/us-places-2025.zip") as archive:
        rows = archive.read(archive.namelist()[0]).decode("utf-8-sig").splitlines()
    places = {}
    for row in rows[1:]:
        fields = row.split("|")
        places[(fields[0], fields[4])] = (float(fields[-2]), float(fields[-1]))
    for city in cities:
        city["lat"], city["lon"] = places[(city["state"], city["name"])]
    return cities


def mainland_state_shapes():
    with zipfile.ZipFile("/tmp/us-states-2025.zip") as archive:
        data = archive.read("cb_2025_us_state_20m.shp")
    states = []
    cursor = 100
    while cursor < len(data):
        _, words = struct.unpack_from(">ii", data, cursor)
        record = cursor + 8
        kind = struct.unpack_from("<i", data, record)[0]
        if kind == 5:
            xmin, ymin, xmax, ymax = struct.unpack_from("<4d", data, record + 4)
            if xmin > -130 and xmax < -60 and ymin >= 24 and ymax < 51:
                part_count, point_count = struct.unpack_from("<ii", data, record + 36)
                parts = struct.unpack_from(f"<{part_count}i", data, record + 44)
                coordinates = record + 44 + part_count * 4
                rings = []
                for start, end in zip(parts, (*parts[1:], point_count)):
                    ring = [list(struct.unpack_from("<2d", data, coordinates + index * 16)) for index in range(start, end)]
                    if len(ring) >= 4:
                        rings.append([[round(lon, 4), round(lat, 4)] for lon, lat in ring])
                states.append(rings)
        cursor += 8 + words * 2
    assert len(states) == 49, f"Expected 48 states plus DC, got {len(states)}"
    return states


OUT.mkdir(parents=True, exist_ok=True)
(OUT / "cities.json").write_text(json.dumps(attach_coordinates(census_cities()), separators=(",", ":")) + "\n")
(OUT / "states.json").write_text(json.dumps(mainland_state_shapes(), separators=(",", ":")) + "\n")
print("Created 50 cities and 49 state/DC boundaries")
