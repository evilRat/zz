// 计算盈亏的工具函数
const { add, subtract, multiply, round } = require('./decimal.js');

/**
 * 计算交易盈亏 (增强版)
 * @param {Array} allTrades 所有交易记录
 * @param {Object} newTrade 新增的交易记录
 * @returns {Object} 包含总盈亏和匹配详情的对象
 */
function calculateProfitEnhanced(allTrades, newTrade) {
  // 创建交易记录的深拷贝以避免修改原始数据
  const trades = JSON.parse(JSON.stringify(allTrades));
  
  // 查找相同股票的所有未完全匹配的交易
  const sameStockTrades = trades.filter(trade => 
    trade.stockCode === newTrade.stockCode && 
    (trade.remainingQuantity === undefined || trade.remainingQuantity > 0)
  );
  
  // 为所有交易初始化剩余数量
  sameStockTrades.forEach(trade => {
    if (trade.remainingQuantity === undefined) {
      trade.remainingQuantity = trade.quantity;
    }
  });
  
  // 为新交易也初始化剩余数量
  const workingNewTrade = {
    ...newTrade,
    remainingQuantity: newTrade.quantity
  };
  
  let totalProfit = 0;
  const matchDetails = [];
  
  // 按时间顺序排序（先进先出）
  sameStockTrades.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // 根据新交易的类型进行匹配
  if (newTrade.type === 'sell') {
    // 新交易是卖出，查找之前的买入记录进行匹配
    const buyTrades = sameStockTrades.filter(trade => trade.type === 'buy');
    
    for (let i = 0; i < buyTrades.length && workingNewTrade.remainingQuantity > 0; i++) {
      const buyTrade = buyTrades[i];
      
      if (buyTrade.remainingQuantity > 0) {
        const matchedQuantity = Math.min(workingNewTrade.remainingQuantity, buyTrade.remainingQuantity);
        
        // 计算这次匹配的盈亏
        const priceDiff = subtract(workingNewTrade.price, buyTrade.price);
        const profit = multiply(priceDiff, matchedQuantity);
        totalProfit = add(totalProfit, profit);
        
        // 记录匹配详情
        matchDetails.push({
          buyTradeId: buyTrade.id,
          buyPrice: buyTrade.price,
          buyDate: buyTrade.date,
          sellTradeId: workingNewTrade.id,
          sellPrice: workingNewTrade.price,
          sellDate: workingNewTrade.date,
          quantity: matchedQuantity,
          profit: round(profit)
        });
        
        // 更新剩余数量
        buyTrade.remainingQuantity -= matchedQuantity;
        workingNewTrade.remainingQuantity -= matchedQuantity;
      }
    }
  } else {
    // 新交易是买入，查找之前的卖出记录进行匹配
    const sellTrades = sameStockTrades.filter(trade => trade.type === 'sell');
    
    for (let i = 0; i < sellTrades.length && workingNewTrade.remainingQuantity > 0; i++) {
      const sellTrade = sellTrades[i];
      
      if (sellTrade.remainingQuantity > 0) {
        const matchedQuantity = Math.min(workingNewTrade.remainingQuantity, sellTrade.remainingQuantity);
        
        // 计算这次匹配的盈亏
        const priceDiff = subtract(sellTrade.price, workingNewTrade.price);
        const profit = multiply(priceDiff, matchedQuantity);
        totalProfit = add(totalProfit, profit);
        
        // 记录匹配详情
        matchDetails.push({
          buyTradeId: workingNewTrade.id,
          buyPrice: workingNewTrade.price,
          buyDate: workingNewTrade.date,
          sellTradeId: sellTrade.id,
          sellPrice: sellTrade.price,
          sellDate: sellTrade.date,
          quantity: matchedQuantity,
          profit: round(profit)
        });
        
        // 更新剩余数量
        sellTrade.remainingQuantity -= matchedQuantity;
        workingNewTrade.remainingQuantity -= matchedQuantity;
      }
    }
  }
  
  return {
    totalProfit: round(totalProfit),
    matchDetails: matchDetails,
    remainingQuantity: workingNewTrade.remainingQuantity
  };
}

/**
 * 更新所有交易记录的匹配状态
 * @param {Array} trades 所有交易记录
 * @returns {Array} 更新后的交易记录
 */
function updateAllTradesMatching(trades) {
  // 创建交易记录的深拷贝
  const workingTrades = JSON.parse(JSON.stringify(trades));
  
  // 为所有交易初始化剩余数量
  workingTrades.forEach(trade => {
    trade.remainingQuantity = trade.quantity;
    trade.matches = trade.matches || [];
  });
  
  // 按时间顺序排序
  workingTrades.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // 对每只股票分别处理
  const stockCodes = [...new Set(workingTrades.map(trade => trade.stockCode))];
  
  stockCodes.forEach(stockCode => {
    const stockTrades = workingTrades.filter(trade => trade.stockCode === stockCode);
    const buyTrades = stockTrades.filter(trade => trade.type === 'buy');
    const sellTrades = stockTrades.filter(trade => trade.type === 'sell');
    
    // 为买卖交易按时间排序
    buyTrades.sort((a, b) => new Date(a.date) - new Date(b.date));
    sellTrades.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // FIFO匹配
    for (let i = 0; i < buyTrades.length; i++) {
      const buyTrade = buyTrades[i];
      
      for (let j = 0; j < sellTrades.length && buyTrade.remainingQuantity > 0; j++) {
        const sellTrade = sellTrades[j];
        
        if (sellTrade.remainingQuantity > 0) {
          const matchedQuantity = Math.min(buyTrade.remainingQuantity, sellTrade.remainingQuantity);
          
          // 计算这次匹配的盈亏
          const priceDiff = subtract(sellTrade.price, buyTrade.price);
          const profit = multiply(priceDiff, matchedQuantity);
          
          // 记录匹配详情到两个交易中
          const matchDetail = {
            buyTradeId: buyTrade.id,
            buyPrice: buyTrade.price,
            buyDate: buyTrade.date,
            sellTradeId: sellTrade.id,
            sellPrice: sellTrade.price,
            sellDate: sellTrade.date,
            quantity: matchedQuantity,
            profit: round(profit)
          };
          
          buyTrade.matches.push(matchDetail);
          sellTrade.matches.push(matchDetail);
          
          // 更新剩余数量
          buyTrade.remainingQuantity -= matchedQuantity;
          sellTrade.remainingQuantity -= matchedQuantity;
        }
      }
    }
  });
  
  return workingTrades;
}

/**
 * 获取指定股票的持仓情况
 * @param {Array} trades 交易记录
 * @param {String} stockCode 股票代码
 * @returns {Object} 持仓详情
 */
function getStockPosition(trades, stockCode) {
  const stockTrades = trades.filter(trade => trade.stockCode === stockCode);
  
  let totalBuyQuantity = 0;
  let totalSellQuantity = 0;
  let avgBuyPrice = 0;
  let avgSellPrice = 0;
  
  // 计算总的买入和卖出数量及均价
  const buyTrades = stockTrades.filter(trade => trade.type === 'buy');
  const sellTrades = stockTrades.filter(trade => trade.type === 'sell');
  
  let totalBuyAmount = 0;
  buyTrades.forEach(trade => {
    totalBuyQuantity += trade.quantity;
    totalBuyAmount = add(totalBuyAmount, multiply(trade.price, trade.quantity));
  });
  
  if (totalBuyQuantity > 0) {
    avgBuyPrice = divide(totalBuyAmount, totalBuyQuantity);
  }
  
  let totalSellAmount = 0;
  sellTrades.forEach(trade => {
    totalSellQuantity += trade.quantity;
    totalSellAmount = add(totalSellAmount, multiply(trade.price, trade.quantity));
  });
  
  if (totalSellQuantity > 0) {
    avgSellPrice = divide(totalSellAmount, totalSellQuantity);
  }
  
  const position = totalBuyQuantity - totalSellQuantity;
  const priceDiff = subtract(avgSellPrice, avgBuyPrice);
  const minQuantity = Math.min(totalBuyQuantity, totalSellQuantity);
  const totalProfit = multiply(priceDiff, minQuantity);
  
  return {
    position: position,
    totalBuyQuantity: totalBuyQuantity,
    totalSellQuantity: totalSellQuantity,
    avgBuyPrice: avgBuyPrice,
    avgSellPrice: avgSellPrice,
    totalProfit: round(totalProfit)
  };
}

module.exports = {
  calculateProfitEnhanced,
  updateAllTradesMatching,
  getStockPosition
};