// Snapshot of nominal GDP in billion USD. See data-source.md for years, boundaries and sources.
export const CITY_GDP = Object.freeze([
  { name: '纽约', lat: 40.7128, lon: -74.0060, gdp: 2298.868, year: 2023 },
  { name: '洛杉矶', lat: 34.0522, lon: -118.2437, gdp: 1295.361, year: 2023 },
  { name: '旧金山', lat: 37.7749, lon: -122.4194, gdp: 1201.695, year: 2023, scope: '旧金山湾区' },
  { name: '芝加哥', lat: 41.8781, lon: -87.6298, gdp: 894.862, year: 2023 },
  { name: '休斯顿', lat: 29.7604, lon: -95.3698, gdp: 696.999, year: 2023, scope: '大休斯顿都市区' },
  { name: '达拉斯', lat: 32.7767, lon: -96.7970, gdp: 744.654, year: 2023, scope: '达拉斯－沃斯堡都市区' },
  { name: '温哥华', lat: 49.2827, lon: -123.1207, gdp: 155.650, year: 2022 },
  { name: '多伦多', lat: 43.6532, lon: -79.3832, gdp: 401.605, year: 2022 },
  { name: '迈阿密', lat: 25.7617, lon: -80.1918, gdp: 533.674, year: 2023 },
  { name: '墨西哥城', lat: 19.4326, lon: -99.1332, gdp: 401.280, year: 2024 },
  { name: '圣保罗', lat: -23.5505, lon: -46.6333, gdp: 338.860, year: 2024 },
  { name: '里约热内卢', lat: -22.9068, lon: -43.1729, gdp: 171.800, year: 2023 },
  { name: '布宜诺斯艾利斯', lat: -34.6037, lon: -58.3816, gdp: 235.600, year: 2023 },
  { name: '波哥大', lat: 4.7110, lon: -74.0721, gdp: 121.800, year: 2023, scope: '波哥大都市区' },
  { name: '巴拿马城', lat: 8.9824, lon: -79.5199, gdp: 63.4436, year: 2024, scope: '巴拿马省＋西巴拿马省代理值', proxy: true },
  { name: '伦敦', lat: 51.5072, lon: -0.1276, gdp: 1124.105, year: 2023 },
  { name: '巴黎', lat: 48.8566, lon: 2.3522, gdp: 936.809, year: 2024 },
  { name: '马德里', lat: 40.4168, lon: -3.7038, gdp: 342.184, year: 2024 },
  { name: '罗马', lat: 41.9028, lon: 12.4964, gdp: 217.693, year: 2023 },
  { name: '米兰', lat: 45.4642, lon: 9.1900, gdp: 249.641, year: 2023, scope: '米兰都市区' },
  { name: '慕尼黑', lat: 48.1351, lon: 11.5820, gdp: 427.430, year: 2021, scope: '慕尼黑大都会区' },
  { name: '哥本哈根', lat: 55.6761, lon: 12.5683, gdp: 188.455, year: 2022 },
  { name: '莫斯科', lat: 55.7558, lon: 37.6173, gdp: 704.510, year: 2024 },
  { name: '伊斯坦布尔', lat: 41.0082, lon: 28.9784, gdp: 396.300, year: 2024 },
  { name: '迪拜', lat: 25.2048, lon: 55.2708, gdp: 224.100, year: 2024, scope: '迪拜－沙迦－阿治曼都市区' },
  { name: '新加坡', lat: 1.3521, lon: 103.8198, gdp: 547.387, year: 2024 },
  { name: '上海', lat: 31.2304, lon: 121.4737, gdp: 814.100, year: 2025, scope: '上海市行政区' },
  { name: '北京', lat: 39.9042, lon: 116.4074, gdp: 747.000, year: 2025, scope: '北京市行政区' },
  { name: '成都', lat: 30.5728, lon: 104.0668, gdp: 355.490, year: 2025, scope: '成都市行政区' },
  { name: '广州', lat: 23.1291, lon: 113.2644, gdp: 460.000, year: 2025, scope: '广州市行政区' },
  { name: '首尔', lat: 37.5665, lon: 126.9780, gdp: 946.429, year: 2024 },
  { name: '香港', lat: 22.3193, lon: 114.1694, gdp: 407.176, year: 2024 },
  { name: '东京', lat: 35.6762, lon: 139.6503, gdp: 1766.000, year: 2022 },
  { name: '悉尼', lat: -33.8688, lon: 151.2093, gdp: 368.137, year: 2021 },
  { name: '墨尔本', lat: -37.8136, lon: 144.9631, gdp: 293.608, year: 2020 },
  { name: '奥克兰', lat: -36.8485, lon: 174.7633, gdp: 101.612, year: 2024 },
  { name: '曼谷', lat: 13.7563, lon: 100.5018, gdp: 250.772, year: 2024 },
  { name: '孟买', lat: 19.0760, lon: 72.8777, gdp: 196.248, year: 2025 },
  { name: '开普敦', lat: -33.9249, lon: 18.4241, gdp: 36.300, year: 2024, scope: '开普敦都会市', source: 'invest-cape-town' },
]);

export const CITY_ENERGY_METHODS = Object.freeze([
  { value: 'beat', label: '节拍能量' },
  { value: 'live-beat', label: '实时 50% + 节拍 50%' },
  { value: 'live-low', label: '实时 50% + vizzy低频 50%' },
  { value: 'beat-low', label: '节拍 50% + vizzy低频 50%' },
]);

export const CITY_LIGHT_COLORS = Object.freeze([
  { value: 'amber', label: '琥珀橙', hex: '#c96a21' },
  { value: 'cyan', label: '深海蓝', hex: '#087a9b' },
  { value: 'violet', label: '星云紫', hex: '#8448ad' },
  { value: 'coral', label: '珊瑚红', hex: '#bd4256' },
  { value: 'green', label: '翡翠绿', hex: '#19816a' },
]);

const unit = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export function cityEnergyForMethod(method, live, beat, low) {
  const l = unit(live), b = unit(beat), v = unit(low);
  switch (method) {
    case 'live-beat': return (l + b) / 2;
    case 'live-low': return (l + v) / 2;
    case 'beat-low': return (b + v) / 2;
    default: return b;
  }
}

export function cityLightValue(gdp, minGdp, maxGdp, energy) {
  if (!(gdp > 0 && minGdp > 0 && maxGdp > minGdp)) return 1 + unit(energy) / 2;
  const logGdp = unit((Math.log(gdp) - Math.log(minGdp)) / (Math.log(maxGdp) - Math.log(minGdp)));
  return 1 + 0.5 * logGdp + 0.5 * unit(energy);
}

export function cityLightRadius(baseSize, pulseSize, value) {
  return baseSize + pulseSize * unit(value - 1);
}
