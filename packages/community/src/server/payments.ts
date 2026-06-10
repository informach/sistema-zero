// Shim: client do payments do @sistemazero/member-shell.
import { shell } from './shell'

export const { listMyPayments, getMyPayment } = shell.payments
