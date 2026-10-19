import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const css = read('src/settings.css');
const code = ['src/navigation.js','src/enhance.js'].map(path => read(path).replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n');
writeFileSync(new URL('lib/client.js', root), `// Generated from src/ by scripts/build.mjs.\nwindow.__ModuleLoader__.load({\n id: 'dsh-codex-setting-ui',\n factory: () => {\n${code}\nreturn { name: 'dsh-codex-setting-ui', inject: ['slots'], apply(ctx) {\n ctx.effect(() => {\n  const style = document.createElement('style');\n  style.dataset.plugin = 'dsh-codex-setting-ui';\n  style.textContent = ${JSON.stringify(css)};\n  document.head.append(style);\n  const stop = enhanceSettings(document, () => ctx.slots.entriesOfSlot('settings.section').map(entry => ({\n   id: entry.options.id || '',\n   label: (typeof entry.options.label === 'function' ? entry.options.label() : entry.options.label) || '',\n  })));\n  return () => { stop(); style.remove(); };\n });\n}};\n }\n});\n`);
