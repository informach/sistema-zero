# CLAUDE.md — @sistemazero/arquipelago

Estado canônico em [docs/arquipelago-estado-atual.md](../../docs/arquipelago-estado-atual.md):
código, conteúdo, prova local e implantação separados. Salvamento atual V20, teto de
65.536 bytes UTF-8, moedas do jogo até 100 por semana. Seções datadas preservam o histórico;
consultar o contrato e o teste de documento cheio antes de acrescentar campos.

## Coleções da praia e pesca (E01, 30/10/2026)

`sistemas/colecoes-da-praia.ts` mantém o catálogo das cinco conchas, estrela-do-mar e cinco
peixes. O inventário existente guarda uma lembrança por descoberta, como o cristal raro.
Nada novo na V18: álbum e mochila leem o mesmo registro. Lembranças não podem ser dadas,
comidas ou usadas em receitas. A estrela é observada e continua na areia; peixes voltam ao mar.
`itensDaBarra` preserva os insumos e reúne essas lembranças em um único botão para o álbum,
sem esconder suas entradas no inventário. Não ocupar onze espaços da HUD no celular.
O joystick flutuante é montado antes da barra visível na HUD, para a zona de gesto não
interceptar botões da mochila. Painéis continuam depois dos dois. Não contornar com clique
forçado em QA ou com um z-index alto que passe por cima das telas de pausa.

`sistemas/pesca.ts` é transitório e puro: espera 3 s ativos e permite recolher por 5 s. Pausa
congela; sair cancela; perder a janela não gasta nem remove nada. Espécies novas em ordem
fixa, sem raridade que impeça completar. O passo não aloca e limita retomadas de aba a 0,1 s.
`mundo/colecoes-da-praia.tsx` só registra comandos depois que o modelo carrega, confere chão,
altura, proximidade e política de escrita a cada ação. Visitas não permitem coleta ou pesca.
Materiais e geometrias estáticos pertencem ao cache, nunca à cópia de transformações.

O ponto do píer é compartilhado em `mundo/lugares-da-praia.ts`, longe do embarque e das estacas.
`tests/colecoes-da-praia.test.ts` confere catálogo, GLBs/ícones, espaço do corpo e save cheio.
`playground/verificar-praia-browser.ts` usa modelos reais e plataforma falsa, sem dados remotos.

## Móveis dos cômodos e salvamento V20 (30/10/2026)

V20 nos contratos: `construcao.casa.moveis` (tuplas `MovelNaObra`, até `MOVEIS_NA_CASA_MAXIMO`;
`ObraDaCabanaSchema` aceita só a lista vazia) e `farol.galeria` (a galeria do Farol, fase4-12, abaixo). O tipo
`Obra` é o da V20; `ObraAteV19` e `ObraSchema` ficam para as versões antigas. Valide a obra pelo
lugar (`ObraDaCasaSchema` ou `ObraDaCabanaSchema`), como `estado/construcao.ts`. A visita aceita a
obra antiga e completa os móveis vazios (`obraComMoveis`), para serviço e jogo trocarem de versão
sem quebrar. `sistemas/construcao/moveis.ts` tem o catálogo (`DADOS_DO_MOVEL`), `porMovel`,
`tirarMovel`, `giroDaParedeNoToque` e `movelNoLugar` (usado por `arrumar`). Os móveis entram em
`esticarParede`, `porAbertura`, `porObjeto`, aconchego e visitas dos moradores. Desenho em
`mundo/moveis-da-obra.tsx` (cópia do nó do GLB do cômodo, colisão pela caixa do próprio modelo,
menos tapete e peça de parede; a luminária acende à noite). Miniaturas `movel-<id>.png` pela
`arte/casa/miniaturas.py` e depois a paleta de 128 cores. Pior caso do salvamento: 63.989 bytes no
contrato e 64.923 com o catálogo inteiro a 999.

## Quadro das Cores da sua ilha (C03a, 30/10/2026)

`QuadroDasCores` recebe `preparada` (ilhas do anel, lugar pela chegada da ponte) ou `lugar`
(`LugarDoQuadro`). A `IlhaCentral` monta o da sua ilha em `lugarDoQuadroNaSuaIlha()`, na grama ao
lado da trilha do píer. Na sua ilha as manchas seguem os quadros feitos da lista (não há cor da
ilha), o painel não diz "Cor de volta" e o aviso do desafio do dia não sai. O mesmo vale para o
Farol (C03b): `QuadroDoFarol` monta o cavalete em `lugarDoQuadroNoFarol()` só com
`farol.concluido`, fora dos lotes da casa, e o painel esconde os quadros vazios. Conteúdo em
`docs/desafios-do-jogo/sua-ilha/`. Prova: `tests/colisao-da-ilha-central.test.ts` (o colisor do
cavalete entra na busca de caminho) e `playground/verificar-quadro-da-sua-ilha-browser.ts`.

## Modo livre e galeria do Farol (fase4-12, 30/10/2026)

`farol.concluido` liga o modo livre: `ganharProjetos` entrega todos os `OBJETOS_DA_CASA` que faltam
(`GanharProjetos` diz só `FALA_DO_MODO_LIVRE` quando chegam vários) e a Íris ganha a terceira fala.
Regras puras em `sistemas/galeria-do-farol.ts`: `VAGAS_DA_GALERIA` (seis pontos no referencial do
`alto-do-farol.glb`, conferidos contra os colisores reais), `exporNaVaga` (muda de vaga sem repetir,
guarda só até a última cheia), `tirarDaVaga`, `criacoesParaExpor` (aparências do Pinta/Molda, nunca
`origem: 'galeria'`, minijogos e Mural das lojas do serviço) e `cameraDaGaleria`. A escolha mora em
`farol.galeria` (V20); a conciliação trata a galeria inteira como o clima.
`mundo/galeria-do-farol.tsx` (montado pela `SalaDoFarol`): pedestais com colisor
`col-cil-pedestal-*` (só para o corpo), `ModeloDoObjeto` (agora exportado) encolhido num cubo de
0,85 m e quadro com a capa ou o nome para os jogos; interativo na frente de cada vaga. Painel:
`interface/galeria-do-farol.tsx` (`painelAberto` = `galeria-do-farol:<vaga>`); "Jogar" usa
`abrirJogo` de `estado/minijogos.ts`, o mesmo do fliperama. ⚠️ A vista da sala é fixa e esconde as
vagas do lado da porta: com a galeria aberta, `personagem/camera.tsx` usa `cameraDaGaleria` (de lado, abaixo do
forro do domo a 3,5 m, girando com a criança; o teste confere com raios contra a sala inteira que a
lente e o forro nunca tapam a criança nem o pedestal dela). Antes do final nada muda. Playground:
`?jogos=exemplo` põe um minijogo e um jogo do Mural nas listas da plataforma falsa; o `em=` troca o
salvamento por um novo, então o verificador semeia a posição. Prova:
`playground/verificar-galeria-farol-browser.ts` e `tests/galeria-do-farol.test.ts`.

## Coleções do Pico e das Nuvens e iscas da pesca (30/10/2026)

`sistemas/colecoes-das-ilhas.ts`: quatro notas e quatro cristais do Pico e quatro estrelas das
Nuvens, lembranças de quantidade 1 como as da praia (`registrarNaIlha`), sem campo novo. Os lugares
são do referencial do GLB da ilha; `mundo/colecoes-das-ilhas.tsx` (montado pelo `PicoVivo` e pelo
`NuvensVivo`) leva ao mundo por `paraOMundo`. O cristal rosa não tem lugar: é o do pedestal
(`cristal-do-pico.tsx`), que agora também anuncia a coleção completa. Estrelas só à noite (o
estado troca só na virada, não a cada quadro). `ITENS[*].colecao` vale `praia`, `pico` ou `nuvens`,
e `itensDaBarra` junta todas as lembranças num botão só ("Abrir o álbum de coleções").
`tests/colecoes-das-ilhas.test.ts` confere cada lugar contra os colisores reais: chão livre,
caminho a pé da chegada (na caverna, da boca), a clave no tampo `col-topo-parede-*` e 2 m dos
outros interativos. Ponto novo precisa passar nesse teste antes de entrar.

`sistemas/iscas.ts`: minhoca (espera 1 s) e pena (janela 10 s). `EstadoDaPesca` guarda a `regra`
e a `isca` do lançamento; `agirNaPesca` devolve a isca só ao recolher, e é aí que o mundo a gasta.
`loja.isca` é transitório (vale só com ela na mochila, `iscaValendo`). A isca de graça
(`LUGAR_DA_MINHOCA`, `LUGAR_DA_PENA` em `mundo/lugares-da-praia.ts`) aparece só com a mochila sem
nenhuma. As duas entraram nos `INSUMOS` dos contratos (fonte `praia`). Prova no navegador:
`playground/verificar-colecoes-e-iscas-browser.ts` (`ARQUIPELAGO_PARTE=pico|nuvens|iscas`).

## Orientação no final do Farol (30/10/2026, A04)

`Hud` usa o estado do final e do corte para suspender Agora, rotina, mochila e primeiros
passos. `PainelDoFarol` orienta a mesa na sala e conserva as falas próprias nas etapas seguintes.
Não concluir ou apagar tarefas para organizar a tela. Ao desmontar `PrimeirosPassos`, limpar
apenas a guia 3D e `tela`; a loja conserva progresso e fila. O menu do Farol não oferece iniciar
ou rever o tutorial. `Dica` continua montada e vence no prazo normal enquanto oculta.
`estado/loja.ts` carimba `dica.expiraEm` na emissão, fora do salvamento. HUD e cartão do
tutorial usam esse mesmo prazo de sete segundos; remontar não renova recados antigos.
Provas: `passos-desmontagem.test.ts` e `verificar-final-farol-browser.ts`, incluindo retomada.

## Visitas adultas por convite (L12, 30/10/2026)

`estado/visitas-adultas.ts` é por montagem. Receber começa desligado, com código revogável
gerado no serviço. O código só vive na tela e no pedido, nunca em URL, save ou localStorage.
Resposta de alteração perdida vira estado desconhecido, para reler. Fechar o painel invalida
operações pendentes; desmontar retira a visita. As recusas Kids e suporte também valem na API.

`interface/visitas-adultas.tsx` usa o tema/painel existente e não aparece no Kids. A visita
reutiliza `sistemas/visitas.ts`, com origem adulta explícita, sem permissão de mudar o save.
A cada 15 s visíveis e ao retomar, a confirmação pequena tem prazo de 5 s. Recusa/falha volta
à casa própria; não prometer push instantâneo. `chegada-da-visita.ts` é comum à família Kids.

Playground: `?publico=adulto&visita-adulta=1`; `visita-adulta=revogar` recusa a próxima
conferência. O consentimento falso é em memória, sem persistir código de teste. Prova visual:
`verificar-visitas-adultas-browser.ts`, com contextos novos para massas independentes, sem
apagar rascunhos para contornar conflito. V18, física e limite de tempo Kids não mudam.

## Pausa do quarto (30/10/2026, A03a)

`Quarto` em `mundo/casa.tsx`, tanto próprio quanto visitado, propaga `jogoPausado` pelo
`RoomPausedContext`. Não usar `RoomMotionContext` para pausar: ele encerra a ação e restaura
a pose neutra. Esse contexto continua controlando menos movimento, combinando a preferência
do aparelho com a do Conforto. `Pet3D.paused` congela passeio e balanço; o relógio é local.
Prova de mixer real: `tests/quarto-pausa.test.ts`. Prova visual de poses, menu, preferência
e visita: `playground/verificar-quarto-pausa-browser.ts`, com `?pet=passaro`. O medidor expõe
`__arquipelagoLerQuarto()` somente quando habilitado, sem percorrer as poses a cada quadro.

## Ritmo básico e cuidado (30/10/2026, A03c)

`sistemas/necessidades.ts`, `RITMO`: ótimo 1,1; bem e cansado 1. Cuidado oferece bônus, sem
reduzir o ritmo básico de andar, correr, nadar ou equilibrar quando uma necessidade está baixa.
Comida, gasto e descanso continuam nas regras existentes. `tests/sistemas.test.ts` cobre os
limites e `tests/modos.test.ts` passa necessidades reais ao movimento. A prova do navegador
`verificar-ritmo-browser.ts` observa velocidade, deslocamento, pulo e pouso com energia 10.
O medidor opcional inclui `velocidade` na leitura sob demanda de `__arquipelagoLerCorpo()`.

## Fantasma familiar dos percursos (L10, 30/10/2026)

`estado/fantasmas.ts` é por montagem. O gravador recebe o relógio ativo das corridas genéricas
e do balão. `armazem-fantasmas.ts` é um diário IndexedDB separado da V18, por público/perfil,
com um melhor por percurso. Só envia após a fila confirmar o save e a leitura do recorde.
Resposta perdida conserva o envio; confirmação antiga não apaga um trajeto mais rápido.

Os recordes da família oferecem seguir o trajeto. BFF e serviço conferem família e permissão;
ao começar, retomar a aba e a cada 15 s visíveis a referência é lida de novo, com prazo de 5 s.
Nas conferências periódicas, usar a lista dos recordes em vez de baixar novamente as amostras.
Recusa/falha retira a imagem, sem parar a corrida. Adultos guardam seus trajetos, sem ler irmãos.
Não há prêmio, nome persistido, alteração de V18 ou promessa de validação antitrapaça.

`mundo/fantasma-familiar.tsx` reutiliza o avatar padrão com material e ossos próprios, sem corpo
do Rapier. `AvatarRig` passou a separar ossos, cores e morphs por montagem. O desenho interpola
as amostras pelo relógio da corrida; a pausa não o avança. Nada aloca no passo do gravador/replay.
`?familia=irmaos&fantasma=1` prepara uma trajetória simulada da Vila pelas âncoras reais, só no
playground. Prova: `playground/verificar-fantasma-browser.ts`, relatório em `docs/qa`.
No reinício, a captura só começa no primeiro quadro do relógio ativo, depois do corte e do
teleporte. A plataforma falsa persiste os próprios artefatos de QA; `novo=1` limpa só essa massa.

## Primeiros passos com o Zappy e dicas de primeira vez (30/10/2026)

Proposta aprovada no canvas `https://claude.ai/artifact/X1GNotDTxZpdJsNG5QvhW8` (decisões com as
sugestões do canvas: marca no aparelho, o X recolhe a tarefa, quem já tem a geladeira só vê pelo
menu, o nome "Primeiros passos"). Notas e prints: `docs/qa/2026-10-30-primeiros-passos.md`.

- Regras puras: `sistemas/primeiros-passos.ts` (`PASSOS`: 6 capítulos e 23 falas; `feito`,
  `jaFeito` vira lembrete, `pular`, `esperar`; `passoQueVale`, `voltarAoConstruir`,
  `deveComecarSozinho`, `lerMarca`) e `sistemas/dicas.ts` (`DICAS`: Quadro, painel do Quadro,
  barco, chegada de barco, lanterna, borrão, primeiro Lumi e primeira noite). Ler e fechar nunca
  conta: a tarefa só se cumpre pelo jogo mudando (andar 2 m, girar a câmera, pular, a porta, a
  etapa do primeiro pedido, o menu, a obra). O passo da horta segue `primeiroPedido`.
- ⚠️ A geladeira não vai no quarto (`objeto-no-quarto`) e a frente da porta nova é a varanda
  (ocupada no lote): a obra do capítulo 6 é Construir, Parede (cômodo encostado na casa), Porta
  do cômodo, Objetos e Pronto. "Depois" deixa `obraPendente` e a obra volta (falas 18 a 22) quando
  o Construir da casa abre.
- Loja: `estado/primeiros-passos.ts` (`lojaDosPassos(loja, plataforma)`, uma por montagem: o
  passo, a fase fala/isso/lembrete, a fila das dicas, `tela` com o anel e o cartão) e
  `guiaDoZappy(loja)` (mutável, lido a cada quadro pelo Zappy e pelo facho). Marcas no aparelho:
  `arquipelago:passos:<publico>:<perfil>` e `arquipelago:dicas:<publico>:<perfil>`; o salvamento
  não muda.
- Tela: `interface/primeiros-passos.tsx` (`PrimeirosPassos` na HUD confere o jogo a cada 250 ms,
  dispara as dicas e mostra o `CartaoDoZappy`; `CartaoDosPassosNoMenu`, `FalaDosPassosNoMenu`,
  `ReverOsPrimeirosPassos` no Diário, a linha no Agora por `useLinhaDosPassos`). O cartão nunca
  toma o foco e solta o foco depois do clique: com um botão focado, o teclado não anda
  (`controles/controle.ts`). Com o cartão na tela, a fala solta do jogo entra nele (recado) e o
  `.arq-dica` não aparece. O anel é `data-anel` na raiz da HUD (`estilos.ts`).
- Mundo: `mundo/guia-do-zappy.tsx` (facho e anel no alvo, círculo do "andar") e o Zappy voando
  até o alvo (`personagem/zappy.tsx`; com menos movimento ele aparece lá).
- Começa sozinho ao abrir o jogo sem abertura (`jogo.tsx`) ou quando a abertura da primeira vez
  fecha (`interface/abertura.tsx`), no lugar da boas-vindas. Falas trocadas: a geladeira ganha
  (horta), a planta de interior espera o fim (`GanharProjetos`), o aviso do desafio de hoje e o
  borrão fugindo viram dica na primeira vez. As falas que tocam na jornada vêm da voz
  (`VozDoJogo.passos`).
- Conserto da HUD junto: no Construir o "Agora" sai e o cartão do Zappy vai para `top:136px` (no
  computador ele cobria o Agora e encostava no cartão de quem joga).
- Playground: `?passos=1` (do zero), `?passos=manter`, `?dicas=1`; sem eles, passos feitos e dicas
  desligadas. Testes: `tests/primeiros-passos.test.ts` e `tests/primeiros-passos-loja.test.ts`;
  navegador: `playground/verificar-passos-browser.ts` (`ARQUIPELAGO_PARTE=passos|celular|dicas`).

## Descarte das cópias animadas (30/10/2026, A01)

`copiarArteAnimada` é dona dos esqueletos clonados e dos materiais de brilho que duplica.
`soltar()` descarta cada esqueleto próprio, incluindo sua `boneTexture`, e os materiais próprios.
Não descartar geometria, textura de material ou material compartilhado com o GLB em cache.
O descarte continua seguro se chamado de novo, inclusive após realocação da textura por um efeito
remontado. A prova do Farol repete três entradas/saídas após aquecimento e confere texturas além
de geometrias. Teste puro: `arte-animada-descarte.test.ts`.

## Integração dos portos de 30/10/2026

Os cinco GLBs do commit `080b6a3d2` estão integrados. `raioDaEsperaDaIlha` amplia a espera
somente no setor de 35 graus para cada lado do porto. Limites com folga do corpo: Bosque
26,7 m, Vila 19,2 m, Pico 19,6 m, Vale 19,1 m e Nuvens 25,9 m. A caverna do Pico conserva
o limite maior de 28 m. Nenhum desses setores ultrapassa a ativação da ilha, a 30 m.
`portos-das-ilhas.test.ts` percorre os vértices reais dos novos colisores; os testes do Pico,
Vale e Nuvens não excluem mais o porto da cobertura. Isso protege a reabertura sobre o deque.
Os portos fazem parte das ilhas completas. A rede e a transformação das âncoras estão
implementadas no recorte L10 descrito na seção do barco abaixo. O fantasma familiar continua separado.

## Receitas sazonais (L09, 30/10/2026)

O vestuário usa a ferramenta `avatar`/`vestir`, molde V1 estrito com a festa. A feira só abre
durante uma festa atual. Peças, posse, preço e confirmação são do configurador do Members.
O retorno `avatar-pronto` substitui o avatar da montagem e atualiza o saldo; cancelar não grava
a prévia. O jogo pausa enquanto a ferramenta abre. V18 não recebe roupa nem preço.
Na plataforma falsa, o editor ausente responde `playground`; molde inválido e suporte têm
recusas próprias. A prova visual usa o diálogo real em uma fixture local, descrita no QA.

A Salada do Carnaval usa alface, tomate e milho na bancada; o Milho da fogueira usa milho na
Junina, junto da pipoca existente. São pratos com ícones do inventário, sem modelo 3D novo.
`receitaEmEpoca` recebe a festa explicitamente. Diário conserva as receitas; bancada automática
e painel conferem a época novamente ao agir. `fazerReceita` recusa prato de outra festa e save
acima de 65.536 bytes sem consumir ingredientes. Pratos prontos não expiram nem somem.
`festaAtual` aceita override apenas da plataforma falsa; as datas não aprovadas continuam desligadas.

## Compra de insumos (L07, 30/10/2026)

A feira oferece onze sementes/ingredientes e as duas iscas do catálogo V1 compartilhado, uma a dez unidades.
O painel informa quantidade, preço total e fontes gratuitas, com confirmação e cancelamento.
`FilaDeSalvamento` guarda a base e o comando UUID no mesmo diário IndexedDB, fora de V18,
antes de chamar o serviço. O estado `confirmando` pausa o mundo e permite retomar na proteção do
salvamento. A abertura consulta pendência antes de iniciar o jogo. Ao fechar, não inicia novas
consultas; um comando sem resposta fica disponível para a próxima abertura.

Só reaplicar um comando conhecido ao rascunho em voo se revisão e snapshot inteiro da resposta
forem exatamente a entrega esperada. Não somar inventários remotos arbitrários. Concorrência
divergente mantém o conflito e o rascunho. GET/POST de insumos usam apenas a ponte da plataforma.
O jogo nunca importa o Members. `insumos-falsos.ts` reproduz comandos e recusas no playground;
a prova de débito único real está nos testes locais do serviço, não no playground.

Evidências em `docs/qa/2026-10-30-insumos/README.md`; implantação em
`docs/operations/arquipelago-insumos.md`.

## Pedidos remunerados (L07, 30/10/2026)

Os seis moradores usam o catálogo, as receitas e `prepararEntregaDoPedido` dos contratos.
O dia é o de São Paulo. A conversa só calcula uma prévia das falas: a fila confirma consumo,
amizade, cesta e três moedas (quatro com humor ótimo) no serviço. Nunca aplicar a prévia ao save.
O teto semanal de 100 é o mesmo das outras recompensas, na carteira do Members.

O diário IndexedDB guarda `entrega` antes de enviar, fora de V18, mutuamente exclusiva com
`compra`. `retomarOperacoes` consulta a reserva de insumos e no máximo um crédito pendente.
Crédito pendente não prende o salvamento, pois o consumo já aconteceu. Resultado de teto é
terminal e não acumula dívida. Reabrir usa a mesma chave e recebe o save mais recente.

Durante `confirmando`, o modal bloqueia comandos e preserva o painel/câmera da conversa.
Conflito, recusa e fim do tempo ainda o fecham. O recibo pode aparecer enquanto o relógio
retoma, mas a interface mantém as ações bloqueadas. Resposta tardia não reabre painel fechado.
O playground usa a mesma entrega pura; a prova de carteira real usa bancos locais descartáveis.

## Mapa das visitas (L10, 30/10/2026)

O salvamento atual é V18, com `ilhasVisitadas` em oito bits estáveis. `sistemas/exploracao.ts`
é a regra pura; `estado/exploracao.ts` respeita pausa, modo, suporte, visita e carregamento.
`mundo/descoberta-da-ilha.tsx` só observa chão disponível: raio 12 no anel, 24 na central e
4 no Farol aberto. Nas Nuvens, a altura mínima é 8 m. Um bit já marcado não gera nova gravação.
`conciliar-salvamento.ts` faz união das descobertas, sem mudar a transação de inventário.
O mapa distingue acesso pela jornada de visita física. O marcador indica a região mais próxima,
não é prova de presença. `playground/verificar-mapa-browser.ts` confere persistência e interface
nos dois tamanhos. Não inferir visitas antigas por posto, ponte vista ou posição guardada.

## Feira semanal (L09, 29/10/2026)

`sistemas/semana.ts` é a semana civil compartilhada pelo tema e pela feira. `feira.ts` destaca
três aparências existentes e conserva o catálogo inteiro. `mundo/feira.tsx` usa `barraca-6`,
sem geometria ou colisor novo. `interface/feira.tsx` reutiliza `CartaoDaGaleria` e a loja existente:
mesma confirmação, preço, posse e saldo do serviço, sem segunda carteira. Projeto azul ausente,
suporte, tempo, visita ou conflito não oferecem compra. Desmontar a ilha fecha o painel.
`verificar-feira-browser.ts` prova interação, confirmação/cancelamento, compra e reabertura no
playground local. A unificação da propriedade no Members é L04, ainda não concluída.

## Tema semanal no diário (L09, 29/10/2026)

`sistemas/tema-da-semana.ts` calcula a segunda-feira civil de São Paulo e o índice da lista V1
(referência 26/10/2026, seis temas). `interface/tema-da-semana.tsx` mantém as outras ideias
selecionáveis, sem prazo, prêmio, persistência ou alteração de obras. Reabre Construir pela
loja existente e só na própria casa. Não confundir sugestão criativa com objetivo do Estúdio.


## Convidados pelo aconchego (L06, 29/10/2026)

`sistemas/visitas-dos-moradores.ts` calcula visita (12 pontos) ou festa (22) por cômodo,
com moradores conhecidos de ilhas liberadas. Usa planta, área dos objetos e footprint dos
móveis; valida a circulação desde a porta antes de ocupar uma célula. Sem prêmio novo ou save.
`estado/convidados.ts` é por montagem; `mundo/convidados.tsx` só mantém modelos perto da casa.
O morador original é ocultado enquanto está na casa. Reutilize `MoradorDaIlha`, sem duplicar
amizade/conversas. A posição memorizada evita fechar a conversa nas atualizações do jogo.
`Moradores em casa` no menu permite festa, visita e descanso. Suporte, tempo, conflito,
construção e visita alheia recusam presença. `?convidados=1` prepara somente o playground.


## Profissões e entrega inteira (L07, 29/10/2026)

`estado/turno.ts` abre uma sessão do serviço antes do balcão e manda as seis bandejas aceitas.
`sistemas/profissoes.ts` guarda a confirmação sem resposta por perfil/público/balcão no aparelho;
limpa só ao receber a mesma sessão concluída. Pendência de pagamento confirmada passa a ser do
servidor. Fechar/reabrir invalida respostas antigas da UI. Não inventar saldo ou moedas locais.
Os três balcões ganham 5 moedas/dia cada, dentro das 100 semanais de todo o jogo.

As regras puras dos pedidos estão em `arquipelago-contracts/src/turnos.ts`; o jogo adapta só
ingredientes e amizade. `adicionarConjunto` recusa uma cesta que não cabe inteira. Bento não
consome presente/pedido nem cruza a amizade de uma receita enquanto sua cesta não couber.
O playground simula as mesmas recusas e crédito idempotente, separado do salvamento.
Testes: `tests/profissoes.test.ts`, `turnos.test.ts`, `receitas-do-bento.test.ts`.

## Receitas por amizade e coleção (L08, 29/10/2026)

`sistemas/receitas.ts` é o catálogo único de receitas e suas origens. `receitaConhecida` recebe
o salvamento inteiro: não deduzir mais o livro apenas dos corações do Bento. Diário, álbum,
bancada e forno usam a mesma régua. Maré, Floco, Jade e Iriê ensinam com um coração; os quatro
bichos do Bosque liberam a salada colorida. Os pedidos dos quatro moradores entregam a cesta
de ingredientes não cultiváveis, numa operação inteira: se não couber, nada é consumido nem
marcado como entregue. Não adicionar item de recompensa ao render nem alterar o save histórico.

O catálogo tem 12 receitas e 30 itens de mochila. O cenário combinado de obra, rotinas,
aparências e amizades, com cada item a 999, usa 63.055 bytes (margem de 2.481). A prova é
`tests/receitas-do-anel.test.ts`, usando o gerador compartilhado de cenários pesados dos contratos.
Isso é uma prova do cenário construído, não uma promessa de que qualquer JSON arbitrário cabe.
O teto continua obrigatório na gravação.

No álbum do Recife, conte apenas baú, página e tesouro por `albumDoSalvamento().recife`.
`corais` é uma máscara de progresso e nunca é uma quarta descoberta.

## Colheita especial e prévia V2 (29/10/2026)

`sistemas/colheita.ts` monta o contexto da horta: necessidades atuais e clima só após Nuvens.
`mundo/horta.tsx` e `sistemas/rotina.ts` passam esse contexto para a mesma `colher` dos contratos.
Clima favorável soma 1 e humor ótimo soma 1; a recusa por carga/mochila deixa a planta madura.
O mini estúdio recebe uma cópia no molde V2. O mundo relê o contexto ao aplicar o passo, sem
salvar o resultado da prévia. V1 segue legível sem contexto. Não adicionar outro cálculo no
editor ou campo nos canteiros. Plano L08 em `docs/superpowers/plans/2026-10-29-arquipelago-lumis-e-colheita.md`.

## HUD nova, menu de pausa e abertura "O Cinza" (29/10/2026)

- Proposta aprovada no canvas `https://claude.ai/artifact/Mz6AmdkuYdc9jb3mR6yuPd`; notas e prints em
  `docs/qa/2026-10-29-arquipelago-hud.md`.
- `interface/hud.tsx`: as partes da HUD (`QuemJoga` com o retrato do avatar, `IlhaAgora`, `Relogio`, `Agora`, `Dica`,
  `Mochila`, `BotaoDaFoto`, `AlturaDoBalao`, `Cronometro`). As contas puras moram em
  `sistemas/hud.ts` (ilha mais perto, Quadro das Cores, lembretes do "Agora", atalhos 1 a 5).
  `.arq-hud.em-atividade` (corrida ou balão) esconde o que não é da atividade; `.entrando` faz a HUD
  aparecer depois da abertura. Classes que os verificadores usam continuam (`.arq-necessidades`,
  `.arq-topo-dir`, `.arq-dica`, `.arq-acao`, `.arq-modos`, `.arq-inventario`), assim como os nomes
  "Abrir o menu", "Menu do jogo", "Continuar jogando" e "Usar".
- `interface/menu.tsx`: o menu de pausa (lugares, Início, Conforto e controles, mapa pequeno).
  `interface/mapa.tsx` dá `useIlhaAqui` (a ilha onde a pessoa está) e `MapaPequeno`.
- `interface/icones.tsx`: ícones de traço (24 px, `currentColor`, sempre `aria-hidden`). Item da
  mochila continua com o emoji do item (é a arte dele).
- CSS: o bloco novo fica no FIM de `ESTILOS` (sobrescreve o antigo de mesma força). Posição só de
  computador vai em `@media (min-width:641px)`, para não atropelar as regras antigas de celular.
  Tokens na `.arq-raiz`: `--arq-titulo` (Baloo 2 do Kids; o adulto troca pelo dele). A pele adulta
  deixa o menu claro (bancada) e a HUD na noite dela.
- Abertura: roteiro e tempos em `sistemas/abertura.ts` (`CENAS`, `momentoDaAbertura`,
  `deveMostrarAbertura`), pinturas em `interface/abertura-cenas.tsx`, tela em
  `interface/abertura.tsx` (painel `PAINEL_DA_ABERTURA`: o mundo para por baixo e a cena 3D deixa de
  desenhar, `mundo/cena.tsx`, até a saída começar). Aparece sozinha uma vez por público e perfil no
  aparelho (chave `arquipelago:abertura:<publico>:<perfil>`, `estado/abertura.ts`) ou num jogo novo
  sem armazenamento; nunca no suporte. O `carregar()` do `jogo.tsx` já a abre antes do primeiro
  quadro. Abra sempre por `abrirAbertura(loja, 'primeira' | 'rever')`: a `lojaDaAbertura` guarda a
  origem e o `saindo`. Só a `primeira` marca como vista e termina com a primeira fala do Zappy
  (`boasVindas` ou os primeiros passos); fechada à força (tempo pausado ou acabado, salvamento parado) não marca.
  A leitura começa manual, sem prazo, por `LEITURAS_DA_ABERTURA` e `navegarLeitura`: nove falas
  nas oito cenas. Anterior/Próxima interrompem o automático; Começar só aparece na última fala.
  Passar sozinho e Pausar leitura controlam o tempo ativo, preservando o instante na pausa e
  descontando abas escondidas. Enter/Espaço mantêm a ativação nativa dos controles visíveis;
  no palco, Enter avança e Espaço segurado pula. As setas navegam por fala. Blur cancela o
  gesto de pular. Prova: `playground/verificar-leitura-browser.ts` e os testes de abertura.
  O texto segue a história da
  proposta e NÃO conta o segredo do Farol.
- **Cenas da abertura são o jogo de verdade** (pedido dela, 29/10/2026): `interface/abertura-cenas.tsx`
  mostra as imagens de `src/assets/abertura/*.webp` (o arquipélago colorido e cinza de cima, a Íris na
  sala do Farol e a sala vazia desbotada, o barco de noite na chuva, a chave e a carta no píer, a casa
  de noite e o Zappy no quarto, olhando para a câmera), com o `arq-ab-fundo` deslizando e, por cima, só
  a névoa, o clarão do raio e as palavras da carta. Para refazer: `playground/capturar-abertura.ts`
  (as `TOMADAS`: URL do playground, palco e peças soltas; `ARQUIPELAGO_SO` escolhe), que usa o palco
  do medidor (`mundo/palco-de-print.tsx`: `__arquipelagoPalco` com câmera parada, `olharPara`,
  `alturaDoAlvo`, `virarParaCamera`, `esconder`, `semNevoa`; `__arquipelagoPorNaCena` com os GLB que
  o servidor do playground serve em `/modelos/`). Depois, PNG para WebP (a sala vazia perde quase toda
  a cor). `?quadros=feitos` deixa o Bosque inteiro colorido. ⚠️ Não editar `src` durante a captura:
  o servidor recompila a cada página.
- **Retrato na HUD**: `mundo/retrato-do-avatar.tsx` desenha só o avatar (camada 7, com a luz própria
  do retrato, que o jogo não vê) numa imagem de 128 px, com o enquadramento da foto de rosto da
  plataforma (`sistemas/retrato.ts`: 45% de cima, 80% do quadro, de frente); tira quando ela fica
  parada e de novo quando as peças mudam (`estado/retrato.ts`). Sem retrato, a inicial. ⚠️ As peças
  têm esqueleto: a caixa vem de `SkinnedMesh.computeBoundingBox` (a da geometria é minúscula).
- Playground: a abertura só aparece com `?abertura=1`. Navegador:
  `playground/verificar-hud-browser.ts` (computador, notebook e celular; abertura, sobreposição das
  partes, tecla 1, menu, diário, noite e corrida). Testes: `tests/hud.test.ts`, `tests/abertura.test.ts`.

## Portos do barco: a arte (30/10/2026)

- Pedido de arte da rede do barco: Bosque, Vila Doce, Pico, Vale e Nuvens ganharam o nó `porto`, as
  âncoras `barco` (linha d'água, proa no +x da âncora) e `cais` (os pés no tampo do deque) e os
  colisores `col-cais-*` (o que se pisa), `col-guarda-cais-*`, `col-cil-estaca-cais-*` e, nas Nuvens,
  `col-cais-torre`. O mesmo arranjo do cais do Recife (barco a 2,2 m do eixo, ao lado da ponta; `cais`
  1,2 m antes dela). Gerador comum: `arte/mundo/lib_cais.py`; lugar no `PORTO` de cada script.
- ⚠️ Nas Nuvens o mar é y = −7 no arquivo (a ilha fica a y = 7): o porto é um deque no mar e uma torre
  de escada até o tampo (29 espelhos de 0,249, sem elevador nem peça que se mexe), com a escadinha de
  sair do mar. `ancorasDoPorto` (`mundo/portos.ts`) monta com y = 0: some `ALTURA_DAS_NUVENS` ali.
- A rede ainda não está ligada. O porto passa da espera pelo chão (os testes de espera do Vale, Pico e
  Nuvens deixam `doPortoDoBarco` de fora até ela ser recalculada) e cruza a roda de boias de 19 m.
- Números de cada ilha, percurso das Nuvens e limites dos colisores:
  `docs/plans/2026-10-30-arquipelago-portos-do-barco.md` (e o bloco `porto` dos relatórios de arte).
  Testes: `tests/portos-das-ilhas.test.ts` (âncoras, pés no deque, caminhada do cais ao tampo, casco
  e corredor do casco livres). Prints: `docs/qa/2026-10-30-portos-do-barco/`.

## Ajustes da arte aj-ligar-02 a 09 (29/10/2026)

- `sistemas/ajustes-da-arte.ts`: fase FNV-1a por id e clipe, patins +0,089 m só no desenho (`ELEVACAO_DOS_PATINS`),
  voo (borboleta 1,6 m, bem-te-vi 2,8 m, pássaro das Nuvens 3,2 m) e pelo menos 0,6 m acima
  do topo de obstáculos informado pelo chamador. A rota futura deve fornecer esse topo por ponto.
- `mundo/arte-animada.ts`: cópia de esqueleto e morfos, materiais noturnos próprios e descarte.
  `luz`, `perolaLuz`, `cristalLuz` e os quatro papéis das lanternas ficam sem emissão de dia
  e recuperam a força original à noite. Seguem `ambiente.noite`, como a casa e o lampião.
  `IlhaCompleta` também prepara essas luzes, inclusive materiais transparentes, para o Recife futuro.
- `useCopiaAnimada` configura `virar`, `abrir`, `abrir-interna` e `estourar` como LoopOnce com
  clampWhenFinished, além dos clipes de uma vez explícitos de cada personagem. `trocarClipe`
  exige id estável; só laços recebem fase, ações únicas sempre começam no primeiro quadro.
  Capi, Nico, Lumis da praia, bichos do Bosque e adotado usam a regra. Não usar a ordem da lista como id.
- `PecaDaArte` mantém âncora/giro fora da raiz do mixer, para o barco balançar sem sair da posição.
  Sua fala tem id e texto; Íris move B/C/D em todas as três submalhas da cabeça, a 12 letras/s,
  peso até 0,8, sem mexer no smile. Pausa congela o tempo, pontuação e fim fecham a boca.
  O id permite recomeçar uma fala de texto igual. A pausa usa o mixer e preserva clipes terminados.
- `CapsulaDoPinguim` deve ficar dentro do corpo do pinguim, fora da escala do desenho. Adulto:
  raio 0,13 m, meia altura 0,11 m em pé e 0,12 m deitado; centro y 0,24/0,14 m, z 0/0,24 m,
  giro X 0/90 graus. Filhote usa 60% das medidas. Só uma cápsula existe por vez.
- `AvatarDoJogo comPatins` eleva o desenho (`ELEVACAO_DOS_PATINS`, 0,089) e calça o par (`personagem/patins-nos-pes.tsx`),
  sem mudar a cápsula do jogador. A sala mostra também um par solto ao lado para conferir as rodas
  (some nas vistas de perto, `?vista=`). O jogo calça pela mochila (fase2-05, abaixo).
- ⚠️ As peças do avatar (`community-kids/public/avatar3d/parts`) já estão na escala do avatar do
  jogo: do arquivo delas ao `avatar-visual` a escala é 1 (medido em 29/10/2026). O `AV = 0.751` dos
  scripts de `arte/festas` não vale para elas; o patim é desenhado com ele e crescido por `1 / AV`.
  Peça vestida nova (mergulho) precisa conferir isso antes.
- `/arte` no playground exercita os componentes e os GLBs reais. Ainda não há Recife/Pico/Nuvens,
  Íris, pássaros, pinguins, baús animados ou festas montados no mundo. A implementação dessas
  mecânicas deve consumir estes componentes, sem copiar regras. Lumis da praia já acendem no jogo.
- Testes: `tests/ajustes-da-arte.test.ts`; navegador: compilar `playground/verificar-arte-browser.ts`
  para Node com `bun build --target=node --external playwright-core`. Provas e prints em
  `docs/qa/2026-10-29-arquipelago-ajustes-arte.md`. Nenhum Blender ou GLB foi alterado.

O jogo 3D **Arquipélago Vagalume** no navegador (React Three Fiber, Rapier, zustand). Proposta e
decisões da dona: Canvas `https://claude.ai/artifact/5eNo1oqsndxmV6MPLxaz1W` e `docs/arquipelago.md`.

## Regra de ouro: separado da plataforma

- Mudar o jogo não pode quebrar a plataforma, e mudar a plataforma não pode quebrar o jogo.
- **Imports permitidos** (teste `tests/fronteira.test.ts`): react, react-dom, three, zustand,
  `@react-three/{fiber,drei,rapier}`, `@sistemazero/arquipelago-contracts` e
  `@sistemazero/avatar-quarto`. Nada de `@sistemazero/ui`, member-shell, sessão, rota ou cookie.
- **Nenhum pacote da plataforma importa o jogo.** A página da plataforma lê o `manifesto.json`
  publicado e carrega `entrada-[hash].js` por URL.
- O avatar e o quarto vêm do `avatar-quarto` (os mesmos componentes da plataforma). As
  ferramentas (Pinta, Molda, Estúdio) nunca são copiadas: o jogo pede
  `plataforma.abrirFerramenta()` e a plataforma abre a ferramenta de verdade por cima do jogo,
  então qualquer melhoria nelas aparece no jogo sozinha.

## Entrada e porta

- **Pele adulta (fase3-13, 29/10/2026):** a voz das telas que falam da plataforma mora em
  `interface/voz.ts` (`VozDoJogo`, `VOZ_KIDS`, `VozContexto`, `useVoz`: telas de abrir, fechado,
  descanso e erro, o "voltar", a luneta, o Molda fechado e a compra no suporte). O adulto fica em
  `src/adulto/` (`voz-adulta.ts`, `estilos-adultos.ts`, juntos em `pele-adulta.ts`), e ⚠️ só o
  `jogo.tsx` chega lá, por `import()` (`usePele`): o build separa o pedaço e o Kids não o baixa
  (`tests/pele-do-jogo.test.tsx` trava). A `entrada.tsx` dá `.arq-adulto` à raiz e todo o CSS
  adulto vive dentro dela; o piso de 15 px é gerado do próprio `ESTILOS` (`pisoDaLetra`), então
  regra nova do Kids já nasce coberta. Texto novo que fale da plataforma, da jornada ou da família
  entra na voz (com a versão adulta), não solto no componente. Família (visitas, recordes) só com
  `plataforma.publico === 'kids'`. O mundo também lê a voz (o R3F 9 leva o contexto para dentro
  do `<Canvas>`): a placa da ponte fechada (`placaDaPonte`, `recadoDaIris`) e a fala da luneta.
  Navegador: `playground/verificar-pele-adulta-browser.ts`
  (`?publico=adulto`, computador e celular emulado, a tela de fechado e o Kids de sempre).

- `src/entrada.tsx`: `montarArquipelago(elemento, plataforma)` cria a própria raiz React, injeta o
  CSS (tudo com prefixo `arq-`) e devolve `desmontar()`. Confere `versaoContrato`.
- Tudo o que o jogo sabe da plataforma passa pelo objeto `Plataforma` do contrato (ler jornada,
  avatar e quarto, gravar quarto, `servico.buscar` para o serviço do jogo, abrir ferramenta,
  voltar, relatar erro).
- `src/plataforma/falsa.ts`: plataforma de mentira com serviço em memória (acesso, salvamento com
  revisão, tempo livre). Usada pelo playground e pelos testes.

## Pastas

- `estado/`: loja zustand (uma por montagem), contexto, relógios (necessidades, posição, tempo).
- `sistemas/`: regras puras e testadas (dia e noite, itens, necessidades, horta, receitas,
  fila de salvamento, tempo livre com `armazem-tempo.ts` e `fila-tempo.ts`, câmera, Zappy, ilhas
  completas, cipó, escalada, percurso, as medidas do corpo, a Capi (`moradores.ts`,
  `falas-da-capi.ts`, `conversa-da-capi.ts`), o esconde-esconde (`esconde.ts`), o caminho pelo
  chão (`caminho.ts`) e o bicho adotado (`bichos.ts`, `cuidar.ts`, `seguir.ts`)). Sem React. Os
  números de cada regra, em linguagem da dona: `docs/arquipelago-regras.md`.
- `mundo/`: medidas da ilha, céu, água, ilha central, casa com o quarto real, horta, bancada,
  farol, anel de ilhas com pontes, e o Bosque vivo (`bosque.ts`, `bosque-vivo.tsx`).
- `personagem/`: corpo cinemático com controlador do Rapier (andar, correr, pular, nadar, cipó,
  escalada), avatar com as mãos na corda no cipó, câmera e o Zappy.
- `controles/` e `interface/`: teclado, toque, HUD (com o cronômetro do percurso) e telas (com o
  resultado do percurso).
- `assets/`: arquivos importados como arquivo (o Bun copia com hash para `dist/cliente/`). Resolva
  sempre com `new URL(caminho, import.meta.url)`: o caminho é relativo à pasta do cliente, não à
  página. O Zappy (`assets/zappy.glb`, animações `voar` e `parado`, material `luz` na bunda) sai
  de `arte/zappy/zappy.py` (Blender sem tela, o mesmo `bpy` das peças do quarto).
- `assets/mundo/`: o mundo feito no Blender (chão, árvores, casa, horta, bancada, farol, píer,
  pontes e ilhas do anel), um script por peça em `arte/mundo/` (`build_all.py`, nós e materiais
  no README de lá). `mundo/modelos.tsx` carrega; cada peça mostra a forma simples do código até o
  modelo chegar. Colisão: veja "Colisão das peças" abaixo.

## Passo da física (28/10/2026, física viva etapa 1)

- `<Physics timeStep={PASSO_DA_FISICA} interpolate updatePriority={-1}>` (`mundo/cena.tsx`,
  `PASSO_DA_FISICA` = 1/60 s em `mundo/medidas.ts`): passos fixos, com o desenho dos corpos
  suavizado entre passos, e os passos rodam antes dos outros `useFrame`.
- Quem move corpo do Rapier calcula o movimento em `useBeforePhysicsStep` com o `dt` fixo
  (`personagem/personagem.tsx`, `mundo/bicho-adotado.tsx`); o desenho (pose, giro, clipes) fica no
  `useFrame`. O `rastro` sai da posição suavizada (o pai do grupo do avatar), então a câmera e o
  Zappy não tremem entre passos. ⚠️ Nunca mover corpo no `useFrame` partindo de `translation()`:
  num quadro sem passo o movimento se perde (a 144 Hz, mais da metade dos quadros).
- Movimento com peso e tolerância (controlador universal, parte 1, `sistemas/movimento.ts`):
  `aproximarVelocidade` com `PERFIS` por modo (chão, ar, água; ilhas novas acrescentam o delas) e
  `passoDoPulo` (coyote time e jump buffer, um toque um pulo). Testes:
  `tests/movimento-com-peso.test.ts`. Plano: `docs/plans/2026-10-28-arquipelago-controlador-universal.md`.
- Os números do corpo (velocidades, pulo, degrau, rampas) moram em `CORPO` (`sistemas/corpo.ts`),
  com `alcanceDoPulo`, `alcanceMaximoDoPulo` e `beiradaMaximaDoPulo` para desenhar vãos e beiradas
  (o degrau automático só vale pisando: o `personagem.tsx` o desliga no ar; agarrando a quina, a
  beirada vai a uns 3,65 m, `beiradaMaximaAgarrando` em `modos/borda.ts`).
- Sala de testes: `/movimento` no playground (`playground/movimento.tsx`, medidas em
  `playground/sala-de-movimento.ts`, `?estacao=Laguinho`), com o personagem e a câmera de verdade,
  uma estação por teste (cada uma com um obstáculo que passa e um que não) e o painel de medidas;
  `__peNaSala` dá o pé a cada quadro para scripts. Testes: `tests/sala-de-movimento.test.ts`.
- Modos de movimento (`sistemas/modos/`, contrato em `tipos.ts`): chão (com o nado), cipó e
  escalada são regras puras com `valendo`, `passo` (diz o deslocamento e quem leva o corpo: o
  controlador do chão, o do cipó ou direto) e `depois` (com o que o Rapier devolveu, troca de
  modo); entrar é `pegarCipo`/`agarrarTronco`, sair é `mudarModo`. O `personagem.tsx` só liga o
  modo ativo (`MODOS`) ao Rapier e ao desenho. Modo novo: um arquivo em `modos/`, uma entrada em
  `MODOS` e em `ModoDoCorpo`. Testes: `tests/modos.test.ts`. O limite do mar é a correnteza mansa
  (`sistemas/correnteza.ts`, regra 6.12 em `docs/arquipelago-regras.md`): cada ilha onde se nada põe
  a sua `RodaDeNado` em `movimento.rodasDeNado` (a central vale sempre, as do anel entram quando a
  ilha abre, em `mundo/anel.tsx`); o modo chão soma a correnteza ao `desloc` de quem nada no mar e
  `mundo/boias.tsx` desenha as boias de cada roda. Testes: `tests/correnteza.test.ts`. Equilíbrio no tronco caído
  (`modos/equilibrio.ts`): o eixo vem das âncoras `equilibrio-N-a`/`-b` do GLB
  (`movimento.equilibrios`, registradas pelo `BosqueVivo`); o chão entra nele pelo `eixoSobOsPes`.
  Escada reta (`modos/escada.ts`): âncoras `escada-N-base`, `-topo` e `-saida`
  (`movimento.escadas`); o chão pega pelo `escadaParaPegar` (embaixo, andando contra; em cima, do
  deque); os degraus colidem só para o corpo (`col-escada-reta`). Escorregador
  (`modos/escorregar.ts`): os pontos da pista vêm das âncoras `escorregador-curva-N`
  (`movimento.escorregadores`); pisar nela senta (`pistaSobOsPes`); a câmera tem o perfil
  `escorregar`. Agarrar a borda (`modos/borda.ts`): as quinas vêm das âncoras `borda-N-a`, `-b` e
  `-fora` (`movimento.bordas`; no Bosque, a pedra de agarrar entre a T3 e a T4); o chão pega no ar
  pelo `bordaAoAlcance`; marque quina só onde há espaço embaixo, pendurado e em cima (o teste da
  pedra em `tests/movimento-do-bosque.test.ts` confere).
  Clipes novos no `locomocao.glb` (Equilibrar, SubirEscada, PendurarBorda, SubirBorda,
  Escorregar), com o campo `especial` da `EntradaDaLocomocao` (antes `pendurado`); para ver:
  `/animacoes?equilibrar=1`, `?escada=1`, `?borda=1&subir=1`, `?escorregar=1`.
- Perfis de câmera (`sistemas/perfis-de-camera.ts`, `tests/perfis-de-camera.test.ts`): exploração,
  casa, conversa e percurso, um por vez (`perfilDaVez`), misturados por pesos que trocam em 0,5 s
  (`passoDosPesos`, `misturarPerfis`); a câmera aplica o "lá no alto" e a colisão por cima. Perfil
  novo (Construir) entra em `PERFIS_DE_CAMERA`.

## Qualidade automática (geral-05, 28/10/2026)

- `sistemas/qualidade.ts` contém detecção e transição puras. Metas: desktop 60, toque/coarse,
  CrOS ou até quatro núcleos 30; até dois núcleos começa leve, demais conservadores médios.
  Níveis completo/médio/leve: teto DPR 1,75/1,25/0,75, vento 1/0,5/0, ondas sim/sim/não,
  névoa 70 até 210/190/170 m. Nenhum parâmetro físico muda.
- Médias em janelas de 2 s: duas acima de 120% do orçamento reduzem, espera mínima 8 s;
  cinco até 105% aumentam, espera 20 s. Pausa, aba oculta e lacuna acima de 1 s zeram a amostra.
  Não há limitador artificial de FPS; a física continua em `PASSO_DA_FISICA` mesmo a 30 quadros.
- `mundo/qualidade-da-cena.tsx` adapta por montagem, sem estado global de decisão. A vegetação
  usa um uniform separado por cena via WeakMap, no desenho do material, sem alterar o vento
  das cordas nem `bosque-vivo.tsx`. Leve desmonta `OndinhasLigadas`, incluindo seus callbacks.
- `sistemas/conforto.ts` e `estado/conforto.ts` guardam `qualidade` na preferência local existente.
  O menu oferece Automática (padrão), Leve e Completa. URL `?qualidade=leve|completa` sobrepõe
  só durante a montagem, sem persistir. A escolha manual não altera a meta detectada.
- `__arquipelagoDesenho`: `qualidade`, `metaDeQuadros`, `dpr`, `amplitudeDoVento`,
  `vento.qualidadeAplicada` (escrito pelo material desenhado) e `ondas.ligadas`.
- `tests/qualidade.test.ts` usa o controlador e Rapier reais para comparar todos os 240 passos
  de caminhada/pulo em 4 s a 30/60 quadros, nos três níveis. `bun run test:qualidade-browser`
  confere Bosque, menu, preferência reaberta, caminhada/pulo e toque emulado no playground.
  Aceita `ARQUIPELAGO_CHROMIUM`; usa o Chromium Linux solicitado se existir, senão canal Chrome.
  Emulação/SwiftShader prova funcionamento, não a meta de FPS em aparelho físico.

## Colisão das peças (28/10/2026, pedido dela: "as moitas não têm colisão")

- Regra: o que se vê de pé e tem tamanho de objeto colide, sempre com forma simples (caixa ou
  cilindro arredondado, `Colisores` em `mundo/colisores.tsx`), nunca a malha de desenho (só o chão).
  Macio (moita, folhagem, cogumelo) fica um pouco menor que o desenho; duro fica do tamanho dele.
  Miúdo do chão (capim, flores, pedras do caminho, estrelas-do-mar, vitórias-régias, taboas,
  raízes) não colide. O personagem sobe sozinho até uns 0,58 (degrau de 0,45 mais a curva do pé
  numa quina): pedrinhas, tocas e pedras do lago ficam abaixo; o que deve parar o corpo (moitas,
  canteiros) tem pelo menos `ALTURA_QUE_SEGURA` (0,7).
- O que tem medida do jogo fica no código, em `mundo/colisao-da-ilha-central.ts` (casca da casa e
  a porta aberta ou fechada, troncos e a saia do pinheiro, canteiros, bancada, torre do farol,
  tampo do píer, corrimão das pontes inteiras). O que o Blender espalha vem dos nós `col-*` do
  GLB, lidos com `lerColisores` junto com o desenho: `terreno.glb` (moitas e pedras), `farol.glb`
  (pedras do pé e degraus), `pier.glb` (estacas, lampião e barquinho) e, no Bosque, `bosque.glb`
  (moitas, pedras, cogumelos, tocas, floreiras, pernas do escorregador). Ajudantes `col_caixa`,
  `col_cilindro`, `col_no_chao` no `arte/mundo/lib_mundo.py`; `exportar(..., colisores=col)`.
- Câmera: `SO_PARA_O_CORPO` (`colisores-da-ilha.ts`, pelo prefixo do nome) diz o que só segura o
  corpo: folhagem, cogumelos e peças finas (postes, estacas, colunas, floreiras, vasos, canteiros,
  barco, cavalete, corrimãos). Paredes, troncos, pedras e torre tapam a câmera.
- Testes: `tests/colisao-da-ilha-central.test.ts` (nós sem material, colisor debaixo do desenho,
  quem a câmera ignora, trilhas de pedra livres, porta, e uma busca em grade de 25 cm que chega da
  porta a cada canteiro, à bancada, ao farol, ao píer e à cabeça de cada ponte) e o bloco "os
  enfeites do Bosque" em `tests/colisores-da-ilha.test.ts`. A Vila Doce (29/10/2026) tem os dela no
  `vila-doce.glb` (casas e lojas até o topo plano, o percurso dos telhados, a fonte, as barracas e os
  enfeites de pé), conferidos em `tests/colisores-da-vila-doce.test.ts` (paradas do percurso em cima de
  colisor, vãos dentro do pulo andando, chegada e frente das lojas livres). O Recife (29/10/2026, ligado na
  fase3-01) também tem os dele no `recife.glb` (cais, casa da Maré, caverna para quem nada),
  em `tests/colisores-do-recife.test.ts`; os ajudantes dos testes ficam em `tests/ajuda-colisores.ts`. O Pico
  (29/10/2026, ligado na fase3-06) tem os dele no `pico.glb`, com a trilha cavada na montanha até o platô do
  cume, em `tests/colisores-do-pico.test.ts` (busca em grade da chegada ao platô, encosta que não se sobe), e o
  Vale dos Dinos no `vale-dos-dinos.glb`, em `tests/colisores-do-vale.test.ts`, e a Ilha das Nuvens no `nuvens.glb`,
  em `tests/colisores-das-nuvens.test.ts` (o tampo de cada plataforma é `col-cil-plataforma-N`: quem move o nó
  `plataforma-N` move o colisor junto). A grade de andar dos dois é
  `gradeDeAndar` (`tests/ajuda-colisores.ts`).

## Ilhas completas (o Bosque, 27/10/2026)

- Vila Doce (fase2-01, 29/10/2026): `vila-doce.glb` em `ILHAS_COMPLETAS`, com os colisores do
  Blender (`tests/colisores-da-vila-doce.test.ts`) e sem faces coplanares. Em `ILHAS_VIVAS` desde a
  fase2-02 (`mundo/vila-viva.tsx`, com o Bento; as lojas vêm depois). No navegador:
  `bun playground/verificar-vila-doce-browser.ts` (chegada até a praça e de pé em cada parada do
  percurso dos telhados).

- `src/sistemas/ilhas-completas.ts`: o ciclo puro `longe → carregando → pronta → ativa →
  descarregando`. Busca na cabeça da ponte (`naPonteDa`, faixa `BUSCA_NA_PONTE`), troca no meio dela
  (`DISTANCIA_DA_TROCA`), solta na volta à ilha central. Falha fica na versão leve até a pessoa se
  afastar.
- `src/mundo/carregar-ilha.ts`: `GLTFLoader` próprio (não o cache do `useGLTF`), no máximo UMA ilha
  completa na memória; soltar libera geometria, material e textura (até de arquivo que ainda chega).
- `src/mundo/ilha-completa.tsx` (`useIlhaCompleta`, `IlhaCompleta`): lê e prepara antes da troca,
  compila os shaders (`compileAsync`: inteira, pontilhada e as cópias transparentes) e faz o
  cross-fade da troca com `alphaHash` em `DURACAO_DA_TROCA`; a leve continua montada como reserva e
  só uma das duas colide. Jogo aberto em cima da ilha: o personagem espera no ar
  (`pedidos.chaoChegando`) até os colisores chegarem.
- O Bosque não é redondo (28/10/2026, para a cabana): cresce para o lado de fora (a ponta de campo
  do −x do modelo). A conta do contorno é a mesma da arte (`LOBO_DO_BOSQUE`, `raioDoChaoDaIlha` e
  `raioMaximoDaIlha` em `mundo/medidas.ts`); dela saem a roda de boias (`rodaDaIlhaNoModelo`, com o
  meio puxado para a ponta), a espera pelo chão ao abrir o jogo em cima da ilha, o "saiu da ilha" do
  percurso (`RAIO_DO_BOSQUE`) e o chão de antes da versão leve (`apoiosDaIlhaLeve`). Testes:
  `tests/bosque-crescido.test.ts`.
- Colisão: os nós `col-*` do GLB (`src/mundo/colisores-da-ilha.ts`; convenção no README de
  `arte/ilhas`), cuboide/cilindro arredondados (`BORDA_DOS_COLISORES`) e malha só no `col-terreno`.
  A malha de desenho nunca vira colisão.
- Câmera (`personagem/camera.tsx`, dentro do `<Physics>`): uma bolinha da cabeça e do peito até
  ela (`castShape`, grupos de `mundo/grupos.ts`: o guarda-corpo invisível não conta) a encosta na
  hora e a afasta aos poucos (`sistemas/camera.ts`); tapada de perto, gira para o lado livre e,
  sem lado livre, sobe por cima do ombro (`GRUA_DA_CAMERA`); lá no alto desce o ângulo
  (`CAMERA_NO_ALTO`). Copas, troncos e telhados (`copa-*`, `tronco-*`, `telhado-*`,
  `mundo/copas.ts`) entre a câmera e o avatar (cabeça, peito, pés, lados e o Zappy, raio contra a
  malha) esmaecem com transparência suave: trocam para cópias `transparent` sem `depthWrite`
  enquanto tapam e voltam aos materiais opacos depois. Soltar a ilha solta as cópias também.
- Prova de memória (playground): `__arquipelagoLevar(x, y, z, giro)` leva o personagem; na mesma
  pose da ilha central, antes e depois de duas visitas, as geometrias na placa (`geometrias`)
  nunca passam das penduradas na cena (`geometriasNaCena`) e ficam iguais entre as voltas.
- Medir: `localStorage['arquipelago:medir'] = '1'` deixa `renderer.info`, a posição, o giro, a
  câmera, as peças esmaecidas e o que a última ilha solta liberou em
  `globalThis.__arquipelagoDesenho` (`src/mundo/medidor.tsx`).
- Testes: `tests/ilhas-completas.test.ts` (ciclo, memória, esmaecer), `tests/camera-e-copas.test.ts`
  (distância da câmera, peças que esmaecem e a troca de materiais) e
  `tests/colisores-da-ilha.test.ts` (lê o `bosque.glb`: grupos, sem material, percurso nas copas de
  ponta a ponta, escada, escorregador, corredor da chegada livre, enfeites que seguram o corpo).

## Animações do avatar (Mixamo, 29/10/2026)

- Clipes em `src/assets/avatar/locomocao.glb`, vindos do Mixamo pelo `arte/avatar/mixamo.py`
  (os FBX ficam fora do repositório, em `MIXAMO_DIR`): Parado, Andar, Correr, Pulo, Queda,
  Aterrissagem, Nado, NadoParado, Corda (cipó), Planar, Escalar, SubirEscada, Equilibrar,
  PendurarBorda, SubirBorda, Escorregar, Sentar, Montar e Deitar. O "Idle" da plataforma não é
  mais usado. O script tira o deslocamento (o corpo do jogo anda), encaixa assento, sela, barra,
  borda e colchão, e enxuga o GLB (só giros e a posição da bacia). O README de `arte/avatar` diz o
  que vem de cada arquivo do Mixamo.
- `src/sistemas/locomocao.ts` (puro, `tests/locomocao.test.ts`): pesos e tempo de cada clipe, com
  as durações e passadas do `RESUMO` do script. Andar e correr na MESMA fase (os dois começam no
  pé esquerdo), que anda pela distância dividida pela passada. Na água, Nado acima de
  `NADANDO_ACIMA_DE` e NadoParado abaixo; no tronco caído, Equilibrar parada e Andar andando.
- Os clipes de nadar e de deitar já vêm deitados: o personagem não inclina mais o desenho nesses
  casos. No cipó o Corda faz as pernas e o `depoisDaPose` ainda fecha as mãos na corda
  (`personagem/bracos.ts`, `INCLINACAO_NO_CIPO` 0). O planador põe a barra nas mãos do Planar
  (`BARRA_NO_AVATAR`, 1,25 m de altura e 0,2 m à frente).
- `personagem/avatar-do-jogo.tsx` aplica a regra às ações (`AvatarRig` com `extraClips` e
  `onAnimations`), todas no tempo da regra.
- Prints no jogo: `playground/verificar-animacoes-browser.ts` (Bosque, cama e banco, Pico e Vale;
  `ARQUIPELAGO_CENAS` escolhe). O medidor dá `__arquipelagoMovimento()` e
  `__arquipelagoCameraEmVolta(desvio)` para levar o corpo a cada modo e virar a câmera. O pulo
  sai pelo relógio virtual do navegador (`Emulation.setVirtualTimePolicy`, 1/30 s por quadro): a
  1 quadro por segundo do SwiftShader o pulo inteiro cabe em dois quadros. Prints em
  `docs/qa/2026-10-29-animacoes-mixamo/`.
- ⚠️ A borda soltava sozinha (até 29/10/2026): pendurada, o corpo ia a `daParede` da quina, mais
  perto que o raio mais a folga do controlador; no fim do encaixe o Rapier não deixava chegar, o
  passo guiado virava "bloqueado" e devolvia ao chão. `BORDA.daParede` agora é
  `CORPO.raio + CORPO.folga + 0,02` (teste com o Rapier em `tests/modos-colisao.test.ts`), e o
  PendurarBorda põe as mãos 0,43 m à frente (`maos_a_frente` do script). No roteiro: posta logo
  abaixo da quina, ela agarra ao cair; ⚠️ pular pendurada é soltar.

## Quadro das Cores (28/10/2026)

- Regra pura em `src/sistemas/quadro-das-cores.ts` (`quadrosDaIlha`, `novosFeitos`, `oQueFalta`,
  `motivoDoErro`); loja à parte em `src/estado/desafios.ts` (`lojaDosDesafios(loja, plataforma)`,
  uma por montagem via WeakMap, sem mexer no contexto).
- `src/mundo/quadro-das-cores.tsx`: o cavalete (`assets/itens/quadro-das-cores.glb`, nós `quadro`
  e `cor-1`..`cor-6`) perto da `chegada` da ilha completa; cada mancha tem material próprio e vai
  do `CINZA` à cor do arquivo. `src/interface/quadro-das-cores.tsx`: o painel (`painelAberto` na
  loja congela o personagem).
- A situação de cada desafio vem SEMPRE do serviço; o jogo só relê a lista depois do Estúdio.
  Regras e textos: `docs/arquipelago-regras.md` §7.11. Testes: `tests/quadro-das-cores.test.ts`.
- Desafio do dia (28/10/2026, §7.12): `desafioDeHoje` e `diaParaAvisar` em
  `sistemas/quadro-das-cores.ts`; o cartão "Desafio de hoje" (`CartaoDeHoje`) em cima dos seis
  quadros do painel; o aviso do Zappy (`AVISO_DO_DIA`) sai do cavalete
  (`mundo/quadro-das-cores.tsx`) uma vez por dia, guardado em `localStorage` por perfil. O banco de
  mentira (`plataforma/desafios-falsos.ts`) tem os três estados (`dia` na plataforma falsa,
  `?dia=pronto|feito|nenhum` no playground).
- A cor das ilhas do anel segue os quadros: seis pedaços em volta do centro (o 1 na chegada da
  ponte), regra em `sistemas/cor-da-ilha.ts` e tinta no shader em `mundo/pintura-da-ilha.ts`
  (`pinturaDaIlha(ilha)`: uniforms divididos por todos os materiais da ilha, leve, completa e as
  cópias das copas; `pintarMateriais` liga o `onBeforeCompile` uma vez por material). O `Anel` lê
  catálogo e conquistas ao abrir o jogo; `usePinturaDaIlha` anda os pedaços. Sem publicação ou
  leitura, fica a base de 30% da ponte ou a última cor confirmada, nunca cor inteira por falha.
  `estado/desafios.ts` lê `/desafios/cores` independentemente do catálogo. A posição histórica
  prevalece sobre o lugar atual de um desafio movido. Reserva para host antigo: conclusões do
  catálogo. `sistemas/cores-conquistadas.ts` une a fotografia visual por perfil/público, até 2 KB
  no localStorage, sem escrita de suporte e sem autoridade para acesso ou recompensa. Quadro,
  contador e ilha usam essa mesma fotografia. Uniforms reiniciam na primeira renderização de
  cada montagem; publicação não tira tinta. Sem campo novo no salvamento.
  Testes: `cor-da-ilha.test.ts`, `cores-conquistadas.test.ts`, `quadro-das-cores.test.ts`.
  Navegador: `playground/verificar-cores-browser.ts`; QA em `docs/qa/2026-10-30-cores-conquistadas/`.

## Caderno dos Lumis (28/10/2026)

- O botão "Montar a rotina de um Lumi" do caderno abre o painel da rotina (fase2-07, abaixo).
- Regra pura em `src/sistemas/caderno-dos-lumis.ts` (`secoesDoCaderno`, `ondeAprender`,
  `lerCartas`, `motivoDoCadernoFechado`); loja à parte em `src/estado/cartas.ts`
  (`lojaDasCartas(loja, plataforma)`, uma por montagem via WeakMap, como a dos desafios) e o painel
  em `src/interface/caderno-dos-lumis.tsx` (`PAINEL_DO_CADERNO` em `painelAberto`, que congela o
  personagem). Abre pelo menu do jogo; cada abertura relê `GET /cartas`.
- Quem tem cada cartão vem SEMPRE do serviço (os de QUANDO e AÇÃO para todos, os de CONTROLE pelos
  blocos conquistados nos cursos do público da pessoa, equipe com todos). Montar a rotina é da
  Fase 2. Regras e textos: `docs/arquipelago-regras.md` §8.1. Testes:
  `tests/caderno-dos-lumis.test.ts`.
- ⚠️ `.arq-menu` é `content-box` com `width:100%`: no celular o menu e o Quadro passam 2 px de cada
  lado da tela. O caderno usa `box-sizing:border-box` (`.arq-caderno`).
- **Planta de interior (29/10/2026):** `planta-interior` é um objeto da casa (`OBJETOS_DA_CASA`,
1 × 1, dentro de cômodo novo) que chega com a primeira obra, da casa ou de uma cabana
(`ganharProjetos`). Conta como planta no aconchego (`PLANTAS_DA_OBRA`), e a dica sugere pô-la num
cômodo novo sem planta quando ela já foi ganha. Modelo e medidas em `arte/objetos/README.md`.
- ⚠️ **Barra do topo no celular (até 560px, 29/10/2026):** Viver/Construir (`.arq-modos`) fica à
  esquerda em `top:106px`, abaixo das necessidades e da segunda linha da direita (no meio do topo
  ela cobria as barras e o relógio, medido em 320 e 390). A dica do Zappy sobe para `bottom:236px`
  e estreita (`calc(100% - 152px)`) para não cobrir o direcional nem Pular/Usar; no Construir ela
  fica em `top:164px`, e o cronômetro em `162px`. Medir de novo ao pôr peça nova no topo.
- Playground: `?cartas=todas`, `?cartas=desligadas` (403) ou `?cartas=fora-do-ar` (424);
  `src/plataforma/cartas-falsas.ts` usa a régua do contrato com um currículo de mentira.

## Modo construção (28/10/2026, fase1-10 a fase1-12)

- Aconchego (fase1-15): `sistemas/construcao/aconchego.ts`, testes `tests/aconchego.test.ts`, painel `interface/aconchego.tsx`; calculado por edição, seleção transitória pela célula no Olhar, regras e números em §6.16.1, sem gravar pontos nem iniciar visitas ou festas.

- Plano e decisões: `docs/plans/2026-10-28-arquipelago-modo-construcao.md`; regras e números:
  `docs/arquipelago-regras.md` §6.16. O que a criança constrói fica em
  `salvamento.construcao` (contrato `SalvamentoV4`, `ObraSchema`).
- Regras puras em `src/sistemas/construcao/`: `lote.ts` (o lote da casa, células ocupadas, o quarto
  fixo e a obra inicial), `grade.ts` (arestas, trechos, arrasto, porta e janelas), `comodos.ts`
  (planta: o que as paredes fecham, cômodos, lambri ou lisa), `obra.ts` (esticar, apagar, porta,
  janela, piso, com o motivo de cada recusa), `pecas.ts` (as peças do kit com posição e giro,
  quinas, corte e colisores; a parede cortada colide como `col-obra-cortada-*`, só para o corpo) e
  `telhado.ts` (o corte no Viver e o telhado de duas águas dos cômodos retangulares; o giro do
  Blender em volta de z é o mesmo em volta do y do jogo), `quintal.ts` (cerca, caminho, canteiro;
  o canteiro do quintal é um canteiro da horta com id `q<x>_<z>`, e a horta segue a obra em
  `hortaComOQuintal`) e `ferramentas.ts` (o que cada ferramenta faz no arrasto e no toque, com a
  prévia) e `projeto-azul.ts` (ganhar a geladeira e a casinha, pôr e tirar objeto, a geladeira
  guardando alimentos, o Molda no posto Explorador). Testes: `tests/quintal.test.ts` e
  `tests/projeto-azul.test.ts`. Desde 28/10/2026 a página abre o Pinta e o Molda de verdade no
  molde (ponte em `member-shell/src/lib/arquipelago-objeto.ts`); o recado de quando não abre é
  `recadoDaFerramentaFechada`, e a plataforma de mentira responde com as mesmas recusas
  (`objetos: 'sem-acesso'`, `?objetos=sem-acesso` no playground).
- `mundo/objetos-da-casa.tsx`: os objetos postos (holograma do Blender ou azul no código; com
  aparência, o modelo ou a criação lida pela plataforma), o "Abrir" e `GanharProjetos` (montado pela `Casa`). Painel:
  `interface/projeto-azul.tsx` (`painelAberto` = `objeto:<id>`). Testes: `tests/construcao.test.ts` (inclusive o lote contra
  `alturaDaIlha` e contra todos os colisores que caem nele).
- `mundo/obra.tsx` (`ObraNoMundo`): desenha a obra com o kit (`src/assets/casa/*.glb`, contrato no
  README de `arte/casa`), cada peça uma cópia do nó; as portas abrem sozinhas perto da pessoa.
  A `Casa` troca a casa de antes pela construída quando há obra (`colisoresDaCasa(aberta, true)`
  tira a frente e a direita do quarto, que passam a ser do kit).
- Modo Construir: botões Viver e Construir e a barra de ferramentas em `interface/construir.tsx`;
  loja `estado/construcao.ts` (ferramenta, câmera de obra, Desfazer, `aplicar` com a fala da
  recusa); `mundo/construir.tsx` (montado pela `Casa` com o Construir aberto): câmera de obra, grade,
  prévia e o toque. ⚠️ A câmera do jogo (`personagem/camera.tsx`) escreve a posição a cada quadro
  ANTES da de obra: a de obra guarda a própria posição suavizada e só copia (suavizar a partir de
  `camera.position` faz as duas brigarem e a vista anda sozinha). O toque e a roda são pegos na
  captura do elemento pai do canvas, antes de chegarem à câmera do jogo.
- Cabana no Bosque (fase1-11): `mundo/cabana-do-bosque.tsx` (montado pelo `BosqueVivo`) lê o lote
  das âncoras `lote-cabana-a`/`-b` (`loteDaCabana` em `lote.ts`), registra-o na loja do Construir
  (`registrarCabana`) e diz se a pessoa está perto (`definirPertoDaCabana`). `abrir()` escolhe
  `onde` (`'casa'` ou o id do lote) e tudo o que grava passa por `obraDe`/`mudarObra` com esse
  `onde`. A ilha é girada no mundo: `ObraNoMundo` recebe `giro` e o `ModoConstruir` um
  `referencial` (`{x, z, giro}`); a câmera de obra, o toque e o corte trabalham no referencial do
  modelo e convertem com `noModelo`. Testes: `tests/cabana.test.ts`.
- Escolhas com desenho (pedido dela: "é importante ter o visual ali do desenho de cada item"): os tipos de
  janela, piso, caminho e os objetos aparecem na barra como miniatura com o nome embaixo
  (`Escolha` em `interface/construir.tsx`, mapas em `interface/miniaturas.ts`). As imagens saem
  dos próprios modelos por `arte/casa/miniaturas.py` (`src/assets/casa/miniaturas/`); escolha
  nova pede miniatura nova (`tests/miniaturas.test.ts`).
- Playground: `?obra=exemplo` (`src/plataforma/obra-de-exemplo.ts`). Conferir no navegador: a
  câmera de obra abre sempre igual, então dá para calcular onde cada ponto da grade cai na tela.

## A galeria de aparências (fase1-13, 29/10/2026)

- Regras puras em `sistemas/construcao/galeria.ts` (`usarAparencia`: vira a em uso e fica entre as
  guardadas, sem repetir, no teto sai a mais antiga; `aparenciasQueEleTem`; `estadoDoCartao`:
  comprar, falta, usar ou em uso; os recados), loja à parte em `estado/galeria.ts`
  (`lojaDaGaleria(loja, plataforma)`, uma por montagem via WeakMap: `GET /galeria` a cada painel de
  objeto que abre e `POST /galeria/compras` com uma chave nova), componentes em
  `interface/galeria.tsx` (`CartaoDaGaleria` ao lado do Pinta e do Molda, com confirmação;
  `SuasAparencias` para trocar sem cobrar).
- O Pinta e o Molda também passam por `usarAparencia`: o que ela fez fica guardado e o aconchego
  conta o "feito por você" pelas `aparencias` (comprar nunca tira esse ponto).
- Quem diz o que foi pago e o saldo é SEMPRE o serviço; o salvamento com uma da galeria não paga é
  recusado lá. A plataforma de mentira tem a mesma régua (`plataforma/galeria-falsa.ts`;
  `?moedas=` e `?galeria=fora-do-ar` no playground). Aparências próprias usam `carregar-aparencia.ts`; variação da galeria pede o arquivo e a escolha pelo `modelo` em
  `mundo/objetos-da-casa.tsx`.
- Testes: `tests/galeria.test.ts` e o caso da galeria em `tests/aconchego.test.ts`. Regras e
  textos: `docs/arquipelago-regras.md` §6.16 e §9.9.

## O Zappy vira junto com o personagem (27/10/2026, pedido dela)

- `src/sistemas/zappy.ts` (puro, `tests/zappy.test.ts`): voa à direita e um pouco atrás de onde
  ela OLHA (`lugarAoLado`, a direção do avatar, não o giro da câmera); numa virada o lugar gira em
  volta dela pelo lado curto (`suavizarAngulo`, `RAPIDEZ_EM_VOLTA`), sem atravessar o corpo.
- Olhar (`paraOndeOlhar`): andando, para onde ela vai (frente, costas ou lados); parada por
  `ESPERA_PARA_OLHAR_PARA_ELA`, para ela, com uma espiada na câmera a cada `PERIODO_DA_ESPIADA`.
- Inclina para dentro da curva pelo quanto girou (`inclinacaoNaCurva`) e mergulha um pouco andando
  (`mergulho`); o grupo usa `rotation.order = 'YXZ'` (giro no mundo, mergulho e inclinação no corpo).
- `rastro.direcao` e `rastro.velocidade` são escritos pelo personagem; `rastro.zappy` (onde ele
  está) pelo Zappy, e é dele que as copas do Bosque leem para esmaecer na frente dele.

## Sem pisca-pisca: faces coplanares, emendas e a câmera (28/10/2026)

- Pedido dela: a janela de fora da casa piscava. Causa: a veneziana e os frisos do lambri tinham a
  frente no MESMO plano (listras do friso piscando através dela) e a parede em volta da janela era
  feita de quatro caixas encostadas (junção em T: linha tracejada acima e abaixo do vão). Regras e
  conserto no README de `arte/mundo` (seção "Sem pisca-pisca").
- **Regra:** nenhum modelo tem faces coplanares de materiais diferentes se sobrepondo nem emenda em
  T. `scripts/faces-coplanares.ts` acha as duas coisas num GLB (por plano: normal e distância em
  grade; sobreposição por recorte de triângulos; emenda em T por vértice no meio de aresta vizinha);
  `tests/faces-coplanares.test.ts` roda em todos os GLBs do mundo, no Quadro das Cores, na Vila Doce
  (29/10/2026) e nas peças no lugar do jogo em cima do chão. O Bosque tem uma lista `PENDENTES_DO_BOSQUE` (pares que já
  existiam); par novo reprova.
- **Câmera:** `PERTO_DA_CAMERA` 0,25 e `LONGE_DA_CAMERA` 450 (`mundo/medidas.ts`, explicação lá).
  O `near` é quem dá precisão de profundidade (2,5 vezes a de 0,1) e o canto do plano de corte fica
  dentro da bolinha da sonda da câmera; o `far` só precisa alcançar as estrelas
  (`RAIO_DAS_ESTRELAS`) e passar da `NEVOA`. Sem `logarithmicDepthBuffer` (caro no celular). Não há
  sombras no jogo (nenhum `castShadow`), então não há acne de sombra a ajustar.

## Cipó, escalada e percurso nas copas (27/10/2026, Fase 1)

- Tudo do Bosque que mexe vem de `mundo/bosque-vivo.tsx` (`BosqueVivo`), montado pelo `anel.tsx`
  só com a ilha completa ATIVA, em coordenadas do mundo, fora do grupo da ilha. Os números no
  referencial do modelo ficam em `mundo/bosque.ts` (placa, vagalumes, tronco de escalar, raios dos
  deques) e são conferidos contra o `bosque.glb` em `tests/movimento-do-bosque.test.ts`.
- O que o personagem pega e escala mora em `contexto.movimento` (listas simples, sem alocar no laço
  da física): `cipos`, `troncos`, `aguas`, o `pedido` dos interativos, o `modo` (`chao`, `cipo`,
  `escalada`), `noChao`, o `foco` da câmera no balanço e a `corrida` em andamento.
- **Cipó** (`sistemas/cipo.ts`): o balanço de quem segura é um pêndulo num plano em pé (`rumo`),
  que a criança controla (o `movimento/cipo.glb` solto não é usado aqui). As mãos seguram
  onde os pés passam a `folgaDosPes` do chão (`comprimentoDaPegada`): segurar na alça do fim
  enterraria as pernas. Pega no chão (E / Usar, `raioDaDica`) ou no ar (a corda passa a
  `raioDaPegadaNoAr` das mãos), com a velocidade que o corpo traz. Bombeia como no parquinho: pedir
  para o lado em que já vai empurra, o contrário não freia, de través vira o plano. Pular (ou usar)
  solta com a velocidade do balanço (`impulsoAoSoltar`) mais um pulinho; no ar, o embalo fica até
  pisar e a direção pedida só corrige (`CONTROLE_NO_AR`). No cipó o corpo usa um controlador do
  Rapier SEM grudar no chão (o grudar freava o balanço). `maosAcimaDoCentro` é 0,3 (as mãos do
  avatar chibi não passam do queixo); a escalada tem o dela (`ESCALADA.maosAcimaDoCentro`, 1).
- **Corda física** (`sistemas/cordas.ts`, puro, `tests/cordas.test.ts`): cada cipó é uma corrente
  Verlet de `CORDAS.elos` elos presa no pivô; encosta no corpo DESENHADO (`movimento.corpoDesenhado`,
  que o personagem escreve a cada quadro a partir do grupo do avatar e de `CORPO.desenho`: cápsula
  do tronco e bola da cabeça), no tronco, nos outros cipós e no chão. Seguro, a corda do pivô até
  a pegada fica na linha até as mãos (esticada) e o resto cai solto e encosta no corpo. Solto, o
  balanço (`balanco`) é lido da corrente (o pegar no ar usa ele). Soltar marca
  `esperandoOCorpoSair`. `BosqueVivo` roda `passoDasCordas` e desenha.
- **Desenho da corda** (`mundo/cipo-desenhado.ts`): esconde a corda reta do nó `cipo-*` e põe um
  tubo refeito a cada quadro sobre a corrente (Catmull-Rom, lados levados de anel em anel), a alça
  na ponta e as folhas dobradas pela altura de repouso delas. Monta no efeito da ilha ativa e
  desmonta ao sair (a corda do arquivo volta).
- **Escalada** (`sistemas/escalada.ts`): o tronco da árvore dos cipós (o nó
  `escalada-cil-tronco-dos-cipos` do `bosque.glb`, lido por `troncoDoNo`; um cone um pouco torto do
  tamanho da casca desenhada; `TRONCO_DOS_CIPOS` é a reserva com os mesmos números). Andar contra ele por `esperaParaGrudar` (ou pular
  nele) gruda; frente e trás sobem e descem, os lados seguem a tela, descer no pé solta, pular solta
  para fora (ou para onde se pede, se for para longe). Lá de cima, o pulo cai no `cipo-1`. A
  trepadeira em espiral (desenhada no código) mostra que aquele tronco sobe e esmaece com ele.
  Os nós `escalada-*` não desenham: `prepararIlha` os esconde.
- **Lago**: o nó `agua` (a elipse da caixa e a altura da superfície) com a bacia de 0,85 m no
  `col-terreno`: nada como no mar (mesma regra, `ENTRAR_NO_NADO`/`SAIR_DO_NADO`). O tronco que boia
  (`mundo/tronco-no-lago.tsx`) é um corpo dinâmico com quatro pontos de flutuação
  (`sistemas/empuxo.ts`, materiais em `sistemas/materiais-fisicos.ts`); a criança empurra
  (`setApplyImpulsesToDynamicBodies`, `MASSA_DA_CRIANCA`). O medidor mostra o tronco em
  `__arquipelagoDesenho.tronco`.
- **Mãos no cipó** (`personagem/bracos.ts`): IK de dois ossos fecha os punhos na corda depois da
  pose de cada quadro (`AvatarDoJogo` monta `DepoisDaPose` logo depois do `AvatarRig`, então roda
  depois do mixer). A corda passa ao lado esquerdo do rosto (`CORDA_NO_CORPO`) e o corpo pende
  `INCLINACAO_NO_CIPO` para trás; `personagem.tsx` põe o grupo do avatar de modo que esse ponto caia
  nas mãos (com o giro e a inclinação do balanço). No tronco o clipe Escalar já põe as mãos.
  Medidas do avatar (ombro, braço, cabeça) estão no comentário de `bracos.ts`: o rig recentra o
  avatar ao ficar de pé, então nada pode inclinar o grupo antes disso.
- **Percurso nas copas** (`sistemas/percurso.ts`, `PERCURSO_DAS_COPAS`): a placa ao pé da escada
  começa (E / Usar); cada deque alcançado vira ponto de volta; cair no chão da ilha depois do
  primeiro deque escurece, leva à `volta` do último deque e clareia (`corteSaiMs`, `corteVoltaMs`),
  nunca para a largada; sair da ilha, se afastar da largada antes de subir ou "Parar" desiste sem
  castigo. O tempo é o de jogo, somado quadro a quadro: menu, ferramenta aberta, aba escondida e
  o corte não contam, e passar de 1 hora desiste (o salvamento não guarda mais que isso). Chegar ao fim do escorregador mostra o
  resultado (estrelas, tempo, melhor tempo, "Correr de novo") e grava o melhor em
  `salvamento.percursos['bosque-copas']` (`juntarResultado`: cada estrela fica para sempre, o tempo
  é o menor). Os vagalumes só aparecem durante a corrida.
- **Câmera**: no cipó o alvo vai para perto do meio do cipó e a câmera segue mais devagar; com
  `prefers-reduced-motion` ela olha só para o meio do cipó (quase parada). A bolinha da câmera que
  começa encostada num tronco e se afasta não conta como batida (`stopAtPenetration: false`).
- **Controles**: `controle.pulos` conta os toques de pular (o toque curto que desce e sobe no mesmo
  quadro solta o cipó). A dica mostra a tecla no teclado e o nome do botão no toque
  (`estado/preferencias.ts`: `useToque`, `useMenosMovimento`); no cipó o botão Pular vira Soltar.
  Controle físico (`controles/gamepad.ts`, Gamepad API, mapeamento padrão): analógico esquerdo
  anda (até o fim corre), direito gira a câmera, botão de baixo pula, o da direita usa, gatilho ou
  ombro direito corre, clique no analógico direito recentraliza, Start faz o que o Esc faz; zona
  morta 0,15; escreve no mesmo `Controle` (a ação não sabe de onde veio). A tecla C também
  recentraliza (`controle.recentrar`). No toque o joystick é flutuante: nasce onde o polegar pousa
  na metade esquerda de baixo (`arq-zona-joystick`). Testes: `tests/gamepad.test.ts`.
  Conforto da câmera no menu (`interface/conforto.tsx`, regras em `sistemas/conforto.ts`, loja
  `estado/conforto.ts` guardada em `localStorage['arquipelago:conforto']`): rapidez, distância,
  inverter, volta sozinha (desligada) e menos movimento. Testes: `tests/conforto.test.ts`.
- Prints do playground: `localStorage['arquipelago:medir'] = '1'`, `?novo=1&posicao=2&em=x,z` e
  `__arquipelagoLevar(x, y, z, giro)`. O Bosque fica com o centro em (77,05; 28,05), girado 2,79.

## A Capi no Bosque (28/10/2026, Fase 1)

- Plano: `docs/plans/2026-10-28-arquipelago-capi-e-bichos.md`; regras e números:
  `docs/arquipelago-regras.md` §6.15. Tudo o que muda o salvamento passa pelas funções puras de
  `sistemas/conversa-da-capi.ts` (`comecarConversa`, `presentear`, `entregar`).
- Presente dos quatro bichos: `receberPresenteDosBichos` em `sistemas/bichos.ts` entrega uma
  `salada` já existente e marca `presenteDosBichosEntregue` no mesmo snapshot V5, uma vez só.
  `comecarConversa` acrescenta o agradecimento por último, após eventual página do diário.
  Inventário no teto de saladas ou documento sem espaço nos 64 KB adia a entrega, sem marcar.
  Testes em `tests/capi-presente.test.ts` e `tests/salvamento-duravel.test.ts`.
  Playground: `?bichos=achados` prepara os quatro, sem entregar nem apagar a marca persistida;
  `?novo=1&bichos=achados` começa outro jogo para conferir a conversa no navegador.
- `mundo/capi.tsx` (montado pelo `BosqueVivo`, dentro de `ComReserva`): o `capi.glb` copiado com
  `SkeletonUtils.clone` (tem esqueleto), na âncora `morador`, de costas para a `cabana`. Vira para
  a criança (`olharDaCapi`), acena, fala, comemora (`alegria` na loja da conversa) e pisca pelo
  morfo `piscar` dos olhos. O colisor `col-morador-capi` só segura o corpo. Desde a fase2-02 tudo
  isso mora no morador genérico `mundo/morador.tsx` (o mesmo do Bento).
- `estado/moradores.ts`: a loja da conversa (uma por montagem, como a dos desafios): falas, passo e
  tela. O painel é `interface/capi.tsx` (`PAINEL_DA_CAPI` em `painelAberto`).
- Câmera da conversa: quem abre a conversa põe a cabeça de quem fala em `pedidos.conversa` (com o
  `miolo` da ilha) e limpa quando o painel fecha; o personagem vira para lá e a câmera enquadra as
  duas (`LADO_NA_CONVERSA`, `DISTANCIA_NA_CONVERSA`, `INCLINACAO_NA_CONVERSA`, `ABAIXO_NA_CONVERSA`).
- No Bosque não aparece mais o "Olhar em volta" da ilha (`ILHAS_VIVAS` em `anel.tsx`).
- Esconde-esconde (`mundo/bichos-do-bosque.tsx`, também no `BosqueVivo`): os quatro filhotes
  (`assets/bichos/*-filhote.glb`, `ESCALA_DOS_BICHOS`) nos esconderijos (âncoras `esconderijo-*`
  do `bosque.glb`, giro lido do quatérnio por `rumoDoNo`; `ESCONDERIJOS_NO_MODELO` fica de reserva),
  a pista e o "Achar", e a corrida até
  o cercadinho pelo caminho da grade (`sistemas/caminho.ts`, A* com encurtamento;
  `mundo/chao-livre.ts` monta a grade sobre os colisores da ilha no primeiro achado). O modelo
  animado com esqueleto vem de `mundo/animado.ts` (`useCopiaAnimada`, `trocarClipe`,
  `olhosNoInstante`), o mesmo da Capi. Testes contra o `bosque.glb`:
  `tests/esconde-no-bosque.test.ts`.
- Bicho adotado: adotar pela conversa com a Capi (tela "adotar" da loja da conversa,
  `adotarPelaCapi`); `mundo/bicho-adotado.tsx` (montado na `Cena`, fora das ilhas) é um corpo
  cinemático com controlador próprio que segue a criança (`sistemas/seguir.ts`) e troca de modelo
  ao crescer (filhote `*-filhote.glb`, adulto `*.glb`). ⚠️ O controlador da criança e o do bicho
  usam `EXCLUDE_KINEMATIC`: um passa pelo outro (nenhum outro corpo do jogo é cinemático). Painel
  de cuidar em `interface/bicho.tsx` (`PAINEL_DO_BICHO`, loja `estado/bicho.ts` com as falas e a
  reação que o modelo toca); regras em `sistemas/cuidar.ts`; a queda das medidas roda nos
  `Relogios`, junto com as necessidades. Testes: `tests/cuidar.test.ts`.

## O Bento na Vila Doce (fase2-02, 29/10/2026)

- Salvamento V7 (`moradores.bento`, o mesmo formato da Capi). Regras puras em `sistemas/bento.ts`
  (gostos, aniversário de São João, pedidos, `BENTO_NA_VILA`, `falasDoBento`) e
  `sistemas/conversa-do-bento.ts` (sobre o salvamento: `comecarConversaComOBento`,
  `presentearOBento`, `entregarAoBento`, `podeEntregarAoBento`, `oQueFaltaAoBento`). As contas de
  amizade e de pedido de itens são as de `moradores.ts`, agora gerais (`darPresente` recebe os
  gostos e o aniversário; `temOsItens`, `entregarItens`, `oQueFaltaDosItens`, `olharDoMorador`).
- No mundo: `mundo/morador.tsx` (`MoradorDaIlha`) é o morador parado que vira, acena, fala,
  comemora, pisca e abre a conversa; `mundo/capi.tsx` e `mundo/bento.tsx` só dizem o modelo, o
  painel, as medidas e onde ficam. O Bento fica na âncora `morador` da `vila-doce.glb`, de costas
  para a `padaria`, montado por `mundo/vila-viva.tsx` (`ILHAS_VIVAS['vila-doce']`).
- A loja da conversa é por morador (`lojaDaConversa(loja, 'bento')`, padrão `'capi'`); o painel é
  `interface/bento.tsx` (`PAINEL_DO_BENTO`), com os `Coracoes` e os `Presentes` exportados de
  `interface/capi.tsx`. Regras e textos: `docs/arquipelago-regras.md` §6.15.1. Testes:
  `tests/bento.test.ts`; navegador: `bun playground/verificar-bento-browser.ts`.
- Receitas do Bento (fase2-04): ingredientes e pratos em `sistemas/itens.ts`; `RECEITAS` com
  `onde` (`bancada` ou `forno`) e `bento` (o coração que ensina), `receitasConhecidas`,
  `receitasPossiveis`, `fazerReceita` e `PAINEL_DA_BANCADA` em `sistemas/receitas.ts`. A conversa
  (`conversa-do-bento.ts`) acrescenta `FALA_DA_RECEITA` e os ingredientes quando a amizade passa
  um coração, e a cesta da despensa (`cestaDoBento`) a cada entrega. O forno chega pelo
  `ganharProjetos` com o primeiro coração; o painel dele e o da bancada usam `ListaDeReceitas`
  (`interface/receitas.tsx`). Playground: `?bento=290` (amizade com o Bento). Testes:
  `tests/receitas-do-bento.test.ts`; navegador: `bun playground/verificar-receitas-browser.ts`.
- Diário da Vila (fase2-12): a página da Vila Doce chega pelo Bento com 2 corações
  (`CORACOES_DA_PAGINA_DA_VILA`, `FALA_DA_PAGINA_DO_BENTO`, `ganhouAPaginaDaVila` em
  `sistemas/diario.ts`) e o diário ganha a seção Receitas (`colecaoDeReceitas`). Testes em
  `tests/diario.test.ts`.
- Turnos nos balcões (fase2-03, salvamento V8 `turnos`): regras puras em `sistemas/turnos.ts`
  (`BALCOES`, `pedidosDoTurno`, `porNaBandeja`, `entregarBandeja`, `fecharTurno`), loja do painel
  em `estado/turno.ts` (`PAINEL_DO_TURNO`, `lojaDoTurno`), painel `interface/turno.tsx`. A
  sorveteria e a barraca de sucos abrem pelo E (`mundo/balcoes-da-vila.tsx`, âncoras `sorveteria`
  e `barraca-5`); a padaria, pelo "Ajudar no balcão" do painel do Bento. Só o primeiro turno do dia
  em cada balcão paga (ingredientes; na padaria, também `ajudarOBento`); moedas esperam o serviço.
  Regras: `docs/arquipelago-regras.md` §6.15.2. Testes: `tests/turnos.test.ts`; navegador:
  `bun playground/verificar-turnos-browser.ts`.
- Entrega pelos telhados (fase2-05, percurso `vila-telhados`): o percurso com tempo virou genérico
  (`ConfigDoPercurso` e `PERCURSOS_DO_JOGO` em `sistemas/percurso.ts`; as funções recebem a
  config, padrão o das copas) e o componente `mundo/corrida-na-ilha.tsx` (`CorridaNaIlha`: largada,
  cronômetro, coletáveis, queda com o corte e resultado) serve o Bosque e a Vila. Os pontos da
  Vila saem de `mundo/telhados.ts`. `CorridaNaTela` e `ResultadoDaCorrida` dizem o `percurso`, e o
  HUD lê nome, coletável e tempo da config. `podeConstruir` some com a barra durante a corrida.
  Testes: `tests/entrega-pelos-telhados.test.ts`; navegador: `bun playground/verificar-percursos-browser.ts`
  (com o SwiftShader a cena anda a ~1 quadro por segundo: espere o corpo sair e voltar, nunca um
  tempo fixo).
- Patins (fase2-05, `sistemas/patins.ts`): a primeira chegada da entrega traz o item `patins`
  (`premio` em `ConfigDoPercurso`); o botão da mochila calça (`loja.patins`, transitório, vale com
  o item na mochila: `comPatins`). `EntradaDoPasso.patins` muda o modo chão (rapidez 1,3 e o perfil
  `PERFIS.patins`, nunca nadando); o personagem divide a velocidade das animações pela rapidez. O
  par vira malha com o esqueleto do avatar (`patimNoEsqueleto`: geometria do arquivo no referencial
  das peças, pesos do pé e da canela por altura, `pesoDaCanela`), igual ao cano da bota do avatar, e
  o calçado do avatar some enquanto isso (pela geometria da peça `shoes-*` em uso). Não prender peça
  vestida pela pose parada: o pé gira uns 14° para fora da canela no Idle e a perna escapava da bota.
  O medidor mostra `patins` (malhas e altura das rodinhas). Regras: §6.13.2. Testes:
  `tests/patins.test.ts` e `tests/patins-nos-pes.test.ts`; navegador:
  `bun playground/verificar-patins-browser.ts` (`?patins=1`).
- Borrões da noite e Lumis da Vila (fase2-06, salvamento V9 `lumis`): regras puras em
  `sistemas/borroes.ts` (`borroesDaNoite` pelo dia do jogo, `passoDoBorrao` sem alocar, `prender`,
  `prenderBorrao`, `lumisNaVila`, `receberLanterna`, `lerPresos`/`gravarPresos`); no mundo,
  `mundo/borroes-da-ilha.tsx` (desde 30/10 `BorroesDaIlha`, montado em cada ilha viva e na praia; antes só pelo `VilaViva`: borrões à noite perto das âncoras `lumi-N`,
  Lumis morando nelas). A lanterna é item (`ITENS.lanterna`, equipamento) que o Bento dá do segundo
  encontro em diante; `loja.lanterna` (transitório) acende pelo botão da mochila e
  `personagem/lanterna-na-mao.tsx` a pendura na ponta dos dedos (sem luz de verdade: uma luz a mais
  recompila todos os materiais). Os presos da noite ficam no `localStorage` por perfil. O medidor
  mostra `borroes`, `lumisDaVila` e `lanternaNaMao`. Regras: §6.15.3. Testes: `tests/borroes.test.ts`;
  navegador: `bun playground/verificar-borroes-browser.ts` (`?lanterna=1&adiantar=12`).
- Descanso (fase2-13): `sistemas/descanso.ts` (energia por segundo no banco e na cama, `descansar`,
  `sonecaAcabou`, `lugarNoBanco`, `lugarNaCama`) e o modo do corpo `modos/descanso.ts` (entra pelo
  pedido `{ tipo: 'descanso', lugar }` do interativo, sai andando, pulando, usando ou pelo pedido
  `levantar`). O corpo do Rapier fica de pé ao lado do móvel e só o desenho vai para o assento ou o
  colchão (`personagem.tsx`; o clipe "Deitar" já vem deitado de costas). Clipes "Sentar" e
  "Deitar" no `locomocao.glb`. A energia sobe nos `Relogios`
  (`loja.descanso`); a barrinha "Soneca" fica no HUD. Bancos: `mundo/bancos-da-vila.tsx` lê os
  colisores `col-banco-N` da ilha preparada (já girados com a ilha: não girar de novo). Testes:
  `tests/descanso.test.ts`; navegador: `bun playground/verificar-descanso-browser.ts`
  (`?energia=20`); medidor: `descanso`, `energia`, `avatar`.
- ⚠️ Olhos: o olho do Blender tem dois materiais e o three divide a malha em `-olhos_1` e
  `-olhos_2`. Até 29/10/2026 `useCopiaAnimada` procurava só `-olhos` e nenhum personagem ou bicho
  piscava. `malhasDosOlhos` (`mundo/animado.ts`) acha todas as partes e `olhosNoInstante` mexe em
  cada uma; `tests/olhos-dos-personagens.test.ts` confere todos os GLBs de personagens e bichos.

### Mini estúdio de blocos dos Lumis (fase2-14)

- A plataforma abre a ferramenta `rotina-lumi` por cima do jogo. O botão “Montar com blocos” fica no painel Rotina. Cancelar ou falhar mantém os cartões e o rascunho; “Testar”, o Lumi no mundo, o HUD e “Da última vez” continuam no jogo.
- Contrato transitório versão 1 em `arquipelago-contracts/src/rotina-ferramenta.ts`: espécie, id da abertura, rotina compacta, cartões das outras rotinas, cartões do serviço e mundo pequeno (horta, mochila, geladeira). O retorno contém só a rotina, espécie e abertura. Sem campo novo no salvamento V10.
- `rotina-execucao.ts`, `rotina-validacao.ts`, `horta.ts` e `rotina-mundo.ts` no contrato são o núcleo puro compartilhado. O jogo adapta o salvamento; a prévia usa uma cópia. A horta e a geladeira normais também usam as operações extraídas. Não há import do jogo pela plataforma.
- A ponte comum relê `GET /cartas` ao abrir e ao guardar. Os controles dependem dessa resposta, inclusive Contar mais um. O jogo confere novamente permissões, espécie, versão, abertura, alterações concorrentes e teto de 32 antes de guardar sobre o estado atual.
- Editor Blockly em `member-shell/src/components/arquipelago-rotina/` (a porta da plataforma para o jogo; saiu do Studio em 29/10/2026 para o Studio não depender dos contratos do jogo), carregado sob demanda pela plataforma, com conversão nos dois sentidos. Do Studio ele usa só o visual do Blockly (`@sistemazero/studio/blockly-theme`). Cada bloco corresponde a um cartão. Até 16 blocos, 3 níveis e 32 no conjunto. Peças soltas, controles vazios e cartões bloqueados impedem guardar.
- No computador, blocos e prévia ficam lado a lado. No celular, “Blocos” e “Prévia” alternam a área. A miniatura esquemática mostra canteiros e geladeira, o Lumi no passo, o bloco destacado e o registro. “Prever”, “Pausar prévia”, “Próximo passo” e “Recomeçar” nunca mudam o jogo. Como o antigo teste completo, a prévia usa o instante da abertura, sem acelerar o crescimento da horta pelo Esperar.
- Tema da comunidade Kids, com os tokens oficiais de cores, fontes Baloo 2/Nunito do host, botões com degrau e foco visível. A área do Blockly recebe as mesmas cores; seus menus ficam dentro do diálogo e voltam ao host ao fechar.
- JavaScript/TypeScript somente, sem Python, seletor de linguagem ou código livre. A aparência futura da miniatura pode receber arte própria; nenhum GLB foi alterado.
- Playground `?rotina=editor&lumis=quindim:1&cartas=todas` carrega um host de QA da plataforma, fora do bundle do jogo. `rotina=cancelado` e `rotina=indisponivel` exercitam as reservas. `cartas=fora-do-ar`/`desligadas` mantém as recusas do serviço.
- Provas: `member-shell/tests/arquipelago-rotina-blocks.test.ts`, `arquipelago/tests/mini-estudio-lumis.test.ts`, rotina existente e teto V10. Navegador: `arquipelago/playground/verificar-mini-estudio-browser.ts`.

## A rotina dos Lumis (fase2-07, 29/10/2026)

- Contrato: `arquipelago-contracts/src/rotinas.ts` (o formato curto dos cartões: `c`, `a`, `n`,
  `se`, `d`, `casos`; `LIMITES_DA_ROTINA`) e o salvamento V10 (`rotinas`, uma por Lumi preso).
- Regras puras em `sistemas/rotina.ts`: `validarRotina` (começa com um Quando, os de controle na
  mão pela leitura de `GET /cartas`, `cartasNaMao`), `guardarRotina`, a montagem do rascunho
  (`Alvo`, `porCartao`, `tirarCartao`, `moverCartao`, `mudarCartao`, `alvoExiste`) e o intérprete
  (`comecarExecucao` cria a pilha uma vez; `proximoPasso` devolve sempre `e.passo` e não cria nada;
  `aplicarPasso` usa `regar` e `colher` de `horta.ts` e `guardarNaGeladeira`; o colhido vai para
  a mochila na hora, e a `carga` só lembra o que levar à geladeira, então parar no meio não perde
  nada). `rodarRotina` roda inteira (testes e a prévia do "Testar").
- Loja à parte em `estado/rotina.ts` (`lojaDaRotina`: o Lumi escolhido, a fila, o que ele faz agora
  e a última vez; `abrirRotina`). Painel `interface/rotina.tsx` (`PAINEL_DA_ROTINA`), aberto pelo
  caderno ("Montar a rotina de um Lumi") e perto de um Lumi da Vila ("Ensinar a rotina", de fundo,
  em `mundo/borroes-da-ilha.tsx`); o aviso `RotinaAndando` fica no HUD, no alto à direita (no
  celular, 154 px do topo).
- No mundo: `mundo/rotina-dos-lumis.tsx` (`RotinaDosLumis`, na `Cena`): a virada de
  `ambiente.noite` põe na fila as rotinas daquele Quando (`quandoDaVirada`, `rotinasDoQuando`);
  um Lumi de cada vez aparece na horta com `useCopiaAnimada` (escala 0,5) e toca `andar`,
  `trabalhar`, `parado` e `feliz` (`trocarClipe`). Os lugares saem de `lugarDoCanteiro` (exportado
    de `mundo/horta.tsx`) e `lugarDaGeladeira`. O medidor mostra `lumiDaRotina`.
  - Perfis dos 14 Lumis em `arquipelago-contracts/src/lumis-trabalho.ts`: voo, trabalho, carga e
    luz noturna. Prévia e mundo usam o mesmo intérprete com capacidade por espécie. Colheita
    inteira recusa mochila, semente ou carga sem espaço e mantém a planta madura. A colheita
    manual usa `cabeColheita`; receitas recusam saída cheia antes de consumir ingredientes.
    Provas em `tests/lumis-trabalho.test.ts` dos contratos e
    `playground/verificar-lumis-trabalho-browser.ts` no jogo.
- ⚠️ O pior caso do salvamento ficava a 29 bytes do teto de 64 KB com as rotinas no teto (era
  290 na V10; o `recife` da V11 custa 54, o percurso `pico-cume` uns 96, o `vale` da V12 80, os
  corais da V13 12 e a banda da V14 19; medido em 29/10/2026, `tests/salvamento-v10.test.ts`):
  campo novo no salvamento precisa achar espaço antes (encurtar outro campo ou mudar o formato
  numa versão nova).
- Regras e textos: `docs/arquipelago-regras.md` §8.2. Testes: `tests/rotina.test.ts`; navegador:
  `playground/verificar-rotina-browser.ts` (`?lumis=quindim:1&cartas=todas`, compilar para Node no
  Windows).
- ⚠️ **Decidido em 29/10/2026 (fase2-14, com outra sessão): a montagem da rotina vai para um mini
  estúdio de blocos.** Os cartões do painel viram blocos próprios dos Lumis, num editor da
  plataforma aberto por cima do jogo pelo `plataforma.abrirFerramenta` (como o Pinta, o Molda e o
  Estúdio de desafio), com a prévia passo a passo ao lado. Ele reaproveita peças do Estúdio, mas não
  é o Estúdio. O formato guardado continua o `RotinaSchema` (V10, sem salvamento novo). Os blocos na
  mão continuam vindo de `GET /cartas`, e o jogo continua rodando a rotina no mundo. Não copiar o
  editor para dentro do jogo (`tests/fronteira.test.ts`). Até ele chegar, o painel de cartões segue
  valendo.

## Recordes da família e visitas (fase3-12, 29/10/2026)

- Regras puras em `sistemas/visitas.ts` (`leituraDosIrmaos`, `leituraDaCasa`, `recordesDaFamilia`,
  `obraVisivel`, `hortaVisivel`, `objetoCompleto`, `quartoVisivel`, `CHEGADA_DA_VISITA`,
  `QUARTO_DA_VISITA`, `RAIO_DA_VISITA`/`saiuDaVisita`, `falaDaChegada`, `falaDaSaida` e os textos); loja à parte em `estado/familia.ts` (`lojaDaFamilia(loja, plataforma)`: `GET /irmaos` a
  cada resultado e a cada abertura do painel, e `abrirCasa`). Na loja principal, `visita` e
  `visitar(v | null)`: com a visita, ⚠️ o `mudar` não faz nada (nada é gravado).
- No mundo, `mundo/casa.tsx` (a obra e o quarto do irmão, 29/10/2026; vazio se não chegou; a cama
  e a porta nova sem ação), `mundo/objetos-da-casa.tsx` (completo pelo irmão, nenhum "Abrir") e
  `mundo/horta.tsx` (a horta do irmão, nenhuma ação) leem pelas regras acima;
  `mundo/rotina-dos-lumis.tsx` não começa nem continua rotina na visita. ⚠️ O `personagem.tsx` não
  escolhe alvo na visita (nada do mundo age) e termina a visita quando ela passa da praia da ilha
  central (`saiuDaVisita`, fora de um teleporte pendente): lá fora o jogo dela precisa gravar.
- Interface em `interface/visitas.tsx`: `RecordesDaFamilia` (no `Resultado` do HUD),
  `PainelDasVisitas` (`PAINEL_DAS_VISITAS`, pelo menu) e `FaixaDaVisita` (no lugar de
  `ModosDoJogo`, `top:68px`; no celular `top:106px`, longe do direcional).
- Plataforma de mentira: `plataforma/familia-falsa.ts` (`?familia=irmaos|sozinha|desligada|fora-do-ar`;
  a Ana tem quarto, o Tomás tem `quarto: null`, o caso do Members fora).
  Regras e textos: `docs/arquipelago-regras.md` §6.20. Testes: `tests/visitas.test.ts`; navegador:
  `playground/verificar-visitas-browser.ts` (compilar para Node no Windows; o roteiro espera os 20 s
  da fila do jogo antes de conferir que a visita não grava).

## Diário e pegadas (28/10/2026, Fase 1)

- Regras puras em `sistemas/diario.ts` (páginas da Íris e a coleção do Bosque, derivadas do
  salvamento, sem campo novo) e `sistemas/pegadas.ts` (`FORMA_DA_PEGADA`, as elipses de cada
  pegada no quadro de 64, e `rastroNoCaminho`). Regras e números: `docs/arquipelago-regras.md`
  §6.17. Testes: `tests/diario.test.ts` e `tests/pegadas.test.ts`.
- Painel em `interface/diario.tsx` (`PAINEL_DO_DIARIO` em `painelAberto`), aberto pelo menu. O
  desenho da pegada no diário (`interface/pegadas.tsx`, SVG) e no chão
  (`mundo/rastro-de-pegadas.tsx`, uma malha instanciada por bicho) saem das mesmas elipses.
- A página do Bosque chega pela Capi: `comecarConversa`, `presentear` e `entregar` põem
  `FALA_DA_PAGINA` no fim das falas quando a amizade passa de `CORACOES_DA_PAGINA`; por isso
  `presentear` e `entregar` devolvem `falas` (lista) e `responder` da loja da conversa recebe a lista.
- O rastro sai no `BichosDoBosque`, à toa (`requestIdleCallback`), pelo mesmo
  `caminhoAteOCercado` da corrida até o cercadinho (que monta a grade se ainda não houver).

## Álbum de coleções e modo foto (fase2-09, 29/10/2026)

- Álbum: regras puras em `sistemas/album.ts` (`albumDoSalvamento` e uma função por seção, cada uma
  com `conta` = tem, total e faltam), derivadas só do salvamento, sem campo novo. Bichos e receitas
  vêm de `colecaoDoBosque` e `colecaoDeReceitas` do diário, e o painel (`interface/album.tsx`,
  `PAINEL_DO_ALBUM`, aberto pelo menu) desenha com os `Bicho` e `Receita` exportados de
  `interface/diario.tsx`. Os Lumis: `ESPECIES_DE_LUMI` (nome, ilha, comum ou rara e a cor do
  material `corpo` do GLB, conferida no teste) e a miniatura de cada espécie (`MINIATURA_DO_LUMI` de
  `interface/miniaturas-dos-lumis.ts`, PNGs de `arte/lumis/miniaturas.py`); quem ainda não foi
  encontrado aparece como a silhueta escura da mesma imagem. A rotina usa as mesmas miniaturas.
- Modo foto: `PAINEL_DA_FOTO` em `painelAberto` (a pausa dos painéis para o personagem; a câmera
  segue girando). O `Hud` troca tudo pela `ModoFoto` (`interface/foto.tsx`), como na luneta;
  `AtalhoDaFoto` escuta o F. A captura mora dentro do `<Canvas>` (`mundo/foto.tsx`, `CameraDaFoto`,
  registrada por montagem em `estado/foto.ts`): `capturarQuadro` faz `gl.render` e `toBlob` na mesma
  chamada. ⚠️ Não ligar `preserveDrawingBuffer` (o teste confere `mundo/cena.tsx`). A foto só é
  baixada no aparelho; nada vai para o serviço nem para o Clube.
- Regras e textos: `docs/arquipelago-regras.md` §6.17.1. Testes: `tests/album.test.ts`; navegador:
  `playground/verificar-album-browser.ts` (compilar para Node no Windows, `ARQUIPELAGO_CHROMIUM`
  aceito), que semeia um salvamento com um pouco de cada coleção no `localStorage` do playground.

## Salvamento e tempo

- `SalvamentoV12` (contrato) com versão; as anteriores migram sozinhas (`migrarDaV1`: nenhum
  percurso corrido; `migrarDaV2`: a Capi sem amizade e nenhum bicho; `migrarDaV3`: a casa de antes
  e nenhum projeto azul; `migrarDaV4`: presente dos bichos ainda não entregue; `migrarDaV5`: a
  aparência em uso guardada; `migrarDaV6`: o Bento novo; `migrarDaV7`: nenhum turno feito; `migrarDaV8`: nenhum Lumi preso; `migrarDaV9`: nenhuma rotina; `migrarDaV10`: nenhum achado do Recife; `migrarDaV11`: nenhuma descoberta do Vale).
  Gravar aceita a versão de
  uma aba aberta antes da atualização e guarda migrada, mas essa aba não lê a resposta atual: só a
  primeira gravação dela fica, as seguintes falham até recarregar.
  Gravação por revisão (CAS). Revisão velha recebe 409
  `SALVAMENTO_DESATUALIZADO` e o jogo adota o que está guardado.
- Tempo livre do Kids: cada segundo ativo fica em IndexedDB por perfil; lotes de até 10 s são
  enviados com UUID e dia de São Paulo. O serviço trata repetições de forma idempotente; uma
  falha pausa o jogo até confirmar a fila. O limite padrão é 30 min e os pais podem alterá-lo.
  A comunidade adulta não tem limite diário nem usa esta fila. O dia do evento usa o relógio do
  aparelho, e os limites dessa confiança precisam ser considerados antes da abertura em produção.

## O Recife e a Maré (fase3-01, 29/10/2026)

O Recife está em `ILHAS_COMPLETAS` e `RecifeVivo` em `ILHAS_VIVAS`. Segue o ciclo existente de
carregar, preparar, esmaecer e soltar; a Maré e a lagoa só ficam montadas com a ilha ativa. O
Quadro das Cores usa a montagem genérica na chegada. Nenhum navio ou sistema de mergulho entra
nesta fase.

`mundo/recife.ts` lê as âncoras `casa-mare` e `morador` e a elipse do nó `agua`. O GLB recebido
em `02cfe22f4` já tem a bacia no terreno, com fundo de 0,85. A água entra em `movimento.aguas`
e sai na desmontagem. A roda de nado já registrada em `anel.tsx` usa raio 28,6 no Recife,
incluindo a aproximação à boca da caverna. `raioDaEsperaDaIlha` espera os colisores até 24 do
centro, também fora do contorno da ilha leve, sem acrescentar chão invisível.

`mundo/mare.tsx` usa `MoradorDaIlha`: cópia animada, aceno, giro, piscar e conversa. O cilindro
`col-morador-mare` segura só o corpo, com raio 0,46 e altura 1,45; cabeça a 1,2. As distâncias
e os tempos seguem o Bento. `sistemas/mare.ts` retorna o mesmo salvamento na apresentação;
o morador genérico só chama `mudar` quando recebe outra referência. Não criar amizade,
presentes ou pedidos nesta fase. A amizade espera uma próxima versão, sem alterar a V10.

Plano e decisões propostas: `docs/plans/2026-10-29-arquipelago-recife.md`. Testes:
`tests/recife.test.ts`, `tests/colisores-do-recife.test.ts`, `tests/lagos-das-ilhas.test.ts`,
`tests/ilhas-completas.test.ts` e `tests/faces-coplanares.test.ts`. Navegador:
`playground/verificar-recife-browser.ts`, com `?posicao=4`, computador e celular emulado.
O nado faz parte do modo `chao`: a conferência verifica a cintura na superfície e o corpo
sem apoio, em vez de procurar um modo chamado `nadar`.

Barco entre as ilhas (fase3-04): no `pier.glb`, o barquinho a remo é o nó `barquinho-decorativo`
(casco no `col-barco-1`) e as âncoras `barco` (linha d'água, proa para o mar) e `embarque` (tampo,
fora do alcance da luneta) dizem onde o barco da viagem atraca; no Recife, `barco` e `cais`. O
`barco.glb` tem a âncora `passageiro`, filha do nó animado `barco`. Testes: `tests/ancoras-do-barco.test.ts`.

Sob tetos baixos, `desvioVerticalDaCamera` também compara passar abaixo do alvo pela folga de
`FOLGA_DA_CAMERA`, com a sonda real e o ganho mínimo da grua. A posição horizontal exata pode
tangenciar o teto; não retirar colisores para resolver isso. O desvio entra e sai suavemente,
sem alterar a preferência. Testes em `camera-sob-teto.test.ts` e no roteiro do Recife.

## O Pico Gelado e o Floco (fase3-06, 29/10/2026)

O Pico está em `ILHAS_COMPLETAS` e `PicoVivo` (`mundo/pico-vivo.tsx`) em `ILHAS_VIVAS`, no mesmo
ciclo do Recife. Os colisores vêm todos do `pico.glb` (a trilha cavada até o platô do cume, o palco,
o iglu fechado e, desde a fase3-07, a caverna de cristal atrás da montanha). O Floco
(`mundo/floco.tsx`, `MoradorDaIlha`) fica no topo do tablado (âncora `palco`), voltado à marca
`morador` (`lugarDoFloco` em `mundo/pico.ts`); medidas e falas em `sistemas/floco.ts` (raio 0,43,
altura 1,49, cabeça 1,19, alcance 2,6). A apresentação usa o painel genérico
`interface/apresentacao.tsx` (`PainelDeApresentacao`), o mesmo da Maré. Sem amizade nem salvamento
novo. Percurso, trenó e caverna são da fase3-07; iglu, festival e banda, da fase3-08 (abaixo). Testes:
`tests/pico.test.ts`; navegador: `playground/verificar-pico-browser.ts` (`?posicao=5`).

## A subida ao cume, o trenó e a caverna de cristal do Pico (fase3-07, 29/10/2026)

Plano: `docs/plans/2026-10-29-arquipelago-pico-percurso-treno-caverna.md`; regras e números em
`docs/arquipelago-regras.md` (seção da fase3-07).

- **Subida ao cume** (`pico-cume` em `PERCURSOS` do contrato, sem versão nova; `PERCURSO_DO_CUME`
  em `sistemas/percurso.ts`): `mundo/subida.ts` lê as âncoras `subida-largada`, `subida-1..4`,
  `floco-1..5`, `cume` e a linha `treno-curva-N` (para o rumo das voltas) e monta os
  `PontosDoPercurso`; o `PicoVivo` roda o `CorridaNaIlha` genérico com flocos de neve brancos.
  ⚠️ O pior caso do salvamento ganhou a entrada `pico-cume` (uns 96 bytes): sobravam uns 140 do
  teto de 64 KB; depois da V12, da V13 e da V14 sobravam 29 (a V15 abriu espaço: 4579).
- **Trenó** (`sistemas/treno.ts`, `mundo/treno-do-pico.tsx`): não é um modo novo. A trilha vira uma
  pista do MESMO modo `escorregar`, com o atrito do gelo (`MATERIAIS.gelo`), teto de 4,5 m/s e
  `soPorPedido` (andar na trilha não senta; só o pedido `escorregar` do "Descer de trenó", do
  começo da pista). O nó `treno-desenho` (origem na base do trenó; `treno` é a âncora) vai
  debaixo de quem desce, virado para `rastro.direcao`, e volta ao platô no fim. ⚠️ Os modos guiados também passam pela colisão
  (`passoComColisao`: bloqueado, volta ao chão), e o colisor do trenó parado ocupa o começo da
  pista: por isso `col-treno-*` é uma PEÇA (`pecaDoColisor` em `mundo/colisores-da-ilha.ts`), num
  corpo do Rapier próprio com `userData.peca`, e o personagem o ignora no `escorregar` (como o
  barco no modo barco). Peça nova que o corpo usa entra em `PECAS_QUE_O_CORPO_USA`. O escorregar
  agora para na pausa (`e.parado`), e o relógio do modo (`noModo`) também.
- **Caverna:** a espera pelo chão e a roda de nado crescem para o lado da caverna
  (`CAVERNA_DO_PICO` em `mundo/medidas.ts`). O cristal raro (`sistemas/cristal-raro.ts`,
  `mundo/cristal-do-pico.tsx`): "Pegar o cristal" de pé no alto da saliência põe o item
  `cristal-rosa` na mochila uma vez; com ele lá, o nó `caverna-joia` some. O item é uma
  `lembranca` (`sistemas/itens.ts`): não se come nem se dá de presente, senão voltaria ao pedestal.
- Testes: `tests/subida-ao-cume.test.ts`, `tests/cristal-raro.test.ts`, o trenó em
  `tests/modos.test.ts`, os colisores em `tests/colisores-do-pico.test.ts`; navegador:
  `playground/verificar-pico-browser.ts`.

## O iglu, a banda e o festival de inverno do Pico (fase3-08, 29/10/2026)

Regras e textos: `docs/arquipelago-regras.md` (seção da fase3-08); plano:
`docs/plans/2026-10-29-arquipelago-pico-iglu-festival-banda.md`.

- **Iglu oco** (`arte/ilhas-b/pico.py`, `IGLU`): a cúpula é o nó `telhado-iglu`, que esmaece como
  os telhados (`mundo/copas.ts`). O anel `col-parede-iglu` (menos o corredor da porta) segura o
  corpo onde a cúpula ainda passa da cabeça; o teste em grade de `tests/colisores-do-pico.test.ts`
  confere teto e passagem. Os bancos de gelo são `col-banco-N`: o `PicoVivo` monta o
  `BancosDaVila` (genérico) com os colisores da ilha.
- **Regra pura** em `sistemas/banda.ts`: `INSTRUMENTOS` (a ordem dos bits de `pico.banda`, V14),
  `devolverInstrumento`, `festivalDeInverno`, os rótulos e falas, `falasDoFloco` (a conversa do
  Floco agora sai daqui) e `fazerChocolateNoIglu` (a receita do chocolate quente sem os corações do
  Bento; o primeiro traz a lareira por `ganharProjeto`, o projeto azul é a própria marca). A banda
  chega em `ganharProjetos` com `pico.banda === 7`.
  Duas sessões juntam os bits (`conciliar-salvamento.ts`): levar ao palco não gasta nada.
- **No mundo**: `mundo/banda-do-pico.tsx` (`BandaDoPico`, montado pelo `PicoVivo`) lê as âncoras
  `instrumento-*`, `banda-*`, `musico-*`, `palco`, `morador` e `fogareiro`; os instrumentos são
  cópias dos nós do `banda.glb` da casa (posição zerada), com colisor `col-instrumento-*` do tamanho
  da caixa deles (só para o corpo); os pinguins (`pinguim.glb`, escala 1,8) ficam no palco com
  `col-morador-pinguim-N`, curvados sem o instrumento e balançando quando ele volta (menos
  movimento: parados); as notas do festival sobem do palco com a banda completa. Tudo respeita a
  pausa, a troca da ilha (0,99) e o somente leitura.
- ⚠️ O pior caso do salvamento ficou com 29 bytes de folga depois da V14 (a V15 abriu espaço: 4579).
- Testes: `tests/banda.test.ts`, o bloco do iglu em `tests/colisores-do-pico.test.ts`, o Floco em
  `tests/pico.test.ts`; navegador: `playground/verificar-pico-browser.ts`.

## O planador e o vento da parede de gelo (fase3-09, 29/10/2026)

Plano: `docs/plans/2026-10-29-arquipelago-planador.md`; regras e números em `docs/arquipelago-regras.md`.

- **Item e presente** (`sistemas/planador.ts`): `planador` em `ITENS` (equipamento, 🪁), dado pelo
  Floco na primeira conversa do festival (`comecarConversaComOFloco`, `pegarPlanador`); sem versão
  nova do salvamento. Tocar no item da mochila diz como usar (`COMO_USAR_O_PLANADOR`).
- **Modo `planar`** (`sistemas/modos/planar.ts`, em `MODOS` e `ModoDoCorpo`): entra pelo modo chão
  (`podeAbrirOPlanador`, `abrirOPlanador`, com `EntradaDoPasso.planador`), leva o corpo pelo
  controlador do chão e fecha pulando, pisando ou na água. `PLANADOR` guarda os números. O HUD diz
  "Fechar o planador"; no toque, o botão Pular vira Fechar. Na locomoção, usa o clipe Planar.
- **Corrente de ar** (`CorrenteDeAr` em `movimento.correntes`, `subidaDaCorrente`; na coluna dela,
  `naColunaDaCorrente`, o ar segura no lugar quem plana sem pedir direção): a do Pico vem da
  âncora `corrente-de-ar` (`mundo/corrente-de-ar.tsx`, `correnteDoPico`, montada pelo `PicoVivo`,
  com flocos de neve subindo). `CORRENTE_DO_PICO` (raio 1, altura 4,75) é a medida que leva do alto
  dela ao alto da parede (`topo-da-parede`).
- **Desenho**: `personagem/planador-aberto.tsx` (`PlanadorAberto`, o `planador.glb` com o clipe
  `planar` dentro do desenho do avatar, barra em `BARRA_NO_AVATAR`), só com o item na mochila e
  visível no modo planar; o corpo inclina `INCLINACAO_NO_PLANADOR` para a frente.
- Testes: `tests/planador.test.ts` e o bloco da fase3-09 em `tests/colisores-do-pico.test.ts`;
  navegador: `playground/verificar-pico-browser.ts`.

## O Vale dos Dinos e a Jade (fase4-01, 29/10/2026)

O Vale está em `ILHAS_COMPLETAS` e `ValeVivo` em `ILHAS_VIVAS`, com os 62 colisores do GLB
existente e o mesmo ciclo do Pico. `RAIO_VISITAVEL_DO_VALE` espera o chão até 16 m: o terreno
inclinado passa dos 14,4 m da ilha leve e sua saia chega a 15,614 m. Não cria chão fora da ilha.
Jade usa `MoradorDaIlha`, na âncora `morador` do chão, olhando para `chegada` (`mundo/vale.ts`).
A varanda não tem acesso nesta fase e a torre é fechada. Medidas do `jade.glb` em
`sistemas/jade.ts`: raio 0,41, altura 1,5, cabeça 1,15, alcance 2,2. Só o corpo colide.
As duas falas usam `PainelDeApresentacao`, sem amizade, pedidos, presentes ou mudança da V10.
Escavar, ninhos, filhote e museu interativos continuam nas fases4-02 e 4-03.
Testes: `tests/vale.test.ts`, `tests/colisores-do-vale.test.ts` e o Vale já incluído em
`tests/faces-coplanares.test.ts`. Navegador: `playground/verificar-vale-browser.ts`, `?posicao=6`;
prints em `docs/qa/2026-10-29-vale`. Nenhum GLB ou gerador foi alterado.

## Rodar

- `bun run dev`: playground em `http://127.0.0.1:4520` (parâmetros na URL: `posicao`, `publico`,
  `limite`, `liberado`, `novo`, `persistir`, `em=x,z[,y]`, `adiantar`, `cartas`). Serve `/avatar3d` e `/room3d`
  do `public/` do community-kids.
- `bun run build`: `dist/cliente/` com chunks com hash e `manifesto.json` validado pelo contrato.
- `bun test`, `bun run typecheck`, `bun run test:tempo-browser` (Chrome instalado).
- `tests/tempo-api.integration.test.ts` requer `ARQUIPELAGO_TEMPO_TEST_DATABASE_URL` apontando
  para banco Postgres local descartável cujo nome começa com `arquipelago_test`; aplicar as
  migrações do serviço antes do teste. Sem essa variável o teste é pulado.

## Conferência do escorregador, física viva etapa 3

O modo existente foi preservado. `tests/modos.test.ts` compara a descida, a posição final e o embalo em 30, 60 e 144 quadros por segundo, sempre com passos físicos de 1/60 s. A sala `/movimento?estacao=Escorregador` permite conferir a entrada e a saída no controlador real.

## Pontes vivas, etapa 4

As três pontes do Bosque cedem até 0,10 m e balançam até 0,025 m. A mola usa rigidez 32 e amortecimento 9, com velocidade vertical limitada a 0,3 m/s. As pontas têm deslocamento zero. As caixas contínuas do piso e dos corrimãos são plataformas cinemáticas marcadas por `plataformaDoMundo`, aceitas pelo controlador sem fazer o bicho adotado bloquear o caminho. Desenho e colisão usam a mesma deformação. Arquivos: `sistemas/pontes-vivas.ts` e `mundo/pontes-vivas.tsx`.

A ponte usa uma mola limitada com duas pontas fixas, em vez de adaptar a corda dos cipós, que tem uma ponta presa e outra livre. Isso mantém o percurso previsível. O GLB atual já fornece âncoras e caixas suficientes. Nada precisa ser regerado nesta etapa. O medidor, dentro de `Physics`, passa a informar `fisica.corposAtivos`, `fisica.passoMs` e `pontes`.


### Física viva: mecanismos (28/10/2026)

`mundo/mecanismos.tsx` usa duas dobradiças Rapier, com limites e mola. A porta abre pelo empurrão normal do controlador. A placa lê o caixote apoiado, não a proximidade do personagem. O chão sob o alçapão fica inteiro. Colisores simples e fora do grupo da câmera. A porta tem folga acima da placa para não prender a dobradiça.

A estação Mecanismos em `/movimento` usa o arranjo da sala (`ARRANJO_DA_SALA`: tudo logo atrás da porta). No Bosque (`bosque.glb` regerado em 28/10/2026), a porta fica na parede da casa na árvore virada para a escada (âncoras `mecanismos-casa`, a dobradiça, e `mecanismos-rumo`, para dentro). A parede virada para o tronco não serve: entre ela e o tronco não passa ninguém. A placa, o caixote e o alçapão ficam no anel do deque do outro lado do tronco (âncoras `mecanismos-placa`, `-caixote` e `-alcapao`, lidas por `BosqueVivo` como `arranjo`), perto da guarda. O lado do tronco fica livre para o percurso, e o alçapão fica onde a guarda não o segura ao abrir. As medidas estão em `CASA_NA_ARVORE` e `MECANISMOS_NO_DEQUE` (`arte/ilhas/bosque.py`):
- a casa tem 1,7 × 1,8 m e 2,2 m de altura;
- a verga fica a 2,1 m: a cápsula do corpo vai a 1,8 m dos pés, mais a folga do controlador;
- o vão é 10 cm mais largo que a folha;
- a folha fica fora da espessura da parede, porque a folha colide com a casa e, encostada, abria sozinha.

O caixote que cai abaixo do chão (meio metro) volta ao começo: na troca da ilha o chão pode chegar depois dele. Testes contra o GLB: `tests/casa-na-arvore.test.ts` (a passagem pela porta, a cabeça sob a verga, o caminho do caixote, onde empurrar, o anel livre e o giro inteiro do alçapão). No navegador: `bun playground/verificar-mecanismos-browser.ts` (a criança atravessa a porta, empurra o caixote até a placa e o alçapão abre, 1,24 rad).


### Física viva: vento (28/10/2026)

O campo puro `sistemas/vento.ts` e sua versão GLSL usam a mesma conta. A hora vem do relógio do jogo; rajadas variam no espaço. `vegetacao-ao-vento.ts` encadeia os shaders existentes de pintura e pontes, incluindo cópias transparentes. Só deforma materiais de plantas e galhos altos, com raiz parada. Movimento reduzido usa 20% da amplitude visual, sem mudar a física.

Cipós livres recebem vento no passo fixo. O tronco do lago recebe força proporcional à parte exposta. Duas peças soltas tocáveis (folha e pena) têm arrasto e dormem ao cair. Folhas presas nas árvores e capim não têm corpos. Tudo monta apenas com o Bosque ativo, sem novos GLBs.


### Física viva: materiais e fogo (28/10/2026)

`sistemas/estados-dos-materiais.ts` guarda umidade, calor e combustível. A grade usa acumulador criado antes da simulação e lê todos os estados antes de propagar. Só passa calor entre peças do mesmo recinto. `MATERIAIS` concentra ignição, duração, calor e secagem. Pedra não acende; água zera o calor e apaga imediatamente.

A fogueira de `mundo/fogueira-viva.tsx` tem quatro peças dentro das pedras e um balde acessível. Só ilumina. Não causa dano nem consome inventário. Casas e plantas não são cadastradas no fogo. Posição no Bosque: `FOGUEIRA_DO_BOSQUE`, com teste de passagem contra o GLB. Estados transitórios reiniciam ao remontar a ilha. Modelos de arte não foram modificados nesta etapa.


### Física viva: mundo que reage (28/10/2026)

`objetos-reativos.tsx` monta quatro peças soltas no Bosque ativo. O controlador empurra os corpos dinâmicos, sem reposicionar o desenho para fingir empurrão. Colisores simples, peças paradas dormem e quedas para fora da ilha têm retorno. O galho baixo fora das copas quebra ao pisar; duas partes já montadas substituem o corpo inteiro, sem gerar geometria no passo. As posições ficam em `bosque.ts` e são conferidas contra o GLB.

`mundo-reativo.ts` guarda um conjunto fixo de 16 ondas. `ondinhas.tsx` lê a entrada e o deslocamento da criança e do tronco, desenha em uma malha instanciada e recorta no limite do lago. Não há simulação de fluido nem partículas criadas por quadro. Movimento reduzido baixa a opacidade. Estados transitórios pertencem à ilha ativa. Estações Peças soltas e Galho seco em `/movimento` usam as mesmas peças.

⚠️ Até 28/10/2026 os colisores da ilha completa e das pontes vivas iam com `collisionGroups={cond ? GRUPO : undefined}`. O `@react-three/rapier` aplica `undefined` como o grupo 0, então nenhum corpo dinâmico tocava a ilha: o caixote, as peças soltas, o galho, a folha e a pena atravessavam o chão e voltavam ao lugar. Só o personagem, cujo controlador não olha grupos, pisava. Use `gruposDoColisor` (`mundo/grupos.ts`); `tests/grupos-de-colisao.test.ts` recusa o padrão. O plano da física viva registra medições, notas do cartão e a conferência que falta em celular físico.

### Nico e Lumis da praia (28/10/2026)

`mundo/habitantes-da-praia.tsx` liga os GLBs existentes de Nico, Estrelinha e Búzio à ilha
central. Usa `useCopiaAnimada`, `trocarClipe` e uma `ComReserva` por modelo. As posições,
escalas e o aceno ficam em `sistemas/habitantes-da-praia.ts`. Nico acena ao entrar no alcance
de quatro metros, com intervalo mínimo de oito segundos, e vira para a criança a até seis
metros (`olharDoNico`, girando como a Capi). Os Lumis, com uns 37 cm (escala 0,5), descansam com
fases diferentes. A pausa do jogo congela as ações; movimento reduzido usa a velocidade do helper.

`habitantes-da-praia-colisao.ts` cria um cilindro arredondado por corpo, em metros e fora da
escala do desenho, com prefixo `col-morador-` para deixar a câmera passar. Os Lumis não têm
colisor aumentado para bloquear degraus. O colisor só monta quando seu modelo carrega.
Os testes carregam os GLBs reais e verificam clipes, dimensões, praia seca e regras do aceno.

Esta entrega é visual. Captura, rotinas, coleta de conchas e cartas não foram implementadas.
Não havia outro componente de Lumi no mundo para reaproveitar. Decisão e conferência em
`docs/plans/2026-10-28-arquipelago-praia-nico-e-lumis.md`. Nenhuma arte foi regenerada.

## Luneta do píer (geral-04, 28/10/2026)

- Regras puras: `sistemas/luneta.ts` escolhe a próxima ilha fechada do contrato e escreve a fala
  do Zappy e o recado da Íris. Depois das Nuvens, mostra o Farol. Os nomes de apresentação dos
  postos kids ficam locais, sem importar a plataforma. A abertura continua vindo de `ILHAS`.
- `mundo/luneta.tsx`, montada por `IlhaCentral`, usa o GLB pronto e gira o nó `tubo` em dois
  eixos. Colisor simples `col-cil-estaca-luneta`, só para o corpo. Interação E / Usar abre
  `painelAberto: 'luneta'`, aproveitando a pausa existente. Nada entra no salvamento.
- `personagem/camera.tsx` continua a única dona da câmera. O perfil `luneta` tem 45 graus de
  campo de visão e enquadramento adaptado ao aspecto da tela (`mundo/luneta-medidas.ts`).
  Guarda e restaura a pose anterior, suspende giro/zoom manual durante a observação e não
  altera o rastro. Movimento reduzido elimina a animação do zoom e dos sinais de vida.
- `interface/luneta.tsx` substitui o HUD durante a observação, com fala persistente, botão
  Voltar focado e Esc do HUD. Vulto e brilho só montam nessa vista. Não chamar o carregador
  de ilhas completas a partir da câmera da luneta.
- `mundo/placa-da-ponte.tsx` recebe a última tábua visível de cada ponte fechada. Usa a face
  `texto` do GLB, UV projetado e CanvasTexture próprios. Desmontar libera apenas os recursos
  criados, preservando a arte compartilhada. O interativo lê o mesmo recado da face.
- Números e comportamento em `docs/arquipelago-regras.md`, seção Luneta. Testes:
  `tests/luneta.test.ts` e `playground/verificar-luneta-browser.ts` (modelo dos mecanismos).
  Este último aceita `ARQUIPELAGO_CHROMIUM`; tenta o Chromium Linux fornecido se existir,
  senão usa Chrome. No Windows, também pode compilar com `bun build` para Node e executar
  com `node`, como registrado no plano. A conferência usa somente a plataforma falsa.

## Minijogos aprovados (desafios-16, 29/10/2026)

Fliperama chega ao ler o primeiro minijogo aprovado, pela regra ganharProjetos. Loja transitória estado/minijogos.ts relê ao voltar de ferramenta. Lista no painel do objeto; player pertence à plataforma. Capa na face tela, recursos próprios descartados.

Plano e testes: docs/plans/2026-10-29-arquipelago-minijogos.md.

L05 também lista as publicações recentes do próprio perfil no Mural, por `servico.buscar('/mural')`.
`estado/mural.ts` só guarda a listagem transitória, sem fonte, moeda ou alteração de salvamento.
O pedido `estudio` / `jogo-do-mural` contém `MoldeDoJogoDoMuralSchema` (apenas `playId` UUID).
A plataforma abre o player público por cima do jogo, que fica pausado. A publicação é revalidada
na abertura; sair remove o player e relê a lista. Fonte, moderação e distribuição ficam na
plataforma, nunca no jogo. Plano: `docs/superpowers/plans/2026-10-29-arquipelago-fliperama-mural.md`.

## Festas da estação na Vila (fase2-10, 29/10/2026)

`sistemas/festas.ts` concentra o calendário puro pelo dia de São Paulo. Carnaval vai do sábado à
terça (Páscoa menos 47 dias, aprovado em 29/10/2026); Junina ocupa junho. Fim de ano tem proposta desativada de 20/12 a 06/01;
Lanternas não tem data. As duas decisões pertencem à dona. Não ativar por inferência.
`estado/festas.ts` relê a data a cada 30 segundos e ao voltar à aba. O override de QA
fica em WeakMap da plataforma falsa, registrado só pelo playground, nunca pela URL de produção.

`mundo/festa-na-vila.tsx` monta apenas durante a festa. Os GLBs de festas são catálogos:
`catalogo-da-festa.ts` copia nós individuais e emenda varais pelos vazios, preservando os
alvos dos clipes. Carregamento privado com aborto, materiais emissivos próprios e descarte
de mixers/geometrias/materiais ao sair. Não descartar recursos de um cache compartilhado.
`arranjo-da-festa.ts` guarda posições e colisores, conferidos contra o GLB real da Vila.
Luzes acompanham a noite; animações respeitam pausa e movimento reduzido.

A fogueira abre `ListaDeReceitas` via E ou Usar, só na Junina. A receita usa um milho e
gera `pipoca-de-festa`, com fome +15 e diversão +30 ao comer. Abrir e cozinhar revalidam
o calendário. Painel fecha ao sair/terminar. O aviso é local por perfil, festa e ano;
não acrescentar festa ao salvamento, não criar necessidade nova e não expirar a pipoca.

Testes: `tests/festas.test.ts` e `playground/verificar-festa-browser.ts`. O browser usa
plataforma falsa, verifica os fluxos em 1280 e 390 pixels e aceita `ARQUIPELAGO_CHROMIUM`.
Relatório, prints e decisões pendentes em `docs/qa/2026-10-29-primeira-festa-da-estacao.md`.

## Rede do barco (fase3-04 ampliada, L10)

- `sistemas/rede-do-barco.ts` deriva seis ligações de vizinhança dos ângulos das ilhas e mantém
  central a Recife. `ligacaoAberta` exige Recife, origem e destino abertos pela jornada.
- `scripts/gerar-portos.ts` extrai as sete âncoras para `mundo/portos-da-arte.json`. Build e
  playground conferem o arquivo; os testes comparam a fonte determinística aos GLBs reais.
  Não editar coordenadas à mão. O navegador não baixa ilhas para ler âncoras. Nas Nuvens,
  a transformação soma `ALTURA_DAS_NUVENS`, deixando o barco em y=0 e o cais em y=0,89.
- `useIlhaCompleta` publica a proteção do chão na prioridade -2, antes da física a -1,
  incluindo a primeira transição para carregando. Publica/remove `movimento.caisProntos`
  pelos colisores e opacidade de 0,99. Não atribuir esse sinal só ao Recife.
- `mundo/barcos.tsx` tem um viajante e monta barcos atracados só a menos de 43 m, com chão
  pronto. Mantém o teto de uma ilha completa na memória. Cache de curvas pertence à montagem.
  `movimento.embarcarPara` revalida painel, visita, pausa, jornada, modo, chão, alcance e altura.
- `interface/barco.tsx` oferece destinos por E ou Usar, foco inicial, ciclo de Tab e Escape.
  Fechar não embarca. O painel usa as classes do jogo nas duas comunidades e no celular.
- Arco externo de 150 m. Cinco portos novos usam 25 m pela proa; central usa setor 110 e
  Recife usa setor -70, fora das áreas de mergulho. Velocidade 12 m/s e 2 m/s perto do cais.
  Manobra começa a 25 m e termina antes dos últimos 10 m. Giro é interpolado entre amostras;
  a mistura não extrapola e a meia volta tem lado definido. Não escolher o cais de chegada
  para alinhar a saída. Pausa congela a viagem e a animação. O mixer permanece na prioridade -0,5.
- A travessia conhece origem/destino e os dois sinais de prontidão. Espera a 29 m do centro,
  dentro da ativação de 30 m. Após 20 s sem destino, retorna à origem. Se o retorno também
  não carregar, permanece segura no barco, sem alternar destinos nem largar o corpo na água.
- As boias retiram só os corredores das ligações abertas, de 5 m de meia largura. A correnteza
  de quem nada não muda. Nenhuma versão nova de save, prêmio ou visita automática.
- `playground/verificar-rede-barco-browser.ts` é o operador atual. O nome antigo do verificador
  do barco delega a ele. `?barco=central|bosque|vila-doce|recife|pico|vale-dos-dinos|nuvens` começa
  no cais; `posicao=8` abre a rede inteira. Use uma pasta nova em `ARQUIPELAGO_PRINTS`.
  Plano e provas: `docs/superpowers/plans/2026-10-30-arquipelago-rede-do-barco.md` e
  `docs/qa/2026-10-30-rede-barco/README.md`. Nenhum GLB ou gerador de arte alterado.

## Mergulho do Recife (fase3-02, 29/10/2026)

- Regra pura em `sistemas/modos/mergulho.ts`, sobre o contrato dos modos. O sensor registrado em
  `movimento.mergulhos` delimita a água. O mesmo controlador livre do cipó resolve colisões;
  sem degrau automático, snap ou corpo novo. Passo fixo 1/60 s, corrente somada, pausa sem avanço.
- `sistemas/mergulho.ts` centraliza alcance, velocidades, corrente e posições dos modelos.
  Entrada pela âncora `mergulho`, Espaço/Q ou Subir/Descer, gamepad inferior/esquerdo.
  Não há fôlego nem punição. Sair pela superfície volta ao nado. Câmera baixa até 3 m, sem
  grua automática; menos movimento congela os mixers de balanço.
- `mundo/mergulho-do-recife.tsx` é filho do Recife. Carga privada dos GLBs existentes do navio,
  labirinto, baú e página, com descarte de carga parcial/tardia e uncache dos mixers. Não usar
  `buscarIlha` para cada peça. Colisores da arte, ativação só depois de todos estarem montados.
- O Recife retém o cenário a 55 m e o ativa a 51 m para cobrir a exploração submersa de raio
  48 m. Boias a 52,6 m. Posições locais: navio (18,0,-30), labirinto (-1,0,27). Não deslocar o
  piso global de -3,5 m. Os testes usam a cápsula real e os col-* dos arquivos reais.
- V11 acrescenta `recife: { bau, pagina, tesouro }`. Recompensa pura/idempotente em
  `achados-do-recife.ts`, +15 diversão no baú e no tesouro; página abre diário. Não criar moedas
  locais. Entrada grava um ponto seguro; `relogios.tsx` não salva posição temporária no mergulho.
- Testes: `mergulho.test.ts`, `mergulho-colisores.test.ts`, migração V11 no contrato e HTTP no
  serviço. `playground/verificar-mergulho-browser.ts` usa SwiftShader e controles reais do jogo
  com gamepad emulado, em computador e celular emulado. `ARQUIPELAGO_CHROMIUM` escolhe o Chrome.
  Evidências, comandos e limites em `docs/qa/2026-10-29-mergulho/README.md`.

### Visão nos corredores estreitos

Quando a colisão aproxima a câmera a menos de 1,4 m do centro do corpo no mergulho, só o desenho
do avatar fica oculto, para não mostrar seu interior. Ele reaparece a partir de 1,65 m. Essa
folga evita piscar na borda. A cápsula, a posição, as animações e os comandos não mudam.
A escolha da ilha completa é única nas áreas de carga sobrepostas; durante o mergulho, o Recife
mantém a prioridade até a saída, mesmo que a pessoa se aproxime da área de outra ilha.

## Pegadas, escavação e ninhos do Vale (fase4-02, 29/10/2026)

`DescobertasDoVale` só monta com `ValeVivo`. Regras puras em `sistemas/vale.ts`; progresso
na V12 (`vale`) e coleção em `diario.ts`. Escavar tem três ações, sem prazo; cuidar é observar
os ovos e se afastar, sem tocar nem mover a arte. A Jade reconhece os três ninhos.

`exploracao-do-vale.ts` usa as âncoras locais, normaliza os colisores preparados girados e
inclui o Quadro das Cores com as mesmas medidas de `lugar-do-quadro.ts`. Não usar diretamente
os colisores girados contra âncoras locais. A busca `acharCaminho` aceita conferência contínua
opcional dos segmentos; o Bosque mantém o padrão anterior. Uma malha instanciada desenha
as pegadas de três dedos. O osso vem do nó separado do GLB de props e não colide, por ser
miúdo no chão. Não gerar modelos ou transformar cenário unido em objetos independentes.

Pausa, visita e somente leitura bloqueiam as ações. Movimento reduzido não perde nenhuma
etapa, pois não há animação nova. União de conquistas em `conciliar-salvamento.ts`, sem
somar inventário. Testes leem os GLBs, caminham na grade e conferem o caminho com a ilha
girada e o cavalete. `playground/verificar-vale-browser.ts` confere computador e toque.
Regras e números em `docs/arquipelago-regras.md`, seção da fase4-02. Filhote e museu ficam fora.

## Nuvens e Iriê (fase4-06, 29/10/2026)

- `nuvens.glb` entra em `ILHAS_COMPLETAS`; `NuvensVivo` entra em `ILHAS_VIVAS`.
  A altura compartilhada `ALTURA_DAS_NUVENS = 7` também determina o final da ponte.
  `RAIO_VISITAVEL_DAS_NUVENS = 19.2` cobre vértices até 18,7404 m e o raio do corpo.
- `sistemas/irie.ts`, `mundo/nuvens.ts` e `mundo/irie.tsx`: apresentação no morador genérico,
  âncora morador voltada a chegada, meio com y 7. Raio 0,39, altura 1,49, olhos 1,19.
  Sem amizade, recompensas ou campos novos no salvamento.
- `sistemas/plataformas-das-nuvens.ts`: ciclo puro de 20 s, elevação 2,4 m, viagens de 6 s
  com suavização cúbica e paradas de 4 s. Vizinhas alternam a fase. Pausa não avança.
- `mundo/plataformas-das-nuvens.tsx` prepara os quatro pares desenho/âncora/tampo antes da troca.
  Os quatro tampos saem da lista fixa e viram corpos cinemáticos `plataformaDoMundo`.
  O controlador existente leva quem está em cima. Não mover personagem por teleporte.
  O desenho lê a posição interpolada depois da física, antes da câmera e do medidor.
  As malhas continuam pertencendo à ilha para o descarte compartilhado, sem clones de recursos.
- O medidor expõe `plataformasDasNuvens`; sua leitura de corpo sob demanda só existe quando
  `arquipelago:medir` está ligado. Nenhuma leitura pesada foi acrescentada ao laço normal.
- Testes: `nuvens.test.ts`, `plataformas-das-nuvens.test.ts`, `colisores-das-nuvens.test.ts`.
  `playground/verificar-nuvens-browser.ts` aceita ARQUIPELAGO_CHROMIUM e ARQUIPELAGO_PRINTS.
  Relatório e limites em `docs/qa/2026-10-29-nuvens/README.md`. Nenhum Blender nesta fase.

## Corais, aquário e mapa do Recife (fase3-03, 29/10/2026)

- Regras puras: `sistemas/corais-do-recife.ts` (`PONTOS_DOS_CORAIS`, os quatro tipos com o nó
  vivo, o desbotado e a âncora `coral-muda-N` do `recife.glb`; `CORAIS`, `replantarCoral`, `coraisReplantados`, as falas, `PEIXES_DO_AQUARIO`,
  `peixesVisiveis` e `aquarioNoPainel`) e `sistemas/mapa.ts` (`ilhasNoMapa`, `abertasNoMapa`,
  `PAINEL_DO_MAPA`). Salvamento V13 (`recife.corais`, bits).
- No mundo: `mundo/corais-do-recife.tsx` (carga privada do `recife-props.glb`, como o mergulho;
  os lugares saem das âncoras `coral-muda-N` (`lugaresDasMudas`); cada coral é uma cópia do nó
  desbotado ou do vivo, a muda crescendo em `useFrame` com a pausa e o menos movimento) e `mundo/mesa-de-mapas.tsx` (o interativo na âncora `mapa`), os dois montados
  pelo `RecifeVivo` e valendo só com a ilha a 0,99 de opacidade. O aquário: `PeixesDoAquario` em
  `mundo/objetos-da-casa.tsx` (os peixes pelo salvamento, os quatro na visita, e o `nadar`).
- Interface: `interface/aquario.tsx` (no `PainelDoObjeto`) e `interface/mapa.tsx` (`PainelDoMapa`,
  no HUD). O que abre uma ilha fechada vem da voz (`ilhaFechadaNoMapa`), porque fala da jornada.
- O aquário chega em `ganharProjetos` com o primeiro coral. Regras e textos:
  `docs/arquipelago-regras.md`, seção da fase3-03. Testes: `tests/corais-do-recife.test.ts`;
  navegador: `playground/verificar-recife-browser.ts`. Os pedidos de arte (as âncoras e os corais
  desbotados de verdade) foram feitos na conferência; o plano é
  `docs/plans/2026-10-29-arquipelago-recife-corais-aquario-mapa.md`.

## Aparências autorais no mundo (29/10/2026)

`mundo/carregar-aparencia.ts` lê `plataforma.lerAparencia?`, valida bytes pelo contrato e mantém
recursos privados de cada objeto. Molda encaixa na caixa sem inverter +z; Pinta recorta
`planificacaoDoMolde` nas faces preparadas. Nunca transformar malha autoral em colisor.
A reserva permanece durante leitura, falha, excesso ou página antiga. Mudança de id, retorno da
oficina (inclusive mesmo id), visita e desmontagem cancelam e liberam recursos, inclusive tardios.
Não usar `useGLTF` para estas criações nem descartar geometrias/texturas do catálogo na pintura.
Visitas não leem criação alheia. As faces do Pinta (29/10/2026) estão na geladeira, no forno, no aquário, no museu,
na casinha e no vaso da planta (a lareira e a banda, de propósito, não), conferidas contra o
catálogo por `tests/faces-dos-objetos.test.ts`. A galeria de mentira guarda as compras à parte do
salvamento (`CHAVE_DA_GALERIA`, que o `?novo=1` apaga), como o serviço. A capa do fliperama prevalece na tela; a animação do aquário do
catálogo continua quando esse modelo aparece. Testes: `aparencias.test.ts`; verificador:
`playground/verificar-aparencias-browser.ts`. Plano e pedidos de faces de arte:
`docs/plans/2026-10-29-arquipelago-molda-no-mundo.md`. Regras e tetos em §6.16.

## O filhote do Vale e o museu (fase4-03, 29/10/2026)

Plano: `docs/plans/2026-10-29-arquipelago-filhote-e-museu.md`; regras e textos em
`docs/arquipelago-regras.md` (seção da fase4-03).

- **Salvamento V15** (`vale.filhote`): regras puras em `sistemas/filhote-do-vale.ts` (aquecer,
  nome, comida, carinho, o dia cuidado, o tamanho, o passeio e `juntarFilhotes`, usado pela
  `conciliar-salvamento.ts`). A Jade entrega o ovo na conversa (`sistemas/jade.ts`), uma vez, com os
  três ninhos cuidados.
- **No mundo**: `mundo/filhote-do-vale.tsx` (`FilhoteDoVale`, montado pelo `ValeVivo` na sua própria
  `ComReserva`): o chão quente na âncora `pe-do-vulcao` (o `ovo-dino` do GLB de props com 0,47 m e
  um círculo amarelo, para não sumir na lava) e, depois que choca, o filhote (`triceratops-filhote.glb`, `andar`, `parado`,
  `pular`) passeando por `PASSEIO_DO_FILHOTE` (pontos no referencial do GLB, conferidos no teste,
  também a reta entre eles). Nada colide. Pausa, visita, somente leitura e a troca da ilha (0,99)
  bloqueiam as ações.
- **Painel**: `interface/filhote.tsx` (`PAINEL_DO_FILHOTE`, loja `estado/filhote.ts` com a fala e o
  pulinho), primeiro o nome, depois "Dar comida" e "Fazer carinho" com o que já foi feito hoje.
- **Museu**: chega em `ganharProjetos` com `vale.escavacao === 3`; o painel do objeto mostra a
  coleção do Vale (`interface/museu.tsx`, `colecaoDoVale`, que ganhou o filhote; os ícones são
  `ICONE_DO_VALE` de `interface/diario.tsx`).
- Testes: `tests/filhote-do-vale.test.ts`; navegador: `playground/verificar-filhote-browser.ts`
  (semeia o salvamento no `localStorage` do playground, um contexto limpo por começo).

## A montaria do Vale (fase4-04, 29/10/2026)

Plano: `docs/plans/2026-10-29-arquipelago-montaria.md`; regras em `docs/arquipelago-regras.md`.

- Regras em `sistemas/montaria.ts`; modo `montar` em `sistemas/modos/montar.ts` (em `MODOS`), que
  entra pelo pedido `montar` e sai pelo E / Usar. ⚠️ `mudarModo` solta a sela em qualquer troca de
  modo (o dino fica onde estava): não limpar `c.montaria` à mão.
- `personagem.tsx`: montada, o controlador usa a cápsula de montada (`MONTARIA.raio`, pé no mesmo
  lugar, `GRUPO_DE_NINGUEM` de `mundo/grupos.ts`), o desenho sobe `MONTARIA.subidaDoDesenho` no
  clipe Sentar e `velPedida` fica a do dino. `aceitaColisorDoMundo` ignora os colisores do próprio
  corpo.
- `mundo/montaria-do-vale.tsx` (no `ValeVivo`, com a sua `ComReserva`): `movimento.montaria`, o
  interativo, o desenho e o colisor do dino parado (`col-montaria`, só para o corpo, volta quando a
  criança sai de cima, `longeParaVoltar`).
- Testes: `tests/montaria.test.ts` (regras, modo e o lugar no GLB); navegador:
  `playground/verificar-montaria-browser.ts`.

## Balão das Nuvens (fase4-09, 29/10/2026)

- Regras puras em `sistemas/balao.ts` (`BALAO`, `Voo`, `passoDoBalao`); modo `balao` em
  `sistemas/modos/balao.ts`, guiado (`direto`) como o barco: o voo começa de onde a física deixou o
  corpo, e o corpo parado mais alto que o pedido é pouso. Pousado, o cesto pressiona o apoio
  (`BALAO.pressao`) para soltar sozinho se o apoio sair (plataforma descendo).
- `mundo/balao-das-nuvens.tsx` (montado pelo `NuvensVivo`): `nuvens-balao.glb` em carga privada
  (sai com a ilha), `AnimationMixer` próprio do `flutuar`, `Voo` em `movimento.balao`, interativo
  "Subir no balão", caixa do cesto parado com `userData.balao` (o personagem ignora no modo
  `balao`) e `voo.visual` (o nó animado) para desenhar a criança no cesto, na prioridade −0,5.
- "Descer do balão" não é interativo do mundo: o personagem põe `DESCER_DO_BALAO` no alvo quando o
  cesto está pousado, e o "usar" é gasto pelo modo. Saída perto do lugar: `voo.saida` vira
  `pedidos.teleporte` no desenho.
- Perfil de câmera `balao`; o toque troca "Pular" por "Subir"; a posição não é gravada no voo; o
  Construir some no balão. O medidor expõe `balao`.
- Testes: `balao.test.ts` (regras e modo), `balao-das-nuvens.test.ts` (lugar livre, alcance a pé e
  saída contra os colisores). Verificador: `playground/verificar-balao-browser.ts`. Pedidos de arte
  no plano `docs/plans/2026-10-29-arquipelago-balao.md` (feitos: a âncora `balao` foi para perto do
  poste, em (5,6; 6,0), e o cesto ganhou a âncora `passageiro`). No voo, a criança é desenhada na
  âncora `passageiro` (o piso do cesto, que sobe e balança com o clipe), não na base do nó `balao`.


## Final no alto do Farol (fase4-11, 29/10/2026)

- `sistemas/final-do-farol.ts`: acesso na Lenda, pausas, quatro trechos da página, seis fachos e apresentação da Íris. `estado/farol.ts` isola a animação por montagem com WeakMap; a página e a conclusão ficam em `salvamento.farol` (V16). Não inferir conclusão apenas de jornada 8.
- `mundo/final-do-farol.tsx`, montado pelo Farol: carregamento privado com AbortController, descarte ao sair, sala a y 40, âncoras lidas no referencial local mesmo depois de montar a cena. `mundo/alto-do-farol.ts` concentra medidas, âncoras e alvos do anel. Os colisores vêm do arquivo: `prepararSala` lê os `col-*` (piso, 16 caixas da parede, grade do vão da escada, mesa com estante, lente) e tira esses nós da cena, uma vez, logo depois de carregar. A chegada é a âncora `chegada` (fora da grade e da lente), a leitura é `leitura` e a câmera da vista parte de `camera-varanda`. A porta do farol de fora é o nó `porta` do `farol.glb` (pivô na dobradiça): `mundo/farol.tsx` abre para fora quando a criança chega a 3 m de `PORTA_DO_FINAL` e o Farol já pode ser subido (sem animação com menos movimento). Não usar o carregador de ilhas completas para o interior.
- A câmera existente continua a única dona da vista. O perfil `farol` usa 65 graus, com panorama adaptado ao aspecto. Ao sair, restaura a pose anterior. Na sequência, sala, avatar e Zappy 3D ficam ocultos; a fala do Zappy permanece no painel. O céu retira a névoa apenas nessa vista. Não carregar ilhas completas por causa da câmera. O facho de exploração fica oculto durante os seis fachos do final e respeita pausa e menos movimento fora dele.
- `interface/farol.tsx` usa o estilo dos painéis de moradores. Não dar foco automático ao botão da sala: isso captura WASD. A leitura recebe foco. Esc e Descer usam a mesma saída. Os relógios não guardam a posição do interior nem iniciam cochilo nele, mas o limite de tempo da plataforma continua valendo.
- `paginasDoDiario(s)` lê `salvamento.farol.pagina`, inclusive depois de reabrir. A Íris só monta após a sequência e usa `MoradorDaIlha`, sem amizade. A porta fechada passa por `VozDoJogo`, inclusive para adultos.
- Testes em `tests/final-do-farol.test.ts`; conferência em `playground/verificar-final-farol-browser.ts`, com SwiftShader, computador e celular emulado. Plano com pedidos de arte e campo futuro em `docs/plans/2026-10-29-arquipelago-final-do-farol.md`. Prints em `docs/qa/2026-10-29-final-farol/`.

O minijogo do Vale (fase4-05) está em `docs/desafios-do-jogo/vale`, com provas no executor e roundtrip Blockly. É só o pacote de desafios; esta entrega não importa nem publica no Admin e não altera o Vale vivo.

## Saltos, corrida de balão e constelações das Nuvens (fase4-07, 29/10/2026)

- **Percursos duráveis (V16).** `nuvens-saltos` e `nuvens-balao` estão em `PERCURSOS`.
  `terminarCorrida` grava os cinco percursos em `salvamento.percursos`; álbum e família leem o
  mesmo catálogo. As versões até V15 continuam com os três IDs históricos. Cada corrida só
  avança a própria instância (`loja.corrida.percurso`).
- **Saltos:** `mundo/saltos-das-nuvens.ts` lê os tampos dos colisores (`col-cil-degrau-nuvem-3`,
  `col-cil-plataforma-N`). ⚠️ Os colisores da ilha preparada vêm girados com ela:
  `tamposDosSaltos(colisores, giro)` desfaz o giro antes do `percursoNoMundo`. A volta de queda
  numa plataforma lê `PlataformaDasNuvens.elevacao`, escrita a cada passo da física.
- **Corrida de balão:** regra pura em `sistemas/corrida-de-balao.ts` (`ARGOLAS`,
  `LUGARES_DAS_ARGOLAS`, `passouPelaArgola`, `passoDaCorridaDeBalao`); desenho em
  `mundo/corrida-de-balao.tsx`: a argola de nuvem do `nuvens-argola.glb` (`arte/ilhas-b/argola_nuvem.py`,
  carga privada como o balão; nós `nuvem`, igual nas seis, e `faixa`, com o material de cada argola nas
  cores dos `fio1` a `fio6`, que acende na próxima). Enquanto carrega, ou sem o arquivo, ficam os toros
  lisos. Os tufos ficam por fora da faixa: o vão livre é o mesmo de antes. O tempo-alvo
  vem do piloto do teste, que voa pelas regras de `sistemas/balao.ts`.
- **Constelações:** regra pura em `sistemas/constelacoes.ts`; mirante em
  `mundo/constelacoes-das-nuvens.tsx` (carga privada do `nuvens-constelacoes.glb`, colisores por
  `ColisoresSoltos`, lugar na constante `MIRANTE_DAS_NUVENS` até a âncora pedida). A vista escreve
  `movimento.mira` (`mundo/vista-da-luneta.ts`), que a câmera usa no perfil `luneta`; o visor é
  `interface/estrelas.tsx` (classes `arq-mirante-*`; ⚠️ `arq-estrelas` é a lista da tela de
  resultado). O painel aberto conta como pausa no `jogoPausado`: o acender das estrelas desconta
  só o próprio painel. As estrelas não usam a neblina da cena (`fog = false`). A mira aponta para
  o centro das estrelas da figura (`meioDasEstrelas`): o pivô do nó fica fora do desenho.
- Testes: `saltos-das-nuvens.test.ts`, `corrida-de-balao.test.ts`, `constelacoes.test.ts`.
  Verificador: `playground/verificar-nuvens-aventura-browser.ts` (`ARQUIPELAGO_PARTE=noite` roda
  só as constelações; cada parte abre um contexto novo do navegador). O medidor expõe `corrida`,
  `mira` e `constelacoes`, e `__arquipelagoLerCorpo` devolve o olho da vista.

## Clima da sua ilha (fase4-08, 29/10/2026)

- Regra pura em `sistemas/clima.ts` (`CLIMA`, `pedeAgua`, `regarComSede`, `chuvaNaHorta`). O
  bônus mexe só no `regadoEm` (vai para trás): nenhum campo novo. `climaLiberado` = Nuvens abertas.
- A escolha mora em `salvamento.clima` (V16), escrita por `escolherClima` e no menu (`interface/clima.tsx`). O
  relógio do HUD mostra o símbolo. A Iriê tem a terceira fala (o verificador da fase4-06 avança por
  ela).
- `mundo/clima-da-ilha.tsx` (montado na cena): escreve `ambiente.luzDoClima` e
  `ambiente.cinzaDoClima` (opcionais; o `Ceu` multiplica o sol e o preenchimento e puxa o céu para
  `CEU_FECHADO`), desenha as gotas (`LineSegments` que seguem a criança, nome `chuva-da-ilha`) e a
  cada 1 s de jogo chama `chuvaNaHorta`. A horta (`mundo/horta.tsx`) usa `climaDaHorta` para o
  "Regar" da janela, a gota azul (`gota-da-sede`) e o bônus.
- O medidor expõe `clima` e `horta` (semente, regado, progresso). Testes: `clima.test.ts`.
  Verificador: `playground/verificar-clima-browser.ts` (espera o relógio de verdade: a alface pede
  aos 54 s) e, no fim, usa o cata-vento.
- O cata-vento da horta (`mundo/cata-vento.tsx`, `cata-vento.glb` de `arte/mundo/cata_vento.py`,
  lugar em `CATA_VENTO` de `medidas.ts`): a hélice (nó `helice`) gira em volta do z do modelo com
  `GIRO_DO_CATA_VENTO[clima]` (um quarto com menos movimento; parada na pausa; numa visita, o giro
  do sol). Com as Nuvens abertas e fora de visita, "Mudar o clima" chama `proximoClima` e
  `escolherClima` e diz a `FALA_DO_CLIMA`. O poste colide (`col-cil-poste-cata-vento-1`, conferido
  em `colisao-da-ilha-central.test.ts`).

## Minijogo "Jardim que floresce" (fase4-10, 29/10/2026)

- Fora do pacote do jogo: `docs/desafios-do-jogo/nuvens/` (fontes, manifesto, README, conferência
  visual), com as provas em `arquipelago-contracts/tests/manifesto-das-nuvens.test.ts`,
  `studio/src/blockly/__tests__/nuvensManifest.test.ts`, `arquipelago-api` (manifestos) e
  `studio-runtime/tests/nuvens-browser.test.ts` (executor real, com `SZ_CHECK_CHROMIUM`).
- "A cada N segundos" (`g2d:everySeconds`) tem de ser bloco raiz do projeto, ao lado do laço; o
  executor recusa `checkpoints: []` (ausente ou com pontos) e espera de mais de 10 s num passo.

## Continuidade do progresso (L01, V16, 29/10/2026)

A loja deriva constelações, clima, recordes e final do salvamento. `mudar` protege visitas,
suporte e conflitos. `nuvens.constelacoes` usa bits 0 a 5. `farol.pagina` só nasce ao concluir
os trechos; `farol.concluido` só ao terminar os fachos e exige a página. A animação e a posição
no interior não são persistidas. Na conciliação, descobertas usam união, estrelas usam união
e o melhor tempo usa mínimo; escolhas simultâneas de clima diferentes pedem resolução.

A V16 preserva referências de aparência de até 80 caracteres aceitas nas versões antigas,
sem passar pelo filtro histórico V15. O teto global continua 65.536 bytes UTF-8. Documento
acima do teto é recusado, sem truncar nem apagar a cópia local. O editor Lumi aceita essas
referências na geladeira, mantendo o formato da ferramenta V1.

## Amizade no anel e páginas do diário (L02/L06, V17)

`sistemas/moradores-do-anel.ts` concentra gostos, aniversários, pedidos e falas de Maré, Floco,
Jade e Iriê. `amizade-do-anel.ts` usa as mesmas contas de Capi e Bento: conversa 10, pedido 30,
presente preferido 20 ou comum 8, um por dia, dobro no aniversário e teto 500. Nenhuma ausência
tira amizade. `MoradorDaIlha` compõe a atividade antiga e a relação na mesma alteração: planador
do Floco e ovo da Jade não são substituídos nem duplicados.

O painel comum recusa ações em visita, suporte, conflito, pausa de tempo e sincronização. As
páginas do Pico, Vale e Nuvens abrem com dois corações (200), derivadas da amizade salva. A
fala de entrega fica no fim da conversa no cruzamento desse limite. Recife conserva a página
do navio. Íris conserva a apresentação do final, sem uma amizade inventada.

V17 acrescenta os quatro moradores sem modificar V16. `tests/amizade-do-anel.test.ts` prova
idempotência, consumo, aniversário, páginas e composição das atividades. O verificador
`playground/verificar-amizade-browser.ts` conversa, presenteia, entrega, reabre e lê o diário
pelos controles reais, com plataforma local. Não é prova de desempenho em aparelho físico.

## Galeria canônica no Members (L04, 30/10/2026)

O cartão informa os destinos reais da posse. Aquário, fliperama e planta também
valem no Meu quarto, com representação própria; os outros seis só têm arte no jogo.
O cliente continua lendo `/galeria`, sem inventário autoritativo no save. Comprar
no quarto não concede o projeto azul funcional. A plataforma falsa segue a mesma
idempotência por item, mesmo quando uma chave do navegador é reutilizada.
O verificador da feira aceita `ARQUIPELAGO_GALERIA_COMPARTILHADA=1` para a fixture
local da planta, cujo projeto já existe nesse cenário. Essa prova visual não substitui o banco real nem o fluxo autenticado.


## Primeiro pedido da ilha central (L02/L03)

`primeiro-pedido.ts` deriva o próximo gesto da porta, da horta e da posse da geladeira.
`colherNaIlha` aplica a colheita manual inteira, com o mesmo bônus do contrato, e
concede o projeto apenas se ele ainda não existe. O mundo chama essa regra pura;
HUD e Diário só explicam. Visita, suporte e pausa continuam guardados na loja.
Não há alteração do save V18, migração, saldo ou régua de cursos. A prova de navegador
usa gestos reais e adianta somente o relógio do navegador depois de regar.
