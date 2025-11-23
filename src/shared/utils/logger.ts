/**
 * 日志工具类
 * 提供统一的日志记录接口，支持不同级别的日志
 */

// 获取环境变量
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'info';
const DEBUG_MODE = import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true';

// 日志级别定义
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 当前日志级别
const currentLevel = LOG_LEVELS[LOG_LEVEL as LogLevel] || LOG_LEVELS.info;

// 颜色映射
const LOG_COLORS = {
  debug: '#8a8a8a', // 灰色
  info: '#1890ff',  // 蓝色
  warn: '#faad14',  // 黄色
  error: '#f5222d', // 红色
};

/**
 * 判断是否应该记录当前级别的日志
 */
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= currentLevel;
};

/**
 * 格式化日志内容
 */
const formatLog = (level: LogLevel, message: string, data?: any): string => {
  const timestamp = new Date().toISOString();
  const prefix = `[MailMind][${level.toUpperCase()}][${timestamp}]`;
  const dataString = data ? ` ${JSON.stringify(data, null, 2)}` : '';
  return `${prefix} ${message}${dataString}`;
};

/**
 * 日志对象
 */
export const logger = {
  /**
   * 记录调试日志
   */
  debug(message: string, data?: any): void {
    if (!shouldLog('debug')) return;
    if (DEBUG_MODE) {
      console.debug(`%c${formatLog('debug', message, data)}`, `color: ${LOG_COLORS.debug}`);
    }
  },

  /**
   * 记录信息日志
   */
  info(message: string, data?: any): void {
    if (!shouldLog('info')) return;
    console.info(`%c${formatLog('info', message, data)}`, `color: ${LOG_COLORS.info}`);
  },

  /**
   * 记录警告日志
   */
  warn(message: string, data?: any): void {
    if (!shouldLog('warn')) return;
    console.warn(`%c${formatLog('warn', message, data)}`, `color: ${LOG_COLORS.warn}`);
  },

  /**
   * 记录错误日志
   */
  error(message: string, error?: any): void {
    if (!shouldLog('error')) return;
    console.error(`%c${formatLog('error', message)}`, `color: ${LOG_COLORS.error}`);
    if (error) {
      console.error(error);
    }
  },

  /**
   * 记录性能日志
   */
  time(label: string): void {
    if (!shouldLog('debug') || !DEBUG_MODE) return;
    console.time(`[MailMind][PERF] ${label}`);
  },

  /**
   * 结束性能日志记录
   */
  timeEnd(label: string): void {
    if (!shouldLog('debug') || !DEBUG_MODE) return;
    console.timeEnd(`[MailMind][PERF] ${label}`);
  },
};