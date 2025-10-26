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
    // 查询用户是否已存在
    const queryResult = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()
    
    if (queryResult.data.length > 0) {
      // 用户已存在，更新用户信息
      const updateResult = await db.collection('users').where({
        openid: wxContext.OPENID
      }).update({
        data: {
          userInfo: event.userInfo,
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        message: '用户信息更新成功',
        data: updateResult
      }
    } else {
      // 新用户，创建用户记录
      const addResult = await db.collection('users').add({
        data: {
          openid: wxContext.OPENID,
          userInfo: event.userInfo,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        message: '新用户创建成功',
        data: addResult
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