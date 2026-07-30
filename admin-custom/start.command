#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"     # admin-custom/
ROOT="$(cd "$DIR/.." && pwd)"           # spring-wedding-git/
cd "$ROOT"
# 本地预览前确保缩略图存在（增量生成，已有则跳过，通常很快）
python3 tools/gen-cover-thumbs.py >/dev/null 2>&1 || true
python3 tools/gen-gallery-thumbs.py >/dev/null 2>&1 || true
cd "$DIR"
PORT=5055 nohup node admin-custom/server.js > /tmp/admin-custom.log 2>&1 &
sleep 2
open http://localhost:5055
echo "编辑器已启动：http://localhost:5055  （关闭此窗口不影响服务运行）"
