/* notes-hub 统一读书笔记阅读站（单页应用，hash 路由） */
(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };
  var main = $('#main');
  var sidebar = $('#sidebar');
  var backdrop = $('#backdrop');

  var SITE = { title: '我的读书笔记', subtitle: '' };
  var BOOKS = [];
  var manifests = {};   // id -> manifest
  var chapterCache = {}; // id/num -> data

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function pad2(n) { return String(n).padStart(2, '0'); }

  function loadJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' -> ' + r.status);
      return r.json();
    });
  }
  function loadText(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' -> ' + r.status);
      return r.text();
    });
  }

  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    if (parts.length === 0) return { view: 'home' };
    if (parts[0] === 'book' && parts.length === 2) return { view: 'book', id: parts[1] };
    if (parts[0] === 'book' && parts.length >= 3) return { view: 'chapter', id: parts[1], num: parts[2] };
    return { view: 'home' };
  }

  function getBook(id) {
    return BOOKS.find(function (b) { return b.id === id; });
  }
  function getManifest(book) {
    if (manifests[book.id]) return Promise.resolve(manifests[book.id]);
    return loadJSON('data/' + book.id + '/manifest.json').then(function (m) {
      manifests[book.id] = m;
      return m;
    });
  }
  function getChapterData(book, num) {
    var key = book.id + '/' + num;
    if (chapterCache[key]) return Promise.resolve(chapterCache[key]);
    if (book.type === 'cornell') {
      return loadJSON('data/' + book.id + '/chapters/ch' + num + '.json').then(function (d) {
        chapterCache[key] = d;
        return d;
      });
    }
    return Promise.resolve(null);
  }

  /* ---------- 侧边栏 ---------- */
  function renderBookSwitch(currentId) {
    $('#bookSwitch').innerHTML = BOOKS.map(function (b) {
      return '<a class="book-item' + (b.id === currentId ? ' active' : '') +
        '" href="#/book/' + b.id + '"><span class="be">' + b.emoji + '</span><span>' + esc(b.title) + '</span></a>';
    }).join('');
  }
  function renderChapterList(book, manifest, currentNum) {
    $('#sideChaptersWrap').style.display = '';
    var html = '';
    if (book.type === 'cornell' && manifest.sections && manifest.sections.length) {
      manifest.sections.forEach(function (sec) {
        var items = sec.nums.map(function (n) {
          var num = pad2(n);
          var c = manifest.chapters.find(function (x) { return x.num === num; });
          if (!c) return '';
          return chapterItem(book, c, currentNum);
        }).join('');
        if (items) html += '<div class="sec-name">' + esc(sec.name) + '</div>' + items;
      });
    } else {
      html = manifest.chapters.map(function (c) { return chapterItem(book, c, currentNum); }).join('');
    }
    $('#sideChapters').innerHTML = html;
  }
  function chapterItem(book, c, currentNum) {
    return '<a class="ch-item' + (c.num === currentNum ? ' active' : '') +
      '" href="#/book/' + book.id + '/' + c.num + '">' +
      '<span class="ch-no">' + esc(c.num) + '</span><span class="ch-t">' + esc(c.title) + '</span></a>';
  }
  function buildSidebar(book, manifest, currentNum) {
    renderBookSwitch(book ? book.id : null);
    if (book && manifest) renderChapterList(book, manifest, currentNum);
    else $('#sideChaptersWrap').style.display = 'none';
  }

  /* ---------- 渲染：首页 ---------- */
  function renderHome() {
    document.title = SITE.title;
    buildSidebar(null, null, null);
    main.innerHTML = '<div class="main-inner"><div class="loading">加载中…</div></div>';

    Promise.all(BOOKS.map(function (b) { return getManifest(b).catch(function () { return null; }); }))
      .then(function (ms) {
        var total = ms.reduce(function (acc, m) { return acc + (m ? m.count : 0); }, 0);
        var stats = '<span>📚 ' + BOOKS.length + ' 本笔记</span><span>📖 共 ' + total + ' 篇/章</span>';
        var cards = BOOKS.map(function (b, i) {
          var m = ms[i];
          var count = m ? m.count + (b.type === 'cornell' ? ' 章' : ' 篇') : '…';
          return '<a class="book-card" href="#/book/' + b.id + '">' +
            '<div class="bc-emoji">' + (b.emoji || '📖') + '</div>' +
            '<h2>' + esc(b.title) + '</h2>' +
            '<div class="bc-desc">' + esc(b.desc || '') + '</div>' +
            '<div class="bc-meta"><span class="bc-count">' + count + '</span>' +
            '<span class="bc-btn">开始阅读 →</span></div></a>';
        }).join('');
        main.innerHTML = '<div class="main-inner">' +
          '<div class="hero"><h1>' + esc(SITE.title) + '</h1>' +
          '<div class="sub">' + esc(SITE.subtitle) + '</div>' +
          '<div class="stats">' + stats + '</div></div>' +
          '<div class="books">' + cards + '</div></div>';
      })
      .catch(function () {
        main.innerHTML = '<div class="main-inner"><div class="error">加载失败，请稍后刷新重试。</div></div>';
      });
  }

  /* ---------- 渲染：书目录页 ---------- */
  function renderBook(id) {
    var book = getBook(id);
    if (!book) { location.hash = '#/'; return; }
    document.title = book.title + ' · ' + SITE.title;
    main.innerHTML = '<div class="main-inner"><div class="loading">加载中…</div></div>';

    getManifest(book).then(function (m) {
      buildSidebar(book, m, null);
      var head = '<div class="book-head">' +
        '<div class="bh-emoji">' + (book.emoji || '📖') + '</div>' +
        '<div><h1>' + esc(book.title) + '</h1>' +
        '<div class="bh-desc">' + esc(book.desc || '') + '</div>' +
        '<div class="bh-meta"><span>' + m.count + (book.type === 'cornell' ? ' 章' : ' 篇') + '</span>' +
        (book.homeUrl ? '<span>原站：' + esc(book.homeUrl.replace(/^https?:\/\//, '')) + '</span>' : '') +
        '</div></div>' +
        '<div class="bh-actions">' +
        (book.homeUrl ? '<a href="' + esc(book.homeUrl) + '" target="_blank" rel="noopener">原站查看 ↗</a>' : '') +
        '<a href="#/">🏠 首页</a></div></div>';

      var body = '';
      if (book.type === 'cornell' && m.sections && m.sections.length) {
        m.sections.forEach(function (sec) {
          var cards = sec.nums.map(function (n) {
            var c = m.chapters.find(function (x) { return x.num === pad2(n); });
            if (!c) return '';
            return '<a class="ch-card" href="#/book/' + book.id + '/' + c.num + '">' +
              '<span class="no">CH ' + esc(c.num) + '</span><div class="t">' + esc(c.title) + '</div>' +
              (c.oneliner ? '<div class="o">' + esc(c.oneliner) + '</div>' : '') + '</a>';
          }).join('');
          body += '<div class="section-name">' + esc(sec.name) + '</div><div class="ch-grid">' + cards + '</div>';
        });
      } else {
        body = '<div class="ch-grid">' + m.chapters.map(function (c) {
          return '<a class="ch-card" href="#/book/' + book.id + '/' + c.num + '">' +
            '<span class="no">' + esc(c.num) + '</span><div class="t">' + esc(c.title) + '</div></a>';
        }).join('') + '</div>';
      }
      main.innerHTML = '<div class="main-inner">' + head + body + '</div>';
    }).catch(function () {
      main.innerHTML = '<div class="main-inner"><div class="error">目录加载失败，请稍后重试。</div></div>';
    });
  }

  /* ---------- 康奈尔渲染 ---------- */
  function renderMod(m) {
    var cls = 'mod' + (m.color ? ' ' + m.color : '');
    var tag = m.tag ? '<span class="tag">' + m.tag + '</span>' : '';
    var h = '<div class="' + cls + '"><div class="mod-title"><span class="ico">' +
      (m.icon || '') + '</span>' + m.title + tag + '</div>';
    if (m.intro) h += '<p class="intro">' + m.intro + '</p>';
    if (m.bullets) h += '<ul>' + m.bullets.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>';
    if (m.flow) {
      var steps = m.flow.steps.map(function (s) { return '<div class="step">' + s + '</div>'; })
        .join('<div class="arr">➜</div>');
      h += '<div class="flow ' + (m.flow.color || '') + '">' + steps + '</div>';
    }
    if (m.table) {
      var head = '<tr>' + m.table.head.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
      var rows = m.table.rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('');
      h += '<table>' + head + rows + '</table>';
    }
    if (m.vs) {
      h += '<div class="vs"><div class="side a"><h4>' + m.vs.a.h + '</h4>' + m.vs.a.t + '</div>' +
        '<div class="side b"><h4>' + m.vs.b.h + '</h4>' + m.vs.b.t + '</div></div>';
    }
    if (m.callout) {
      var star = m.callout.star ? ' star' : '';
      var pre = m.callout.star ? '⭐ ' : '💡 ';
      h += '<div class="callout' + star + '">' + pre + m.callout.text + '</div>';
    }
    h += '</div>';
    return h;
  }

  function renderCornell(d, book) {
    var cues = d.questions.map(function (q, i) {
      return '<div class="cue-item"><span class="no">' + (i + 1) + '</span><p>' + q + '</p></div>';
    }).join('');
    var mods = (d.modules || []).map(renderMod).join('');
    var summary = '<div class="sum-main"><h2>✅ 总结栏 · 回顾</h2><p>' +
      (d.summary || '') + '</p></div>' +
      '<div class="oneliner"><h3>⭐ 一句话记忆</h3><p>' + (d.oneliner || '') + '</p></div>';
    return '<div class="cornell">' +
      '<div class="ch-head"><span class="ch-num">CH ' + esc(d.num) + '</span>' +
      '<h1>' + esc(d.topic) + '</h1>' +
      '<div class="ch-meta"><span>📅 ' + esc(d.date || '') + '</span>' +
      '<span>📚 ' + esc(book.title) + '</span></div></div>' +
      '<div class="cor-main">' +
      '<div class="cue-col"><h2>❓ 线索栏 · 提问</h2><div class="cue-list">' + cues + '</div></div>' +
      '<div class="notes-col"><h2>📝 笔记栏 · 记录</h2>' + mods + '</div></div>' +
      '<div class="summary">' + summary + '</div></div>';
  }

  /* ---------- 渲染：阅读页 ---------- */
  function renderChapter(id, num) {
    var book = getBook(id);
    if (!book) { location.hash = '#/'; return; }
    main.innerHTML = '<div class="main-inner"><div class="loading">加载中…</div></div>';

    getManifest(book).then(function (m) {
      var ch = m.chapters.find(function (c) { return c.num === num; });
      if (!ch) { location.hash = '#/book/' + id; return; }
      var idx = m.chapters.indexOf(ch);
      var prev = idx > 0 ? m.chapters[idx - 1] : null;
      var next = idx < m.chapters.length - 1 ? m.chapters[idx + 1] : null;
      document.title = (book.type === 'cornell' ? 'CH ' + num + ' ' : '') + ch.title + ' · ' + book.title;
      buildSidebar(book, m, num);

      var crumb = '<div class="crumb"><a href="#/">🏠 首页</a><span class="sep">/</span>' +
        '<a href="#/book/' + book.id + '">' + esc(book.title) + '</a><span class="sep">/</span>' +
        '<span>' + (book.type === 'cornell' ? 'CH ' : '') + esc(ch.title) + '</span></div>';

      var actions = '<div class="ch-actions">' +
        (book.homeUrl ? '<a href="' + esc(book.homeUrl) + '" target="_blank" rel="noopener">原站查看 ↗</a>' : '') +
        '<a href="#/book/' + book.id + '">📑 目录</a>' +
        (book.type === 'cornell' && book.homeUrl ? '<a href="' + esc(book.homeUrl) + 'images/ch' + num + '.png" target="_blank" rel="noopener">🖨️ A4 打印版</a>' : '') +
        '</div>';

      var nav = '<div class="nav">' +
        (prev ? '<a href="#/book/' + book.id + '/' + prev.num + '">← ' + (book.type === 'cornell' ? '第 ' + parseInt(prev.num, 10) + ' 章' : esc(prev.title)) + '</a>' : '<span class="disabled"></span>') +
        '<div class="actions"><a href="#/">🏠 首页</a></div>' +
        (next ? '<a href="#/book/' + book.id + '/' + next.num + '">' + (book.type === 'cornell' ? '第 ' + parseInt(next.num, 10) + ' 章' : esc(next.title)) + ' →</a>' : '<span class="disabled"></span>') +
        '</div>';

      var body;
      if (book.type === 'cornell') {
        body = getChapterData(book, num).then(function (d) {
          return '<div class="main-inner">' + crumb + actions + renderCornell(d, book) + nav + '</div>';
        });
      } else {
        body = loadText('data/' + book.id + '/articles/' + ch.slug + '.md').then(function (md) {
          var html = (window.marked && marked.parse) ? marked.parse(md) : ('<p>' + esc(md) + '</p>');
          return '<div class="main-inner">' + crumb + actions +
            '<article class="article">' + html + '</article>' + nav + '</div>';
        });
      }
      body.then(function (html) { main.innerHTML = html; })
        .catch(function () {
          main.innerHTML = '<div class="main-inner"><div class="error">内容加载失败，请稍后重试。</div></div>';
        });
    }).catch(function () {
      main.innerHTML = '<div class="main-inner"><div class="error">内容加载失败，请稍后重试。</div></div>';
    });
  }

  /* ---------- 路由 ---------- */
  function route() {
    closeSidebar();
    var r = parseHash();
    if (r.view === 'home') renderHome();
    else if (r.view === 'book') renderBook(r.id);
    else renderChapter(r.id, r.num);
  }

  /* ---------- 移动端侧边栏 ---------- */
  function openSidebar() { sidebar.classList.add('open'); backdrop.classList.add('show'); }
  function closeSidebar() { sidebar.classList.remove('open'); backdrop.classList.remove('show'); }
  $('#menuBtn').addEventListener('click', openSidebar);
  $('#sideClose').addEventListener('click', closeSidebar);
  backdrop.addEventListener('click', closeSidebar);

  /* ---------- 启动 ---------- */
  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: false });
  }
  loadJSON('data/books.json').then(function (cfg) {
    SITE = Object.assign({ title: '我的读书笔记', subtitle: '' }, cfg.site || {});
    BOOKS = cfg.books || [];
    $('#siteEmoji').textContent = SITE.emoji || '📚';
    $('#siteTitle').textContent = SITE.title;
    $('#siteSub').textContent = SITE.subtitle || '';
    window.addEventListener('hashchange', route);
    route();
  }).catch(function () {
    main.innerHTML = '<div class="main-inner"><div class="error">配置加载失败，请确认站点部署完整后刷新。</div></div>';
  });
})();
