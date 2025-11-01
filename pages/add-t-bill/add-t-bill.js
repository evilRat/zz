Page({
  data: {
    id: null,
    type: '', // 'buy-sell' or 'sell-buy'
    stockCode: '',
    stockName: '',
    quantity: '',
    firstTrade: null,
    secondTrade: null,
    firstTradeSelected: false,
    secondTradeSelected: false,
    status: 'in-progress', // 'in-progress' or 'completed'
    profit: 0,
    allTrades: [],
    filteredTrades: [],
    selectingStep: 0, // 0: select type, 1: select first trade, 2: select second trade
    tradeSelectorVisible: false
  },

  onLoad(options) {
    if (options.id) {
      // 编辑现有T账单
      this.loadTBill(options.id);
    } else {
      // 创建新的T账单
      this.setData({
        selectingStep: 0
      });
    }
    
    // 加载所有交易记录用于选择
    this.loadAllTrades();
  },

  loadTBill(id) {
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getTBillById',
        data: { billId: id }
      },
      success: res => {
        if (res.result.success && res.result.data) {
          const tbill = res.result.data;
          this.setData({
            id: tbill.id,
            type: tbill.type,
            stockCode: tbill.stockCode,
            stockName: tbill.stockName,
            quantity: tbill.quantity,
            firstTrade: tbill.firstTrade,
            secondTrade: tbill.secondTrade,
            firstTradeSelected: !!tbill.firstTrade,
            secondTradeSelected: !!tbill.secondTrade,
            status: tbill.status,
            profit: tbill.profit || 0,
            selectingStep: tbill.firstTrade && tbill.secondTrade ? 3 : (tbill.firstTrade ? 2 : 1)
          });
        }
      },
      fail: err => {
        console.error('加载T账单失败', err);
      }
    });
  },

  loadAllTrades() {
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getAllTrades'
      },
      success: res => {
        if (res.result.success) {
          this.setData({
            allTrades: res.result.data || []
          });
        }
      },
      fail: err => {
        console.error('加载交易记录失败', err);
      }
    });
  },

  onSelectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      type: type,
      selectingStep: 1
    });
  },

  showTradeSelector(e) {
    const step = e.currentTarget.dataset.step;
    let filteredTrades = [];
    
    if (step === 1) {
      // 第一步交易选择：根据T账单类型过滤
      if (this.data.type === 'buy-sell') {
        filteredTrades = this.data.allTrades.filter(trade => trade.type === 'buy');
      } else {
        filteredTrades = this.data.allTrades.filter(trade => trade.type === 'sell');
      }
    } else if (step === 2) {
      // 第二步交易选择：根据T账单类型和第一步交易过滤
      if (this.data.type === 'buy-sell') {
        filteredTrades = this.data.allTrades.filter(trade => 
          trade.type === 'sell' && 
          trade.stockCode === this.data.firstTrade.stockCode &&
          trade.quantity === this.data.firstTrade.quantity
        );
      } else {
        filteredTrades = this.data.allTrades.filter(trade => 
          trade.type === 'buy' && 
          trade.stockCode === this.data.firstTrade.stockCode &&
          trade.quantity === this.data.firstTrade.quantity
        );
      }
    }
    
    this.setData({
      filteredTrades: filteredTrades,
      tradeSelectorVisible: true,
      selectingStep: step
    });
  },

  hideTradeSelector() {
    this.setData({
      tradeSelectorVisible: false
    });
  },

  selectTrade(e) {
    const trade = e.currentTarget.dataset.trade;
    
    if (this.data.selectingStep === 1) {
      this.setData({
        firstTrade: trade,
        firstTradeSelected: true,
        stockCode: trade.stockCode,
        stockName: trade.stockName,
        quantity: trade.quantity,
        tradeSelectorVisible: false,
        selectingStep: 2
      });
    } else if (this.data.selectingStep === 2) {
      this.setData({
        secondTrade: trade,
        secondTradeSelected: true,
        tradeSelectorVisible: false,
        selectingStep: 3
      });
      
      // 计算收益
      this.calculateProfit();
    }
  },

  calculateProfit() {
    if (this.data.firstTrade && this.data.secondTrade) {
      let profit = 0;
      
      if (this.data.type === 'buy-sell') {
        // 先买后卖：卖出价格 - 买入价格
        profit = (this.data.secondTrade.price - this.data.firstTrade.price) * this.data.quantity;
      } else {
        // 先卖后买：卖出价格 - 买入价格
        profit = (this.data.firstTrade.price - this.data.secondTrade.price) * this.data.quantity;
      }
      
      this.setData({
        profit: parseFloat(profit.toFixed(2))
      });
    }
  },

  saveTBill() {
    // 验证必填字段
    if (!this.data.type) {
      wx.showToast({
        title: '请选择T账单类型',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.firstTradeSelected) {
      wx.showToast({
        title: '请选择第一步交易',
        icon: 'none'
      });
      return;
    }
    
    // 确定状态
    const status = this.data.secondTradeSelected ? 'completed' : 'in-progress';
    
    const tbillData = {
      type: this.data.type,
      stockCode: this.data.stockCode,
      stockName: this.data.stockName,
      quantity: this.data.quantity,
      firstTrade: this.data.firstTrade,
      secondTrade: this.data.secondTrade,
      status: status,
      profit: this.data.profit
    };
    
    const operation = this.data.id ? 'updateTBill' : 'addTBill';
    const data = this.data.id ? { ...tbillData, billId: this.data.id } : tbillData;
    
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: operation,
        data: data
      },
      success: res => {
        if (res.result.success) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          
          // 返回T账单列表
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('保存T账单失败', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });
  },

  deleteTBill() {
    if (!this.data.id) return;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个T账单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'tradeOperations',
            data: {
              operation: 'deleteTBill',
              data: { billId: this.data.id }
            },
            success: res => {
              if (res.result.success) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                
                // 返回T账单列表
                setTimeout(() => {
                  wx.navigateBack();
                }, 1500);
              } else {
                wx.showToast({
                  title: '删除失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              console.error('删除T账单失败', err);
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
});