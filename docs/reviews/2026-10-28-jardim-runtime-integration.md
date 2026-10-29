# Revisão do avanço remoto: Jardim e executor 3D

Base recebida: `5d1da6621`, descendente da revisão do Arquipélago em `6338bc589`.
Escopo: artes/modelos do Jardim, referências dos manifestos, cena de quiz, carregador e
verificador 3D. Nenhum GLB foi gerado nesta máquina.

## Decisão sobre as artes

A pessoa responsável confirmou que o Jardim Secreto ainda não está publicado e não foi usado.
Ficam somente os novos modelos. A restauração preventiva das versões anteriores de
`regador-azul`, `flor-do-jardim` e `jardim-acolhedor` foi retirada antes do commit, junto com o
teste dessa preservação. Não há migração de projetos nem camadas adicionais de compatibilidade.

## Correções

- O commit alterava os arquivos da imagem sem regenerar `validation-profile.json`.
  Reproduzido localmente; CI `40754337205`, job `123049454928`, falhou pelo mesmo motivo
  em **Construir imagem do Studio Pro**. Perfil regenerado pelo comando canônico e conferido.
- A espera dos modelos retornava normalmente ao esgotar os 15 segundos, mesmo com modelos
  pendentes ou quadros continuamente lentos. Erros da observação também viravam zero pendências.
  Três controles causais falharam antes da correção. Agora a pré-condição incompleta gera erro
  de disponibilidade, que o executor já distingue de reprovação do programa.
- A espera ficou num módulo explícito, incluído no Dockerfile e no perfil. Leituras e janelas
  de quadros têm limite no processo executor, inclusive se o callback nunca responder. O atraso
  do primeiro quadro entra na medida; um único quadro tardio não conta como janela estável.
  A medida de quadros usa o mundo isolado do navegador; modelos são reconferidos após a janela.

## Evidência deste lote

- Executor: **47 pass, 0 fail, 420 asserções / 4 arquivos**, incluindo navegação 3D,
  contratos/copias da imagem, verificação dos objetivos e prontidão. O controle de leitura
  que nunca responde exerceu o limite real de 15 segundos.
- Estúdio no cwd canônico, com o preload DOM do pacote: **61 pass, 0 fail, 478 asserções**,
  cobrindo biblioteca de modelos/hashes, carregador compartilhado, tipos do runtime injetado
  e orçamento do payload. A tentativa pela raiz teve dois erros de configuração do ensaio
  (DOM ausente e resolução de Three fora do pacote); não foram tratados como falha de produto.
- Jardim: **9 pass, 0 fail, 1.179 asserções**; manifestos, etapas, regras, projetos portáteis e quiz.
- Chrome real, headless/Windows: carregamento simulado por 300 ms seguido da janela de quadros
  isolada terminou em **2.336 ms**, mesmo com `requestAnimationFrame` do mundo do jogo substituído
  por uma função que lança erro. Navegador próprio encerrado. Essa prova é do protocolo de espera,
  não do jogo 3D inteiro nem de desempenho em produção.
- `check:validation-profile` passou. O job Arquipélago do CI recebido passou; isso não implica
  sucesso do workflow inteiro, que falhou no perfil antigo da imagem.

Evidências locais em `.cache/arquipelago-audit-20261028/`: `models-ready-red-r1.log`,
`runtime-objectives-r1.log`, `jardim-studio-canonical-r2.log`, `jardim-manifest-r2.log`,
`models-ready-browser-r1.log` e `ci-5d1-job.log`.

A imagem e o Worker devem ser implantados com o novo perfil. A qualificação hospedada dessa
composição e o deploy não são alegados por estes testes. A auditoria geral do Arquipélago e
as pendências de arte do Bosque continuam no relatório próprio.
