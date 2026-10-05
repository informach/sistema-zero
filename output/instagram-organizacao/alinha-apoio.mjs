import fs from 'node:fs'

const base = 'docs/marketing/kids/comunidade-dos-criadores/instagram/'
const file = `${base}apoio/valor-e-demonstracao-2026-10-03.md`
let s = fs.readFileSync(file, 'utf8')
s = s.replace(
  '[calendário versão 3](../historico/calendario-2026-10-03.md) e os [destaques atuais](../historico/copy-perfil-e-fixados-2026-10-03.md)',
  '[calendário vigente](../03-postagens.md) e os [destaques aprovados](../01-destaques.md)',
)
s = s
  .replaceAll('Destaque Comece', 'Destaque Como funciona')
  .replaceAll('destaque Orientação', 'destaque Como funciona')
s = s.replace(
  'Destaque Família. Certificado',
  'Pauta futura sobre conclusão, se pertinente. Certificado',
)
s = s.replace('F01, F02, F04 e F10.', 'F01, F04 e F10.')
s = s.replace(
  'F02 e destaque Criações.',
  'Pauta futura sobre o Mural e criações de alunos, fora dos fixados.',
)
s = s.replace(
  'Destaque Criações e stories complementares. Distinguir',
  'Dúvidas: participação e visibilidade, S11. Distinguir',
)
s = s.replace(
  'Destaque Criações e tour de continuidade.',
  'Pauta futura sobre o desafio mensal, conforme o calendário.',
)
s = s.replace('destaque Família', 'destaque Dúvidas')
s = s.replace(
  'referências F01–F12 reconciliadas com o calendário de 04/10.',
  'referências de peças e destaques alinhadas aos guias aprovados e consolidados em 04/10.',
)
fs.writeFileSync(file, s)
const capabilities = `${base}apoio/capacidades-redes-sociais-2026-10-04.md`
s = fs
  .readFileSync(capabilities, 'utf8')
  .replace(
    'S02 recorta materiais preparados e regra',
    'S01 apresenta a sequência de aprendizagem e S04 mostra o projeto oferecido',
  )
  .replace('capa, legenda e S02', 'capa, legenda e os recortes de S01/S04')
fs.writeFileSync(capabilities, s)
const history = `${base}historico/copy-home-2026-10-03.md`
s = fs
  .readFileSync(history, 'utf8')
  .replace(
    '#6-vídeo-principal-da-raiz-2-a-25-minutos',
    '#6-vídeo-de-demonstração-para-como-funciona-2-a-25-minutos',
  )
fs.writeFileSync(history, s)
