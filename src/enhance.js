import { GROUPS, COPY, groupFor, matches, languageFor } from './navigation.js';

// Layout only. The host retains its dialog, focus trap, shortcut, onboarding,
// form components, navigation state and every persistence/API operation.
export function enhanceSettings(document, getCatalog = () => [], features) {
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
    const stopFeatures = features?.attach(root) ?? (() => {});
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
      stopFeatures();
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
