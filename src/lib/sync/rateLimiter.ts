export class RateLimiter {
  private queue: Array<{
    task: () => Promise<unknown>
    resolve: (value: unknown) => void
    reject: (reason?: unknown) => void
  }> = []
  private isProcessing = false
  private minIntervalMs: number
  private maxRetries: number

  constructor(requestsPerSecond: number, maxRetries = 3) {
    this.minIntervalMs = 1000 / requestsPerSecond
    this.maxRetries = maxRetries
  }

  public schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject })
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return
    this.isProcessing = true

    const item = this.queue.shift()
    if (!item) {
      this.isProcessing = false
      return
    }

    const { task, resolve, reject } = item

    try {
      const result = await this.executeWithRetry(task)
      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      setTimeout(() => {
        this.isProcessing = false
        this.processQueue()
      }, this.minIntervalMs)
    }
  }

  private async executeWithRetry<T>(
    task: () => Promise<T>,
    retriesLeft = this.maxRetries,
    delay = 1000
  ): Promise<T> {
    try {
      return await task()
    } catch (error: unknown) {
      const err = error as Record<string, unknown> | null | undefined
      const errorMsg = String(err?.message || error).toLowerCase()
      const isRateLimit =
        errorMsg.includes('limit exceeded') ||
        errorMsg.includes('too many requests') ||
        err?.status === 429

      if (isRateLimit && retriesLeft > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.executeWithRetry(task, retriesLeft - 1, delay * 2)
      }
      throw error
    }
  }
}
