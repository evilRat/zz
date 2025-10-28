// 引入计算工具函数
const { add, subtract, multiply, divide, round } = require('../../utils/decimal.js');

Page({
  data: {
    isEdit: false,
    billId: '',
    tType: 'buySell', // buySell: 先买后卖, sellBuy: 先卖后买
    stockCode: '',
    stockName: '',
    buyPrice: '',
    buyQuantity: '',
    sellPrice: '',
    sellQuantity: '',
    date: '',
    completed: false,
    profit: 0,
    profitRate: 0,
    showBuySection: true,
    showSellSection: false
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
    } else {
      // 新增模式，默认显示买入部分
      this.setData({
        showBuySection: true,
        showSellSection: false
      });
    }
  },

  loadBillDetail(id) {
    // 从云端获取T账单详情
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getTBillById',
        data: {
          id: id
        }
      },
      success: res => {
        if (res.result.success && res.result.data) {
          const bill = res.result.data;
          
          // 根据账单状态决定显示哪些部分
          let showBuySection = true;
          let showSellSection = true;
          
          if (!bill.completed) {
            if (bill.tType === 'buySell') {
              // 先买后卖模式，未完成时可能只显示买入部分
              showSellSection = !!bill.sellPrice;
            } else {
              // 先卖后买模式，未完成时可能只显示卖出部分
              showBuySection = !!bill.buyPrice;
            }
          }
          
          this.setData({
            tType: bill.tType || 'buySell',
            stockCode: bill.stockCode || '',
            stockName: bill.stockName || '',
            buyPrice: bill.buyPrice || '',
            buyQuantity: bill.buyQuantity || '',
            sellPrice: bill.sellPrice || '',
            sellQuantity: bill.sellQuantity || '',
            date: bill.date || this.data.date,
            completed: bill.completed || false,
            profit: bill.profit || 0,
            profitRate: bill.profitRate || 0,
            showBuySection,
            showSellSection
          });
        } else {
          console.error('获取T账单详情失败', res.result.message);
          // 如果云端获取失败，尝试从本地存储加载
          this.loadBillDetailFromLocalStorage(id);
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        // 如果云端获取失败，尝试从本地存储加载
        this.loadBillDetailFromLocalStorage(id);
      }
    });
  },
  
  loadBillDetailFromLocalStorage(id) {
    // 从本地存储获取T账单详情（作为备选方案）
    const tbills = wx.getStorageSync('tbills') || [];
    const bill = tbills.find(item => (item._id || item.id) == id);
    
    if (bill) {
      this.setData({
        tType: bill.tType || 'buySell',
        stockCode: bill.stockCode || '',
        stockName: bill.stockName || '',
        buyPrice: bill.buyPrice || '',
        buyQuantity: bill.buyQuantity || '',
        sellPrice: bill.sellPrice || '',
        sellQuantity: bill.sellQuantity || '',
        date: bill.date || this.data.date,
        completed: bill.completed || false,
        profit: bill.profit || 0,
        profitRate: bill.profitRate || 0
      });
    }
  },

  onTTypeChange(e) {
    const tType = e.currentTarget.dataset.type;
    this.setData({ tType });
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

  onBuyPriceInput(e) {
    this.setData({
      buyPrice: e.detail.value
    });
    this.calculateProfit();
  },

  onBuyQuantityInput(e) {
    this.setData({
      buyQuantity: e.detail.value
    });
    this.calculateProfit();
  },

  onSellPriceInput(e) {
    this.setData({
      sellPrice: e.detail.value
    });
    this.calculateProfit();
  },

  onSellQuantityInput(e) {
    this.setData({
      sellQuantity: e.detail.value
    });
    this.calculateProfit();
  },

  onDateChange(e) {
    this.setData({
      date: e.detail.value
    });
  },

  calculateProfit() {
    const { tType, buyPrice, buyQuantity, sellPrice, sellQuantity } = this.data;
    
    // 只有当所有必要的字段都填写了，才计算盈亏
    if (buyPrice && buyQuantity && sellPrice && sellQuantity) {
      const buyP = parseFloat(buyPrice);
      const buyQ = parseInt(buyQuantity);
      const sellP = parseFloat(sellPrice);
      const sellQ = parseInt(sellQuantity);
      
      let profit = 0;
      let profitRate = 0;
      
      // 先买后卖
      if (tType === 'buySell') {
        profit = multiply(subtract(sellP, buyP), Math.min(buyQ, sellQ));
        profitRate = multiply(divide(subtract(sellP, buyP), buyP), 100);
      } 
      // 先卖后买
      else if (tType === 'sellBuy') {
        profit = multiply(subtract(sellP, buyP), Math.min(sellQ, buyQ));
        profitRate = multiply(divide(subtract(sellP, buyP), sellP), 100);
      }
      
      this.setData({
        profit: round(profit).toNumber(),
        profitRate: round(profitRate, 2).toNumber()
      });
    }
  },

  submitBill() {
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

    // 检查是否需要填写买入部分
    if (this.data.showBuySection) {
      if (!this.data.buyPrice || parseFloat(this.data.buyPrice) <= 0) {
        wx.showToast({
          title: '请输入正确的买入价格',
          icon: 'none'
        });
        return;
      }

      if (!this.data.buyQuantity || parseInt(this.data.buyQuantity) <= 0) {
        wx.showToast({
          title: '请输入正确的买入数量',
          icon: 'none'
        });
        return;
      }
    }

    // 检查是否需要填写卖出部分
    if (this.data.showSellSection) {
      if (!this.data.sellPrice || parseFloat(this.data.sellPrice) <= 0) {
        wx.showToast({
          title: '请输入正确的卖出价格',
          icon: 'none'
        });
        return;
      }

      if (!this.data.sellQuantity || parseInt(this.data.sellQuantity) <= 0) {
        wx.showToast({
          title: '请输入正确的卖出数量',
          icon: 'none'
        });
        return;
      }
    }

    // 判断账单是否完成
    const completed = !!(this.data.buyPrice && this.data.buyQuantity && 
                        this.data.sellPrice && this.data.sellQuantity);

    // 创建T账单对象
    const tBillData = {
      tType: this.data.tType,
      stockCode: this.data.stockCode,
      stockName: this.data.stockName,
      buyPrice: this.data.buyPrice ? parseFloat(this.data.buyPrice) : null,
      buyQuantity: this.data.buyQuantity ? parseInt(this.data.buyQuantity) : null,
      sellPrice: this.data.sellPrice ? parseFloat(this.data.sellPrice) : null,
      sellQuantity: this.data.sellQuantity ? parseInt(this.data.sellQuantity) : null,
      date: this.data.date,
      completed: completed
    };
    
    // 如果账单已完成，添加盈亏信息
    if (completed) {
      tBillData.profit = this.data.profit;
      tBillData.profitRate = this.data.profitRate;
    }

    // 根据是编辑模式还是新增模式调用不同的云函数
    const operation = this.data.isEdit ? 'updateTBill' : 'addTBill';
    const data = this.data.isEdit 
      ? { ...tBillData, billId: this.data.billId }
      : { ...tBillData, id: Date.now() }; // 使用时间戳作为唯一ID

    // 调用云函数保存T账单
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: operation,
        data: data
      },
      success: res => {
        if (res.result.success) {
          wx.showToast({
            title: this.data.isEdit ? '更新成功' : '添加成功',
            icon: 'success'
          });
          
          // 返回T账单列表页
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          console.error('保存T账单失败', res.result.message);
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
          
          // 如果云端保存失败，尝试保存到本地存储
          this.saveToLocalStorage(data);
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
        
        // 如果云端保存失败，尝试保存到本地存储
        this.saveToLocalStorage(data);
      }
    });
  },

  saveToLocalStorage(data) {
    let tbills = wx.getStorageSync('tbills') || [];
    
    if (this.data.isEdit) {
      // 编辑现有记录
      const index = tbills.findIndex(item => (item._id || item.id) == this.data.billId);
      if (index !== -1) {
        tbills[index] = { ...tbills[index], ...data };
      }
    } else {
      // 添加新记录
      tbills.push(data);
    }
    
    wx.setStorageSync('tbills', tbills);
    
    // 返回T账单列表页
    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  },

  // 添加下一步按钮，用于未完成的T账单
  onNextStep() {
    if (this.data.tType === 'buySell' && !this.data.showSellSection) {
      // 先买后卖模式，已填写买入，现在显示卖出部分
      this.setData({ showSellSection: true });
    } else if (this.data.tType === 'sellBuy' && !this.data.showBuySection) {
      // 先卖后买模式，已填写卖出，现在显示买入部分
      this.setData({ showBuySection: true });
    }
  }
});