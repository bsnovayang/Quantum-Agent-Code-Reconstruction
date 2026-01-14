/**
 * 機僕駭客：量子特務 - 網站建置腳本
 * 從 Markdown 原稿自動生成整個網站
 */

const fs = require('fs');
const path = require('path');

// ===== 設定 =====
const config = {
  // 原始 Markdown 目錄
  sourceDir: 'c:/xampp/htdocs/story',
  // 輸出網站目錄
  outputDir: 'c:/xampp/htdocs/story/website',
  // Phase 對應
  phases: [
    {
      id: 'phase-01',
      title: '都市傳說篇',
      subtitle: 'Urban Legend',
      description: '為了賺藥錢而奔波的日常冒險',
      sourceFolder: 'Phase_01_Urban_Legend',
      volumeRange: [1, 7]
    },
    {
      id: 'phase-02',
      title: '記憶迷宮篇',
      subtitle: 'Memory Labyrinth',
      description: '艾倫開始察覺記憶的斷層',
      sourceFolder: 'Phase_02_Memory_Labyrinth',
      volumeRange: [8, 15]
    },
    {
      id: 'phase-03',
      title: '量子戰爭篇',
      subtitle: 'Quantum War',
      description: '七大企業與地下勢力全面開戰',
      sourceFolder: 'Phase_03_Quantum_War',
      volumeRange: [16, 30]
    },
    {
      id: 'phase-04',
      title: '創世紀重構篇',
      subtitle: 'Genesis Reconstruction',
      description: '與世界創造者的對話',
      sourceFolder: 'Phase_04_Genesis',
      volumeRange: [31, 99]
    }
  ]
};

// ===== 工具函數 =====

/**
 * 確保目錄存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 從 Markdown 提取標題
 */
function extractTitle(content) {
  const lines = content.split(/\r?\n/);
  let mainTitle = '';
  let subTitle = '';

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      mainTitle = h1Match[1];
      continue;
    }
    const h2Match = line.match(/^##\s+(?:\[Part\s*\d+\]\s*)?(.+)$/);
    if (h2Match) {
      subTitle = h2Match[1];
      break;
    }
  }

  return { mainTitle, subTitle };
}

/**
 * 將 Markdown 內容轉換為 HTML
 */
function mdToHtml(content) {
  let html = '';
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 跳過標題
    if (trimmed.startsWith('#')) continue;

    // 轉換格式
    let processed = trimmed
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

    html += `      <p>${processed}</p>\n`;
  }

  return html;
}

/**
 * 從 Volume 資料夾名稱提取資訊
 */
function parseVolumeFolderName(folderName) {
  // Vol_01_Ghost_Signal -> { num: 1, id: 'ghost-signal', title: 'Ghost Signal' }
  const match = folderName.match(/Vol_(\d+)_(.+)/);
  if (!match) return null;

  const num = parseInt(match[1]);
  const rawName = match[2];
  const id = `vol-${num.toString().padStart(2, '0')}`;
  const title = rawName.replace(/_/g, ' ');

  return { num, id, title, folderName };
}

/**
 * 掃描 Phase 目錄，收集所有章節資訊
 */
function scanPhase(phaseConfig) {
  const phaseSourcePath = path.join(config.sourceDir, phaseConfig.sourceFolder);

  if (!fs.existsSync(phaseSourcePath)) {
    console.log(`  [跳過] ${phaseConfig.sourceFolder} 不存在`);
    return null;
  }

  const volumes = [];
  const entries = fs.readdirSync(phaseSourcePath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('Vol_')) continue;

    const volInfo = parseVolumeFolderName(entry.name);
    if (!volInfo) continue;

    const volPath = path.join(phaseSourcePath, entry.name);
    const chapters = scanVolumeChapters(volPath);

    // 讀取 Outline 獲取描述
    const outlinePath = path.join(volPath, `Vol_${volInfo.num.toString().padStart(2, '0')}_Outline.md`);
    let description = '';
    if (fs.existsSync(outlinePath)) {
      const outlineContent = fs.readFileSync(outlinePath, 'utf-8');
      const descMatch = outlineContent.match(/不存在的樓層|幽靈訊號|記憶販賣者|[^#\n]+/);
      // 簡單取第一段非標題文字作為描述
    }

    volumes.push({
      id: volInfo.id,
      num: volInfo.num,
      title: volInfo.title,
      subtitle: getVolumeSubtitle(volInfo.title),
      description: '',
      sourceFolder: entry.name,
      chapters
    });
  }

  // 按卷號排序
  volumes.sort((a, b) => a.num - b.num);

  return {
    id: phaseConfig.id,
    title: phaseConfig.title,
    subtitle: phaseConfig.subtitle,
    description: phaseConfig.description,
    volumes
  };
}

/**
 * 掃描 Volume 內的章節
 */
function scanVolumeChapters(volPath) {
  const chapters = [];
  const files = fs.readdirSync(volPath).filter(f => f.endsWith('.md'));

  for (const file of files) {
    // 跳過 Outline 和其他非章節檔案
    if (file.includes('Outline') || file.includes('Summary') || file.includes('人設')) continue;

    const filePath = path.join(volPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { mainTitle, subTitle } = extractTitle(content);

    let chapterId, displayTitle;

    if (file.startsWith('00_Prologue')) {
      chapterId = 'prologue';
      displayTitle = mainTitle || '序章';
    } else if (file.startsWith('Epilogue')) {
      chapterId = 'epilogue';
      displayTitle = mainTitle || '終章';
    } else {
      // 01_Chapter1_Part1.md -> ch01-01
      const match = file.match(/(\d+)_Chapter(\d+)_Part(\d+)\.md/);
      if (match) {
        const chNum = match[2].padStart(2, '0');
        const partNum = match[3].padStart(2, '0');
        chapterId = `ch${chNum}-${partNum}`;
        displayTitle = subTitle ? `${mainTitle} - ${subTitle}` : mainTitle;
      } else {
        continue;
      }
    }

    chapters.push({
      id: chapterId,
      title: displayTitle,
      sourceFile: file,
      htmlFile: `${chapterId}.html`
    });
  }

  // 排序
  chapters.sort((a, b) => {
    const order = { 'prologue': 0, 'epilogue': 999 };
    const aOrder = order[a.id] ?? parseInt(a.id.replace(/[^\d]/g, ''));
    const bOrder = order[b.id] ?? parseInt(b.id.replace(/[^\d]/g, ''));
    return aOrder - bOrder;
  });

  return chapters;
}

/**
 * 獲取 Volume 中文副標題
 */
function getVolumeSubtitle(englishTitle) {
  const subtitles = {
    'Ghost Signal': '幽靈訊號',
    'Memory Vendor': '記憶販賣者',
    'The Non Existent Floor': '不存在的樓層',
    'Steel Lullaby': '鋼鐵搖籃曲',
    'The Fake Expo': '虛假的博覽會'
  };
  return subtitles[englishTitle] || '';
}

// ===== 生成函數 =====

/**
 * 生成 chapters.json
 */
function generateChaptersJson(phasesData) {
  const data = {
    title: '機僕駭客：量子特務',
    subtitle: 'Quantum Agent: Code Reconstruction',
    lastUpdated: new Date().toISOString(),
    phases: phasesData.filter(p => p !== null)
  };

  const outputPath = path.join(config.outputDir, 'data', 'chapters.json');
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[生成] ${outputPath}`);

  return data;
}

/**
 * 生成章節 HTML
 */
function generateChapterHtml(chapter, volume, phase, prevChapter, nextChapter) {
  const volSourcePath = path.join(
    config.sourceDir,
    phase.sourceFolder || config.phases.find(p => p.id === phase.id)?.sourceFolder,
    volume.sourceFolder
  );

  const mdPath = path.join(volSourcePath, chapter.sourceFile);
  if (!fs.existsSync(mdPath)) {
    console.log(`  [跳過] ${mdPath} 不存在`);
    return null;
  }

  const content = fs.readFileSync(mdPath, 'utf-8');
  const htmlContent = mdToHtml(content);

  const prevHtml = prevChapter
    ? `<a href="${prevChapter.htmlFile}" class="nav-btn" data-nav="prev">&larr; 上一章</a>`
    : `<span class="nav-btn disabled">&larr; 上一章</span>`;

  const nextHtml = nextChapter
    ? `<a href="${nextChapter.htmlFile}" class="nav-btn" data-nav="next">下一章 &rarr;</a>`
    : `<span class="nav-btn disabled">下一章 &rarr;</span>`;

  const volLabel = `${volume.id.toUpperCase().replace('-', '.')} ${volume.title.toUpperCase()}`;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${chapter.title} | 機僕駭客：量子特務</title>
  <link rel="stylesheet" href="../../../../css/style.css">
</head>
<body>
  <nav class="navbar">
    <div class="navbar-content">
      <a href="../../../../index.html" class="nav-logo">QUANTUM AGENT</a>
      <div class="nav-links">
        <a href="index.html">${volume.id.replace('vol-', 'Vol.')} 目錄</a>
        <div class="controls">
          <button class="control-btn" data-action="font-decrease" title="縮小字體">A-</button>
          <button class="control-btn" data-action="font-increase" title="放大字體">A+</button>
          <button class="control-btn" data-action="toggle-theme" title="切換主題">🌙</button>
        </div>
      </div>
    </div>
  </nav>

  <article class="reader">
    <header class="reader-header">
      <span class="reader-chapter">${volLabel}</span>
      <h1 class="reader-title">${chapter.title}</h1>
    </header>

    <div class="chapter-content">
${htmlContent}
    </div>

    <nav class="chapter-nav">
      ${prevHtml}
      <a href="index.html" class="nav-btn nav-toc">📚 目錄</a>
      ${nextHtml}
    </nav>
  </article>

  <footer class="footer">
    <p class="footer-title">QUANTUM AGENT</p>
    <p>© 2026 機僕駭客：量子特務. All rights reserved.</p>
  </footer>

  <script src="../../../../js/reader.js"></script>
</body>
</html>`;
}

/**
 * 生成 Volume 目錄頁
 */
function generateVolumeIndex(volume, phase, prevVol, nextVol) {
  const chaptersHtml = volume.chapters.map(ch => `
        <li class="chapter-item">
          <a href="${ch.htmlFile}" class="chapter-link">
            <span class="chapter-number">${ch.id === 'prologue' ? '序章' : ch.id === 'epilogue' ? '終章' : '第' + ch.id.match(/ch(\d+)/)?.[1]?.replace(/^0/, '') + '章'}</span>
            <span class="chapter-title">${ch.title}</span>
            <span class="chapter-arrow">→</span>
          </a>
        </li>`).join('\n');

  const prevHtml = prevVol
    ? `<a href="../${prevVol.id}/index.html" class="nav-btn">&larr; ${prevVol.id.replace('vol-', 'Vol.')}</a>`
    : `<span class="nav-btn disabled">&larr; 上一卷</span>`;

  const nextHtml = nextVol
    ? `<a href="../${nextVol.id}/index.html" class="nav-btn">${nextVol.id.replace('vol-', 'Vol.')} &rarr;</a>`
    : `<span class="nav-btn disabled">下一卷 &rarr;</span>`;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${volume.id.replace('vol-', 'Vol.')} ${volume.title} | 機僕駭客：量子特務</title>
  <link rel="stylesheet" href="../../../../css/style.css">
</head>
<body>
  <nav class="navbar">
    <div class="navbar-content">
      <a href="../../../../index.html" class="nav-logo">QUANTUM AGENT</a>
      <div class="nav-links">
        <a href="../../index.html">${phase.title}</a>
        <div class="controls">
          <button class="control-btn" data-action="toggle-theme" title="切換主題">🌙</button>
        </div>
      </div>
    </div>
  </nav>

  <main class="main-content">
    <section class="hero" style="padding: 2rem;">
      <img src="../../../../images/covers/${volume.id}.jpg" alt="${volume.id} 封面" 
           style="max-width: 250px; border-radius: 12px; margin-bottom: 1rem;"
           onerror="this.style.display='none'">
      <h1 class="hero-title" style="font-size: 2rem;">${volume.id.replace('vol-', 'Vol.')} ${volume.title}</h1>
      <p class="hero-subtitle">${volume.subtitle}</p>
    </section>

    <section class="toc-section">
      <h2 class="toc-header">章節目錄</h2>
      <ul class="chapter-list">
${chaptersHtml}
      </ul>
    </section>

    <nav class="chapter-nav" style="margin-top: 2rem;">
      ${prevHtml}
      <a href="../../index.html" class="nav-btn nav-toc">📚 返回 ${phase.title}</a>
      ${nextHtml}
    </nav>
  </main>

  <footer class="footer">
    <p class="footer-title">QUANTUM AGENT</p>
    <p>© 2026 機僕駭客：量子特務. All rights reserved.</p>
  </footer>

  <script src="../../../../js/reader.js"></script>
</body>
</html>`;
}

/**
 * 生成 Phase 目錄頁
 */
function generatePhaseIndex(phase) {
  const volumesHtml = phase.volumes.map(vol => `
        <a href="chapters/${vol.id}/index.html" class="volume-card">
          <img src="../../images/covers/${vol.id}.jpg" alt="${vol.id} 封面" class="volume-cover"
               onerror="this.src='../../images/covers/default.jpg'">
          <div class="volume-info">
            <span class="volume-number">${vol.id.replace('vol-', 'VOLUME ').toUpperCase()}</span>
            <h3 class="volume-title">${vol.title}</h3>
            <p class="volume-desc">${vol.subtitle}</p>
          </div>
        </a>`).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${phase.title} | 機僕駭客：量子特務</title>
  <link rel="stylesheet" href="../../css/style.css">
</head>
<body>
  <nav class="navbar">
    <div class="navbar-content">
      <a href="../../index.html" class="nav-logo">QUANTUM AGENT</a>
      <div class="nav-links">
        <a href="../../index.html">首頁</a>
        <div class="controls">
          <button class="control-btn" data-action="toggle-theme" title="切換主題">🌙</button>
        </div>
      </div>
    </div>
  </nav>

  <!-- Phase Banner -->
  <div class="banner">
    <img src="../../images/covers/${phase.id}.jpg" alt="${phase.title} Banner"
         onerror="this.src='../../images/banner.jpg'">
    <div class="banner-overlay">
      <h1 class="banner-title">${phase.title}</h1>
      <p class="banner-subtitle">${phase.subtitle.toUpperCase()}</p>
    </div>
  </div>

  <main class="main-content">
    <section class="hero" style="padding-top: 2rem;">
      <p class="hero-intro">${phase.description}</p>
    </section>

    <section>
      <h2 class="toc-header">卷冊列表</h2>
      <div class="volumes">
${volumesHtml}
      </div>
    </section>
  </main>

  <footer class="footer">
    <p class="footer-title">QUANTUM AGENT</p>
    <p>© 2026 機僕駭客：量子特務. All rights reserved.</p>
  </footer>

  <script src="../../js/reader.js"></script>
</body>
</html>`;
}

/**
 * 生成首頁
 */
function generateHomepage(phasesData) {
  const activePhasesHtml = phasesData
    .filter(p => p && p.volumes.length > 0)
    .map(phase => `
        <a href="phases/${phase.id}/index.html" class="volume-card">
          <img src="images/covers/${phase.id}.jpg" alt="${phase.title}" class="volume-cover"
               onerror="this.src='images/banner.jpg'">
          <div class="volume-info">
            <span class="volume-number">${phase.id.replace('phase-', 'PHASE ').toUpperCase()}</span>
            <h3 class="volume-title">${phase.title}</h3>
            <p class="volume-desc">${phase.description} (${phase.volumes.length} 卷)</p>
          </div>
        </a>`).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="《機僕駭客：量子特務》- 一場關於「遺忘」與「守護」的賽博生存遊戲。">
  <title>機僕駭客：量子特務 | Quantum Agent</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <nav class="navbar">
    <div class="navbar-content">
      <a href="index.html" class="nav-logo">QUANTUM AGENT</a>
      <div class="nav-links">
        <div class="controls">
          <button class="control-btn" data-action="toggle-theme" title="切換主題">🌙</button>
        </div>
      </div>
    </div>
  </nav>

  <!-- Banner -->
  <div class="banner">
    <img src="images/banner.jpg" alt="機僕駭客：量子特務 Banner">
    <div class="banner-overlay">
      <h1 class="banner-title">機僕駭客：量子特務</h1>
      <p class="banner-subtitle">QUANTUM AGENT: CODE RECONSTRUCTION</p>
      <p class="banner-quote">「主人，需為您毀滅世界嗎？」</p>
    </div>
  </div>

  <main class="main-content">
    <section class="hero" style="padding-top: 2rem;">
      <p class="hero-intro">
        為了守護故障的恐怖谷女僕，落魄駭客被迫燃燒記憶改寫現實。<br>
        這是一場關於「遺忘」與「活下去」的賽博生存物語。
      </p>
    </section>

    <!-- 特色卡片 -->
    <section class="features">
      <div class="feature-card">
        <div class="feature-icon">🤖</div>
        <h3 class="feature-title">邏輯病嬌</h3>
        <p class="feature-desc">女僕的愛太沉重，物理意義上的沉重。</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🧠</div>
        <h3 class="feature-title">用命開掛</h3>
        <p class="feature-desc">以「遺忘」換取「奇蹟」，最痛的異能設定。</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">💰</div>
        <h3 class="feature-title">貧窮物語</h3>
        <p class="feature-desc">最大的敵人不是企業巨頭，而是下個月的房租。</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">👻</div>
        <h3 class="feature-title">都市怪談</h3>
        <p class="feature-desc">硬核科幻與克蘇魯式的單元劇冒險。</p>
      </div>
    </section>

    <!-- Phase 列表 -->
    <section>
      <h2 class="toc-header">故事篇章</h2>
      <div class="volumes">
${activePhasesHtml}
      </div>
    </section>
  </main>

  <footer class="footer">
    <p class="footer-title">QUANTUM AGENT</p>
    <p>© 2026 機僕駭客：量子特務. All rights reserved.</p>
  </footer>

  <script src="js/reader.js"></script>
</body>
</html>`;
}

// ===== 主程式 =====

async function build() {
  console.log('========================================');
  console.log('  機僕駭客：量子特務 - 網站建置腳本');
  console.log('========================================\n');

  // 1. 掃描所有 Phase
  console.log('[1/4] 掃描原始檔案...');
  const phasesData = [];
  for (const phaseConfig of config.phases) {
    console.log(`  掃描 ${phaseConfig.id}...`);
    const phaseData = scanPhase(phaseConfig);
    if (phaseData) {
      phaseData.sourceFolder = phaseConfig.sourceFolder;
      phasesData.push(phaseData);
      console.log(`    發現 ${phaseData.volumes.length} 卷`);
    }
  }

  // 2. 生成 JSON
  console.log('\n[2/4] 生成 chapters.json...');
  generateChaptersJson(phasesData);

  // 3. 生成 HTML
  console.log('\n[3/4] 生成 HTML 檔案...');

  for (const phase of phasesData) {
    if (!phase) continue;

    // Phase 目錄
    const phaseDir = path.join(config.outputDir, 'phases', phase.id);
    ensureDir(phaseDir);

    const phaseIndexHtml = generatePhaseIndex(phase);
    fs.writeFileSync(path.join(phaseDir, 'index.html'), phaseIndexHtml, 'utf-8');
    console.log(`  [Phase] ${phase.id}/index.html`);

    // 各 Volume
    for (let vi = 0; vi < phase.volumes.length; vi++) {
      const volume = phase.volumes[vi];
      const prevVol = phase.volumes[vi - 1] || null;
      const nextVol = phase.volumes[vi + 1] || null;

      const volDir = path.join(phaseDir, 'chapters', volume.id);
      ensureDir(volDir);

      // Volume 目錄頁
      const volIndexHtml = generateVolumeIndex(volume, phase, prevVol, nextVol);
      fs.writeFileSync(path.join(volDir, 'index.html'), volIndexHtml, 'utf-8');
      console.log(`    [Volume] ${volume.id}/index.html`);

      // 各章節
      for (let ci = 0; ci < volume.chapters.length; ci++) {
        const chapter = volume.chapters[ci];
        const prevCh = volume.chapters[ci - 1] || null;
        const nextCh = volume.chapters[ci + 1] || null;

        const chapterHtml = generateChapterHtml(chapter, volume, phase, prevCh, nextCh);
        if (chapterHtml) {
          fs.writeFileSync(path.join(volDir, chapter.htmlFile), chapterHtml, 'utf-8');
        }
      }
      console.log(`      ${volume.chapters.length} 章節`);
    }
  }

  // 4. 生成首頁
  console.log('\n[4/4] 生成首頁...');
  const homepageHtml = generateHomepage(phasesData);
  fs.writeFileSync(path.join(config.outputDir, 'index.html'), homepageHtml, 'utf-8');
  console.log('  [首頁] index.html');

  console.log('\n========================================');
  console.log('  建置完成！');
  console.log('========================================');
}

// 執行
build().catch(err => {
  console.error('建置失敗:', err);
  process.exit(1);
});
