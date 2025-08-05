// FLJP API v2 対応版スクリプト
const BASE_URL = 'https://fljpapi.jp/api/v2';

function toJpDate(str) {
  if (!str) return '不明';
  try {
    return new Date(str).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  } catch {
    return str;
  }
}

function formatEventTypeJa(type) {
  if (!type) return '不明なイベント';
  let s = type.replace(/^EventFlag\./, '').replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/\s+/, ' ').trim();
  s = s.replace(/\d+/g, m => m.replace(/[0-9]/g, d => '０１２３４５６７８９'[d]));
  return s;
}

// 全モードのニュースを取得
async function fetchNews() {
  const dom = document.getElementById('news');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const tags = [
      "Product.BR", "Product.Juno", "Product.BlastBerry",
      "Product.BR.Habanero", "Product.BR.NoBuild", "Product.Figment",
      "Product.Sparks", "Product.STW"
    ];
    const all = await Promise.all(tags.map(tag =>
      fetch(`${BASE_URL}/news?platform=pc&language=ja&tags=${tag}`)
        .then(r => r.ok ? r.json() : null)
    ));
    const items = all.flatMap(res => (res?.data?.contentItems || []));
    if (!items.length) return dom.innerHTML = '<div class="error">現在ニュースはありません。</div>';

    dom.innerHTML = `<div class="card-list">
      ${items.map(msg => {
        const f = msg.contentFields || {};
        let html = `<ul class="info-list">`;
        if (f.FullScreenTitle) html += `<li><strong>タイトル:</strong> ${f.FullScreenTitle}</li>`;
        if (f.FullScreenBody) html += `<li>${f.FullScreenBody}</li>`;
        if (f.TeaserTitle && f.TeaserTitle !== "​") html += `<li><strong>サブタイトル:</strong> ${f.TeaserTitle}</li>`;
        if (Array.isArray(f.FullScreenBackground?.Image))
          html += `<li><img src="${f.FullScreenBackground.Image[0].url}" style="max-width:100%;border-radius:0.5em;"></li>`;
        html += `</ul>`;
        return `<div class="card">${html}</div>`;
      }).join('')}
    </div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">取得失敗: ${err.message}</div>`;
  }
}

async function fetchTimeline() {
  const dom = document.getElementById('timeline');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const res = await fetch(`${BASE_URL}/timeline`);
    const raw = await res.json();
    const data = raw.data;
    let events = [];
    const ch = data.channels?.['client-events'];
    if (ch?.states) {
      for (const s of ch.states) {
        if (Array.isArray(s.activeEvents)) events.push(...s.activeEvents);
        if (s.state?.activeEvents) events.push(...s.state.activeEvents);
      }
    }
    const seen = new Set();
    events = events.filter(ev => {
      const key = (ev.eventType || '') + '_' + (ev.activeSince || ev.eventStart || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!events.length) return dom.innerHTML = '<div class="error">イベントがありません。</div>';
    dom.innerHTML = `<div class="card-list">
      ${events.map(ev => {
        let html = '<ul class="info-list">';
        if (ev.eventType) html += `<li><strong>種別:</strong> ${formatEventTypeJa(ev.eventType)}</li>`;
        if (ev.eventName) html += `<li><strong>イベント名:</strong> ${ev.eventName}</li>`;
        if (ev.activeSince) html += `<li>開始: ${toJpDate(ev.activeSince)}</li>`;
        if (ev.activeUntil) html += `<li>終了: ${toJpDate(ev.activeUntil)}</li>`;
        html += '</ul>';
        return `<div class="card">${html}</div>`;
      }).join('')}
    </div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">取得失敗: ${err.message}</div>`;
  }
}

async function fetchBuilds() {
  const dom = document.getElementById('build');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const res = await fetch(`${BASE_URL}/build`);
    const builds = await res.json();
    const html = Object.entries(builds).map(([plat, info]) => {
      const li = [`<span class="platform-badge">${plat}</span><br><ul class="info-list">`];
      if (info.version) li.push(`<li><strong>バージョン:</strong> ${info.version}</li>`);
      if (info.branch) li.push(`<li><strong>ブランチ:</strong> ${info.branch}</li>`);
      if (info.date) li.push(`<li><strong>ビルド日:</strong> ${toJpDate(info.date)}</li>`);
      li.push('</ul>');
      return `<div class="card">${li.join('')}</div>`;
    }).join('');
    dom.innerHTML = `<div class="card-list">${html}</div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">ビルド情報取得失敗: ${err.message}</div>`;
  }
}

// 他の関数（ユーザー検索、ステータス、トーナメント等）も次で送ります！
