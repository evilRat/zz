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
      case 'getAllTrades':
        // 获取所有交易记录 - 支持分页和筛选
        const { page = 1, pageSize = 20, matchStatus, stockCode, type } = data || {}
        const skip = (page - 1) * pageSize
        
        // 构建查询条件
        const whereCondition = {
          _openid: wxContext.OPENID
        }
        
        if (matchStatus && matchStatus !== 'all') {
          whereCondition.matchStatus = matchStatus
        }
        
        if (stockCode && stockCode !== 'all') {
          whereCondition.stockCode = stockCode
        }
        
        if (type && type !== 'all') {
          whereCondition.type = type
        }

        // 执行分页查询
        const getAllResult = await db.collection('trades')
          .where(whereCondition)
          .orderBy('date', 'desc')
          .skip(skip)
          .limit(pageSize)
          .get()

        // 获取总数（用于分页计算）
        const countResult = await db.collection('trades')
          .where(whereCondition)
          .count()

        return {
          success: true,
          data: getAllResult.data,
          pagination: {
            page,
            pageSize,
            total: countResult.total,
            hasMore: skip + getAllResult.data.length < countResult.total
          }
        }

      case 'addTrade':
        // 添加新交易记录
        const addResult = await db.collection('trades').add({
          data: {
            ...data,
            _openid: wxContext.OPENID,
            matchStatus: 'unmatched', // 默认状态为未匹配
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })

        return {
          success: true,
          data: addResult
        }

      case 'deleteTrade':
        // 删除交易记录
        const deleteResult = await db.collection('trades').where({
          _id: data.tradeId,
          _openid: wxContext.OPENID
        }).remove()

        return {
          success: true,
          data: deleteResult
        }

      case 'getTradeById':
        // 根据ID获取交易记录
        const getResult = await db.collection('trades').where({
          _id: data.tradeId,
          _openid: wxContext.OPENID
        }).get()

        return {
          success: true,
          data: getResult.data[0] || null
        }

      case 'updateTradeMatchStatus':
        // 更新交易记录匹配状态
        const updateData = {
          matchStatus: data.matchStatus,
          updateTime: db.serverDate()
        }
        
        // 如果提供了tbillId，也一起更新
        if (data.tbillId !== undefined) {
          updateData.tbillId = data.tbillId
        }

        const updateStatusResult = await db.collection('trades').where({
          _id: data.tradeId,
          _openid: wxContext.OPENID
        }).update({
          data: updateData
        })

        return {
          success: true,
          data: updateStatusResult
        }

      case 'checkTradeEditable':
        // 检查交易记录是否可编辑
        const checkResult = await db.collection('trades').where({
          _id: data.tradeId,
          _openid: wxContext.OPENID
        }).get()

        if (checkResult.data.length === 0) {
          return {
            success: false,
            message: '交易记录不存在'
          }
        }

        const trade = checkResult.data[0]
        const editable = trade.matchStatus === 'unmatched'
        
        return {
          success: true,
          editable: editable,
          reason: editable ? null : '交易记录已匹配，不可编辑'
        }

      case 'getUnmatchedTrades':
        // 获取未匹配的交易记录 - 支持分页和缓存优化
        const { page = 1, pageSize = 50, stockCode, type, searchKeyword } = data || {}
        const skip = (page - 1) * pageSize
        
        const whereCondition = {
          _openid: wxContext.OPENID,
          matchStatus: 'unmatched'
        }

        // 如果指定了股票代码，添加筛选条件
        if (stockCode && stockCode !== 'all') {
          whereCondition.stockCode = stockCode
        }

        // 如果指定了交易类型，添加筛选条件
        if (type && type !== 'all') {
          whereCondition.type = type
        }

        let query = db.collection('trades')
          .where(whereCondition)
          .orderBy('date', 'desc')
          .skip(skip)
          .limit(pageSize)

        const unmatchedResult = await query.get()
        
        // 如果有搜索关键词，在内存中进行筛选（避免复杂的数据库查询）
        let filteredData = unmatchedResult.data
        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase()
          filteredData = unmatchedResult.data.filter(trade => 
            trade.stockCode.toLowerCase().includes(keyword) ||
            trade.stockName.toLowerCase().includes(keyword)
          )
        }

        // 获取总数
        const countResult = await db.collection('trades')
          .where(whereCondition)
          .count()

        return {
          success: true,
          data: filteredData,
          pagination: {
            page,
            pageSize,
            total: countResult.total,
            hasMore: skip + unmatchedResult.data.length < countResult.total
          }
        }

      case 'getMatchingBTrades':
        // 根据A交易记录查找匹配的B交易记录 - 优化查询性能
        if (!data.aTradeId) {
          return {
            success: false,
            message: '缺少A交易记录ID'
          }
        }

        const { page = 1, pageSize = 30 } = data
        const skip = (page - 1) * pageSize

        // 首先获取A交易记录信息
        const aTradeResult = await db.collection('trades').where({
          _id: data.aTradeId,
          _openid: wxContext.OPENID
        }).get()

        if (aTradeResult.data.length === 0) {
          return {
            success: false,
            message: 'A交易记录不存在'
          }
        }

        const aTrade = aTradeResult.data[0]
        
        // 验证A交易记录是否为未匹配状态
        if (aTrade.matchStatus !== 'unmatched') {
          return {
            success: false,
            message: 'A交易记录已匹配，无法查找B交易记录'
          }
        }
        
        // 查找匹配的B交易记录：使用复合索引优化查询
        const oppositeType = aTrade.type === 'buy' ? 'sell' : 'buy'
        
        const bTradesResult = await db.collection('trades').where({
          _openid: wxContext.OPENID,
          stockCode: aTrade.stockCode,
          type: oppositeType,
          quantity: aTrade.quantity,
          matchStatus: 'unmatched'
        })
        .orderBy('date', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()

        // 获取匹配记录总数
        const countResult = await db.collection('trades').where({
          _openid: wxContext.OPENID,
          stockCode: aTrade.stockCode,
          type: oppositeType,
          quantity: aTrade.quantity,
          matchStatus: 'unmatched'
        }).count()

        return {
          success: true,
          data: bTradesResult.data,
          aTrade: aTrade,
          pagination: {
            page,
            pageSize,
            total: countResult.total,
            hasMore: skip + bTradesResult.data.length < countResult.total
          }
        }

      // T账单相关操作
      case 'getAllTBills':
        // 获取所有T账单记录
        const getAllTBillsResult = await db.collection('tbills').where({
          _openid: wxContext.OPENID
        }).orderBy('date', 'desc').get()

        return {
          success: true,
          data: getAllTBillsResult.data
        }

      case 'addTBill':
        // 添加新的T账单
        const addTBillResult = await db.collection('tbills').add({
          data: {
            ...data,
            _openid: wxContext.OPENID,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })

        return {
          success: true,
          data: addTBillResult
        }

      case 'updateTBill':
        // 更新T账单
        const updateTBillResult = await db.collection('tbills').where({
          _id: data.billId,
          _openid: wxContext.OPENID
        }).update({
          data: {
            ...data,
            updateTime: db.serverDate()
          }
        })

        return {
          success: true,
          data: updateTBillResult
        }

      case 'getTBillById':
        // 根据ID获取T账单
        const getTBillResult = await db.collection('tbills').where({
          _id: data.billId,
          _openid: wxContext.OPENID
        }).get()

        return {
          success: true,
          data: getTBillResult.data[0] || null
        }

      case 'deleteTBill':
        // 删除T账单
        const deleteTBillResult = await db.collection('tbills').where({
          _id: data.billId,
          _openid: wxContext.OPENID
        }).remove()

        return {
          success: true,
          data: deleteTBillResult
        }

      default:
        return {
          success: false,
          message: '不支持的操作'
        }
    }
  } catch (err) {
    return {
      success: false,
      message: '操作失败',
      error: err
    }
  }
}