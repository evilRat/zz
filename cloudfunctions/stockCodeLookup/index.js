// 云函数入口文件
const cloud = require('wx-server-sdk')
const got = require('got')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { stockCode } = event
  
  try {
    // 这里使用公开的股票代码查询API示例
    // 注意：在实际项目中，你需要申请真实的API密钥并使用有效的API
    
    // 示例: 使用新浪财经的公开接口（可能会有访问限制）
    // 注意：新浪财经接口可能不稳定或有访问频率限制
    let apiUrl = '';
    let market = '';
    
    // 根据股票代码格式判断是哪种市场的股票
    // 1. 沪市股票：6开头的6位数
    if (stockCode.startsWith('6') && stockCode.length === 6) {
      // 沪市股票
      apiUrl = `http://hq.sinajs.cn/list=sh${stockCode}`;
      market = 'sh';
    }
    // 2. 深市股票：0或3开头的6位数
    else if ((stockCode.startsWith('0') || stockCode.startsWith('3')) && stockCode.length === 6) {
      // 深市股票
      apiUrl = `http://hq.sinajs.cn/list=sz${stockCode}`;
      market = 'sz';
    }
    // 3. 港股股票：0开头的5位数或带有.hk后缀
    else if ((stockCode.startsWith('0') && stockCode.length === 5) || stockCode.includes('.hk')) {
      // 港股股票
      const hkCode = stockCode.includes('.hk') ? stockCode.split('.')[0] : stockCode;
      apiUrl = `http://hq.sinajs.cn/list=hk${hkCode}`;
      market = 'hk';
    }
    // 4. 美股股票：通常是字母代码，可能带有.NYSE/.NASDAQ/.AMEX等后缀
    else if (/^[A-Za-z]{1,5}(-[A-Za-z]{1,2})?(\.[A-Za-z]+)?$/.test(stockCode)) {
      // 美股股票
      const usCode = stockCode.includes('.') ? stockCode.split('.')[0].toUpperCase() : stockCode.toUpperCase();
      apiUrl = `http://hq.sinajs.cn/list=${usCode}`;
      market = 'us';
    }
    
    if (!apiUrl) {
      return {
        success: false,
        message: '不支持的股票代码格式',
        data: null
      }
    }
    
    // 调用API获取数据
    const response = await got(apiUrl)
    
    // 解析返回的数据
    // 新浪财经返回的数据格式类似: var hq_str_sh600000="浦发银行,10.00,10.01,...";
    const data = response.body
    if (data && data.includes('"')) {
      const match = data.match(/"([^,]+)/);
      if (match && match[1]) {
        return {
          success: true,
          data: {
            code: stockCode,
            name: match[1],
            market: market
          }
        }
      }
    }
    
    // 如果无法从API获取，使用备用方案或返回失败
    return {
      success: false,
      message: '无法获取股票信息',
      data: null
    }
  } catch (error) {
    console.error('获取股票信息失败:', error)
    return {
      success: false,
      message: '获取股票信息时发生错误',
      error: error.message
    }
  }
}