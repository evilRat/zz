Page({
  data: {
    currentStock: 'all',
    stocks: [
      { id: 1, code: '000001', name: '平安银行' },
      { id: 2, code: '600036', name: '招商银行' },
      { id: 3, code: '510310', name: '沪深300ETF' }
    ],
    trades: [
      { 
        id: 1, 
        stockCode: '000001', 
        stockName: '平安银行', 
        type: 'buy', 
        price: 15.2, 
        quantity: 1000, 
        amount: 15200,
        date: '2023-01-15',
        profit: 0
      },
      { 
        id: 2, 
        stockCode: '600036', 
        stockName: '招商银行', 
        type: 'sell', 
        price: 35.8, 
        quantity: 500, 
        amount: 17900,
        date: '2023-01-16',
        profit: 1200
      }
    ]
  },

  onLoad() {
    // 页面加载时可以从本地存储或服务器获取交易数据
    this.loadTrades();
  },

  onShow() {
    // 页面显示时重新加载数据，确保添加新交易后能及时更新
    this.loadTrades();
  },

  loadTrades() {
    // 模拟从本地存储加载数据
    const trades = wx.getStorageSync('trades') || [];
    if (trades.length > 0) {
      this.setData({ trades });
    }
  },

  selectStock(e) {
    const stockCode = e.currentTarget.dataset.stock;
    this.setData({ currentStock: stockCode });
    
    // 如果选择的是"全部"，显示所有交易，否则只显示选中股票的交易
    if (stockCode === 'all') {
      this.loadTrades();
    } else {
      const allTrades = wx.getStorageSync('trades') || this.data.trades;
      const filteredTrades = allTrades.filter(trade => trade.stockCode === stockCode);
      this.setData({ trades: filteredTrades });
    }
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/trade-detail/trade-detail?id=${id}`
    });
  },

  goToAddTrade() {
    wx.navigateTo({
      url: '/pages/add-trade/add-trade'
    });
  }
});