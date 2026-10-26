import { buildPrototype } from '../../../design/farol-antes-depois/build'

await buildPrototype({
  directory: import.meta.dirname,
  title: 'Verificação das experiências reais',
  filename: '../../.cache/experiencias-reais.html',
})
