// 交易选择器演示页面
const { selectATrade, selectBTrade, selectMultipleTrades } = require('../../utils/tradeSelector.js');

Page({
  data: {
    selectedATrade: null,
    selectedBTrade: null,
    selectedMultipleTrades: [],
    tType: 'buySell' // 'buySell' 或 'sellBuy'
  },

  onLoad() {
    console.log('交易选择器演示页面加载');
  },

  /**
   * 选择A交易记录
   */
  selectATradeDemo() {
    selectATrade({
      tType: this.data.tType,
      onSelected: (result) => {
        console.log('选择的A交易记录:', result);
        if (result.trades && result.trades.length > 0) {
          this.setData({
            selectedATrade: result.trades[0],
            selectedBTrade: null // 清空B交易选择
          });
          
          wx.showToast({
            title: '已选择A交易',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 选择B交易记录
   */
  selectBTradeDemo() {
    if (!this.data.selectedATrade) {
      wx.showToast({
        title: '请先选择A交易记录',
        icon: 'none'
      });
      return;
    }

    selectBTrade({
      aTrade: this.data.selectedATrade,
      onSelected: (result) => {
        console.log('选择的B交易记录:', result);
        if (result.trades && result.trades.length > 0) {
          this.setData({
            selectedBTrade: result.trades[0]
          });
          
          wx.showToast({
            title: '已选择B交易',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 选择多个交易记录
   */
  selectMultipleTradesDemo() {
    selectMultipleTrades({
      onSelected: (result) => {
        console.log('选择的多个交易记录:', result);
        if (result.trades && result.trades.length > 0) {
          this.setData({
            selectedMultipleTrades: result.trades
          });
          
          wx.showToast({
            title: `已选择${result.trades.length}个交易`,
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 切换T账单类型
   */
  onTTypeChange(e) {
    const tType = e.detail.value;
    this.setData({ 
      tType,
      selectedATrade: null,
      selectedBTrade: null
    });
  },

  /**
   * 清空选择
   */
  clearSelections() {
    this.setData({
      selectedATrade: null,
      selectedBTrade: null,
      selectedMultipleTrades: []
    });
    
    wx.showToast({
      title: '已清空选择',
      icon: 'success'
    });
  },

  /**
   * 格式化金额显示
   */
  formatAmount(amount) {
    return parseFloat(amount).toFixed(2);
  }
});