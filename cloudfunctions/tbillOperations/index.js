// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { operation, data } = event

  try {
    switch (operation) {
      case 'createTBill':
        return await createTBill(data, wxContext.OPENID)
      
      case 'updateTBill':
        return await updateTBill(data, wxContext.OPENID)
      
      case 'getTBillDetail':
        return await getTBillDetail(data, wxContext.OPENID)
      
      default:
        return {
          success: false,
          message: '不支持的操作'
        }
    }
  } catch (err) {
    console.error('tbillOperations error:', err)
    return {
      success: false,
      message: '操作失败',
      error: err.message
    }
  }
}

/**
 * 创建T账单
 * 使用数据库事务确保数据一致性
 * 创建T账单记录并更新关联交易记录状态
 * 计算并保存盈利金额和盈利率
 */
async function createTBill(data, openid) {
  const { aTradeId, bTradeId, date } = data
  
  // 参数验证
  if (!aTradeId || !bTradeId || !date) {
    return {
      success: false,
      message: '缺少必要参数：aTradeId, bTradeId, date'
    }
  }

  // 开始事务
  const transaction = await db.startTransaction()
  
  try {
    // 1. 获取A和B交易记录
    const aTradeResult = await transaction.collection('trades').where({
      _id: aTradeId,
      _openid: openid
    }).get()
    
    const bTradeResult = await transaction.collection('trades').where({
      _id: bTradeId,
      _openid: openid
    }).get()
    
    if (aTradeResult.data.length === 0 || bTradeResult.data.length === 0) {
      await transaction.rollback()
      return {
        success: false,
        message: '交易记录不存在'
      }
    }
    
    const aTrade = aTradeResult.data[0]
    const bTrade = bTradeResult.data[0]
    
    // 2. 验证交易记录状态和匹配条件
    if (aTrade.matchStatus !== 'unmatched' || bTrade.matchStatus !== 'unmatched') {
      await transaction.rollback()
      return {
        success: false,
        message: '交易记录已匹配，无法创建T账单'
      }
    }
    
    // 验证股票代码一致性
    if (aTrade.stockCode !== bTrade.stockCode) {
      await transaction.rollback()
      return {
        success: false,
        message: 'A和B交易记录的股票代码不一致'
      }
    }
    
    // 验证数量一致性
    if (aTrade.quantity !== bTrade.quantity) {
      await transaction.rollback()
      return {
        success: false,
        message: 'A和B交易记录的数量不一致'
      }
    }
    
    // 验证交易类型相反
    if (aTrade.type === bTrade.type) {
      await transaction.rollback()
      return {
        success: false,
        message: 'A和B交易记录的类型必须相反'
      }
    }
    
    // 3. 计算盈利金额和盈利率
    let profit, profitRate, tType
    
    if (aTrade.type === 'buy' && bTrade.type === 'sell') {
      // 先买后卖
      profit = (bTrade.price - aTrade.price) * aTrade.quantity
      profitRate = ((bTrade.price - aTrade.price) / aTrade.price) * 100
      tType = 'buySell'
    } else if (aTrade.type === 'sell' && bTrade.type === 'buy') {
      // 先卖后买
      profit = (aTrade.price - bTrade.price) * aTrade.quantity
      profitRate = ((aTrade.price - bTrade.price) / aTrade.price) * 100
      tType = 'sellBuy'
    } else {
      await transaction.rollback()
      return {
        success: false,
        message: '无效的交易类型组合'
      }
    }
    
    // 4. 创建T账单记录
    const tbillId = Date.now() // 使用时间戳作为业务ID
    const tbillData = {
      id: tbillId,
      _openid: openid,
      stockCode: aTrade.stockCode,
      stockName: aTrade.stockName,
      stockMarket: aTrade.stockMarket,
      tType: tType,
      aTradeId: aTradeId,
      bTradeId: bTradeId,
      quantity: aTrade.quantity,
      profit: Math.round(profit * 100) / 100, // 保留两位小数
      profitRate: Math.round(profitRate * 100) / 100, // 保留两位小数
      date: date,
      completed: true,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const createTBillResult = await transaction.collection('tbills').add({
      data: tbillData
    })
    
    const createdTBillId = createTBillResult._id
    
    // 5. 更新A交易记录状态
    await transaction.collection('trades').where({
      _id: aTradeId,
      _openid: openid
    }).update({
      data: {
        matchStatus: 'matched',
        tbillId: createdTBillId,
        updateTime: db.serverDate()
      }
    })
    
    // 6. 更新B交易记录状态
    await transaction.collection('trades').where({
      _id: bTradeId,
      _openid: openid
    }).update({
      data: {
        matchStatus: 'matched',
        tbillId: createdTBillId,
        updateTime: db.serverDate()
      }
    })
    
    // 提交事务
    await transaction.commit()
    
    return {
      success: true,
      data: {
        ...tbillData,
        _id: createdTBillId
      }
    }
    
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    console.error('createTBill transaction error:', error)
    throw error
  }
}

/**
 * 更新T账单
 * 支持编辑现有T账单的交易记录关联
 * 恢复原交易记录状态并更新新选择的交易记录状态
 * 使用事务确保操作原子性
 */
async function updateTBill(data, openid) {
  const { tbillId, aTradeId, bTradeId } = data
  
  // 参数验证
  if (!tbillId || !aTradeId || !bTradeId) {
    return {
      success: false,
      message: '缺少必要参数：tbillId, aTradeId, bTradeId'
    }
  }

  // 开始事务
  const transaction = await db.startTransaction()
  
  try {
    // 1. 获取现有T账单记录
    const existingTBillResult = await transaction.collection('tbills').where({
      _id: tbillId,
      _openid: openid
    }).get()
    
    if (existingTBillResult.data.length === 0) {
      await transaction.rollback()
      return {
        success: false,
        message: 'T账单不存在'
      }
    }
    
    const existingTBill = existingTBillResult.data[0]
    const oldATradeId = existingTBill.aTradeId
    const oldBTradeId = existingTBill.bTradeId
    
    // 2. 恢复原交易记录状态为未匹配
    if (oldATradeId) {
      await transaction.collection('trades').where({
        _id: oldATradeId,
        _openid: openid
      }).update({
        data: {
          matchStatus: 'unmatched',
          tbillId: null,
          updateTime: db.serverDate()
        }
      })
    }
    
    if (oldBTradeId) {
      await transaction.collection('trades').where({
        _id: oldBTradeId,
        _openid: openid
      }).update({
        data: {
          matchStatus: 'unmatched',
          tbillId: null,
          updateTime: db.serverDate()
        }
      })
    }
    
    // 3. 获取新的A和B交易记录
    const newATradeResult = await transaction.collection('trades').where({
      _id: aTradeId,
      _openid: openid
    }).get()
    
    const newBTradeResult = await transaction.collection('trades').where({
      _id: bTradeId,
      _openid: openid
    }).get()
    
    if (newATradeResult.data.length === 0 || newBTradeResult.data.length === 0) {
      await transaction.rollback()
      return {
        success: false,
        message: '新的交易记录不存在'
      }
    }
    
    const newATrade = newATradeResult.data[0]
    const newBTrade = newBTradeResult.data[0]
    
    // 4. 验证新交易记录状态和匹配条件
    if (newATrade.matchStatus !== 'unmatched' || newBTrade.matchStatus !== 'unmatched') {
      await transaction.rollback()
      return {
        success: false,
        message: '新选择的交易记录已匹配，无法更新T账单'
      }
    }
    
    // 验证股票代码一致性
    if (newATrade.stockCode !== newBTrade.stockCode) {
      await transaction.rollback()
      return {
        success: false,
        message: '新选择的A和B交易记录的股票代码不一致'
      }
    }
    
    // 验证数量一致性
    if (newATrade.quantity !== newBTrade.quantity) {
      await transaction.rollback()
      return {
        success: false,
        message: '新选择的A和B交易记录的数量不一致'
      }
    }
    
    // 验证交易类型相反
    if (newATrade.type === newBTrade.type) {
      await transaction.rollback()
      return {
        success: false,
        message: '新选择的A和B交易记录的类型必须相反'
      }
    }
    
    // 5. 重新计算盈利金额和盈利率
    let profit, profitRate, tType
    
    if (newATrade.type === 'buy' && newBTrade.type === 'sell') {
      // 先买后卖
      profit = (newBTrade.price - newATrade.price) * newATrade.quantity
      profitRate = ((newBTrade.price - newATrade.price) / newATrade.price) * 100
      tType = 'buySell'
    } else if (newATrade.type === 'sell' && newBTrade.type === 'buy') {
      // 先卖后买
      profit = (newATrade.price - newBTrade.price) * newATrade.quantity
      profitRate = ((newATrade.price - newBTrade.price) / newATrade.price) * 100
      tType = 'sellBuy'
    } else {
      await transaction.rollback()
      return {
        success: false,
        message: '无效的交易类型组合'
      }
    }
    
    // 6. 更新T账单记录
    const updatedTBillData = {
      stockCode: newATrade.stockCode,
      stockName: newATrade.stockName,
      stockMarket: newATrade.stockMarket,
      tType: tType,
      aTradeId: aTradeId,
      bTradeId: bTradeId,
      quantity: newATrade.quantity,
      profit: Math.round(profit * 100) / 100, // 保留两位小数
      profitRate: Math.round(profitRate * 100) / 100, // 保留两位小数
      updateTime: db.serverDate()
    }
    
    await transaction.collection('tbills').where({
      _id: tbillId,
      _openid: openid
    }).update({
      data: updatedTBillData
    })
    
    // 7. 更新新的A交易记录状态
    await transaction.collection('trades').where({
      _id: aTradeId,
      _openid: openid
    }).update({
      data: {
        matchStatus: 'matched',
        tbillId: tbillId,
        updateTime: db.serverDate()
      }
    })
    
    // 8. 更新新的B交易记录状态
    await transaction.collection('trades').where({
      _id: bTradeId,
      _openid: openid
    }).update({
      data: {
        matchStatus: 'matched',
        tbillId: tbillId,
        updateTime: db.serverDate()
      }
    })
    
    // 提交事务
    await transaction.commit()
    
    return {
      success: true,
      data: {
        ...existingTBill,
        ...updatedTBillData,
        _id: tbillId
      }
    }
    
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    console.error('updateTBill transaction error:', error)
    throw error
  }
}

/**
 * 获取T账单详情
 * 获取T账单详情及关联的交易记录信息
 * 用于编辑页面数据加载
 */
async function getTBillDetail(data, openid) {
  const { tbillId } = data
  
  // 参数验证
  if (!tbillId) {
    return {
      success: false,
      message: '缺少必要参数：tbillId'
    }
  }
  
  try {
    // 1. 获取T账单基本信息
    const tbillResult = await db.collection('tbills').where({
      _id: tbillId,
      _openid: openid
    }).get()
    
    if (tbillResult.data.length === 0) {
      return {
        success: false,
        message: 'T账单不存在'
      }
    }
    
    const tbill = tbillResult.data[0]
    
    // 2. 获取关联的A交易记录
    let aTradeDetail = null
    if (tbill.aTradeId) {
      const aTradeResult = await db.collection('trades').where({
        _id: tbill.aTradeId,
        _openid: openid
      }).get()
      
      if (aTradeResult.data.length > 0) {
        aTradeDetail = aTradeResult.data[0]
      }
    }
    
    // 3. 获取关联的B交易记录
    let bTradeDetail = null
    if (tbill.bTradeId) {
      const bTradeResult = await db.collection('trades').where({
        _id: tbill.bTradeId,
        _openid: openid
      }).get()
      
      if (bTradeResult.data.length > 0) {
        bTradeDetail = bTradeResult.data[0]
      }
    }
    
    return {
      success: true,
      data: {
        tbill: tbill,
        aTrade: aTradeDetail,
        bTrade: bTradeDetail
      }
    }
    
  } catch (error) {
    console.error('getTBillDetail error:', error)
    throw error
  }
}