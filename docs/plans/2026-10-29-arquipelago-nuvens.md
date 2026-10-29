# Nuvens e apresentação da Iriê (fase4-06)

## Decisões e medidas

- Seguir Pico e Vale: carga privada, preparação antes da troca, uma ilha completa na memória,
  descarte ao sair. Quadro das Cores compartilhado. Sem mudanças no salvamento ou no contrato.
- A ilha fica 7 m acima das demais. Iriê fica na âncora morador (-3,4; 1; 3,2), olhando
  para chegada (11,5; 1; 0). O centro do mundo inclui esses 7 m, inclusive na câmera da conversa.
- Apresentação: “Sou Iriê. Teço o arco-íris com estes fios.” e “O tear fica aqui na Ilha das Nuvens.”
  Só descreve a arara com o tear e o arco-íris da arte. Sem história, amizade, pedido ou presente.
- Medir penas do tronco e da cabeça, excluindo asas e cauda pelos ossos. Cabeça principal:
  x até 0,3872 m, topo 1,49 m, sem topete. Cilindro raio 0,39 m e altura 1,49 m.
  Centro dos olhos em 1,1879 m: câmera a 1,19 m. Os clipes parado, falar, acenar, feliz e andar existem.
- Os 50 colisores chegam a 18,7404 m do centro. Espera circular de 19,2 m cobre vértices,
  formas arredondadas e o raio de 0,35 m do corpo. Não alargar a versão leve.
- Topos locais das quatro plataformas: 3,2 / 5 / 6,8 / 8,6 m. Raios dos tampos:
  1,71 / 1,53 / 1,44 / 1,8 m. Manter x/z da arte. Cada plataforma sobe 2,4 m e desce:
  6 s de viagem com suavização cúbica, 4 s parada em cada ponta, ciclo de 20 s.
  Vizinhas têm meia volta de diferença. Quando a anterior está no alto, a seguinte fica
  0,6 m abaixo, permitindo o vão maior (cerca de 3,55 m entre tampos) com corrida e pulo.
  Velocidade máxima 0,6 m/s. Menos movimento mantém o mesmo transporte suave, necessário à subida.
- Corpo cinemático com plataformaDoMundo, como as pontes vivas. O controlador Rapier existente
  acompanha o apoio; não teleportar a criança nem criar outra física. Desenho e âncora acompanham
  a posição interpolada do mesmo corpo. Passo fixo, pausa congela, sem alocar no laço.
- Preferir elevadores verticais alternados a mover lateralmente (mudaria os vãos da arte) ou
  inventar degraus (esconderia o requisito de plataforma móvel).

## Execução

- [x] Atualizar staging, ler referências e medir GLBs sem Blender.
- [x] Regra pura do ciclo e testes de pausa, continuidade e alcance das quatro plataformas.
- [x] Integrar Nuvens, Iriê, painel, espera e colisores móveis sem duplicar os fixos.
- [x] Provar ciclo de recursos, limites, corpo/olhos, grade até os degraus e transporte com Rapier.
- [x] Navegador desktop e toque emulado: chegada, conversa, subida, pausa, saída e retorno.
- [x] Regras, CLAUDE, relatório com prints, testes completos, tipagem 8192, Biome e full review.
- [x] Lote revisado e preparado para commit e envio em staging, com pull e rebase antes do push.

## Pedidos de arte

Nenhum identificado na leitura inicial. Os quatro desenhos, âncoras e tampos estão separados.
Se a prova real encontrar impedimento de geometria, registrar aqui antes de alterar essa parte.
Não tocar nos GLBs, geradores, balão, constelações, clima ou salvamento.

## Validação

`bun test` e `NODE_OPTIONS=--max-old-space-size=8192 bun run typecheck` no pacote.
`bunx biome check` nos arquivos tocados. Verificador próprio com ARQUIPELAGO_CHROMIUM e
ARQUIPELAGO_PRINTS, em SwiftShader. Emulação não comprova desempenho em aparelho físico.

## Achados corrigidos durante a conferência

- A ponte antiga terminava em y 1,12, sete metros abaixo das Nuvens. O mesmo gerador de
  pontos passa a terminar em y 8,12 somente nessa ilha. Teste prova a altura e a inclinação
  inferior a 25 graus; as outras ilhas continuam com o final anterior.
- A sincronização do desenho das plataformas ocorre na prioridade -0,5, depois da física
  (-1) e antes da câmera/medidor. Não deixar a câmera ou a medição ler o desenho do quadro anterior.
- No navegador por software, DPR 0,5 reduz o custo de SwiftShader sem alterar viewport,
  física ou comandos. Capturas em pixels CSS. Isso não é prova de desempenho em GPU real.

## Resultado da conferência

916 testes aprovados, nenhum reprovado e um teste de Postgres local ignorado. Tipagem com
  limite 8192 e Biome passaram. Computador e celular emulado passaram na composição integrada,
  incluindo as quatro plataformas, pausa, conversa e descarte/retorno da ilha. Evidências e
  limites em `docs/qa/2026-10-29-nuvens/README.md`. Nenhum pedido de arte adicional.

O verificador passou a decidir a entrada durante a leitura do gamepad. Um timer separado
  atrasava o comando de pulo sob SwiftShader. Isso não muda regras, relógio ou física do jogo.
