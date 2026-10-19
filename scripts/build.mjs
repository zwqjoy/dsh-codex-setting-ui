import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const strip = code => code.replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
const css = read('src/settings.css');
const code = ['src/navigation.js','src/enhance.js','src/features.js'].map(path => strip(read(path))).join('\n');
const editing = strip(read('src/message-edit.js'));
writeFileSync(new URL('lib/client.js', root), `// Generated from src/ by scripts/build.mjs.
window.__ModuleLoader__.load({
 id: 'dsh-codex-setting-ui',
 factory: () => {
${code}
const editing = (() => {\n${editing}\nreturn {mount};\n})();
return { name: 'dsh-codex-setting-ui', inject: ['slots'], apply(ctx) {
 ctx.effect(() => {
  const features = featureControls(ctx, document, editing.mount);
  const style = document.createElement('style');
  style.dataset.plugin = 'dsh-codex-setting-ui';
  style.textContent = ${JSON.stringify(css)};
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
`);
