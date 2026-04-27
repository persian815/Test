import { NextRequest, NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/extractText";
import { analyzeMlrRisk } from "@/lib/rules";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const material = form.get("material");
    const reference = form.get("reference");

    if (!(material instanceof File)) {
      return NextResponse.json({ message: "홍보물 파일을 업로드하세요." }, { status: 400 });
    }

    const materialText = await extractTextFromFile(material);
    const referenceText = reference instanceof File ? await extractTextFromFile(reference) : "";
    const findings = analyzeMlrRisk(materialText, referenceText);

    const high = findings.filter((item) => item.level === "High").length;
    const medium = findings.filter((item) => item.level === "Medium").length;
    const low = findings.filter((item) => item.level === "Low").length;

    return NextResponse.json({
      summary: {
        total: findings.length,
        high,
        medium,
        low,
        materialFileName: material.name,
        referenceFileName: reference instanceof File ? reference.name : null
      },
      findings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
