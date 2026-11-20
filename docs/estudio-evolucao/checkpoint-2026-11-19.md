# Checkpoint da retomada — 19/11/2026

A missão **não está concluída**. O trabalho ocorre na pasta principal,
branch `staging`, com commit/push autorizados pelo usuário e preservação
das alterações das outras frentes. Não foram criadas novas worktrees ou
feita implantação nesta retomada. A compatibilidade de projetos 3D de
produção foi dispensada pelo usuário; exemplos devem acompanhar contratos
robustos, sem camadas de compatibilidade desnecessárias.

## Incrementos verificáveis

- Descarte/restauração dos métodos da montagem sob demanda do Blockly:
  `d337c2733`, com prova vermelha/verde no navegador em três engines.
- Separação do custo de snapshots do trace da medição de CPU da casca:
  `e9ec3b378`; mantém os testes funcionais com captura completa e não
  altera os limites de responsividade.
- Inventário estático dos dez runtimes: `3d408ccf1`; não é profiling.
- Golden do catálogo 3D reconciliado com as cinco adições comprovadas
  do exemplo Herói: `101be3bee`; 572 testes passaram, sem mudar as
  referências dos cursos para acomodar alterações.
- Baseline TS modular de 60 arquivos: `9614f31af`, com invalidação real
  de dependências e erro TS2322 preservado.
- Perfil do runtime hospedado atualizado: `8c650f667`; instalação local
  reconciliada, 19 testes/343 asserções passaram. Relatório em `84eb23a07`.
- Troca da prévia somente por um documento completo: `9199e281b`.
  Evita a navegação live → vazio → live durante a carga de recursos.
  Família de prévia/player: 108 testes/551 asserções. Contrato de
  navegador: vermelho nas duas larguras antes; seis aprovações depois.
- Conferência integral da colagem no Monaco: `61bf9a751`. Chromium
  também pode mostrar só uma janela do texto no textarea acessível.
  Cinco casos da casca passaram nos três engines; um skip explícito
  permanece para o isolamento de CPU indisponível no WebKit.
- Mapa do Pro com índice completo, busca e montagem progressiva:
  [relatório e medições](../qa/2026-11-19-studio-pro-file-map.md).
  Família linguagem/workspace: 53 testes/212 asserções; quatro casos
  de navegador passaram, mais repetição após a revisão visual.
  TypeScript, Biome e guarda de bundle passaram localmente.

As primeiras aulas de Cadê e Farol foram novamente montadas pelo robô
no Blockly real: duas aprovações, sem atualizar referências. Não são
todos os gestos de todas as aulas nem as ações da página real do Members.

A suíte geral anterior aos últimos incrementos passou em 900 arquivos e
164 grupos: 11.859 testes/363.819 asserções. Isso não aprova automaticamente
a revisão posterior. Consultar a CI e os recortes novos de cada alteração.

## Limites que continuam bloqueando a conclusão

A carga leve também recupera a casca HTML dos arquivos quando a IR não
foi lida: [relatório](../qa/2026-11-19-studio-document-shell-recovery.md).
Título/viewport foram preservados no Vale real; 49 testes, cinco casos de
navegador, dois recortes protegidos e TypeScript passaram. CSS continua
sendo uma investigação distinta. Os runtimes de cena do Estúdio foram
regenerados para a integração commitada; o relatório de regeneração
explicita o estado concorrente do motor e os limites da prova.

Nova causa reproduzida e corrigida na abertura: inserção de banner sem
mudança de programa e geração do primeiro executável antes de os blocos
da galeria terem suas identidades. O atribuidor existente agora inclui
moldes. [Relatório completo](../qa/2026-11-19-studio-noop-hydration.md):
240 testes/6.013 asserções, seis casos de navegador, bundle e tipos aprovados.
O ensaio ampliado ainda precisa qualificar a correção; foi particionado
em 50+50 casos por SO, sem mudar ações, retries ou prazos. A inspeção dos
185 round-trips também deixou 35 diferenças de fonte a classificar, sobretudo
ordenação de CSS/atributos. Isso não é conclusão global ou prova de 35
regressões funcionais.

Incremento mais recente: interromper a primeira tentativa antes de `load`,
quebras de linha em comentários sem sugestão tardia consumir Enter e
referências completas no Pro. Recortes finais: 63 testes/311 asserções para
preview/Monaco/bundle, 54 testes/220 asserções para linguagem/workspace,
cinco fluxos de navegador para interrupção/mapa/digitação e um fluxo real
de 252 referências. TypeScript local passou; Biome passou. Os dois controles
do observador opt-in passaram. O diagnóstico `ad492302a` foi enviado à
staging e o run `44638854435` foi iniciado, ainda sem resultado integral.

Atualização da verificação: o run `44625198436` aprovou onze dos doze jobs;
o job completo de contratos Windows registrou 11.864 testes, zero falhas,
363.883 asserções, 900 arquivos e 164 grupos isolados. A falha restante
foi entrada nativa em Patrulha Espacial. O run posterior `44625941669`
aprovou ambos os jobs de contratos e falhou em dois shards Chromium;
isso não é aprovação integral. A barreira pública `FinishedLoading`
substituiu as esperas fixas do teste de undo Python em `c18869103`.

O diagnóstico ampliado `44633216192` reproduziu duas falhas em cem casos
Linux: ocorreu navegação durante a tecla, mas editor e jogo responderam
à leitura CDP cinco segundos depois. O controle de filho ocupado passou;
Windows foi cancelado. A causa do comando pendente permanece aberta.
Detalhes e o incremento de interrupção da primeira execução estão no
[relatório específico](../qa/2026-11-19-studio-startup-interruption.md).

O ensaio `1cb326f16` separou COOP e COEP do host: no Firefox medido,
nenhum cabeçalho sozinho isolou o cálculo; ambos juntos responderam.
Além de domínio/cabeçalhos, falta passar `previewShellUrl` nos consumidores
do MemberShell. Não ativar COEP globalmente sem qualificar vídeos e
integrações das aulas. Não houve alteração em ambiente publicado.

1. O Clássico ainda cria os SVGs na abertura; meta de cinco mil blocos
   abaixo de oito segundos não atingida. O descarte visual posterior
   não equivale a montagem inicial incremental.
2. A casca isolada não está ativada/homologada no host publicado. WebKit
   continua sem isolamento efetivo de CPU pelo arranjo de iframes testado.
3. Os ensaios anteriores à correção das identidades/banner tiveram
   timeouts de `keyboard.press`. Os seis casos novos passaram; falta
   concluir a qualificação ampliada e classificar as diferenças de fonte
   restantes. Aprovações novas não tornam as rodadas antigas verdes.
4. A homologação Verificar/Enviar/Concluir no Members não foi executada
   aqui. `node scripts/local-studio-stack/preflight.mjs` recusou os
   `.env` existentes nesta pasta e nos serviços. Nenhum valor foi lido,
   nenhum arquivo foi removido/movido e a guarda não foi afrouxada.
   Usar checkout limpo e efêmero no GitHub é uma alternativa a preparar;
   o ensaio ainda não está implementado nem aprovado.
5. Mil arquivos no serviço TS: edição + diagnóstico p95 de 239 ms neste
   laboratório. Não mede digitação nem uso simultâneo de Monaco, jogo,
   WebContainer e Zappy. O projeto completo de homologação F falta.
6. O mapa preserva o índice, mas recebe o índice inteiro do arquivo ativo.
   A lista de referências deixou de descartar resultados após cem: tem
   paginação e contagem, com 252 destinos conferidos no navegador real.
   [Evidências e limites](../qa/2026-11-19-studio-pro-complete-references.md).
   Isso não elimina o transporte integral nem homologa todo o projeto F.
7. Depuração profissional, profiler opt-in, testes autorais, streaming
   completo de jogos extensos e homologação integral continuam no
   [plano de execução](plano-execucao.md), com dependências e lacunas reais.

Não há comprovação de FPS universais, aparelhos físicos de entrada ou
ausência de vazamento em uso prolongado. Os relatórios distinguem medições
do processo, do serviço de linguagem e do navegador.

## Próxima sequência reproduzível

1. Conferir o SHA de cada execução da CI da missão, inspecionar todas as
   falhas e seus traces, preservar evidências e corrigir causas.
2. Fechar o problema residual de entrada no Chromium sem retries, prazos
   maiores ou troca por interação artificial que esconda o problema.
3. Retomar montagem inicial incremental do Clássico, com a mesma fixture
   de cinco/dez mil blocos e proteção das referências dos dois cursos.
4. Preparar homologação real do Members em checkout efêmero sem dotenv;
   manter a pilha local isolada e não usar dados/serviços de produção.
5. Continuar o Pro conforme o plano: referências completas, análise por
   revisão, sincronização/filesystem, perfis de execução, depois ferramentas
   profissionais, motores e homologação dos jogos extensos.

## Limpeza pendente

Servidores de diagnóstico desta frente foram encerrados. A revisão
automática bloqueou a exclusão dos seguintes artefatos próprios com a
mensagem `blocked by policy`; não houve tentativa de contornar a decisão:

- `packages/studio/.cache/e2e-dist-5355/` — build redundante do ensaio anterior.
- `packages/studio/.cache/mission/preview-first-document-red.txt`.
- `packages/studio/.cache/mission/preview-first-document-green.txt`.

Os dois logs grandes são da hipótese descartada de remount; o registro
compacto do teste e a prova da correção definitiva estão preservados nos
relatórios versionados e artefatos separados. Esses caminhos são caches,
não worktrees ou código do aluno.
