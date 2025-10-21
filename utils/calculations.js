// 计算盈亏的工具函数

/**
 * 计算交易盈亏
 * @param {Array} trades 所有交易记录
 * @param {Object} newTrade 新增的交易记录
 * @returns {Number} 盈亏金额
 */
function calculateProfit(trades, newTrade) {
  // 查找匹配的交易记录
  const matchedTrades = findMatchedTrades(trades, newTrade);
  
  // 计算总盈亏
  let totalProfit = 0;
  matchedTrades.forEach(trade => {
    if (newTrade.type === 'sell') {
      // 新交易是卖出，匹配的交易是买入
      totalProfit += (newTrade.price - trade.price) * Math.min(newTrade.quantity, trade.quantity);
    } else {
      // 新交易是买入，匹配的交易是卖出
      totalProfit += (trade.price - newTrade.price) * Math.min(newTrade.quantity, trade.quantity);
    }
  });
  
  return totalProfit;
}

/**
 * 查找匹配的交易记录
 * @param {Array} trades 所有交易记录
 * @param {Object} newTrade 新增的交易记录
 * @returns {Array} 匹配的交易记录
 */
function findMatchedTrades(trades, newTrade) {
  // 查找相同股票且交易类型相反的记录
  return trades.filter(trade => {
    return trade.stockCode === newTrade.stockCode && 
           trade.type !== newTrade.type &&
           trade.quantity > 0; // 还未完全匹配的记录
  });
}

/**
 * 先进先出匹配算法
 * @param {Array} buyTrades 买入记录
 * @param {Array} sellTrades 卖出记录
 */
function fifoMatching(buyTrades, sellTrades) {
  // 按时间排序
  buyTrades.sort((a, b) => new Date(a.date) - new Date(b.date));
  sellTrades.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const matches = [];
  
  // 简化的FIFO匹配逻辑
  for (let i = 0; i < buyTrades.length; i++) {
    const buyTrade = buyTrades[i];
    if (buyTrade.quantity <= 0) continue;
    
    for (let j = 0; j < sellTrades.length; j++) {
      const sellTrade = sellTrades[j];
      if (sellTrade.quantity <= 0) continue;
      
      if (buyTrade.stockCode === sellTrade.stockCode) {
        const matchedQuantity = Math.min(buyTrade.quantity, sellTrade.quantity);
        
        matches.push({
          buyId: buyTrade.id,
          sellId: sellTrade.id,
          quantity: matchedQuantity,
          buyPrice: buyTrade.price,
          sellPrice: sellTrade.price,
          profit: (sellTrade.price - buyTrade.price) * matchedQuantity
        });
        
        buyTrade.quantity -= matchedQuantity;
        sellTrade.quantity -= matchedQuantity;
        
        if (buyTrade.quantity <= 0) break;
      }
    }
  }
  
  return matches;
}

module.exports = {
  calculateProfit,
  findMatchedTrades,
  fifoMatching
};