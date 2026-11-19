# Revisão dos gates após integrar cenas versionadas

Base: `4bf685eccf90114427fa111bdda8ebcc638aa6c8`, PR #273. Esta revisão não conclui a missão inteira.

## Exemplos dos blocos novos

O run `44435310978`, em Linux e Windows, detectou quatro blocos visíveis sem exemplo em cada motor 2D: referência de objeto, imagem de recurso, propriedade de camada e propriedade de peça. Os exemplos existentes da Vila agora usam as quatro APIs. A cópia do exemplo recebe somente uma propriedade descritiva do chão, sem mudança artística nem alteração do produtor Pinta. O índice do tutor foi regenerado.

Verificação local: 16 testes, 6.779 asserções, zero falhas, incluindo a execução do leitor real sobre os materiais dos dois exemplos. Os valores esperados incluem a porta por identidade, a imagem do morador, a descrição do chão e o atrito 0,8 da peça.

## Corpus Python ausente no runner

O mesmo run executou 75 casos Python: 69 passaram e seis falharam. As seis falhas eram os dois jogos originais nos três projetos Chromium configurados, com HTTP 404 e `Unknown fixture`. O servidor depende dos arquivos externos fixados nos manifestos, ausentes no checkout limpo.

`experiments/studio-python-runtime/prepare-game-corpus.ts` prepara exclusivamente os 19 e 29 arquivos fixados nos dois manifestos, em cache ignorado. Valida commit, caminho, tamanho e SHA-256; nenhuma captura atualiza os manifestos. Downloads usam quatro operações simultâneas e prazo explícito; falhas continuam bloqueando o job. Não há inclusão dos assets no Git, em artefatos de publicação ou em templates de produto. A etapa foi adicionada antes do navegador no job Python.

Verificação local: corpus validado; os loaders reais abriram Pac-Man com sete arquivos e 12 materiais e Space Arena com 20 arquivos e nove materiais. Isso verifica a preparação, não a execução desses jogos no navegador. A confirmação da suíte Python continua dependendo da nova execução Linux. Não se qualifica áudio de sistema dos originais.

## Foco do menu durante reposicionamento

No run anterior `44433670848`, o fluxo de CSS terminou com o menu interceptando o clique no bloco. O fluxo original passou localmente, portanto essa observação isolada não identifica toda a causa da intermitência. A investigação reproduziu um defeito independente e relevante: toda rolagem capturada ou resize reposicionava o menu e voltava a focar o primeiro item, interrompendo a seleção atual.

O teste novo falhou antes da correção no foco após rolagem. O menu agora aplica o foco inicial uma vez por abertura e conserva o item atual nos reposicionamentos. Fechar e abrir novamente restaura a navegação inicial. Sem mudança visual, novos caminhos ou temporização artificial.

Verificação local: 41 testes do menu/barra, 177 asserções, zero falhas. Dois fluxos Chromium passaram sem retry, incluindo o CSS original, navegação Home/End, resize real e fechamento ao selecionar (30,9 s com build). O run de base mais recente também passou no shard Linux 1; a intermitência anterior não é tratada como resolvida universalmente apenas por essas passagens.

## Pendências preservadas

Typecheck completo aprovado após as alterações; verificação conjunta com 57 testes,
6.956 asserções e zero falhas. O orçamento inicial passou nas 31 asserções,
sem elevar os limites. A execução Windows de base iniciou o servidor e passou
18 fluxos, mas falhou na observação do journal após esconder a aba. Esse achado
novo está em reprodução separada; não considerar a suíte Windows aprovada.

O timeout anterior de inicialização Windows ainda precisa de confirmação no novo run. Não se aumentou o prazo de 120 s. O laboratório de transporte de árvores profundas está preservado no stash `studio-v4-transport-lab-preserved`, originado na branch `estudio-deep-storage-v4-20261118`; nenhuma ativação de namespace v4 entrou nesta entrega. Isolamento completo dos motores DOM, escalabilidade visual de 10 mil blocos, depuração, profiling, testes autorais e homologação física permanecem sujeitos aos critérios integrais da missão.

## Regressões confirmadas em 19/11/2026

O run `44448102981` passou Python, isolamento, runtime hospedado, Firefox,
WebKit, Windows/Chromium e dois shards Linux/Chromium. Falhou nos contratos
Linux/Windows e em dois kits no terceiro shard Linux. Não é uma execução verde.

Os contratos falharam no mesmo cálculo de documento: 75.690 bytes de diferença,
contra uma estimativa antiga de 74.000. O fragmento do mapa já tinha contrato
medido de 15.138 caracteres e teto de 15.500 desde a integração anterior. O teste
de documento passa a usar esse teto existente mais os 60.000 da folha e 1.000
bytes para o manifesto pequeno e ligação ao host. Tetos do runtime e bundle não
mudam. Dez testes/60 asserções verificam documento e variantes completas/legadas;
jogo legado continua sem o motor do cenário e sem duplicação de folha.

Os kits Phaser Arcade/Plataforma reproduziram a falha localmente ao iniciar com
o palco recolhido: dois testes vermelhos. O ScaleManager consulta o tamanho do
pai no passo do loop; a tela inicial dorme o loop após desenhar. O ResizeObserver
agora atualiza os limites do pai e a escala pelas APIs públicas antes de redesenhar,
ignorando dimensões nulas. Não se mantém um loop ativo só para aguardar layout.
O observador continua desconectado no descarte; não muda arte nem controles.

Os três kits Phaser passaram no Chromium local, sem retries (42,6 s com build),
incluindo início recolhido, abertura, persistência/reload, movimento, pausa,
reinício e resize. O cenário de início recolhido agora cobre todos os kits Phaser.
Contratos dos templates: 81 testes/1.077 asserções aprovados. A confirmação Linux
continua exigindo novo run; a passagem local não substitui esse resultado.

## Identidade e fronteiras dos journals de recuperação

Três testes vermelhos reproduziram perdas reais: um payload IndexedDB com token
igual ao espelho síncrono, porém conteúdo diferente, era aplicado e o espelho
original reconhecido; um journal nativo com partição estrangeira conseguia gravar
em outro projeto; um documento de formato futuro substituía a revisão legível. O espelho síncrono já tinha validação de controle estrita, mas o nativo não.

A recuperação verifica a igualdade dos espelhos com identidade/token iguais antes
de consumir qualquer um. Divergência conserva ambos e apresenta erro. A validação
de contrato foi extraída para um módulo raro compartilhado, carregado quando há
journal, e passa a proteger replay e abertura de rascunhos nativos. A filtragem
e a validação integral do documento ocorrem antes de resolver ancestrais, para um descendente incompatível não ocultar
um rascunho válido. Não muda namespace, formato de blocos, cotas ou documentos.

Treze testes específicos passaram, incluindo as três reproduções, preservação dos
originais e um descendente inválido que não suprime o rascunho válido. A validação
Python expôs um nome de material não canônico na fixture estrutural; o teste de
recuperação agora parte de material válido e exige validação antes do staging.
Não se alterou o leitor para aceitar ou descartar esse conteúdo. Regressão final:
439 testes, 2.347 asserções, 69 arquivos, zero falhas (43,88 s), incluindo
Chromium/WebKit nativos com aborto de saída. Typecheck de produto aprovado.
O orçamento inicial passou antes da validação integral; sua repetição simultânea
a uma compilação excedeu 60 s e é registrada como falha, sem aumentar o prazo.
A confirmação final isolada é registrada abaixo.
A migração experimental v4 continua fora desta entrega.


Confirmação final do bundle, sem outra compilação desta sessão concorrendo:
1 teste, 31 asserções, zero falhas, 17,33 s (build 16,66 s). Mesmos limites e
mesmo prazo de 60 s. As duas execuções anteriores com timeout ficam registradas;
a primeira repetição também coincidiu parcialmente com o typecheck do laboratório,
que foi interrompido apenas pelo PID específico desta sessão. Não houve mudança
no teste ou no produto para obter esta passagem.
