export const inject = ['sessions', 'uiConversation', 'uiWorkspace'];
export function currentId(state) {
  return state.current || Object.keys(state.byId ?? {}).find(id => state.byId[id].retainedBy?.mainView > 0);
}
export function latestUser(binding, target) {
  const nodes = [...(target.getSnapshot()?.nodes.values() ?? [])];
  return nodes.filter(n => n.kind === 'user' || n.kind === 'steering').sort((a, b) => b.anchorSeq - a.anchorSeq)[0];
}
export function editPlan(binding, target, key) {
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
export function makeRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export async function resend(ctx, sessionId, plan, text, childState) {
  if (!text.trim()) throw new Error('消息不能为空。');
  const binding = ctx.sessions.binding(sessionId);
  if (!binding) throw new Error('原会话已关闭。');
  const target = ctx.uiConversation.binding(binding).target('chat');
  const fresh = editPlan(binding, target, plan.key);
  if (fresh.seq !== plan.seq || fresh.text !== plan.text || fresh.atSeq !== plan.atSeq) throw new Error('会话已变化，请重新打开编辑。');
  // Keep the created child on failure, so retry does not create duplicate branches.
  childState.id ??= await ctx.sessions.fork({sessionId, atSeq: plan.atSeq, increaseTitle: true, onCreated: id => {childState.id = id;}});
  childState.requestId ??= makeRequestId();
  await ctx.sessions.using(childState.id, {source: 'dsh-message-edit'}, async reference => {
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
export function mount(ctx, doc = document) {
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
    const validate = () => {send.disabled = pending || !input.value.trim() || input.value === plan.text;};
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
export function apply(ctx) { return ctx.effect(() => mount(ctx)); }
