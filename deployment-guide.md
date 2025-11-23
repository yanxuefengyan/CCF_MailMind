# MailMind Assistant - 部署指南

## 1. 部署架构概览

MailMind Assistant 采用多层架构部署，包括:

1. **Chrome/Edge 扩展**：部署在用户浏览器端
2. **后端API服务**：可选部署，提供高级功能支持
3. **AI服务集成**：通过API访问百度文心大模型

部署拓扑图:

```
用户浏览器端:
┌───────────────────┐    ┌───────────────┐
│  Chrome/Edge 插件  │◄───┤ 本地存储缓存  │
└─────────┬─────────┘    └───────────────┘
          │
          ▼
  ┌───────────────────┐
  │  互联网连接       │
  └─────────┬─────────┘
            │                  ┌────────────────┐
            │                  │                │
            ▼                  ▼                │
┌─────────────────────┐    ┌──────────────────┐ │
│ MailMind API服务器  │◄───┤ 监控和日志系统   │ │
└─────────┬───────────┘    └──────────────────┘ │
          │                                     │
          ▼                                     │
┌─────────────────────┐                         │
│   文心大模型API     │─────────────────────────┘
└─────────────────────┘
```

---

## 2. 前端扩展部署

### 2.1 构建生产版本

```bash
# 克隆仓库
git clone https://github.com/your-org/mailmind-assistant.git
cd mailmind-assistant

# 安装依赖
npm install

# 构建生产版本
npm run build

# 输出目录: ./dist
```

### 2.2 浏览器扩展商店发布

#### 2.2.1 Chrome Web Store 发布流程

1. **准备发布材料**
   - 扩展打包文件 (.zip)
   - 扩展图标 (128x128 px)
   - 至少一张截图 (1280x800 px)
   - 详细的描述文本

2. **上传到 Chrome Web Store**
   - 访问 [Chrome 开发者控制台](https://chrome.google.com/webstore/devconsole)
   - 点击"添加新项目"
   - 上传打包好的扩展文件
   - 填写所有必要信息
   - 支付一次性开发者注册费 ($5.00 USD)

3. **审核和发布**
   - 提交审核 (通常需要 2-3 天)
   - 收到批准后发布
   - 监控使用数据和反馈

#### 2.2.2 Edge Add-ons 发布流程

1. **准备发布材料** (与 Chrome 相同)

2. **上传到 Edge Add-ons 门户**
   - 访问 [Edge 开发者控制台](https://partner.microsoft.com/en-us/dashboard/microsoftedge)
   - 创建新的扩展项目
   - 上传打包好的扩展文件
   - 填写产品详情
   - 设置产品可用性和定价

3. **审核和发布** (通常需要 3-5 天)

### 2.3 企业内部部署

#### 2.3.1 通过组策略部署 (Windows 环境)

1. **准备扩展文件**
   - 构建生产版本
   - 确保 `manifest.json` 中包含唯一的 `"id"` 字段

2. **创建组策略**
   - 打开组策略编辑器
   - 导航至 `计算机配置 > 管理模板 > Google Chrome > 扩展程序`
   - 配置"配置扩展程序安装"策略

3. **示例 JSON 配置**
   ```json
   {
     "ExtensionSettings": {
       "your-extension-id": {
         "installation_mode": "force_installed",
         "update_url": "https://your-update-server.com/updates.xml"
       }
     }
   }
   ```

#### 2.3.2 自定义更新服务器

1. **创建更新清单文件 (updates.xml)**
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
     <app appid="your-extension-id">
       <updatecheck codebase="https://your-server.com/mailmind-assistant.crx" version="1.0.0" />
     </app>
   </gupdate>
   ```

2. **托管 .crx 文件**
   - 生成 .crx 文件 (打包扩展)
   - 在企业内部服务器上托管该文件
   - 确保服务器配置了正确的 MIME 类型

---

## 3. 后端API服务部署

### 3.1 服务器要求

- **CPU:** 4+ 核心
- **内存:** 最低 8GB，推荐 16GB+
- **存储:** 50GB+ SSD
- **网络:** 100Mbps+，稳定连接
- **操作系统:** Ubuntu 22.04 LTS / Debian 11+ / CentOS 8+

### 3.2 Docker 部署

#### 3.2.1 使用 Docker Compose

创建 `docker-compose.yml` 文件:

```yaml
version: '3.8'

services:
  api:
    image: mailmind/api-server:latest
    container_name: mailmind-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - WENXIN_API_KEY=${WENXIN_API_KEY}
      - WENXIN_SECRET_KEY=${WENXIN_SECRET_KEY}
      - LOG_LEVEL=info
      - RATE_LIMIT_MAX=100
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    networks:
      - mailmind-network

networks:
  mailmind-network:
    driver: bridge
```

运行容器:

```bash
# 创建环境变量文件
cat > .env << EOL
WENXIN_API_KEY=your_api_key_here
WENXIN_SECRET_KEY=your_secret_key_here
EOL

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

#### 3.2.2 健康检查配置

添加健康检查到 Docker Compose 配置:

```yaml
services:
  api:
    # ... 其他配置 ...
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 3.3 Kubernetes 部署

#### 3.3.1 部署 YAML 文件

创建 `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mailmind-api
  namespace: mailmind
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mailmind-api
  template:
    metadata:
      labels:
        app: mailmind-api
    spec:
      containers:
      - name: mailmind-api
        image: mailmind/api-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: WENXIN_API_KEY
          valueFrom:
            secretKeyRef:
              name: mailmind-secrets
              key: wenxin-api-key
        - name: WENXIN_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: mailmind-secrets
              key: wenxin-secret-key
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 15
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: mailmind-api
  namespace: mailmind
spec:
  selector:
    app: mailmind-api
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

创建 Secret:

```bash
kubectl create namespace mailmind

kubectl create secret generic mailmind-secrets \
  --namespace=mailmind \
  --from-literal=wenxin-api-key=your_api_key_here \
  --from-literal=wenxin-secret-key=your_secret_key_here
```

应用部署:

```bash
kubectl apply -f deployment.yaml
```

#### 3.3.2 配置 Ingress

创建 `ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mailmind-api-ingress
  namespace: mailmind
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.mailmind.com
    secretName: mailmind-tls
  rules:
  - host: api.mailmind.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mailmind-api
            port:
              number: 80
```

应用 Ingress:

```bash
kubectl apply -f ingress.yaml
```

### 3.4 传统服务器部署

#### 3.4.1 手动部署流程

1. **环境准备**

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2
```

2. **克隆和构建应用**

```bash
# 克隆代码
git clone https://github.com/your-org/mailmind-api.git
cd mailmind-api

# 安装依赖
npm ci --production

# 配置环境变量
cat > .env << EOL
NODE_ENV=production
PORT=3000
WENXIN_API_KEY=your_api_key_here
WENXIN_SECRET_KEY=your_secret_key_here
EOL
```

3. **使用 PM2 管理进程**

```bash
# 启动服务
pm2 start dist/index.js --name "mailmind-api" --env production

# 配置开机自启
pm2 startup
pm2 save

# 监控服务
pm2 monit
```

#### 3.4.2 Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name api.mailmind.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

4. **配置 SSL (使用 Certbot)**

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取并配置SSL证书
sudo certbot --nginx -d api.mailmind.com
```

---

## 4. 环境配置与优化

### 4.1 性能优化

#### 4.1.1 Node.js 优化

调整 Node.js 内存配置:

```bash
# 增加堆内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### 4.1.2 API服务器优化

优化 Express.js 性能:

```javascript
// 启用压缩
app.use(compression());

// 启用响应缓存
app.use(responseTime());

// 配置超时
app.use(timeout('30s'));
```

#### 4.1.3 监控资源使用

```bash
# 安装监控工具
npm install -g clinic

# 分析服务器性能
clinic doctor -- node dist/index.js
```

### 4.2 负载均衡设置

#### 4.2.1 Nginx 负载均衡配置

```nginx
upstream mailmind_api {
    least_conn;
    server api1.internal:3000;
    server api2.internal:3000;
    server api3.internal:3000;
}

server {
    listen 80;
    server_name api.mailmind.com;
    
    location / {
        proxy_pass http://mailmind_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4.2.2 会话粘性配置

```nginx
upstream mailmind_api {
    ip_hash;
    server api1.internal:3000;
    server api2.internal:3000;
    server api3.internal:3000;
}
```

### 4.3 缓存策略配置

#### 4.3.1 Redis 缓存配置

安装和配置 Redis:

```bash
# 安装 Redis
sudo apt install -y redis-server

# 编辑 Redis 配置
sudo nano /etc/redis/redis.conf

# 设置密码和其他优化项
# maxmemory 500mb
# maxmemory-policy allkeys-lru
```

在应用中使用 Redis:

```javascript
import { createClient } from 'redis';

const redisClient = createClient({
  url: 'redis://localhost:6379',
  password: 'your_redis_password'
});

// 缓存函数
async function getOrSetCache(key, ttl, fetchFn) {
  const cached = await redisClient.get(key);
  if (cached) return JSON.parse(cached);
  
  const freshData = await fetchFn();
  await redisClient.set(key, JSON.stringify(freshData), { EX: ttl });
  return freshData;
}
```

---

## 5. 安全配置

### 5.1 API安全设置

#### 5.1.1 API密钥轮换策略

实施自动密钥轮换:

```bash
#!/bin/bash
# api_key_rotation.sh

# 生成新的API密钥
NEW_API_KEY=$(openssl rand -hex 32)

# 添加新密钥到数据库
echo "INSERT INTO api_keys (key_value, created_at, expires_at) VALUES ('$NEW_API_KEY', NOW(), NOW() + INTERVAL '30 days');" | psql -U dbuser -d mailmind

# 通知管理员
echo "New API key generated: $NEW_API_KEY" | mail -s "API Key Rotation" admin@mailmind.com
```

配置自动执行:

```bash
# 每月执行一次
echo "0 0 1 * * /path/to/api_key_rotation.sh" | crontab -
```

#### 5.1.2 API限流配置

在 Express.js 中实现限流:

```javascript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每IP限制请求数
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: '请求过于频繁，请稍后再试'
  }
});

// 应用到所有API路由
app.use('/api/', apiLimiter);

// 为不同端点设置不同限制
const draftLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 50,
  standardHeaders: true
});
app.use('/api/v1/email/draft', draftLimiter);
```

### 5.2 数据安全与合规

#### 5.2.1 数据加密

敏感数据加密示例:

```javascript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 应当是32字节
const IV_LENGTH = 16;

// 加密函数
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// 解密函数
function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

#### 5.2.2 GDPR合规配置

数据保留策略实现:

```javascript
// 数据自动清理作业
async function cleanupExpiredData() {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - 90); // 90天数据保留期
  
  await db.collection('email_data').deleteMany({
    createdAt: { $lt: expiryDate },
    retentionExempt: { $ne: true }
  });
  
  console.log('Cleaned up expired data');
}

// 每天执行清理
schedule.scheduleJob('0 0 * * *', cleanupExpiredData);
```

### 5.3 HTTPS配置

#### 5.3.1 SSL证书自动更新

Certbot自动更新配置:

```bash
# 检查更新是否正常
sudo certbot renew --dry-run

# 添加到crontab
echo "0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'" | sudo tee -a /etc/crontab
```

#### 5.3.2 强化SSL配置

Nginx SSL优化配置:

```nginx
server {
    listen 443 ssl http2;
    server_name api.mailmind.com;
    
    ssl_certificate /etc/letsencrypt/live/api.mailmind.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.mailmind.com/privkey.pem;
    
    # 现代化SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # HSTS设置
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # 其他安全头
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # 其余配置...
}
```

---

## 6. 监控与日志

### 6.1 日志配置

#### 6.1.1 服务器日志设置

使用 Winston 配置结构化日志:

```javascript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'mailmind-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new DailyRotateFile({
      filename: 'logs/mailmind-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.json()
    }),
    new DailyRotateFile({
      filename: 'logs/mailmind-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: winston.format.json()
    })
  ]
});

export default logger;
```

#### 6.1.2 日志轮转

使用 logrotate 配置:

```
# /etc/logrotate.d/mailmind
/var/log/mailmind/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -s /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

### 6.2 监控配置

#### 6.2.1 Prometheus 监控

配置Node.js应用暴露metrics:

```javascript
import express from 'express';
import client from 'prom-client';

const app = express();
const collectDefaultMetrics = client.collectDefaultMetrics;

// 收集默认指标
collectDefaultMetrics({ timeout: 5000 });

// 自定义指标
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP请求持续时间',
  labelNames: ['method', 'route', 'status'],
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000]
});

// 中间件记录请求持续时间
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode
    });
  });
  next();
});

// 暴露metrics端点
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

#### 6.2.2 Grafana 仪表盘配置

Grafana Docker Compose配置:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_USER=${ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

Prometheus配置文件 (prometheus.yml):

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'mailmind-api'
    scrape_interval: 5s
    static_configs:
      - targets: ['api:3000']
```

### 6.3 报警配置

#### 6.3.1 配置Prometheus报警

Prometheus报警规则 (rules.yml):

```yaml
groups:
  - name: mailmind-alerts
    rules:
      - alert: HighRequestLatency
        expr: http_request_duration_ms{quantile="0.9"} > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High request latency on {{ $labels.instance }}"
          description: "90th percentile of request latency is above 1s for 5 minutes."
          
      - alert: ApiEndpointDown
        expr: up{job="mailmind-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API endpoint is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute."
```

#### 6.3.2 配置Slack/Email报警

Alertmanager配置 (alertmanager.yml):

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR-WEBHOOK-URL'

route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'job']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  
  routes:
  - match:
      severity: critical
    receiver: 'slack-notifications'
    continue: true
  
  - match:
      severity: warning
    receiver: 'email-notifications'

receivers:
- name: 'slack-notifications'
  slack_configs:
  - channel: '#alerts'
    send_resolved: true
    title: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
    text: "{{ .CommonAnnotations.description }}"
    
- name: 'email-notifications'
  email_configs:
  - to: 'team@mailmind.com'
    from: 'alerts@mailmind.com'
    smarthost: 'smtp.yourcompany.com:587'
    auth_username: 'alerts@mailmind.com'
    auth_password: 'your-password'
    send_resolved: true
```

---

## 7. 备份与恢复

### 7.1 备份策略

#### 7.1.1 自动备份脚本

创建备份脚本 (backup.sh):

```bash
#!/bin/bash
# backup.sh

# 配置
BACKUP_DIR="/var/backups/mailmind"
LOG_DIR="/var/log/mailmind"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="mailmind_backup_$DATE"
RETENTION_DAYS=14

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份配置文件
tar -czf "$BACKUP_DIR/$BACKUP_NAME.configs.tar.gz" /etc/mailmind /app/config

# 备份日志（可选）
tar -czf "$BACKUP_DIR/$BACKUP_NAME.logs.tar.gz" "$LOG_DIR"

# 计算校验和
sha256sum "$BACKUP_DIR/$BACKUP_NAME.configs.tar.gz" > "$BACKUP_DIR/$BACKUP_NAME.configs.tar.gz.sha256"
sha256sum "$BACKUP_DIR/$BACKUP_NAME.logs.tar.g