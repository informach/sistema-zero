# Estúdio: integração do snapshot remoto deb6a3e36

## Referências e escopo revisado

Origem: `origin/staging` em `deb6a3e36fbeef4e378293589e73c5012552c1ac`, sobre a branch da missão em `53ce8709b`. São 230 arquivos no delta remoto, incluindo documentação de cursos para pais e evidências das frentes paralelas; não é uma afirmação de revisão linha a linha de todos esses arquivos.

A revisão focou contratos do Estúdio: novos materiais `scene3d`/`scene3d-data`, dependências de materiais, preparo e importação atômicos, preservação das fontes Python, compatibilidade de leitores Pinta, geometria física e auxiliar Raylib. Não houve alteração autoral nas ferramentas Pinta/Molda, composição artística, assets privados, merge em staging/main ou deploy.

O conflito em `persistence.ts` foi resolvido preservando a verificação de recuperação síncrona e a identificação de ambiente adicionada pelo remoto. A sondagem de documento único v2 permanece. Dependências conferidas por `bun install --frozen-lockfile`.

## Achados corrigidos durante a revisão

O preparo 3D usava JSON canônico como identidade integral do projeto. Dois testes reproduziram aceitação de uma revisão modificada no mesmo objeto, trocando -0 por 0 ou removendo campo undefined. Um terceiro teste reproduziu RangeError no hash recursivo de metadados com 40.000 níveis, abaixo da profundidade de documento já aceita (40.064).

O codec de grafo já testado no laboratório foi centralizado em Core e reutilizado tanto pela recuperação quanto pela identidade efêmera do preparo 3D. O teste de captura antes de await foi atualizado para a identidade integral. Não se alterou `canonicalJson`, hashes publicados, contratos de partes remotas ou formatos de projeto. A importação revalida a identidade completa e conserva o programa/metadata ao acrescentar a cena.

O formato de grafo e seus bytes anteriores são protegidos pelo teste golden do journal. As cópias de saída continuam limitadas a 2.000.000 caracteres; os documentos/arquivos duráveis usam o orçamento existente. Nenhum limite foi ampliado.

A primeira extração excedeu gzip inicial por 15 bytes (120.015 para teto de 120.000). A leitura/decodificação rara foi separada da captura síncrona, reaproveitando a separação já qualificada no laboratório. O resultado aprovado ficou em 366.173 bytes brutos / 119.300 gzip, 41 asserções do grafo/orçamento. Não foram acrescentados imports/awaits à captura de saída.

O perfil gerado de playtest Python estava desatualizado após o merge. Foi regenerado pelo comando canônico e o --check passou; a imagem descartável precisa ser reconstruída na CI.

## Evidências locais

- 550 testes selecionados / 2.865 asserções, 80 arquivos, zero falhas, 53,53 s: estado, persistência, migrações, materiais/importação 3D, módulo Raylib e roteamento de runtimes.
- 43 testes específicos de identidade/importação/codec / 173 asserções; 8 testes diretos Core / 18 asserções. Incluem preparo e aplicação com 40.000 níveis, campos opcionais, -0 e recusa de cotas inválidas.
- Core Pinta: 32 testes / 283 asserções. Contratos de exportação 3D: 11 / 59; conteúdo/execução do compilador: 11 / 31. São testes de contrato, não FPS de jogos.
- Matriz documental dos cursos: 43 testes / 192 asserções. Projetos das aulas no Blockly real: 15 / 43. Não substituem envio/verificação no host ou comparação visual completa dos vídeos.
- Oito fluxos Pinta–Estúdio reais passaram em 1,8 min, sem retries; incluem catálogo com leitor anterior, mundo Python, portas/destinos, atualização de peças, mapa nativo autocontido e rollback de falha síncrona. Essa prova foi feita após o merge e antes da correção interna da identidade 3D; não é uma prova de entrada visual de cenas 3D.
- Gerador de fontes Python --check aprovado.

- Typechecks completos do Estúdio e Core aprovados; Biome dos 19 arquivos de código autoral/integração e whitespace aprovados.
- Exportação e biblioteca de materiais: 149 testes / 1.107 asserções, zero falhas, 8,88 s.
- 18 fluxos de cenários reais em desktop/toque passaram em 58,5 s após a correção: geometria física, Phaser portátil, movimento/colisão/portas, recursos, animações, grade, 32 camadas, histórico e reabertura. Sem retries ou aumento de prazos do produto.
- O workflow da missão passa a incluir os testes Core de grafo/geometria e os contratos 3D de preparo/exportação/orçamento. A qualificação remota do merge continua bloqueante.

## Limitações mantidas explícitas

Importação por contrato/store não comprova uma entrada visual completa de mundos 3D nem streaming/renderização em todos os motores. Raylib testado aqui inclui o módulo Python e contratos de distribuição; não é homologação de GPU, jogo extenso, memória prolongada ou hardware de 8 GB. A escrita padrão ainda é v3; o laboratório v4, o Blockly visual de 10.000 blocos, o isolamento JS de produto e as etapas profissionais restantes não estão concluídos.
