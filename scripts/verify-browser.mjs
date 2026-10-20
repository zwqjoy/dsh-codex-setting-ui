import { chromium } from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(req,res)=>{
 try {const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root.endsWith(sep)?root:root+sep))throw Error('outside root');
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8'})[extname(path)]||'text/plain');res.end(await readFile(path));
 }catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try {
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/test/browser.html`);
 await page.getByRole('button',{name:'运行浏览器检查'}).click();
 await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('ALL PASS')||document.querySelector('#result').textContent.includes('FAIL'));
 const result=await page.locator('#result').textContent();assert.match(result,/ALL PASS/);console.log(result);
 await page.evaluate(()=>{
  dcsTest.stop();window.calls=[];
  const node={key:'latest',kind:'user',anchorSeq:9,data:{content:[{type:'text',text:'原始问题'}]}};
  const binding={eventSource:{getSnapshot:()=>({entries:[{event:{seq:3,type:'turn/end'}},{event:{seq:4,type:'agent/inbox/spliced',data:{inserted:[{id:'m'}]}}},{event:{seq:9,type:'user/message',data:{id:'m'}}}]}),subscribe:()=>()=>{}},session:{getSnapshot:()=>({running:false}),subscribe:()=>()=>{}}};
  const disposers=[];window.modelState={status:'ready',routable:true,current:{provider:'p',model:'old'}};const ctx={modelDirectories:{directoryFor:()=>({load:async()=>{},store:{getSnapshot:()=>window.modelState},select:async model=>{calls.push(['select',model]);return {ok:true};}})},effect:fn=>{const off=fn();if(off)disposers.push(off);return off;},slots:{entriesOfSlot:()=>dcsTest.catalog.map(options=>({options}))},
   inject:(_,fn)=>fn(ctx),sessions:{list:{getSnapshot:()=>({current:'parent'}),subscribe:()=>()=>{}},binding:()=>binding,
   fork:async opts=>{calls.push(['fork',opts.atSeq]);return 'child';},using:async(id,opts,fn)=>fn({binding:{session:{prompt:async blocks=>{calls.push(['prompt',blocks]);return {ok:true};}}}})},
   uiConversation:{binding:()=>({target:()=>({getSnapshot:()=>({nodes:new Map([['latest',node]])}),subscribe:()=>()=>{}})})},uiWorkspace:{openSession:async id=>{calls.push(['open',id]);}}};
  dcsTest.runtime.apply(ctx);window.stopCombined=()=>disposers.reverse().forEach(off=>off());
  const row=document.createElement('div');row.dataset.chatFlowKind='user';row.dataset.chatNodeKey='latest';row.innerHTML='<span>原始问题</span><div><button id="copy">复制</button></div>';document.body.append(row);
 });
 assert.equal(await page.locator('.dme-button').count(),0);
 await page.getByRole('button',{name:'打开设置预览'}).click();
 const toggle=page.getByRole('checkbox',{name:'消息编辑（实验）'});await toggle.check();
 await page.waitForSelector('.dme-button');assert.equal(await page.locator('.dme-button').count(),1);
 await toggle.uncheck();assert.equal(await page.locator('.dme-button').count(),0);
 await toggle.check();await page.locator('[data-shortcut-modal="settings"]').evaluate(el=>el.remove());
 await page.getByRole('button',{name:'编辑消息'}).click();assert.equal(await page.getByRole('button',{name:'重新发送',exact:true}).isEnabled(),true);await page.evaluate(()=>{window.modelState={status:'ready',routable:true,current:{provider:'p',model:'new',reasoningEffort:'high'}};});
 await page.getByRole('button',{name:'重新发送',exact:true}).click();await page.waitForFunction(()=>calls.some(c=>c[0]==='open'));
 assert.deepEqual(await page.evaluate(()=>calls),[['fork',3],['select',{provider:'p',model:'new',reasoningEffort:'high'}],['prompt',[{type:'text',text:'原始问题'}]],['open','child']]);
 await page.evaluate(()=>stopCombined());assert.equal(await page.locator('.dme-button').count(),0);assert.equal(await page.locator('#copy').count(),1);
 // Confirm original layout still fits desktop, dark mode, and a narrow viewport.
 await page.evaluate(()=>dcsTest.runtime.apply({effect:fn=>{window.stopVisual=fn();},slots:{entriesOfSlot:()=>dcsTest.catalog.map(options=>({options}))}}));
 await page.getByRole('button',{name:'打开设置预览'}).click();await page.waitForSelector('[data-dcs-settings]');
 for(const width of [1100,450]){await page.setViewportSize({width,height:800});for(const dark of [false,true]){
  await page.evaluate(dark=>document.body.toggleAttribute('data-ds-dark-theme',dark),dark);
  assert.ok(await page.locator('[data-dcs-nav]').isVisible());assert.ok(await page.locator('[data-form]').isVisible());
  assert.ok(await page.locator('[data-dcs-features]').isVisible());
 }}
 assert.deepEqual(errors,[]);console.log('PASS: combined bundle default-off, opt-in/out, replacement submission, cleanup, and light/dark responsive settings. Harness services simulated.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
