import type { Platform } from '../../auth/schemas'

export function normalizeCodeforcesRating(rating?: number, index?: string): number {
  if (rating !== undefined && rating >= 800 && rating <= 3500) {
    return rating
  }
  // Fallback ratings for Codeforces based on index if rating is missing
  if (index) {
    const char = index.charAt(0).toUpperCase()
    if (char <= 'A') return 800
    if (char === 'B') return 1000
    if (char === 'C') return 1200
    if (char === 'D') return 1500
    if (char === 'E') return 1800
    return 2100
  }
  return 800
}

export function normalizeLeetCodeDifficulty(difficulty: string): number {
  switch (difficulty) {
    case 'Easy':
      return 1000
    case 'Medium':
      return 1600
    case 'Hard':
      return 2200
    default:
      return 1600
  }
}

export function normalizeVerdict(
  verdict: string | null | undefined,
  platform: Platform
): 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR' | 'OTHER' {
  if (!verdict) return 'OTHER'
  const normalized = verdict.toUpperCase()

  if (platform === 'codeforces') {
    if (normalized === 'OK') return 'ACCEPTED'
    if (normalized === 'WRONG_ANSWER') return 'WRONG_ANSWER'
    if (normalized === 'TIME_LIMIT_EXCEEDED') return 'TIME_LIMIT_EXCEEDED'
    if (normalized === 'MEMORY_LIMIT_EXCEEDED') return 'MEMORY_LIMIT_EXCEEDED'
    if (normalized === 'RUNTIME_ERROR') return 'RUNTIME_ERROR'
    if (normalized === 'COMPILATION_ERROR') return 'COMPILATION_ERROR'
    return 'OTHER'
  } else {
    // LeetCode statusDisplay mappings
    if (normalized === 'ACCEPTED') return 'ACCEPTED'
    if (normalized === 'WRONG ANSWER') return 'WRONG_ANSWER'
    if (normalized === 'TIME LIMIT EXCEEDED') return 'TIME_LIMIT_EXCEEDED'
    if (normalized === 'MEMORY LIMIT EXCEEDED') return 'MEMORY_LIMIT_EXCEEDED'
    if (normalized === 'RUNTIME ERROR') return 'RUNTIME_ERROR'
    if (normalized === 'COMPILE ERROR') return 'COMPILATION_ERROR'
    return 'OTHER'
  }
}

export function mapTagsToCanonical(tags: string[]): string[] {
  const dictionary: Record<string, string> = {
    // Codeforces tags
    'dp': 'dp',
    'dynamic programming': 'dp',
    'graphs': 'graphs',
    'graph matchings': 'graphs',
    'trees': 'trees',
    'math': 'math',
    'number theory': 'math',
    'greedy': 'greedy',
    'strings': 'strings',
    'string suffix structures': 'strings',
    'sorting': 'sorting',
    'binary search': 'binary-search',
    'bitmasks': 'bitmask',
    'two pointers': 'two-pointers',
    'dfs and similar': 'dfs-bfs',
    'data structures': 'data-structures',

    // LeetCode tags
    'dynamic-programming': 'dp',
    'graph': 'graphs',
    'tree': 'trees',
    'binary-tree': 'trees',
    'mathematics': 'math',
    'string': 'strings',
    'sort': 'sorting',
    'bit-manipulation': 'bitmask',
    'two-pointer': 'two-pointers',
    'depth-first-search': 'dfs-bfs',
    'breadth-first-search': 'dfs-bfs',
    'stack': 'data-structures',
    'queue': 'data-structures',
    'heap-priority-queue': 'data-structures',
    'hash-table': 'data-structures',
  }

  const result = new Set<string>()
  for (const tag of tags) {
    const cleanTag = tag.trim().toLowerCase()
    if (dictionary[cleanTag]) {
      result.add(dictionary[cleanTag])
    } else {
      // Fallback: replace spaces and hyphens with clean slugs
      const slug = cleanTag.replace(/[\s_]+/g, '-')
      result.add(slug)
    }
  }
  return Array.from(result)
}
