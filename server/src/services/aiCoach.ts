import { parseJson } from '../utils/http';
import { callMiniMaxJson } from './minimaxClient';

type Msg = { speaker: string; content: string };

type DialogueContext = {
  scenarioTitle?: string;
  categoryTitle?: string;
  categoryPrompt?: string;
  personaName?: string;
  personaDescription?: string;
  rubricDimensionsJson?: string;
};

export type AiReplyResult = {
  reply: string;
  hint: string | null;
  quality: {
    level: 'excellent' | 'good' | 'normal' | 'weak';
    score: number;
    problems: string[];
    suggestions: string[];
  };
};

export type SessionEvaluationResult = {
  overallScore: number;
  pass: boolean;
  dimensionScores: Array<{ code: string; name: string; score: number; comment: string }>;
  sentenceReviews: Array<{ seq: number; original: string; problem: string; suggestion: string }>;
  bestScripts: string[];
  recommendations: Array<{ id: string; title: string; type: string }>;
  summary: string;
};

const replyPool = [
  '我理解你的顾虑。你能不能再具体说说最担心的是价格、效果还是落地周期？',
  '这个问题很关键。假如我是客户，我会希望你给我一个更量化的对比依据。',
  '你刚才的表达比较笼统，可以补充一个案例或数据，让说服力更强。',
  '请继续，我会重点考察你的需求挖掘、异议处理和促成动作。',
  '如果客户追问竞品，你可以先承认对方关注点，再回到自身方案价值。'
];

function fallbackBuildAiReply(messages: Msg[]): AiReplyResult {
  const latest = [...messages].reverse().find(m => m.speaker === 'user')?.content || '';
  const idx = Math.abs([...latest].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % replyPool.length;
  const isShort = latest.length < 12;
  return {
    reply: replyPool[idx],
    hint: isShort ? '回答略短，建议补充背景、价值和下一步动作。' : '建议继续补充客户需求确认、量化依据和下一步推进动作。',
    quality: {
      level: isShort ? 'weak' : 'normal',
      score: isShort ? 58 : 72,
      problems: isShort ? ['回答偏短，信息量不足'] : ['量化依据还可以更明确'],
      suggestions: ['建议采用“确认需求 → 给出依据 → 提出下一步”的三段式表达']
    }
  };
}

function fallbackEvaluateSession(messages: Msg[], rubricDimensionsJson: string | undefined, passScore = 70): SessionEvaluationResult {
  const dimensions = parseJson<Array<{ code: string; name: string; weight: number }>>(rubricDimensionsJson, [
    { code: 'fluency', name: '表达流畅度', weight: 25 },
    { code: 'logic', name: '逻辑结构', weight: 25 },
    { code: 'professional', name: '专业度', weight: 25 },
    { code: 'closing', name: '促成动作', weight: 25 }
  ]);
  const userMsgs = messages.filter(m => m.speaker === 'user');
  const totalLen = userMsgs.reduce((s, m) => s + m.content.length, 0);
  const base = Math.min(92, 62 + userMsgs.length * 3 + Math.floor(totalLen / 30));
  const scores = dimensions.map((d, i) => ({
    code: d.code,
    name: d.name,
    score: Math.max(55, Math.min(96, base + (i % 2 === 0 ? 2 : -3))),
    comment: `${d.name}表现${base >= 75 ? '较好' : '一般'}，建议结合客户画像补充更多证据。`
  }));
  const overall = Math.round(scores.reduce((s, d) => s + d.score, 0) / scores.length);
  const sentenceReviews = userMsgs.slice(0, 5).map((m, i) => ({
    seq: i + 1,
    original: m.content,
    problem: m.content.length < 15 ? '表达偏短，信息量不足。' : '可以进一步增强量化依据。',
    suggestion: '建议采用“确认需求 → 给出依据 → 提出下一步”的三段式表达。'
  }));
  return {
    overallScore: overall,
    pass: overall >= passScore,
    dimensionScores: scores,
    sentenceReviews,
    bestScripts: [
      '如果您担心投入产出比，我可以先帮您拆成上线成本、培训成本和业务转化三个指标来看。',
      '我们先不急着定方案，我想确认一下您最希望这次项目解决的前三个问题。'
    ],
    recommendations: [
      { id: 'kb_objection', title: '异议处理 FAQ', type: 'document' },
      { id: 'kb_closing', title: '销售促成话术清单', type: 'document' }
    ],
    summary: overall >= passScore ? '本次练习已通过，异议处理较稳定，建议继续强化结尾促成。' : '本次练习暂未通过，建议先复习标准话术后再次练习。'
  };
}

function toTranscript(messages: Msg[]) {
  return messages
    .map(m => `${m.speaker === 'user' ? '学员' : m.speaker === 'ai' ? 'AI客户' : '系统'}：${m.content}`)
    .join('\n');
}

export async function buildAiReply(messages: Msg[], context: DialogueContext = {}): Promise<AiReplyResult> {
  const latest = [...messages].reverse().find(m => m.speaker === 'user')?.content || '';
  const fallback = fallbackBuildAiReply(messages);
  if (!latest.trim()) return fallback;

  try {
    const result = await callMiniMaxJson<AiReplyResult>([
      {
        role: 'system',
        content: [
          '你是企业销售/客服/培训场景中的 AI 陪练教练，同时扮演客户角色。',
          '你需要对学员最新回答进行质量判断，再生成客户式追问或回应。',
          '必须只返回 JSON，不要 Markdown，不要代码块。',
          'JSON 字段必须包含：reply, hint, quality。',
          'quality.level 只能是 excellent/good/normal/weak；quality.score 为 0-100；problems/suggestions 为字符串数组。',
          'reply 要像真实客户，不要直接把评分讲得太重；hint 是给学员的简短教练提示。'
        ].join('\n')
      },
      {
        role: 'user',
        content: JSON.stringify({
          scenarioTitle: context.scenarioTitle || 'AI 陪练场景',
          categoryTitle: context.categoryTitle || '',
          categoryPrompt: context.categoryPrompt || '',
          personaName: context.personaName || '客户',
          personaDescription: context.personaDescription || '',
          rubricDimensions: parseJson(context.rubricDimensionsJson, []),
          latestAnswer: latest,
          transcript: toTranscript(messages).slice(-6000),
          outputSchema: {
            reply: '客户角色的下一句回应，20-80字',
            hint: '对学员最新回答的简短改进建议，20-80字；如果非常优秀也要给强化建议',
            quality: {
              level: 'excellent|good|normal|weak',
              score: '0-100 number',
              problems: ['回答存在的问题，最多3条'],
              suggestions: ['下一轮可执行建议，最多3条']
            }
          }
        })
      }
    ], { temperature: 0.45, maxTokens: 900 });

    return {
      reply: result.reply || fallback.reply,
      hint: result.hint ?? fallback.hint,
      quality: {
        level: result.quality?.level || fallback.quality.level,
        score: Number(result.quality?.score ?? fallback.quality.score),
        problems: Array.isArray(result.quality?.problems) ? result.quality.problems : fallback.quality.problems,
        suggestions: Array.isArray(result.quality?.suggestions) ? result.quality.suggestions : fallback.quality.suggestions
      }
    };
  } catch (error) {
    console.warn('[MiniMax] buildAiReply fallback:', (error as Error).message);
    return fallback;
  }
}

export async function evaluateSession(
  messages: Msg[],
  rubricDimensionsJson: string | undefined,
  passScore = 70,
  context: DialogueContext = {}
): Promise<SessionEvaluationResult> {
  const fallback = fallbackEvaluateSession(messages, rubricDimensionsJson, passScore);
  const userMsgs = messages.filter(m => m.speaker === 'user');
  if (!userMsgs.length) return fallback;

  const dimensions = parseJson<Array<{ code: string; name: string; weight: number }>>(rubricDimensionsJson, [
    { code: 'fluency', name: '表达流畅度', weight: 25 },
    { code: 'logic', name: '逻辑结构', weight: 25 },
    { code: 'professional', name: '专业度', weight: 25 },
    { code: 'closing', name: '促成动作', weight: 25 }
  ]);

  try {
    const result = await callMiniMaxJson<SessionEvaluationResult>([
      {
        role: 'system',
        content: [
          '你是企业 AI 陪练系统的资深评估专家。',
          '你需要基于完整对练记录，判断学员回答是否优秀，并生成结构化练习报告。',
          '评分必须严格、可解释、可执行，不能只给泛泛建议。',
          '必须只返回 JSON，不要 Markdown，不要代码块。',
          'JSON 字段必须包含：overallScore, pass, dimensionScores, sentenceReviews, bestScripts, recommendations, summary。'
        ].join('\n')
      },
      {
        role: 'user',
        content: JSON.stringify({
          scenarioTitle: context.scenarioTitle || 'AI 陪练场景',
          categoryTitle: context.categoryTitle || '',
          categoryPrompt: context.categoryPrompt || '',
          personaName: context.personaName || '客户',
          personaDescription: context.personaDescription || '',
          passScore,
          dimensions,
          transcript: toTranscript(messages).slice(-12000),
          requirements: [
            'overallScore 为 0-100 整数',
            'pass 根据 overallScore >= passScore 判断',
            'dimensionScores 必须覆盖传入 dimensions，每项包含 code/name/score/comment',
            'sentenceReviews 从学员原话中挑选最多5句逐句点评，每项包含 seq/original/problem/suggestion',
            'bestScripts 给出2-4条更优秀的可复制话术',
            'recommendations 给出2-4条学习建议，格式为 {id,title,type}',
            'summary 要直接说明本次是否优秀、主要优点、最大短板和下一步训练重点'
          ]
        })
      }
    ], { temperature: 0.25, maxTokens: 1800 });

    const normalizedScores = Array.isArray(result.dimensionScores) && result.dimensionScores.length
      ? result.dimensionScores
      : fallback.dimensionScores;
    const overall = Number.isFinite(Number(result.overallScore))
      ? Math.max(0, Math.min(100, Math.round(Number(result.overallScore))))
      : fallback.overallScore;

    return {
      overallScore: overall,
      pass: typeof result.pass === 'boolean' ? result.pass : overall >= passScore,
      dimensionScores: normalizedScores.map((item, index) => ({
        code: item.code || dimensions[index]?.code || `dimension_${index + 1}`,
        name: item.name || dimensions[index]?.name || `维度${index + 1}`,
        score: Math.max(0, Math.min(100, Math.round(Number(item.score ?? overall)))),
        comment: item.comment || '该维度需要继续强化。'
      })),
      sentenceReviews: Array.isArray(result.sentenceReviews) ? result.sentenceReviews : fallback.sentenceReviews,
      bestScripts: Array.isArray(result.bestScripts) && result.bestScripts.length ? result.bestScripts : fallback.bestScripts,
      recommendations: Array.isArray(result.recommendations) && result.recommendations.length ? result.recommendations : fallback.recommendations,
      summary: result.summary || fallback.summary
    };
  } catch (error) {
    console.warn('[MiniMax] evaluateSession fallback:', (error as Error).message);
    return fallback;
  }
}
