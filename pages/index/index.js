// 引入计算工具函数
const { updateAllTradesMatching } = require('../../utils/calculations.js');

Page({
  data: {
    currentStock: 'all',
    currentMatchStatus: 'all', // 新增：当前匹配状态筛选
    stocks: [
      { id: 1, code: '000001', name: '平安银行' },
      { id: 2, code: '600036', name: '招商银行' },
      { id: 3, code: '510310', name: '沪深300ETF' }
    ],
    trades: [],
    matchStatusOptions: [ // 新增：匹配状态选项
      { value: 'all', label: '全部' },
      { value: 'unmatched', label: '未匹配' },
      { value: 'matched', label: '已匹配' }
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
    // 从云端加载数据
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getAllTrades'
      },
      success: res => {
        if (res.result.success) {
          let trades = res.result.data || [];
          
          // 为每个交易添加市场类型标识和默认matchStatus
          const tradesWithMarket = trades.map(trade => {
            return {
              ...trade,
              market: this.getMarketType(trade.stockCode),
              matchStatus: trade.matchStatus || 'unmatched' // 确保有matchStatus字段
            };
          });
          
          // 应用筛选条件
          const filteredTrades = this.applyFilters(tradesWithMarket);
          this.setData({ trades: filteredTrades });
          
          // 更新股票列表，包含用户添加的所有股票
          this.updateStockList(tradesWithMarket);
        } else {
          console.error('获取交易记录失败', res.result.message);
          // 如果云端获取失败，尝试从本地存储加载
          this.loadTradesFromLocalStorage();
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        // 如果云端获取失败，尝试从本地存储加载
        this.loadTradesFromLocalStorage();
      }
    });
  },
  
  loadTradesFromLocalStorage() {
    // 从本地存储加载数据（作为备选方案）
    let trades = wx.getStorageSync('trades') || [];
    
    // 为每个交易添加市场类型标识和默认matchStatus
    const tradesWithMarket = trades.map(trade => {
      return {
        ...trade,
        market: this.getMarketType(trade.stockCode),
        matchStatus: trade.matchStatus || 'unmatched' // 确保有matchStatus字段
      };
    });
    
    // 应用筛选条件
    const filteredTrades = this.applyFilters(tradesWithMarket);
    this.setData({ trades: filteredTrades });
    
    // 更新股票列表，包含用户添加的所有股票
    this.updateStockList(tradesWithMarket);
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

  updateStockList(trades) {
    // 从交易记录中提取唯一的股票信息
    const uniqueStocks = {};
    trades.forEach(trade => {
      if (!uniqueStocks[trade.stockCode]) {
        uniqueStocks[trade.stockCode] = {
          code: trade.stockCode,
          name: trade.stockName
        };
      }
    });
    
    // 转换为数组并更新数据
    const stockList = Object.values(uniqueStocks).map((stock, index) => ({
      id: index + 1,
      code: stock.code,
      name: stock.name
    }));
    
    // 保持"全部"选项在第一位
    this.setData({
      stocks: stockList
    });
  },

  selectStock(e) {
    const stockCode = e.currentTarget.dataset.stock;
    this.setData({ currentStock: stockCode });
    this.refreshTradeList();
  },

  // 新增：选择匹配状态筛选
  selectMatchStatus(e) {
    const matchStatus = e.currentTarget.dataset.status;
    this.setData({ currentMatchStatus: matchStatus });
    this.refreshTradeList();
  },

  // 新增：刷新交易列表（应用所有筛选条件）
  refreshTradeList() {
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getAllTrades'
      },
      success: res => {
        if (res.result.success) {
          let allTrades = res.result.data || [];
          
          const tradesWithMarket = allTrades.map(trade => {
            return {
              ...trade,
              market: this.getMarketType(trade.stockCode),
              matchStatus: trade.matchStatus || 'unmatched'
            };
          });
          
          // 应用筛选条件
          const filteredTrades = this.applyFilters(tradesWithMarket);
          this.setData({ trades: filteredTrades });
        } else {
          console.error('获取交易记录失败', res.result.message);
          this.refreshTradeListFromLocalStorage();
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        this.refreshTradeListFromLocalStorage();
      }
    });
  },

  // 新增：从本地存储刷新交易列表
  refreshTradeListFromLocalStorage() {
    let allTrades = wx.getStorageSync('trades') || [];
    
    const tradesWithMarket = allTrades.map(trade => {
      return {
        ...trade,
        market: this.getMarketType(trade.stockCode),
        matchStatus: trade.matchStatus || 'unmatched'
      };
    });
    
    // 应用筛选条件
    const filteredTrades = this.applyFilters(tradesWithMarket);
    this.setData({ trades: filteredTrades });
  },

  // 新增：应用筛选条件
  applyFilters(trades) {
    let filteredTrades = trades;
    
    // 按股票代码筛选
    if (this.data.currentStock !== 'all') {
      filteredTrades = filteredTrades.filter(trade => trade.stockCode === this.data.currentStock);
    }
    
    // 按匹配状态筛选
    if (this.data.currentMatchStatus !== 'all') {
      filteredTrades = filteredTrades.filter(trade => trade.matchStatus === this.data.currentMatchStatus);
    }
    
    return filteredTrades;
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
})