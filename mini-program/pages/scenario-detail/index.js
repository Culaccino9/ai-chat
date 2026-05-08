const { request } = require('../../utils/request');

const fallbackCategories = [
  { id: 'demo-basic', title: '基础沟通', description: '练习开场、自我介绍、来意说明和后续约定。', prompt: '本轮围绕基础沟通进行判定，重点看身份说明、来意表达、客户关系建立和下一步约定。', sortOrder: 1, scripts: [
    { title: '自我介绍', tips: '表明身份，说明专注中小企业异云迁移，可解决迁移风险、成本、安全等问题。', script: '您好，我是中国电信天翼云的客户经理。天翼云专注为中小企业提供异云迁移解决方案，能帮助企业应对迁移中的风险、成本及安全等挑战。' },
    { title: '表明来意', tips: '说明带来中小企业异云迁移解决方案，提及方案能解决的核心问题。', script: '本次来访是向您介绍天翼云针对中小企业的异云迁移方案，帮助企业解决性能不稳定、成本过高、安全合规不足等问题。' }
  ] },
  { id: 'demo-needs', title: '需求挖掘', description: '围绕客户现状、痛点、预算、迁移周期进行追问。', prompt: '本轮围绕需求挖掘进行判定，重点看是否问出现状、痛点、决策标准和下一步信息。', sortOrder: 2, scripts: [
    { title: '现状确认', tips: '先了解客户当前系统部署、云厂商、数据规模和业务峰值。', script: '想先了解一下，贵司目前核心业务系统部署在哪类云平台？是否遇到过性能波动、费用增长或运维响应不及时的情况？' },
    { title: '痛点追问', tips: '围绕稳定性、成本、安全、迁移周期继续追问。', script: '如果后续考虑迁移，您最担心的是业务中断、数据安全、迁移成本，还是团队运维压力？' }
  ] },
  { id: 'demo-proposal', title: '方案介绍', description: '练习把技术方案讲清楚，并转化成客户可感知的价值。', prompt: '本轮围绕方案介绍进行判定，重点看方案结构、业务价值、证据和落地路径。', sortOrder: 3, scripts: [] },
  { id: 'demo-objection', title: '异议应对', description: '练习处理客户对成本、风险、安全和周期的疑虑。', prompt: '本轮围绕异议应对进行判定，重点看共情、澄清、证据回应和推进动作。', sortOrder: 4, scripts: [] },
  { id: 'demo-case', title: '成功案例分享', description: '练习用相似案例建立信任并推动下一步沟通。', prompt: '本轮围绕成功案例分享进行判定，重点看案例相关性、结果可信度和客户代入感。', sortOrder: 5, scripts: [] }
];

Page({
  data: {
    id: '',
    title: '中小企业异云迁移场景',
    categories: fallbackCategories,
    activeCategory: null,
    input: ''
  },

  onLoad(q) {
    const title = q.title ? decodeURIComponent(q.title) : '中小企业异云迁移场景';
    this.setData({ id: q.id || '', title });
    wx.setNavigationBarTitle({ title });
    if (!q.id || q.id.indexOf('demo-') === 0) return;

    request('/scenarios/' + q.id)
      .then(item => {
        this.setData({
          title: item.title || title,
          categories: item.categories && item.categories.length ? item.categories : fallbackCategories
        });
        wx.setNavigationBarTitle({ title: item.title || title });
      })
      .catch(() => {});
  },

  goBack() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/scenarios/index' });
  },

  selectCategory(e) {
    const category = this.data.categories.find(item => item.id === e.currentTarget.dataset.id);
    this.setData({ activeCategory: category || null });
  },

  newChat() {
    this.setData({ activeCategory: null, input: '' });
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

    const activeCategory = this.data.activeCategory;
    const categoryTitle = activeCategory ? activeCategory.title : '自由练习';
    const categoryId = activeCategory && activeCategory.id.indexOf('demo-') !== 0 ? activeCategory.id : '';

    if (!this.data.id || this.data.id.indexOf('demo-') === 0) {
      wx.navigateTo({
        url: `/pages/practice/index?title=${encodeURIComponent(this.data.title)}&topic=${encodeURIComponent(categoryTitle)}&draft=${encodeURIComponent(text)}`
      });
      return;
    }

    try {
      const data = await request('/practice-sessions', {
        method: 'POST',
        data: { scenarioId: this.data.id, categoryId, mode: 'FREE_DIALOGUE', language: 'zh-CN' }
      });
      wx.navigateTo({
        url: `/pages/practice/index?sessionId=${data.sessionId}&title=${encodeURIComponent(this.data.title)}&topic=${encodeURIComponent(categoryTitle)}&draft=${encodeURIComponent(text)}`
      });
    } catch (e) {
      wx.showToast({ title: '创建练习失败', icon: 'none' });
    }
  }
});
