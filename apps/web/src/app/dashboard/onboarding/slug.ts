// Slug from Cyrillic name (Russian + Kazakh letters).
export function toSlug(s: string): string {
  const m: Record<string, string> = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh',
    'щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
    'ә':'a','ғ':'g','қ':'k','ң':'n','ө':'o','ұ':'u','ү':'u','і':'i',
  };
  return s.toLowerCase().split('').map(c => m[c] ?? (/[a-z0-9]/.test(c) ? c : '-')).join('')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}
