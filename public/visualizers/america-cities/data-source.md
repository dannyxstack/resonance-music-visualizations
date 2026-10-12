# America Cities 数据来源

- **城市排名及人口**：美国人口普查局 *Vintage 2025 Population Estimates*，表 `SUB-IP-EST2025-ANNRNK`，采用 2025 年 7 月 1 日城市建制区人口估计。这里的“城市”指建制区或表中注明的 balance 区域，**不是都市圈人口**。前 50 名均位于美国本土。
  - https://www.census.gov/data/datasets/time-series/demo/popest/2020s-total-cities-and-towns.html
  - https://www2.census.gov/programs-surveys/popest/tables/2020-2025/cities/totals/SUB-IP-EST2025-ANNRNK.xlsx
- **城市位置**：美国人口普查局 *2025 National Places Gazetteer* 的 `INTPTLAT` / `INTPTLONG` 代表坐标，并按州与建制区名称匹配人口表。
  - https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.2025.html
  - https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip
- **地图边界**：美国人口普查局 *2025 Cartographic Boundary Files* 中 1:20,000,000 州边界；仅保留本土 48 州与华盛顿特区。
  - https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_20m.zip

静态数据由 `scripts/generate-america-cities-data.py` 生成。页面离线使用 `cities.json` 与 `states.json`，不向外部服务发送音频或城市数据。

柱径使用 `1 + 2 × clamp((ln(pop) − ln(minPop)) / (ln(maxPop) − ln(minPop)), 0, 1)`，得到 1–3 的相对单位；屏幕像素直径再随透视变化。柱高由所选通用能量方法驱动。
