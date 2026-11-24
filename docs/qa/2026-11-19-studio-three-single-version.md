# Uma versão do Three em todos os executores

## Escopo

Continuação da decisão explícita do responsável de adaptar os exemplos 3D, pois não há jogos 3D de alunos em produção. Não é necessário manter um motor legado para esses exemplos.

`packages/core/src/studio/three-version.ts` define Three 0.184.0 e tipos 0.184.1 (mesmos pins já utilizados pelo pacote Estúdio). O importmap clássico, os modelos Pro básicos e profissionais, a conversão Clássico → Pro, o gerador dos locks de grade e os contratos da compilação hospedada consomem essas versões.

A imagem instala somente o pacote `three` atual. O alias `three-studio` e o roteamento entre duas versões foram retirados. O resolvedor continua lendo exclusivamente os bytes oficiais da imagem sem rede, exige correspondência exata da versão instalada e rejeita URLs de outras versões. Permanecem os limites de 256 módulos, 4 MiB por arquivo e 32 MiB retidos por verificação, além da proteção contra symlinks, caminhos escapados e arquivos não JavaScript.

Não houve migração silenciosa de dependências de projetos existentes, implantação ou publicação. Um projeto Pro que declara uma versão incompatível recebe a rejeição explícita já existente do compilador; o editor não reescreve seu manifesto.

## Verificação

- Teste novo dos cinco modelos Three: falhou antes da alteração (0.180.0 recebida); passou depois com 0.184.0 e tipos 0.184.1.
- Templates, conversão, exemplos Pro, importmap e integração de cenas: 155 testes, 1.348 asserções, 13 arquivos, sem falhas.
- Imagem, resolvedor, contratos, dependências e typecheck real de arquivos: 24 testes, 367 asserções, quatro arquivos, sem falhas (19,69 s). Inclui instalação isolada por npm ci e npm ls sem alterar o lock.
- Após simplificar o resolvedor para uma única versão: oito testes, 288 asserções, sem falhas.
- Tipos completos do Estúdio: saída 0; tipos do serviço e dos testes do executor: saída 0.
- npm ci da imagem: 36 pacotes instalados, sem scripts de dependências.
- npm audit do lock da imagem: zero vulnerabilidades.
- Perfil imutável regenerado e conferido pelo gerador canônico.
- Locks e fontes dos kits conferidos pelos geradores canônicos.
- Carregador de cenas conferido sem alteração dos bytes: SHA-256 0347fda9991019b53ae4e0780e5acea2a3af32e71391884be5f463abc35df5f7, 499.964 caracteres, três imports compartilhados.

## Pendências explícitas

A qualificação da imagem reconstruída no GitHub ainda está pendente. O aviso de precisão do compilador de shaders observado no Chromium Windows continua registrado no relatório `2026-11-19-studio-three-current-api.md`; a unificação não é apresentada como correção desse aviso. A missão global e a ativação v4 ainda não estão concluídas.
