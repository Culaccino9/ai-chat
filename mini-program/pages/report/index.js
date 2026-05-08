const { request } = require('../../utils/request');
Page({ data:{report:{}}, onLoad(q){request(`/practice-sessions/${q.sessionId}/report`).then(report=>this.setData({report}))} });
