// FLJP API v2 対応版スクリプト
const BASE_URL = 'https://fljpapi.jp/api/v2';
const BASE_URL_NOT_V2 = 'https://fljpapi.jp/api';

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

// ニュース取得（全モード）
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
      fetch(`${BASE_URL}/news?platform=Windows&language=ja&serverRegion=ASIA&country=JP&tags=${tag}`)
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

async function fetchStatus() {
  const dom = document.getElementById('status');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const res = await fetch(`${BASE_URL}/fortnitestatus`);
    const data = await res.json();

    const fn = data.fnstatus;
    const queue = data.queue;
    const maintenance = data.maintenance;

    let html = '<ul class="info-list">';
    html += `<li><strong>サーバー状態:</strong> ${fn.status === 'UP' ? 'オンライン' : 'オフライン'}</li>`;
    html += `<li><strong>メッセージ:</strong> ${fn.message}</li>`;
    html += `<li><strong>キュー:</strong> ${queue.active ? '有効' : 'なし'}</li>`;
    if (queue.expectedWait)
      html += `<li><strong>待ち時間:</strong> ${queue.expectedWait} 秒</li>`;
    if (Array.isArray(maintenance) && maintenance.length > 0) {
      html += `<li><strong>メンテナンス中:</strong> ${maintenance.length} 件</li>`;
    }
    html += '</ul>';

    dom.innerHTML = `<div class="card">${html}</div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">ステータス取得失敗: ${err.message}</div>`;
  }
}


async function fetchHotfix() {
  const dom = document.getElementById('hotfix');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const res = await fetch('https://fljpapi.jp/api/v2/cloudstorage');
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


// 日付を日本時間表記の簡易変換（ISO文字列→"YYYY年MM月DD日 HH時mm分"）
function toJpDate(isoStr) {
  if (!isoStr) return '不明';
  const d = new Date(isoStr);
  // JSTはUTC+9時間なので9時間足す（DateオブジェクトはUTC）
  d.setHours(d.getHours() + 9);
  return `${d.getFullYear()}年${(d.getMonth()+1).toString().padStart(2,'0')}月${d.getDate().toString().padStart(2,'0')}日 ${d.getHours().toString().padStart(2,'0')}時${d.getMinutes().toString().padStart(2,'0')}分`;
}

// HTMLエスケープ（nullや数値でも安全）
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

// JST変換（必要に応じて修正）
function toJpDate(isoString) {
  if (!isoString) return '不明';
  try {
    const date = new Date(isoString);
    if (isNaN(date)) return '不明';
    return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  } catch {
    return '不明';
  }
}



// トーナメント情報取得
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

    const res = await fetch(`${BASE_URL_NOT_V2}/tournamentlist?region=${region}&platform=${platform}`);
    if (!res.ok) throw new Error(`HTTPエラー: ${res.status}`);

    const data = await res.json();

    // events 配列の検出
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

    // HTML生成
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

// ページ読み込み後に自動実行
document.addEventListener('DOMContentLoaded', fetchTournaments);



async function fetchPlaylists() {
  const dom = document.getElementById('playlists');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const res = await fetch('https://fljpapi.jp/api/v2/links/fn/set_br_playlists');
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

// ユーザー検索
async function fetchUserInfo(accountId) {
  const dom = document.getElementById('user-result');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    // まとめて名前取得 (単一ユーザーも配列で)
    const lookupRes = await fetch(`${BASE_URL}/lookup?accountid=${accountId}`);
    const lookupData = await lookupRes.json();
    if (!lookupData || !lookupData.data || !lookupData.data.length) throw new Error('アカウントが見つかりません');
    const userName = lookupData.data[0].displayName || '不明';

    // ランク取得
    const rankRes = await fetch(`${BASE_URL}/rank/${accountId}`);
    const rankData = await rankRes.json();

    let rankHtml = '';
    if (rankData && rankData.data) {
      const rd = rankData.data;
      rankHtml = `<ul class="info-list">`;
      rankHtml += `<li><strong>ユーザー名:</strong> ${userName}</li>`;
      rankHtml += `<li><strong>ランクポイント:</strong> ${rd.rankPoints ?? '不明'}</li>`;
      rankHtml += `<li><strong>ランク:</strong> ${rd.rank ?? '不明'}</li>`;
      rankHtml += `<li><strong>最高ランク:</strong> ${rd.topRank ?? '不明'}</li>`;
      rankHtml += `</ul>`;
    } else {
      rankHtml = `<div class="error">ランク情報が見つかりません。</div>`;
    }
    dom.innerHTML = `<div class="card">${rankHtml}</div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">ユーザー情報取得失敗: ${err.message}</div>`;
  }
}

document.getElementById('user-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('epic-name').value.trim();
  if (input) {
    fetchUserInfo(input);
  }
});

window.addEventListener('load', () => {
  fetchNews();
  fetchTimeline();
  fetchBuilds();
  fetchStatus();
  fetchHotfix();
  fetchTournaments();
  fetchPlaylists();
});



