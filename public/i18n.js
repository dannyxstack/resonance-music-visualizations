// Shared UI localization for the gallery and independent visualizer pages.
// Keep source strings in the scenes so their audio/rendering code stays language-neutral.
(() => {
  const KEY = 'resonance:language';
  const translations = [
    // Gallery and navigation
    ['音乐可视化空间', 'Music Visualization Space'], ['首页', 'Home'], ['主导航', 'Main navigation'],
    ['探索作品', 'Explore'], ['我的收藏', 'My favorites'], ['收藏', 'Favorites'],
    ['让声音，', 'Give sound '], ['有迹可循。', 'a visible form.'],
    ['在城市、光影与数字世界之间，找到属于你的音乐形状。', 'Find the shape of your music among cities, light and digital worlds.'],
    ['用耳朵聆听。', 'Listen with your ears.'], ['用眼睛感受。', 'Feel it with your eyes.'],
    ['精选作品', 'Featured work'], ['精选场景', 'featured scene'], ['本期精选 / FEATURED', 'FEATURED'],
    ['进入视听空间', 'Enter experience'], ['探索视听世界', 'Explore audiovisual worlds'],
    ['每一首音乐，都有另一种打开方式。', 'Every song has another way to be seen.'],
    ['全部作品', 'All works'], ['动态频谱', 'Dynamic Spectrum'], ['城市天际线', 'City Skylines'],
    ['宇宙旅程', 'Cosmic Journeys'], ['数字生态', 'Digital Ecosystem'],
    ['搜索风格、城市、关键词…', 'Search styles, cities or keywords…'], ['搜索作品', 'Search works'],
    ['作品分类', 'Work categories'],
    ['还没有符合条件的收藏', 'No matching favorites yet'], ['没有找到匹配的作品', 'No matching works found'],
    ['试试其他关键词，或回到全部作品继续探索。', 'Try another keyword or browse all works.'],
    ['查看全部作品', 'View all works'], ['世界还在生长，下一种共振即将发生。', 'The world keeps growing. Another resonance is coming.'],
    ['更多城市，更多风格，更多音乐的可能。', 'More cities, more styles, more possibilities for music.'],
    ['为音乐而生 · 在浏览器中感受', 'Made for music · Experienced in your browser'],
    ['音频仅在本地处理', 'Audio is processed locally'], ['音频仅在本地处理。', 'Audio is processed locally.'],
    ['进入', 'Enter '], ['取消收藏', 'Remove favorite: '], ['场景示意图', 'scene illustration'], ['场景背景', 'scene background'],
    ['作品集', 'Collection'], ['返回作品集', 'Back to collection'], ['切换作品', 'Switch work'],
    ['使用说明', 'Instructions'], ['全屏效果', 'Fullscreen preview'], ['全屏', 'Fullscreen'],
    ['选择音乐，开始你的视听体验', 'Choose music to begin your experience'],
    ['正在加载场景…', 'Loading scene…'], ['加载较慢，可刷新页面重试', 'Loading slowly; refresh to retry'],
    ['场景未加载，请检查构建或刷新页面', 'Scene failed to load; check the build or refresh'],
    ['浏览器暂不支持画面全屏，可使用浏览器全屏模式', 'Preview fullscreen is unavailable; use browser fullscreen'],
    ['这个视听空间尚未收录。', 'This experience is not available yet.'],
    ['音乐可视化', ' music visualization'], ['切换作品或返回作品集会停止当前播放。', 'Switching works or returning to the collection stops playback.'],
    // Shared audio, tempo, and export controls
    ['打开音乐', 'Open music'], ['选择音乐', 'Choose music'], ['选择本地音乐', 'Choose local music'],
    ['暂停', 'Pause'], ['播放', 'Play'], ['播放进度', 'Playback progress'], ['尚未选择本地音乐', 'No local music selected'],
    ['尚未选择音频文件', 'No audio file selected'], ['尚未选择音乐', 'No music selected'],
    ['等待选曲', 'Waiting for music'], ['等待音频加载…', 'Waiting for audio…'], ['等待音频解码…', 'Waiting for audio decoding…'],
    ['首拍时间偏移：', 'First beat offset:'], ['首拍偏移', 'First beat offset'], ['基础 BPM：', 'Base BPM:'],
    ['基础节奏', 'Base tempo'], ['预分析方法', 'Analysis method'], ['分析方法', 'Analysis method'],
    ['重新分析 BPM', 'Reanalyze BPM'], ['音量', 'Volume'], ['音频', 'Audio'], ['音轨与播放', 'Track and playback'],
    ['选曲后自动分析并播放', 'Analyze and play after choosing music'],
    ['选曲后自动分析 BPM 并播放', 'Analyze BPM and play after choosing music'],
    ['选择音乐后自动分析并播放', 'Analyze and play automatically'],
    ['选择音乐后自动分析', 'Analyze after choosing music'],
    ['选择音乐后自动分析；结果仅作为全曲基础节奏。', 'Analyze automatically after choosing music; the result is a whole-song tempo estimate.'],
    ['选择音乐后分析低频包络', 'Low-frequency envelope is analyzed after choosing music'],
    ['秒', 's'], ['正在分析…', 'Analyzing…'], ['BPM 预分析中…', 'Analyzing BPM…'],
    ['低频包络分析中…', 'Analyzing low-frequency envelope…'],
    ['正在分析 20–130 Hz 低频包络…', 'Analyzing the 20–130 Hz low-frequency envelope…'],
    ['低频包络已就绪 · 100 帧/秒', 'Low-frequency envelope ready · 100 fps'],
    ['低频包络分析已取消', 'Low-frequency analysis canceled'],
    ['低频包络分析失败，使用实时频谱', 'Low-frequency analysis failed; using live spectrum'],
    ['低频包络分析失败，改用实时能量', 'Low-frequency analysis failed; using live energy'],
    ['正在解码本地音频…', 'Decoding local audio…'], ['正在尝试浏览器兼容解码…', 'Trying compatible browser decoding…'],
    ['音频加载失败', 'Audio loading failed'], ['音频加载失败，无法预分析 BPM', 'Audio loading failed; cannot analyze BPM'],
    ['音频加载失败，无法分析 BPM。', 'Audio loading failed; cannot analyze BPM.'],
    ['无法解码音频以预分析 BPM，仍可尝试播放', 'Cannot decode audio for BPM analysis; playback may still work'],
    ['未检测到稳定节奏，可换方法重新分析', 'No stable rhythm found; try another method'],
    ['未检测到稳定节奏，可更换方法后重新分析', 'No stable rhythm found; try another method'],
    ['未检测到稳定节奏，可切换方法重试', 'No stable rhythm found; try another method'],
    ['BPM 分析失败，音乐仍可播放', 'BPM analysis failed; music can still play'],
    ['已切换方法，点击重新分析 BPM', 'Method changed; click Reanalyze BPM'],
    ['已切换方法；当前显示上次结果，点击重新分析 BPM 更新。', 'Method changed; the previous result is shown. Click Reanalyze BPM to update.'],
    ['当前显示上次结果，点击重新分析 BPM 更新。', 'The previous result is shown. Click Reanalyze BPM to update.'],
    ['播放结束 · 可重新播放或选择音乐', 'Playback ended · Replay or choose music'],
    ['正在播放 · 州块正在随节奏跳动', 'Playing · States are moving to the beat'],
    ['正在播放 · 城市频谱已启动', 'Playing · City spectrum active'],
    ['正在播放 · 地球随音乐旋转', 'Playing · Globe rotating with the music'],
    ['正在播放 · 已自动启动', 'Playing · Started automatically'],
    ['播放结束', 'Playback ended'], ['已暂停', 'Paused'], ['可再次播放', 'Can be replayed'],
    ['正在自动播放', 'Starting playback automatically'], ['正在加载：', 'Loading: '],
    ['正在加载 ·', 'Loading ·'], ['正在兼容解码 ·', 'Trying compatible decoding ·'],
    ['已就绪：', 'Ready: '], ['正在播放：', 'Playing: '], ['已暂停：', 'Paused: '],
    ['播放结束：', 'Playback ended: '], ['已完成', 'Completed'], ['已检出', 'Detected'], ['拍', 'beats'],
    ['实时频谱', 'Live spectrum'], ['节拍能量', 'Beat energy'],
    ['实时 50% + 节拍 50%', 'Live 50% + beat 50%'],
    ['实时 50% + vizzy低频 50%', 'Live 50% + Vizzy bass 50%'],
    ['节拍 50% + vizzy低频 50%', 'Beat 50% + Vizzy bass 50%'],
    ['vizzy低频·分柱', 'Vizzy bass · per bar'], ['vizzy低频·波纹', 'Vizzy bass · ripple'],
    ['vizzy低频', 'Vizzy bass'], ['多频段节拍追踪（推荐）', 'Multiband beat tracking (recommended)'],
    ['综合瞬态', 'Combined onset'], ['低频鼓点', 'Bass drum'],
    ['视频导出', 'Video export'], ['分辨率', 'Resolution'], ['帧率', 'Frame rate'],
    ['从歌曲开头实时录制 Canvas 画面和原音乐；耗时约为歌曲时长。', 'Record the canvas and original audio from the beginning in real time; this takes about as long as the song.'],
    ['选择音乐后可导出 WebM 视频', 'Choose music to export a WebM video'],
    ['选择音乐后可导出', 'Choose music to export'], ['导出视频', 'Export video'], ['取消导出', 'Cancel export'],
    ['正在解码音乐…', 'Decoding music…'], ['正在实时录制…', 'Recording in real time…'],
    ['导出完成：WebM，包含原音乐', 'Export complete: WebM with original audio'],
    ['已取消导出。', 'Export canceled.'], ['导出失败：', 'Export failed: '],
    ['未知错误', 'Unknown error'], ['请选择可解码的音乐文件。', 'Choose a decodable music file.'],
    ['此浏览器没有可用的 WebCodecs 音视频编码组合。', 'No supported WebCodecs audio/video codec combination is available in this browser.'],
    ['无法创建导出画布。', 'Could not create the export canvas.'], ['无法创建录制画布。', 'Could not create the recording canvas.'],
    ['此浏览器既无法逐帧编码，也不支持 canvas 实时录制。', 'This browser supports neither frame-by-frame encoding nor live canvas recording.'],
    ['此浏览器没有可用的 WebM 录制格式。', 'No supported WebM recording format is available in this browser.'],
    ['浏览器尚未允许播放录制音频，请再次点击导出。', 'The browser has not allowed recording audio playback. Click Export again.'],
    ['浏览器录制失败。', 'Browser recording failed.'],
    ['当前页面无法使用 WebCodecs 视频编码。请选择「自动选择」或「实时录制」。', 'WebCodecs encoding is unavailable here. Choose Auto or Real-time recording.'],
    ['当前访问地址不是安全上下文，WebCodecs 不可用。可改用 localhost、127.0.0.1 或 HTTPS，或选择实时录制。', 'WebCodecs needs a secure context. Use localhost, 127.0.0.1 or HTTPS, or choose real-time recording.'],
    ['当前浏览器未允许全屏', 'The browser did not allow fullscreen'],
    ['退出全屏（Esc）', 'Exit fullscreen (Esc)'], ['视觉效果全屏', 'Visual fullscreen'],
    ['浏览器阻止了播放，请再次点击播放按钮。', 'The browser blocked playback. Click Play again.'],
    ['音频加载超时，请重新选择文件。', 'Audio loading timed out. Choose the file again.'],
    ['无法解码这首音乐：文件可能损坏或使用了浏览器不支持的编码。请尝试标准 MP3 或 PCM WAV 文件。', 'Could not decode this music. The file may be damaged or use an unsupported codec. Try a standard MP3 or PCM WAV.'],
    ['无法读取或播放音频，请重新选择文件。', 'Could not read or play the audio. Choose the file again.'],
    // Shared scene controls
    ['收起参数', 'Collapse controls'], ['展开参数', 'Expand controls'],
    ['收起面板', 'Collapse panel'], ['展开面板', 'Expand panel'],
    ['收起设置', 'Collapse settings'], ['展开设置', 'Expand settings'],
    ['画面参数', 'Visual settings'], ['画面工作台', 'Visual workspace'],
    ['全屏画面', 'Fullscreen preview'], ['关闭', 'Off'], ['显示', 'Show'],
    ['频谱响应', 'Spectrum response'], ['能量灵敏度', 'Energy sensitivity'],
    ['数据来源与口径 ↗', 'Data sources and methodology ↗'],
    ['01 / 地图视角', '01 / Map view'], ['俯视角度', 'View angle'], ['水平旋转', 'Horizontal rotation'],
    ['地图平放并以透视投影呈现；柱子从城市坐标垂直升起。', 'The map lies flat in perspective; bars rise vertically from city coordinates.'],
    ['48 州平放在地图底座上，以透视投影呈现。', 'The 48 states lie on a map base in perspective.'],
    ['02 / 城市频谱', '02 / City spectrum'], ['城市柱能量方法', 'City bar energy method'],
    ['柱高比例', 'Bar height'], ['50 座城市按人口排名映射低频到高频。柱径 = 1 + 归一化 log(人口)，范围 1–3。', 'The 50 cities map from bass to treble by population rank. Bar diameter = 1 + normalized log(population), from 1 to 3.'],
    ['03 / 城市数据', '03 / City data'], ['2025 年人口估计 · 美国人口普查局。地图只显示美国本土 48 州与华盛顿特区。', '2025 population estimates · U.S. Census Bureau. The map shows the contiguous 48 states and Washington, D.C.'],
    ['查看 50 城人口', 'View population of 50 cities'],
    ['02 / 州块跳动', '02 / State blocks'], ['州块跳动能量方法', 'State block energy method'],
    ['跳动高度', 'Jump height'], ['每州是固定厚度的独立立体块，音乐能量让整块上下升降。实时频谱按州从西到东分配低频到高频。', 'Each state is a separate 3D block. Music moves the whole block up and down. Live frequencies run from west to east.'],
    ['03 / 地图数据', '03 / Map data'], ['美国人口普查局 2025 年州界数据；只包含本土 48 州，不含华盛顿特区。', 'U.S. Census Bureau 2025 state boundaries; contiguous 48 states only, excluding Washington, D.C.'],
    ['查看 48 州', 'View 48 states'], ['04 / 基础节奏', '04 / Base tempo'], ['05 / 音频', '05 / Audio'],
    ['州块参数', 'State controls'], ['城市参数', 'City controls'],
    ['美国本土立体地图与五十座城市频谱柱视频预览', 'Video preview of a 3D U.S. map and 50 city spectrum bars'],
    ['美国城市频谱参数', 'U.S. city spectrum controls'],
    ['美国本土四十八州立体方块随音乐上下跳动的视频预览', 'Video preview of 48 U.S. state blocks moving to music'],
    ['美国州块频谱参数', 'U.S. state spectrum controls'],
    ['点阵地球与赤道频谱视频预览', 'Video preview of a dotted globe and equatorial spectrum'],
    ['地球与频谱参数', 'Globe and spectrum controls'],
    ['音乐频谱可视化', 'Music spectrum visualization'], ['霓虹声浪环视频预览', 'Neon spectrum video preview'],
    ['可视化设置', 'Visualization settings'], ['基础节奏分析', 'Base tempo analysis'],
    ['Logo 背景方式', 'Logo background style'], ['输入中心文案', 'Enter center text'],
    ['输入副标题', 'Enter subtitle'], ['输入视频标题', 'Enter video title'],
    ['输入作者', 'Enter author'], ['星际公路视频预览', 'Space road video preview'],
    ['星际漫游操控面板', 'Space Odyssey control panel'],
    ['基础 BPM 预分析', 'Base BPM analysis'], ['柱状能量条方法', 'Bar energy method'],
    ['地图或城市数据加载失败，请刷新页面重试', 'Map or city data failed to load. Refresh and try again.'],
    ['州界数据加载失败，请刷新页面重试', 'State boundary data failed to load. Refresh and try again.'],
    ['陆地点阵加载失败，请刷新页面重试', 'Land dot data failed to load. Refresh and try again.'],
    ['01 / 地球与星空', '01 / Globe and stars'], ['地球大小', 'Globe size'], ['旋转速度', 'Rotation speed'],
    ['星星数量', 'Star count'], ['陆地点大小', 'Land dot size'], ['02 / 赤道频谱', '02 / Equatorial spectrum'],
    ['24 根柱：低→高→低镜像排列；南北两侧独立跳动，最高抵达南北纬 30°。', '24 bars mirror bass to treble to bass. North and south pulse independently, up to 30° latitude.'],
    ['北侧柱状带能量方法', 'North band energy method'], ['南侧柱状带能量方法', 'South band energy method'],
    ['地球外侧光圈使用 96 根镜像频谱柱，独立响应音乐。', 'An outer ring of 96 mirrored spectrum bars reacts independently to music.'],
    ['环绕光圈能量方法', 'Outer ring energy method'], ['光圈最大高度', 'Maximum ring height'],
    ['高度按地球半径计算；光圈较高时会自动留出画面边距。', 'Height is relative to globe radius; the frame makes room for taller rings.'],
    ['03 / 城市灯光', '03 / City lights'], ['座城市随地球旋转；log(GDP) 与所选能量各占 50%，共同控制实心点跳动与亮度。', 'cities rotate with the globe; log(GDP) and selected energy each contribute 50% to dot size and brightness.'],
    ['灯光能量方法', 'City light energy method'], ['灯光颜色', 'Light color'],
    ['基础圆圈大小', 'Base dot size'], ['圆圈跳动大小', 'Dot pulse size'],
    ['最大大小 = 基础圆圈大小 + 圆圈跳动大小', 'Maximum size = base size + pulse size'],
    ['城 GDP 数据', 'city GDP data'], ['查看', 'View'],
    ['单位：十亿美元，名义 GDP。年份与统计边界因城市而异；* 为巴拿马城代理值。开普敦采用当地官方发布值。', 'Nominal GDP in USD billions. Years and metro boundaries vary; * is a proxy for Panama City. Cape Town uses local official data.'],
    ['数据来源与口径说明 ↗', 'Data sources and methodology ↗'], ['地球参数', 'Globe controls'],
    ['道路与星空', 'Road and stars'], ['驾驶舱', 'Flight controls'], ['道路光晕', 'Road glow'],
    ['频谱灵敏度', 'Spectrum sensitivity'], ['左侧柱状带能量方法', 'Left band energy method'],
    ['右侧柱状带能量方法', 'Right band energy method'], ['背景暗度', 'Background dimming'],
    ['流动星星', 'Moving'], ['颗', 'stars'], ['替换星空背景', 'Replace starfield'],
    ['恢复默认星空', 'Restore default starfield'], ['道路舞者', 'Road dancer'],
    ['舞者样式', 'Dancer style'], ['视频剪影 · 青紫舞者', 'Video silhouette · Cyan and purple dancer'],
    ['骨架剪影', 'Skeleton silhouette'], ['透明动画序列', 'Transparent animation sequence'],
    ['骨架舞步', 'Skeleton dance'], ['街舞脚步（CMU）', 'Shuffle steps (CMU)'],
    ['跳跃舞（CMU）', 'Jump dance (CMU)'], ['太空步（CMU）', 'Moonwalk (CMU)'],
    ['经典程序动画', 'Classic procedural motion'], ['舞者大小', 'Dancer size'],
    ['道路位置', 'Road position'], ['动作幅度', 'Motion amplitude'], ['人物光晕', 'Dancer glow'],
    ['视频剪影保留原视频舞步，随音乐播放、暂停和定位；大小、位置、光晕可调。骨架舞步与动作幅度仅用于其他样式。', 'The video silhouette follows playback and seeking. Adjust its size, position and glow. Skeleton moves and amplitude apply to other styles.'],
    ['正在加载视频剪影…', 'Loading video silhouette…'], ['画面文字', 'On-screen text'],
    ['视频剪影已就绪 · 原速循环，低频驱动光晕。', 'Video silhouette ready · Loops at original speed; bass drives the glow.'],
    ['视频剪影加载失败，请刷新重试，或切换其他舞者样式。', 'Video silhouette failed to load. Refresh or choose another dancer style.'],
    ['显示标题文字', 'Show title text'], ['标题', 'Title'], ['副标题', 'Subtitle'], ['作者', 'Author'],
    ['文字位置', 'Text position'], ['左下', 'Bottom left'], ['下方居中', 'Bottom center'],
    ['左上', 'Top left'], ['上方居中', 'Top center'], ['文字颜色', 'Text color'],
    ['导出方式', 'Export method'], ['自动选择（推荐）', 'Auto (recommended)'],
    ['逐帧编码', 'Frame-by-frame encoding'], ['实时录制', 'Real-time recording'],
    ['包含原音乐。逐帧编码优先导出 MP4；实时录制导出 WebM，耗时约为歌曲时长。', 'Includes original audio. Frame-by-frame encoding prefers MP4; real-time recording creates WebM and takes about as long as the song.'],
    ['音频与自选背景只在本地浏览器处理 · 按 H 折叠面板', 'Audio and custom backgrounds stay in this browser · Press H to collapse the panel'],
    ['中心 Logo', 'Center logo'], ['让你的音乐，拥有自己的封面。', 'Give your music a cover of its own.'],
    ['音频参数', 'Audio settings'], ['纯色背景', 'Solid background'], ['上传图片', 'Upload image'],
    ['Logo 背景色', 'Logo background color'], ['选择中心图片', 'Choose center image'],
    ['图片仅在当前页面使用，文字会显示在图片前方。', 'The image stays on this page; text appears in front of it.'],
    ['请先选择一张图片；选择后会显示在中心圆盘。', 'Choose an image to show in the center disc.'],
    ['文字与排版', 'Text and layout'], ['中心文案', 'Center text'], ['颜色', 'Color'],
    ['字体', 'Font'], ['现代粗体', 'Modern bold'], ['衬线', 'Serif'], ['等宽', 'Monospace'],
    ['圆润', 'Rounded'], ['字号', 'Font size'], ['城市背景', 'City background'],
    ['霓虹声浪环', 'Neon Spectrum'], ['星际漫游', 'Space Odyssey'],
    ['环形柱状带能量方法', 'Ring band energy method'], ['默认 · PERTH SKYLINE', 'Default · Perth skyline'],
    ['低频能量条', 'Bass energy bar'], ['中频能量条', 'Midrange energy bar'],
    ['高频能量条', 'Treble energy bar'], ['城市画面能量方法', 'City scene energy method'],
    ['上传自己的城市背景', 'Upload your city background'], ['恢复默认珀斯背景', 'Restore Perth background'],
    ['黑白电影感', 'Black-and-white cinema'], ['录屏纯净模式', 'Clean recording mode'],
    ['按 H 隐藏 / 打开工作台，按空格播放 / 暂停。', 'Press H to toggle the workspace and Space to play or pause.'],
    ['正在用「', 'Analyzing with '], ['」分析本地音频…', '…'], ['」分析…', '…'],
    ['较稳定', 'fairly stable'], ['一般', 'moderate'], ['较低', 'low'],
    ['节奏可信度', 'Tempo confidence: '], ['可信度', 'confidence: '],
    ['检出', 'Detected '], ['个节拍点', ' beat points'],
    ['；可能存在半速／倍速误判。', '; half/double-time errors are possible.'],
    ['；按全曲固定 BPM 跳动。', '; pulsing to a fixed whole-song BPM.'],
    ['未检测到稳定节奏；可切换方法后重新分析。', 'No stable rhythm found; choose another method and reanalyze.'],
    ['未检测到稳定节奏。可更换方法后重新分析。', 'No stable rhythm found. Choose another method and reanalyze.'],
    ['BPM 分析失败；音频仍可正常播放。可换一种方法重试。', 'BPM analysis failed; audio can still play. Try another method.'],
    ['分析失败；音乐仍可播放，可换方法重试。', 'Analysis failed; music can still play. Try another method.'],
    ['可点击播放按钮重试。', 'Click Play to try again.'],
    ['正在加载本地音乐…', 'Loading local music…'], ['音频已就绪 · 正在自动播放', 'Audio ready · Starting playback'],
    ['无法读取这张背景图片，请选择其他图片。', 'Could not read this background image. Choose another image.'],
    ['无法读取这张背景图片。', 'Could not read this background image.'],
    ['无法读取这张 Logo 图片。', 'Could not read this logo image.'],
    ['正在等待节奏分析…', 'Waiting for tempo analysis…'],
    ['当前页面无法使用 WebCodecs。请选择「自动选择」或「实时录制」。', 'WebCodecs is unavailable here. Choose Auto or Real-time recording.'],
    ['当前访问地址不是安全上下文，WebCodecs 不可用。请选择「自动选择」或「实时录制」，或通过 localhost、127.0.0.1、HTTPS 访问。', 'WebCodecs needs a secure context. Choose Auto or Real-time recording, or use localhost, 127.0.0.1 or HTTPS.'],
    ['正在计算每帧频谱…', 'Calculating spectrum for each frame…'], ['正在逐帧渲染与编码…', 'Rendering and encoding frame by frame…'],
    ['正在实时录制…耗时约为歌曲时长', 'Recording in real time… This takes about as long as the song'],
    ['当前地址不支持逐帧编码，正在实时录制…', 'Frame-by-frame encoding is unavailable here; recording in real time…'],
    ['视频已完成，正在保存…', 'Video complete; saving…'], ['导出完成：', 'Export complete: '],
    ['，包含原音乐', ', with original audio'], ['编码环境：', 'Encoding environment: '],
    ['安全上下文', 'secure context'], ['非安全上下文', 'insecure context'],
    ['视频编码 API', 'video encoding API'], ['实时录制 API', 'real-time recording API'],
    ['不可用', 'unavailable'], ['可用', 'available'],
    // Perth's original English interface and Bay Area controls also need Chinese equivalents.
    ['Music Wave Vision Under Thunder', '雷霆之夜音乐可视化'],
    ['Audio Skyline', '音频天际线'], ['Music Wave Visualization With Skyline', '天际线音乐波形可视化'],
    ['Choose City Image', '选择城市图片'], ['Collapse settings', '收起设置'],
    ['Lightning Brightness', '闪电亮度'], ['Lightning Frequency', '闪电频次'],
    ['Base Background Brightness', '基础背景亮度'], ['Water Reflections', '水面倒影'],
    ['Star Count', '星星数量'], ['Star Speed', '星星速度'], ['Shooting Stars', '流星'],
    ['Meteor Frequency', '流星频次'], ['Lightning', '闪电'], ['Stars', '星星'], ['Show', '显示'],
    ['Sky Title Text', '天空标题文字'], ['Sky Title Rhythm', '天空标题节奏'], ['Sky Title', '天空标题'],
    ['Beat Buildings', '节拍建筑'], ['Lightning Rhythm', '闪电节奏'],
    ['Not detected', '未检测到'], ['Open Audio', '打开音频'], ['No audio selected', '尚未选择音频'],
    ['Waiting for audio', '等待音频'], ['First beat', '首拍'], ['Track', '轨道'], ['Building', '建筑'],
    ['Status', '状态'], ['Offset', '偏移'], ['Treble', '高频'], ['Mid', '中频'],
    ['Bass', '低频'], ['Main', '主轨'], ['Kick', '底鼓'], ['Backbeat', '反拍'], ['Hats', '踩镲'],
    ['Brand animation:', '品牌动画：'], ['Living Technology Map', '动态科技地图'],
    ['Bay Area Audio-Reactive Tech Ecosystem', '湾区音乐响应科技生态'],
    ['画面全屏', 'Preview fullscreen'], ['退出全屏', 'Exit fullscreen'],
    ['收起控制区', 'Collapse controls'], ['展开控制区', 'Expand controls'],
    ['画面预览 · 控制区已收起', 'Preview · Controls collapsed'],
    ['公司目录', 'Company directory'], ['节点能量方法', 'Node energy method'], ['画面能量', 'Visual energy'],
    ['音乐播放控制', 'Music playback controls'], ['BPM 分析完成', 'BPM analysis complete'],
    ['未检测到稳定 BPM', 'No stable BPM found'], ['低频已就绪', 'Bass analysis ready'],
    ['低频分析失败', 'Bass analysis failed'], ['低频', 'Bass'],
    // Company action names
    ['呼吸/缩放', 'Breathe / scale'], ['闪烁/脉冲', 'Flash / pulse'], ['发光', 'Glow'],
    ['光环变色', 'Halo hue shift'], ['振动', 'Shake'], ['金色$环绕', 'Orbiting gold $'],
    ['Logo旋转2倍速', 'Logo spin 2×'], ['Logo旋转', 'Logo spin'], ['涟漪', 'Ripple'],
    ['节拍左右跳', 'Beat side step'], ['节拍左右摆', 'Beat tilt'], ['节拍跳动', 'Beat jump'],
    ['节拍底盘放大', 'Beat base grow'], ['节拍Logo放大', 'Beat logo grow'],
    ['节拍4/6/8/圆变形', 'Beat shape morph'], ['白色射线', 'White rays'],
    ['黄色射线', 'Yellow rays'], ['紫色射线', 'Purple rays'],
    ['❤️ 举牌随拍左右晃', '❤️ Sign sways to the beat'], ['双手 👍 随拍上下摆', '👍 Arms bounce to the beat'],
    ['水平翻转 😂', 'Horizontal flip 😂'], ['垂直翻转 🙃', 'Vertical flip 🙃'],
    ['双腿四拍走步', 'Four-beat walking legs'],
    ['SOUND INTO SIGHT', '让声音可见'], ['AN INDEPENDENT VISUAL EXPERIENCE', '独立视觉体验'],
    ['YOUR MUSIC. YOUR UNIVERSE.', '你的音乐，你的宇宙。'], ['THE COLLECTION', '作品集'],
    ['AN EVER-GROWING COLLECTION', '持续生长的作品集'], ['AUDIO REACTIVE', '音乐响应'],
    ['CITY CONTROLS', '城市控制'], ['STATE CONTROLS', '州块控制'],
    ['ORBITAL CONTROLS', '轨道控制'], ['FLIGHT CONTROL', '飞行控制'],
    ['CUSTOMIZE THE EXPERIENCE', '自定义视听体验'], ['about every 6s', '约每 6 秒'],
    ['Detect Beats', '检测节拍'], ['01 / AUDIO', '01 / 音频'],
    ['02 / TEMPO', '02 / 节奏'], ['03 / SCENE', '03 / 场景'],
    ['04 / DANCER', '04 / 舞者'], ['05 / TEXT', '05 / 文字'],
    ['06 / EXPORT', '06 / 导出'],
    // Membership and cloud configuration
    ['账户 / 升级', 'Account / Upgrade'], ['制作完整视频', 'Make full video'], ['RESONANCE 账户', 'RESONANCE Account'],
    ['登录', 'Sign in'], ['注册', 'Create account'], ['找回密码', 'Reset password'],
    ['邮箱', 'Email'], ['密码', 'Password'], ['发送重置邮件', 'Send reset email'],
    ['升级 Pro', 'Upgrade to Pro'], ['管理订阅', 'Manage subscription'], ['退出登录', 'Sign out'],
    ['游客：可导出 30 秒 720p 带角标短片', 'Guest: export a 30-second 720p clip with a corner mark'],
    ['免费版：每月 3 次完整导出，单次最长 5 分钟。Pro：1080p、无角标、不限次数。', 'Free: 3 exports per month, up to 5 minutes each. Pro: 1080p, no watermark, unlimited exports.'],
    ['若邮箱已注册，重置邮件将发送给你。', 'If the email is registered, we will send a reset link.'],
    ['云端配置', 'Cloud presets'], ['仅保存场景参数与文字。音乐和图片仍在本地，重新打开时需重新选择。', 'Only scene settings and text are saved. Music and images stay local and must be selected again.'],
    ['配置名称', 'Preset name'], ['保存配置', 'Save preset'], ['选择配置', 'Select preset'],
    ['载入', 'Load'], ['删除', 'Delete'], ['登录后可保存', 'Sign in to save'],
    ['配置已保存。重新打开时需重新选择音乐和图片。', 'Preset saved. Select music and images again when reopening.'],
    ['配置已载入。音乐和图片请重新选择。', 'Preset loaded. Please select music and images again.'],
    ['已删除。', 'Deleted.'], ['正在读取导出权益…', 'Loading export benefits…'],
    ['游客：30 秒、720p、带角标', 'Guest: 30 seconds, 720p, with corner mark'],
    ['免费：本月剩余', 'Free:'], ['次；单次最多 5 分钟，720p，带角标', 'exports left this month; up to 5 minutes each, 720p, with corner mark'],
    ['次；单次 5 分钟、720p、带角标', 'exports left this month; up to 5 minutes each, 720p, with corner mark'],
    ['Pro：1080p、无角标、不限次数', 'Pro: 1080p, no watermark, unlimited exports'],
    ['免费 · 本月已导出', 'Free · exports used this month:'],
  ];

  const en = new Map();
  const zh = new Map();
  for (const [source, target] of translations) {
    // A few older scenes were authored in English; their pair order is reversed.
    if (!/[\u3400-\u9fff]/.test(source) && /[\u3400-\u9fff]/.test(target)) {
      if (!en.has(target)) en.set(target, source);
      zh.set(source, target);
    } else { en.set(source, target); zh.set(target, source); }
  }
  let language;
  try { language = localStorage.getItem(KEY) === 'zh' ? 'zh' : 'en'; } catch { language = 'en'; }
  const originals = new WeakMap();
  const rendered = new WeakMap();
  const originalTitle = document.title;
  let observer;

  function addTranslations(entries) {
    for (const [chinese, english] of entries) {
      if (!en.has(chinese)) en.set(chinese, english);
      zh.set(english, chinese);
    }
    refresh();
  }
  function translate(value, lang = language) {
    if (!value) return value;
    const trimmed = value.trim();
    const map = lang === 'en' ? en : zh;
    let result = map.get(trimmed);
    if (!result && lang === 'en' && /[\u3400-\u9fff]/.test(trimmed)) {
      result = trimmed;
      for (const [from, to] of [...en].sort((a, b) => b[0].length - a[0].length)) result = result.split(from).join(to);
    }
    if (!result) return value;
    return value.replace(trimmed, result);
  }
  function localizeNode(node) {
    const current = node.nodeValue;
    if (current !== rendered.get(node)) originals.set(node, current);
    const next = translate(originals.get(node));
    rendered.set(node, next);
    if (current !== next) node.nodeValue = next;
  }
  function localizeAttribute(element, attribute) {
    const value = element.getAttribute(attribute);
    if (value == null) return;
    let record = originals.get(element);
    if (!record) { record = {}; originals.set(element, record); }
    let last = rendered.get(element);
    if (!last) { last = {}; rendered.set(element, last); }
    if (value !== last[attribute]) record[attribute] = value;
    const next = translate(record[attribute]);
    last[attribute] = next;
    if (value !== next) element.setAttribute(attribute, next);
  }
  function scan(root = document.body) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { if (!root.parentElement?.closest('[data-i18n-skip],script,style,textarea,[contenteditable]')) localizeNode(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.closest('[data-i18n-skip],script,style,textarea,[contenteditable]')) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    const visit = node => {
      if (node.nodeType === Node.TEXT_NODE) localizeNode(node);
      else for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) localizeAttribute(node, attr);
    };
    visit(root);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.ELEMENT_NODE && node.closest('[data-i18n-skip],script,style,textarea,[contenteditable]')) continue;
      if (node.nodeType === Node.TEXT_NODE && node.parentElement?.closest('[data-i18n-skip],script,style,textarea,[contenteditable]')) continue;
      visit(node);
    }
  }
  function refresh() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    if (!document.getElementById('app')) document.title = translate(originalTitle);
    scan();
  }
  function setLanguage(next, broadcast = true) {
    language = next === 'zh' ? 'zh' : 'en';
    try { localStorage.setItem(KEY, language); } catch {}
    refresh();
    document.querySelectorAll('[data-language-select]').forEach(select => { select.value = language; });
    window.dispatchEvent(new CustomEvent('resonance-language-change', { detail: { language } }));
    if (broadcast) document.querySelectorAll('iframe').forEach(frame => {
      try { frame.contentWindow?.postMessage({ type: 'resonance-language', language }, location.origin); } catch {}
    });
  }
  function mountStandaloneSelector() {
    if (window.parent !== window || document.querySelector('[data-language-select]')) return;
    const select = document.createElement('select');
    select.setAttribute('data-language-select', '');
    select.setAttribute('data-i18n-skip', '');
    select.setAttribute('aria-label', 'Language / 语言');
    select.innerHTML = '<option value="en">English</option><option value="zh">中文</option>';
    select.value = language;
    select.className = 'standalone-language-select';
    select.addEventListener('change', () => setLanguage(select.value));
    // Keep this outside React's root and the export canvas.
    document.body.append(select);
  }
  function init() {
    refresh();
    mountStandaloneSelector();
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') scan(mutation.target);
        else if (mutation.type === 'attributes') localizeAttribute(mutation.target, mutation.attributeName);
        else mutation.addedNodes.forEach(scan);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'] });
  }
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.data?.type === 'resonance-language') setLanguage(event.data.language, false);
  });
  window.addEventListener('storage', event => { if (event.key === KEY) setLanguage(event.newValue, false); });
  window.resonanceI18n = { get language() { return language; }, setLanguage, addTranslations, translate, refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
