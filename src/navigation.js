export const GROUPS = ['personal', 'capabilities', 'records'];
export const COPY = {
  zh: { search: '搜索设置分类', personal: '偏好设置', capabilities: '模型与扩展', records: '记录与帮助', empty: '没有匹配的设置分类', hint: '右侧仍显示当前分类', nav: '设置分类' },
  en: { search: 'Search settings categories', personal: 'Preferences', capabilities: 'Models & extensions', records: 'History & help', empty: 'No matching categories', hint: 'The current category remains open', nav: 'Settings categories' },
};
export function groupFor(id, label) {
  const text = `${id} ${label}`.toLowerCase();
  if (/archive|session-log|history|about|help|归档|日志|历史|关于|帮助/.test(text)) return 'records';
  if (/^(account|general|appearance|theme|language|shortcuts|voice|claude-style)$/.test(id) || /通用|常规|账号|账户|外观|主题|语言|快捷键|claude.*style|claude.*风格/i.test(label)) return 'personal';
  return 'capabilities';
}
export function matches(row, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = `${row.id} ${row.label}`.toLocaleLowerCase();
  return terms.every(term => text.includes(term));
}
export function languageFor(labels, lang) {
  // Prefer the settings' actual labels over the operating system locale.
  if (/[\u3400-\u9fff]/u.test(labels.join(' '))) return 'zh';
  return labels.length ? 'en' : /^zh/i.test(lang || '') ? 'zh' : 'en';
}
