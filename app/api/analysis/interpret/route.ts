// =====================================================
// ChatGPT 해석 API
// 회귀분석 결과를 ChatGPT로 해석합니다.
// =====================================================

import { NextResponse } from "next/server";

// OpenAI API URL
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// 사용 가능한 모델 목록
const AVAILABLE_MODELS = {
  "gpt-4o-mini": "GPT-4o Mini (빠르고 경제적)",
  "gpt-4o": "GPT-4o (균형잡힌 성능)",
  "gpt-4-turbo": "GPT-4 Turbo (고성능)",
};

/**
 * POST: 회귀분석 결과 해석
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { results, model = "gpt-4o-mini", companyName, language = "ko" } = body;

    // API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 결과 데이터 확인
    if (!results) {
      return NextResponse.json(
        { error: "분석 결과가 없습니다." },
        { status: 400 }
      );
    }

    // 해석 요청 프롬프트 생성
    const prompt = createInterpretationPrompt(results, companyName, language);

    // OpenAI API 호출
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: getSystemPrompt(language),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API 오류:", error);
      
      return NextResponse.json(
        { error: error.error?.message || "AI 해석 중 오류가 발생했습니다." },
        { status: response.status }
      );
    }

    const data = await response.json();
    const interpretation = data.choices[0]?.message?.content || "해석을 생성할 수 없습니다.";

    return NextResponse.json({
      success: true,
      interpretation,
      model: model,
      usage: data.usage,
    });

  } catch (error) {
    console.error("해석 API 오류:", error);
    
    return NextResponse.json(
      { error: "해석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * GET: 사용 가능한 모델 목록
 */
export async function GET() {
  return NextResponse.json({
    models: Object.entries(AVAILABLE_MODELS).map(([id, name]) => ({
      id,
      name,
    })),
  });
}

/**
 * 시스템 프롬프트 생성
 */
function getSystemPrompt(language: string): string {
  if (language === "ko") {
    return `당신은 통계학 전문가입니다. 다중회귀분석 결과를 비전문가도 이해할 수 있도록 쉽고 명확하게 해석해주세요.

해석 시 다음 사항을 포함해주세요:
1. 모델 적합도 (R², 조정된 R²)의 의미
2. 각 독립변수의 영향력 (계수, 유의성)
3. 통계적으로 유의한 변수와 그렇지 않은 변수
4. 실무적 시사점 및 제안
5. 주의사항 (다중공선성, 잔차 등)

전문 용어는 괄호 안에 쉬운 설명을 추가해주세요.`;
  }
  
  return `You are a statistics expert. Interpret the multiple regression results clearly for non-experts.`;
}

/**
 * 해석 요청 프롬프트 생성
 */
function createInterpretationPrompt(results: any, companyName: string, language: string): string {
  const { 
    model_summary, 
    coefficients, 
    dependent_variable, 
    independent_variables,
    n_observations,
    method,
    correlation,
    descriptive_stats,
    residual_stats
  } = results;

  let prompt = "";

  if (language === "ko") {
    prompt = `## ${companyName || "고객사"} 데이터 회귀분석 결과 해석

### 분석 개요
- 분석 방법: ${method === "enter" ? "Enter (전체 변수 투입)" : "Stepwise (단계적 선택)"}
- 표본 수: ${n_observations}개
- 종속변수: ${dependent_variable}
- 독립변수: ${independent_variables.join(", ")}

### 모델 적합도
- R² (결정계수): ${model_summary.r_squared}
- 조정된 R²: ${model_summary.adj_r_squared}
- F-통계량: ${model_summary.f_statistic} (p-value: ${model_summary.f_pvalue})
- Durbin-Watson: ${model_summary.durbin_watson}
- AIC: ${model_summary.aic}
- BIC: ${model_summary.bic}

### 회귀계수
| 변수 | 계수 | 표준오차 | t값 | p-value | VIF |
|------|------|----------|-----|---------|-----|
${coefficients.map((c: any) => 
  `| ${c.variable} | ${c.coefficient} | ${c.std_error} | ${c.t_statistic} | ${c.p_value} | ${c.vif || '-'} |`
).join('\n')}

### 잔차 통계
- 평균: ${residual_stats.mean}
- 표준편차: ${residual_stats.std}
- 최소: ${residual_stats.min}
- 최대: ${residual_stats.max}

위 결과를 바탕으로 다음을 분석해주세요:
1. 모델의 전반적인 설명력과 적합도
2. 각 독립변수가 종속변수에 미치는 영향
3. 유의한 변수와 그 해석
4. 비즈니스 관점에서의 시사점
5. 분석의 한계점과 주의사항`;
  } else {
    prompt = `## Regression Analysis Results for ${companyName || "Client"} Data
    
[Same structure in English...]`;
  }

  return prompt;
}


