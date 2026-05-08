const { request } = require('../../utils/request');
Page({data:{items:[]}, onShow(){request('/leaderboards').then(items=>this.setData({items}))}});
