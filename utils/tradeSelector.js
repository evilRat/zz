/**
 * 交易记录选择工具函数
 * 提供便捷的方法来打开交易选择页面
 */

/**
 * 打开交易选择页面
 * @param {Object} options 选择参数
 * @param {string} options.tradeType - 交易类型筛选 ('buy', 'sell', 或空字符串)
 * @param {string} options.stockCode - 股票代码筛选
 * @param {number} options.quantityFilter - 数量筛选（用于B交易选择）
 * @param {Array} options.excludeIds - 排除的交易记录ID列表
 * @param {string} options.selectionMode - 选择模式 ('single' 或 'multiple')
 * @param {string} options.title - 页面标题
 * @param {string} options.confirmText - 确认按钮文本
 * @param {Function} options.onSelected - 选择完成回调函数
 */
function openTradeSelector(options = {}) {
  const {
    tradeType = '',
    stockCode = '',
    quantityFilter = 0,
    excludeIds = [],
    selectionMode = 'single',
    title = '选择交易记录',
    confirmText = '确定',
    onSelected
  } = options;

  // 构建页面参数
  const params = new URLSearchParams();
  
  if (tradeType) params.append('tradeType', tradeType);
  if (stockCode) params.append('stockCode', stockCode);
  if (quantityFilter > 0) params.append('quantityFilter', quantityFilter.toString());
  if (excludeIds.length > 0) params.append('excludeIds', encodeURIComponent(JSON.stringify(excludeIds)));
  if (selectionMode !== 'single') params.append('selectionMode', selectionMode);
  if (title !== '选择交易记录') params.append('title', encodeURIComponent(title));
  if (confirmText !== '确定') params.append('confirmText', encodeURIComponent(confirmText));

  // 构建完整URL
  const url = `/pages/trade-selector/trade-selector?${params.toString()}`;

  // 如果提供了回调函数，将其存储到当前页面
  if (onSelected && typeof onSelected === 'function') {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage) {
      currentPage.onTradeSelected = onSelected;
    }
  }

  // 导航到选择页面
  wx.navigateTo({
    url: url,
    fail: (err) => {
      console.error('打开交易选择页面失败:', err);
      wx.showToast({
        title: '打开页面失败',
        icon: 'none'
      });
    }
  });
}

/**
 * 选择A交易记录（用于T账单创建）
 * @param {Object} options 选择参数
 * @param {string} options.tType - T账单类型 ('buySell' 或 'sellBuy')
 * @param {Function} options.onSelected - 选择完成回调函数
 */
function selectATrade(options = {}) {
  const { tType, onSelected } = options;
  
  // 根据T账单类型确定A交易的类型
  const tradeType = tType === 'buySell' ? 'buy' : 'sell';
  
  openTradeSelector({
    tradeType: tradeType,
    title: `选择${tradeType === 'buy' ? '买入' : '卖出'}交易记录`,
    confirmText: '选择此交易',
    onSelected: onSelected
  });
}

/**
 * 选择B交易记录（用于T账单创建）
 * @param {Object} options 选择参数
 * @param {Object} options.aTrade - A交易记录对象
 * @param {Function} options.onSelected - 选择完成回调函数
 */
function selectBTrade(options = {}) {
  const { aTrade, onSelected } = options;
  
  if (!aTrade) {
    wx.showToast({
      title: '请先选择A交易记录',
      icon: 'none'
    });
    return;
  }
  
  // B交易类型与A交易相反
  const bTradeType = aTrade.type === 'buy' ? 'sell' : 'buy';
  
  openTradeSelector({
    tradeType: bTradeType,
    stockCode: aTrade.stockCode,
    quantityFilter: aTrade.quantity,
    excludeIds: [aTrade._id],
    title: `选择${bTradeType === 'buy' ? '买入' : '卖出'}交易记录`,
    confirmText: '选择此交易',
    onSelected: onSelected
  });
}

/**
 * 选择多个交易记录
 * @param {Object} options 选择参数
 * @param {string} options.tradeType - 交易类型筛选
 * @param {string} options.stockCode - 股票代码筛选
 * @param {Array} options.excludeIds - 排除的交易记录ID列表
 * @param {Function} options.onSelected - 选择完成回调函数
 */
function selectMultipleTrades(options = {}) {
  const { tradeType, stockCode, excludeIds, onSelected } = options;
  
  openTradeSelector({
    tradeType: tradeType,
    stockCode: stockCode,
    excludeIds: excludeIds,
    selectionMode: 'multiple',
    title: '选择交易记录',
    confirmText: '确定选择',
    onSelected: onSelected
  });
}

/**
 * 获取匹配的B交易记录列表（通过云函数）
 * @param {string} aTradeId - A交易记录ID
 * @param {Function} callback - 回调函数
 */
function getMatchingBTrades(aTradeId, callback) {
  if (!aTradeId) {
    callback && callback({ success: false, message: '缺少A交易记录ID' });
    return;
  }

  wx.cloud.callFunction({
    name: 'tradeOperations',
    data: {
      operation: 'getMatchingBTrades',
      aTradeId: aTradeId
    },
    success: res => {
      callback && callback(res.result);
    },
    fail: err => {
      console.error('获取匹配的B交易记录失败:', err);
      callback && callback({ 
        success: false, 
        message: '获取匹配交易记录失败',
        error: err 
      });
    }
  });
}

/**
 * 验证交易记录匹配性
 * @param {Object} aTrade - A交易记录
 * @param {Object} bTrade - B交易记录
 * @returns {Object} 验证结果
 */
function validateTradeMatch(aTrade, bTrade) {
  const result = {
    valid: true,
    errors: []
  };

  if (!aTrade || !bTrade) {
    result.valid = false;
    result.errors.push('交易记录不能为空');
    return result;
  }

  // 检查股票代码是否一致
  if (aTrade.stockCode !== bTrade.stockCode) {
    result.valid = false;
    result.errors.push('股票代码不一致');
  }

  // 检查交易类型是否相反
  if (aTrade.type === bTrade.type) {
    result.valid = false;
    result.errors.push('交易类型必须相反');
  }

  // 检查数量是否相等
  if (aTrade.quantity !== bTrade.quantity) {
    result.valid = false;
    result.errors.push('交易数量不一致');
  }

  // 检查匹配状态
  if (aTrade.matchStatus !== 'unmatched' || bTrade.matchStatus !== 'unmatched') {
    result.valid = false;
    result.errors.push('交易记录已被匹配');
  }

  return result;
}

module.exports = {
  openTradeSelector,
  selectATrade,
  selectBTrade,
  selectMultipleTrades,
  getMatchingBTrades,
  validateTradeMatch
};