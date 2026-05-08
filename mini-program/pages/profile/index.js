Page({data:{user:{}}, onShow(){this.setData({user:getApp().globalData.user||{}})}, logout(){wx.clearStorageSync(); getApp().globalData.token=''; wx.redirectTo({url:'/pages/login/index'});} });
