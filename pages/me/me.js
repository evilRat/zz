Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    // 性别选项
    genders: [
      { id: 0, name: '不告诉你' },
      { id: 1, name: '男' },
      { id: 2, name: '女' }
    ],
    selectedGenderIndex: 0,
    editedCity: ''
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
          const userInfo = res.result.data.userInfo;
          // 根据用户信息设置性别索引
          const genderIndex = this.data.genders.findIndex(gender => gender.id === (userInfo.gender || 0));
          
          this.setData({
            userInfo: userInfo,
            hasUserInfo: true,
            selectedGenderIndex: genderIndex >= 0 ? genderIndex : 0,
            editedCity: userInfo.city || ''
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
        const userInfo = res.userInfo;
        // 根据用户信息设置性别索引
        const genderIndex = this.data.genders.findIndex(gender => gender.id === (userInfo.gender || 0));
        
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true,
          selectedGenderIndex: genderIndex >= 0 ? genderIndex : 0,
          editedCity: userInfo.city || ''
        });
        
        // 将用户信息存储到云端
        this.saveUserInfoToCloud(userInfo);
      },
      fail: (err) => {
        console.log('获取用户信息失败', err);
      }
    });
  },

  // 城市输入事件处理
  onCityInput(e) {
    this.setData({
      editedCity: e.detail.value
    });
  },

  // 性别选择事件处理
  onGenderChange(e) {
    this.setData({
      selectedGenderIndex: e.detail.value
    });
  },

  // 保存用户信息
  saveUserInfo() {
    // 创建更新后的用户信息对象
    const updatedUserInfo = {
      ...this.data.userInfo,
      city: this.data.editedCity,
      gender: this.data.genders[this.data.selectedGenderIndex].id
    };

    this.setData({
      userInfo: updatedUserInfo
    });

    // 将更新后的用户信息存储到云端
    this.saveUserInfoToCloud(updatedUserInfo);
    
    // 显示保存成功的提示
    wx.showToast({
      title: '保存成功',
      icon: 'success'
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
      const userInfo = e.detail.userInfo;
      // 根据用户信息设置性别索引
      const genderIndex = this.data.genders.findIndex(gender => gender.id === (userInfo.gender || 0));
      
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true,
        selectedGenderIndex: genderIndex >= 0 ? genderIndex : 0,
        editedCity: userInfo.city || ''
      });
      
      // 将用户信息存储到云端
      this.saveUserInfoToCloud(e.detail.userInfo);
    }
  }
});