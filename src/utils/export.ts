import { Annotation } from "@/types";

export function exportAnnotationsToMarkdown(
  documentName: string,
  annotations: Annotation[]
) {
  if (annotations.length === 0) return;

  const title = documentName || "Documento sin título";
  const date = new Date().toLocaleDateString();

  let markdown = `# Notas: ${title}\n\n`;
  markdown += `*Exportado el ${date}*\n\n---\n\n`;

  // Sort annotations by page and then by vertical position if possible
  const sortedAnnotations = [...annotations].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    // Try to sort by Y coordinate if available (path for highlights, position for notes)
    const yA = a.type === "note" ? (a.data.position?.y || 0) : (a.data.path?.[0]?.y || 0);
    const yB = b.type === "note" ? (b.data.position?.y || 0) : (b.data.path?.[0]?.y || 0);
    return yA - yB;
  });

  let currentPage = -1;

  for (const ann of sortedAnnotations) {
    if (ann.page !== currentPage) {
      markdown += `## Página ${ann.page}\n\n`;
      currentPage = ann.page;
    }

    if (ann.type === "text_highlight" && ann.data.text) {
      markdown += `> ==${ann.data.text}==\n\n`;
    } else if (ann.type === "note" && ann.data.text) {
      markdown += `* **Nota:** ${ann.data.text}\n\n`;
    } else if (ann.type === "highlight") {
      markdown += `* *(Subrayado libre)*\n\n`;
    }
  }

  // Create blob and trigger download
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Notas_${title}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
