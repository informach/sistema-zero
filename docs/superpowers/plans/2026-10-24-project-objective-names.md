# Nomes da conferência do projeto nas aulas

Requisito aprovado pelo usuário: trocar **Objetivos desta parte** por
**Objetivos do projeto** e **Verificar esta parte** por **Verificar projeto**,
incluindo todos os roteiros e textos de fala do ElevenLabs que mencionem esses nomes.
Estado: incluído no plano; a alteração de interface/editorial ainda não foi executada.

## Distinção confirmada no código

A faixa `SectionProjectCheck` verifica somente `completion.projectChecks` vinculados
ao projeto do Estúdio daquela parte. Assistir ao vídeo, realizar outras atividades,
consultar materiais exigidos e enviar o projeto pertencem a outros critérios da
conclusão da parte e às pendências do rodapé. Os novos nomes devem expressar esse escopo.

O título e o botão comuns estão em
`packages/member-shell/src/lib/lesson-copy.ts`. A alteração atende Kids e Adultos.
O rodapé continua representando a conclusão da parte inteira.

## Inventário inicial

Na árvore `ef292cb0f`, há 37 roteiros de produção em `docs/aulas-interativas`:

| Curso | Roteiros com “Verificar esta parte” |
| --- | ---: |
| Cadê Todo Mundo | 2 |
| Corre Dino | 13 |
| Desafio Primeiro Jogo | 3 |
| Nave Contra Asteroides | 9 |
| Total | 27 |

A expressão também aparece nos 27 respectivos arquivos `.elevenlabs.txt`, portanto
há impacto em fala, não apenas em notas. O título **Objetivos desta parte** não foi
encontrado nesses roteiros. Conferir novamente o inventário no início da execução,
incluindo variações de maiúsculas, marcação e eventuais quebras de linha.

## Lote de execução

1. Atualizar os dois nomes na interface comum, mensagens do servidor que apontam o
   botão, instruções atuais, ajuda e testes correspondentes. Conservar a faixa no
   Estúdio como conferência do projeto, com seus detalhes recolhíveis.
2. Revisar as fontes canônicas dos cursos: `.conteudo.json` quando existir, roteiro
   de produção nos demais e geradores em `docs/aulas-interativas-tecnico/qa`.
   Substituir apenas as referências aos controles; preservar as instruções,
   exemplos, valores demonstrados, sequência e demais falas.
3. Regenerar e conferir os derivados afetados: propostas/manifestos, roteiros,
   master `.elevenlabs.txt`, falas dos personagens e `.edicao.json`, conforme a
   estrutura de cada curso. Toda fala que citar o controle deve dizer
   **Verificar projeto**. Sem gerar uma versão editorial adulta separada.
4. Atualizar materiais/PDFs e orientações de captura que citem os nomes antigos,
   quando presentes, e revisar os documentos renderizados. Preservar relatórios
   históricos como evidência do que foi validado em versões anteriores.
5. Inventariar os áudios/vídeos já produzidos por aula, clipe e frase. Arquivos TXT
   corrigidos não significam áudio regenerado. Identificar somente os trechos que
   precisam de nova voz ou edição, incluindo áudio de personagens quando afetado.
6. Para áudio afetado, gerar/substituir o trecho, escutar, conferir pronúncia,
   pausas, âncoras e sincronismo. Se o vídeo mostrar o nome antigo, registrar a
   captura que precisa de atualização. Separar texto pronto, áudio pronto,
   edição conferida e conteúdo efetivamente publicado.
7. Executar os geradores e validadores dos cursos, conferência das falas do
   ElevenLabs, manifestos e roteiros, além dos testes da faixa/rodapé e inspeção
   em navegador nas duas comunidades. Fazer review do diff por curso.

## Guardas de aceite

- Os controles atuais têm exatamente os novos nomes; instruções e falas que os
  citam correspondem à interface exibida.
- Os critérios do projeto continuam distintos dos demais requisitos da parte.
- Conferir que as trocas de texto não reiniciam progresso, não apagam evidências
  e não alteram objetivos, regras ou IDs. Revisar o cálculo de revisões antes de
  republicar manifestos; não presumir que todo hash exclui texto de apresentação.
- Nenhuma reescrita geral das aulas: o diff editorial deve demonstrar a alteração
  de nomenclatura e os derivados necessários.
- Relatório de gravação indica curso/aula/clipe/frase e o estado real de cada
  correção, permitindo aproveitar o restante dos vídeos já gravados.
- Promoção pelo fluxo staging → produção, sem misturar código financeiro ainda
  em validação. O release congelado `ef292cb0f` permanece separado deste lote.
