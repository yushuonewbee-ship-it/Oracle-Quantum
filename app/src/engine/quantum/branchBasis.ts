import type { QuestionType } from '../../types/fate'
import { createOutcomeStates } from '../outcomeStates'

/** 每个问题类型的命运分支映射到 4-qubit 计算基态索引（低 3 位编码分支，q3 为命理偏置） */
export function getBranchBasisIndices(questionType: QuestionType): Record<string, number> {
  const outcomes = createOutcomeStates(questionType)
  const map: Record<string, number> = {}
  outcomes.forEach((o, i) => {
    // |branch⟩ = |i mod 8⟩ on q0,q1,q2
    map[o.id] = i % 8
  })
  return map
}

export function getOutcomeList(questionType: QuestionType) {
  return createOutcomeStates(questionType)
}
