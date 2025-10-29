// 引入计算工具函数
const { add, subtract, multiply, divide, round } = require('../../utils/decimal.js');

Page({
  data: {
    isEdit: false,
    billId: '',
    tType: 'buySell', // buySell: 先买后卖, sellBuy: 先卖后买
    date: '',
    
    // 选择的交易记录
    aTrade: null, // A交易记录
    bTrade: null, // B交易记录
    
    // 计算结果
    profit: 0,
    profitRate: 0,
    
    // UI状态
    loading: false,
    showBTradeList: false, // 是否显示B交易选择列表
    bTrades: [] // 可选择的B交易记录列表
  },

  onLoad(options) {
    // 设置默认日期为今天
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.setData({
      date: `${year}-${month}-${day}`
    });
    
    // 如果有id参数，说明是编辑模式
    if (options.id) {
      this.setData({
        isEdit: true,
        billId: options.id
      });
      this.loadBillDetail(options.id);
    }
  },

  loadBillDetail(id) {
    this.setData({ loading: true });
    
    // 调用新的getTBillDetail云函数获取T账单详情
    wx.cloud.callFunction({
      name: 'tbillOperations',
      data: {
        operation: 'getTBillDetail',
        tbillId: id
      },
      success: res => {
        if (res.result.success && res.result.data) {
          const bill = res.result.data;
          
          this.setData({
            tType: bill.tType || 'buySell',
            date: bill.date || this.data.date,
            aTrade: bill.aTrade || null,
            bTrade: bill.bTrade || null,
            profit: bill.profit || 0,
            profitRate: bill.profitRate || 0
          });
        } else {
          console.error('获取T账单详情失败', res.result.message);
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
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  onTTypeChange(e) {
    const tType = e.currentTarget.dataset.type;
    this.setData({ 
      tType,
      aTrade: null,
      bTrade: null,
      showBTradeList: false,
      bTrades: [],
      profit: 0,
      profitRate: 0
    });
  },

  onDateChange(e) {
    this.setData({
      date: e.detail.value
    });
  },

  /**
   * 选择A交易记录
   */
  selectATrade() {
    const { tType } = this.data;
    
    // 根据T账单类型确定A交易的类型
    const aTradeType = tType === 'buySell' ? 'buy' : 'sell';
    
    // 跳转到交易选择页面
    wx.navigateTo({
      url: `/pages/trade-selector/trade-selector?tradeType=${aTradeType}&title=${encodeURIComponent('选择A交易记录')}&selectionMode=single`
    });
  },

  /**
   * 选择B交易记录
   */
  selectBTrade() {
    if (!this.data.aTrade) {
      wx.showToast({
        title: '请先选择A交易记录',
        icon: 'none'
      });
      return;
    }

    const { aTrade, tType } = this.data;
    
    // 根据T账单类型确定B交易的类型
    const bTradeType = tType === 'buySell' ? 'sell' : 'buy';
    
    // 构建排除ID列表（排除A交易记录）
    const excludeIds = [aTrade._id];
    
    // 跳转到交易选择页面，筛选相同股票代码、相同数量、相反类型的交易记录
    const url = `/pages/trade-selector/trade-selector?tradeType=${bTradeType}&stockCode=${aTrade.stockCode}&quantityFilter=${aTrade.quantity}&excludeIds=${encodeURIComponent(JSON.stringify(excludeIds))}&title=${encodeURIComponent('选择B交易记录')}&selectionMode=single`;
    
    wx.navigateTo({
      url: url
    });
  },

  /**
   * 交易选择回调函数
   */
  onTradeSelected(result) {
    const selectedTrade = result.trades[0]; // 单选模式只有一个
    
    if (!this.data.aTrade) {
      // 选择的是A交易记录
      this.setData({
        aTrade: selectedTrade
      });
      
      // 加载匹配的B交易记录列表
      this.loadMatchingBTrades(selectedTrade);
    } else {
      // 选择的是B交易记录
      this.setData({
        bTrade: selectedTrade
      });
      
      // 计算盈利
      this.calculateProfit();
    }
  },

  /**
   * 加载匹配的B交易记录
   */
  loadMatchingBTrades(aTrade) {
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getMatchingBTrades',
        aTradeId: aTrade._id
      },
      success: res => {
        if (res.result.success) {
          const bTrades = res.result.data || [];
          this.setData({
            bTrades,
            showBTradeList: bTrades.length > 0
          });
          
          if (bTrades.length === 0) {
            wx.showToast({
              title: '没有找到匹配的B交易记录',
              icon: 'none'
            });
          }
        } else {
          console.error('获取匹配的B交易记录失败', res.result.message);
          wx.showToast({
            title: '加载B交易记录失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        wx.showToast({
          title: '加载B交易记录失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 计算盈利
   */
  calculateProfit() {
    const { aTrade, bTrade, tType } = this.data;
    
    if (!aTrade || !bTrade) {
      this.setData({
        profit: 0,
        profitRate: 0
      });
      return;
    }
    
    let profit = 0;
    let profitRate = 0;
    
    // 先买后卖
    if (tType === 'buySell') {
      const buyPrice = aTrade.price;
      const sellPrice = bTrade.price;
      const quantity = aTrade.quantity;
      
      profit = multiply(subtract(sellPrice, buyPrice), quantity);
      profitRate = multiply(divide(subtract(sellPrice, buyPrice), buyPrice), 100);
    } 
    // 先卖后买
    else if (tType === 'sellBuy') {
      const sellPrice = aTrade.price;
      const buyPrice = bTrade.price;
      const quantity = aTrade.quantity;
      
      profit = multiply(subtract(sellPrice, buyPrice), quantity);
      profitRate = multiply(divide(subtract(sellPrice, buyPrice), sellPrice), 100);
    }
    
    this.setData({
      profit: round(profit).toNumber(),
      profitRate: round(profitRate, 2).toNumber()
    });
  },

  /**
   * 重新选择A交易记录
   */
  reselectATrade() {
    this.setData({
      aTrade: null,
      bTrade: null,
      showBTradeList: false,
      bTrades: [],
      profit: 0,
      profitRate: 0
    });
    this.selectATrade();
  },

  /**
   * 重新选择B交易记录
   */
  reselectBTrade() {
    this.setData({
      bTrade: null,
      profit: 0,
      profitRate: 0
    });
    this.selectBTrade();
  },

  submitBill() {
    // 表单验证
    if (!this.data.aTrade) {
      wx.showToast({
        title: '请选择A交易记录',
        icon: 'none'
      });
      return;
    }

    if (!this.data.bTrade) {
      wx.showToast({
        title: '请选择B交易记录',
        icon: 'none'
      });
      return;
    }

    if (!this.data.date) {
      wx.showToast({
        title: '请选择交易日期',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    // 根据是编辑模式还是新增模式调用不同的云函数
    const operation = this.data.isEdit ? 'updateTBill' : 'createTBill';
    const data = {
      aTradeId: this.data.aTrade._id,
      bTradeId: this.data.bTrade._id,
      date: this.data.date
    };
    
    if (this.data.isEdit) {
      data.tbillId = this.data.billId;
    }

    // 调用云函数保存T账单
    wx.cloud.callFunction({
      name: 'tbillOperations',
      data: {
        operation: operation,
        ...data
      },
      success: res => {
        if (res.result.success) {
          wx.showToast({
            title: this.data.isEdit ? '更新成功' : '创建成功',
            icon: 'success'
          });
          
          // 返回T账单列表页
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          console.error('保存T账单失败', res.result.message);
          wx.showToast({
            title: res.result.message || '保存失败',
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
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  }
});