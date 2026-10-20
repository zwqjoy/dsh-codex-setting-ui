import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {currentId, editPlan, resend, mount} from '../src/message-edit.js';
function fixture() {
  let running = false, content = [{type:'text',text:'原始问题'}], key = 'user-2';
  const eventSource = {getSnapshot:()=>({entries:[{event:{seq:3,type:'turn/end'}},{event:{seq:5,type:'agent/inbox/spliced',data:{inserted:[{id:'m2'}]}}},{event:{seq:8,type:'user/message',data:{id:'m2'}}}]}),subscribe:()=>()=>{}};
  const target = {getSnapshot:()=>({nodes:new Map([[key,{key,kind:'user',anchorSeq:8,data:{content}}]])}),subscribe:()=>()=>{}};
  const binding = {eventSource,session:{getSnapshot:()=>({running,pendingSubmissions:[]}),subscribe:()=>()=>{}}};
  const calls = []; let fail = false, selectionFail = false, modelState = {status:'ready',routable:true,current:{provider:'provider-a',model:'model-a'}};
  const ctx = {modelDirectories:{directoryFor:()=>({load:async()=>{},store:{getSnapshot:()=>modelState},select:async model=>{calls.push(['select',model]);return selectionFail ? {ok:false,error:{message:'模型切换失败'}} : {ok:true};}})},sessions:{list:{getSnapshot:()=>({current:'parent'}),subscribe:()=>()=>{}},binding:()=>binding,
    fork:async opts=>{calls.push(['fork',{sessionId:opts.sessionId,atSeq:opts.atSeq,increaseTitle:opts.increaseTitle}]);return 'child';},
    using:async (id,opts,fn)=>fn({binding:{session:{prompt:async (blocks,mode)=>{calls.push(['prompt',id,blocks,mode]);return fail ? {ok:false,error:{message:'网络错误'}}:{ok:true};}}}})},
    uiConversation:{binding:()=>({target:()=>target})}, uiWorkspace:{openSession:async id=>{calls.push(['open',id]);}}};
  return {ctx,binding,target,calls,setModel:v=>modelState=v,setSelectionFail:v=>selectionFail=v,setRunning:v=>running=v,setContent:v=>content=v,setKey:v=>key=v,setFail:v=>fail=v};
}
test('resolves both legacy and retained current sessions',()=>{
  assert.equal(currentId({current:'x'}),'x'); assert.equal(currentId({byId:{x:{retainedBy:{mainView:1}}}}),'x');
});
test('uses actual preceding event, excluding original user message',()=>{
  const f=fixture(); assert.deepEqual(editPlan(f.binding,f.target,'user-2'),{key:'user-2',seq:8,atSeq:3,text:'原始问题'});
  assert.throws(()=>editPlan(f.binding,f.target,'older'),/最新/);
  f.setRunning(true);assert.throws(()=>editPlan(f.binding,f.target,'user-2'),/等待/);
  f.setRunning(false);f.setContent([{type:'image'}]);assert.throws(()=>editPlan(f.binding,f.target,'user-2'),/附件/);
});
test('rejects stale edits and empty sends before creating any child',async()=>{
  const f=fixture(),plan=editPlan(f.binding,f.target,'user-2'); f.setContent([{type:'text',text:'changed'}]);
  await assert.rejects(resend(f.ctx,'parent',plan,'new',{}),/变化/); assert.equal(f.calls.length,0);
  await assert.rejects(resend(f.ctx,'parent',plan,' ',{}),/空/);
});
test('forks at boundary and sends only replacement, then opens child',async()=>{
  const f=fixture(),plan=editPlan(f.binding,f.target,'user-2');await resend(f.ctx,'parent',plan,'修改后的问题',{});
  assert.deepEqual(f.calls,[['fork',{sessionId:'parent',atSeq:3,increaseTitle:true}],['select',{provider:'provider-a',model:'model-a'}],['prompt','child',[{type:'text',text:'修改后的问题'}],'queue'],['open','child']]);
});
test('failed admission retains child and draft for retry',async()=>{
  const f=fixture(),plan=editPlan(f.binding,f.target,'user-2'),child={};f.setFail(true);
  await assert.rejects(resend(f.ctx,'parent',plan,'new',child),/网络/);assert.equal(child.id,'child');assert.equal(child.accepted,undefined);
  f.setFail(false);await resend(f.ctx,'parent',plan,'new',child);assert.equal(f.calls.filter(c=>c[0]==='fork').length,1);
});
test('DOM: preserves copy and message, opens editor, cancels and cleans up',async()=>{
  const f=fixture(),dom=new JSDOM('<html><head></head><body><div data-chat-flow-kind="user" data-chat-node-key="older"><span>历史问题</span><div><button>复制</button></div></div><div data-chat-flow-kind="user" data-chat-node-key="user-2"><span>原始问题</span><div><button id="copy">复制</button></div></div></body></html>');
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  const doc=dom.window.document,dispose=mount(f.ctx,doc);
  assert.equal(doc.querySelectorAll('.dme-button').length,1);assert.ok(doc.querySelector('#copy'));doc.querySelector('.dme-button').click();
  assert.equal(doc.querySelector('textarea').value,'原始问题');assert.equal(doc.querySelector('.dme-send').disabled,false);
  doc.querySelector('textarea').value='新问题';doc.querySelector('textarea').dispatchEvent(new dom.window.Event('input'));
  assert.equal(doc.querySelector('.dme-send').disabled,false);doc.querySelector('.dme-actions button').click();assert.equal(doc.querySelector('dialog'),null);assert.equal(f.calls.length,0);
  dispose();assert.equal(doc.querySelector('.dme-button'),null);assert.ok(doc.querySelector('#copy'));dom.window.close();
});
test('DOM: double click submits once and error keeps textarea',async()=>{
 const f=fixture(),dom=new JSDOM('<body><div data-chat-flow-kind="user" data-chat-node-key="user-2"><div><button>复制</button></div></div></body>');
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};const doc=dom.window.document,dispose=mount(f.ctx,doc);f.setFail(true);
 doc.querySelector('.dme-button').click();const input=doc.querySelector('textarea');input.value='新问题';input.dispatchEvent(new dom.window.Event('input'));
 doc.querySelector('.dme-send').click();doc.querySelector('.dme-send').click();await new Promise(r=>setTimeout(r,10));
 assert.equal(f.calls.filter(c=>c[0]==='prompt').length,1);assert.equal(input.value,'新问题');assert.match(doc.querySelector('[role="alert"]').textContent,/未发送/);
 dispose();dom.window.close();
});
test('cuts before inbox admission rather than just before rendered message',()=>{
 const f=fixture();f.binding.eventSource.getSnapshot=()=>({entries:[
  {event:{seq:1,type:'model/selection'}},{event:{seq:2,type:'agent/inbox/spliced',data:{inserted:[{id:'m2'}]}}},
  {event:{seq:3,type:'turn/start'}},{event:{seq:6,type:'agent/inbox/spliced',data:{inserted:[]}}},
  {event:{seq:8,type:'user/message',data:{id:'m2'}}} ]});
 assert.equal(editPlan(f.binding,f.target,'user-2').atSeq,1);
});
test('rejects queued-during-previous-answer instead of losing prior context',()=>{
 const f=fixture();f.binding.eventSource.getSnapshot=()=>({entries:[
  {event:{seq:1,type:'model/selection'}},{event:{seq:2,type:'agent/inbox/spliced',data:{inserted:[{id:'m2'}]}}},
  {event:{seq:3,type:'turn/end'}},{event:{seq:8,type:'user/message',data:{id:'m2'}}} ]});
 assert.throws(()=>editPlan(f.binding,f.target,'user-2'),/排队/);
});
test('fails closed with missing history or newer steering message',()=>{
 const f=fixture();f.binding.eventSource.getSnapshot=()=>({entries:[{event:{seq:8,type:'user/message',data:{id:'m2'}}}]});
 assert.throws(()=>editPlan(f.binding,f.target,'user-2'),/入队/);
 f.target.getSnapshot=()=>({nodes:new Map([['s',{key:'s',kind:'steering',anchorSeq:10,data:{content:[{type:'text',text:'new'}]}}]])});
 assert.throws(()=>editPlan(f.binding,f.target,'user-2'),/最新/);
});

test('unchanged text resends with model chosen after editor opened, including effort',async()=>{
 const f=fixture(),plan=editPlan(f.binding,f.target,'user-2');
 f.setModel({status:'ready',routable:true,current:{provider:'provider-b',model:'model-b',reasoningEffort:'high'}});
 await resend(f.ctx,'parent',plan,plan.text,{});
 assert.deepEqual(f.calls[1],['select',{provider:'provider-b',model:'model-b',reasoningEffort:'high'}]);
 assert.deepEqual(f.calls[2],['prompt','child',[{type:'text',text:plan.text}],'queue']);
});
test('model selection failure never sends with inherited historical model',async()=>{
 const f=fixture(),plan=editPlan(f.binding,f.target,'user-2');f.setSelectionFail(true);
 await assert.rejects(resend(f.ctx,'parent',plan,plan.text,{}),/模型切换失败/);
 assert.equal(f.calls.filter(c=>c[0]==='prompt').length,0);
});
test('pending model switch rejects before creating branch',async()=>{
 const f=fixture(),plan=editPlan(f.binding,f.target,'user-2');f.setModel({status:'selecting'});
 await assert.rejects(resend(f.ctx,'parent',plan,plan.text,{}),/仍在切换/);assert.equal(f.calls.length,0);
});
