import { RateLimiter } from './rateLimiter'

export class LeetCodeSyncClient {
  private rateLimiter: RateLimiter
  private gqlUrl = 'https://leetcode.com/graphql'

  constructor(rateLimiter: RateLimiter) {
    this.rateLimiter = rateLimiter
  }

  public async fetchRecentSubmissions(handle: string, limit = 20): Promise<unknown[]> {
    const query = `
      query userRecentSubmissions($username: String!, $limit: Int!) {
        recentSubmissionList(username: $username, limit: $limit) {
          id
          title
          titleSlug
          timestamp
          statusDisplay
          lang
        }
      }
    `
    return this.rateLimiter.schedule(async () => {
      const response = await fetch(this.gqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { username: handle, limit }
        })
      })

      if (!response.ok) {
        throw new Error(`LeetCode API returned ${response.status}`)
      }

      const json = await response.json()
      if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message)
      }

      return json.data?.recentSubmissionList ?? []
    })
  }

  public async fetchQuestionDetails(titleSlug: string): Promise<unknown> {
    const query = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          title
          difficulty
          topicTags {
            name
            slug
          }
        }
      }
    `
    return this.rateLimiter.schedule(async () => {
      const response = await fetch(this.gqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { titleSlug }
        })
      })

      if (!response.ok) {
        throw new Error(`LeetCode API returned ${response.status}`)
      }

      const json = await response.json()
      if (json.errors && json.errors.length > 0) {
        throw new Error(json.errors[0].message)
      }

      return json.data?.question
    })
  }
}
