import fs from 'node:fs'
import path from 'node:path'

const work = path.resolve('output/instagram/fixados/2026-10-09')
const planPath = path.join(work, 'planejamento.json')
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'))
const backup = path.join(work, 'historico', 'antes-cenas-como-comecar')
fs.mkdirSync(backup, { recursive: true })
for (const file of ['planejamento.json', 'montar-carrosseis.mjs'])
  if (!fs.existsSync(path.join(backup, file)))
    fs.copyFileSync(path.join(work, file), path.join(backup, file))
const scenes = [
  [
    '02-irmaos-criando.png',
    'André e Débora sentados juntos diante de um notebook com o jogo do Farol. Os rostos e a interação dos irmãos dão contexto à faixa etária.',
  ],
  [
    '03-mouse-teclado-blocos-v3.png',
    'Detalhe das mãos usando mouse e teclado, com os blocos do Farol no monitor. O enquadramento mostra o equipamento em uso e o espaço para montar.',
  ],
  [
    '04-andre-pausando-aula.png',
    'André com a mão no mouse, diante do vídeo pausado e da atividade do Farol lado a lado. O controle de reprodução fica visível na tela.',
  ],
  [
    '05-debora-pedindo-ajuda-v3.png',
    'Débora digitando no campo de ajuda da aula. Mostrar o campo vazio e o botão de envio, sem inventar perguntas, respostas ou atendimento ao vivo.',
  ],
  [
    '06-mes-de-atividades-v3.png',
    'Notebook com o Farol, calendário de trinta dias e caderno sobre a mesa. A cena representa organizar um período para fazer as atividades, sem contagem regressiva.',
  ],
  [
    '07-andre-jogando-mural.png',
    'André jogando o Farol no navegador, usando o teclado. Mostrar apenas o jogo publicado, sem aulas ou edição abertas, em coerência com o acesso após o prazo.',
  ],
  [
    '08-helena-acompanhando-debora.png',
    'Helena ao lado de Débora, observando a filha usar o computador. A criança controla a atividade enquanto a mãe conhece a proposta com ela.',
  ],
  [
    '09-julio-conversando-com-andre.png',
    'Júlio e André conversando diante do notebook com o Farol. O gesto e os olhares representam conhecer o jogo juntos antes de decidir.',
  ],
]
const carousel = plan.carousels.find((c) => c.id === 'F03')
carousel.contextualImages = true
for (const [i, [file, description]] of scenes.entries()) {
  const s = carousel.slides[i + 1]
  s.type = i === 7 ? 'cover' : 'photo'
  s.images = ['output/instagram/fixados/2026-10-09/cenas-como-comecar-v2/' + file]
  s.generated = true
  s.imageDescription = description
  s.scene =
    description +
    ' Cena gerada com referências; não é um registro documental. Telas inseridas nas cenas são composições baseadas nas capturas do produto, não novas capturas da plataforma.'
  delete s.feature
  delete s.featureLabel
  delete s.demo
  if (!fs.existsSync(path.resolve(s.images[0]))) throw Error('Imagem ausente: ' + file)
}
fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n')
console.log('F03: nove slides com imagens, oito cenas novas; copy preservada.')
