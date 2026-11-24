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

Em **Ao iniciar**, nomeie os cenários e escolha: fundo, atrás dos personagens ou frente.
Vazio no Pinta é transparente; branco cobre as camadas de trás. Use o mesmo nome nos outros blocos.

Use sprites normais na pista, com imagem, animação, tamanho, transparência e efeitos.
O motor calcula tempo, câmera, perspectiva e ordem de desenho.
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

Posicione sprites por lateral (0 centro, negativa esquerda, positiva direita) e distância em passos
desde o começo. **Na pista … repetir** distribui cópias em linha ou padrão e conta o primeiro sprite.
Sem listas ou objetos de dados. O tamanho continua em unidades da pista; muda apenas sua projeção.

Posicionar e repetir funcionam na partida, em eventos de tempo ou encontro.
Em **Eventos**, use ${basic ? '**Quando o jogador da pista … encontrar …**' : '**Quando o personagem da pista … encontrar …**'} para somar pontos ou tirar vida.
**Recolher o sprite encontrado** remove só a cópia encontrada. Encontros usam posições na pista,
inclusive sprites vindo ao jogador; não use sobreposição dos retângulos da tela.

Em **Animação**, **Animar … com desenho … animação …** encontra nome, quadros e velocidade do Pinta,
dentro ou fora da pista. Repetir o pedido a cada quadro mantém a reprodução, sem reiniciá-la.

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

Métodos JavaScript de \`${api}\`:
${sceneMethods(api === 'SZGame2D' ? 'g2d' : 'gk')
  .map(
    (entry) =>
      `- **${entry.message.replace(/%\d+/g, '…')}**: \`${entry.method}\`. ${entry.tooltip}`,
  )
  .join('\n')}
${examples ? `Abra **Descida da Neve (${basic ? 'Jogo 2D' : 'Jogo 2D Avançado'})**. ${basic ? 'Aprenda controles, sprites e coleta.' : 'Combine controles, vida, encontros, placar e telas; exige seis estrelas na chegada.'} **Descida da Neve (Canvas)** mostra contas e funções, sem extensão.` : ''}
`.trim()
}
