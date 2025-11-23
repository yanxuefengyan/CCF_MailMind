const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 构建目录
const DIST_DIR = path.join(__dirname, '../dist');
// 源文件目录
const SRC_DIR = path.join(__dirname, '../src');
// 公共资源目录
const PUBLIC_DIR = path.join(__dirname, '../public');

// 确保目录存在
function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 复制文件或目录
function copyFileOrDir(source, target) {
  if (fs.lstatSync(source).isDirectory()) {
    ensureDirExists(target);
    fs.readdirSync(source).forEach(file => {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      copyFileOrDir(sourcePath, targetPath);
    });
  } else {
    fs.copyFileSync(source, target);
  }
}

// 主构建流程
async function build() {
  console.log('🚀 开始构建 MailMind Assistant 扩展...');
  
  // 清空构建目录
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  ensureDirExists(DIST_DIR);
  
  // 运行 Vite 构建
  console.log('📦 执行 Vite 构建...');
  await new Promise((resolve, reject) => {
    exec('npx vite build', (error) => {
      if (error) {
        console.error('❌ 构建失败:', error);
        reject(error);
        return;
      }
      resolve();
    });
  });
  
  // 复制 manifest.json 和其他静态资源
  console.log('?? 复制静态资源...');
  copyFileOrDir(path.join(PUBLIC_DIR, 'manifest.json'), path.join(DIST_DIR, 'manifest.json'));
  
  // 复制图标
  if (fs.existsSync(path.join(PUBLIC_DIR, 'icons'))) {
    ensureDirExists(path.join(DIST_DIR, 'icons'));
    copyFileOrDir(path.join(PUBLIC_DIR, 'icons'), path.join(DIST_DIR, 'icons'));
  }
  
  // 创建占位图标（如果图标文件不存在）
  const iconSizes = [16, 32, 48, 128];
  ensureDirExists(path.join(DIST_DIR, 'icons'));
  
  iconSizes.forEach(size => {
    const iconPath = path.join(DIST_DIR, 'icons', `icon${size}.png`);
    if (!fs.existsSync(iconPath)) {
      console.log(`⚠️ 图标不存在，创建占位图标: ${size}x${size}`);
      // 创建简单的占位图标文件
      const canvas = require('canvas').createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // 简单的蓝色图标
      ctx.fillStyle = '#1890ff';
      ctx.fillRect(0, 0, size, size);
      
      // 添加文本
      if (size >= 32) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${size/3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('MM', size/2, size/2);
      }
      
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(iconPath, buffer);
    }
  });
  
  console.log('✅ 构建完成！输出目录: dist/');
}

// 执行构建
build().catch(err => {
  console.error('构建过程中发生错误:', err);
  process.exit(1);
});