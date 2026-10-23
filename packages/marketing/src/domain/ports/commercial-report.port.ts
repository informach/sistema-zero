import type { CommercialQuery, CommercialReport } from '@sistemazero/marketing-contracts'
export interface CommercialReportSource {
  report(input: CommercialQuery): Promise<CommercialReport>
}
