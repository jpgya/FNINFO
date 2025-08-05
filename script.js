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
    const res = await fetch(`${BASE_URL}/cloudstorage`);
    const data = await res.json();
    if (!data || !data.data) throw new Error('データが不正です');
    const files = data.data;
    if (!files.length) return dom.innerHTML = '<div class="error">ホットフィックスはありません。</div>';
    const html = files.map(f => {
      return `<div class="card"><ul class="info-list"><li><strong>ファイル名:</strong> ${f.uniqueFilename}</li></ul></div>`;
    }).join('');
    dom.innerHTML = `<div class="card-list">${html}</div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">ホットフィックス情報取得失敗: ${err.message}</div>`;
  }
}

async function fetchTournaments() {
  const dom = document.getElementById('tournaments');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    // region と platformは固定例。必要に応じて動的化してください。
    const region = 'JP';
    const platform = 'pc';
    const res = await fetch(`${BASE_URL}/tournamentlist?region=${region}&platform=${platform}&cosmeticsinfo=true`);
    const data = await res.json();
    if (!data || !data.data) throw new Error('データが不正です');
    const tournaments = data.data;
    if (!tournaments.length) return dom.innerHTML = '<div class="error">トーナメント情報はありません。</div>';
    const html = tournaments.map(t => {
      let rewards = '';
      if (t.rewardDescription) rewards = `<li><strong>報酬:</strong> ${t.rewardDescription}</li>`;
      else if (t.cosmetics) {
        rewards = '<li><strong>報酬アイテム:</strong><ul>';
        t.cosmetics.forEach(c => {
          rewards += `<li>${c.name} - ${c.description}<br><img src="${c.images.icon}" alt="${c.name}" style="max-width:48px;vertical-align:middle;border-radius:0.3em;"></li>`;
        });
        rewards += '</ul></li>';
      }
      return `<div class="card">
        <ul class="info-list">
          <li><strong>イベント名:</strong> ${t.eventName || '不明'}</li>
          <li><strong>開始日時:</strong> ${toJpDate(t.eventStart)}</li>
          <li><strong>終了日時:</strong> ${toJpDate(t.eventEnd)}</li>
          ${rewards}
        </ul>
      </div>`;
    }).join('');
    dom.innerHTML = `<div class="card-list">${html}</div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">トーナメント情報取得失敗: ${err.message}</div>`;
  }
}

async function fetchPlaylists() {
  const dom = document.getElementById('playlists');
  dom.innerHTML = '<div class="loader"></div>';
  try {
    const res = await fetch(`${BASE_URL}/links/fn/set_br_playlists`);
    const data = await res.json();
    if (!data || !data.data) throw new Error('データが不正です');
    const playlists = data.data?.playlists || [];
    if (!playlists.length) return dom.innerHTML = '<div class="error">プレイリスト情報はありません。</div>';
    const html = playlists.map(pl => {
      return `<div class="card">
        <ul class="info-list">
          <li><strong>名前:</strong> ${pl.name || '不明'}</li>
          <li><strong>説明:</strong> ${pl.description || 'なし'}</li>
          <li><strong>プレイリストID:</strong> ${pl.playlistId || '不明'}</li>
        </ul>
      </div>`;
    }).join('');
    dom.innerHTML = `<div class="card-list">${html}</div>`;
  } catch (err) {
    dom.innerHTML = `<div class="error">プレイリスト情報取得失敗: ${err.message}</div>`;
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
