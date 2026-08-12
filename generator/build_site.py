#!/usr/bin/env python3
"""生成读书笔记中心站 notes-hub（构建时聚合）。

用法:
    python3 generator/build_site.py

读取根目录 books.json；每本书的数据源优先取同级目录 ../<仓库名>，
不存在则 git clone --depth 1 到 .cache/。
数据规整到 docs/data/<id>/ 并生成每本书的 manifest.json，模板拷贝进 docs/。
docs/ 为 GitHub Pages 源（main 分支 /docs）。
"""
import glob
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEN = os.path.join(ROOT, "generator")
TEMPLATES = os.path.join(GEN, "templates")
DOCS = os.path.join(ROOT, "docs")
CACHE = os.path.join(ROOT, ".cache")

MARKDOWN = "markdown"
CORNELL = "cornell"


def load_books():
    with open(os.path.join(ROOT, "books.json"), encoding="utf-8") as f:
        return json.load(f)


def get_src(book):
    """返回 (源码目录, 来源说明)。

    优先使用 book.srcPath 本地目录；否则用 book.srcRepo：
    先找同级目录 ../<仓库名>，不存在则浅克隆到 .cache/。
    """
    if book.get("srcPath"):
        p = book["srcPath"]
        if not os.path.isdir(p):
            sys.exit(f"srcPath 不存在: {p}（{book['id']}）")
        return p, "本地路径"
    repo = book["srcRepo"]  # "owner/name"
    name = repo.split("/")[-1]
    sibling = os.path.join(os.path.dirname(ROOT), name)
    if os.path.isdir(sibling):
        return sibling, "同级目录"
    cache_dir = os.path.join(CACHE, name)
    if not os.path.isdir(cache_dir):
        os.makedirs(CACHE, exist_ok=True)
        subprocess.run(
            ["git", "clone", "--depth", "1",
             f"https://github.com/{repo}.git", cache_dir],
            check=True,
        )
    return cache_dir, ".cache"


def build_markdown(book, src, out_dir):
    """markdown 型：index.json + articles/*.md → docs/data/<id>/"""
    src_data = os.path.join(src, book.get("dataDir", "data"))
    shutil.copy2(os.path.join(src_data, "index.json"), os.path.join(out_dir, "index.json"))
    arts_dir = os.path.join(out_dir, "articles")
    os.makedirs(arts_dir, exist_ok=True)
    for md in glob.glob(os.path.join(src_data, "articles", "*.md")):
        shutil.copy2(md, os.path.join(arts_dir, os.path.basename(md)))
    with open(os.path.join(src_data, "index.json"), encoding="utf-8") as f:
        idx = json.load(f)
    return [
        {"num": a["num"], "title": a["title"], "slug": a["slug"]}
        for a in idx.get("articles", [])
    ]


def _num_key(num):
    """章节号自然排序：'01' → [1]；子章节 '01-1.2' → [1, 1, 2]。"""
    try:
        if "-" in str(num):
            a, b = str(num).split("-", 1)
            return [int(a)] + [int(x) for x in str(b).split(".")]
        return [int(num)]
    except (ValueError, TypeError):
        return [str(num)]


def build_cornell(book, src, out_dir):
    """cornell 型：ch*.json（或 NN-x.y.json 子章节）→ docs/data/<id>/chapters/。

    A4 打印版 PNG 体积较大，不重复打包进中心站，
    前端通过 book.homeUrl + 'images/chNN.png' 跨站引用原站资源。
    """
    src_data = os.path.join(src, book.get("dataDir", "data"))
    chapters_dir = os.path.join(out_dir, "chapters")
    os.makedirs(chapters_dir, exist_ok=True)
    files = sorted(glob.glob(os.path.join(src_data, "ch*.json"))) + \
            sorted(glob.glob(os.path.join(src_data, "[0-9]*-[0-9]*.json"))) + \
            sorted(glob.glob(os.path.join(src_data, "[0-9]*.json")))
    chapters = []
    for p in sorted(set(files)):
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        chapters.append({"num": d["num"], "title": d["topic"],
                         "oneliner": d.get("oneliner", "")})
        shutil.copy2(p, os.path.join(chapters_dir, "ch" + d["num"] + ".json"))
    chapters.sort(key=lambda c: _num_key(c["num"]))
    return chapters


def write_manifest(book, chapters, out_dir):
    manifest = {
        "id": book["id"],
        "type": book["type"],
        "count": len(chapters),
        "chapters": chapters,
    }
    if book["type"] == CORNELL:
        manifest["sections"] = book.get("sections", [])
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


def main():
    cfg = load_books()
    if os.path.isdir(DOCS):
        shutil.rmtree(DOCS)
    os.makedirs(os.path.join(DOCS, "assets", "vendor"))
    os.makedirs(os.path.join(DOCS, "data"))

    shutil.copy2(os.path.join(TEMPLATES, "index.html"), os.path.join(DOCS, "index.html"))
    shutil.copy2(os.path.join(TEMPLATES, "app.css"), os.path.join(DOCS, "assets", "app.css"))
    shutil.copy2(os.path.join(TEMPLATES, "app.js"), os.path.join(DOCS, "assets", "app.js"))
    shutil.copy2(os.path.join(TEMPLATES, "vendor", "marked.min.js"),
                 os.path.join(DOCS, "assets", "vendor", "marked.min.js"))
    shutil.copy2(os.path.join(ROOT, "books.json"), os.path.join(DOCS, "data", "books.json"))

    total = 0
    for book in cfg.get("books", []):
        src, how = get_src(book)
        out_dir = os.path.join(DOCS, "data", book["id"])
        os.makedirs(out_dir, exist_ok=True)
        if book["type"] == MARKDOWN:
            chapters = build_markdown(book, src, out_dir)
        elif book["type"] == CORNELL:
            chapters = build_cornell(book, src, out_dir)
        else:
            sys.exit(f"未知书籍类型: {book['type']} ({book['id']})")
        write_manifest(book, chapters, out_dir)
        total += len(chapters)
        unit = book.get("unit", "章" if book["type"] == CORNELL else "篇")
        print(f"OK {book['id']}: {len(chapters)} {unit}（数据源: {how}）")

    print(f"完成 → docs/（共 {len(cfg.get('books', []))} 本 / {total} 条目）")


if __name__ == "__main__":
    main()
