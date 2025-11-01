Page({
  data: {
    tbills: []
  },

  onLoad() {
    this.loadTBills();
  },

  onShow() {
    this.loadTBills();
  },

  // 下拉刷新事件处理函数
  onPullDownRefresh() {
    // 显示导航栏加载动画
    wx.showNavigationBarLoading();
    
    // 重新加载T账单数据
    this.loadTBills(() => {
      // 数据加载完成后停止下拉刷新
      wx.stopPullDownRefresh();
      // 隐藏导航栏加载动画
      wx.hideNavigationBarLoading();
    });
  },

  loadTBills(callback) {
    // 从云端加载T账单数据
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getAllTBills'
      },
      success: res => {
        if (res.result.success) {
          this.setData({
            tbills: res.result.data || []
          });
        } else {
          console.error('获取T账单失败', res.result.message);
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
        }
        
        // 执行回调函数（如果提供）
        if (typeof callback === 'function') {
          callback();
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
        
        // 执行回调函数（如果提供）
        if (typeof callback === 'function') {
          callback();
        }
      }
    });
  },

  goToCreateTBill() {
    wx.navigateTo({
      url: '/pages/add-t-bill/add-t-bill'
    });
  },

  goToTBillDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/add-t-bill/add-t-bill?id=${id}`
    });
  }
});