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

  loadTBills() {
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
      },
      fail: err => {
        console.error('调用云函数失败', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
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