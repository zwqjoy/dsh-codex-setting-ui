// Generated from src/ by scripts/build.mjs.
window.__ModuleLoader__.load({
 id: 'dsh-codex-setting-ui',
 factory: () => {
const GROUPS = ['personal', 'capabilities', 'records'];
const COPY = {
  zh: { search: '搜索设置分类', personal: '偏好设置', capabilities: '模型与扩展', records: '记录与帮助', empty: '没有匹配的设置分类', hint: '右侧仍显示当前分类', nav: '设置分类' },
  en: { search: 'Search settings categories', personal: 'Preferences', capabilities: 'Models & extensions', records: 'History & help', empty: 'No matching categories', hint: 'The current category remains open', nav: 'Settings categories' },
};
function groupFor(id, label) {
  const text = `${id} ${label}`.toLowerCase();
  if (/archive|session-log|history|about|help|归档|日志|历史|关于|帮助/.test(text)) return 'records';
  if (/^(account|general|appearance|theme|language|shortcuts|voice|claude-style)$/.test(id) || /通用|常规|账号|账户|外观|主题|语言|快捷键|claude.*style|claude.*风格/i.test(label)) return 'personal';
  return 'capabilities';
}
function matches(row, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = `${row.id} ${row.label}`.toLocaleLowerCase();
  return terms.every(term => text.includes(term));
}
function languageFor(labels, lang) {
  // Prefer the settings' actual labels over the operating system locale.
  if (/[\u3400-\u9fff]/u.test(labels.join(' '))) return 'zh';
  return labels.length ? 'en' : /^zh/i.test(lang || '') ? 'zh' : 'en';
}


// Layout only. The host retains its dialog, focus trap, shortcut, onboarding,
// form components, navigation state and every persistence/API operation.
function enhanceSettings(document, getCatalog = () => []) {
  const cleanups = new Map();
  let disposed = false;
  const win = document.defaultView;
  function attach(panel) {
    const nav = panel.querySelector(':scope > nav');
    const list = nav && [...nav.children].find(el => [...el.children].some(child => child.tagName === 'BUTTON'));
    const content = nav?.nextElementSibling;
    const options = content?.lastElementChild;
    if (!nav || !list || !content || !options || content === options) return;
    const originals = [...list.children].filter(el => el.tagName === 'BUTTON');
    if (!originals.length) return;
    panel.setAttribute('data-dcs-settings', '');
    list.setAttribute('data-dcs-original', '');
    content.setAttribute('data-dcs-content', '');
    options.setAttribute('data-dcs-options', '');
    const root = document.createElement('div');
    root.setAttribute('data-dcs-nav', '');
    const label = document.createElement('label');
    const caption = document.createElement('span');
    const input = document.createElement('input');
    input.type = 'search';
    input.autocomplete = 'off';
    label.append(caption, input);
    const groups = document.createElement('div');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    root.append(label, groups, status);
    nav.append(root);
    let signature = '';
    const navClick = event => {
      const target = event.target.closest('button[data-dcs-target]');
      if (!target || !groups.contains(target)) return;
      const original = [...list.children].filter(el => el.tagName === 'BUTTON')[Number(target.dataset.dcsTarget)];
      if (original && !original.disabled) original.click();
    };
    const refresh = () => {
      if (!panel.isConnected) return;
      const buttons = [...list.children].filter(el => el.tagName === 'BUTTON');
      const catalog = getCatalog();
      const rows = buttons.map((button, index) => {
        const label = button.textContent.trim();
        const id = catalog.find(row => row.label === label)?.id || '';
        return { id, label, index, button, active: ['true', 'page'].includes(button.getAttribute('aria-current')) };
      });
      const lang = languageFor(rows.map(row => row.label), document.documentElement.lang);
      const copy = COPY[lang];
      const next = JSON.stringify([rows.map(({id,label,active,button}) => [id,label,active,button.disabled]), input.value, lang]);
      if (next === signature) return;
      signature = next;
      caption.textContent = copy.search;
      input.placeholder = copy.search;
      input.setAttribute('aria-label', copy.search);
      root.setAttribute('aria-label', copy.nav);
      // Refresh only the mirrored list. Never move or rewrite React-owned buttons.
      const fragment = document.createDocumentFragment();
      const visible = rows.filter(row => matches(row, input.value));
      for (const group of GROUPS) {
        const entries = visible.filter(row => groupFor(row.id, row.label) === group);
        if (!entries.length) continue;
        const section = document.createElement('section');
        const heading = document.createElement('h2');
        heading.textContent = copy[group];
        section.append(heading);
        for (const row of entries) {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.dcsTarget = String(row.index);
          button.disabled = row.button.disabled;
          if (row.active) button.setAttribute('aria-current', 'page');
          const icon = row.button.querySelector('svg');
          if (icon) { const clone = icon.cloneNode(true); clone.setAttribute('aria-hidden', 'true'); clone.removeAttribute('id'); button.append(clone); }
          const text = document.createElement('span');
          text.textContent = row.label;
          button.append(text);
          section.append(button);
        }
        fragment.append(section);
      }
      const focused = groups.contains(document.activeElement) ? document.activeElement?.closest('[data-dcs-target]')?.dataset.dcsTarget : null;
      groups.replaceChildren(fragment);
      if (focused != null) groups.querySelector(`[data-dcs-target="${focused}"]`)?.focus({preventScroll:true});
      status.textContent = !visible.length ? copy.empty : input.value.trim() && !visible.some(row => row.active) ? copy.hint : '';
      status.hidden = !status.textContent;
    };
    input.addEventListener('input', refresh);
    groups.addEventListener('click', navClick);
    const observer = new win.MutationObserver(refresh);
    observer.observe(list, { childList: true, subtree: true, attributes: true, characterData:true, attributeFilter: ['aria-current', 'disabled'] });
    refresh();
    if (list.contains(document.activeElement)) {
      const index = originals.indexOf(document.activeElement.closest('button'));
      groups.querySelector(`[data-dcs-target="${index}"]`)?.focus({preventScroll:true});
    }
    cleanups.set(panel, () => {
      const focusedIndex = groups.contains(document.activeElement) ? Number(document.activeElement.closest('[data-dcs-target]')?.dataset.dcsTarget) : null;
      observer.disconnect();
      input.removeEventListener('input', refresh);
      groups.removeEventListener('click', navClick);
      root.remove();
      panel.removeAttribute('data-dcs-settings');
      list.removeAttribute('data-dcs-original');
      content.removeAttribute('data-dcs-content');
      options.removeAttribute('data-dcs-options');
      if (focusedIndex != null && panel.isConnected) [...list.children].filter(el => el.tagName === 'BUTTON')[focusedIndex]?.focus({preventScroll:true});
    });
  }
  function scan() {
    if (disposed) return;
    for (const [panel, cleanup] of cleanups) if (!panel.isConnected) { cleanup(); cleanups.delete(panel); }
    for (const panel of document.querySelectorAll('[data-shortcut-modal="settings"][role="dialog"]')) {
      if (!cleanups.has(panel)) attach(panel);
    }
  }
  // Observe node insertion/removal only. Chat streaming character updates do not
  // trigger a tree scan; our own mirrored-list changes are ignored.
  const observer = new win.MutationObserver(records => {
    const selector = '[data-shortcut-modal="settings"][role="dialog"]';
    let relevant = false;
    for (const record of records) {
      if (record.target.closest?.('[data-dcs-nav]')) continue;
      const pending = record.target.closest?.(selector);
      if (pending && !cleanups.has(pending)) relevant = true;
      for (const node of record.addedNodes) {
        if (node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector))) relevant = true;
      }
    }
    if (relevant || [...cleanups.keys()].some(panel => !panel.isConnected)) scan();
  });
  observer.observe(document.body, { childList:true, subtree:true });
  scan();
  return () => {
    disposed = true;
    observer.disconnect();
    for (const cleanup of cleanups.values()) cleanup();
    cleanups.clear();
  };
}

return { name: 'dsh-codex-setting-ui', inject: ['slots'], apply(ctx) {
 ctx.effect(() => {
  const style = document.createElement('style');
  style.dataset.plugin = 'dsh-codex-setting-ui';
  style.textContent = "[data-dcs-settings] {\n  --dcs-bg:#fff;--dcs-nav:#f5f5f4;--dcs-text:#252525;--dcs-muted:#666;--dcs-border:#e5e5e3;--dcs-hover:#eaeae7;--dcs-selected:#e4e4df;\n  position:fixed!important;inset:0!important;transform:none!important;margin:0!important;\n  width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;\n  display:grid!important;grid-template-columns:248px minmax(0,1fr)!important;border:0!important;border-radius:0!important;\n  background:var(--dcs-bg)!important;color:var(--dcs-text);overflow:hidden!important;\n  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;\n}\nbody[data-ds-dark-theme] [data-dcs-settings],html[data-theme=dark] [data-dcs-settings] {\n  --dcs-bg:#1c1c1c;--dcs-nav:#222;--dcs-text:#ededeb;--dcs-muted:#aaa;--dcs-border:#363635;--dcs-hover:#30302e;--dcs-selected:#393936;color-scheme:dark;\n}\n[data-dcs-settings] > nav {min-height:0!important;overflow-y:auto!important;display:flex!important;flex-direction:column!important;background:var(--dcs-nav)!important;border-right:1px solid var(--dcs-border)!important;width:auto!important;padding:56px 16px 24px!important;gap:16px!important}\n[data-dcs-settings] > nav > :first-child {font-size:20px!important;font-weight:650!important;color:var(--dcs-text)!important;padding:0 8px!important;margin:0!important}\n[data-dcs-original] {display:none!important}\n[data-dcs-nav] {display:flex;flex-direction:column;gap:16px;min-height:0;color:var(--dcs-text)}\n[data-dcs-nav] * {box-sizing:border-box}\n[data-dcs-nav] label {display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--dcs-muted)}\n[data-dcs-nav] input {width:100%;min-height:40px;padding:8px 12px;border:1px solid var(--dcs-border);border-radius:8px;color:var(--dcs-text);background:var(--dcs-bg);font-size:14px;line-height:1.5;font-family:inherit}\n[data-dcs-nav] section {margin:0 0 20px}\n[data-dcs-nav] h2 {font:500 12px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.02em;color:var(--dcs-muted);padding:0 12px;margin:0 0 6px}\n[data-dcs-nav] button {width:100%;min-height:44px;display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;margin:2px 0;border:0;border-radius:8px;font:400 14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--dcs-text);background:transparent;cursor:pointer;transition:background 120ms ease}\n[data-dcs-nav] button:hover {background:var(--dcs-hover)}\n[data-dcs-nav] button[aria-current=page] {background:var(--dcs-selected);font-weight:600}\n[data-dcs-nav] svg {width:17px;height:17px;flex:none;opacity:.85}\n[data-dcs-nav] button span {overflow-wrap:anywhere}\n[data-dcs-nav] :focus-visible {outline:2px solid #5683cc;outline-offset:2px}\n[data-dcs-nav] [hidden] {display:none!important}\n[data-dcs-nav] [role=status] {margin:4px 8px;color:var(--dcs-muted);font-size:13px;line-height:1.6}\n[data-dcs-content] {min-width:0!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;background:var(--dcs-bg)!important;padding-top:44px!important}\n[data-dcs-content] > :first-child {flex-shrink:0!important;padding:12px 32px!important;min-height:48px!important}\n[data-dcs-options] {min-height:0!important;overflow:auto!important;flex:1!important;padding:24px max(32px,calc((100% - 960px)/2)) 64px!important;color:var(--dcs-text)}\n@media(max-width:680px) {\n [data-dcs-settings] {grid-template-columns:1fr!important;grid-template-rows:minmax(180px,38dvh) minmax(0,1fr)!important}\n [data-dcs-settings] > nav {padding:48px 16px 12px!important;border-right:0!important;border-bottom:1px solid var(--dcs-border)!important;gap:12px!important}\n [data-dcs-nav] {display:grid;grid-template-columns:minmax(130px,1fr) minmax(0,2fr);gap:12px}\n [data-dcs-nav] > :nth-child(2) {max-height:170px;overflow:auto}\n [data-dcs-nav] section {margin-bottom:12px}\n [data-dcs-content] {padding-top:0!important}\n [data-dcs-content] > :first-child {padding:8px 16px!important}\n [data-dcs-options] {padding:12px 20px 40px!important}\n}\n@media(prefers-reduced-motion:reduce) {[data-dcs-nav] button {transition:none}}\n";
  document.head.append(style);
  const stop = enhanceSettings(document, () => ctx.slots.entriesOfSlot('settings.section').map(entry => ({
   id: entry.options.id || '',
   label: (typeof entry.options.label === 'function' ? entry.options.label() : entry.options.label) || '',
  })));
  return () => { stop(); style.remove(); };
 });
}};
 }
});
