# Arquipélago: nova conferência das entregas das outras sessões

> Registro histórico das bases citadas, em 31/10/2026. Este levantamento não representa o estado atual da implementação ou das implantações.

Data: 31/10/2026. Base inicial: `staging`, `0660b62fd`. Base final da conferência: `542249c2f`. Referência da revisão anterior: `f62ab0807`.

## Resultado

O plano avançou bastante. Python e Pro chegaram ao cliente do jogo e passaram a exigir o curso-base. Também chegaram os sistemas de iglu, andar de cima, terreno editável, percurso externo do Farol, fósseis, jardim, novos segredos, aparências da galeria e Lumis de luz.

Isso não equivale a concluir o plano. Há problemas reproduzidos de continuidade e construção, uma correção incompleta dos critérios do projeto autoral, conteúdo pedagógico ainda por revisar e documentos de estado que ficaram para trás. Esta conferência não retomou a implementação nem alterou código de produto.

### Local e remoto

No começo, depois de `git fetch origin staging`, o remoto consultado ficou em `a9d91457c`. Havia dois commits exclusivos de cada lado:

- Local: implementação B8 `5335f0f9a` e merge `0660b62fd`, com Lumis de luz e roupas das festas.
- Remoto: ajuste de arte do chapéu `hat-08`, `c5c22495c`, e merge `a9d91457c`.

Durante a revisão, outra sessão integrou B7c (`f2f441cf6`) e conciliou as duas pontas em `542249c2f`. Na nova consulta, local e `origin/staging` estão iguais, sem commits exclusivos. B8 já está incluído em ambos. Não fui eu quem fez esse commit, merge ou envio. Revi o diff adicional e repeti as reproduções dos defeitos na árvore nova.

## Conferência dos achados anteriores

| Achado anterior | Estado nesta base | Evidência |
| --- | --- | --- |
| R1, Farol aprova ações que não acontecem | Corrigido parcialmente | `gameCausality` rejeita `Se falso` literal, mas aceita as mesmas ações atrás de uma variável sempre falsa. Reprodução N3 abaixo. |
| R2, Python/Pro recusados pelo cliente | Implementação entregue | `42a908ffa` liga autorização e execução; `d1a14b2ce` atualiza a release Python; `e99575ab2` acrescenta `falta-curso` e o curso-base informado pelo Members. Os testes dirigidos passaram. Aceite hospedado continua separado. |
| R3, pausa e movimento reduzido do pet | Corrigido no código | Rotação e animação param na pausa; o pet considera a preferência do aparelho e do jogo. B1 acrescenta caminhada e corrida. Suíte do jogo passou. |
| R4, lint | Corrigido no recorte conferido | Biome passou nos 531 arquivos TS, TSX e JSON existentes alterados desde a revisão anterior, excluindo metadados de migrations. |
| R5, documentos de estado | Voltou a ficar desatualizado | O índice vigente ainda diz V20, 54/130 entradas e criação avançada pendente. A base é V22 e tem 96/132 entradas marcadas para publicação. |
| Visitas de amigos, achados da outra revisão | Correções presentes | `83a9dfbab` invalida aceites ao trocar o convite, revalida acesso depois das leituras e serializa o limite de casas. Li o diff e as regressões adicionadas. Não repeti os ensaios em Postgres nesta revisão. |

## O que entrou desde a revisão anterior

Os identificadores A01/C01/E04 do plano original não são os mesmos A1/A2/B1 do levantamento v3. A tabela evita misturar essas numerações.

| Frente do plano original | Entregas posteriores conferidas | Situação |
| --- | --- | --- |
| C01/C02, currículo e linguagens | Python/Pro no diálogo; curso-base obrigatório para desafios textuais; indicação de onde aprender; sexto quadro na linguagem do posto; pedido do Nico no Estúdio; publicação seletiva | Avançou muito. Conteúdo dos lotes A9 ainda falta. |
| C03, autoria no Farol | Critérios causais no lugar da simples presença de blocos | Precisa corrigir N3 e elevar o desafio ao repertório da Lenda. |
| E02, exploração | Nove segredos com páginas; novos percursos de cipó, mergulho, patins, montaria e balão; atalhos pelos telhados; segredo como terceira estrela | Implementado localmente. Atalhos não têm verificador próprio de navegador registrado. |
| E04, construção avançada | Documento de obra separado, iglu, segundo andar, terreno editável e subida externa do Farol | Código entregue, com N1/N2 e limites de integração descritos abaixo. |
| Casa e criação | Pinta no posto previsto; abrir o editor do quarto e reler ao voltar; escolher criação própria que cabe no molde; galeria com três versões por objeto | Implementado. A nova galeria tem 27 aparências. |
| Mundo e história | Farol acende no final; carta de boas-vindas; página do Recife; ilha inicial desbotada; morador na luneta; névoa; borrões e ondas de cinza | Implementado nos lotes A1/A2 da lista v3. |
| Cuidado e companhia | Rotinas durante ausência, chuva retroativa limitada, explicação dos relógios, humor visível, Nico morador/carteiro, filhote como companhia | Implementado nos lotes A3/A5. |
| Cozinha e economia | Peixe com coco, pedidos de pratos, venda na feira, receita do extra, bônus da geladeira, créditos que aguardam semana seguinte, roupas conquistadas | Implementado no código. Fluxos dependem de serviço, Members e migrações compatíveis implantados. |
| Arte e coleções | Pets animados; barraca/quiosque de minijogos; móveis de café/festa; fósseis; jardim do céu; florada; sete Lumis de luz; oito roupas de festa | B1/B2/B3/B5/B6 e B8 presentes, já conciliados no local e no remoto consultados ao fim. |
| Medição | Tentativas, dicas e envios; leitura de compras; painel administrativo | Avançou no lote A8. Não resolve automaticamente o cartão semanal dos pais. |
| Q01, qualificação | Mais testes e verificadores locais, registros de importação | Continua parcial. Prova local, publicação e uso autenticado são evidências diferentes. |

Na lista A v3, os lotes 1 a 8, incluindo 4b e 5b, têm implementação registrada. O A41 que faltava no lote 6 foi atendido pelo B6. Os lotes 9, 10 e 11 ainda precisam trabalho. Uma exceção importante: A28 já avançou no B8, com regra explícita e obtenção determinística de Lumis de luz por baús, sem compra ou sorteio. Não é correto repeti-lo como totalmente ausente.

Na lista B, não há lote B4 na numeração do documento. B7 foi implementado em `6ee28cb35` e `9e114f324`. Sua linha de conclusão, inicialmente ausente, entrou durante esta revisão, junto de B7c. Esse complemento torna a escada visível no térreo, ajusta a geometria de reserva durante carregamento, liga a porta de lambri e corrige o verificador de navegador. Esses problemas não devem ser reabertos como pendências depois dessa integração.

## Ajustes necessários nas entregas

### N1. Alta: resposta perdida pode apagar alterações recentes da obra

Fontes: `packages/arquipelago/src/estado/obra-estendida.ts`, especialmente `adotar`, a resposta 409 em `enviar` e a comparação de revisão em `ler`.

Reprodução com a loja real e a plataforma falsa, sem banco:

1. Editar terreno A e iniciar a gravação sobre revisão 0.
2. O serviço falso confirma internamente A como revisão 1, mas a resposta ainda não chega.
3. Fazer uma segunda edição B no jogo.
4. Simular perda da resposta da primeira gravação.
5. Reler a obra, como ocorre na recuperação.

Antes da releitura, o jogo e seu registro local têm A+B. Depois, ficam só com A; o registro pendente é apagado. Aparece a mensagem de mudança em outro aparelho, embora nenhum outro aparelho tenha participado.

Saída observada:

```text
apos falha: alturas [[1,1,1],[2,1,1]], pendentes 1
apos reabrir: alturas [[1,1,1]], pendentes 0
A obra mudou em outro aparelho. Ficou a versão mais nova.
```

O código trata qualquer revisão remota diferente como motivo para descartar o trabalho local. O teste atual de falha de rede falha antes de o serviço gravar, portanto não cobre resposta perdida depois da gravação. O plano E04 previa diário e resolução de conflito, não descarte irreversível.

**Ajuste:** preservar a cópia pendente, reconhecer o envio já aplicado e reaplicar apenas as alterações posteriores sobre a revisão reconhecida. Em conflito real, manter uma recuperação possível. Acrescentar regressões para gravação confirmada no servidor com resposta perdida, edição durante envio e reabertura. Prova: `.cache/revisao-31-obra.ts`.

### N2. Alta: Desfazer no térreo pode esconder todo o andar de cima

Fontes: `packages/arquipelago/src/estado/construcao.ts:468` e `:490`; `packages/arquipelago/src/mundo/andar-de-cima.tsx:30`.

`aplicar` verifica se a mudança no térreo preserva o andar superior. `desfazer` restaura diretamente a obra anterior, sem essa verificação. Os históricos separados permitem esta sequência:

1. Construir a sala à esquerda do quarto, fechando suas três paredes externas.
2. Pôr a escada nessa sala.
3. Selecionar Parede e usar Desfazer.

A última parede some, o cômodo abre e `conferirAndar` passa de `null` para `quebra-o-andar`. A escada continua guardada. `useAndarDaCasa` então devolve `null`, retirando o andar inteiro do mundo.

Reproduzi a sequência pelas APIs reais da loja do Construir. Isso não é exclusão do documento superior, mas é uma perda visível e inesperada da construção.

**Ajuste:** validar também desfazer/restauração ou coordenar os históricos dos dois andares de modo atômico. Acrescentar teste de desfazer no térreo depois de construir em cima. Prova: `.cache/revisao-31-desfazer.ts`.

### N3. Alta para avaliação pedagógica: o Farol ainda aceita ações impossíveis

Fontes: `packages/core/src/learning/game-causality.ts:120` e `docs/desafios-do-jogo/farol/projetos.ts:191`.

A correção anterior resolve condições literais. Porém, `liveChildren` avalia as condições sem o ambiente das variáveis (`NO_VARS`). Uma condição desconhecida é percorrida como se pudesse acontecer.

Reprodução a partir do gabarito:

- Criar `podeAgir = falso` no início e nunca alterar essa variável.
- Envolver o corpo de cada evento em `Se podeAgir`.
- Preservar o movimento, reconstruir o workspace e gerar os arquivos pelo gerador real.

O IR continua válido e todos os cinco critérios causais passam: encontro, memória, decisão, reinício e remoção. Com `Se falso` literal, os cinco falham corretamente. A diferença sintática não muda o comportamento impossível.

Também rodei o projeto modificado no executor real, com Chrome. O único objetivo de execução, movimento, passou. Assim, passam tanto o movimento quanto os cinco critérios causais, embora os eventos estejam bloqueados pela variável falsa. O ensaio usa o mesmo gerador, instrumentação e executor do teste existente, sem modificar o manifesto.

**Ajuste:** observar consequências reais ou fazer análise de fluxo consistente com valores e atribuições. Os negativos devem incluir variável sempre falsa e outras ações inalcançáveis. Não basta acrescentar uma exceção para este nome de variável. Provas: `.cache/revisao-31-farol.ts` e `.cache/revisao-31-farol.json`.

### N4. Média: subida física e final continuam sendo fluxos separados

Fontes: `packages/arquipelago/src/mundo/subida-do-farol.tsx`, `mundo/corrida-na-ilha.tsx` e `mundo/final-do-farol.tsx:112`.

O novo percurso externo existe e registra escada, bordas, equilíbrio e corrente de ar. Entretanto, a porta no térreo continua oferecendo Subir o Farol e carregando diretamente a sala do alto. A conclusão do percurso usa o resultado genérico da corrida e não abre a última página nem oferece essa transição no topo.

Isso entrega um percurso adicional, mas ainda não une a aventura física ao desfecho como a proposta descreve. É uma lacuna de integração narrativa, não motivo para remover uma alternativa acessível.

**Ajuste:** dar continuidade explícita do topo para a sala/última página e distinguir a alternativa direta na porta. Provar o percurso completo até o final; apenas conferir que a escada foi registrada não prova essa experiência.

### N5. Média: fontes de estado contradizem a implementação atual

`docs/arquipelago-estado-atual.md` ainda declara V20, 54 de 130 entradas, falta de curso como pendência e criação avançada por implementar. Também continua listando os três defeitos de visitas já tratados em `83a9dfbab` e baús sem conteúdo, apesar das páginas e Lumis.

`docs/arquipelago-regras.md` ainda diz, na lista B, que a subida ficará escondida até B7, embora B7 esteja integrado. O plano E04 continua inteiramente como espera por arte. O registro de B7 na lista B foi corrigido durante esta revisão; os outros registros citados continuam defasados.

**Ajuste:** atualizar a matriz vigente e marcar os planos de espera como históricos, preservando os números e resultados de cada base. Registrar migrações e provas operacionais à parte. Evitar iniciar de novo trabalho já entregue.

## O que efetivamente falta do plano

### Conteúdo pedagógico, lote A9

- Vila/Inventor: aplicar pulo com gravidade, obstáculos e dificuldade, conforme decisão registrada.
- Bosque/Construtor: aprofundar grupos, vidas, derrota e reinício; não ficar apenas no repertório inicial.
- Vale e Nuvens: resolver os requisitos sem fonte curricular nos quadros identificados no levantamento.
- Reescrever pedidos e objetivos que ainda ditam a solução ou descrevem metas genéricas.
- Recife/Pico em Python: tema próprio da ilha, sem repetir o tema das missões.
- Pico em blocos: fases e níveis no recorte previsto.
- Farol/Lenda: desafio autoral na linguagem escolhida, com exigência coerente com o posto e avaliação confiável.

### Família e arquitetura, lote A10

- CSP específica e mínima para o jogo no Kids; hoje `arquipelagoCsp = proCsp`.
- Cartão dos pais por criação e por semana; `objetosCriados` ainda lê o acúmulo de aparências no salvamento, sem janela temporal.
- Corrigir Tudo começa desligado, que contradiz as permissões padrão para irmãos.
- Compatibilidade atual/anterior do contrato: host e jogo continuam exigindo versão exata.
- Teste de fronteira: o leitor ainda usa expressão regular para aspas simples e não cobre `require`; ampliar também a verificação da fronteira compartilhada com avatar-quarto.
- A28: a regra contra sorteio pago e o caminho dos Lumis de luz já existem. Falta consolidar sua evidência no plano e proteger a regra com cobertura explícita se esse for o critério de fechamento do lote.

### Construção, acabamento e qualificação

- Corrigir N1/N2 antes de tratar a obra estendida como segura para uso contínuo.
- O andar superior tem paredes, portas, janelas e pisos, mas não oferece Móveis nem objetos. O plano E04 previa objetos; registrar como escopo reduzido ou completar essa parte.
- Conectar a subida do Farol ao desfecho e provar o trajeto completo.
- Atualizar os documentos, lote A11/A05.
- Repetir fluxo autenticado dos dois públicos: curso, desafio, executor, aprovação, recompensa, minijogo e reabertura. Conferir criação própria, compras e continuidade com as versões realmente implantadas.
- Validar toque, legibilidade e desempenho em celular físico. Emulação e testes de regras não substituem isso.
- Noite das Lanternas segue sem data aprovada. Não é um erro de código nem pede data inventada.

## Catálogo local e entrega operacional

Contagem dos JSON com escopo ilha, somando Kids e adulto:

| Local | Entradas | Com publicar=true |
| --- | ---: | ---: |
| Sua ilha | 14 | 14 |
| Bosque | 18 | 16 |
| Vila Doce | 18 | 0 |
| Recife | 20 | 20 |
| Pico | 20 | 20 |
| Vale | 20 | 6 |
| Nuvens | 20 | 18 |
| Farol | 2 | 2 |
| Total | 132 | 96 |

`publicar: true` é intenção no arquivo, não prova de disponibilidade para uma conta. A suspensão da Vila e dos conteúdos sem fonte curricular deve ser preservada até a correção.

O plano `docs/superpowers/plans/2026-10-31-arquipelago-importacao-execucao.md` registra importação e exportação dos 130 desafios em staging depois de `18c93aec8`. Registra também timeout de Python do Pico em produção, ajuste de capacidade do executor e etapas operacionais ainda abertas. Não consultei nem gravei bancos remotos. O registro de 130 itens nessa base não certifica as 132 entradas atuais.

## Verificação desta revisão

- `bun test`, em arquipelago, na base inicial `0660b62fd`: **1.999 passaram, 1 ignorado, 0 falhas**, 214 arquivos. O ignorado depende de Postgres para a recuperação da fila. Depois da integração B7c, repeti os quatro arquivos afetados: **116 passaram, 0 falhas** (`andar-de-cima`, `casa-andar`, `obra-estendida` e `faces-coplanares`). Esses 116 se sobrepõem à suíte anterior; não são um total adicional de testes exclusivos.
- `bun test`, em arquipelago-contracts: **257 passaram, 0 falhas**, 51 arquivos.
- Testes dirigidos de `game-causality`, diálogo de desafio, leitura curricular do Members e objetivos Python/Pro: **32 passaram, 0 falhas**, cinco arquivos.
- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit`, em arquipelago: **passou**, inclusive depois de B7c.
- Biome nos 531 arquivos TS/TSX/JSON do diff selecionado: **passou**, sem alteração automática, repetido na base final.
- Reproduções N1/N2/N3 executadas localmente. As suítes passarem não invalida os cenários adicionais que reproduziram defeitos.
- Executor real do Farol com a variável sempre falsa: **1 teste passou, 5 asserções**. O movimento preservado passa corretamente; o defeito está nos cinco critérios causais que também aprovam as ações bloqueadas. Juntos, os dois ensaios mostram que esse projeto inválido pedagogicamente satisfaz os objetivos.
- Navegador na base final: **passou**, computador 1280 × 800 e celular emulado 390 × 844. Subida real da escada e do morrinho, sustentação do piso superior, guarda-corpo e ferramentas de construção; no celular, piso superior e painel sem transbordamento horizontal. Farol: somente registro da escada e personagem de pé na base, não o percurso completo até a última página.

A primeira execução do navegador, com o verificador de `0660b62fd`, falhou na escada: o teleporte punha o centro do corpo dentro do piso. A outra sessão corrigiu o verificador em B7c. A repetição da versão nova passou. Não classifiquei essa falha antiga do ensaio como defeito atual da escada.

Capturas, valores medidos e comandos estão em [QA desta revisão](../docs/qa/2026-10-31-revisao-dos-lotes/README.md). O medidor registrou 1 quadro/s em uma amostra do navegador automatizado desta máquina. Não é uma comparação antes/depois nem uma medição de celular físico, portanto não certifica desempenho.

Logs locais em `.cache/revisao-31-*.log`. Nesta revisão não executei a suíte inteira de Members, member-shell, API ou testes de banco. Não certifiquei produção, celular físico nem desempenho. As verificações dessas áreas mencionadas nos commits anteriores são evidência da outra sessão, não uma nova execução minha.

## Ordem recomendada para a retomada

1. Recuperação da obra estendida e integridade do Desfazer, N1/N2.
2. Critérios do Farol, N3, e integração do percurso com o final, N4.
3. Conteúdo pedagógico do lote A9, preservando as suspensões até haver prova.
4. Família/arquitetura e fechamento da documentação, A10/A11.
5. Qualificação integrada com ambiente publicado e celular físico, Q01.

Não identifiquei um novo pedido de Blender necessário para corrigir N1 a N5. As pendências antigas de arte não devem ser reenviadas sem conferir a entrega de 31/10. O que foi criado nesta revisão se limita ao relatório, evidências locais e capturas de QA.
