const { request } = require('../../utils/request');

const fallbackScenarios = [
  { id: 'demo-cloud-migration', title: '中小企业异云迁移场景', practiceCount: 54, description: '面向中小企业客户，练习异云迁移方案沟通。' },
  { id: 'demo-security', title: '企业系统及办公安全场景', practiceCount: 22, description: '围绕企业办公安全、账号体系和系统防护展开沟通。' },
  { id: 'demo-deepseek', title: '科研助手赋能DeepSeek及科研场景', practiceCount: 18, description: '练习科研助手和大模型能力介绍。' },
  { id: 'demo-education', title: 'AI云电脑教育行业场景', practiceCount: 22, description: '面向教育行业介绍 AI 云电脑价值。' },
  { id: 'demo-driving', title: '天翼云驾考中心场景', practiceCount: 5, description: '练习驾考中心云化解决方案沟通。' },
  { id: 'demo-medical', title: '医疗影像云场景', practiceCount: 1517, description: '面向医疗影像上云的方案介绍和异议处理。' }
];

Page({
  data: { items: fallbackScenarios },

  onShow() {
    request('/scenarios')
      .then(items => {
        const normalized = (items || []).map((item, index) => ({
          ...item,
          practiceCount: item.practiceCount || item.sessionCount || [54, 22, 18, 22, 5, 1517][index % 6]
        }));
        this.setData({ items: normalized.length ? normalized : fallbackScenarios });
      })
      .catch(() => this.setData({ items: fallbackScenarios }));
  },

  open(e) {
    const { id, title } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/scenario-detail/index?id=${id}&title=${encodeURIComponent(title)}`
    });
  }
});
