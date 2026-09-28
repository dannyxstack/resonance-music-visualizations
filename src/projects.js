// Add new independent visualizers here; entry and cover are relative to public/.
export const projects = [
  {
    id: 'neon-spectrum', title: '霓虹 · 声浪环', english: 'NEON SPECTRUM',
    category: '动态频谱', location: 'YOUR CITY, YOUR SOUND', year: '2026',
    description: '让城市成为舞台。霓虹频谱随音乐跃动，中心封面、文字与背景都由你定义。',
    tags: ['霓虹频谱', '自定义封面', '录屏模式'],
    entry: 'visualizers/neon-spectrum/index.html', cover: 'art/neon-spectrum.svg',
    accent: '#f487de', featured: false,
    instructions: '选择本地音乐并播放；在画面工作台上传中心 Logo、修改文字和城市背景。按 H 展开或隐藏全部设置，按空格播放或暂停。',
  },
  {
    id: 'perth', title: '珀斯 · 雷鸣之夜', english: 'SKYLINE UNDER THUNDER',
    category: '城市天际线', location: 'PERTH, AUSTRALIA', year: '2026',
    description: '当低音划过夜空，让城市的灯光、星辰与闪电，成为音乐的回声。',
    tags: ['城市天际线', '闪电', '频谱响应'],
    entry: 'visualizers/perth/index.html', cover: 'visualizers/perth/city-skyline.gpt.16x10v2.png',
    accent: '#c7adff', featured: true,
    instructions: '点击音符图标选择本地音乐，再点击播放。展开设置可调整闪电、星空和节奏响应。',
  },
  {
    id: 'bay-area', title: '湾区 · 科技脉搏', english: 'LIVING TECHNOLOGY MAP',
    category: '数字生态', location: 'SAN FRANCISCO BAY AREA, USA', year: '2026',
    description: '跟随节拍穿行湾区。科技节点、流动粒子与连线交织成一张有生命的地图。',
    tags: ['数字生态', '粒子网络', '节拍驱动'],
    entry: 'visualizers/bay-area/index.html', cover: 'art/bay-area.svg',
    accent: '#a9eace', featured: false,
    instructions: '在效果页面选择本地音频并播放。可以调整响应强度、查看企业节点，并使用 D 键打开调试信息。',
  },
];

export function filterProjects({ query = '', category = '全部作品', favoritesOnly = false, favorites = [] } = {}) {
  const term = query.trim().toLocaleLowerCase();
  return projects.filter(p => (category === '全部作品' || p.category === category)
    && (!favoritesOnly || favorites.includes(p.id))
    && [p.title, p.english, p.description, p.location, ...p.tags].join(' ').toLocaleLowerCase().includes(term));
}
