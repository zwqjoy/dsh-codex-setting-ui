// This preference belongs only to this plugin, not to Harness's settings store.
export const EDIT_KEY = 'dsh-codex-setting-ui.message-edit.enabled.v1';
export function featureControls(ctx, document, mountEditing) {
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
  ctx.inject?.(['sessions', 'uiConversation', 'uiWorkspace', 'modelDirectories', 'remote', 'remote.session'], scope => {
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
