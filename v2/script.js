// BASE_URLを廃止し、直接URLを使用するように修正

//const BASE_URL = 'https://fljpapi.vigyanfv.workers.dev/';


//const apitoken =env.token;
// URLの二重スラッシュを防ぐため、URL結合時にスラッシュを調整する関数
function joinUrl(base, path) {
  if (!base.endsWith('/')) base += '/';
  if (path.startsWith('/')) path = path.slice(1);
  return base + path;
}
//const { token } = require('./token');
//import {token} from ("./token.js")
//console.log(token);
//import { check } from './captcha.js'

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
async function fetchTimeline() {
  const dom = document.getElementById('timeline');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const res = await fetch(`https://fljpapi.vigyanfv.workers.dev/timeline`);
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

  function toJpDate(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}時${d.getMinutes()}分`;
  }

  try {
    const res = await fetch(`https://fljpapi.vigyanfv.workers.dev/build`);
    const data = await res.json();
    const builds = data.buildsdata || data;

    const html = Object.entries(builds).map(([platform, info]) => {
      const li = [`<span class="platform-badge">${platform}</span><ul class="info-list">`];

      // 基本情報
      if (info.buildVersion) li.push(`<li><strong>ビルドバージョン:</strong> ${info.buildVersion}</li>`);
      if (info.labelName) li.push(`<li><strong>ラベル名:</strong> ${info.labelName}</li>`);
      if (info.expires) li.push(`<li><strong>有効期限:</strong> ${toJpDate(info.expires)}</li>`);

      // CHUNKS情報
      if (info.items?.CHUNKS) {
        li.push('<li><strong>CHUNKS情報:</strong><ul>');
        const chunks = info.items.CHUNKS;
        if (chunks.distribution) li.push(`<li>配信URL: <a href="${chunks.distribution}" target="_blank">${chunks.distribution}</a></li>`);
        if (chunks.path) li.push(`<li>パス: ${chunks.path}</li>`);
        if (chunks.signature) li.push(`<li>署名: ${chunks.signature}</li>`);
        li.push('</ul></li>');
      }

      // MANIFEST情報
      if (info.items?.MANIFEST) {
        li.push('<li><strong>MANIFEST情報:</strong><ul>');
        const manifest = info.items.MANIFEST;
        if (manifest.distribution) li.push(`<li>配信URL: <a href="${manifest.distribution}" target="_blank">${manifest.distribution}</a></li>`);
        if (manifest.path) li.push(`<li>パス: ${manifest.path}</li>`);
        if (manifest.hash) li.push(`<li>ハッシュ: ${manifest.hash}</li>`);
        if (manifest.signature) li.push(`<li>署名: ${manifest.signature}</li>`);
        li.push('</ul></li>');
      }

      li.push('</ul>');
      return `<div class="card">${li.join('')}</div>`;
    }).join('');

    dom.innerHTML = `<div class="card-list">${html}</div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">ビルド情報取得失敗: ${err.message}</div>`;
  }
}

// ボタン作成
const statusDom = document.getElementById('status');
const refreshBtn = document.createElement('button');
refreshBtn.id = 'refreshBtn';
refreshBtn.textContent = '更新';
refreshBtn.disabled = true; // 初回は無効
statusDom.insertAdjacentElement('afterend', refreshBtn);

async function fetchStatus() {
  const dom = document.getElementById('status');
  const btn = document.getElementById('refreshBtn');
  btn.disabled = true; // 押せない状態に
  dom.innerHTML = '<div class="loader"></div>';

  try {
    const res = await fetch(`https://fljpapi.vigyanfv.workers.dev/fortnitestatus`);
    const data = await res.json();

    const fn = data.fnstatus || {};
    const queue = data.queue || {};
    const maintenance = data.maintenance || [];

    let html = '<ul class="info-list">';
    
    const statusText = fn.status === 'UP' ? 'オンライン' : 'オフライン';
    html += `<li><strong>サーバー状態:</strong> ${statusText}</li>`;
    if (fn.message) html += `<li><strong>メッセージ:</strong> ${fn.message}</li>`;
    if (fn.maintenanceUri) html += `<li><strong>メンテナンスURL:</strong> <a href="${fn.maintenanceUri}" target="_blank">${fn.maintenanceUri}</a></li>`;

    html += `<li><strong>キュー状態:</strong> ${queue.active ? '有効' : 'なし'}</li>`;
    if (queue.expectedWait) html += `<li><strong>予想待ち時間:</strong> ${queue.expectedWait} 秒</li>`;

    if (maintenance.length > 0) {
      html += `<li><strong>メンテナンス中:</strong> ${maintenance.length} 件<ul>`;
      maintenance.forEach((m, i) => {
        html += `<li>${i + 1}. ${m}</li>`;
      });
      html += '</ul></li>';
    }

    html += '</ul>';
    dom.innerHTML = `<div class="card">${html}</div>`;

  } catch (err) {
    dom.innerHTML = `<div class="error">ステータス取得失敗: ${err.message}</div>`;
  }

  // 10秒後にボタンを再度有効化
  setTimeout(() => refreshBtn.disabled = false, 10000);
}

// 初回取得
fetchStatus();

// ボタンクリックで更新
refreshBtn.addEventListener('click', fetchStatus);


async function fetchHotfix() {
  const dom = document.getElementById('hotfix');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const res = await fetch('https://fljpapi.vigyanfv.workers.dev/cloudstorage');
    const data = await res.json();

    if (!data?.data?.length) {
      dom.innerHTML = '<div class="error">ホットフィックスファイルが見つかりません。</div>';
      return;
    }

    const html = data.data.map(file => {
      const li = [
        `<ul class="info-list">`,
        `<li><strong>ファイル名:</strong> ${file.filename}</li>`,
        `<li><strong>サイズ:</strong> ${file.length} バイト</li>`,
        `<li><strong>アップロード日:</strong> ${toJpDate(file.uploaded)}</li>`,
        `<li><strong>ハッシュ:</strong> ${file.hash}</li>`,
        `<li><strong>SHA256:</strong> ${file.hash256}</li>`,
        `<li><strong>ユニーク名:</strong> ${file.uniqueFilename}</li>`,
        `</ul>`
      ];
      return `<div class="card">${li.join('')}</div>`;
    }).join('');

    dom.innerHTML = `<div class="card-list">${html}</div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">取得失敗: ${err.message}</div>`;
  }
}

function escapeHtml(input) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

async function fetchTournaments() {
  const dom = document.getElementById('tournaments');
  if (!dom) {
    console.warn('DOM element #tournaments が見つかりません');
    return;
  }
  dom.innerHTML = '<div class="loader"></div>';

  try {
    const region = 'ASIA';
    const platform = 'Windows';

    const res = await fetch(`https://fljpapi.vigyanfv.workers.dev/tournamentlist?region=${region}&platform=${platform}`);
    if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);

    const data = await res.json();

    let events = [];
    if (Array.isArray(data.events)) events = data.events;
    else if (Array.isArray(data.data?.events)) events = data.data.events;
    else if (Array.isArray(data.data)) events = data.data;
    else {
      dom.innerHTML = '<div class="error">トーナメント情報が見つかりません（レスポンス形式が想定と異なります）。</div>';
      return;
    }

    if (!events.length) {
      dom.innerHTML = '<div class="error">トーナメント情報はありません。</div>';
      return;
    }

    const html = events.map((e, idx) => {
      const title = escapeHtml(e.eventGroup || e.displayDataId || e.eventId || 'イベント名不明');
      const begin = e.beginTime_jst || toJpDate(e.beginTime);
      const end = e.endTime_jst || toJpDate(e.endTime);
      const announce = e.announcementTime_jst || toJpDate(e.announcementTime);
      const minLevel = escapeHtml(e.metadata?.minimumAccountLevel ?? '不明');
      const type = escapeHtml(e.metadata?.tournamentType ?? '不明');
      const regions = Array.isArray(e.regions) ? escapeHtml(e.regions.join(', ')) : '不明';
      const platforms = Array.isArray(e.platforms) ? escapeHtml(e.platforms.join(', ')) : '不明';
      const linkInfo = e.link ? `${escapeHtml(e.link.code || '')}${e.link.type ? ` (${escapeHtml(e.link.type)})` : ''}` : 'なし';

      const windows = Array.isArray(e.eventWindows) ? e.eventWindows : [];
      const windowsHtml = windows.length
        ? windows.map((w, wi) => {
          const wId = escapeHtml(w.eventWindowId || `window_${wi+1}`);
          const wBegin = w.beginTime_jst || toJpDate(w.beginTime);
          const wEnd = w.endTime_jst || toJpDate(w.endTime);
          const wCountdown = w.countdownBeginTime_jst || toJpDate(w.countdownBeginTime);
          const roundType = escapeHtml(w.metadata?.RoundType || '不明');
          const canSpectate = (typeof w.canLiveSpectate === 'boolean') ? (w.canLiveSpectate ? '可' : '不可') : '不明';
          const visibility = escapeHtml(w.visibility || '不明');
          const requireAll = Array.isArray(w.requireAllTokens) && w.requireAllTokens.length ? escapeHtml(w.requireAllTokens.join(', ')) : 'なし';
          const requireNone = Array.isArray(w.requireNoneTokensCaller) && w.requireNoneTokensCaller.length ? escapeHtml(w.requireNoneTokensCaller.join(', ')) : 'なし';
          const scoreLoc = Array.isArray(w.scoreLocations) && w.scoreLocations.length
            ? w.scoreLocations.map(sl => `${escapeHtml(sl.leaderboardDefId || '')}${sl.isMainWindowLeaderboard ? ' (Main)' : ''}`).join(', ')
            : 'なし';

          return `
            <div class="window">
              <ul class="info-list">
                <li><strong>#${wi+1}:</strong> ${wId}</li>
                <li><strong>開始:</strong> ${escapeHtml(wBegin)}</li>
                <li><strong>終了:</strong> ${escapeHtml(wEnd)}</li>
                <li><strong>カウントダウン開始:</strong> ${escapeHtml(wCountdown)}</li>
                <li><strong>ラウンドタイプ:</strong> ${roundType}</li>
                <li><strong>観戦:</strong> ${escapeHtml(canSpectate)}</li>
                <li><strong>visibility:</strong> ${visibility}</li>
                <li><strong>必要トークン:</strong> ${requireAll}</li>
                <li><strong>除外トークン:</strong> ${requireNone}</li>
                <li><strong>スコア位置:</strong> ${scoreLoc}</li>
              </ul>
            </div>
          `;
        }).join('')
        : '<div class="info-list">ウィンドウ情報なし</div>';

      let rewardsHtml = '';
      if (e.rewardDescription) {
        rewardsHtml = `<li><strong>報酬:</strong> ${escapeHtml(e.rewardDescription)}</li>`;
      } else if (Array.isArray(e.cosmetics) && e.cosmetics.length) {
        const list = e.cosmetics.map(c =>
          `<li>${escapeHtml(c.name)} - ${escapeHtml(c.description || '')}${c.images?.icon ? `<br><img src="${escapeHtml(c.images.icon)}" alt="${escapeHtml(c.name)}" style="max-width:48px;vertical-align:middle;border-radius:0.3em;">` : ''}</li>`
        ).join('');
        rewardsHtml = `<li><strong>報酬アイテム:</strong><ul>${list}</ul></li>`;
      }

      return `
        <details class="card" ${idx === 0 ? 'open' : ''}>
          <summary>
            <strong>${title}</strong>
            <span style="margin-left:10px;color:#666;">${escapeHtml(begin)} 〜 ${escapeHtml(end)}</span>
          </summary>
          <div class="card-body">
            <ul class="info-list">
              <li><strong>イベントID:</strong> ${escapeHtml(e.eventId || '')}</li>
              <li><strong>発表日時:</strong> ${escapeHtml(announce)}</li>
              <li><strong>開始日時:</strong> ${escapeHtml(begin)}</li>
              <li><strong>終了日時:</strong> ${escapeHtml(end)}</li>
              <li><strong>最小アカウントレベル:</strong> ${minLevel}</li>
              <li><strong>大会タイプ:</strong> ${type}</li>
              <li><strong>リージョン:</strong> ${regions}</li>
              <li><strong>プラットフォーム:</strong> ${platforms}</li>
              <li><strong>リンク:</strong> ${linkInfo}</li>
              ${rewardsHtml}
            </ul>
            <h4>イベントウィンドウ</h4>
            ${windowsHtml}
          </div>
        </details>
      `;
    }).join('');

    dom.innerHTML = `<div class="card-list">${html}</div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">トーナメント情報取得失敗: ${escapeHtml(err.message)}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', fetchTournaments);

async function fetchPlaylists() {
  const dom = document.getElementById('playlists');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const res = await fetch('https://fljpapi.vigyanfv.workers.dev/links/fn/set_br_playlists');
    const data = await res.json();

    if (!data?.data?.links) {
      dom.innerHTML = '<div class="error">プレイリストが見つかりません。</div>';
      return;
    }

    const playlists = Object.values(data.data.links);

    const html = playlists.map(p => {
      const meta = p.metadata || {};
      const jaTitle = meta.alt_title?.ja || meta.title || p.mnemonic;
      const image = meta.image_urls?.url_m || meta.image_url || '';
      const published = toJpDate(p.published);
      const active = p.active ? '✅アクティブ' : '❌非アクティブ';

      return `
        <div class="card">
          <img src="${image}" alt="${jaTitle}" class="card-image">
          <ul class="info-list">
            <li><strong>日本語名:</strong> ${jaTitle}</li>
            <li><strong>英語名:</strong> ${meta.title || p.mnemonic}</li>
            <li><strong>状態:</strong> ${active}</li>
            <li><strong>公開日:</strong> ${published}</li>
            <li><strong>作成者:</strong> ${p.creatorName}</li>
          </ul>
        </div>`;
    }).join('');

    dom.innerHTML = `<div class="card-list">${html}</div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">取得失敗: ${err.message}</div>`;
  }
}

async function fetchUserInfo(accountId) {
  const dom = document.getElementById('user-result');
  if (!dom) return;
  dom.innerHTML = '<div class="loader"></div>';

  try {
    const lookupRes = await fetch(`https://fljpapi.vigyanfv.workers.dev/lookup?accountid=${accountId}`);
    const lookupData = await lookupRes.json();

    let userName = '不明';
    let userId = accountId;
    if (lookupData && typeof lookupData === 'object') {
      const firstKey = Object.keys(lookupData)[0];
      if (firstKey && lookupData[firstKey]) {
        userName = lookupData[firstKey].displayName || '不明';
        userId = lookupData[firstKey].id || accountId;
      }
    }

    const rankRes = await fetch(`https://fljpapi.vigyanfv.workers.dev/rank/${userId}`);
    const rankData = await rankRes.json();

    let html = `<div class="card">
      <h2>ユーザー情報</h2>
      <ul>
        <li><strong>ユーザー名:</strong> ${escapeHtml(userName)}</li>
        <li><strong>アカウントID:</strong> ${escapeHtml(userId)}</li>
      </ul>
    </div>`;

    if (Array.isArray(rankData) && rankData.length > 0) {
      rankData.forEach(rank => {
        html += `<div class="card">
          <h3>${escapeHtml(rank.rankingTypeJP ?? rank.rankingType ?? '不明')}</h3>
          <ul>
            <li><strong>現在ランク:</strong> ${escapeHtml(rank.currentDivisionJP ?? rank.currentDivision ?? '不明')}</li>
            <li><strong>最高ランク:</strong> ${escapeHtml(rank.highestDivisionJP ?? rank.highestDivision ?? '不明')}</li>
            <li><strong>昇格進捗:</strong> ${escapeHtml(rank.promotionProgressPercent ?? '0%')} (${escapeHtml(rank.promotionProgress ?? '-')})</li>
            <li><strong>プレイヤーランキング:</strong> ${escapeHtml(rank.currentPlayerRanking ?? '不明')}</li>
            <li><strong>最終更新:</strong> ${rank.lastUpdated ? new Date(rank.lastUpdated).toLocaleString() : '不明'}</li>
            <li><strong>TrackGUID:</strong> ${escapeHtml(rank.trackguid ?? '不明')}</li>
          </ul>
        </div>`;
      });
    } else {
      html += `<div class="card"><p>ランク情報が見つかりません。</p></div>`;
    }

    dom.innerHTML = html;
  } catch (err) {
    dom.innerHTML = `<div class="error">情報取得失敗: ${escapeHtml(err.message)}</div>`;
  }
}

// HTMLエスケープ関数
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}



document.getElementById('user-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('epic-name').value.trim();
  if (input) {
    fetchUserInfo(input);
  }
});

window.addEventListener('load', () => {
  fetchNewsByTag();
  fetchTimeline();
  fetchBuilds();
  fetchStatus();
  fetchHotfix();
  fetchTournaments();
  fetchPlaylists();
});

const NEWS_TAGS = [
  "Product.BR", 
  "Product.Juno", 
  "Product.BlastBerry",
  "Product.BR.Habanero", 
  "Product.BR.NoBuild", 
  "Product.Figment",
  "Product.Sparks", 
  "Product.STW"
];

function setupNewsDropdown() {
  const select = document.getElementById('news-tag-select');
  if (!select) return;
  select.innerHTML = NEWS_TAGS
    .map(tag => `<option value="${tag}">${tag}</option>`)
    .join('');
}

async function fetchNewsByTag(tag) {
  const dom = document.getElementById('news-content');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const res = await fetch(`https://fljpapi.vigyanfv.workers.dev/news?platform=Windows&language=ja&serverRegion=ASIA&country=JP&tags=${tag}`);
    if (!res.ok) throw new Error('');
    const data = await res.json();
    const items = data?.data?.contentItems || [];
    if (!items.length) {
      dom.innerHTML = '<div class="error">現在ニュースはありません。</div>';
      return;
    }
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
    dom.innerHTML = `<div class="error"> ${err.message}</div>`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setupNewsDropdown();
  document.getElementById('news-search-btn').addEventListener('click', () => {
    const select = document.getElementById('news-tag-select');
    const tag = select.value;
    fetchNewsByTag(tag);
  });
});