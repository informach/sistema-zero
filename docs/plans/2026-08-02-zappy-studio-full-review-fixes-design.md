# Design — correção integral do full review do Zappy no Estúdio Completo

**Data:** 2026-08-02  
**Escopo:** `studio`, `community-kids`, `member-shell`, `members` e `admin`

## Objetivo

Resolver os dez achados confirmados no review e a falha reproduzida depois no painel administrativo, sem enfraquecer os gates atuais. A correção deve esconder o tutor fora do piloto, cobrar cota somente quando houver chamada ao provedor, respeitar a carreira, limitar o prompt, preservar idempotência, tornar referências confiáveis e manter as métricas disponíveis.

## Abordagem escolhida

Manter uma única política autoritativa no servidor e enviar ao cliente apenas a capacidade necessária para renderizar a interface. O pipeline da pergunta continuará reservando e persistindo mensagens no `members`, mas classificará respostas locais antes da cota. O provedor receberá apenas contexto recuperado por relevância dentro de um orçamento explícito.

Uma rota adicional de capabilities duplicaria autenticação, criaria uma requisição no cliente e ainda exigiria o gate do BFF. Uma segunda chamada de IA para escolher contexto aumentaria custo e latência. Truncar o prompt ou esconder o erro após um `403` trataria sintomas. A solução escolhida corrige cada fonte do problema.

## Piloto e autorização

A regra do piloto sairá da rota e viverá em um módulo `server-only` compartilhado. As páginas Full e Pro calcularão `zappyEnabled` com a mesma sessão usada nos demais gates e passarão esse booleano aos clientes. Os clientes criarão `StudioTutorConfig` somente quando o servidor autorizar.

O BFF continuará validando sessão, impersonação, piloto, posse do Estúdio, modo, projeto e extensões. O booleano enviado à interface controla somente a oferta visual; nunca concede acesso.

## Reserva, idempotência e cota

O BFF manterá esta ordem:

1. validar sessão, entrada e carreira;
2. reservar `clientMessageId` no `members`;
3. devolver a resposta persistida em repetições concluídas;
4. classificar respostas determinísticas;
5. persistir e devolver respostas determinísticas sem consumir cota;
6. consumir cota somente antes da chamada ao provedor;
7. recuperar conhecimento, montar o prompt e chamar o provedor uma vez.

A normalização da busca deixará de chamar IA. Uma função textual local produzirá os termos de busca. Assim, cada pergunta não determinística fará no máximo uma chamada ao provedor.

No cliente, uma tentativa lógica conservará o mesmo `clientMessageId` após falha. Se a criança editar o texto restaurado, o cliente descartará essa identidade e criará outra na submissão seguinte.

## Classificação determinística

O classificador usará intenção e objeto, não palavras isoladas. Pinta exigirá menção explícita à ferramenta ou um verbo de criação/edição próximo de imagem, desenho, textura ou pixel art. Perguntas sobre sprites e imagens já presentes no projeto seguirão para o tutor.

Pensa continuará atendendo pedidos explícitos de planejamento. Futebol só será externo quando estiver ligado a notícia, placar, campeonato ou pesquisa; criar um jogo de futebol permanecerá no escopo do Estúdio. Testes positivos e negativos fixarão essas fronteiras.

## Catálogo e orçamento do prompt

O catálogo efetivo aplicará, nesta ordem, nível, extensões conquistadas, extensões instaladas e `tier.allowBlocks`. Quando `allowBlocks` existir, nenhum tipo fora dela poderá entrar no prompt ou numa referência validada.

O servidor classificará os blocos por relevância: bloco selecionado, tipos já presentes no projeto, correspondência com pergunta ou erro e, por fim, exemplos gerais. Só os melhores itens entrarão com metadados completos. Manuais serão divididos em trechos e classificados pelos mesmos sinais; o servidor não serializará todos os manuais instalados.

O construtor medirá bytes UTF-8 do `system` e do `user`, reservará espaço para a resposta e reduzirá catálogo, manuais, conhecimento e código em ordem de menor relevância. Testes com os tiers `coder` e `god/staff` imporão o teto e confirmarão que o bloco selecionado permanece no contexto.

## Referências de bloco

O `blockType` será a identidade de navegação. O Blockly localizará a categoria exata que contém esse tipo no toolbox efetivo. O rótulo de categoria continuará no contrato apenas para apresentação e telemetria; nomes duplicados não participarão da resolução.

Se a instância existir, o Studio continuará focando o `blockId`. Caso contrário, abrirá a categoria que contém o `blockType`. A carreira e o catálogo efetivo já impedirão referências indisponíveis.

## Cooldown

O painel atualizará a contagem apenas enquanto estiver aberto e o cooldown estiver ativo. Cada atualização agendará o próximo limite de segundo e limpará o timer no fechamento, na expiração ou no unmount. Depois de chegar a zero, nenhum timer ou render periódico permanecerá ativo.

## Referências de aula

A busca de conhecimento incluirá o `courseSlug` autoritativo obtido do banco junto com curso e aula. O enriquecimento continuará aceitando somente `lessonId` retornado pela busca autorizada e copiará título, IDs e slug dessa fonte; o modelo nunca formará URLs.

`StudioTutorConfig` receberá um callback de navegação do host. O painel mostrará chips apenas para referências navegáveis. No Community Kids, o callback abrirá `/cursos/<courseSlug>/aulas/<lessonId>` em nova aba com `noopener,noreferrer`, preservando o projeto atual. Respostas históricas sem `courseSlug` continuarão legíveis, mas não exibirão um chip inválido.

## Saúde da base de conhecimento

O relatório agrupará os vídeos publicados por aula e marcará a aula quando qualquer vídeo não tiver uma fonte `video-vtt` pronta para o `blockId` correspondente. Uma aula com dois vídeos, um indexado e outro pendente, aparecerá no relatório.

## Métricas no Admin

Os logs de staging confirmaram que a consulta de métricas codifica o início do mês como ISO, mas envia o fim do mês como a representação textual de um `Date`. A comparação final usa um fragmento SQL cru e ignora o encoder da coluna `timestamp with time zone`; o PostgreSQL rejeita o parâmetro e devolve `500`.

O repositório usará o comparador tipado `lt(zappyMessages.createdAt, to)`, assim como já usa `gte` no limite inicial. Um teste estrutural da consulta verificará que ambos os limites passam pelo encoder de timestamp.

O Admin também deixará de carregar uso agregado, métricas do Zappy e saúde da base em um único `Promise.all`. Cada painel conservará seus dados e erro próprios. Uma falha isolada mostrará o aviso no card correspondente sem apagar os outros dois resultados.

Os avisos genéricos de preload do navegador não participam da cadeia do `500`. Sem a URL do recurso não existe evidência de um preload incorreto específico; esta correção não suprimirá esses avisos.

## Testes

Os testes de regressão cobrirão:

- visibilidade do piloto nas páginas Full e Pro e defesa do BFF;
- respostas determinísticas sem cota e respostas do provedor com uma cobrança;
- classificação de Pinta, Pensa, futebol e pedidos externos;
- interseção de `allowBlocks` por tier;
- orçamento total do prompt e retenção dos itens mais relevantes;
- reutilização e invalidação do `clientMessageId` no retry;
- encerramento do timer de cooldown;
- abertura por `blockType` com categorias duplicadas;
- propagação de `courseSlug` e abertura segura em nova aba;
- relatório de uma aula com vários vídeos;
- codificação dos dois limites temporais da consulta de métricas;
- carregamento independente dos três painéis administrativos.

Depois dos testes direcionados, a verificação executará Biome, typecheck dos quatro pacotes, suites relacionadas, builds de Community Kids e Playwright do Zappy.

## Compatibilidade

- Nenhuma migração de banco será necessária; respostas do Zappy já são JSON.
- `courseSlug` será opcional no tipo persistido porque respostas históricas não o possuem.
- O adapter continuará isolando o Studio de sessão, banco, cota e provider.
- O BFF manterá todos os gates atuais mesmo quando a interface ocultar o tutor.
- O fluxo não adicionará nova chamada de rede nem nova chamada de IA.

## Critérios de aceite

- Contas fora do piloto não veem nem carregam o Zappy.
- Respostas locais não alteram a cota compartilhada.
- O catálogo do tutor é subconjunto do catálogo visível para o tier.
- O prompt permanece dentro do orçamento nos maiores catálogos e projetos aceitos.
- Perguntas válidas sobre sprites, imagens existentes e jogos de futebol chegam ao tutor.
- Repetir a mesma tentativa após perda de resposta conserva a idempotência.
- O cooldown encerra toda atividade ao expirar ou fechar o painel.
- Chips de bloco abrem a categoria do tipo exato.
- Chips de aula abrem a aula autorizada em nova aba.
- O relatório lista toda aula com pelo menos um vídeo sem transcrição pronta.
- A rota de métricas aceita um mês válido e devolve zeros ou agregados, nunca erro de timestamp.
- Uma falha em um painel de IA não impede os outros painéis de renderizar.
