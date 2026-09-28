# 陆地点阵数据

`land-dots.json` 根据 Natural Earth 的 `ne_110m_land.geojson` 生成。Natural Earth 是公有领域地图数据；这里只使用陆地多边形，不包含国家或地区边界。

来源：https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson

点阵按约 1.55° 纬度间隔、经度间隔随纬度余弦调整后采样，保存在本地文件中。作品运行时不向第三方请求地图数据。

## 城市灯光与 GDP

`city-lights.js` 保存 2026-09-28 查询时的 39 城快照，单位是**十亿美元名义 GDP**。其中 37 个数值与年份取自 [List of metropolitan areas by GDP](https://en.wikipedia.org/wiki/List_of_metropolitan_areas_by_GDP) 中所列各地区条目及其引用来源。巴拿马城使用 [巴拿马国家统计和普查局 2024 年省级名义 GDP](https://www.inec.gob.pa/archivos/P053342420251118151644COMENTARIOS.pdf) 计算代理值：巴拿马省 B/. 51,919.5 百万 + 西巴拿马省 B/. 11,524.1 百万 = B/. 63,443.6 百万，即约 63.4436 十亿美元。该两省范围大于巴拿马城都市区，不能当作严格的都市区 GDP。

本次新增城市各自采用的数值如下；来源一栏的「汇总」指上述都市区 GDP 列表：

| 城市灯点 | GDP（十亿美元） | 年份 | 统计范围 / 来源 |
| --- | ---: | ---: | --- |
| 北京 | 747.000 | 2025 | 北京市行政区 · [汇总](https://en.wikipedia.org/wiki/List_of_metropolitan_areas_by_GDP#East_and_South_East_Asia) |
| 成都 | 355.490 | 2025 | 成都市行政区 · [汇总](https://en.wikipedia.org/wiki/List_of_metropolitan_areas_by_GDP#East_and_South_East_Asia) |
| 开普敦 | 36.300 | 2024 | 开普敦都会市 · [Invest Cape Town](https://www.investcapetown.com/why-cape-town/business-essentials/cape-towns-economy-infrastructure/) |
| 波哥大 | 121.800 | 2023 | 波哥大都市区 · [汇总](https://en.wikipedia.org/wiki/List_of_metropolitan_areas_by_GDP#Latin_America) |
| 休斯顿 | 696.999 | 2023 | 大休斯顿都市区 · [汇总](https://en.wikipedia.org/wiki/List_of_metropolitan_areas_by_GDP#Northern_America) |
| 达拉斯 | 744.654 | 2023 | 达拉斯－沃斯堡都市区 · [汇总](https://en.wikipedia.org/wiki/List_of_metropolitan_areas_by_GDP#Northern_America) |
| 广州 | 460.000 | 2025 | 广州市行政区 · [汇总](https://en.wikipedia.org/wiki/List_of_metropolitan_areas_by_GDP#East_and_South_East_Asia) |
| 米兰 | 249.641 | 2023 | 米兰都市区 · [汇总](https://en.wikipedia.org/wiki/List_of_metropolitan_areas_by_GDP#Europe) |
| 慕尼黑 | 427.430 | 2021 | 慕尼黑大都会区 · [汇总](https://en.wikipedia.org/wiki/List_of_metropolitan_areas_by_GDP#Europe) |

开普敦的数据来自当地公布的名义 GDP：R6660 亿，约 US$363 亿。它低于汇总列表的 US$1000 亿收录门槛，因此另取当地来源。

城市经纬度取市中心作为灯光位置；GDP 覆盖的是统计地区，并非该中心点本身。旧金山使用整个湾区，迪拜使用迪拜－沙迦－阿治曼都市区，达拉斯使用达拉斯－沃斯堡都市区，慕尼黑使用更广的大都会区；上海、北京、成都和广州使用市行政区。各地数据年份介于 2020–2025 年，统计边界与汇率口径不完全相同，适合可视化量级，不适合作严格排名。右侧面板列出了每城所用数值和年份。

城市实心点使用 `v = 1 + 0.5 × logGDP归一化值 + 0.5 × 所选能量`，其中 GDP 对数在本项目 39 城的最小值与最大值之间归一化到 0–1，能量取值也是 0–1。绘制半径为 `基础圆圈大小 + 圆圈跳动大小 × (v - 1)` CSS 像素，两项均可选 1–10，因此半径最大为两项之和；透明度为 `v / 2`（50%–100%）。暂停时能量为 0，GDP 部分仍可让城市位置可见。城市颜色由右侧参数选择。
