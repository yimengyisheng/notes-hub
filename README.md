# 📚 我的读书笔记（notes-hub）

统一在线阅读站：一个网址，选择不同的读书笔记并阅读。
线上地址：<https://yimengyisheng.github.io/notes-hub/>

v1 收录：
- 📝 101-后端技术面试38讲（44 篇）
- 📘 架构康奈尔笔记（56 章）

> 说明：A4 打印版 PNG 体积较大（约 65MB），中心站不重复打包，阅读页的打印按钮直接引用原站图片。

## 如何重新生成站点

数据源在各笔记自己的仓库中，本仓库通过「构建时聚合」把数据复制进 `docs/`：

```bash
python3 generator/build_site.py
```

- 每本书优先读取同级目录下的源仓库（如 `../backend38-interview-qa`），
  不存在时会自动 `git clone --depth 1` 到 `.cache/`（已 gitignore）。
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
- `cornell`：源仓库需含 `data/chNN.json`（康奈尔章节数据），并可在配置里带 `sections` 分组
  （`[{ "name": "...", "nums": [1,2,3] }]`）。A4 打印版 PNG 体积较大，中心站不重复打包，
  阅读页的「🖨️ A4 打印版」按钮通过 `homeUrl + 'images/chNN.png'` 跨站引用原站图片，
  因此 cornell 型书籍需保证原站 `homeUrl` 已发布且该路径可访问。
- 其它格式（如问答型）可仿照 `generator/build_site.py` 增加新的构建分支，并在前端
  `generator/templates/app.js` 中增加对应渲染器。

## 说明

- 内容均为个人学习笔记，版权归原作者所有，仅供学习交流。
- markdown 渲染使用内置 [marked](https://github.com/markedjs/marked)（MIT 许可，已内置到 `docs/assets/vendor/`）。
