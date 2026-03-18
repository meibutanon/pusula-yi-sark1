/**
 * AI özetlerdeki markdown / kod bloklarını temizler (UI'da okunaklı göstermek için).
 */
export function stripMarkdownFromSummary(text: string | undefined): string {
  if (!text?.trim()) return text ?? "";
  return text
    .replace(/```[\w]*\n?/g, "")
    .replace(/\n?```/g, "")
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .trim();
}
