import { supabase } from '../supabase'
import { calculateTopicHealth, calculateStabilityHalfLife } from './decay'

export interface DailyQueueItem {
  problem_id: string
  title: string
  url: string
  normalized_rating: number
  platform: string
  due_date: string
  topic_health: number
  reason: 'due' | 'decaying_topic'
}

interface DBProblem {
  id: string
  platform: 'codeforces' | 'leetcode'
  external_id: string
  title: string
  url: string
  normalized_rating: number
  taxonomy_tags: string[]
}

/**
 * Generates the revision queue for a user, containing problems:
 * 1. Due for review (due_date <= now)
 * 2. Belonging to decaying topics (Health < 40%)
 */
export async function getDailyReviewQueue(userId: string, now = new Date()): Promise<DailyQueueItem[]> {
  // 1. Fetch all review states for the user
  const { data: reviewItems, error: itemsError } = await supabase
    .from('review_items')
    .select('*, problems(*)')
    .eq('user_id', userId)

  if (itemsError || !reviewItems) {
    console.error('Error fetching queue review items:', itemsError)
    return []
  }

  // 2. Group review items by topic node to calculate decay
  const topicMap: Record<string, { totalInitialMastery: number; totalStability: number; count: number; lastSolved: string }> = {}

  // Resolve topics and initial mastery
  for (const item of reviewItems) {
    const problem = item.problems as unknown as DBProblem | null
    if (!problem || !problem.taxonomy_tags) continue

    const tags = problem.taxonomy_tags
    const repetitions = item.repetitions
    
    // Fallback: estimate mastery based on SM-2 state
    const initialMastery = item.repetitions > 0 ? 100 : 50

    for (const tag of tags) {
      if (!topicMap[tag]) {
        topicMap[tag] = { totalInitialMastery: 0, totalStability: 0, count: 0, lastSolved: '' }
      }
      topicMap[tag].totalInitialMastery += initialMastery
      topicMap[tag].totalStability += calculateStabilityHalfLife(repetitions)
      topicMap[tag].count += 1
      
      const solvedAt = item.last_reviewed_at || new Date(0).toISOString()
      if (!topicMap[tag].lastSolved || solvedAt > topicMap[tag].lastSolved) {
        topicMap[tag].lastSolved = solvedAt
      }
    }
  }

  // Calculate Health for each topic
  const topicHealthMap: Record<string, number> = {}
  for (const tag of Object.keys(topicMap)) {
    const topic = topicMap[tag]
    const avgInitialMastery = topic.totalInitialMastery / topic.count
    const avgHalfLife = topic.totalStability / topic.count
    
    const deltaMs = now.getTime() - new Date(topic.lastSolved).getTime()
    const daysElapsed = Math.max(0, deltaMs / (1000 * 60 * 60 * 24))

    topicHealthMap[tag] = calculateTopicHealth({
      initialMastery: avgInitialMastery,
      daysElapsed,
      halfLife: avgHalfLife
    })
  }

  const queue: DailyQueueItem[] = []

  for (const item of reviewItems) {
    const problem = item.problems as unknown as DBProblem | null
    if (!problem) continue

    const tags = problem.taxonomy_tags || []
    const isDue = new Date(item.due_date) <= now
    
    // Find min topic health associated with problem
    let minHealth = 100
    for (const tag of tags) {
      if (topicHealthMap[tag] !== undefined && topicHealthMap[tag] < minHealth) {
        minHealth = topicHealthMap[tag]
      }
    }

    const isDecayingTopic = minHealth < 40

    if (isDue || isDecayingTopic) {
      queue.push({
        problem_id: item.problem_id,
        title: problem.title,
        url: problem.url,
        normalized_rating: problem.normalized_rating,
        platform: problem.platform,
        due_date: item.due_date,
        topic_health: minHealth,
        reason: isDue ? 'due' : 'decaying_topic'
      })
    }
  }

  return queue
}
