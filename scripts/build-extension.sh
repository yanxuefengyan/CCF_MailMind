#!/bin/bash

# MailMind Assistant 构建脚本

echo "🚀 开始构建 MailMind Assistant Chrome扩展..."

# 清理旧的构建文件
echo "🧹 清理旧的构建文件..."
rm -rf dist

# 执行 Vite 构建
echo "📦 执行 Vite 构建..."
npm run build

# 检查构建是否成功
if [ $? -ne 0 ]; then
  echo "❌ Vite 构建失败"
  exit 1
fi

# 复制 manifest.json 到 dist 目录
echo "📄 复制 manifest.json..."
cp public/manifest.json dist/

# 复制图标文件（如果存在）
if [ -d "public/icons" ]; then
  echo "🖼️ 复制图标文件..."
  mkdir -p dist/icons
  cp -r public/icons/* dist/icons/ 2>/dev/null || true
fi

# 创建占位图标（如果图标不存在）
for size in 16 32 48 128; do
  if [ ! -f "dist/icons/icon${size}.png" ]; then
    echo "⚠️ 创建占位图标: ${size}x${size}"
    # 这里需要安装 ImageMagick 才能工作
    # convert -size ${size}x${size} xc:#1890ff -gravity center -pointsize $((size/3)) -fill white -annotate +0+0 "MM" dist/icons/icon${size}.png
  fi
done

echo "✅ 构建完成！"
echo "📁 输出目录: dist/"
echo ""
echo "下一步操作："
echo "1. 打开 Chrome 浏览器，访问 chrome://extensions/"
echo "2. 开启右上角的'开发者模式'"
echo "3. 点击'加载已解压的扩展程序'"
echo "4. 选择项目的 dist 目录"
echo ""
echo "🎉 享受使用 MailMind Assistant!"