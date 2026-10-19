import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {featureControls,EDIT_KEY} from '../src/features.js';
function setup(options={}) {
 const dom=new JSDOM('<body><div id="root"></div></body>',{url:'https://local.test'});
 let starts=0,stops=0;const cleanups=[];
 if(options.enabled)dom.window.localStorage.setItem(EDIT_KEY,'true');
 const scope={sessions:{list:{getSnapshot(){},subscribe(){}},binding(){},fork(){},using(){}},uiConversation:{binding(){}},uiWorkspace:{openSession(){}},effect:fn=>cleanups.push(fn())};
 const ctx=options.unavailable?{}:{inject:(_,fn)=>fn(scope)};
 const features=featureControls(ctx,dom.window.document,()=>{starts++;return ()=>{stops++;};});
 const detach=features.attach(dom.window.document.querySelector('#root'));
 return {dom,features,detach,input:dom.window.document.querySelector('input'),counts:()=>({starts,stops}),cleanup(){features.dispose();detach();for(const off of cleanups)off?.();dom.window.close();}};
}
test('editing is off by default; toggle persists, starts and stops only editing',()=>{
 const f=setup();assert.equal(f.input.checked,false);assert.deepEqual(f.counts(),{starts:0,stops:0});
 f.input.click();assert.deepEqual(f.counts(),{starts:1,stops:0});assert.equal(f.dom.window.localStorage.getItem(EDIT_KEY),'true');
 f.input.click();assert.deepEqual(f.counts(),{starts:1,stops:1});f.cleanup();
});
test('missing optional services disable toggle without failing settings',()=>{
 const f=setup({unavailable:true});assert.equal(f.input.disabled,true);assert.equal(f.counts().starts,0);f.cleanup();
});
test('restores opt-in and disposes editing on plugin disable',()=>{
 const f=setup({enabled:true});assert.equal(f.input.checked,true);assert.equal(f.counts().starts,1);f.features.dispose();assert.equal(f.counts().stops,1);f.cleanup();
});
