import JSZip from "jszip";
import mammoth from "mammoth";

function stripXml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractPptx(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const chunks: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("string");
    chunks.push(stripXml(xml));
  }
  return chunks.join("\n");
}

export async function extractTextFromFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (["txt", "md", "csv"].includes(ext)) return buffer.toString("utf-8");

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === "pptx") return extractPptx(buffer);

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  throw new Error(`지원하지 않는 파일 형식입니다: ${ext}`);
}
