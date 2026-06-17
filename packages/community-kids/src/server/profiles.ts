// Shim: o client dos perfis (estilo Netflix) vive no @sistemazero/member-shell,
// parametrizado pelos cookies deste app via `shell.ts`.
import { shell } from './shell'

export const { list, listReadonly, create, update, archive, select, exit } = shell.profiles
