import { RateLimiter } from './rateLimiter'

export class CodeforcesSyncClient {
  private rateLimiter: RateLimiter
  private apiBase = 'https://codeforces.com/api'

  constructor(rateLimiter: RateLimiter) {
    this.rateLimiter = rateLimiter
  }

  public async fetchSubmissions(
    handle: string,
    options?: { fromIndex?: number; count?: number }
  ): Promise<unknown[]> {
    const from = options?.fromIndex ?? 1
    const count = options?.count ?? 100

    return this.rateLimiter.schedule(async () => {
      const url = `${this.apiBase}/user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${count}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Codeforces API returned ${response.status}`)
      }
      
      const json = await response.json()
      if (json.status !== 'OK') {
        throw new Error(json.comment ?? 'Failed to fetch user submissions from Codeforces')
      }
      
      return json.result ?? []
    })
  }
}
