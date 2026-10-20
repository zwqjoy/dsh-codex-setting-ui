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
function enhanceSettings(document, getCatalog = () => [], features) {
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

// This preference belongs only to this plugin, not to Harness's settings store.
const EDIT_KEY = 'dsh-codex-setting-ui.message-edit.enabled.v1';
function featureControls(ctx, document, mountEditing) {
  const win = document.defaultView;
  let enabled = false, available = false, disposed = false;
  try { enabled = win.localStorage.getItem(EDIT_KEY) === 'true'; } catch {}
  let services, stop = () => {};
  const listeners = new Set();
  function sync() {
    stop(); stop = () => {};
    if (enabled && available && !disposed) {
      try {stop = mountEditing(services, document);} catch {available = false;}
    }
    for (const notify of listeners) notify();
  }
  // Optional injection: missing chat services never block settings navigation.
  ctx.inject?.(['sessions', 'uiConversation', 'uiWorkspace', 'modelDirectories'], scope => {
    scope.effect(() => {
      if (disposed) return;
      services = scope;
      available = typeof scope.sessions?.list?.getSnapshot === 'function' && typeof scope.sessions?.list?.subscribe === 'function' && typeof scope.sessions?.binding === 'function' && typeof scope.sessions?.fork === 'function' &&
        typeof scope.sessions?.using === 'function' && typeof scope.uiConversation?.binding === 'function' &&
        typeof scope.uiWorkspace?.openSession === 'function' && typeof scope.modelDirectories?.directoryFor === 'function';
      sync();
      return () => { available = false; services = undefined; sync(); };
    });
  });
  function set(value) {
    enabled = value;
    try {win.localStorage.setItem(EDIT_KEY, String(enabled));} catch {}
    sync();
  }
  const storage = event => {
    if (event.key === EDIT_KEY || event.key === null) {
      try {enabled = win.localStorage.getItem(EDIT_KEY) === 'true';} catch {enabled = false;}
      sync();
    }
  };
  win.addEventListener('storage', storage);
  return {
    attach(root) {
      const box = document.createElement('section'); box.setAttribute('data-dcs-features', '');
      const label = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
      input.type = 'checkbox'; input.setAttribute('aria-label', '消息编辑（实验）'); text.textContent = '消息编辑（实验）';
      label.append(input, text);
      const help = document.createElement('p');
      const render = () => {input.checked = enabled; input.disabled = !available;
        help.textContent = available ? '仅纯文本；重新发送会新建会话分支，保留原对话。' : '当前宿主未提供兼容的消息编辑接口；设置布局仍可使用。';};
      input.onchange = () => set(input.checked); listeners.add(render);render();box.append(label,help);root.append(box);
      return () => {listeners.delete(render);box.remove();};
    },
    dispose() {disposed = true; stop(); stop = () => {}; listeners.clear();win.removeEventListener('storage',storage);}
  };
}

const editing = (() => {
const inject = ['sessions', 'uiConversation', 'uiWorkspace', 'modelDirectories'];
function currentId(state) {
  return state.current || Object.keys(state.byId ?? {}).find(id => state.byId[id].retainedBy?.mainView > 0);
}
function latestUser(binding, target) {
  const nodes = [...(target.getSnapshot()?.nodes.values() ?? [])];
  return nodes.filter(n => n.kind === 'user' || n.kind === 'steering').sort((a, b) => b.anchorSeq - a.anchorSeq)[0];
}
function editPlan(binding, target, key) {
  const node = latestUser(binding, target);
  if (!node || node.key !== key) throw new Error('只能编辑最新一条用户消息。');
  if (node.kind !== 'user') throw new Error('当前版本不支持编辑中途追加的消息。');
  const state = binding.session.getSnapshot();
  const inbox = binding.session.projections?.values()?.inbox;
  if (state.running || state.pendingSubmissions?.length || inbox?.['next-turn']?.length || inbox?.['next-step']?.length) throw new Error('请等待当前回复完成后再编辑。');
  const content = node.data.content;
  if (!Array.isArray(content) || !content.length || content.some(b => b.type !== 'text' || typeof b.text !== 'string'))
    throw new Error('此消息含附件或其他内容，当前版本仅支持纯文本消息。');
  const window = binding.eventSource.getSnapshot();
  const events = window.entries.map(r => r.event);
  const index = events.findIndex(e => e.seq === node.anchorSeq && e.type === 'user/message');
  if (index < 0) throw new Error('消息历史尚未完整加载。');
  // Cut before admission into the inbox. Cutting merely before user/message
  // would inherit the queued original and could run it again in the child.
  const message = events[index];
  const admittedAt = events.findIndex(e => e.type === 'agent/inbox/spliced' &&
    e.data?.inserted?.some(item => item.id === message.data?.id));
  if (admittedAt < 0) throw new Error('缺少原消息的入队记录，请先向上加载历史。');
  const previous = events[admittedAt - 1];
  if (!previous) throw new Error('缺少消息之前的历史边界，请先向上加载历史。');
  // A prompt queued during another turn needs a queue-rewrite contract to retain
  // the preceding completed answer exactly. Do not silently fork a partial answer.
  if (events.slice(admittedAt + 1, index).some(e => e.type === 'turn/end'))
    throw new Error('此消息在上一轮回复期间排队发送，当前版本暂不支持编辑。');
  return {key, seq: node.anchorSeq, atSeq: previous.seq, text: content.map(b => b.text).join('')};
}
function makeRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
async function selectedModel(ctx, sessionId) {
  const directory = ctx.modelDirectories?.directoryFor(sessionId);
  if (!directory) throw new Error('当前宿主无法读取模型选择。');
  if (directory.store.getSnapshot().status === 'selecting') throw new Error('模型仍在切换，请完成后再发送。');
  await directory.load();
  const state = directory.store.getSnapshot();
  if (state.status === 'selecting') throw new Error('模型仍在切换，请完成后再发送。');
  if (state.status !== 'ready' || !state.current || state.routable === false) throw new Error('当前模型不可用，请重新选择模型。');
  const {provider, model, reasoningEffort} = state.current;
  return {provider, model, ...(reasoningEffort === undefined ? {} : {reasoningEffort})};
}
async function resend(ctx, sessionId, plan, text, childState) {
  if (!text.trim()) throw new Error('消息不能为空。');
  const binding = ctx.sessions.binding(sessionId);
  if (!binding) throw new Error('原会话已关闭。');
  const target = ctx.uiConversation.binding(binding).target('chat');
  const fresh = editPlan(binding, target, plan.key);
  if (fresh.seq !== plan.seq || fresh.text !== plan.text || fresh.atSeq !== plan.atSeq) throw new Error('会话已变化，请重新打开编辑。');
  childState.model ??= await selectedModel(ctx, sessionId);
  // Keep the created child on failure, so retry does not create duplicate branches.
  childState.id ??= await ctx.sessions.fork({sessionId, atSeq: plan.atSeq, increaseTitle: true, onCreated: id => {childState.id = id;}});
  childState.requestId ??= makeRequestId();
  await ctx.sessions.using(childState.id, {source: 'dsh-message-edit'}, async reference => {
    if (!childState.modelApplied) {
      const selection = await ctx.modelDirectories.directoryFor(childState.id).select(childState.model);
      if (!selection.ok) throw new Error(selection.error?.message || '无法应用当前模型，消息未发送。');
      childState.modelApplied = true;
    }
    const result = await reference.binding.session.prompt([{type: 'text', text}], 'queue', undefined, childState.requestId);
    if (!result.ok) throw new Error(result.error?.message || '发送失败，请重试。');
    childState.accepted = true;
    await ctx.uiWorkspace.openSession(childState.id);
  });
}
const css = `
.dme-button{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:5px;border:0;border-radius:6px;background:transparent;color:inherit;cursor:pointer;vertical-align:middle}.dme-button:hover{background:var(--dsw-alias-interactive-bg-hover,#8882)}.dme-button:focus-visible,.dme-dialog button:focus-visible,.dme-dialog textarea:focus-visible{outline:2px solid #638af4;outline-offset:2px}.dme-button:disabled{opacity:.4;cursor:default}
.dme-dialog{box-sizing:border-box;width:min(600px,calc(100vw - 32px));padding:24px;border:1px solid var(--dsw-alias-separator-primary,#8885);border-radius:16px;background:var(--dsw-alias-background-primary,Canvas);color:var(--dsw-alias-label-primary,CanvasText);font:14px/1.5 system-ui;box-shadow:0 16px 64px #0004}.dme-dialog::backdrop{background:#0005}.dme-dialog h2{font-size:18px;margin:0 0 8px}.dme-dialog p{margin:0 0 16px;opacity:.75}.dme-dialog textarea{box-sizing:border-box;width:100%;min-height:160px;max-height:50vh;resize:vertical;padding:12px;border:1px solid #8886;border-radius:8px;font:inherit;color:inherit;background:transparent}.dme-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.dme-dialog button{padding:8px 16px;border:1px solid #8885;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer}.dme-dialog .dme-send{background:#4263eb;color:white;border-color:transparent}.dme-dialog button:disabled{opacity:.45;cursor:default}.dme-error{color:#d85858;white-space:pre-wrap;margin-top:12px}
`;
function mount(ctx, doc = document) {
  const style = doc.createElement('style'); style.textContent = css; doc.head.append(style);
  const buttons = new Set(); let dialog, stopSession = () => {}, stopEvents = () => {}, stopTarget = () => {};
  let active, binding, target, queued = false, disposed = false, pending = false;
  const schedule = () => { if (!queued && !disposed) { queued = true; queueMicrotask(() => {queued = false; if (!disposed) safeRefresh();}); } };
  const close = () => { if (dialog && !pending) { dialog.remove(); dialog = undefined; } };
  function open(plan) {
    close(); if (dialog) return;
    const capturedId = active, child = {};
    const d = dialog = doc.createElement('dialog'); d.className = 'dme-dialog';
    d.setAttribute('aria-labelledby', 'dme-title');
    const heading = doc.createElement('h2'); heading.id = 'dme-title'; heading.textContent = '编辑消息';
    const hint = doc.createElement('p'); hint.textContent = '重新发送会从此消息之前创建新会话分支，保留原会话和回复。';
    const input = doc.createElement('textarea'); input.value = plan.text; input.setAttribute('aria-label', '消息内容');
    const error = doc.createElement('div'); error.className = 'dme-error'; error.setAttribute('role', 'alert');
    const actions = doc.createElement('div'); actions.className = 'dme-actions';
    const cancel = doc.createElement('button'); cancel.textContent = '取消'; cancel.onclick = close;
    const send = doc.createElement('button'); send.textContent = '重新发送'; send.className = 'dme-send';
    const validate = () => {send.disabled = pending || !input.value.trim();};
    input.oninput = validate;
    send.onclick = async () => {
      if (pending || send.disabled) return;
      pending = true; input.disabled = cancel.disabled = true; send.disabled = true; send.textContent = '正在发送…'; error.textContent = '';
      try {
        if (child.accepted) { await ctx.uiWorkspace.openSession(child.id); }
        else await resend(ctx, capturedId, plan, input.value, child);
        pending = false; close();
      } catch (e) {
        error.textContent = child.accepted ? '消息已发送，打开会话失败。点击下方按钮重试打开。' : `未发送：${e.message}`;
        pending = false; input.disabled = !!child.id; cancel.disabled = false;
        send.textContent = child.accepted ? '打开新会话' : '重新发送'; validate();
      }
    };
    d.addEventListener('cancel', e => {e.preventDefault(); close();});
    d.addEventListener('keydown', e => {if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.isComposing) {e.preventDefault(); send.click();}});
    actions.append(cancel, send); d.append(heading, hint, input, error, actions); doc.body.append(d); validate(); d.showModal(); input.focus();
  }
  function refresh() {
    const id = currentId(ctx.sessions.list.getSnapshot());
    const next = id && ctx.sessions.binding(id);
    if (id !== active || next !== binding) {
      stopSession(); stopEvents(); stopTarget(); close(); active = id; binding = next; target = undefined;
      if (binding) {
        target = ctx.uiConversation.binding(binding).target('chat');
        stopSession = binding.session.subscribe(schedule); stopEvents = binding.eventSource.subscribe(schedule); stopTarget = target.subscribe(schedule);
      }
    }
    for (const b of buttons) if (!b.isConnected) buttons.delete(b);
    const node = binding && target && latestUser(binding, target);
    const row = node && [...doc.querySelectorAll('[data-chat-flow-kind="user"][data-chat-node-key]')].find(el => el.dataset.chatNodeKey === node.key);
    for (const b of buttons) if (!row?.contains(b)) {b.remove(); buttons.delete(b);}
    if (!row) return;
    let button = row.querySelector('.dme-button');
    if (!button) {
      const copy = row.querySelector('button'); if (!copy?.parentElement) return;
      button = doc.createElement('button'); button.className = 'dme-button'; button.type = 'button'; button.setAttribute('aria-label','编辑消息');
      button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5"/></svg>';
      copy.parentElement.append(button); buttons.add(button);
      button.onclick = () => {try {open(editPlan(binding, target, node.key));} catch (e) {button.title = e.message; schedule();}};
    }
    let reason = ''; try {editPlan(binding, target, node.key);} catch(e) {reason = e.message;}
    const disabled = !!reason; if (button.disabled !== disabled) button.disabled = disabled;
    const title = reason || '编辑并重新发送'; if (button.title !== title) button.title = title;
  }
  function safeRefresh() {
    try {refresh();} catch {
      // Unknown future host contracts must not break settings or target a wrong row.
      for (const button of buttons) button.remove(); buttons.clear(); close();
    }
  }
  const observer = new doc.defaultView.MutationObserver(schedule); observer.observe(doc.body, {childList:true,subtree:true});
  const unsubscribe = ctx.sessions.list.subscribe(schedule); safeRefresh();
  return () => {disposed = true; observer.disconnect(); unsubscribe(); stopSession(); stopEvents(); stopTarget(); pending = false; close(); for(const b of buttons)b.remove(); style.remove();};
}
function apply(ctx) { return ctx.effect(() => mount(ctx)); }

return {mount};
})();
return { name: 'dsh-codex-setting-ui', inject: ['slots'], apply(ctx) {
 ctx.effect(() => {
  const features = featureControls(ctx, document, editing.mount);
  const style = document.createElement('style');
  style.dataset.plugin = 'dsh-codex-setting-ui';
  style.textContent = "[data-dcs-settings] {\n  --dcs-bg:#fff;--dcs-nav:#f5f5f4;--dcs-text:#252525;--dcs-muted:#666;--dcs-border:#e5e5e3;--dcs-hover:#eaeae7;--dcs-selected:#e4e4df;\n  position:fixed!important;inset:0!important;transform:none!important;margin:0!important;\n  width:100vw!important;max-width:none!important;height:100dvh!important;max-height:none!important;\n  display:grid!important;grid-template-columns:248px minmax(0,1fr)!important;border:0!important;border-radius:0!important;\n  background:var(--dcs-bg)!important;color:var(--dcs-text);overflow:hidden!important;\n  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;\n}\nbody[data-ds-dark-theme] [data-dcs-settings],html[data-theme=dark] [data-dcs-settings] {\n  --dcs-bg:#1c1c1c;--dcs-nav:#222;--dcs-text:#ededeb;--dcs-muted:#aaa;--dcs-border:#363635;--dcs-hover:#30302e;--dcs-selected:#393936;color-scheme:dark;\n}\n[data-dcs-settings] > nav {min-height:0!important;overflow-y:auto!important;display:flex!important;flex-direction:column!important;background:var(--dcs-nav)!important;border-right:1px solid var(--dcs-border)!important;width:auto!important;padding:56px 16px 24px!important;gap:16px!important}\n[data-dcs-settings] > nav > :first-child {font-size:20px!important;font-weight:650!important;color:var(--dcs-text)!important;padding:0 8px!important;margin:0!important}\n[data-dcs-original] {display:none!important}\n[data-dcs-nav] {display:flex;flex-direction:column;gap:16px;min-height:0;color:var(--dcs-text)}\n[data-dcs-nav] * {box-sizing:border-box}\n[data-dcs-nav] label {display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--dcs-muted)}\n[data-dcs-nav] input {width:100%;min-height:40px;padding:8px 12px;border:1px solid var(--dcs-border);border-radius:8px;color:var(--dcs-text);background:var(--dcs-bg);font-size:14px;line-height:1.5;font-family:inherit}\n[data-dcs-nav] section {margin:0 0 20px}\n[data-dcs-nav] h2 {font:500 12px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.02em;color:var(--dcs-muted);padding:0 12px;margin:0 0 6px}\n[data-dcs-nav] button {width:100%;min-height:44px;display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;margin:2px 0;border:0;border-radius:8px;font:400 14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--dcs-text);background:transparent;cursor:pointer;transition:background 120ms ease}\n[data-dcs-nav] button:hover {background:var(--dcs-hover)}\n[data-dcs-nav] button[aria-current=page] {background:var(--dcs-selected);font-weight:600}\n[data-dcs-nav] svg {width:17px;height:17px;flex:none;opacity:.85}\n[data-dcs-nav] button span {overflow-wrap:anywhere}\n[data-dcs-nav] :focus-visible {outline:2px solid #5683cc;outline-offset:2px}\n[data-dcs-nav] [hidden] {display:none!important}\n[data-dcs-nav] [role=status] {margin:4px 8px;color:var(--dcs-muted);font-size:13px;line-height:1.6}\n[data-dcs-content] {min-width:0!important;min-height:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;background:var(--dcs-bg)!important;padding-top:44px!important}\n[data-dcs-content] > :first-child {flex-shrink:0!important;padding:12px 32px!important;min-height:48px!important}\n[data-dcs-options] {min-height:0!important;overflow:auto!important;flex:1!important;padding:24px max(32px,calc((100% - 960px)/2)) 64px!important;color:var(--dcs-text)}\n@media(max-width:680px) {\n [data-dcs-settings] {grid-template-columns:1fr!important;grid-template-rows:minmax(180px,38dvh) minmax(0,1fr)!important}\n [data-dcs-settings] > nav {padding:48px 16px 12px!important;border-right:0!important;border-bottom:1px solid var(--dcs-border)!important;gap:12px!important}\n [data-dcs-nav] {display:grid;grid-template-columns:minmax(130px,1fr) minmax(0,2fr);gap:12px}\n [data-dcs-nav] > :nth-child(2) {max-height:170px;overflow:auto}\n [data-dcs-nav] section {margin-bottom:12px}\n [data-dcs-content] {padding-top:0!important}\n [data-dcs-content] > :first-child {padding:8px 16px!important}\n [data-dcs-options] {padding:12px 20px 40px!important}\n}\n@media(prefers-reduced-motion:reduce) {[data-dcs-nav] button {transition:none}}\n[data-dcs-features]{margin-top:16px;padding-top:16px;border-top:1px solid var(--dcs-border)}\n[data-dcs-features]>label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dcs-text);cursor:pointer}\n[data-dcs-features] input[type=checkbox]{width:16px;height:16px;margin:0;accent-color:#4263eb}\n[data-dcs-features]>p{font-size:12px;line-height:1.5;color:var(--dcs-muted);margin:8px 0 0}\n@media(max-width:680px){[data-dcs-features]{grid-column:1/-1;margin-top:0}}\n";
  document.head.append(style);
  const stop = enhanceSettings(document, () => ctx.slots.entriesOfSlot('settings.section').map(entry => ({
   id: entry.options.id || '',
   label: (typeof entry.options.label === 'function' ? entry.options.label() : entry.options.label) || '',
  })), features);
  return () => { stop(); features.dispose(); style.remove(); };
 });
}};
 }
});
