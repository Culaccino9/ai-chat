import { parseJson } from '../utils/http';

type Msg = { speaker: string; content: string };

const replyPool = [
  '我理解你的顾虑。你能不能再具体说说最担心的是价格、效果还是落地周期？',
  '这个问题很关键。假如我是客户，我会希望你给我一个更量化的对比依据。',
  '你刚才的表达比较笼统，可以补充一个案例或数据，让说服力更强。',
  '请继续，我会重点考察你的需求挖掘、异议处理和促成动作。',
  '如果客户追问竞品，你可以先承认对方关注点，再回到自身方案价值。'
];

export function buildAiReply(messages: Msg[]) {
  const latest = [...messages].reverse().find(m => m.speaker === 'user')?.content || '';
  const idx = Math.abs([...latest].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % replyPool.length;
  const hint = latest.length < 12 ? '回答略短，建议补充背景、价值和下一步动作。' : null;
  return { reply: replyPool[idx], hint };
}

export function evaluateSession(messages: Msg[], rubricDimensionsJson: string | undefined, passScore = 70) {
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
