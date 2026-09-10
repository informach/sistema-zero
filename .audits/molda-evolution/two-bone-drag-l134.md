# Arrastar o destino com as alças, lote 134

`Mover` usa as alças de translação existentes no destino pedido da articulação.
Girar/Escalar ficam indisponíveis nesse contexto; Escolher e navegação continuam.
Não há outro controlador de câmera ou segunda captura de ponteiro.

## Domínio e propriedade

- Frames preparados guardam destino/indicação privados junto às chaves em WeakMap.
  `translate(frame, offset)` parte dos números capturados, não da ponta limitada,
  de metadados visuais mutáveis ou da amostra anterior. Mantém indicação e faixa
  de flexão. Não aceita frames externos, cancelados ou sem uma prévia inicial.
- `beginTwoBoneDrag` devolve entrada vinculada ao dono e a um arraste específico.
  Somente deltas de translação são aceitos. Campos não substituem um arraste vivo;
  reset o revoga. Soltar conserva a prévia sem autokey, cancelar restaura a prévia
  anterior e cancelar a sessão retira tudo. Gravar é proibido durante o arraste.
- A oficina usa `transformActions`, adaptador capturado para poses diretas e
  assistidas. Callbacks velhos não são redirecionados ao dono/arraste atual. Fim
  reentrante durante begin revoga a entrada recebida depois da publicação. Seleção
  é copiada, não tomada por referência de um array mutável do chamador.
- Se um formulário retirou o destino, uma alça direta abandona a preparação
  inativa e inicia pose normal, com guarda de geração. Não deixar alças habilitadas
  que apenas falham por causa de uma preparação invisível.

## Interface e desenho

Campos e configuração de limites são bloqueados durante o gesto. Coordenadas do
formulário permanecem estáveis nos movimentos e sincronizam com o destino ao
terminar/cancelar. Seletores de alcance/destino devolvem null durante o arraste,
evitando atualizar esse formulário por amostra. Controles globais de pose continuam
na arquitetura existente; não afirmar ausência de qualquer render React.

Alça tem alvo próprio copiado e atualização idempotente. Destinos que não cabem na
precisão de desenho não ganham alça aproximada. Atualização só do destino acompanha
a alça mesmo sem mover a malha. Desativar a guia precisa restaurar o alvo normal:
RED mostrou a alça em x=4 após voltar a uma ponta em x=2 com matrizes iguais. Tratar
a troca de modo da guia como mudança de contexto corrigiu, sem forçar nova revisão.

## Testes

- 120 translações privadas com leitura de geometria proibida; alvos/indicações e
  metadados públicos mutados pelo teste não alteram os parâmetros capturados.
- 120 amostras na sessão, cancelamento/restauração, ausência de autosave/autokey,
  um undo, nove interrupções, entrada inválida, reset, reentrância e callbacks
  antigos de poses normais/assistidas.
- Oficina real com porta GPU substituída: trinta movimentos não mudam campos,
  soltar sincroniza, cancelar restaura, gravar coincide com playback e dá um undo.
- Alças reais de Three com eventos sintéticos: destino versus ponta limitada,
  segundo arraste no novo destino, pointercancel e segundo toque revogando somente
  o arraste. Nenhuma seleção acidental ou gravação ao soltar.

Tipos e Biome/712 passaram. Integral: 1.624 testes, zero falhas, 239 arquivos,
8.186.857 expectativas, 91,08 s. Vite passou em 1,95 s; viewport 112,50 kB,
inspetor 17,03 kB e Three 579,29 kB, com aviso de chunk >500 kB. Kids passou:
compilação 6,6 s, tipos 21,8 s, 59 páginas em 816 ms, exit 0. Diff check passou.

Limitações: testes de ponteiro são sintéticos, não homologação de toque/GPU/browser.
Interface usa setas da ferramenta Mover, não arraste livre do quadrado da guia.
Torção/cone, espelhamento de conjuntos de apoios e demais pendências do plano
continuam abertos. Formato público permanece 1.
