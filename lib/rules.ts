export type RiskLevel = "High" | "Medium" | "Low";

export type Finding = {
  level: RiskLevel;
  title: string;
  evidence: string;
  reason: string;
  recommendation: string;
};

type Rule = {
  level: RiskLevel;
  title: string;
  regex: RegExp;
  reason: string;
  recommendation: string;
};

const rules: Rule[] = [
  {
    level: "High",
    title: "절대적 효능·효과 표현",
    regex: /(완치|100\s*%|무조건|반드시\s*효과|확실히\s*개선|즉시\s*치료)/gi,
    reason: "의학적 효능을 단정하는 표현은 허가사항·임상근거와 불일치할 경우 법규 위반 리스크가 큽니다.",
    recommendation: "단정 표현을 삭제하고, 허가사항 또는 근거 문헌 범위 내 표현으로 완화하세요."
  },
  {
    level: "High",
    title: "안전성 보장 표현",
    regex: /(부작용\s*없|안전성\s*완벽|위험\s*없|무해|누구나\s*안전)/gi,
    reason: "안전성을 보장하는 표현은 개별 환자 차이와 이상반응 가능성을 배제하는 표현으로 해석될 수 있습니다.",
    recommendation: "안전성 보장 표현을 삭제하고, 주요 주의사항과 이상반응 정보를 함께 제시하세요."
  },
  {
    level: "High",
    title: "허가 외 사용 가능성",
    regex: /(허가\s*외|오프라벨|off[-\s]?label|승인되지\s*않은|적응증\s*외)/gi,
    reason: "허가 외 사용을 암시하거나 권장하는 표현은 Medical Affairs 최종 검토가 필요한 고위험 항목입니다.",
    recommendation: "허가사항 내 적응증·용법·용량 기준으로 문구를 재작성하세요."
  },
  {
    level: "Medium",
    title: "비교 우위 표현",
    regex: /(최고|최초|유일|가장\s*효과|더\s*우수|경쟁품\s*대비|타사\s*대비|No\.?\s*1|넘버원)/gi,
    reason: "비교·최상급 표현은 객관적 비교 기준, 대상, 기간, 근거가 명확해야 합니다.",
    recommendation: "비교 기준과 출처를 명시하거나, 검증 가능한 중립 표현으로 수정하세요."
  },
  {
    level: "Medium",
    title: "근거 출처 부족 가능성",
    regex: /(임상적으로\s*입증|연구에서\s*확인|전문가가\s*인정|검증된|과학적으로\s*입증)/gi,
    reason: "근거를 언급하면서 구체적 문헌, 데이터, 조건이 없으면 해석상 리스크가 있습니다.",
    recommendation: "Reference 문헌명, 시험 조건, 대상, 결과 지표를 함께 제시하세요."
  },
  {
    level: "Medium",
    title: "환자 치료 결과 과장 가능성",
    regex: /(삶의\s*질\s*극대화|치료\s*성공률\s*향상|재발\s*방지|생존율\s*향상|통증\s*완전\s*해소)/gi,
    reason: "환자 결과 개선 표현은 임상시험 설계와 통계적 유의성에 근거해야 합니다.",
    recommendation: "정량 수치, 대상군, 비교군, p-value 등 근거 확인 후 표현 범위를 제한하세요."
  },
  {
    level: "Low",
    title: "표현 완화 필요",
    regex: /(획기적|놀라운|혁신적|강력한|탁월한|압도적)/gi,
    reason: "감성적·홍보성 수식어는 객관성 저하 및 과장 인상으로 이어질 수 있습니다.",
    recommendation: "제품 특성 또는 데이터 기반 설명으로 바꾸세요."
  }
];

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。！？]|다\.|요\.)\s+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function analyzeMlrRisk(materialText: string, referenceText?: string) {
  const sentences = splitSentences(materialText);
  const findings: Finding[] = [];

  for (const rule of rules) {
    for (const sentence of sentences) {
      if (rule.regex.test(sentence)) {
        findings.push({
          level: rule.level,
          title: rule.title,
          evidence: sentence.slice(0, 280),
          reason: rule.reason,
          recommendation: rule.recommendation
        });
        rule.regex.lastIndex = 0;
        break;
      }
      rule.regex.lastIndex = 0;
    }
  }

  if (referenceText && referenceText.length > 100) {
    const referenceWords = new Set(referenceText.toLowerCase().match(/[a-z가-힣0-9]{3,}/g) ?? []);
    const unsupported = findings.filter((finding) => {
      const words = finding.evidence.toLowerCase().match(/[a-z가-힣0-9]{3,}/g) ?? [];
      return words.filter((word) => referenceWords.has(word)).length < 2;
    });
    unsupported.slice(0, 2).forEach((finding) => {
      findings.push({
        level: "Medium",
        title: "Reference 근거 매칭 약함",
        evidence: finding.evidence,
        reason: "업로드된 Reference 문서와 홍보물 표현 간 직접적인 키워드 매칭이 약합니다.",
        recommendation: "해당 표현을 뒷받침하는 정확한 Reference 페이지 또는 문구를 추가 확인하세요."
      });
    });
  }

  const priority: Record<RiskLevel, number> = { High: 0, Medium: 1, Low: 2 };
  return findings.sort((a, b) => priority[a.level] - priority[b.level]);
}
