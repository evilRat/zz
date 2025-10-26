// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 查询用户信息
    const queryResult = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()
    
    if (queryResult.data.length > 0) {
      return {
        success: true,
        data: queryResult.data[0]
      }
    } else {
      return {
        success: false,
        message: '未找到用户信息'
      }
    }
  } catch (err) {
    return {
      success: false,
      message: '查询失败',
      error: err
    }
  }
}