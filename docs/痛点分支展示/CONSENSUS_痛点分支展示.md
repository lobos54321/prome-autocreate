# CONSENSUS_痛点分支展示.md

## 🎯 明确的需求描述
实现痛点regenerate的分支展示系统，每个版本独立展示，整个workflow分支发展，最多3次regenerate机会。

## 📋 设计决策确认

### 1. 展示方式: **Tab标签页模式**
**理由**: 最简单易操作，显眼明确
- 横向标签布局，一目了然
- 点击切换，操作直观
- 视觉层次清晰

### 2. 分支范围: **整个workflow分支展示**
- 选择某版本痛点后，后续的revised pain point、content strategy、final content都在该分支内展示
- 每个tab包含完整的workflow流程

### 3. 版本命名: **"版本1、版本2、版本3"**
- 简洁明确，易于理解
- 对应3次regenerate机会

### 4. 默认行为: **自动切换到新版本**
- 新生成痛点后自动显示最新版本
- 保持用户看到最新结果的期望

## 🏗️ 技术实现方案

### 数据结构设计
```typescript
interface PainPointVersion {
  id: string;
  version: number;
  painPointMessages: Message[];
  workflowMessages: Message[]; // revised pain point + strategy + final content
  createdAt: Date;
}

interface BranchState {
  versions: PainPointVersion[];
  activeVersionId: string;
  regenerateCount: number; // 0-3
}
```

### UI组件架构
1. **Tab导航栏**: 显示版本标签和切换功能
2. **分支内容区**: 显示当前版本的完整workflow
3. **Regenerate控制**: 管理regenerate次数和按钮状态

## ✅ 验收标准
1. **版本隔离**: 每个版本的痛点和workflow独立展示
2. **Tab切换**: 用户可在版本间无缝切换
3. **限制执行**: 最多3个版本，第3次后禁用regenerate
4. **自动切换**: 新版本生成后自动切换到该版本
5. **工作流完整**: 每个版本包含完整的痛点→revised→strategy→final流程

## 🔧 集成约束
- 保持现有Dify API调用逻辑
- 不影响非痛点阶段的消息显示
- 复用现有的消息组件和样式
- 保持conversation ID管理机制