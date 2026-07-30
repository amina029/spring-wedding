#!/usr/bin/env python3
"""
为所有项目封面图生成轻量缩略图，用于页面显示（卡片 / 下一个项目预览）。
原图保留用于微信分享(og:image)。缩略图命名：<原图stem>.thumb.webp
- 最长边 <= MAX_EDGE (默认 1000px，足够手机 retina 显示)
- WebP 质量 QUALITY
- 仅在缩略图不存在、或源文件比缩略图新时重生成（幂等、可重复跑）
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # spring-wedding-git/
CONTENT = ROOT / "content" / "projects"
MEDIA = ROOT / "media" / "projects"

MAX_EDGE = 1000
QUALITY = 80

try:
    from PIL import Image
    HAVE_PILLOW = True
except Exception:
    HAVE_PILLOW = False


def cover_to_thumb(cover: str) -> str:
    """/media/projects/x/gallery-01.jpg -> /media/projects/x/gallery-01.thumb.webp"""
    if not cover:
        return cover
    stem, _ = os.path.splitext(cover)
    return stem + ".thumb.webp"


def gen_one(cover: str) -> str:
    src = ROOT / cover.lstrip("/")
    out = ROOT / cover_to_thumb(cover).lstrip("/")
    if not src.exists():
        print(f"  [skip] 源文件不存在: {src}")
        return ""
    if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
        return str(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        with Image.open(src) as im:
            im = im.convert("RGB")
            im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
            im.save(out, "WEBP", quality=QUALITY, method=4)
        return str(out)
    except Exception as e:
        print(f"  [err] {src}: {e}")
        return ""


def main():
    if not HAVE_PILLOW:
        print("[warn] 未安装 Pillow，跳过缩略图生成（构建继续）。")
        print("        本地安装: python3 -m pip install --user Pillow")
        return 0
    if not CONTENT.exists():
        print(f"[warn] 找不到 {CONTENT}，跳过。")
        return 0

    done = 0
    for f in sorted(CONTENT.glob("*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            continue
        cover = d.get("cover")
        if not cover:
            continue
        out = gen_one(cover)
        if out:
            kb = os.path.getsize(out) / 1024
            print(f"  [ok] {Path(out).relative_to(ROOT)}  ({kb:.0f} KB)")
            done += 1
    print(f"完成：生成/更新 {done} 张封面缩略图。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
