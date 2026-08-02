export const VERIFICATION_WINDOW_MS = 5 * 60 * 1000

export const VERIFICATION_TOKEN_PREFIX = 'CPTRACK-'

/** Always-open practice problem used for compile-error proof submissions. */
export const CF_VERIFICATION_CONTEST_ID = 4
export const CF_VERIFICATION_PROBLEM_INDEX = 'A'

export const CF_API_BASE = 'https://codeforces.com/api'
export const LC_GRAPHQL_URL = 'https://leetcode.com/graphql'

/** Minimum interval between Codeforces status polls (NFR-1). */
export const CF_POLL_INTERVAL_MS = 12_000

export const PENDING_VERIFICATION_STORAGE_KEY = 'cp-tracker-pending-verification'

export const LC_PROFILE_QUERY = `
  query MatchedUserAbout($username: String!) {
    matchedUser(username: $username) {
      profile {
        aboutMe
      }
    }
  }
`
