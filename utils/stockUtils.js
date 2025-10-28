// 股票工具函数

/**
 * 根据股票代码获取股票信息
 * 通过调用云函数获取真实的股票数据，支持A股、港股和美股
 * @param {string} stockCode - 股票代码
 * @returns {Promise<Object>} - 包含股票名称和市场信息的Promise
 */
export function getStockInfoByCode(stockCode) {
  return new Promise((resolve, reject) => {
    try {
      // 1. 首先检查本地缓存
      const cachedStocks = getCachedStocks();
      if (cachedStocks[stockCode]) {
        // 如果缓存中有，则直接返回缓存值
        resolve(cachedStocks[stockCode]);
        return;
      }
      
      // 2. 调用云函数获取真实股票数据
      wx.cloud.callFunction({
        name: 'stockCodeLookup',
        data: {
          stockCode: stockCode
        },
        success: res => {
          if (res.result && res.result.success && res.result.data && res.result.data.name) {
            const stockInfo = {
              name: res.result.data.name,
              market: res.result.data.market || 'unknown'
            };
            
            // 3. 更新缓存
            cachedStocks[stockCode] = stockInfo;
            cacheStockCodeMap(cachedStocks);
            
            // 4. 返回识别结果
            resolve(stockInfo);
          } else {
            // 没有找到匹配的股票信息，返回空对象
            resolve({ name: '', market: 'unknown' });
          }
        },
        fail: err => {
          console.error('调用云函数失败:', err);
          // 云函数调用失败时，可以使用备用方案或返回空字符串
          
          // 备用方案：使用内置的简单股票映射作为fallback
          const fallbackStocks = {
            // A股
            '000001': { name: '平安银行', market: 'sz' },
            '000002': { name: '万科A', market: 'sz' },
            '600000': { name: '浦发银行', market: 'sh' },
            '600036': { name: '招商银行', market: 'sh' },
            '601318': { name: '中国平安', market: 'sh' },
            '601398': { name: '工商银行', market: 'sh' },
            '601857': { name: '中国石油', market: 'sh' },
            '601288': { name: '农业银行', market: 'sh' },
            '600519': { name: '贵州茅台', market: 'sh' },
            '000858': { name: '五粮液', market: 'sz' },
            // 港股
            '00001': { name: '长和', market: 'hk' },
            '00939': { name: '建设银行', market: 'hk' },
            '00700': { name: '腾讯控股', market: 'hk' },
            '02318': { name: '中国平安', market: 'hk' },
            // 美股
            'AAPL': { name: '苹果公司', market: 'us' },
            'MSFT': { name: '微软公司', market: 'us' },
            'GOOGL': { name: 'Alphabet', market: 'us' },
            'AMZN': { name: '亚马逊', market: 'us' },
            'TSLA': { name: '特斯拉', market: 'us' }
          };
          
          if (fallbackStocks[stockCode]) {
            resolve(fallbackStocks[stockCode]);
          } else {
            resolve({ name: '', market: 'unknown' });
          }
        }
      });
    } catch (error) {
      console.error('股票代码识别失败:', error);
      reject(error);
    }
  });
}

/**
 * 根据股票代码获取股票名称（兼容旧版本）
 * @param {string} stockCode - 股票代码
 * @returns {Promise<string>} - 股票名称的Promise
 */
export function getStockNameByCode(stockCode) {
  return getStockInfoByCode(stockCode).then(info => info.name);
}

/**
 * 检查股票代码格式是否有效
 * @param {string} stockCode - 股票代码
 * @returns {boolean} - 代码是否有效
 */
export function isValidStockCode(stockCode) {
  // 支持的股票代码格式：
  // 1. A股：6位数字（6开头为沪市，0或3开头为深市）
  // 2. 港股：5位数字或带.hk后缀
  // 3. 美股：字母代码，可带交易所后缀
  
  // A股格式：6位数字
  const mainlandPattern = /^[0-9]{6}$/;
  
  // 港股格式：5位数字或以.hk结尾
  const hkPattern = /^[0-9]{5}$|\.hk$/i;
  
  // 美股格式：字母代码，可带连字符和交易所后缀
  const usPattern = /^[A-Za-z]{1,5}(-[A-Za-z]{1,2})?(\.[A-Za-z]+)?$/i;
  
  return mainlandPattern.test(stockCode) || hkPattern.test(stockCode) || usPattern.test(stockCode);
}

/**
 * 获取本地缓存的股票代码-名称映射
 * @returns {Object} - 股票代码映射对象
 */
export function getCachedStocks() {
  try {
    const cached = wx.getStorageSync('stockCodeMap') || {};
    return cached;
  } catch (error) {
    console.error('获取股票缓存失败:', error);
    return {};
  }
}

/**
 * 缓存股票代码-名称映射
 * @param {Object} stockMap - 股票代码映射对象
 */
export function cacheStockCodeMap(stockMap) {
  try {
    wx.setStorageSync('stockCodeMap', stockMap);
  } catch (error) {
    console.error('缓存股票信息失败:', error);
  }
}