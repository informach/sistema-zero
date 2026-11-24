# Lote 8.4 — Jogo 3D Avançado

19/11/2026 · `staging` · **implementado, testado e revisado localmente**. Pro autoral e o fechamento integrado de 8.4 permanecem pendentes. Implantação e conta real ficam no encerramento global.

## Implementação

O Avançado consome a cena completa do Molda na sua própria Scene pelo SDK compartilhado. Os comandos `loadScene(id)` e `sceneStart(objeto)` acompanham os blocos, paleta, IR, codecs, parser, geração, referência de objetos e documentação da versão 0.24.0. O carregamento pertence a Ao iniciar; o ID é estável, sem achatar o cenário em um GLB.

O primeiro preparo participa da espera inicial do motor. Trocas preservam a base vigente até o sucesso, e pedidos cancelados ou de uma partida encerrada não montam resultados atrasados. Chegadas durante preparo aguardam a nova base; `place` posterior cancela a chegada. Reciclagem e reconstrução da fábrica não ressuscitam handles mortos. Uma nova fábrica sem cenário restaura chão e luzes padrão visíveis.

O kernel existente continua responsável por moldes, pool/geração, FSM, física, varredura dos sólidos autorais, sensores, caronas e animações. Ele empresta consultas de cápsula vertical e raios do cenário, sem criar outro controlador, câmera, renderer ou RAF. O piso analítico não cobre recortes. Corpos pequenos/rápidos subdividem o movimento com limite explícito; fantasmas preservam sua semântica. A câmera de acompanhamento usa oclusão física, enquanto mouse e apoio consultam a superfície real. Esta integração não acrescenta nado nem simulação rígida exata de formas arbitrárias.

## Correções comprovadas durante o desenvolvimento

- O resolvedor canônico corrigia triângulos vizinhos sequencialmente: a diagonal interna de um teto podia produzir impulso lateral. A correção mede as restrições na mesma pose e aplica a penetração mais profunda por iteração. O teste vermelho foi preservado como regressão; a borda externa real continua colidindo.
- A requalificação do Canvas reproduziu deriva de aproximadamente 69 cm em cinco segundos de repouso sobre um plano inclinado real. O Physics Lite agora apoia os pés do personagem por nove raios nos triângulos emprestados, conservando atrito, cápsula contra obstáculos, salto e queda em recortes. Corpos dinâmicos e quique mantêm a resposta própria. Os 24 testes de física/integração passaram. A prova de navegador parte de z=5, aproxima-se da caixa em z=9, exige bloqueio em z=8,75 e percorre o trecho livre no retorno; antes, o roteiro supunha incorretamente que já havia chegado à caixa após 1,4 s.
- Projetar entrada horizontal contra uma inclinação podia gerar velocidade vertical positiva em um corpo sem quique, alternando o apoio e recusando o salto no quadro seguinte. A integração nativa conserva o apoio de quem chegou descendo e não quica. Salto deliberado, lançamento vertical e corpos com quique continuam testados. Sólidos autorais mantêm sua resposta existente.
- O descarte final libera cenário, caches, clones/esqueletos, materiais, texturas e targets antes de encerrar o renderer. Os contadores GL zeram por liberação efetiva, sem atribuições artificiais.
- Na reconstrução com carga demorada, passar `dt=0` à câmera ainda executava a interpolação de acompanhamento: ela abandonava o território distante e seguia o objeto ainda na origem. Um teste controlado a mais de 2 km reproduziu a falha. Câmera e foco dos setores agora conservam o enquadramento anterior até a chegada; a troca comum durante a partida continua ativa. Os 17 testes de integração e o verificador semântico do runtime passaram juntos após a correção.
- A própria prova inicialmente encaixava o modelo em um envelope estreito, reduzindo sua altura para aproximadamente 0,78 m. O envelope foi corrigido e a prova agora exige **1,16 m de altura real**. A câmera da prova também foi ajustada para mostrar o corpo inteiro, sem ficar atrás do bloco de teste sobre a ponte. Isso não altera os padrões da ferramenta ou do jogo.
- O exemplo público **Herói do Molda** agora demonstra os dois comandos em uma cena autoral compilada pelo pipeline real. O gerador determinístico e seu `--check` preservam o ID e os três recursos próprios; nenhum arquivo pago foi incorporado ao exemplo. O teste joga até a vitória com a base nativa ativa e animações reais.

## Carregamento do Studio

O orçamento expôs uma dependência desnecessária: a lista inicial importava o módulo de persistência que também reúne gravação e recuperação. As leituras de resumos, dados de capa, eventos/espelho e consulta leve de recuperação foram separadas em módulos focados. A API anterior continua reexportada; formatos, escopos, CAS, cópias preservadas e notificações não mudam.

O manual do Avançado e o do Mundo 3D passam pelo provider de documentação já existente. O catálogo contém resumos; os textos completos continuam disponíveis sob demanda e suas auditorias de vocabulário/paleta verificam o texto integral. A IA do Avançado também usa o provider existente, conservando o contexto completo e um resumo operacional. Não houve aumento dos limites do orçamento inicial ou dos modos.

## Evidências já obtidas

- Avançado + Mundo + contratos centrais: **984 testes, 34.254 asserções, 58 arquivos**, sem falha na rodada registrada; após essa rodada foram acrescentadas as asserções do lançamento vertical e a formatação final, que ainda requerem a conferência final do recorte.
- Rodada final após sincronização: Avançado, documentação do Mundo, leituras/recuperação, lista e índice de exemplos, **620 testes, 7.221 asserções, 51 arquivos**, sem falha em 48,48 s, incluindo as últimas regressões de lançamento e espera da câmera.
- Jogo 3D, Canvas/Physics Lite/SDK, parser, transporte/preview/export e ciclo de vida, repetidos após sincronização: **1.657 testes, 13.467 asserções, 129 arquivos**, sem falha em 54,18 s.
- Motor canônico completo: **255 testes, 5.234 asserções, 69 arquivos**, sem falha; tipagem do motor aprovada. Exportação portátil: **2 testes, 22 asserções**, sem falha.
- Separação das leituras e recuperação: **35 testes, 158 asserções, 5 arquivos**, sem falha.
- Build após sincronização e correção do Canvas: inicial **341.682 bytes / 110.682 gzip**; Blocos **4.736.596 / 1.264.876**; Ponte **4.215.581 / 1.128.243**; Código **2.648.542 / 738.876**. O teste de orçamento passou com 53 asserções; limites anteriores preservados.
- Tipagem integral do Studio aprovada novamente após a incorporação da staging remota e a correção do apoio do Canvas, sem supressões ou elevação de limites.
- SDK regenerado: **504.025 caracteres**, SHA-256 `d76ac4d1ed15297de49243658fcff860ae20fbee527d2baeb31db2e3fa45a154`. Runtime portátil: **1.106.314 caracteres**, SHA-256 `d15ed10ee2a8d90f17b4cfcffefe39d33481927dffca8618c1955dfe542cc0e4`.

Quatro casos passaram no Chrome real: preview completo, preview com recorte, exportação e `/jogar` local controlado. Cada caso executou três ciclos, movimento, pausa, recomeço e encerramento. Nos casos completos, os **441 pontos de altura/máscara** coincidiram com a referência Raylib a `1e-6` e os quatro clipes do avatar foram ativados. Os recursos permaneceram em **30 geometrias/39 texturas** no cenário completo e **5/13** no recorte, com **0/0** no encerramento e contexto GL perdido. O renderer permanece o mesmo no recomeço.

O evento `pagehide` persistido da prova é sintético e encerra o Avançado conforme sua política existente; não certifica navegação real de ida e volta pelo histórico. O percurso medido começa em um trecho conhecido da ponte parcial, depois de registrar a chegada canônica; a travessia usa teclado e física, sem teletransporte como substituto de movimento.

As quatro provas foram repetidas nos quatro motores após a atualização do SDK e a incorporação da staging remota. O Canvas conserva a posição em repouso durante as trocas e bloqueia a aproximação à caixa física, antes do retorno pelo trecho livre da ponte. Os recibos versionados registram os resultados completos: [Avançado](evidencias/lote8-studio-avancado/recibo.json), [Mundo](evidencias/lote8-studio-avancado/regressao-mundo.json), [Canvas](evidencias/lote8-studio-avancado/regressao-canvas.json) e [Jogo 3D](evidencias/lote8-studio-avancado/regressao-jogo3d.json).

Capturas: [início](evidencias/lote8-studio-avancado/completo-preview-inicio.png), [caminhada](evidencias/lote8-studio-avancado/completo-preview-caminhada.png), [exportação](evidencias/lote8-studio-avancado/completo-export-inicio.png) e [recorte](evidencias/lote8-studio-avancado/buraco-preview-caminhada.png). Vídeos técnicos: [cenário completo](evidencias/lote8-studio-avancado/completo-preview.webm) e [recorte](evidencias/lote8-studio-avancado/buraco-preview.webm). Somente evidências visuais e métricas foram versionadas; documentos privados de ensaio, GLBs pagos e vendors continuam fora do Git.

## Revisão e continuidade

A revisão conferiu contratos e aridade, ida e volta Blockly/IR/código, espera inicial sem dependência circular, troca atômica, cancelamento e gerações, recomeço, pausa, câmera distante, contatos e recortes, propriedade dos recursos e descarte GL. Também conferiu a separação entre leitura e escrita no armazenamento: uma única instância dos eventos/espelho, reexports da API anterior e recuperação carregada sob demanda. O build permanece dentro dos limites originais. A tipagem integral do Studio e do motor passou; os quatro geradores conferiram em `--check`, incluindo o exemplo autoral. A regressão complementar repete as provas dos motores afetados pelo resolvedor compartilhado.

O recorte está pronto para registro em commit/push de `staging`. O próximo recorte é Pro autoral; 8.4 não fecha antes dele e da conferência integrada. Depois permanecem 8.5/8.6, lotes 9–10, composição final da Faísca, full review global, CI, implantação e validação real de staging.

As evidências são técnicas. Não aprovam direção de arte, IK, conforto perceptivo, desempenho em aparelhos físicos ou o acabamento final da Faísca. Nenhum progresso real foi concedido à plataforma.
