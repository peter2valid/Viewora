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

  var MS = 240;
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function vh() { return window.innerHeight + 'px'; }
  function px(r) { return { top: r.top + 'px', left: r.left + 'px', width: r.width + 'px', height: r.height + 'px' }; }
  function set(el, o) { for (var k in o) el.style[k] = o[k]; }

  // Grow the iframe from where it sits to the full screen. A placeholder keeps
  // the host page from jumping, and the black backdrop means no white flash
  // while the tour re-lays out.
  function expand(f) {
    if (expanded) return;
    var el = f.el, r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    var ph = document.createElement('div');
    ph.setAttribute('aria-hidden', 'true');
    set(ph, { width: r.width + 'px', height: r.height + 'px', margin: cs.margin, display: cs.display === 'inline' ? 'inline-block' : cs.display, verticalAlign: cs.verticalAlign, flex: '0 0 auto' });
    el.parentNode.insertBefore(ph, el);
    expanded = { frame: f, style: el.getAttribute('style') || '', scrollY: window.scrollY, ph: ph, radius: cs.borderRadius };
    set(el, px(r));
    set(el, { position: 'fixed', margin: '0', maxWidth: 'none', zIndex: '2147483647', border: '0', background: '#000', borderRadius: expanded.radius, transition: 'none', willChange: 'top,left,width,height' });
    document.documentElement.style.overflow = 'hidden';
    void el.offsetWidth; // commit the starting box before animating
    if (!reduced()) el.style.transition = 'top ' + MS + 'ms ease, left ' + MS + 'ms ease, width ' + MS + 'ms ease, height ' + MS + 'ms ease, border-radius ' + MS + 'ms ease';
    set(el, { top: '0px', left: '0px', width: '100vw', height: vh(), borderRadius: '0px' });
    reply(el, f.origin, { type: 'fullscreen-state', expanded: true });
  }

  function collapse() {
    if (!expanded) return;
    var st = expanded, el = st.frame.el;
    expanded = null;
    function finish() {
      el.setAttribute('style', st.style);
      if (st.ph.parentNode) st.ph.parentNode.removeChild(st.ph);
      document.documentElement.style.overflow = '';
      window.scrollTo(0, st.scrollY);
    }
    reply(el, st.frame.origin, { type: 'fullscreen-state', expanded: false });
    if (reduced()) return finish();
    set(el, px(st.ph.getBoundingClientRect()));
    el.style.borderRadius = st.radius;
    setTimeout(finish, MS + 40);
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
  window.addEventListener('orientationchange', function () { if (expanded) setTimeout(function () { if (expanded) expanded.frame.el.style.height = vh(); }, 120); });
  window.addEventListener('resize', function () { if (expanded) expanded.frame.el.style.height = vh(); });
})();
