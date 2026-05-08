const { API_BASE_URL } = require('./config');
function request(path, options = {}) {
  const app = getApp();
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE_URL + path,
      method: options.method || 'GET',
      data: options.data || {},
      header: { 'content-type': 'application/json', Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : '' },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data.code === 'OK') resolve(res.data.data);
        else reject(res.data || res);
      },
      fail: reject
    });
  });
}
module.exports = { request };
