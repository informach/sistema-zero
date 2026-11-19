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
