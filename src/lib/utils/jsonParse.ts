/**
 * 健壮的 JSON 解析工具
 * Robust JSON parsing utility for AI agent streaming responses
 * 
 * 处理多种场景：
 * 1. 直接 JSON 对象
 * 2. Markdown 代码块包裹
 * 3. 文本中嵌入的 JSON（使用括号匹配）
 * 4. 多层嵌套 JSON 结构
 */

/**
 * 安全地解析 JSON，支持多种格式和嵌套结构
 * 
 * @template T - 期望的返回类型
 * @param text - 包含 JSON 的文本
 * @param depth - 递归深度（内部使用，默认 0）
 * @returns 解析后的对象，解析失败返回 null
 * 
 * @example
 * parseJSON<FullItinerary>(`\`\`\`json\n{"title": "..."}\n\`\`\``)
 * parseJSON<RoutePlan>('Planning result: {"days": [...]}')
 */
export function parseJSON<T>(text: string, depth = 0): T | null {
  const maxDepth = 3
  if (depth > maxDepth) return null
  
  // ===== 步骤 1: 尝试直接解析 =====
  try {
    return JSON.parse(text.trim())
  } catch {
    // 继续到步骤 2
  }

  // ===== 步骤 2: 移除 Markdown 代码块包裹 =====
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  
  if (cleaned !== text && cleaned.length > 0) {
    // 递归尝试解析清理后的内容
    return parseJSON<T>(cleaned, depth + 1)
  }

  // ===== 步骤 3: 智能提取 JSON（正确处理嵌套括号）=====
  return extractJSONByBraceMatching<T>(text)
}

/**
 * 使用括号栈匹配算法智能提取 JSON
 * 正确处理嵌套结构，避免贪心查找造成的错误
 * 
 * 算法：
 * 1. 遍历文本中的每个字符
 * 2. 跟踪括号深度（开始于 0）
 * 3. 当深度从 0 变为 1 时，记录开始位置
 * 4. 当深度从 1 变为 0 时，尝试解析这一段
 * 5. 找到有效的 JSON 就返回，否则继续寻找
 */
function extractJSONByBraceMatching<T>(text: string): T | null {
  const braceStack: number[] = [] // 记录开括号的位置
  let start = -1
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    
    if (char === '{') {
      // 开始新的括号深度
      if (braceStack.length === 0) {
        start = i
      }
      braceStack.push(i)
    } 
    else if (char === '}') {
      braceStack.pop()
      
      // 括号已配对完整，尝试解析
      if (braceStack.length === 0 && start !== -1) {
        const jsonString = text.substring(start, i + 1)
        try {
          return JSON.parse(jsonString) as T
        } catch {
          // 这个片段无效，继续寻找下一个
          start = -1
        }
      }
    }
  }
  
  // 没有找到有效的 JSON 对象
  return null
}

/**
 * 尝试从文本中提取所有 JSON 对象
 * 对于需要多个 JSON 对象的情况（如 streaming responses）
 * 
 * @param text - 包含一个或多个 JSON 对象的文本
 * @returns JSON 对象数组（有效的）
 * 
 * @example
 * const objects = extractAllJSON('{"a":1} {"b":2}');
 * // [{a:1}, {b:2}]
 */
export function extractAllJSON<T = Record<string, unknown>>(text: string): T[] {
  const results: T[] = []
  const braceStack: number[] = []
  let start = -1
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    
    if (char === '{') {
      if (braceStack.length === 0) {
        start = i
      }
      braceStack.push(i)
    } 
    else if (char === '}') {
      braceStack.pop()
      
      if (braceStack.length === 0 && start !== -1) {
        const jsonString = text.substring(start, i + 1)
        try {
          const parsed = JSON.parse(jsonString) as T
          results.push(parsed)
        } catch {
          // 跳过无效的 JSON
        }
        start = -1
      }
    }
  }
  
  return results
}

/**
 * 验证文本是否包含有效的 JSON
 */
export function hasValidJSON(text: string): boolean {
  return parseJSON(text) !== null
}

/**
 * 尝试从错误的 JSON 中恢复
 * 例如处理未闭合的字符串或数组
 * 
 * @param text - 可能不完整或格式不正确的 JSON
 * @returns 修复后的 JSON 字符串或原始文本
 */
export function attemptJSONRepair(text: string): string {
  const trimmed = text.trim()
  
  // 如果已经是有效 JSON，直接返回
  if (hasValidJSON(trimmed)) {
    return trimmed
  }
  
  // 尝试补全末尾的括号
  let repaired = trimmed
  let openBraces = 0
  let openBrackets = 0
  
  for (const char of trimmed) {
    if (char === '{') openBraces++
    else if (char === '}') openBraces--
    else if (char === '[') openBrackets++
    else if (char === ']') openBrackets--
  }
  
  // 补全缺失的括号
  repaired += ']'.repeat(Math.max(0, openBrackets))
  repaired += '}'.repeat(Math.max(0, openBraces))
  
  // 验证修复是否成功
  if (hasValidJSON(repaired)) {
    return repaired
  }
  
  // 修复失败，返回原文本
  return trimmed
}

/**
 * 使用类型守卫的安全 JSON 解析
 * 解析成功后验证是否包含必要字段
 * 
 * @example
 * const itinerary = parseJSONWithGuard<FullItinerary>(
 *   text,
 *   (obj): obj is FullItinerary => 'id' in obj && 'days' in obj
 * )
 */
export function parseJSONWithGuard<T>(
  text: string,
  guard: (obj: unknown): obj is T
): T | null {
  const parsed = parseJSON(text)
  if (parsed === null) return null
  
  if (guard(parsed)) {
    return parsed
  }
  
  return null
}
