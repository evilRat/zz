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
    // 从云端加载T账单数据，使用新的tbillOperations云函数
    wx.cloud.callFunction({
      name: 'tbillOperations',
      data: {
        operation: 'getAllTBills'
      },
      success: res => {
        if (res.result.success) {
          let tbills = res.result.data || [];
          this.setData({ tbills });
        } else {
          console.error('获取T账单记录失败', res.result.message);
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

  filterByStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ statusFilter: status });
  },

  getFilteredTBills() {
    const { tbills, statusFilter } = this.data;
    
    // 新的T账单都是完成状态，所以简化筛选逻辑
    if (statusFilter === 'all') {
      return tbills;
    } else if (statusFilter === 'completed') {
      return tbills;
    } else if (statusFilter === 'incomplete') {
      // 新系统中所有T账单都是完成状态
      return [];
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
  },

  // 格式化日期显示
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  },

  // 格式化金额显示
  formatAmount(amount) {
    if (amount === undefined || amount === null) return '-';
    return parseFloat(amount).toFixed(2);
  }
});