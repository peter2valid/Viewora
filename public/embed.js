/*! Viewora embed helper. Optional: lets a Viewora tour iframe go full screen on
 *  iPhone and other browsers where an iframe can't use the Fullscreen API.
 *  It only touches iframes whose src is a Viewora /embed/ URL. No tracking. */
(function () {
  'use strict';
  if (window.__vieworaEmbed) return;
  window.__vieworaEmbed = true;

  var expanded = null; // { frame, style, scrollY }

  function viewoFrames() {
    var out = [];
    var all = document.getElementsByTagName('iframe');
    for (var i = 0; i < all.length; i++) {
      try {
        var u = new URL(all[i].src, location.href);
        if (/^\/embed\/[^/]+/.test(u.pathname) && (/(^|\.)viewora\.software$/.test(u.hostname) || u.hostname === 'localhost')) out.push({ el: all[i], origin: u.origin });
      } catch (e) { /* ignore */ }
    }
    return out;
  }

  function reply(frame, origin, msg) {
    try { frame.contentWindow.postMessage(Object.assign({ source: 'viewora-host' }, msg), origin); } catch (e) { /* ignore */ }
  }

  function expand(f) {
    if (expanded) return;
    var el = f.el;
    expanded = { frame: f, style: el.getAttribute('style') || '', scrollY: window.scrollY };
    el.setAttribute('style',
      'position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;max-width:none;' +
      'z-index:2147483647;border:0;border-radius:0;background:#000;margin:0;');
    document.documentElement.style.overflow = 'hidden';
    reply(el, f.origin, { type: 'fullscreen-state', expanded: true });
  }

  function collapse() {
    if (!expanded) return;
    var f = expanded.frame, y = expanded.scrollY;
    f.el.setAttribute('style', expanded.style);
    document.documentElement.style.overflow = '';
    expanded = null;
    window.scrollTo(0, y);
    reply(f.el, f.origin, { type: 'fullscreen-state', expanded: false });
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.source !== 'viewora') return;
    var frames = viewoFrames();
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      // Only trust the real iframe window, from the real Viewora origin.
      if (e.source !== f.el.contentWindow || e.origin !== f.origin) continue;
      reply(f.el, f.origin, { type: 'hello' });
      if (d.type === 'fullscreen' && d.action === 'enter') expand(f);
      if (d.type === 'fullscreen' && d.action === 'exit') collapse();
      return;
    }
  });

  // Announce ourselves so the viewer knows it can ask us to expand it.
  function announce() {
    var frames = viewoFrames();
    for (var i = 0; i < frames.length; i++) {
      (function (f) {
        reply(f.el, f.origin, { type: 'hello' });
        if (!f.el.__vwHooked) { f.el.__vwHooked = true; f.el.addEventListener('load', function () { reply(f.el, f.origin, { type: 'hello' }); }); }
      })(frames[i]);
    }
  }
  announce();
  if (document.readyState !== 'complete') window.addEventListener('load', announce);

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') collapse(); });
  window.addEventListener('orientationchange', function () { if (expanded) { var el = expanded.frame.el; el.style.height = '100dvh'; } });
})();
