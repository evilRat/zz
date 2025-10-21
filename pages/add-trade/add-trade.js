// 引入计算工具函数
const { calculateProfit, findMatchedTrades } = require('../../utils/calculations.js');

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

  onTypeChange(e) {
    this.setData({
      tradeType: e.detail.value
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
      profit: 0 // 初始盈亏为0，后续计算
    };

    // 保存到本地存储
    const trades = wx.getStorageSync('trades') || [];
    trades.push(newTrade);
    
    // 计算盈亏
    const profit = calculateProfit(trades, newTrade);
    newTrade.profit = profit;
    
    // 更新刚添加的交易记录的盈亏
    trades[trades.length - 1] = newTrade;
    
    wx.setStorageSync('trades', trades);

    // 提示成功并返回首页
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });

    // 延迟返回首页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});