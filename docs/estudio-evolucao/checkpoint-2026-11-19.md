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

1. O Clássico ainda cria os SVGs na abertura; meta de cinco mil blocos
   abaixo de oito segundos não atingida. O descarte visual posterior
   não equivale a montagem inicial incremental.
2. A casca isolada não está ativada/homologada no host publicado. WebKit
   continua sem isolamento efetivo de CPU pelo arranjo de iframes testado.
3. Uma das seis repetições locais da galeria corrigida ainda teve timeout
   de `keyboard.press`, depois de desenhar o primeiro frame. Cinco
   aprovações não tornam essa rodada verde.
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
   A lista de referências do painel ainda corta em cem resultados:
   precisa de navegação progressiva e contagem explícita próprias.
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
