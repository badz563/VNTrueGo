import type { Destination, Language } from "./types";

export function photoAlt(destination: Destination, lang: Language): string {
  const name = lang === "en" && destination.nameEn ? destination.nameEn : destination.name;
  if (!destination.photoCredit) {
    return lang === "vi" ? `Ảnh của ${name}` : `Image of ${name}`;
  }
  if (destination.photoCredit?.isActualPlace) {
    return lang === "vi" ? `Ảnh chụp ${name}` : `Photograph of ${name}`;
  }
  return lang === "vi"
    ? `Ảnh chụp món ăn; không chụp tại ${name}`
    : `Food photograph illustrating ${name}; not taken at this business`;
}
