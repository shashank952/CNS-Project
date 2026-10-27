const OPERATION_LABELS = { sign: 'Sign', verify: 'Verify' }
const RESULT_LABELS = { success: 'Success', failure: 'Failure' }

export function formatOperation(value) {
  return OPERATION_LABELS[value] ?? value
}

export function formatResult(value) {
  return RESULT_LABELS[value] ?? value
}
