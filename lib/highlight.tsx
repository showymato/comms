import type { ReactNode } from "react";

export type Lang = "json" | "javascript" | "typescript" | "python" | "curl";

const KEYWORDS = {
  js: /^(?:const|let|var|await|async|import|from|export|if|else|return|new|function|true|false|null|undefined|typeof|of)$/,
  py: /^(?:import|from|def|if|else|return|True|False|None|print|await|async|as)$/,
  sh: /^(?:curl|POST|GET|-X|-H|-d)$/,
};

interface Rule {
  re: RegExp;
  cls: string | ((m: string) => string);
}

function rulesFor(lang: Lang): Rule[] {
  if (lang === "json") {
    return [
      { re: /"(?:[^"\\]|\\.)*"(?=\s*:)/y, cls: "tok-key" },
      { re: /"(?:[^"\\]|\\.)*"/y, cls: "tok-str" },
      { re: /-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/iy, cls: "tok-num" },
      { re: /\b(?:true|false|null)\b/y, cls: "tok-kw" },
      { re: /[{}\[\],:]/y, cls: "tok-pun" },
    ];
  }
  const kw = lang === "python" ? KEYWORDS.py : lang === "curl" ? KEYWORDS.sh : KEYWORDS.js;
  const comment = lang === "python" || lang === "curl" ? /#[^\n]*/y : /\/\/[^\n]*/y;
  return [
    { re: comment, cls: "tok-com" },
    { re: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/y, cls: "tok-str" },
    { re: /\b\d+(?:\.\d+)?\b/y, cls: "tok-num" },
    { re: /-{1,2}[A-Za-z][\w-]*/y, cls: (m) => (kw.test(m) ? "tok-kw" : "tok-pun") },
    { re: /[A-Za-z_$][\w$]*(?=\()/y, cls: "tok-fn" },
    { re: /[A-Za-z_$][\w$]*/y, cls: (m) => (kw.test(m) ? "tok-kw" : "") },
    { re: /[{}()[\],.:;=<>+\-*/!?&|\\]/y, cls: "tok-pun" },
  ];
}

/** Tiny dependency-free highlighter. Sticky regexes, one pass, no HTML injection. */
export function highlight(code: string, lang: Lang): ReactNode[] {
  const rules = rulesFor(lang);
  const out: ReactNode[] = [];
  let i = 0;
  let plain = "";
  const flush = () => {
    if (plain) {
      out.push(plain);
      plain = "";
    }
  };
  while (i < code.length) {
    let hit = false;
    for (const r of rules) {
      r.re.lastIndex = i;
      const m = r.re.exec(code);
      if (m && m[0].length > 0) {
        const cls = typeof r.cls === "function" ? r.cls(m[0]) : r.cls;
        if (cls) {
          flush();
          out.push(
            <span key={out.length} className={cls}>
              {m[0]}
            </span>,
          );
        } else plain += m[0];
        i += m[0].length;
        hit = true;
        break;
      }
    }
    if (!hit) {
      plain += code[i];
      i++;
    }
  }
  flush();
  return out;
}
