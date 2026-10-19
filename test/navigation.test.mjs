import test from 'node:test';
import assert from 'node:assert/strict';
import { groupFor, matches, languageFor } from '../src/navigation.js';
import { readFileSync } from 'node:fs';
test('classifies registered categories, unknown extensions remain available', () => {
 assert.equal(groupFor('general','General'),'personal');
 assert.equal(groupFor('archive','归档会话'),'records');
 assert.equal(groupFor('unknown-plugin','Third party panel'),'capabilities');
 assert.equal(groupFor('x','Claude Code 风格'),'personal');
 assert.equal(groupFor('models','模型'),'capabilities');
});
test('search supports labels, ids, multiple terms, and empty query', () => {
 const row={id:'agent-presets',label:'智能体预设'};
 assert(matches(row,'智能体')); assert(matches(row,'AGENT presets'));
 assert(matches(row,'  ')); assert(!matches(row,'models'));
});
test('uses the actual settings language before OS language', () => {
 assert.equal(languageFor(['通用','模型'],'en'),'zh');
 assert.equal(languageFor(['General','Models'],'zh'),'en');
 assert.equal(languageFor([],'zh-CN'),'zh');
});
test('install manifest adds exactly one plugin and no runtime dependencies', () => {
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
 assert.equal(pkg.name,'dsh-codex-setting-ui');
 assert.equal(pkg.dependencies,undefined); assert.equal(pkg.peerDependencies,undefined);
 assert.deepEqual(pkg.dsh.client.inject,[]);
 const patch=readFileSync(new URL('../cordis.patch.yml',import.meta.url),'utf8');
 assert.equal((patch.match(/- id:/g)||[]).length,1);
 assert(!/dsh-codex-ui|automation|subagent/.test(patch));
});
