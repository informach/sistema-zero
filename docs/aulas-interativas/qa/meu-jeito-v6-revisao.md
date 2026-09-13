# Revisão de O jogo do meu jeito — 12/09/2026

Foram analisados os oito roteiros Markdown originais, incluindo as notas de gravação e suas revisões de agosto. O pacote resultante está em [o-jogo-do-meu-jeito-v6](../o-jogo-do-meu-jeito-v6/README.md). Os originais e o pacote histórico não foram substituídos.

## Resultado editorial

- Oito aulas, 76 seções, 55 clipes planejados por âncoras reais, 13 demonstrações de observação e cinco experimentos em HTML.
- Todas as Partes dos oito originais têm destino explícito: recorte para vídeo, aplicação ou substituição por comparação delimitada. Especificações e notas de produção foram consideradas nas correções, sem virarem fala para a criança.
- Vinte e seis aplicações com uma pergunta de compreensão cada, cinco perguntas dos experimentos e duas perguntas no quiz final de cada aula. Não se exige assistir ao vídeo como substituto da construção.
- Uma entrega pela galeria em cada aula; nave e asteroide juntos na aula 5. A plataforma confirma recebimento, e o professor revisa os critérios artísticos/funcionais registrados no roteiro.
- O curso continua ensinando as ferramentas completas, com seus projetos e galerias. Nenhum projeto é importado artificialmente para dentro da aula.

## Pontos corrigidos na revisão

| Ponto | Decisão |
| --- | --- |
| Demonstração virando experimentação | Treze seções contêm somente vídeo; não oferecem ferramenta ou parâmetros. Os cinco experimentos são outros blocos. |
| Liberdade dispersiva | Duas situações por experimento; escolhas de arte restritas à tarefa; dois quadros; versões futuras não são exigência da aula 8. |
| Aulas longas com muitas novidades | Dividir os gestos por objetivo sem criar aulas novas; preservar o caminho completo de navegação e ações dependentes. |
| Fogo sem espaço para crescer | Reservar pixels após o fogo-base e espaço superior no asteroide antes da chama. |
| Texto da aula 3 versus imagem descrita | Seguir a fala gravada de Selecionar e mover e completar o vão com Lápis. |
| Motor “apagado e aceso” na aula 6 | Trocar por fogo pequeno e grande, conforme a construção da aula 3. |
| Vetor “nunca perde qualidade” dentro do jogo | Distinguir forma editável e folha rasterizada exportada. |
| Paleta e alegação sobre Celeste | Mostrar cores realmente disponíveis e usar exemplos próprios de pixel/vetor. |
| Fogo e meteoros como afirmação de física | Apresentar como ilustração estilizada do jogo, sem generalizações sobre vácuo, velocidade ou temperatura. |
| Ordem diferente de substituição nas aulas 6 e 7 | Nave: apagar criador antigo antes do novo nome. Asteroide: montar, transferir x aleatório e retirar antigo; animar depois de cada criação. |
| Colisão “pelos pixels” | Descrever limites do conteúdo opaco, sem prometer colisão precisa em cada pixel ou em cada vazio interno. |
| Publicar adiado por tarefas abertas | Publicar primeiro na aula 8. Exemplos e Clube ficam como orientação posterior, sem exigir nova criação ou postagem. |
| Comparação alta demais no telefone | Remover a prévia repetida após concluir; manter os resultados e pares de quadros. Calcular altura pelo conteúdo, permitindo também encolher o iframe. |

## Evidências técnicas

**Verificação estrutural:** [meu-jeito-v6-verificacao.json](meu-jeito-v6-verificacao.json). Confere os oito hashes SHA-256, origem de todas as Partes, âncoras dos 55 clipes, geração reproduzível, schema dos manifestos, critérios de progressão e geometria real de exportação do Pinta.

**109 testes aprovados, zero falhas**, nos seguintes grupos:

| Grupo | Testes | O que comprova |
| --- | --- | --- |
| Pinta: quadros, edição, folha pixel e folha vetorial | 44 | Cópia independente, fantasma ausente no primeiro quadro, recorte da folha, índices/metadados e relação com o runtime |
| Estúdio: Trazer do Pinta, sincronização e seletor de animação | 53 | Importação de artes/metadados, atualização de desenhos e preenchimento dos campos da animação |
| API: entregas de galeria e importação existente | 4 | Recebimento e seleção de criações, limites/revisão/identidade e comportamento da autoria |
| API: oito novos manifestos Meu Jeito | 8 | Falha explícita sem ferramenta preparada, importação com galeria, preservação da referência, seções externas, reimportação idempotente e versão publicada intacta |

Os testes de API usam os repositórios de teste existentes, sem banco de produção. A suíte já existente de Trazer do Pinta emite avisos de React sobre `act(...)`; os testes passaram. Nenhuma mudança de produção foi feita para ocultar esses avisos.

**Tipos:** `bun run typecheck` em `packages/community-kids` terminou sem erros, incluindo os novos arquivos do ensaio visual e suas dependências. Biome aprovou os nove arquivos TypeScript adicionados; `git diff --check` sem erros.

**Navegador:** [registro das verificações](meu-jeito-v6-evidencias/navegador.json). Chrome isolado com o componente de produção `LearningHtml`:

- Cinco experiências em larguras externas de 320, 390 e 1200 px: 15 percursos completos com teclado, retomada parcial, retomada após concluir, controles encerrados e conteúdo inteiro visível.
- Alturas finais ficaram entre 675 e 1224 px, dentro do limite de 1600 do protocolo. O primeiro desenho de comparação de quadros ultrapassava esse limite; o problema foi reproduzido e corrigido antes da entrega.
- Animação também conferida sem redução de movimento: não registra antes da sequência, ignora execução interrompida ao reabrir e termina após os dois testes.
- Zero erros de página. Nenhuma conta ou sessão autenticada foi usada.
- Inspeção visual das comparações de [recorte no celular](meu-jeito-v6-evidencias/folha-mobile.png) e [bordas no computador](meu-jeito-v6-evidencias/bordas-desktop.png). O cabeçalho de ensaio e o painel de estado pertencem à página de teste, não ao bloco entregue ao aluno.

## Como repetir

Na raiz, passando a pasta dos roteiros originais:

```powershell
bun docs/aulas-interativas/qa/gerar-meu-jeito-v6.ts 'CAMINHO_DOS_ROTEIROS_ORIGINAIS'
bun docs/aulas-interativas/qa/validar-meu-jeito-v6.ts 'CAMINHO_DOS_ROTEIROS_ORIGINAIS'
bun packages/community-kids/tests/visual/serve-meu-jeito-preview.ts
```

No ensaio, escolha cada experimento, registre uma situação, reabra, registre a outra e reabra novamente. Os dois registros devem persistir e os controles ficar encerrados. Confira as três larguras e o modo de movimento reduzido. O quiz do ensaio executa o avaliador localmente; não substitui o teste da API.

Em `packages/pinta`:

```powershell
bun test src/export/spritesheet.test.ts src/export/vectorSheet.test.ts src/animation/frames.test.ts src/animation/framesVector.test.ts src/core/assetEdit.test.ts
```

Em `packages/studio`:

```powershell
bun test src/components/assets/PintaImportDialog.test.tsx src/asset-library/personalSync.test.ts src/blockly/fields/__tests__/FieldAnimationPicker.test.ts
```

Em `packages/members`:

```powershell
bun test tests/integration/gallery-delivery.test.ts tests/integration/learning-import.test.ts tests/integration/meu-jeito-import.test.ts
```

## O que depende da produção

O conteúdo importável é um candidato de autoria. Ainda é necessário conferir timecodes nos arquivos gravados, cortar os clipes, preparar os exemplos de comparação de jogos da aula 8, produzir complementos visuais/narrações indicados e vincular as mídias. Os 55 cartões planejados não são vídeos já produzidos.

Antes de importar, preparar a entrega de galeria no primeiro bloco do tipo certo: Estúdio nas aulas 1/6/7/8, Pinta nas demais, duas artes na aula 5. O guia descreve os campos exatos. Os testes não substituem conferir a referência no rascunho real.

Falta percorrer as aulas publicadas em ambiente de revisão com um perfil do curso para conferir permissões, paleta de blocos liberados, troca de abas, salvamento na conta, entrega real e publicação no Mural. A atividade HTML registra participação pelo cliente e corrige a pergunta no servidor; não faz replay autoritativo dos gestos nem analisa os desenhos externos. Não houve importação em conta real, upload, publicação, commit ou push nesta tarefa.
