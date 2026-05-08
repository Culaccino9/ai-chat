const { request } = require('../../utils/request');

const topics = [
  {
    key: 'basic',
    title: '基础沟通',
    icon: '▤',
    sections: [
      {
        title: '自我介绍',
        tips: '表明身份，说明专注中小企业异云迁移，可解决迁移风险、成本、安全等问题。',
        script: '您好，我是中国电信天翼云的客户经理。天翼云作为国家云，稳居中国公有云 IaaS 市场前列，在混合云、政务云等多个细分领域领先，专注为中小企业提供异云迁移解决方案，能帮助企业应对迁移中的风险、成本及安全等挑战，希望能为贵司提供参考。'
      },
      {
        title: '表明来意',
        tips: '说明带来中小企业异云迁移解决方案，提及方案能解决的核心问题。',
        script: '本次来访是向您介绍天翼云针对中小企业的异云迁移方案。该方案可帮助企业解决现有云平台可能存在的性能不稳定、成本过高、安全合规不足等问题，助力企业更顺畅地实现数字化转型。'
      },
      {
        title: '约定后续',
        tips: '提出后续沟通方式，提供时间选项，方便企业安排。',
        script: '如果您方便，我们可以进一步做一次上门调研或线上方案介绍，根据贵司当前业务系统、数据规模和迁移周期，给出更贴合的迁移路径和预算评估。'
      }
    ]
  },
  {
    key: 'needs',
    title: '需求挖掘',
    icon: '▱',
    sections: [
      { title: '现状确认', tips: '先了解客户当前系统部署、云厂商、数据规模和业务峰值。', script: '想先了解一下，贵司目前核心业务系统部署在哪类云平台？是否遇到过性能波动、费用增长或运维响应不及时的情况？' },
      { title: '痛点追问', tips: '围绕稳定性、成本、安全、迁移周期继续追问。', script: '如果后续考虑迁移，您最担心的是业务中断、数据安全、迁移成本，还是团队运维压力？我可以根据重点帮您拆解风险。' }
    ]
  },
  {
    key: 'proposal',
    title: '方案介绍',
    icon: '▧',
    sections: [
      { title: '方案框架', tips: '用评估、迁移、验证、运维四步说明方案。', script: '我们的方案通常分为四步：先做环境评估，再制定迁移计划，然后进行数据和应用迁移验证，最后进入持续运维优化，尽量降低业务中断风险。' },
      { title: '价值表达', tips: '把技术能力翻译成客户能感知的业务价值。', script: '对企业来说，这套方案的核心价值是迁移过程更可控、成本结构更清晰、安全合规能力更强，同时后续扩容也会更灵活。' }
    ]
  },
  {
    key: 'objection',
    title: '异议应对',
    icon: '▧',
    sections: [
      { title: '担心中断', tips: '强调灰度迁移、回退预案和验证机制。', script: '这个担心非常合理。我们会通过灰度迁移、迁移窗口规划和回退预案来控制风险，关键系统会先做测试验证，再分阶段切换。' },
      { title: '担心成本', tips: '说明会先评估资源使用，再给出优化建议。', script: '我们不会直接建议整体搬迁，而是先评估资源使用和业务峰谷，再判断哪些系统适合迁移、哪些资源可以优化，避免产生不必要成本。' }
    ]
  },
  {
    key: 'case',
    title: '成功案例分享',
    icon: '▧',
    sections: [
      { title: '案例切入', tips: '用相似企业案例增强信任。', script: '之前有一家业务规模相近的企业，也面临多云管理复杂和费用不可控的问题。通过迁移评估和分阶段实施，最终降低了运维压力，并提升了系统稳定性。' }
    ]
  }
];

Page({
  data: {
    id: '',
    item: {},
    title: '中小企业异云迁移场景',
    topics,
    activeTopic: null,
    input: ''
  },

  onLoad(q) {
    const title = q.title ? decodeURIComponent(q.title) : '中小企业异云迁移场景';
    this.setData({ id: q.id || '', title });
    wx.setNavigationBarTitle({ title });
    if (!q.id || q.id.indexOf('demo-') === 0) return;

    request('/scenarios/' + q.id)
      .then(item => {
        this.setData({ item, title: item.title || title });
        wx.setNavigationBarTitle({ title: item.title || title });
      })
      .catch(() => {});
  },

  selectTopic(e) {
    const topic = topics.find(item => item.key === e.currentTarget.dataset.key);
    this.setData({ activeTopic: topic || null });
  },

  newChat() {
    this.setData({ activeTopic: null, input: '' });
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  async start() {
    const text = (this.data.input || '').trim();
    if (!text) {
      wx.showToast({ title: '请输入要练习的话术', icon: 'none' });
      return;
    }

    if (!this.data.id || this.data.id.indexOf('demo-') === 0) {
      const topicTitle = this.data.activeTopic ? this.data.activeTopic.title : '自由练习';
      wx.navigateTo({
        url: `/pages/practice/index?title=${encodeURIComponent(this.data.title)}&topic=${encodeURIComponent(topicTitle)}&draft=${encodeURIComponent(text)}`
      });
      return;
    }

    try {
      const data = await request('/practice-sessions', {
        method: 'POST',
        data: { scenarioId: this.data.id, mode: 'FREE_DIALOGUE', language: 'zh-CN' }
      });
      const topicTitle = this.data.activeTopic ? this.data.activeTopic.title : '自由练习';
      wx.navigateTo({
        url: `/pages/practice/index?sessionId=${data.sessionId}&title=${encodeURIComponent(this.data.title)}&topic=${encodeURIComponent(topicTitle)}&draft=${encodeURIComponent(text)}`
      });
    } catch (e) {
      wx.showToast({ title: '创建练习失败', icon: 'none' });
    }
  }
});
