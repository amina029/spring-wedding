#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
PORT=5055 nohup node admin-custom/server.js > /tmp/admin-custom.log 2>&1 &
sleep 2
open http://localhost:5055
echo "编辑器已启动：http://localhost:5055  （关闭此窗口不影响服务运行）"
