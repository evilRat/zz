Page({
  data: {
    tbills: [],
    statusFilter: 'all', // all, incomplete, completed
  },

  onLoad() {
    this.loadTBills();
  },

  onShow() {
    // 页面显示时重新加载数据，确保添加/编辑新T账单后能及时更新
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
          let tbills = res.result.data || [];
          this.setData({ tbills });
        } else {
          console.error('获取T账单记录失败', res.result.message);
          // 如果云端获取失败，尝试从本地存储加载
          this.loadTBillsFromLocalStorage();
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        // 如果云端获取失败，尝试从本地存储加载
        this.loadTBillsFromLocalStorage();
      }
    });
  },
  
  loadTBillsFromLocalStorage() {
    // 从本地存储加载T账单数据（作为备选方案）
    let tbills = wx.getStorageSync('tbills') || [];
    this.setData({ tbills });
  },

  filterByStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ statusFilter: status });
  },

  getFilteredTBills() {
    const { tbills, statusFilter } = this.data;
    
    if (statusFilter === 'all') {
      return tbills;
    } else if (statusFilter === 'incomplete') {
      return tbills.filter(bill => !bill.completed);
    } else if (statusFilter === 'completed') {
      return tbills.filter(bill => bill.completed);
    }
    
    return tbills;
  },

  onBillTap(e) {
    const billId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/add-t-bill/add-t-bill?id=${billId}`
    });
  },

  onAddButtonTap() {
    wx.navigateTo({
      url: '/pages/add-t-bill/add-t-bill'
    });
  },

  // 根据股票代码判断市场类型
  getMarketType(stockCode) {
    // A股: 6位数字代码，以0、3、6开头
    if (/^[036]\d{5}$/.test(stockCode)) {
      return 'A股';
    }
    // 港股: 5位数字代码，以0开头
    if (/^0\d{4}$/.test(stockCode)) {
      return '港股';
    }
    // 美股: 字母代码
    if (/^[A-Z]+$/.test(stockCode)) {
      return '美股';
    }
    // 默认
    return '其他';
  }
});