#!/usr/bin/env python3
"""
为所有内页画廊图生成 WebP 轻量优化版，供页面加载（原图全部保留，零质量损失）。
输出命名：<原图stem>.gthumb.webp

- 最长边 <= 1600px（画廊显示区域比封面卡大，给足清晰度）
- WebP 质量 82
- 保留透明通道：带透明的 PNG 直接转 RGBA-WebP，不会变黑底
- 仅在输出不存在、或源文件比输出新时重生成（幂等、可重复跑）
- 自动跳过视频(.mp4 等)、已生成的缩略图(.thumb/.gthumb.webp)、非图片文件
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # spring-wedding-git/
MEDIA = ROOT / "media"

MAX_EDGE = 1600
QUALITY = 82
IMG_EXT = {'.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp', '.tif', '.tiff', '.gif'}

try:
    from PIL import Image
    HAVE_PILLOW = True
except Exception:
    HAVE_PILLOW = False


def gen_one(src: Path):
    stem = src.with_suffix('')
    out = stem.with_suffix('.gthumb.webp')
    if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
        return False
    out.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
        # 真实透明检测：仅当 alpha 通道存在非完全不透明像素时才保留透明
        has_alpha = False
        if im.mode in ('RGBA', 'LA'):
            alpha = im.split()[-1]
            has_alpha = alpha.getextrema()[0] < 255
        elif im.mode == 'P' and 'transparency' in im.info:
            has_alpha = True
        if has_alpha:
            im = im.convert('RGBA')
            im.save(out, 'WEBP', lossless=True)        # 无损保留透明，避免黑底
        else:
            im = im.convert('RGB')
            im.save(out, 'WEBP', quality=QUALITY, method=4)
    return True


def main():
    if not HAVE_PILLOW:
        print("[warn] 未安装 Pillow，跳过画廊缩略图生成（构建继续）。")
        print("        本地安装: python3 -m pip install --user Pillow")
        return 0
    if not MEDIA.exists():
        print(f"[warn] 找不到 {MEDIA}，跳过。")
        return 0

    done = 0
    skipped = 0
    for p in sorted(MEDIA.rglob("*")):
        if not p.is_file():
            continue
        ext = p.suffix.lower()
        if ext not in IMG_EXT:
            continue
        if ext == '.webp' and ('.thumb.webp' in p.name or '.gthumb.webp' in p.name):
            continue
        try:
            if gen_one(p):
                kb = os.path.getsize(p.with_suffix('.gthumb.webp')) / 1024
                print(f"  [ok] {p.relative_to(ROOT)} -> {kb:.0f} KB")
                done += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  [err] {p.relative_to(ROOT)}: {e}")
    print(f"完成：新增/更新 {done} 张画廊缩略图（跳过 {skipped} 张已是最新）。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
