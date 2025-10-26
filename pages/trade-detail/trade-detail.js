Page({
  data: {
    trade: {},
    marketType: ''
  },

  onLoad(options) {
    const tradeId = options.id;
    this.loadTradeDetail(tradeId);
  },

  loadTradeDetail(id) {
    // 从云端获取交易详情
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getTradeById',
        data: {
          id: id
        }
      },
      success: res => {
        if (res.result.success && res.result.data) {
          const trade = res.result.data;
          // Determine market type
          const marketType = this.getMarketType(trade.stockCode);
          this.setData({ 
            trade,
            marketType
          });
        } else {
          console.error('获取交易详情失败', res.result.message);
          // 如果云端获取失败，尝试从本地存储加载
          this.loadTradeDetailFromLocalStorage(id);
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        // 如果云端获取失败，尝试从本地存储加载
        this.loadTradeDetailFromLocalStorage(id);
      }
    });
  },
  
  loadTradeDetailFromLocalStorage(id) {
    // 从本地存储获取交易详情（作为备选方案）
    const trades = wx.getStorageSync('trades') || [];
    const trade = trades.find(item => item.id == id);
    
    if (trade) {
      // Determine market type
      const marketType = this.getMarketType(trade.stockCode);
      this.setData({ 
        trade,
        marketType
      });
    } else {
      // 如果没找到，使用默认数据
      this.setData({
        trade: {
          id: id,
          stockCode: '000001',
          stockName: '平安银行',
          type: 'buy',
          price: 15.2,
          quantity: 1000,
          amount: 15200,
          date: '2023-01-15',
          profit: 0
        },
        marketType: 'A股'
      });
    }
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

  deleteTrade() {
    const tradeId = this.data.trade._id || this.data.trade.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条交易记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 从云端删除交易记录
          wx.cloud.callFunction({
            name: 'tradeOperations',
            data: {
              operation: 'deleteTrade',
              data: {
                tradeId: tradeId
              }
            },
            success: res => {
              if (res.result.success) {
                // 返回上一页
                wx.navigateBack();
              } else {
                console.error('删除交易记录失败', res.result.message);
                wx.showToast({
                  title: '删除失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              console.error('调用云函数失败', err);
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  }
})