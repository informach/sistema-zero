# Redesenho didático das aulas interativas

**Comece aqui: [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md).** Regras, motivos, adaptações por curso e checklist em um só lugar. O briefing organiza a análise; as especificações explicam a execução.

> **Migração pedagógica em andamento (24/09/2026).** O trio `nave-contra-asteroides-dia-1` foi o piloto
> da revisão daquela data: uma ideia por seção, um vídeo no máximo, Zappy pontual, palpite seletivo
> e quiz isolado. A disponibilidade da atividade agora depende de `videoBeforeActivity` do curso,
> conforme as Diretrizes. O curso gratuito
> `cade-todo-mundo` segue essa estrutura. Após o teste dos vídeos gravados com duas crianças,
> as nove seções receberam uma revisão de linguagem em 27/09/2026: tarefa direta, montagem
> completa e tutoriais de interface no Como Fazer. Os novos roteiros precisam ser regravados.
> Veja [a revisão e o mapa dos tutoriais](REVISAO-LINGUAGEM-CADE-TODO-MUNDO-2026-09-27.md).

Redesenho didático dos cursos de jogos para o formato de seções da plataforma. O jogo de nave dos
antigos Dias 1 a 5 do Desafio agora é o curso separado **Nave Contra Asteroides**. O certificado
pertence ao novo **Desafio do Primeiro Jogo — A Chave do Farol**, com três dias de
construção; a apresentação do jogo e o caderno abrem o Dia 1. Seus quatro trios editoriais já estão nesta pasta; as gravações ainda são planejadas. O curso gratuito
de procurar personagens escondidos, **Cadê Todo Mundo?**, tem seus três trios de autoria nesta pasta. Nele, o certificado
encerra a experiência sem pitch de venda; a oferta do Desafio fica em uma landing page externa à
área infantil e a decisão de compra cabe ao responsável.

**Farol ampliado em 06/10/2026:** quatro aulas, vinte seções e dezenove vídeos. A escolha de velocidade saiu; o Dia 3 reúne personagens, cenários, barcos, chaves, pares de faróis, avisos e posição da chave, com galerias no Mapa da Aventura. Ver [sequência e implantação](modulos-desafio-primeiro-jogo.md).

**Relatório consolidado (documento para ler e comentar):**
https://claude.ai/code/artifact/2a29a025-3a65-4c66-858b-afefacaa34df

**Nave Contra Asteroides revisado em 05/10/2026:** nove aulas, 52 seções e 48 vídeos planejados. O [mapa do curso](modulos-nave-contra-asteroides.md) reúne a sequência, os roteiros, o caderno e as orientações de implantação. O jogo original e os cinco identificadores existentes foram preservados. A [conferência da retomada](qa/revisao-nave-2026-10-05.md) registra os ajustes e a validação local.

**Corre, Dino! revisado em 05/10/2026:** 13 aulas, 81 seções, 76 vídeos planejados, 24 experiências e cinco quizzes. O [mapa atualizado](modulos-corre-dino.md) reúne a sequência, o caderno e a aplicação das diretrizes. Os 13 identificadores e programas originais foram preservados. A [revisão local](qa/revisao-corre-dino-2026-10-05.md) registra as verificações e as etapas de produção pendentes.

**O Jogo do Meu Jeito revisado em 05/10/2026:** oito aulas, 54 seções, 50 vídeos planejados, 14 experiências e quatro quizzes. O [mapa atualizado](modulos-o-jogo-do-meu-jeito.md) reúne o percurso no Pinta e no Estúdio, o caderno e as entregas pela galeria. Os oito identificadores e o programa original foram preservados. A [revisão local](qa/revisao-meu-jeito-2026-10-05.md) discrimina verificações e produção pendente.

## O resultado

Levantamento histórico feito antes da separação dos cursos. A tabela abaixo registra as 28 aulas
anteriores e não representa o catálogo atual, que tem **37 manifestos**: nove de Nave Contra
Asteroides, quatro do novo Desafio, três do gratuito, treze de Corre, Dino! e oito de O Jogo do Meu
Jeito. As colunas de conteúdo anterior cobrem apenas as 27 aulas levantadas antes da inclusão do
encerramento do antigo Desafio.

| Curso | Aulas | Seções anteriores | Propostas | Clipes anteriores | Propostos |
|---|---:|---:|---:|---:|---:|
| Antigo Desafio do Primeiro Jogo (levantamento anterior à separação) | 7 | 78 | 58 | 61 | 47 |
| Corre, Dino! | 13 | 127 | 92 | 86 | 73 |
| O Jogo do Meu Jeito | 8 | 76 | 57 | 55 | 49 |
| **Total** | **28** | **281** | **207** | **202** | **169** |

As 11 cenas anteriores foram construídas e os defeitos do catálogo, corrigidos. As cenas de toque e
contagem do gratuito, a porta do farol, a experiência de memória, o andar do personagem e a posição da chave do Farol elevam o catálogo de 56 para **62 cenas**. Os **37 manifestos**
passam no validador, sem nenhuma aula esperando cena. O novo Desafio ainda precisa das gravações,
dos anexos no admin e de ensaio no navegador antes de qualquer publicação.

## O que tem nesta pasta

| Arquivo | O que é |
|---|---|
| `DIRETRIZES-PEDAGOGICAS.md` | Referência única das regras, justificativas, variações por curso e conferência. **Primeira leitura para qualquer curso.** |
| `BRIEFING.md` | Guia para preparar a análise, fazer a triagem dos conceitos e registrar decisões; encaminha às Diretrizes Pedagógicas. |
| `CATALOGO-CENAS.json` | As **62 cenas** que existem hoje, extraídas do código da plataforma, com título, o que manipulam, metas, pistas e roteiro de demonstração |
| `REFERENCIA-PLATAFORMA.md` | **Onde cada coisa está na plataforma hoje**, lido direto do código, com a fonte citada por linha: o menu da esquerda, o recolhimento dele na aula e na ferramenta, a cor do perfil, as três ações de plataforma, os grupos do menu ⋯ do Estúdio, a lista de projetos e o Pinta. Toda fala que nomeie menu, tela ou botão confere aqui |
| `REFERENCIA-BLOCOS-JOGO-2D.json` | Os **285 tipos** da paleta do Jogo 2D, extraídos do código: família, seção, todas as linhas do rótulo, cada campo com o padrão de fábrica e a lista de cada menu na ordem da tela |
| `ESPEC-ROTEIRO.md` | O contrato do roteiro de gravação: tarefa na primeira fala, passo a passo completo, linguagem direta, notas de produção separadas e tutoriais de interface no Como Fazer |
| `autoria-aula-roteiro/SKILL.md` | Cópia versionada da skill local de roteiro, revisada com a mesma direção de linguagem |
| `ACHADOS-TRANSVERSAIS.md` | Os defeitos encontrados durante a análise que **não** são redesenho: critérios que reprovam quem faz certo, passo perdido, rótulos vencidos, seções duplicadas, documentação desatualizada |
| `ESPEC-MANIFESTO.md` | O contrato do `manifesto.json`: schema real do importador, a regra das duas colunas do player, a convenção do título de vídeo e a fila de dependência entre cena e aula |
| `blocos-*.json` | Identificadores dos blocos de programação usados em cada curso, no formato `{ "blocks": [...] }` |
| `modulos-*.md` | Título e descrições de cada curso, com o resumo dos módulos e as aulas na ordem |
| `aulas/` | O **trio de cada aula**: a proposta (`{slug}.md`), o manifesto importável (`{slug}.manifesto.json`) e o roteiro de gravação (`{slug}.roteiro.md`). Há 37 trios no catálogo atual |
| `cenas/` | **O material para corrigir as cenas antes de mexer nas aulas.** As 11 cenas novas com especificação completa, e os ajustes das 28 cenas existentes, tudo organizado por cena e não por aula. Comece pelo `RELATORIO-CENAS.md` |

As descrições de curso e os resumos de módulo em `modulos-*.md` são textos para a área Kids. Ao
configurá-los no admin, fale diretamente com quem faz o curso: use “você” e “seu jogo”, sem se
referir à pessoa como “a criança” ou “o aluno”, e com o vocabulário da aventura (aventura, fase,
parte, Mundo, Mapa da Aventura e equipe), porque é a criança quem lê. Os rótulos de botão que as
falas citam são os do Kids: **Próxima parte**, **Concluir fase**, **Verificar esta parte** e
**Enviar meu projeto** (na galeria, **Enviar (1)**) ([Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md), seção 6, e
[referência da plataforma](REFERENCIA-PLATAFORMA.md), seção 9).

**Caderno em cada curso:** o caderno, que a criança conhece como **Mapa da Aventura**, é
apresentado na seção 2 da primeira aula, depois do vídeo de abertura e antes da primeira
atividade. A seção usa um vídeo curto e um bloco de materiais; 90% do vídeo
conclui a seção, sem exigir download. O vídeo apresenta o caderno à pessoa, diz quando consultar
e oferece as escolhas como convite: ler ali mesmo ou clicar em **Baixar** para guardar. Não dizer
que ela não precisa baixar ou imprimir. Controles de leitura e o passo a passo do download ficam
no Como Fazer. O PDF é anexado no admin antes de gravar o vídeo. A regra para os próximos cursos
está nas [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md), seções 5 e 6.

## Como ler uma análise de aula

Cada arquivo em `aulas/` segue a mesma estrutura:

1. **Resumo.** Estado de entrada, vitória do dia, seções e clipes antes e depois.
2. **Triagem dos conceitos.** Todo conceito que a aula ensina, incluindo os que NÃO ganham cena, com a justificativa de cada decisão.
3. **Diagnóstico do desenho atual.** O que está errado hoje, com as seções citadas pelo título.
4. **Proposta final.** Seção por seção, com intenção, motivo de existir, critério de conclusão e os blocos com seu conteúdo.
5. **Experiências e demonstrações.** Cada cena, dizendo se existe e serve, existe e precisa de ajuste (qual e por quê) ou precisa ser criada (especificação completa).
6. **Vídeos.** Tabela com chave, o que mostra, origem, duração alvo e se reaproveita gravação.
7. **Continuidade.** O que a aula assume da anterior, o que entrega para a seguinte e os valores canônicos.

As referências de linguagem são Cadê Todo Mundo? e A Chave do Farol. Nave Contra Asteroides aplica essa direção em nove aulas; consulte [o mapa atual](modulos-nave-contra-asteroides.md). A aula final de certificado tem
um fluxo próprio de conclusão, descrito em `aulas/desafio-certificado.md`.

## Os manifestos

Cada aula tem, ao lado do relatório, um `aulas/{slug}.manifesto.json` pronto para importar no admin
pela função "Importar roteiro com seções". Os manifestos usam a versão 5, com as seções novas e o
conteúdo dos blocos de autoria no próprio arquivo. Os vídeos continuam planejados até serem
vinculados no admin.

Três coisas que o formato impôs ao desenho, e estão explicadas no `ESPEC-MANIFESTO.md`:

1. **A coluna da direita é do player, não do manifesto.** Só cena nativa e Estúdio ou Pinta
   embarcado vão para lá, e só um por seção. Pergunta curta e experiência em HTML ficam à esquerda.
   Várias seções precisaram virar duas por causa disso, e cada caso está registrado no relatório da
   aula.
2. **O formato não tem campo de título de vídeo.** A convenção travada é que a primeira linha do
   bloco de vídeo planejado é `Título: <nome>`, seguida de linha em branco e das instruções de
   produção.
3. **A fala do Zappy tem teto de 400 caracteres e limite de uma por seção.** Se ficou longa demais,
   reescreva ou leve o conteúdo ao vídeo; não divida em dois balões.

### Conferir os manifestos

```bash
cd C:\Users\tocha\projects\sistema-zero && bun docs/aulas-interativas/qa/validar-manifestos.ts
```

O validador usa o `isLearningManifest` real do core, o mesmo que o importador usa, e separa três
resultados: `OK`, `FALHA` (com a causa apontada campo a campo) e `AGUARDA`, que é a aula esperando
uma cena ainda não construída. A lista de `AGUARDA` é a fila de dependência entre a implementação
das cenas e a importação das aulas.

Para implantar a aula final do Desafio sem perder a configuração do certificado, seguir
`IMPLANTACAO-DESAFIO-ENCERRAMENTO.md`.

## Ordem de execução recomendada

Tudo em staging. A promoção para produção fica para depois de as aulas estarem redondas.

1. ~~Corrigir os defeitos do catálogo de cenas~~ feito
2. ~~Construir as duas ações novas do motor e as 11 cenas novas~~ feito, catálogo em 56
3. ~~Escrever os 28 manifestos~~ feito, os 28 passam no validador
4. ~~Escrever os roteiros de gravação~~ feito, 28 roteiros e 169 clipes planejados
5. Consertar o que quebra hoje, e o que a plataforma aposentou (ver `ACHADOS-TRANSVERSAIS.md`)
6. Gravar os 169 clipes, incluindo o pitch da aula final do Desafio

Por curso: Desafio primeiro (tem aluno pagando), depois Meu Jeito (mais barato e o que mais
melhora), depois Corre Dino (o maior).

## A regra do trio

Cada aula tem três arquivos, e eles descrevem a mesma aula de três ângulos: a proposta diz o porquê,
o manifesto diz a estrutura, o roteiro diz a fala. **Mudou num, muda nos três.** Tirar um bloco do
manifesto sem tirar o clipe do roteiro deixa a gravação com um trecho órfão; corrigir a fala sem
corrigir a proposta faz o próximo leitor reabrir a decisão já tomada.

A lista do que obriga varredura nos três está na seção 9 do `ESPEC-MANIFESTO.md`.

## Cópia versionada

O redesenho original também tem uma cópia em `fluxo-criativo`. A aula final do Desafio foi criada
nesta pasta versionada do `sistema-zero`; as contagens e o validador acima se referem a ela. Antes
de sincronizar materiais entre as duas pastas, comparar as mudanças para preservar esta aula.
