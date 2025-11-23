const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '../dist');
const PUBLIC_DIR = path.join(__dirname, '../public');

// 创建dist目录
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR);
}

// 复制manifest.json
fs.copyFileSync(path.join(PUBLIC_DIR, 'manifest.json'), path.join(DIST_DIR, 'manifest.json'));

// 复制background.js
fs.copyFileSync(path.join(PUBLIC_DIR, 'background.js'), path.join(DIST_DIR, 'background.js'));

// 复制content.js
fs.copyFileSync(path.join(PUBLIC_DIR, 'content.js'), path.join(DIST_DIR, 'content.js'));

// 复制图标文件（如果存在）
const iconSizes = [16, 32, 48, 128];
iconSizes.forEach(size => {
  const iconPath = path.join(PUBLIC_DIR, `icon${size}.png`);
  if (fs.existsSync(iconPath)) {
    fs.copyFileSync(iconPath, path.join(DIST_DIR, `icon${size}.png`));
  }
});

console.log('简单构建完成！输出目录: dist/');