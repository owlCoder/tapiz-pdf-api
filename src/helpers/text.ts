// ──────────────────────────────────────────────────────────────────
//  Text Helpers
// ──────────────────────────────────────────────────────────────────

const CYRILLIC_MAP: Record<string, string> = {
  А:"A",а:"a",Б:"B",б:"b",В:"V",в:"v",Г:"G",г:"g",
  Д:"D",д:"d",Ђ:"Dj",ђ:"dj",Е:"E",е:"e",Ж:"Z",ж:"z",
  З:"Z",з:"z",И:"I",и:"i",Ј:"J",ј:"j",К:"K",к:"k",
  Л:"L",л:"l",Љ:"Lj",љ:"lj",М:"M",м:"m",Н:"N",н:"n",
  Њ:"Nj",њ:"nj",О:"O",о:"o",П:"P",п:"p",Р:"R",р:"r",
  С:"S",с:"s",Т:"T",т:"t",Ћ:"C",ћ:"c",У:"U",у:"u",
  Ф:"F",ф:"f",Х:"H",х:"h",Ц:"C",ц:"c",Ч:"C",ч:"c",
  Џ:"Dz",џ:"dz",Ш:"S",ш:"s",
};

export function cyrillicToLatin(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/č/g, "c").replace(/Č/g, "C")
    .replace(/ć/g, "c").replace(/Ć/g, "C")
    .replace(/š/g, "s").replace(/Š/g, "S")
    .replace(/đ/g, "dj").replace(/Đ/g, "Dj")
    .replace(/ž/g, "z").replace(/Ž/g, "Z")
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join("");
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}.${d.getFullYear()}.`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}
