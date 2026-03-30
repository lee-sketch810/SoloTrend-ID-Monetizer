import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Retry helper for API calls
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 7): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorStr = JSON.stringify(error);
      const isQuotaError = 
        error?.message?.includes("429") || 
        error?.status === "RESOURCE_EXHAUSTED" ||
        error?.response?.status === 429 ||
        errorStr.includes("429") ||
        errorStr.includes("RESOURCE_EXHAUSTED");
        
      if (isQuotaError && i < maxRetries - 1) {
        // More aggressive backoff for quota errors
        const delay = Math.pow(2.5, i + 1) * 1000 + Math.random() * 2000;
        console.warn(`Quota exceeded. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export interface MonetizationIdea {
  title: string;
  category: "App" | "E-book" | "YouTube" | "Blog" | "Threads" | "Service" | "Physical";
  trendSource: string;
  description: string;
  monetizationStrategy: string;
}

export async function generateMonetizationIdeas(userContext: string, searchTerm?: string, expertise?: string): Promise<MonetizationIdea[]> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        당신은 1인 기업가와 지식 창업가를 위한 '현실 밀착형' 비즈니스 코치입니다.
        특히 지금은 **'대화형 AI'를 넘어 스스로 판단하고 실행하는 'AI 에이전트(AI Agent)'의 시대**임을 명심하세요.
        
        **[핵심 배경 지식: AI 에이전트 시대]**
        - AI 에이전트는 단순 답변을 넘어 목표 달성을 위해 스스로 계획을 세우고 컴퓨터를 조작하는 '실행력'을 갖춘 존재입니다.
        - 이는 생산성의 폭발적 증대와 동시에 기존 소프트웨어 산업의 붕괴(사스포칼립스)를 가져오고 있습니다.
        - 사용자는 이러한 기술적 흐름을 활용하여 **소소하게 시작하여 인바운드(Inbound)로 수익을 창출**하고 싶어 합니다.
        
        ${searchTerm ? `**[특정 검색어/범위]: ${searchTerm}**\n이 검색어와 관련된 트렌드를 집중적으로 분석하세요.` : ""}
        ${expertise ? `**[사용자 전문성]: ${expertise}**\n이 전문성을 핵심 역량으로 활용하여 즉시 실행 가능한 수익화 아이디어를 제안하세요.` : ""}
        
        **[비즈니스 가이드라인]**
        1. **폭넓은 아웃풋 형태**: AI 에이전트나 자동화 도구(App)뿐만 아니라, 다음과 같은 다양한 형태의 수익화 모델을 제안하세요:
           - **Service**: 1:1 코칭, 소규모 워크숍, 오프라인 모임, 컨설팅 등 인간의 사유와 철학이 담긴 서비스
           - **Physical**: 지식 창업과 연계된 굿즈, 워크북, 키트, 문구류 등 실물이 있는 상품
           - **Digital**: AI로 자동 생성된 결과물뿐만 아니라, 인간의 경험이 녹아든 전자책(E-book), 템플릿, 유료 뉴스레터 등
        2. **실행력 중심의 아이디어**: 단순히 정보를 제공하는 서비스보다, 사용자를 대신해 특정 과업을 완수하거나 자동화하는 '에이전트형' 서비스/템플릿을 우선 제안하세요.
        3. **작은 시작 (Small Start)**: 거창한 플랫폼 개발이 아니라, 당장 크몽(Kmong), 숨고, 탈잉, 스토어 등에서 팔 수 있는 '작은 서비스', '템플릿', '가이드북'부터 제안하세요.
        4. **인바운드 전략**: 직접 영업을 뛰지 않아도 블로그, 스레드, 유튜브, 인스타그램 콘텐츠를 보고 고객이 먼저 찾아오게 만드는 모델을 제시하세요.
        5. **인간 중심의 통제권**: AI가 대리인 역할을 하되, 최종 결정권은 인간이 가질 수 있도록 설계된 모델을 제안하세요. (주체성 상실 방지)
        
        사용자 컨텍스트: ${userContext}
        
        **[출력 요구사항]**
        - **title**: 친근하고 직관적인 서비스/상품 명칭
        - **description**: 초보자도 바로 이해할 수 있는 실용적인 설명 (이론 배제)
        - **trendSource**: 현재 1인 지식 창업가들 사이에서 실제로 수요가 있는 영역
        - **monetizationStrategy**: 소액부터 시작하는 구체적인 가격(예: 템플릿 1.5만원, 코칭 5만원 등) 및 판매 채널
        
        **모든 응답은 반드시 한국어로 작성하세요.**
      `,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "비즈니스 아이디어 제목" },
              category: { type: Type.STRING, enum: ["App", "E-book", "YouTube", "Blog", "Threads", "Service", "Physical"] },
              trendSource: { type: Type.STRING, description: "실제 시장 수요 및 트렌드 데이터" },
              description: { type: Type.STRING, description: "실용적이고 소소한 비즈니스 모델 설명" },
              monetizationStrategy: { type: Type.STRING, description: "소액부터 시작하는 구체적인 수익 구조 및 채널" }
            },
            required: ["title", "category", "trendSource", "description", "monetizationStrategy"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Failed to parse AI response", e);
      return [];
    }
  });
}

export async function generateDetailedContent(idea: MonetizationIdea): Promise<string> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        당신은 AI 에이전트 시대를 선도하는 1인 기업가를 위한 비즈니스 코치입니다.
      단순한 '대화형 AI'를 넘어, 스스로 판단하고 실행하는 **'AI 에이전트(AI Agent)'의 관점**에서 다음 아이디어를 구체화하세요.
      
      아이디어 제목: ${idea.title}
      카테고리: ${idea.category}
      상세 설명: ${idea.description}
      수익화 전략: ${idea.monetizationStrategy}
      
      **[AI 에이전트 시대의 핵심 가이드라인]**
      - **실행력(Actionability)**: 사용자가 명령만 내리면 에이전트가 자율적으로 계획을 세우고 과업을 완수하는 구조를 설계하세요.
      - **인간의 주체성**: AI는 '대리인'일 뿐이며, 최종 결정과 책임은 인간이 지는 '인간 중심의 통제권'을 강조하세요.
      - **사스포칼립스 대응**: 기존의 무거운 SaaS를 대체할 수 있는 가볍고 강력한 에이전트형 도구/서비스를 제안하세요.
      
      **[포함 필수 내용]**
      1. **오늘의 1시간 액션**: 지금 당장 AI 에이전트를 설정하거나 첫 콘텐츠를 발행하기 위한 구체적인 첫 단계
      2. **인바운드 유입용 콘텐츠 초안**: 
         - AI 에이전트의 효율성을 강조하여 고객의 관심을 끌 수 있는 후킹 문구와 핵심 내용
      3. **실전 에이전트/도구 구성**:
         - **App/Tool**: 바이브 코딩이나 에이전트 프레임워크를 활용해 자율적으로 작동할 수 있는 도구 기획(프롬프트 포함)
         - **E-book/Template**: AI 에이전트를 활용해 업무를 10배 빠르게 처리하는 노하우/워크플로우
         - **Service/Coaching**: 고객이 AI 에이전트를 자신의 비즈니스에 도입하도록 돕는 컨설팅 포인트
      4. **가격 및 수익 모델**: 에이전트의 '시간 단축' 가치를 반영한 프리미엄 가격 전략
      
      형식은 Markdown을 사용하여 매우 친절하고 바로 따라 할 수 있게 작성하세요.
    `,
    });

    return response.text || "상세 내용을 생성할 수 없습니다.";
  });
}

export function generateNextStepPrompt(idea: MonetizationIdea, content: string): string {
  const baseInfo = `아이디어: ${idea.title}\n카테고리: ${idea.category}\n내용 요약: ${idea.description}`;
  
  if (idea.category === 'App') {
    return `
[AI Studio용 앱 제작 프롬프트]
당신은 숙련된 풀스택 개발자이자 UX 디자이너입니다. 다음 아이디어를 바탕으로 React, Tailwind CSS, Lucide-React를 사용하는 단일 페이지 웹 애플리케이션을 제작해 주세요.

${baseInfo}

기능 요구사항:
1. 사용자가 입력을 넣으면 결과를 출력하는 직관적인 인터페이스
2. 세련되고 현대적인 디자인 (Tailwind 클래스 활용)
3. 모바일 반응형 레이아웃
4. 복잡한 백엔드 없이 클라이언트 사이드 로직으로 구현

상세 가이드 내용:
${content}

위 내용을 바탕으로 바로 실행 가능한 코드를 작성해 주세요.
    `.trim();
  }

  if (idea.category === 'E-book' || idea.category === 'Blog') {
    return `
[전자책/블로그 집필용 프롬프트]
당신은 베스트셀러 작가이자 지식 창업 전문가입니다. 다음 아이디어를 바탕으로 독자의 문제를 해결해 주는 전문적인 콘텐츠 초안을 작성해 주세요.

${baseInfo}

집필 요구사항:
1. 독자의 공감을 이끌어내는 서론 (Problem-Agitation-Solution 구조)
2. 바로 실행 가능한 단계별 체크리스트 포함
3. 전문 용어보다는 쉬운 비유와 예시 활용
4. 독자가 마지막에 행동(구매/구독)하게 만드는 강력한 결론

상세 가이드 내용:
${content}

위 내용을 바탕으로 목차와 1장 분량의 초안을 작성해 주세요.
    `.trim();
  }

  return `
[제미나이/AI 협업용 심화 프롬프트]
당신은 비즈니스 전략가이자 콘텐츠 크리에이터입니다. 다음 아이디어를 구체적인 실행 계획으로 발전시키고 싶습니다.

${baseInfo}

요청 사항:
1. 이 아이디어의 타겟 고객 페르소나를 3가지 유형으로 정의해 주세요.
2. 각 페르소나별로 가장 소구력이 높은 마케팅 메시지를 작성해 주세요.
3. 이 서비스를 런칭하기 위한 7일간의 로드맵을 작성해 주세요.
4. 발생 가능한 리스크와 그에 대한 대응 방안을 제시해 주세요.

상세 가이드 내용:
${content}

위 내용을 바탕으로 심층적인 비즈니스 전략을 제안해 주세요.
  `.trim();
}

export async function developIdeaWithFeedback(idea: MonetizationIdea, currentContent: string, feedback: string): Promise<string> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        당신은 AI 에이전트 시대를 선도하는 비즈니스 고도화 전문가입니다.
      사용자의 피드백을 반영하여, 기존 아이디어를 **자율적 실행력을 갖춘 '에이전트형 비즈니스'**로 한 단계 더 진화시키세요.
      
      **기본 아이디어**: ${idea.title}
      **현재 상세 내용**: ${currentContent}
      **사용자 피드백/의견**: ${feedback}
      
      **[고도화 방향]**
      - **자율성 강화**: 피드백을 바탕으로 AI가 스스로 판단하고 행동할 수 있는 영역을 더 구체화하세요.
      - **리스크 관리**: AI 에이전트의 오작동이나 외부 정보 조작 가능성을 방지하기 위한 '인간의 검토 단계'를 포함하세요.
      - **주체성 유지**: 기술에 잠식되지 않고 인간의 의지와 철학이 서비스의 본질이 되도록 보완하세요.
      
      사용자의 의견을 적극적으로 반영하여, 더 강력하고 안전한 실행 계획으로 업데이트하세요.
      형식은 Markdown을 사용하여 한국어로 작성하세요.
    `,
    });

    return response.text || "아이디어를 발전시키는 데 실패했습니다.";
  });
}

export interface TrendData {
  keyword: string;
  score: number; // 0-100
  growth: number; // %
}

export interface PlatformDistribution {
  platform: string;
  mentions: number;
}

export interface TrendAnalysis {
  hotKeywords: TrendData[];
  platformDistribution: PlatformDistribution[];
  summary: string;
  lastUpdated: string;
}

// Simple in-memory cache for trend analysis
const trendCache: Record<string, { data: TrendAnalysis, timestamp: number }> = {};
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

export async function fetchTrendAnalysis(searchTerm: string = "1인 지식 창업 수익화 트렌드"): Promise<TrendAnalysis> {
  const cacheKey = searchTerm;
  const now = Date.now();
  
  if (trendCache[cacheKey] && (now - trendCache[cacheKey].timestamp < CACHE_DURATION)) {
    console.log("Returning cached trend analysis for:", searchTerm);
    return trendCache[cacheKey].data;
  }

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        당신은 1인 기업가를 위한 '트렌드 분석가'입니다.
      다음 검색어와 관련된 최신 트렌드를 분석하여 시각화 가능한 데이터로 변환해 주세요.
      
      **[분석 대상]: ${searchTerm}**
      
      **[요구 사항]**
      1. **Hot Keywords**: 현재 가장 많이 언급되거나 검색량이 급증한 키워드 5개 (점수와 성장률 포함)
      2. **Platform Distribution**: 어떤 플랫폼(App, E-book, YouTube, Blog, Threads)에서 이 주제가 가장 활발한지 비율 산출
      3. **Summary**: 현재 트렌드의 핵심 요약 및 1인 기업가에게 주는 시사점
      
      **[출력 형식]**
      반드시 JSON 형식으로 응답하세요.
    `,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hotKeywords: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                keyword: { type: Type.STRING },
                score: { type: Type.NUMBER },
                growth: { type: Type.NUMBER }
              },
              required: ["keyword", "score", "growth"]
            }
          },
          platformDistribution: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                platform: { type: Type.STRING },
                mentions: { type: Type.NUMBER }
              },
              required: ["platform", "mentions"]
            }
          },
          summary: { type: Type.STRING },
          lastUpdated: { type: Type.STRING }
        },
        required: ["hotKeywords", "platformDistribution", "summary", "lastUpdated"]
    }
    }
    });

    try {
      const result = JSON.parse(response.text || "{}");
      if (result.summary) {
        trendCache[cacheKey] = { data: result, timestamp: Date.now() };
      }
      return result;
    } catch (e) {
      console.error("Failed to parse trend analysis", e);
      return {
        hotKeywords: [],
        platformDistribution: [],
        summary: "데이터를 불러오는 데 실패했습니다.",
        lastUpdated: new Date().toISOString()
      };
    }
  });
}
