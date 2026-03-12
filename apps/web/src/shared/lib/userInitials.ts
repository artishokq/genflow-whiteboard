/** First grapheme of first name + first grapheme of last name (e.g. Google-style initials). */
export function userInitialsFromNames(
  firstName: string,
  lastName: string,
  email: string,
): string {
  const f = firstGrapheme(firstName);
  const l = firstGrapheme(lastName);
  if (f && l) {
    return `${f}${l}`.toLocaleUpperCase();
  }
  if (f) {
    return f.toLocaleUpperCase();
  }
  const e = firstGrapheme(email);
  return (e || "?").toLocaleUpperCase();
}

function firstGrapheme(s: string): string {
  const t = s.trim();
  if (!t) {
    return "";
  }
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const first = [...segmenter.segment(t)][0];
    return first?.segment ?? "";
  }
  return [...t][0] ?? "";
}
