export interface SM2State {
  easinessFactor: number
  interval: number // in days
  repetitions: number
}

export interface SM2Result extends SM2State {
  dueDate: string // ISO Timestamp
}

export interface ProblemMasteryInput {
  problemRating: number
  userBaselineRating: number
  incorrectAttemptsBeforeSolve: number
}

export interface TopicHealthInput {
  initialMastery: number
  daysElapsed: number
  halfLife: number
}
