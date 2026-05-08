const { request } = require('../../utils/request');
Page({ data:{items:[]}, onShow(){request('/scenarios').then(items=>this.setData({items}))}, open(e){wx.navigateTo({url:'/pages/scenario-detail/index?id='+e.currentTarget.dataset.id})} });
