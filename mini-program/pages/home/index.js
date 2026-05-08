const { request } = require('../../utils/request');

Page({
  data: { user: {}, cards: [] },

  onShow() {
    const app = getApp();
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/index' });
      return;
    }
    this.setData({ user: app.globalData.user || {} });
    request('/knowledge-cards')
      .then(cards => this.setData({ cards }))
      .catch(() => this.setData({ cards: [] }));
  },

  openCard(e) {
    wx.navigateTo({ url: '/pages/home/index?id=' + e.currentTarget.dataset.id });
  },

  goScenarios() {
    wx.switchTab({ url: '/pages/scenarios/index' });
  }
});
