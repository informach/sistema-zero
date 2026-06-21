// Shim: client de auth do @sistemazero/member-shell, amarrado ao gateway deste app.
import { shell } from './shell'

export const {
  getMe,
  getMeReadonly,
  updateMe,
  changeMyPassword,
  forgotPassword,
  resetPassword,
  requestOtp,
  resetPasswordWithOtp,
  getPublicProfileIdentity,
} = shell.auth
