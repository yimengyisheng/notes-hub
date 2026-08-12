# 📚 我的读书笔记（notes-hub）

统一在线阅读站：一个网址，选择不同的读书笔记并阅读。
线上地址：<https://yimengyisheng.github.io/notes-hub/>

当前收录：
- 📘 《从零开始学架构》康奈尔笔记（56 章）
- 🐬 《MySQL实战45讲》康奈尔笔记（42 章）
- 🌐 《趣谈网络协议》康奈尔笔记（40 章）
- 📗 《图解HTTP》康奈尔笔记（11 章 · 58 小节）
- 🏛️ 《许式伟的架构课》康奈尔笔记（87 讲）

> 说明：A4 打印版 PNG 体积较大（约 65MB），中心站不重复打包，阅读页的打印按钮直接引用原站图片。

## 如何重新生成站点

数据源在各笔记自己的仓库中，本仓库通过「构建时聚合」把数据复制进 `docs/`：

```bash
python3 generator/build_site.py
```

- 每本书的数据源：`srcRepo` 优先读同级目录下的源仓库（如 `../backend38-interview-qa`），
  不存在时自动 `git clone --depth 1` 到 `.cache/`（已 gitignore）；也可用 `srcPath`
  直接指向本地目录（如本机未发布的 MySQL 笔记）。
- 生成结果写入 `docs/`，提交后由 GitHub Pages（main 分支 `/docs`）发布。
- 笔记源仓库更新后，重跑一次本脚本并提交即可同步。

本地预览：

```bash
python3 -m http.server 8000 --directory docs
# 打开 http://localhost:8000
```

## 如何新增一本笔记

1. 在根目录 `books.json` 的 `books` 数组中加一条配置：

```json
{
  "id": "my-notes",
  "title": "书名",
  "emoji": "📗",
  "desc": "简介",
  "type": "markdown",
  "srcRepo": "yimengyisheng/xxx",
  "homeUrl": "https://yimengyisheng.github.io/xxx/"
}
```

2. 重跑 `python3 generator/build_site.py` 并提交。

支持的 `type`：

- `markdown`：源仓库需含 `data/index.json`（`articles[].num/title/slug`）+ `data/articles/<slug>.md`。
- `cornell`：源仓库需含 `data/chNN.json`（康奈尔章节数据；若数据在别的目录，可用 `dataDir` 指定，如 `"work"`）。
  也支持小节粒度的 `NN-x.y.json` 子章节文件（如 `01-1.1.json`，`num` 为 `"01-1.1"`），
  并可在配置里带 `sections` 分组（`[{ "name": "...", "nums": ["01-1.1", ...] }]`，nums 用字符串小节号）。
  可选 `unit` 字段定制卡片数量单位（如 `"节"`，默认 cornell 为 `"章"`）。A4 打印版 PNG 体积较大，中心站不重复打包，
  阅读页的「🖨️ A4 打印版」按钮通过 `homeUrl + 'images/chNN.png'` 跨站引用原站图片，
  因此 cornell 型书籍需保证原站 `homeUrl` 已发布且该路径可访问。
- 其它格式（如问答型）可仿照 `generator/build_site.py` 增加新的构建分支，并在前端
  `generator/templates/app.js` 中增加对应渲染器。

## 说明

- 内容均为个人学习笔记，版权归原作者所有，仅供学习交流。
- markdown 渲染使用内置 [marked](https://github.com/markedjs/marked)（MIT 许可，已内置到 `docs/assets/vendor/`）。
