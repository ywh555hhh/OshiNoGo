# OshiNoGo

<p align="center">
  <img src="./frontend/logo.svg" alt="OshiNoGo logo" width="360" />
</p>

<p align="center">
  一个以《我推的孩子》梗味做点缀的五十音训练器：主打 <strong>recognition / dictation / words</strong> 三种模式，帮助你把假名识别、听写和整词拼读练成更稳定的条件反射。
</p>

<p align="center">
  <a href="https://ywh555hhh.github.io/OshiNoGo/">GitHub Pages</a>
</p>

## 三种模式

- **recognition**：看单个假名，立刻输入 romaji。
- **dictation**：听到发音，立刻写出对应假名。
- **words**：看纯平假名单词，先尝试自己读，再播放和对照答案。

推荐顺序：**recognition → dictation → words**。

## 技术结构

- 前端：`frontend/` 下的 Vite + React + TypeScript + Tailwind
- 后端：`app/main.py`，只负责托管前端静态资源
- 数据持久化：浏览器本地 `localStorage`
- 语音能力：浏览器原生 `speechSynthesis`

## 本地运行

### 1) 前端开发模式

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

### 2) 前端构建

```bash
npm run build --prefix frontend
```

### 3) FastAPI 托管前端

```bash
uv run python -m app.main
```

默认会启动在 `http://127.0.0.1:8000`。

## GitHub Pages 部署

仓库当前 GitHub Pages 地址：

- `https://ywh555hhh.github.io/OshiNoGo/`

用于 Pages 的构建命令：

```bash
npm run build:pages --prefix frontend
```

这个命令会自动使用 `/OshiNoGo/` 作为 Vite `base`，避免资源路径在 Pages 下失效。

## 托管行为

FastAPI 当前提供：

- `/`：返回前端首页
- `/healthz`：健康检查
- `/assets/*`：前端构建产物
- 其他前端路径：走 SPA fallback，回到 `index.html`
- `frontend/dist` 不完整时：自动回退到旧 `static/` 页面

## 浏览器与语音支持

推荐使用：

- 最新版 Chrome / Edge / Safari
- 已安装系统日语语音包的环境

说明：

- `dictation` 和 `words` 依赖浏览器原生 `speechSynthesis`
- 不同浏览器、系统语音包、设备上的效果可能不同
- 页面会区分 `ready / limited / unsupported` 三档语音状态并给出提示
- 如果语音不可用，建议优先使用 `recognition`

## 本地保存边界

以下数据会保存在当前浏览器：

- 主题
- 上次打开的训练模式
- onboarding 完成状态
- recognition / dictation 的题库偏好、文字种类、题量
- recognition / dictation 的累计统计与最近一次训练摘要
- words 的累计练习次数

不会保存：

- 无限增长的历史日志
- 跨设备同步数据
- 账号信息

## 已知限制

- 没有账号系统、云同步、数据库或服务端 TTS
- 语音质量完全受浏览器和系统语音包影响
- `words` 仍是轻量训练模式，不是完整考试系统
- 本地 `localStorage` 被清理后，偏好和累计统计会一并丢失

## 验证命令

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
uv run python -c "import app.main; print('ok')"
```
