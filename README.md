# ProLATO - 流程工业AI咨询平台

ProLATO 是专注于流程工业领域的AI咨询平台，为化工、有色矿山、食品饮料等行业提供知识问答、数字化解决方案编写、架构设计、供应商方案验证等AI咨询服务。

## 功能特性

- **行业专属**：覆盖化工、有色矿山、食品饮料等行业（玻璃光伏、钢铁、制药即将上线）
- **角色定制**：企业老板、决策层、部门管理者、一线操作员工四种角色视角
- **任务类型**：知识问答、数字化解决方案编写、架构设计、供应商方案验证
- **多模型支持**：OpenAI (ChatGPT)、Anthropic (Claude)、DeepSeek、自定义API、ProLATO自训练模型
- **动态提示词**：根据行业和角色自动生成专属系统提示词

## 技术栈

- 纯前端实现：HTML5 + CSS3 + Vanilla JavaScript
- 响应式设计：支持桌面端和移动端
- 模型适配层：Model Adapter Pattern 统一多模型接口

## 本地开发

```bash
# 直接在浏览器中打开
open index.html

# 或使用本地服务器
npx serve .
```

## 部署

本项目通过 GitHub Actions 自动部署到 Netlify。

每次推送代码到 `main` 分支时，会自动触发部署流程。

## 模型配置

点击右上角齿轮图标打开模型设置面板，支持：

| 提供商 | 模型 |
|---|---|
| OpenAI | gpt-4o, gpt-4o-mini |
| Anthropic | claude-3-5-sonnet, claude-3-haiku |
| DeepSeek | deepseek-chat, deepseek-reasoner |
| 自定义 API | 兼容 OpenAI API 格式的任意端点 |
| ProLATO 自训练 | 流程工业专属大模型（即将上线） |

API Key 仅存储在浏览器本地，不会上传到任何服务器。
