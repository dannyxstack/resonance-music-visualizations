// Add new independent visualizers here; entry and cover are relative to public/.
export const projects = [
  {
    id: 'america-states', title: '美国州块 · 节奏跃动', english: 'AMERICA STATES',
    category: '动态频谱', location: 'CONTIGUOUS UNITED STATES', year: '2026',
    description: '平放的美国本土地图化为 48 个立体州块，跟随所选音乐能量方法上下跳动。',
    tags: ['3D 地图', '48 个州', '节奏跳动', 'BPM 预分析'],
    entry: 'visualizers/america-states/index.html', cover: 'art/america-states.svg',
    accent: '#a4a1ff', featured: false,
    instructions: '选择本地音乐后自动分析 BPM 并播放。右侧选择州块跳动能量方法、调整高度和地图视角；按 H 折叠参数面板。',
    en: { title: 'America States · Dancing Blocks', category: 'Dynamic Spectrum', description: 'A 3D map of the contiguous United States becomes 48 state blocks that rise and fall with the music.', tags: ['3D map', '48 states', 'Beat motion', 'BPM analysis'], instructions: 'Choose a local song to analyze BPM and play automatically. Set the block energy method, height and map view on the right. Press H to collapse the controls.' },
  },
  {
    id: 'america-cities', title: '美国城市 · 立体频谱', english: 'AMERICA CITIES',
    category: '城市天际线', location: 'CONTIGUOUS UNITED STATES', year: '2026',
    description: '一张平放的立体美国地图，人口最多的 50 座城市各自升起一根随音乐变化的频谱柱。',
    tags: ['3D 地图', '50 座城市', '人口数据', 'BPM 预分析'],
    entry: 'visualizers/america-cities/index.html', cover: 'art/america-cities.svg',
    accent: '#75e5f2', featured: false,
    instructions: '选择本地音乐后自动分析 BPM 并播放。右侧调整地图视角、柱高与通用能量方法；按 H 折叠参数面板。',
    en: { title: 'America Cities · 3D Spectrum', category: 'City Skylines', description: 'A 3D map of the United States with a music-reactive spectrum bar for each of its 50 most populous cities.', tags: ['3D map', '50 cities', 'Population data', 'BPM analysis'], instructions: 'Choose a local song to analyze BPM and play automatically. Adjust the map view, bar height and energy method on the right. Press H to collapse the controls.' },
  },
  {
    id: 'earth-spin', title: '地球自转 · 赤道频谱', english: 'EARTH SPIN',
    category: '宇宙旅程', location: 'PLANET EARTH', year: '2026',
    description: '点阵陆地缓缓旋转，24 根镜像频谱沿赤道环绕地球，跟随音乐向南北两极对称跃动。',
    tags: ['点阵地球', '3D 旋转', '赤道频谱', 'BPM 预分析'],
    entry: 'visualizers/earth-spin/index.html', cover: 'art/earth-spin.svg',
    accent: '#8ce9f4', featured: false,
    instructions: '选择本地音乐后自动分析 BPM 并播放。右侧可调整地球、星空与频谱，按 H 折叠参数面板。',
    en: { title: 'Earth Spin · Equatorial Spectrum', category: 'Cosmic Journeys', description: 'A dotted globe rotates slowly while 24 mirrored spectrum bars pulse north and south of the equator.', tags: ['Dotted globe', '3D rotation', 'Equatorial spectrum', 'BPM analysis'], instructions: 'Choose a local song to analyze BPM and play automatically. Adjust the globe, stars and spectrum on the right. Press H to collapse the controls.' },
  },
  {
    id: 'space-odyssey', title: '星际漫游 · 声波公路', english: 'SPACE ODYSSEY',
    category: '宇宙旅程', location: 'BEYOND THE HORIZON', year: '2026',
    description: '驶入绚丽星云。左右两侧的连续频谱沿透视公路延伸，跟随音乐与基础节拍跃动。',
    tags: ['星空', '透视公路', '双侧频谱', 'BPM 预分析'],
    entry: 'visualizers/space-odyssey/index.html', cover: 'visualizers/space-odyssey/nebula.png',
    accent: '#8ddcff', featured: false,
    instructions: '选择本地音乐后自动分析 BPM 并播放。可替换星空背景、调整频谱与道路光晕；按 H 折叠或展开操控面板。',
    en: { title: 'Space Odyssey · Spectrum Road', category: 'Cosmic Journeys', description: 'Travel through a luminous nebula. Two continuous spectrum bands follow a perspective road and pulse with the music.', tags: ['Starfield', 'Perspective road', 'Twin spectrum', 'BPM analysis'], instructions: 'Choose a local song to analyze BPM and play automatically. Replace the starfield and adjust the spectrum and road glow. Press H to toggle the controls.' },
  },
  {
    id: 'neon-spectrum', title: '霓虹 · 声浪环', english: 'NEON SPECTRUM',
    category: '动态频谱', location: 'YOUR CITY, YOUR SOUND', year: '2026',
    description: '让城市成为舞台。霓虹频谱随音乐跃动，中心封面、文字与背景都由你定义。',
    tags: ['霓虹频谱', '自定义封面', '录屏模式'],
    entry: 'visualizers/neon-spectrum/index.html', cover: 'art/neon-spectrum.svg',
    accent: '#f487de', featured: false,
    instructions: '选择本地音乐后自动分析 BPM 并播放；在画面工作台上传中心 Logo、修改文字和城市背景。按 H 展开或隐藏全部设置，按空格播放或暂停。',
    en: { title: 'Neon Spectrum · Sound Ring', category: 'Dynamic Spectrum', description: 'Make the city your stage. Customize the cover, text and backdrop around a music-reactive neon spectrum.', tags: ['Neon spectrum', 'Custom cover', 'Recording mode'], instructions: 'Choose a local song to analyze BPM and play automatically. Upload a center logo and edit text and the city background. Press H for settings and Space to play or pause.' },
  },
  {
    id: 'perth', title: '珀斯 · 雷鸣之夜', english: 'SKYLINE UNDER THUNDER',
    category: '城市天际线', location: 'PERTH, AUSTRALIA', year: '2026',
    description: '当低音划过夜空，让城市的灯光、星辰与闪电，成为音乐的回声。',
    tags: ['城市天际线', '闪电', '频谱响应'],
    entry: 'visualizers/perth/index.html', cover: 'visualizers/perth/city-skyline.gpt.16x10v2.png',
    accent: '#c7adff', featured: true,
    instructions: '选择本地音乐后自动分析 BPM 并播放。展开右侧设置可调整闪电、星空和节奏响应。',
    en: { title: 'Perth · Night of Thunder', category: 'City Skylines', description: 'Bass rolls across the night sky as city lights, stars and lightning echo the music.', tags: ['City skyline', 'Lightning', 'Spectrum response'], instructions: 'Choose a local song to analyze BPM and play automatically. Open the right panel to adjust lightning, stars and rhythm response.' },
  },
  {
    id: 'bay-area', title: '湾区 · 科技脉搏', english: 'LIVING TECHNOLOGY MAP',
    category: '数字生态', location: 'SAN FRANCISCO BAY AREA, USA', year: '2026',
    description: '跟随节拍穿行湾区。科技节点、流动粒子与连线交织成一张有生命的地图。',
    tags: ['数字生态', '粒子网络', '节拍驱动'],
    entry: 'visualizers/bay-area/index.html', cover: 'art/bay-area.svg',
    accent: '#a9eace', featured: false,
    instructions: '选择本地音乐后自动分析 BPM 并播放。可以调整响应强度、查看企业节点，并使用 D 键打开调试信息。',
    en: { title: 'Bay Area · Tech Pulse', category: 'Digital Ecosystem', description: 'Follow the beat through the Bay Area as tech nodes, flowing particles and connections form a living map.', tags: ['Digital ecosystem', 'Particle network', 'Beat driven'], instructions: 'Choose a local song to analyze BPM and play automatically. Adjust response strength, explore company nodes and press D for debug information.' },
  },
];

export function filterProjects({ query = '', category = '全部作品', favoritesOnly = false, favorites = [] } = {}) {
  const term = query.trim().toLocaleLowerCase();
  return projects.filter(p => (category === '全部作品' || p.category === category)
    && (!favoritesOnly || favorites.includes(p.id))
    && [p.title, p.english, p.description, p.location, ...p.tags, p.en.title, p.en.category, p.en.description, ...p.en.tags].join(' ').toLocaleLowerCase().includes(term));
}
