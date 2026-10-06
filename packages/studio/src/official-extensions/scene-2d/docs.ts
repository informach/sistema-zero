import { sceneMethods } from './catalog'

export const basicSceneSummary = `
CENÁRIOS E PISTA: addSceneBackdrop compõe fundos/frente automaticamente. createSpriteTrack cria a pista;
trackPlayer usa sprite normal; trackControls dá setas/toque; trackTravel avança. putTrackSprite coloca,
repeatTrackSprite faz cópias. onTrackEncounter detecta encontros, collectTrackItem recolhe uma cópia.
trackHud/sceneGameScreens dão placar/telas. sceneAnimation usa nomes do Pinta. Sem dt, objetos de dados
ou funções como pré-requisito. Preparação em Ao iniciar, encontros em Eventos.
`
export const advancedSceneSummary = `
CENÁRIOS E PISTA: addSceneBackdrop compõe camadas. createSpriteTrack cria a perspectiva.
trackFollow escolhe quem a câmera acompanha sem alterar vida; trackSpeed define avanço;
trackInput escolhe controles; trackLimit ajusta limites; trackFinishLine define chegada.
putTrackSprite/repeatTrackSprite funcionam também durante a partida, com sprites de moldes.
onTrackSpriteEncounter devolve o personagem encontrado; forEachTrackSprite visita as cópias vivas.
onTrackMoldEncounter registra encontros de um molde, incluindo novas ondas e suas cópias.
sceneAnimation usa nomes do Pinta. Combine setHealth/hurt/healthOf, setScreenText/setState,
drawCounter/drawBar e os eventos existentes. Sem funções próprias, objetos de dados ou dt.
Movimento funciona sem jogador. A pista não escolhe placar, vitória, derrota ou telas.
`

export function sceneDocumentation(api: 'SZGame2D' | 'SZGameKit', examples = false): string {
  const basic = api === 'SZGame2D'
  return `
### Cenários e pista com sprites

Em **Ao iniciar**, adicione os cenários e escolha se ficam bem ao fundo, atrás dos personagens
ou na frente. Partes vazias do Pinta são transparentes; pintar de branco cobre o que está atrás.
Cada cenário tem seu nome. Nos outros blocos, escolha esse nome na lista.

Crie uma pista para o fundo e use sprites normais. Eles conservam imagem, animação, tamanho,
transparência e efeitos. O motor calcula tempo, câmera, perspectiva e ordem de desenho.
${
  basic
    ? `Escolha o jogador com suas vidas em **Na pista … usar … como jogador**, habilite as setas e o
toque em **Na pista … usar setas e toque** e escolha o ritmo de **Percorrer pista**. Movimento e
espaço lateral têm escolhas prontas, sem calibrar números. Para começar,
**Na pista … colocar … … a … passos** escolhe centro, esquerda ou direita pela lista.`
    : `Combine
**Na pista … acompanhar …**, **Velocidade de avanço da pista**, **Na pista … controlar pelos** e
**Limitar a lateral da pista**. Cada bloco cuida de uma ação. A velocidade funciona também sem
personagem acompanhado. Vida e dano usam **Dar … vidas a …** e **Machucar … tirando … de vida**,
como nos outros jogos da extensão.`
}

Coloque outros sprites pela lateral e pela distância: lateral 0 é centro, negativa é esquerda,
positiva é direita. Distância é o número de passos desde o começo. **Na pista … repetir** distribui cópias
em linha ou em um padrão; a quantidade inclui o primeiro sprite. Não precisa criar listas nem
objetos de dados. O tamanho do sprite continua em unidades da pista: o motor só muda como aparece.

Posicionar e repetir também funcionam durante a partida, em eventos de tempo ou encontro.
Em **Eventos**, use ${basic ? '**Quando o jogador da pista … encontrar …**' : '**Quando o personagem da pista … encontrar …**'} para somar pontos ou tirar vida.
**Recolher o sprite encontrado** remove só aquela cópia. Os encontros consideram as posições
na pista, inclusive quando outro sprite vem em direção ao jogador. Não use sobreposição de
retângulos da tela como encontro na pista.

No grupo **Animação**, use **Animar … com desenho … animação …** com o nome criado no Pinta.
A extensão encontra os quadros e a velocidade. Funciona dentro e fora da pista.
Pedir a mesma animação a cada quadro mantém sua reprodução, sem voltar ao começo.

${
  basic
    ? `**Mostrar vidas e placar** inclui pausa por botão ou P e recomeço por R, mesmo sem telas prontas.
**Usar telas prontas** acrescenta início e resultados: Enter ou toque começa,
P pausa, R reinicia. Reiniciar reconstrói o projeto a partir de Ao iniciar. A partida para ao
terminar a pista ou perder todas as vidas. Eventos comuns de quadro e encontros também esperam
o início e param nas telas finais.`
    : `O evento de encontro dá um nome à instância encontrada, para
animá-la ou mudar sua aparência. **Para cada … vivo de … na pista** também funciona depois de recolher
o original. Cópias de moldes participam dos blocos normais de personagens vivos e recolhimento.
Para ondas criadas durante a partida, use **Quando o personagem da pista … encontrar alguém do molde** em **Eventos**:
escolha a pista e o molde na lista e use o nome do encontrado nas ações do corpo. A regra vale
para cada nova instância e suas cópias. O evento por personagem continua restrito àquela família.
**Recolher do molde … quem saiu … px da tela** respeita a perspectiva e espera os personagens que
ainda vão chegar. **Desenhar a barra de vida de** acompanha a posição e o tamanho projetados
automaticamente. **Chegada da pista … em … passos** marca o fim; quando o jogador chega, o evento
**Quando chegar ao fim da pista** é chamado e nele você escolhe a regra e o estado do jogo. As telas
são as nativas: personalize título, texto e botão com **Na tela pronta …, escrever título**. Monte o
placar com **Mostrar no placar** e **Desenhar uma barra de**, dentro de **Desenhar por cima (HUD)**.
Esses blocos servem também para plataforma, nave e outros jogos.`
}

Os cenários cobrem a tela sem deformar; em Mais controles é possível mostrar a imagem inteira
ou repeti-la. O jogo compõe fundo, mundo, frente e placar automaticamente. Não é necessário
desenhar a pista a cada quadro. O bloco comum **Limpar a tela** preserva os cenários automáticos
no básico. A pista é plana, sem curvas ou relevo 3D.

${sceneMethods(api === 'SZGame2D' ? 'g2d' : 'gk')
  .map(
    (entry) =>
      `- **${entry.message.replace(/%\d+/g, '…')}**: \`${api}.${entry.method}\`. ${entry.tooltip}`,
  )
  .join('\n')}
${examples ? `Abra **Descida da Neve (${basic ? 'Jogo 2D' : 'Jogo 2D Avançado'})**. O básico ensina controles, sprites e coleta. O intermediário combina controles, vida, encontros, placar e telas; exige seis estrelas na chegada. **Descida da Neve (Canvas)** deixa as contas e funções à mostra, sem extensão.` : ''}
`.trim()
}
