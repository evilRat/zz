// 引入计算工具函数
const { calculateProfitEnhanced, updateAllTradesMatching } = require('../../utils/calculations.js');

Page({
  data: {
    stockCode: '',
    stockName: '',
    tradeType: 'buy',
    price: '',
    quantity: '',
    date: '',
    amount: 0
  },

  onLoad() {
    // 设置默认日期为今天
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.setData({
      date: `${year}-${month}-${day}`
    });
  },

  onStockCodeInput(e) {
    this.setData({
      stockCode: e.detail.value
    });
  },

  onStockNameInput(e) {
    this.setData({
      stockName: e.detail.value
    });
  },

  // Updated to handle tap events on the new type selector
  onTypeChange(e) {
    const type = e.currentTarget.dataset.value || e.detail.value;
    this.setData({
      tradeType: type
    });
  },

  onPriceInput(e) {
    const price = e.detail.value;
    this.setData({
      price: price
    });
    this.calculateAmount();
  },

  onQuantityInput(e) {
    const quantity = e.detail.value;
    this.setData({
      quantity: quantity
    });
    this.calculateAmount();
  },

  onDateChange(e) {
    this.setData({
      date: e.detail.value
    });
  },

  calculateAmount() {
    const price = parseFloat(this.data.price) || 0;
    const quantity = parseInt(this.data.quantity) || 0;
    const amount = price * quantity;
    this.setData({
      amount: amount.toFixed(2)
    });
  },

  submitTrade(e) {
    // 表单验证
    if (!this.data.stockCode) {
      wx.showToast({
        title: '请输入股票/基金代码',
        icon: 'none'
      });
      return;
    }

    if (!this.data.stockName) {
      wx.showToast({
        title: '请输入股票/基金名称',
        icon: 'none'
      });
      return;
    }

    if (!this.data.price || parseFloat(this.data.price) <= 0) {
      wx.showToast({
        title: '请输入正确的交易价格',
        icon: 'none'
      });
      return;
    }

    if (!this.data.quantity || parseInt(this.data.quantity) <= 0) {
      wx.showToast({
        title: '请输入正确的交易数量',
        icon: 'none'
      });
      return;
    }

    if (!this.data.date) {
      wx.showToast({
        title: '请选择交易时间',
        icon: 'none'
      });
      return;
    }

    // 创建交易记录对象
    const newTrade = {
      id: Date.now(), // 使用时间戳作为唯一ID
      stockCode: this.data.stockCode,
      stockName: this.data.stockName,
      type: this.data.tradeType,
      price: parseFloat(this.data.price),
      quantity: parseInt(this.data.quantity),
      amount: parseFloat(this.data.amount),
      date: this.data.date,
      profit: 0, // 初始盈亏为0，后续计算
      matches: [], // 匹配详情
      remainingQuantity: parseInt(this.data.quantity) // 剩余未匹配数量
    };

    // 从云端获取所有现有交易记录
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getAllTrades'
      },
      success: res => {
        if (res.result.success) {
          let allTrades = res.result.data || [];
          
          // 计算盈亏和匹配详情
          const profitResult = calculateProfitEnhanced(allTrades, newTrade);
          
          // 更新新交易的盈亏和匹配信息
          newTrade.profit = profitResult.totalProfit;
          newTrade.matches = profitResult.matchDetails;
          newTrade.remainingQuantity = profitResult.remainingQuantity;
          
          // 保存新交易到云端
          this.saveTradeToCloud(newTrade);
        } else {
          console.error('获取交易记录失败', res.result.message);
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });

  },
  
  saveTradeToCloud(newTrade) {
    // 保存交易到云端
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'addTrade',
        data: newTrade
      },
      success: res => {
        if (res.result.success) {
          // 提示成功并返回首页
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          
          // 延迟返回首页
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          console.error('保存交易失败', res.result.message);
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });
  }
})