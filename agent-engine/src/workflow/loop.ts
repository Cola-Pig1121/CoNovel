// Loop Engineering — bounded iteration with convergence detection

export interface LoopState {
  round: number
  maxRounds: number
  history: any[]
  converged: boolean
  reason?: string
}

export function createLoopState(maxRounds: number): LoopState {
  return {
    round: 0,
    maxRounds,
    history: [],
    converged: false,
    reason: undefined
  }
}

export function checkLoopConvergence(
  state: LoopState, 
  newOutput: any, 
  untilCondition?: string
): LoopState {
  const newState: LoopState = {
    ...state,
    round: state.round + 1,
    history: [...state.history, newOutput]
  }
  
  // Check max rounds
  if (newState.round >= newState.maxRounds) {
    newState.converged = true
    newState.reason = 'max_rounds_reached'
    return newState
  }
  
  // Check convergence with previous output
  if (state.history.length > 0) {
    const previousOutput = state.history[state.history.length - 1]
    
    // Check if output is identical to previous (no changes)
    if (JSON.stringify(newOutput) === JSON.stringify(previousOutput)) {
      newState.converged = true
      newState.reason = 'identical_output'
      return newState
    }
    
    // Check for diminishing changes
    const changeSize = Math.abs(JSON.stringify(newOutput).length - JSON.stringify(previousOutput).length)
    if (changeSize < 10 && state.history.length > 2) {
      newState.converged = true
      newState.reason = 'diminishing_changes'
      return newState
    }
  }
  
  // Check custom condition
  if (untilCondition) {
    try {
      // Simple condition evaluation (e.g., "output.score >= 8")
      // This is a simplified parser - in production, you'd want a proper expression evaluator
      const conditionMet = evaluateCondition(untilCondition, newOutput)
      if (conditionMet) {
        newState.converged = true
        newState.reason = 'condition_met'
        return newState
      }
    } catch (error) {
      // If condition evaluation fails, continue loop
      console.warn(`Failed to evaluate loop condition: ${error}`)
    }
  }
  
  return newState
}

export function shouldContinueLoop(state: LoopState): boolean {
  return !state.converged && state.round < state.maxRounds
}

function evaluateCondition(condition: string, context: any): boolean {
  // Simple condition evaluator for common patterns
  // Supports: ==, !=, >=, <=, >, < operators
  
  const match = condition.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/)
  if (!match) {
    throw new Error(`Invalid condition format: ${condition}`)
  }
  
  const [, left, operator, right] = match
  
  // Resolve left side from context
  let leftValue: any
  if (left.startsWith('$.')) {
    const path = left.slice(2)
    leftValue = resolvePath(context, path)
  } else {
    leftValue = left
  }
  
  // Resolve right side
  let rightValue: any
  if (right.startsWith('$.')) {
    const path = right.slice(2)
    rightValue = resolvePath(context, path)
  } else if (right.startsWith('"') && right.endsWith('"')) {
    rightValue = right.slice(1, -1)
  } else if (!isNaN(Number(right))) {
    rightValue = Number(right)
  } else {
    rightValue = right
  }
  
  // Compare
  switch (operator) {
    case '==':
      return leftValue === rightValue
    case '!=':
      return leftValue !== rightValue
    case '>=':
      return Number(leftValue) >= Number(rightValue)
    case '<=':
      return Number(leftValue) <= Number(rightValue)
    case '>':
      return Number(leftValue) > Number(rightValue)
    case '<':
      return Number(leftValue) < Number(rightValue)
    default:
      throw new Error(`Unknown operator: ${operator}`)
  }
}

function resolvePath(obj: any, path: string): any {
  const parts = path.split('.')
  let current = obj
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[part]
  }
  
  return current
}