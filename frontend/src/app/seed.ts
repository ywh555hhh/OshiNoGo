/**
 * 抽题顺序的种子。
 *
 * 这是整个 app 里**唯一**允许不纯的地方，而且只在「起一组新训练」的那一刻调用：
 * 组件挂载时的惰性初始化（React 保证只运行一次），以及用户点「再来一组」的事件处理器。
 *
 * 渲染期间绝不生成种子：`useMemo` 可能被重跑，种子一变，
 * 同一组训练的抽题序列就换了，kernel 的可重放保证也随之失效。
 */
export function createSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) | 0
}
