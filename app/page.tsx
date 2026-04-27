"use client";

import { useMemo, useState } from "react";

type RiskLevel = "High" | "Medium" | "Low";
type Finding = {
  level: RiskLevel;
  title: string;
  evidence: string;
  reason: string;
  recommendation: string;
};
type AnalyzeResponse = {
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
    materialFileName: string;
    referenceFileName: string | null;
  };
  findings: Finding[];
};

const fileLimit = 200 * 1024 * 1024;

function riskColor(level: RiskLevel) {
  if (level === "High") return "red";
  if (level === "Medium") return "orange";
  return "green";
}

function UploadBox({
  id,
  accept,
  file,
  onChange,
  helper
}: {
  id: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  helper: string;
}) {
  return (
    <div className="upload-row">
      <input
        id={id}
        className="file-input"
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <label className="upload-btn" htmlFor={id}>↥ Upload</label>
      <span className="file-meta">{file ? file.name : helper}</span>
    </div>
  );
}

export default function Home() {
  const [material, setMaterial] = useState<File | null>(null);
  const [reference, setReference] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState("");

  const canAnalyze = useMemo(() => Boolean(material) && !loading, [material, loading]);

  function validateFile(file: File | null) {
    if (!file) return true;
    if (file.size > fileLimit) {
      setError("파일당 최대 200MB까지만 업로드할 수 있습니다.");
      return false;
    }
    setError("");
    return true;
  }

  async function analyze() {
    if (!material) return;
    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData();
    form.append("material", material);
    if (reference) form.append("reference", reference);

    try {
      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "분석 요청 실패");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="container">
        <section className="hero">
          <h1 className="title">📋 MLR<br />Review Tool</h1>
          <p className="desc">
            Medical Affairs 검토 요청 전, 외부 홍보물의 주요 MLR 리스크를 사전 점검합니다.<br />
            본 결과는 Rule-based 예비 검토이며, 최종 검토 및 승인 권한은 Medical Affairs에 있습니다.
          </p>
        </section>

        <hr className="hr" />

        <section>
          <h2 className="section-title">📄 홍보물 업로드</h2>
          <UploadBox
            id="material"
            accept=".pdf,.pptx,.docx,.txt,.md"
            file={material}
            helper="200MB per file · PDF, PPTX, DOCX"
            onChange={(file) => validateFile(file) && setMaterial(file)}
          />

          <h2 className="section-title">📚 Reference 업로드 (선택)</h2>
          <UploadBox
            id="reference"
            accept=".pdf,.docx,.txt,.md"
            file={reference}
            helper="200MB per file · PDF, DOCX"
            onChange={(file) => validateFile(file) && setReference(file)}
          />

          <button className="analyze-btn" disabled={!canAnalyze} onClick={analyze}>
            {loading ? "분석 중..." : "🔍 Analyze Review"}
          </button>
          {error && <div className="error">{error}</div>}
        </section>

        {result && (
          <section className="results">
            <div className="summary">
              <h3>분석 결과 요약</h3>
              <p>
                총 {result.summary.total}건 감지 · High {result.summary.high}건 · Medium {result.summary.medium}건 · Low {result.summary.low}건
              </p>
              <p>홍보물: {result.summary.materialFileName}</p>
              {result.summary.referenceFileName && <p>Reference: {result.summary.referenceFileName}</p>}
            </div>

            {result.findings.length === 0 ? (
              <div className="summary empty">탐지된 주요 Rule-based 리스크가 없습니다. 단, 최종 판단은 Medical Affairs 검토를 통해 확정됩니다.</div>
            ) : result.findings.map((finding, index) => (
              <article className="card" key={`${finding.title}-${index}`}>
                <div className="card-head"><span className={`dot ${riskColor(finding.level)}`} />{finding.level} Risk · {finding.title}</div>
                <p><span className="label">탐지 문구</span>{finding.evidence}</p>
                <p><span className="label">판단 근거</span>{finding.reason}</p>
                <p><span className="label">수정 권고</span>{finding.recommendation}</p>
              </article>
            ))}
          </section>
        )}

        <hr className="hr" />

        <section className="footnote">
          <h2>📎 Footnote</h2>
          <div className="legend">
            <div><b><span className="dot red" />High Risk</b><p>→ 법규 위반 가능성이 높아 수정 권고</p></div>
            <div><b><span className="dot orange" />Medium Risk</b><p>→ 해석상 리스크 또는 근거 보강 필요</p></div>
            <div><b><span className="dot green" />Low Risk</b><p>→ 표현 개선 또는 경미한 수정 권고</p></div>
          </div>
          <p className="notice">
            본 결과는 예비 검토용이며<br />최종 판단은 Medical Affairs 검토를 통해 확정됩니다.
          </p>
        </section>
      </div>
    </main>
  );
}
