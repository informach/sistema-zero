import { workflowDocumentSchema } from '@sistemazero/agent-core'
import diagnoseService from '../../../../.sistemazero/workflows/diagnose-service.json'
import fixBug from '../../../../.sistemazero/workflows/fix-bug.json'
import reviewChange from '../../../../.sistemazero/workflows/review-change.json'
import validateJourney from '../../../../.sistemazero/workflows/validate-journey.json'

export const recipes = [fixBug, reviewChange, validateJourney, diagnoseService].map((recipe) =>
  workflowDocumentSchema.parse(recipe),
)
