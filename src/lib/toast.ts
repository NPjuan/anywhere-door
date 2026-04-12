import { message } from 'antd'

/* 全局轻量 Toast 封装（基于 antd message）
   用法：toast.success('已收藏') / toast.error('操作失败，请重试') */
export const toast = {
  success: (msg: string) => message.success(msg, 2),
  error:   (msg: string) => message.error(msg, 3),
  info:    (msg: string) => message.info(msg, 2),
}
