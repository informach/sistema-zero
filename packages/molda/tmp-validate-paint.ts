import { readFileSync } from 'node:fs'
import { readSceneDocument } from './src/scene/readDocument'

const path = 'C:/Users/julio/Downloads/farol-luzes-giro-completo-pintado.molda.json'
const result = readSceneDocument(JSON.parse(readFileSync(path, 'utf8')))
console.log(result.status, result.status === 'invalid' ? `${result.path}: ${result.message}` : '')
