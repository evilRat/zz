// 引入计算工具函数
const { updateAllTradesMatching } = require('../../utils/calculations.js');

Page({
  data: {
    currentStock: 'all',
    stocks: [],
    trades: [],
    isLoading: true // 添加加载状态
  },

  onLoad() {
    // 页面加载时可以从本地存储或服务器获取交易数据
    this.loadTrades();
  },

  onShow() {
    // 页面显示时重新加载数据，确保添加新交易后能及时更新
    this.loadTrades();
  },

  // 下拉刷新事件处理函数
  onPullDownRefresh() {
    // 显示导航栏加载动画
    wx.showNavigationBarLoading();
    
    // 重新加载交易数据
    this.loadTrades(() => {
      // 数据加载完成后停止下拉刷新
      wx.stopPullDownRefresh();
      // 隐藏导航栏加载动画
      wx.hideNavigationBarLoading();
    });
  },

  loadTrades(callback) {
    // 设置加载状态为true
    this.setData({ isLoading: true });
    
    // 从云端加载数据
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getAllTrades'
      },
      success: res => {
        if (res.result.success) {
          let trades = res.result.data || [];
          
          // 重新计算所有交易的匹配状态以确保数据一致性
          if (trades.length > 0) {
            trades = updateAllTradesMatching(trades);
          }
          
          // 为每个交易添加市场类型标识
          const tradesWithMarket = trades.map(trade => {
            return {
              ...trade,
              market: this.getMarketType(trade.stockCode)
            };
          });
          
          this.setData({ 
            trades: tradesWithMarket,
            isLoading: false // 加载完成，设置为false
          });
          
          // 更新股票列表，包含用户添加的所有股票
          this.updateStockList(tradesWithMarket);
        } else {
          console.error('获取交易记录失败', res.result.message);
          // 如果云端获取失败，尝试从本地存储加载
          this.loadTradesFromLocalStorage();
        }
        
        // 执行回调函数（如果提供）
        if (typeof callback === 'function') {
          callback();
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        // 如果云端获取失败，尝试从本地存储加载
        this.loadTradesFromLocalStorage();
        
        // 执行回调函数（如果提供）
        if (typeof callback === 'function') {
          callback();
        }
      }
    });
  },
  
  loadTradesFromLocalStorage() {
    // 从本地存储加载数据（作为备选方案）
    let trades = wx.getStorageSync('trades') || [];
    
    // 重新计算所有交易的匹配状态以确保数据一致性
    if (trades.length > 0) {
      trades = updateAllTradesMatching(trades);
    }
    
    // 为每个交易添加市场类型标识
    const tradesWithMarket = trades.map(trade => {
      return {
        ...trade,
        market: this.getMarketType(trade.stockCode)
      };
    });
    
    this.setData({ 
      trades: tradesWithMarket,
      isLoading: false // 加载完成，设置为false
    });
    
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
    
    // 如果选择的是"全部"，显示所有交易，否则只显示选中股票的交易
    if (stockCode === 'all') {
      this.loadTrades();
    } else {
      // 设置加载状态为true
      this.setData({ isLoading: true });
      
      // 从云端加载数据
      wx.cloud.callFunction({
        name: 'tradeOperations',
        data: {
          operation: 'getAllTrades'
        },
        success: res => {
          if (res.result.success) {
            let allTrades = res.result.data || [];
            
            // 重新计算所有交易的匹配状态以确保数据一致性
            if (allTrades.length > 0) {
              allTrades = updateAllTradesMatching(allTrades);
            }
            
            const tradesWithMarket = allTrades.map(trade => {
              return {
                ...trade,
                market: this.getMarketType(trade.stockCode)
              };
            });
            const filteredTrades = tradesWithMarket.filter(trade => trade.stockCode === stockCode);
            this.setData({ 
              trades: filteredTrades,
              isLoading: false // 加载完成，设置为false
            });
          } else {
            console.error('获取交易记录失败', res.result.message);
            // 如果云端获取失败，尝试从本地存储加载
            this.selectStockFromLocalStorage(stockCode);
          }
        },
        fail: err => {
          console.error('调用云函数失败', err);
          // 如果云端获取失败，尝试从本地存储加载
          this.selectStockFromLocalStorage(stockCode);
        }
      });
    }
  },
  
  selectStockFromLocalStorage(stockCode) {
    // 从本地存储加载数据（作为备选方案）
    let allTrades = wx.getStorageSync('trades') || [];
    
    // 重新计算所有交易的匹配状态以确保数据一致性
    if (allTrades.length > 0) {
      allTrades = updateAllTradesMatching(allTrades);
    }
    
    const tradesWithMarket = allTrades.map(trade => {
      return {
        ...trade,
        market: this.getMarketType(trade.stockCode)
      };
    });
    const filteredTrades = tradesWithMarket.filter(trade => trade.stockCode === stockCode);
    this.setData({ 
      trades: filteredTrades,
      isLoading: false // 加载完成，设置为false
    });
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