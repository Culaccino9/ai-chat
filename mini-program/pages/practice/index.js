const { WS_BASE_URL } = require('../../utils/config');
const { request } = require('../../utils/request');

Page({
  data: {
    sessionId: '',
    title: '文字话术练习',
    topic: '自由练习',
    input: '',
    messages: [],
    socket: null,
    socketReady: false,
    pendingText: '',
    sending: false,
    finishing: false,
    mockMode: false
  },

  onLoad(q) {
    const title = q.title ? decodeURIComponent(q.title) : '文字话术练习';
    const topic = q.topic ? decodeURIComponent(q.topic) : '自由练习';
    const draft = q.draft ? decodeURIComponent(q.draft) : '';

    this.setData({
      sessionId: q.sessionId || '',
      title,
      topic,
      pendingText: draft,
      mockMode: !q.sessionId,
      messages: [
        { speaker: '陪练助手', className: 'assistant', content: `我们开始「${topic}」练习。请用文字输入你的话术，我会帮你分析表达、结构和下一步优化。` }
      ]
    });
    wx.setNavigationBarTitle({ title: topic });

    if (!q.sessionId) {
      if (draft) this.sendMock(draft);
      return;
    }

    const token = getApp().globalData.token;
    const socket = wx.connectSocket({ url: `${WS_BASE_URL}?sessionId=${q.sessionId}&token=${token}` });
    wx.onSocketOpen(() => {
      this.setData({ socketReady: true });
      if (this.data.pendingText) {
        this.sendText(this.data.pendingText);
        this.setData({ pendingText: '' });
      }
    });
    wx.onSocketMessage((res) => {
      const msg = JSON.parse(res.data);
      const speaker = msg.type === 'ai_text' ? '陪练助手' : msg.type === 'live_hint' ? '提示' : '系统';
      this.setData({
        sending: msg.type === 'thinking',
        messages: [...this.data.messages, { speaker, className: speaker === '陪练助手' ? 'assistant' : 'assistant', content: msg.content, quality: msg.quality || null }]
      });
    });
    wx.onSocketError(() => {
      this.setData({ mockMode: true, sending: false });
      wx.showToast({ title: '连接失败，已切换为本地演示', icon: 'none' });
      if (this.data.pendingText) {
        this.sendMock(this.data.pendingText);
        this.setData({ pendingText: '' });
      }
    });
    this.setData({ socket });
  },

  onUnload() {
    if (this.data.socket) wx.closeSocket();
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  send() {
    const content = (this.data.input || '').trim();
    if (!content || this.data.sending) return;
    this.setData({ input: '' });
    if (this.data.mockMode) this.sendMock(content);
    else this.sendText(content);
  },

  sendText(content) {
    this.setData({
      messages: [...this.data.messages, { speaker: '我', className: 'mine', content }],
      sending: true
    });

    if (!this.data.socketReady) {
      this.setData({ pendingText: content });
      return;
    }

    wx.sendSocketMessage({ data: JSON.stringify({ type: 'user_text', content }) });
  },

  sendMock(content) {
    const feedback = `这段话术已经表达出核心意思。可以再优化三点：先明确客户当前痛点，再补一句方案价值，最后用一个问题引导客户继续沟通。`;
    this.setData({
      messages: [
        ...this.data.messages,
        { speaker: '我', className: 'mine', content },
        { speaker: '陪练助手', className: 'assistant', content: feedback, quality: { score: 82, level: '良好' } }
      ],
      sending: false
    });
  },

  async finish() {
    if (this.data.finishing) return;
    if (this.data.mockMode || !this.data.sessionId) {
      wx.showToast({ title: '演示练习已结束', icon: 'none' });
      return;
    }

    this.setData({ finishing: true });
    wx.showLoading({ title: '生成中' });
    try {
      await request(`/practice-sessions/${this.data.sessionId}/finish`, { method: 'POST', data: {} });
      wx.hideLoading();
      wx.navigateTo({ url: '/pages/report/index?sessionId=' + this.data.sessionId });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '生成失败', icon: 'none' });
    } finally {
      this.setData({ finishing: false });
    }
  }
});
