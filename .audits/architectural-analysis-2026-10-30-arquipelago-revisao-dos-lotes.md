# Arquipélago: revisão do plano depois das outras sessões

Data: 30/10/2026. Base conferida: `staging`, `f62ab0807`. Comparação com `5012f01dd`, o envio da nossa última etapa antes da pausa. Na consulta feita nesta revisão, staging local e origin/staging estavam iguais, sem commits exclusivos de nenhum lado.

## Conclusão

Houve avanço importante e aproveitável. Os novos sistemas de exploração, vida nas ilhas, construção e galeria estão integrados. Porém, o plano inteiro ainda não está concluído. Conteúdo na linguagem dos postos, liberação curricular, criação avançada e qualificação integrada continuam parcialmente entregues.

A revisão encontrou um erro pedagógico reproduzido no executor do Farol, uma lacuna funcional explícita em Python/Pro, um ajuste de movimento reduzido no pet, erros de lint e registros de estado desatualizados. Nenhum código de produto foi alterado nesta revisão. A implementação continua pausada.

## O que foi implementado do plano

| Lote | Situação conferida | Implementação e ressalva |
| --- | --- | --- |
| A01 a A04 | Mantidos | Descarte, preservação da cor, pausa/leitura/ritmo e prioridade do guia eram entregas anteriores. A suíte atual do jogo passou. |
| A05, documentação | Parcial | Regras receberam novas seções, mas o índice canônico e partes do levantamento divergem do código atual. Ver achado R5. |
| A06, medição | Mantido | A correção anterior continua integrada. Medição de criação e compra e qualificação operacional não passam a estar concluídas por isso. |
| C01, coerência curricular | Avançou, parcial | C01f impede objetivos já cumpridos pelo inicial (`fc9b9ac10`). Recife, Pico, Vale e Nuvens receberam ajustes de repertório (`956bcfe5e`). Ainda há conteúdo suspenso e falta aplicação completa do Inventor. |
| C02, Python/texto/Pro | Parcial | Contrato, Members e Admin aceitam novos formatos (`79c2df4a9`); quatro desafios têm inicial, solução e negativos (`6cf4d7b26`). O cliente do jogo ainda recusa Python e Pro. Todos os oito manifestos novos, contando públicos, estão desmarcados para publicação. |
| C03a, Faísca | Implementado localmente | Pega-conchas, seis quadros por público e cavalete na praia (`7a95991ea`). Publicação real não comprovada. |
| C03b, autoria após Farol | Implementado, precisa ajuste | Projeto autoral e cavalete depois do final (`ca1ccf83b`). Critérios admitem ações sem efeito, conforme reprodução R1. |
| E01, praia | Mantido e ampliado | Coleções e pesca anteriores; acrescentadas iscas e coleções do Pico/Nuvens (`72ed067dc`). |
| E02, exploração | Parcial | Rede de barcos anterior; três percursos na V19, mapa revelado ao andar (`0e7236050`), chaves (`32f155177`) e baús acessíveis pelo planador (`6238451e1`). Os baús registram descoberta, mas não entregam o conteúdo prometido pela proposta. |
| E03, fantasma familiar | Mantido | Serviço, autorização e reprodução já estavam integrados. Ciclo autenticado permanece na qualificação. |
| E04, criação avançada | Parcial | Quintal ampliado (`92aea3551`), 21 móveis e V20 (`74a0e1d43`), modo livre e seis vagas na galeria do Farol (`20b312aa1`). Iglu, segundo andar, terreno editável e subida final ainda faltam. |
| S01, companhia/social/calendário | Avançou, parcial | Escolha entre pet do quarto e bicho adotado (`a40283108`), visitas entre famílias e fotos moderadas; festa de fim de ano implementada. Lanternas continuam sem data ativa. Pet precisa do ajuste R3. |
| Q01, qualificação | Parcial | Há testes e verificadores locais, inclusive relatório de memória. Ainda falta o ciclo autenticado completo das duas comunidades, publicação/importação e aparelho físico. |

Também entraram os itens novos do levantamento: Lumis e borrões nas sete ilhas, lanterna inicial, cena de promoção, horta em horas com primeiro pedido rápido, clima natural, resumo do dia e tolerância no encerramento do tempo. São implementações reais, não apenas itens marcados em documento.

## Ajustes necessários

### R1. Alta: o projeto autoral do Farol aprova ações que nunca acontecem

Fonte: `docs/desafios-do-jogo/farol/projetos.ts:181`, especialmente os critérios `usesBlock` a partir da linha 193.

Só o movimento é conferido durante a execução. Encontro, informação guardada, decisão, reinício e extra são conferidos pela presença de blocos. Reproduzi o problema a partir do gabarito: envolvi o corpo de cada evento em `Se falso`, preservando o movimento. O IR continua válido; os cinco critérios de estrutura passam. O executor real, em Chrome, também aprova o movimento desse projeto. Na prática, a pessoa pode receber aprovação sem guardar a informação, sem reiniciar e sem fazer algo desaparecer.

O teste existente diz que cobre erros causais, mas seus cenários são apenas o gabarito e o inicial. O teste de estrutura alternativa troca nomes e desenhos, sem quebrar o comportamento.

**Ajuste:** manter liberdade de tema, mas definir evidências observáveis para as ações pedidas. Os testes negativos precisam incluir encontro que não produz efeito, condição que nunca produz a consequência e tecla que não reinicia. Só renomear as metas como presença de blocos não resolve o objetivo pedagógico.

Prova desta revisão: `.cache/review-farol.ts`, `.cache/review-farol-projeto.json`, `packages/studio-runtime/.cache/review-farol-browser.test.ts` e `.cache/review-atual-farol-executor.log`. O ensaio descartável não alterou o manifesto.

### R2. Alta para conclusão do lote: Python e Pro ainda não chegam a quem joga

Fonte: `packages/member-shell/src/components/arquipelago-challenge-dialog.tsx:72`.

O diálogo lança erro para `programmingLanguage === 'python'` ou `kind === 'pro'`. A implementação de servidor e os pacotes são úteis, mas não completam a experiência. Isso está reconhecido no plano C02 e não deve ser tratado como mera pendência de deploy.

Além disso, Python e Pro retornam requisitos de blocos vazios e, conforme a matriz de conteúdo, ficam condicionados à ilha. Isso não substitui comprovar que a pessoa já aprendeu as competências do desafio. Os novos desafios são diários; os quadros que dão cor permanecem retomadas em blocos. Essa distinção precisa ser intencional no desenho pedagógico.

**Ajuste:** integrar autorização e execução Python e build Pro no diálogo; ligar elegibilidade às aprendizagens necessárias; publicar uma release compatível de Python e regenerar os projetos contra ela. Depois provar abertura, edição, verificação, recompensa e reabertura do minijogo pelo caminho real. O Vale textual já abre na Ponte, mas suas fontes curriculares avançadas ainda estão pendentes na matriz.

### R3. Média: o pet não aplica completamente pausa e movimento reduzido

Fonte: `packages/arquipelago/src/mundo/pet-que-acompanha.tsx:49`, `:70` e `:73`.

O componente congela a posição e o relógio na pausa, mas continua suavizando a rotação. O passarinho recebe oscilação vertical por seno sem consultar a preferência do aparelho ou o conforto do jogo. Isso difere dos componentes que respeitam movimento reduzido.

**Ajuste:** congelar também a rotação durante a pausa e retirar o balanço decorativo com movimento reduzido, preservando o deslocamento necessário para acompanhar. Acrescentar prova com o passarinho: o verificador atual usa o gato, inclusive no caso emulado com movimento reduzido, e não cobre essa oscilação. Achado confirmado por leitura do fluxo; não rodei um ensaio visual específico do passarinho.

### R4. Média: o diff novo não passa no lint obrigatório

`bunx biome check` sobre os 320 arquivos TS, TSX e JSON existentes alterados desde `5012f01dd` encontrou nove erros:

- Dois `lint/suspicious/noThenProperty` em `farol/projetos.ts`, linhas 127 e 134. `then` pertence ao IR, portanto a correção deve respeitar esse formato e o padrão já usado pelo repositório, sem renomear a propriedade do contrato.
- Formatação nos seis manifestos Python do Pico, textuais do Vale e Pro das Nuvens, contando Kids e adulto.
- Formatação em `packages/members/tests/unit/arquipelago-objectives-c02.test.ts:187`.

**Ajuste:** corrigir a fonte/geração de forma determinística e repetir geração, teste de igualdade dos manifestos e lint. Não basta formatar o JSON e permitir que o próximo gerador restaure a divergência. Log: `.cache/review-atual-biome.log`.

### R5. Média: os documentos de estado ainda induzem trabalho duplicado e conclusões erradas

`docs/arquipelago-estado-atual.md:38` ainda não incorpora C01f/C02/C03; na linha 41 deixa autoria/exposição como pendentes, embora a linha 53 registre a galeria pronta. A linha 46 trata fim de ano como desativado, mas `sistemas/festas.ts` já ativa 20/12 a 06/01. Mapa e criação avançada também misturam entregas novas com pendências antigas.

`packages/arquipelago-contracts/CLAUDE.md:4` ainda diz que o schema devolve V18, apesar da seção V20 logo abaixo. O levantamento mantém trechos iniciais de estado antigo junto de anotações novas. A qualificação Q01 mantém uma falha de móveis que não reproduzi nesta base: o verificador passou agora nas duas telas.

**Ajuste:** atualizar a matriz viva por funcionalidade, conservar os registros antigos claramente como históricos e incluir base/resultado da nova prova de móveis. Evitar chamar o C02 de concluído sem a ressalva do cliente.

## O que ainda falta fazer

### Conteúdo e ensino

Inventário direto dos JSONs de escopo ilha nesta revisão:

| Ilha | Entradas Kids + adulto | Marcadas `publicar: true` |
| --- | ---: | ---: |
| Sua ilha | 12 | 12 |
| Bosque | 18 | 0 |
| Vila Doce | 18 | 0 |
| Recife | 20 | 12 |
| Pico | 20 | 12 |
| Vale | 20 | 6 |
| Nuvens | 20 | 10 |
| Farol | 2 | 2 |
| Total | 130 | 54 |

Isso mede arquivos locais, não catálogo publicado. Não há evidência nesta revisão de importação em ambiente remoto. Não se deve simplesmente mudar os 76 restantes para `true`: primeiro resolver repertório, objetivos e ambiente.

- Concluir a aplicação do Inventor: a própria matriz admite que a corrida da Vila ainda não comprova pulo com apoio, colisão e dificuldade.
- Resolver o caminho de Python/Pro e as fontes curriculares do Vale textual, conforme R2.
- Corrigir os objetivos autorais do Farol, conforme R1.
- Fechar publicação dos quadros e diários que estão suspensos, inclusive Bosque e Vila, depois da prova curricular.
- Definir o conteúdo dos quatro baús: hoje a recompensa é o registro do achado no álbum. Lumis raros e páginas adicionais ainda não foram entregues.

### Construção, exploração final e arte

O iglu chegou a ter um commit, mas foi retirado na integração da V20. Não está disponível atualmente. A parte restante de E04 está especificada, não implementada:

1. Iglu: clareira e âncoras `lote-cabana-a/b` no Pico, mais persistência da obra.
2. Segundo andar: piso superior, vão, escada e guarda-corpos, mais regras de construção, colisão, desfazer e salvamento.
3. Terraformação: chão do lote separado e enfeites controláveis, mais edição e colisão da grade de alturas.
4. Subida final: percurso físico no Farol com escada, bordas, equilíbrio, corrente de ar e âncoras. Hoje a entrada na sala do alto não entrega essa aventura.

O documento próprio de obra estendida, com revisão e recuperação local, é proposta no plano E04. Ainda precisa ser construído e testado. Não é uma entrega que fica pronta apenas com novos GLBs. Os pedidos completos já estão em `docs/plans/2026-10-30-arquipelago-pedidos-de-arte.md`; os cinco portos antigos estão recebidos e não devem ser solicitados de novo.

### Operação e qualificação

- Ciclo local autenticado completo nas duas comunidades: curso, desafio, aprovação, cor, recompensa, fliperama, retorno e persistência. Os testes de peças isoladas e plataforma falsa não substituem esse aceite.
- Conferir implantação conjunta de migrações, API, gateway, BFF e jogo. Não foi consultado nem alterado banco remoto.
- Preparar o canal de fotos com aprovação prévia e conferir consentimentos reais entre famílias.
- Importar/publicar conteúdo validado e realizar homologação autenticada.
- Qualificar toque e desempenho em celular físico. Emulação não mede desempenho do aparelho.
- Decidir a data da Noite das Lanternas, que continua desligada.
- A medição ainda distingue aplicação de aparência de autoria/compra; eventos faltantes não foram fechados por estes lotes.

## Qualidade e consistência

Pontos fortes preservados: fronteira entre jogo e plataforma, migrações de salvamento, validação no servidor, prêmio separado da avaliação local, regras puras reutilizadas e explicitação de dependências de arte. O C01f é um bom avanço porque impede cobrar apoio já pronto. A galeria reutiliza aparências e listas de jogos existentes, sem inventar uma segunda biblioteca. Os testes continuam extensos e passaram nesta base.

Na leitura dos fluxos sociais, as visitas conferem permissões das duas famílias e projetam a casa para leitura; fotos exigem permissão e canal com moderação. Rodei os testes do BFF relacionados, mas não repeti a integração Postgres desses serviços nesta revisão.

A principal inconsistência restante é pedagógica e de entrega: conteúdo pronto no servidor pode estar inacessível no jogo; um objetivo com texto de comportamento pode avaliar só a presença de blocos; um lote marcado integrado pode conter dependências importantes ainda abertas. São problemas corrigíveis sem descartar as entregas novas.

## Verificação feita nesta revisão

| Conferência nova | Resultado |
| --- | --- |
| `bun test`, arquipelago-contracts | 226 passaram, nenhuma falha |
| `bun test`, arquipelago | 1.447 passaram, um ignorado de integração Postgres, nenhuma falha |
| `bun test docs/desafios-do-jogo` | 157 passaram, nenhuma falha |
| Members: objetivos, C02, pacotes, repertório e rota interna | 50 passaram, nenhuma falha |
| member-shell: diálogo, host, Clube e rotas | 55 passaram, nenhuma falha |
| `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit`, jogo | Passou |
| Mesmo typecheck, Members | Passou |
| Biome no diff TS/TSX/JSON | Nove erros em 320 arquivos, detalhados em R4 |
| Executor real do Farol com eventos sem efeito | Reproduziu aprovação indevida; inicial continuou reprovando |
| Navegador, móveis | Passou em 1280 × 800 e 390 × 844; caso de computador inclui colocação, aconchego e desfazer |
| Navegador, galeria | Passou nas duas telas; computador inclui gravação e reentrada; celular inclui exposição e painel sem transbordamento |

Logs desta rodada estão em `.cache/review-atual-*.log`. Prints: `packages/arquipelago/.cache/review-moveis/` e `packages/arquipelago/.cache/review-galeria/`. Inspecionei também os prints da sala e do painel da galeria em 390 px.

Limites: revisão dirigida ao plano e aos fluxos novos, não uma declaração de auditoria linha a linha de todo o repositório. Não repeti todos os verificadores históricos nem os executores Python/Pro em contêiner; suas provas anteriores foram identificadas nos testes e documentos. Nenhum banco remoto, `.env`, CI ou modelo foi alterado. Não houve commit, merge nem push nesta revisão.

## Ordem recomendada para retomar

1. Corrigir Farol, movimento reduzido do pet, lint e documentos de estado.
2. Fechar C01/C02 do currículo até o cliente e publicar somente conteúdo comprovado.
3. Concluir o ciclo autenticado local para detectar falhas de integração antes de ampliar o jogo.
4. Implementar o restante de E04 após os pedidos de arte e o documento de obra, e completar os baús.
5. Fazer homologação publicada e qualificação em aparelhos físicos.

O rascunho antigo de C01f no worktree da auditoria não deve ser reaplicado automaticamente: outra sessão já integrou essa funcionalidade em staging.
