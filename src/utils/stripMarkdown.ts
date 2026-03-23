/**
 * AI özetlerdeki markdown / kod bloklarını temizler (UI'da okunaklı göstermek için).
 */
export function stripMarkdownFromSummary(text: string | undefined): string {
  if (!text?.trim()) return text ?? "";
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^\s*markdown\s*$/gim, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\r?\n{3,}/g, "\n\n")
    .trim();
}
