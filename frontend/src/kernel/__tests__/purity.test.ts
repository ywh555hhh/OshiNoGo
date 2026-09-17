import { describe, expect, it } from 'vitest'

/**
 * 架构守卫：kernel 必须是纯的。
 *
 * 这份测试的价值不在于今天，而在于半年后有人图方便在 kernel 里
 * `import { useState } from 'react'` 的时候。R3 是架构约束，
 * 约束必须由代码守着，不能只写在文档里。
 */

const sources = import.meta.glob('../*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * 注释里提到 `Math.random`、`React`、`window` 是正常的（我们在注释里解释
 * 为什么不用它们），所以必须先剥掉注释再扫。
 *
 * `(^|[^:])` 保护 `https://…` 这类字符串里的 `//`。
 */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const FORBIDDEN_IMPORTS = [
  { pattern: /from\s+['"]react['"]/, why: 'kernel 不允许依赖 React' },
  { pattern: /from\s+['"]react-dom/, why: 'kernel 不允许依赖 react-dom' },
  { pattern: /from\s+['"]@\//, why: 'kernel 不允许依赖 app 层别名（会导致反向依赖）' },
  { pattern: /from\s+['"]\.\.\//, why: 'kernel 不允许向上一级 import（会被 app 层污染）' },
  { pattern: /\bdocument\b/, why: 'kernel 不允许碰 DOM' },
  { pattern: /\bwindow\b/, why: 'kernel 不允许碰 window（也意味着不能直接用 Date.now/performance.now）' },
  { pattern: /\blocalStorage\b/, why: 'kernel 不允许直接读写存储；落盘是 app 层的职责' },
  { pattern: /\bMath\.random\b/, why: 'kernel 必须可重放：随机性一律走 random.ts 的带种子 PRNG' },
]

describe('kernel 纯净性', () => {
  it('至少扫到了 kernel 源文件（防止 glob 悄悄失效）', () => {
    expect(Object.keys(sources).length).toBeGreaterThanOrEqual(8)
  })

  it('不 import React / 别名 / 上级目录，不碰 DOM 与环境 API，不用 Math.random', () => {
    const offenders: string[] = []

    for (const [path, raw] of Object.entries(sources)) {
      const code = stripComments(raw)
      for (const { pattern, why } of FORBIDDEN_IMPORTS) {
        if (pattern.test(code)) {
          offenders.push(`${path}: ${why}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('kernel 不依赖任何运行时第三方包（零依赖承诺）', () => {
    const offenders = Object.entries(sources)
      .filter(([, raw]) => /from\s+['"][a-z@][^.'"]*['"]/.test(stripComments(raw)))
      .map(([path]) => path)

    expect(offenders).toEqual([])
  })
})
