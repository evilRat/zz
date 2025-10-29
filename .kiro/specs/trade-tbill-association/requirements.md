# 需求文档

## 简介

改造现有的T账单系统，使其支持手动选择交易记录进行匹配，而不是依赖自动匹配逻辑。T账单将通过用户手动选择的买入和卖出交易记录来计算盈亏，被选择的交易记录将被标记为已匹配状态，不可再次编辑。

## 术语表

- **Trade_System**: 智帐交易记录系统，基于微信小程序和云开发
- **T_Bill_System**: T账单管理系统，使用微信云数据库存储
- **Trade_Record**: 单笔交易记录，包含买入或卖出信息，存储在云数据库中
- **T_Bill**: T账单记录，通过匹配A和B两个交易记录产生的盈亏记录
- **A_Trade**: T账单中的第一个交易记录，可以是买入或卖出
- **B_Trade**: T账单中的第二个交易记录，与A交易相反类型且数量相等
- **Match_Status**: 交易记录的匹配状态，包含"未匹配"和"已匹配"两种状态
- **User_Interface**: 微信小程序用户交互界面
- **Cloud_Function**: 微信云函数，处理业务逻辑和数据操作
- **Cloud_Database**: 微信云数据库，存储交易记录和T账单数据

## 需求

### 需求 1

**用户故事:** 作为交易记录用户，我希望保存交易记录时不自动匹配其他交易，以便我可以手动控制T账单的匹配逻辑

#### 验收标准

1. WHEN 用户保存新的交易记录，THE Cloud_Function SHALL 保存交易记录到Cloud_Database且状态为未匹配
2. WHEN 用户保存新的交易记录，THE Cloud_Function SHALL NOT 执行自动匹配逻辑
3. THE Trade_Record SHALL 包含matchStatus字段存储在Cloud_Database中
4. THE Trade_System SHALL 允许用户编辑matchStatus为未匹配的交易记录
5. THE Trade_System SHALL 禁止编辑matchStatus为已匹配的交易记录

### 需求 2

**用户故事:** 作为T账单用户，我希望在创建或编辑T账单时能够选择特定的交易记录，以便精确控制盈亏计算

#### 验收标准

1. WHEN 用户创建新T账单，THE Cloud_Function SHALL 查询Cloud_Database中所有未匹配状态的交易记录
2. WHEN 用户选择T账单类型为先买后卖，THE User_Interface SHALL 显示matchStatus为未匹配且type为buy的交易记录列表作为A交易选择
3. WHEN 用户选择T账单类型为先卖后买，THE User_Interface SHALL 显示matchStatus为未匹配且type为sell的交易记录列表作为A交易选择
4. THE T_Bill_System SHALL 允许用户为每个T账单选择A交易记录和B交易记录
5. THE Cloud_Function SHALL 根据选择的A和B交易记录计算盈亏金额和盈亏率

### 需求 3

**用户故事:** 作为T账单用户，我希望在选择B交易记录时只看到与A交易数量一致的记录，以便确保T账单的数量匹配

#### 验收标准

1. WHEN 用户已选择A交易记录，THE User_Interface SHALL 显示与A交易记录相反类型的未匹配交易记录列表
2. WHEN 用户选择B交易记录，THE Cloud_Function SHALL 仅返回quantity等于A交易记录quantity的交易记录
3. WHEN A交易记录类型为buy，THE User_Interface SHALL 显示type为sell且quantity匹配的交易记录供B选择
4. WHEN A交易记录类型为sell，THE User_Interface SHALL 显示type为buy且quantity匹配的交易记录供B选择
5. THE T_Bill_System SHALL 确保A和B交易记录的stockCode相同

### 需求 4

**用户故事:** 作为T账单用户，我希望保存T账单后被选择的交易记录状态自动更新，以便避免重复使用同一交易记录

#### 验收标准

1. WHEN 用户保存T账单，THE Cloud_Function SHALL 更新A交易记录matchStatus为已匹配
2. WHEN 用户保存T账单，THE Cloud_Function SHALL 更新B交易记录matchStatus为已匹配  
3. THE Cloud_Function SHALL 确保已匹配状态的交易记录不出现在后续T账单选择查询中
4. THE Trade_System SHALL 确保已匹配状态的交易记录不可被编辑或删除
5. THE T_Bill SHALL 在Cloud_Database中保存aTradeId和bTradeId字段用于关联A和B交易记录
6. THE Cloud_Function SHALL 计算并保存T账单的盈利金额和盈利率到Cloud_Database
7. THE User_Interface SHALL 在保存成功后显示计算出的盈利情况

### 需求 5

**用户故事:** 作为T账单用户，我希望编辑现有T账单时能够重新选择交易记录，以便修正错误的匹配

#### 验收标准

1. WHEN 用户编辑现有T账单，THE Cloud_Function SHALL 将原关联交易记录matchStatus恢复为未匹配
2. WHEN 用户编辑现有T账单，THE User_Interface SHALL 显示所有未匹配交易记录供重新选择
3. WHEN 用户保存编辑后的T账单，THE Cloud_Function SHALL 将新选择的交易记录matchStatus更新为已匹配
4. THE Cloud_Function SHALL 使用数据库事务确保编辑过程中状态变更的原子性
5. IF 用户取消编辑操作，THEN THE Cloud_Function SHALL 恢复所有交易记录的原始matchStatus

### 需求 6

**用户故事:** 作为系统用户，我希望在交易记录列表中能够清楚看到每条记录的匹配状态，以便了解哪些记录可用于创建T账单

#### 验收标准

1. THE User_Interface SHALL 在交易记录列表中显示每条记录的匹配状态
2. THE User_Interface SHALL 使用不同的视觉标识区分已匹配和未匹配的交易记录
3. THE User_Interface SHALL 提供筛选功能以分别查看已匹配和未匹配的交易记录
4. WHEN 交易记录状态为已匹配，THE User_Interface SHALL 显示关联的T账单信息
5. THE User_Interface SHALL 在交易记录详情页面显示匹配状态和相关T账单链接