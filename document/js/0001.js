var $ = function(s, r){ return (r||document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

  
  (function(){
    var bar = $('#errbar');
    window.addEventListener('error', function(ev){
      if (!bar) return;
      bar.style.display = 'block';
      bar.textContent = 'Script error: ' + (ev && ev.message ? ev.message : 'unknown');
    });
    window.addEventListener('unhandledrejection', function(ev){
      if (!bar) return;
      bar.style.display = 'block';
      var msg = (ev && ev.reason && (ev.reason.message || ev.reason.toString())) || 'unhandled promise rejection';
      bar.textContent = 'Script error: ' + msg;
    });
  })();


var app = $('#app');
var toggleBtn = $('#toggleSidebar');
var themeToggle = $('#themeToggle');
var hamburgerMenu = $('#hamburgerMenu'); 
var main = $('.main'); 
var sidebar = $('.sidebar'); 

function setCollapsed(v) {
    if (!app || !toggleBtn) return;
    if (v) app.classList.add('collapsed'); else app.classList.remove('collapsed');
    toggleBtn.setAttribute('aria-expanded', String(!v));
    try { localStorage.setItem('fninfo.sidebar.collapsed', v ? '1' : '0'); } catch(e){}
}


function toggleSidebar() {
    if (app.classList.contains('show-sidebar')) {
      app.classList.remove('show-sidebar');
      hamburgerMenu.setAttribute('aria-expanded', 'false');
      hamburgerMenu.textContent = '☰';
    } else {
      app.classList.add('show-sidebar');
      hamburgerMenu.setAttribute('aria-expanded', 'true');
      hamburgerMenu.textContent = '✕';
    }
}

if (toggleBtn) {
    toggleBtn.addEventListener('click', function(){ setCollapsed(!app.classList.contains('collapsed')); });
}
if (hamburgerMenu) {
    hamburgerMenu.addEventListener('click', toggleSidebar);
}

  
if (main) {
    main.addEventListener('click', function(e) {
      if (window.innerWidth <= 768 && app.classList.contains('show-sidebar')) {
        toggleSidebar();
      }
    });
}
  
  if ($('.topbar')) {
    $('.topbar').addEventListener('click', function(e) {
      if (window.innerWidth <= 768 && app.classList.contains('show-sidebar')) {
        toggleSidebar();
      }
    });
  }
 
  if (sidebar) {
    sidebar.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }

  document.addEventListener('keydown', function(e){
    if (e.key && e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) setCollapsed(!app.classList.contains('collapsed'));
  });
  try { if (localStorage.getItem('fninfo.sidebar.collapsed') === '1') setCollapsed(true); } catch(e){}

 
  function setTheme(mode){
    document.documentElement.setAttribute('data-theme', mode);
    try { localStorage.setItem('fninfo.theme', mode); } catch(e){}
  }
  try { var savedTheme = localStorage.getItem('fninfo.theme'); if (savedTheme) setTheme(savedTheme); } catch(e){}
  if (themeToggle) themeToggle.addEventListener('click', function(){ setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });

  (function(){
    var d = new Date();
    var y = $('#year'); if (y) y.textContent = d.getFullYear();
    var lu = $('#lastUpdated');
    if (lu) { lu.dateTime = d.toISOString().slice(0,10); lu.textContent = d.toLocaleDateString('ja-JP'); }
  })();

  
  var panels = {
    about: $('#panel-about'),
    urls: $('#panel-urls'),
    news: $('#panel-news'),
    updates: $('#panel-updates'),
    tech: $('#panel-tech'),
    terms: $('#panel-terms'),
    account: $('#panel-account')
  };
  var labels = {
    about: '📘 FNINFOについて',
    urls: '🔗 URL参照',
    news: '📰 ニュース',
    updates: '🛠️ FNINFO v2のアップデート告知',
    tech: '⚙️ 使用技術 & 著作権',
    terms: '📄 利用規約',
    account: 'アカウント'
  };
  var tabButtons = $$('.tab-btn');
  var activeTabLabel = $('#activeTabLabel');
  var hashLink = $('#hashLink');

  function safeUpdateHash(name){
    try {
      if (typeof history !== 'undefined' && history.replaceState && location.protocol !== 'file:') {
        history.replaceState(null, '', '#' + name);
      } else {
        var prev = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        location.hash = name;
        document.documentElement.style.scrollBehavior = prev;
      }
    } catch(e) {}
  }

  function activateTab(name, push, focusTab) {
    for (var key in panels) {
      if (!panels.hasOwnProperty(key)) continue;
      var el = panels[key]; if (!el) continue;
      if (key === name) el.classList.add('active'); else el.classList.remove('active');
    }
    tabButtons.forEach(function(btn){ btn.setAttribute('aria-selected', String(btn.getAttribute('data-tab') === name)); });
    if (activeTabLabel) activeTabLabel.textContent = labels[name] || name;
    if (hashLink) hashLink.href = '#' + name;
    if (push !== false) safeUpdateHash(name);
    try { localStorage.setItem('fninfo.activeTab', name); } catch(e){}
    if (focusTab) { var t = document.getElementById('tab-' + name); if (t) t.focus(); }
    if (window.innerWidth <= 768) {
      app.classList.remove('show-sidebar');
      hamburgerMenu.setAttribute('aria-expanded', 'false');
      hamburgerMenu.textContent = '☰';
    }
  }

  tabButtons.forEach(function(btn){ btn.addEventListener('click', function(){ activateTab(btn.getAttribute('data-tab')); }); });

  
  var tablist = document.querySelector('nav.menu');
  if (tablist) {
    tablist.addEventListener('keydown', function(e){
      var idx = tabButtons.findIndex(function(b){ return b.getAttribute('aria-selected') === 'true'; });
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') e.preventDefault();
      if (e.key === 'ArrowDown') {
        var next = tabButtons[(idx + 1) % tabButtons.length]; if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        var prev = tabButtons[(idx - 1 + tabButtons.length) % tabButtons.length]; if (prev) prev.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        var focused = document.activeElement;
        if (focused && focused.classList && focused.classList.contains('tab-btn')) activateTab(focused.getAttribute('data-tab'));
      }
    });
  }

 
  (function(){
    var bootTab = (location.hash ? location.hash.replace('#','') : (function(){ try { return localStorage.getItem('fninfo.activeTab'); } catch(e){ return null; } })()) || 'about';
    activateTab(panels[bootTab] ? bootTab : 'about', false);
  })();

 
  var search = $('#search');
  function clearHighlights(root){
    if (!root) return;
    var marks = root.querySelectorAll('mark.fnmark');
    marks.forEach(function(m){
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
    });
  }
  function highlight(root, q){
    clearHighlights(root);
    if (!q) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function(n){ return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    var nodes = []; var node; while((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function(t){
      var text = t.nodeValue; var lower = text.toLowerCase(); var idx = 0; var found = false;
      while ((idx = lower.indexOf(q, idx)) !== -1) {
        found = true;
        var range = document.createRange();
        range.setStart(t, idx); range.setEnd(t, idx + q.length);
        var mark = document.createElement('mark'); mark.className='fnmark'; mark.style.padding='0 2px'; mark.style.borderRadius='4px';
        range.surroundContents(mark);
        idx += q.length;
        lower = t.nodeValue.toLowerCase();
      }
    });
  }
  function filterCurrent(q){
    var current = null;
    for (var key in panels) { if (panels[key] && panels[key].classList.contains('active')) { current = panels[key]; break; } }
    if (!current) return;
    var blocks = current.querySelectorAll('p, li, td, h2, h3');
    blocks.forEach(function(n){ var t = (n.textContent || '').toLowerCase(); n.style.opacity = (q && t.indexOf(q) === -1) ? 0.35 : 1; });
    highlight(current, q);
  }
  if (search) {
    search.addEventListener('input', function(){ filterCurrent(search.value.trim().toLowerCase()); });
    document.addEventListener('keydown', function(e){ if ((e.ctrlKey||e.metaKey) && e.key && e.key.toLowerCase()==='k') { e.preventDefault(); search.focus(); search.select(); } });
  }

 
  const client_id = "919681852395-agj4s5obf7jk3r10ovrdksukj46geb32.apps.googleusercontent.com";
  const userInfo = document.getElementById("userInfo");

  function handleCredentialResponse(response) {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    userInfo.textContent = `ログイン中: ${payload.name} (${payload.email})`;
  }

  window.onload = () => {
    google.accounts.id.initialize({
      client_id: client_id,
      callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
      document.getElementById("g_id_signin"),
      { theme: "outline", size: "large" }
    );
    google.accounts.id.prompt();
  };

  logoutBtn.addEventListener("click", () => {
    currentUser = null;
    userInfo.textContent = "ログアウトしました";
  });

  
  (function(){
    if (!/runTests=1/.test(location.search)) return;
    var results = [];
    function assert(name, cond){ results.push((cond? '✅ ':'❌ ') + name + (cond?'':' (failed)')); }
    try {
      assert('All panels exist', !!(panels.about && panels.urls && panels.news && panels.updates && panels.tech && panels.terms));
      assert('Tab buttons exist', tabButtons.length >= 6);
      ['about','urls','news','updates','tech','terms'].forEach(function(t){
        activateTab(t, false);
        var activeBtn = $$('.tab-btn').find(function(b){ return b.getAttribute('aria-selected')==='true'; });
        assert('Panel active for '+t, panels[t] && panels[t].classList.contains('active'));
        assert('Aria-selected on tab '+t, activeBtn && activeBtn.getAttribute('data-tab')===t);
      });
      activateTab('about', false);
      filterCurrent('fninfo');
      var marks = $('#panel-about').querySelectorAll('mark.fnmark');
      assert('Search highlighting created marks', marks.length > 0);
      safeUpdateHash('about');
      assert('safeUpdateHash executed', true);
    } catch(e) {
      results.push('❌ Exception during tests: ' + e.message);
    }
    console.log('[FNINFO tests]', '\n' + results.join('\n'));
    var bar = $('#errbar'); if (bar) { bar.style.display='block'; bar.textContent = 'Self tests done. Open console for details.'; }
  })();