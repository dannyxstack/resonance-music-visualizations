# America States 地图数据

州界来自美国人口普查局的 [2025 Cartographic Boundary Files（1:20,000,000）](https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html)，具体文件为 `cb_2025_us_state_20m.zip`。数据处理脚本：`scripts/generate-america-states-data.py`。

只保留本土 48 州；阿拉斯加、夏威夷、华盛顿特区和海外领地不参与渲染。州名及邮政缩写来自同一文件的 DBF 属性表，边界来自 SHP 多边形。页面使用本地静态 `states.json`，不会上传音乐或地图数据。

各州按地理中心经度从西到东排列。使用“实时频谱”时，此顺序对应由低频到高频的 48 个频段。其余能量方法共用项目的 BPM 预分析与 vizzy低频包络。
