Page({
  data: {
    trade: {}
  },

  onLoad(options) {
    const tradeId = options.id;
    this.loadTradeDetail(tradeId);
  },

  loadTradeDetail(id) {
    // 模拟从本地存储获取交易详情
    const trades = wx.getStorageSync('trades') || [];
    const trade = trades.find(item => item.id == id);
    
    if (trade) {
      this.setData({ trade });
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
        }
      });
    }
  },

  deleteTrade() {
    const tradeId = this.data.trade.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条交易记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 从本地存储中删除交易记录
          const trades = wx.getStorageSync('trades') || [];
          const filteredTrades = trades.filter(trade => trade.id != tradeId);
          wx.setStorageSync('trades', filteredTrades);
          
          // 返回上一页
          wx.navigateBack();
        }
      }
    });
  }
});