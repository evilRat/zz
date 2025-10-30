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
        // 获取所有交易记录
        const getAllResult = await db.collection('trades').where({
          _openid: wxContext.OPENID
        }).orderBy('date', 'desc').get()
        
        return {
          success: true,
          data: getAllResult.data
        }
      
      case 'addTrade':
        // 添加新交易记录
        const addResult = await db.collection('trades').add({
          data: {
            ...data,
            _openid: wxContext.OPENID,
            createTime: db.serverDate()
          }
        })
        
        return {
          success: true,
          data: addResult
        }
      
      case 'deleteTrade':
        // 删除交易记录
        const deleteResult = await db.collection('trades').where({
          id: data.tradeId,
          _openid: wxContext.OPENID
        }).remove()
        
        return {
          success: true,
          data: deleteResult
        }
      
      case 'getTradeById':
        // 根据ID获取交易记录
        const getResult = await db.collection('trades').where({
          id: data.tradeId,
          _openid: wxContext.OPENID
        }).get()
        
        return {
          success: true,
          data: getResult.data[0] || null
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