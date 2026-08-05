// Russian AI-copywriting rules for the impulse preflight scanner.
//
//   node preflight.mjs <root> --rules=path/to/rules.ru.mjs
//
// Each entry has the same shape as a core rule in preflight.mjs. Patterns may
// be RegExp or plain strings (strings compile case-insensitive). `copy: true`
// means the rule also reads prose (.md/.mdx), not only code.
//
// Rule-module pattern from yetone/kill-ai-slop (MIT), re-expressed.
//
// IMPORTANT: JavaScript's \b word boundary is ASCII-only and NEVER matches
// next to Cyrillic letters (\b sits between \w and non-\w, and Cyrillic is
// non-\w). Write plain substrings or explicit boundaries like (^|[^а-яё])
// instead — a \b-wrapped Cyrillic pattern silently matches nothing.
export default [
  { id: "ru1", group: "copy", name: "AI-слог: не просто X — это Y", fix: "скажите конкретную вещь без противопоставления",
    copy: true,
    patterns: [
      /не просто .{1,40}?[—–-]\s*это/iu,
    ] },
  { id: "ru2", group: "copy", name: "AI-слог: попрощайтесь / представьте себе мир", fix: "назовите, что именно меняется",
    copy: true,
    patterns: [
      /попрощайтесь с|забудьте о том|представьте себе мир/iu,
    ] },
  { id: "ru3", group: "copy", name: "AI-слог: молниеносный / бесшовный / революционный", fix: "конкретное свойство вместо эпитета",
    copy: true,
    patterns: [
      /молниеносн|бесшовн|безупречн|революционн|беспрецедентн/iu,
    ] },
  { id: "ru4", group: "copy", name: "AI-слог: раскройте потенциал", fix: "что конкретно станет возможным",
    copy: true,
    patterns: [
      /раскройте (?:весь )?потенциал/iu,
    ] },
  { id: "ru5", group: "copy", name: "AI-слог: на новый уровень", fix: "измеримый результат вместо уровня",
    copy: true,
    patterns: [
      /выведите .{1,30} на новый уровень/iu,
    ] },
  { id: "ru6", group: "copy", name: "AI-слог: в считанные секунды", fix: "реальное время или ничего",
    copy: true,
    patterns: [
      /в считанные секунды/iu,
    ] },
];
