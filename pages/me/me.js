Page({
  data: {
    userInfo: {},
    hasUserInfo: false
  },

  onLoad() {
    // 页面加载时从云端获取用户信息（如果存在）
    this.getUserInfoFromCloud();
  },

  getUserInfoFromCloud() {
    // 从云端获取用户信息
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: res => {
        if (res.result.success && res.result.data) {
          this.setData({
            userInfo: res.result.data.userInfo,
            hasUserInfo: true
          });
        }
      },
      fail: err => {
        console.error('获取云端用户信息失败', err);
      }
    });
  },

  getUserInfo() {
    // 使用微信API获取用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
        
        // 将用户信息存储到云端
        this.saveUserInfoToCloud(res.userInfo);
      },
      fail: (err) => {
        console.log('获取用户信息失败', err);
      }
    });
  },

  saveUserInfoToCloud(userInfo) {
    // 将用户信息存储到云端
    wx.cloud.callFunction({
      name: 'saveUserInfo',
      data: {
        userInfo: userInfo
      },
      success: res => {
        if (res.result.success) {
          console.log('用户信息保存成功');
        } else {
          console.error('用户信息保存失败', res.result.message);
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
      }
    });
  },

  onGetUserInfo(e) {
    // 用户点击获取用户信息按钮时触发
    if (e.detail.userInfo) {
      this.setData({
        userInfo: e.detail.userInfo,
        hasUserInfo: true
      });
      
      // 将用户信息存储到云端
      this.saveUserInfoToCloud(e.detail.userInfo);
    }
  }
});