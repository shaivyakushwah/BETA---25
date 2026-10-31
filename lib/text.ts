/** Text utilities shared by the trust and evidence engines. */

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200b-\u200f\u2028-\u202f\ufeff]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(text: string, size = 5): Set<string> {
  const words = normalise(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + size <= words.length; i++) {
    out.add(words.slice(i, i + size).join(" "));
  }
  return out;
}

/** Jaccard similarity over 5-word shingles. 0 = unrelated, 1 = identical. */
export function similarity(a: string, b: string): number {
  const left = shingles(a);
  const right = shingles(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const s of left) if (right.has(s)) shared++;
  return shared / (left.size + right.size - shared);
}

/** Zero-width and bidi control characters, the usual hiding place for injected text. */
export function hiddenCharacters(text: string): string[] {
  const found = new Set<string>();
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      code === 0xfeff ||
      code === 0x2060
    ) {
      found.add(`U+${code.toString(16).toUpperCase().padStart(4, "0")}`);
    }
    if (code > 0xffff) found.add(`U+${code.toString(16).toUpperCase()}`);
  }
  return [...found];
}

const INSTRUCTION_PATTERNS: { pattern: RegExp; quote: string }[] = [
  { pattern: /ignore (all |any )?(previous|prior|above) instructions?/i, quote: "ignore previous instructions" },
  { pattern: /disregard (all |any )?(previous|prior|above)/i, quote: "disregard previous" },
  { pattern: /(score|rate|rank) (this|the) (job|candidate|posting)/i, quote: "rate this job" },
  { pattern: /(system|developer) prompt/i, quote: "system prompt" },
  { pattern: /you are (now )?an? (ai|assistant|model)/i, quote: "you are an AI" },
  { pattern: /do not (tell|show|reveal|mention)/i, quote: "do not tell" },
  { pattern: /mark (this|it) as/i, quote: "mark this as" },
];

/** Lines in a posting that look addressed to a machine rather than a candidate. */
export function instructionShapedLines(text: string): string[] {
  const hits: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (INSTRUCTION_PATTERNS.some((p) => p.pattern.test(line))) hits.push(line.slice(0, 220));
  }
  return hits;
}

const PAYMENT_PATTERNS = [
  /\bregistration fee\b/i,
  /\bpay(ing)? (for|to) (training|start|begin|equipment)\b/i,
  /\b(deposit|upfront payment|setup fee|equipment fee)\b/i,
  /\bwhatsapp\b/i,
  /\bno experience (needed|required|necessary)\b/i,
  /\b(immediate start|start this week)\b/i,
  /\bearn £\d+ per hour from home\b/i,
  /\bsend (us )?your (bank|passport|id)\b/i,
];

export function paymentSignals(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of PAYMENT_PATTERNS) {
    const match = text.match(pattern);
    if (match) hits.push(match[0]);
  }
  return [...new Set(hits)];
}

const FREE_MAIL = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "proton.me", "icloud.com"];

export function isFreeMail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return FREE_MAIL.includes(domain);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
