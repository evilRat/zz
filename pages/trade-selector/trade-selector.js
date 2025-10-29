// 交易记录选择组件页面
Page({
  data: {
    // 筛选条件
    tradeType: '', // 'buy', 'sell', 或空字符串表示全部
    stockCode: '', // 股票代码筛选
    quantityFilter: 0, // 数量筛选（用于B交易选择）
    excludeIds: [], // 排除的交易记录ID列表
    
    // 数据
    trades: [], // 交易记录列表
    filteredTrades: [], // 筛选后的交易记录
    
    // UI状态
    loading: false,
    searchKeyword: '', // 搜索关键词
    
    // 选择模式
    selectionMode: 'single', // 'single' 或 'multiple'
    selectedTrades: [], // 已选择的交易记录
    
    // 页面参数
    title: '选择交易记录',
    confirmText: '确定',
    
    // 交易类型选项
    tradeTypeOptions: [
      { value: '', label: '全部' },
      { value: 'buy', label: '买入' },
      { value: 'sell', label: '卖出' }
    ]
  },

  onLoad(options) {
    // 解析页面参数
    this.parseOptions(options);
    
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: this.data.title
    });
    
    // 加载交易记录
    this.loadTrades();
  },

  /**
   * 解析页面参数
   */
  parseOptions(options) {
    const updates = {};
    
    // 交易类型筛选
    if (options.tradeType) {
      updates.tradeType = options.tradeType;
    }
    
    // 股票代码筛选
    if (options.stockCode) {
      updates.stockCode = options.stockCode;
    }
    
    // 数量筛选
    if (options.quantityFilter) {
      updates.quantityFilter = parseInt(options.quantityFilter);
    }
    
    // 排除的ID列表
    if (options.excludeIds) {
      try {
        updates.excludeIds = JSON.parse(decodeURIComponent(options.excludeIds));
      } catch (e) {
        console.error('解析excludeIds失败:', e);
        updates.excludeIds = [];
      }
    }
    
    // 选择模式
    if (options.selectionMode) {
      updates.selectionMode = options.selectionMode;
    }
    
    // 页面标题
    if (options.title) {
      updates.title = decodeURIComponent(options.title);
    }
    
    // 确认按钮文本
    if (options.confirmText) {
      updates.confirmText = decodeURIComponent(options.confirmText);
    }
    
    this.setData(updates);
  },

  /**
   * 加载交易记录
   */
  loadTrades() {
    this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: 'tradeOperations',
      data: {
        operation: 'getUnmatchedTrades',
        stockCode: this.data.stockCode || undefined,
        type: this.data.tradeType || undefined
      },
      success: res => {
        if (res.result.success) {
          const trades = res.result.data || [];
          this.setData({ trades });
          this.applyFilters();
        } else {
          console.error('获取交易记录失败', res.result.message);
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('调用云函数失败', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  /**
   * 应用筛选条件
   */
  applyFilters() {
    let filteredTrades = [...this.data.trades];
    
    // 排除指定ID的交易记录
    if (this.data.excludeIds.length > 0) {
      filteredTrades = filteredTrades.filter(trade => 
        !this.data.excludeIds.includes(trade._id)
      );
    }
    
    // 数量筛选（用于B交易选择）
    if (this.data.quantityFilter > 0) {
      filteredTrades = filteredTrades.filter(trade => 
        trade.quantity === this.data.quantityFilter
      );
    }
    
    // 搜索关键词筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filteredTrades = filteredTrades.filter(trade => 
        trade.stockCode.toLowerCase().includes(keyword) ||
        trade.stockName.toLowerCase().includes(keyword)
      );
    }
    
    this.setData({ filteredTrades });
  },

  /**
   * 交易类型筛选变更
   */
  onTradeTypeChange(e) {
    const tradeType = e.detail.value;
    this.setData({ tradeType });
    this.loadTrades();
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const searchKeyword = e.detail.value;
    this.setData({ searchKeyword });
    this.applyFilters();
  },

  /**
   * 清空搜索
   */
  onSearchClear() {
    this.setData({ searchKeyword: '' });
    this.applyFilters();
  },

  /**
   * 选择交易记录
   */
  onTradeSelect(e) {
    const tradeId = e.currentTarget.dataset.id;
    const trade = this.data.filteredTrades.find(t => t._id === tradeId);
    
    if (!trade) return;
    
    if (this.data.selectionMode === 'single') {
      // 单选模式：直接返回选择结果
      this.confirmSelection([trade]);
    } else {
      // 多选模式：切换选择状态
      const selectedTrades = [...this.data.selectedTrades];
      const existingIndex = selectedTrades.findIndex(t => t._id === tradeId);
      
      if (existingIndex >= 0) {
        // 取消选择
        selectedTrades.splice(existingIndex, 1);
      } else {
        // 添加选择
        selectedTrades.push(trade);
      }
      
      this.setData({ selectedTrades });
    }
  },

  /**
   * 检查交易记录是否已选择
   */
  isTradeSelected(tradeId) {
    return this.data.selectedTrades.some(t => t._id === tradeId);
  },

  /**
   * 确认选择
   */
  onConfirm() {
    if (this.data.selectedTrades.length === 0) {
      wx.showToast({
        title: '请选择交易记录',
        icon: 'none'
      });
      return;
    }
    
    this.confirmSelection(this.data.selectedTrades);
  },

  /**
   * 确认选择并返回结果
   */
  confirmSelection(selectedTrades) {
    // 获取当前页面栈
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    
    if (prevPage && prevPage.onTradeSelected) {
      // 调用上一页面的回调函数
      prevPage.onTradeSelected({
        trades: selectedTrades,
        mode: this.data.selectionMode
      });
    }
    
    // 返回上一页
    wx.navigateBack();
  },

  /**
   * 取消选择
   */
  onCancel() {
    wx.navigateBack();
  },

  /**
   * 刷新数据
   */
  onRefresh() {
    this.loadTrades();
  },

  /**
   * 获取交易记录的显示样式类
   */
  getTradeItemClass(trade) {
    let className = 'trade-item';
    
    if (this.isTradeSelected(trade._id)) {
      className += ' selected';
    }
    
    if (trade.type === 'buy') {
      className += ' buy-type';
    } else {
      className += ' sell-type';
    }
    
    return className;
  },

  /**
   * 格式化金额显示
   */
  formatAmount(amount) {
    return parseFloat(amount).toFixed(2);
  },

  /**
   * 格式化日期显示
   */
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }
});