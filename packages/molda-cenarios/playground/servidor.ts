import { createServer } from 'vite'
import configuracao from './vite.config'

export async function abrirEditorLocal() {
  const server = await createServer({ ...configuracao, configFile: false })
  await server.listen()
  return server
}
