# Desafio do dia, manifestos de desafios e a Corrida dos bichos (Arquipélago Vagalume)

Pedido da dona em 28/10/2026. Três partes que andam juntas:

1. **Manifestos de desafios:** a equipe sobe um arquivo com o desafio já todo configurado, como
   faz hoje com o manifesto das aulas. O mesmo formato serve para um desafio só, para o pacote de
   uma ilha e para o pacote do jogo inteiro. Subir de novo atualiza o que já existe e acrescenta o
   que é novo.
2. **Desafio do dia:** um banco de desafios por ilha, cadastrado no Admin. Cada criança recebe um
   por dia, das ilhas já abertas, e no dia seguinte aparece outro. É o que faz a criança ter um
   motivo bom para voltar depois de terminar o Quadro das Cores de uma ilha.
3. **Corrida dos bichos:** o minijogo do Estúdio do Bosque (um quadro do Quadro das Cores e as
   primeiras variações do desafio do dia). Depois de aprovado, vira um brinquedo do Bosque: a
   criança e a família jogam o jogo que ela fez.

O andamento fica na página de acompanhamento. O plano anterior dos desafios é
`docs/plans/2026-10-27-arquipelago-desafios.md`; as regras ficam em `docs/arquipelago-regras.md` §7.

## Como está hoje (levantado em 28/10/2026)

- O contrato tem os três tipos (`TIPOS_DE_DESAFIO`: `quadro-das-cores`, `desafio-do-dia`,
  `pedido-de-morador`) e o Admin já cadastra os três. Só o Quadro das Cores tem regra: o desafio do
  dia e o pedido de morador não têm escolha nem rodízio, e o jogo não mostra nenhum dos dois.
- `GET /arquipelago/desafios` devolve todos os publicados do público, sem olhar o tipo.
- Desafios não têm importação nem exportação. Cada um é criado à mão no Admin (`/admin/jogo`).
- O manifesto das aulas (`LearningManifest`, `packages/core/src/learning/index.ts`) é de UMA aula:
  conferir (prévia com o que cria, atualiza, preserva e retira) e depois aplicar com a impressão
  digital da prévia e um id de operação. Os ids estáveis (por aula e chave) deixam reimportar sem
  duplicar. Os projetos do Estúdio vão dentro do arquivo.
- O serviço do jogo guarda os resultados da conferência (`desafio_progresso.ultimos_resultados`),
  mas não guarda o projeto que passou.

## Parte 1: manifestos de desafios

### O formato

Um único formato (Zod, no contrato, `ManifestoDeDesafiosSchema`):

```jsonc
{
  "formato": "arquipelago-desafios",
  "versao": 1,
  // Opcional, só para conferir: "desafio" (um só), "ilha" (todos da mesma ilha) ou "jogo".
  "escopo": "ilha",
  "desafios": [
    {
      "slug": "bosque-corrida-dos-bichos",     // a identidade: subir de novo atualiza este
      "publico": "kids",
      "ilha": "bosque",
      "tipo": "quadro-das-cores",
      "quadro": 6,                              // só no Quadro das Cores
      "ordem": 60,
      "publicar": true,                         // publica ao aplicar, se a análise passar
      "conteudo": { /* ConteudoDoDesafioV1, igual ao do Admin */ }
    }
  ]
}
```

- O conteúdo é exatamente o `ConteudoDoDesafioV1` que o Admin grava hoje (projeto inicial e
  gabarito do Estúdio dentro, objetivos, dicas, extra, prêmio e blocos à mão). O arquivo exportado
  do Admin pode ser subido de novo sem conversão.
- `escopo: "ilha"` exige que todos sejam da mesma ilha; `escopo: "jogo"` aceita todas. Sem
  `escopo`, vale qualquer mistura.
- Teto: até 200 desafios por arquivo; cada projeto continua com o teto de 1,5 milhão de caracteres.

### Subir

No Admin, aba Desafios da seção Jogo: **Importar manifesto** (escolher o arquivo ou colar).

1. **Conferir** (prévia, nada é gravado). Para cada desafio do arquivo:
   - a ação: `criar` (slug novo), `atualizar` (o conteúdo ou os metadados mudaram), `igual` (nada
     mudou) ou `conflito` (por exemplo, o quadro já é de outro desafio, `QUADRO_OCUPADO`);
   - a análise do Members, a mesma do botão Analisar: os blocos exigidos, se o gabarito passa, se o
     projeto inicial não passa sozinho, a cobertura pelos cursos e os problemas;
   - se vai ser publicado (pediu `publicar` e não tem problema) ou fica em rascunho.
   No fim, a contagem: tantos novos, tantos atualizados, tantos iguais, tantos com problema.
2. **Aplicar.** Grava o que a prévia mostrou (com a impressão digital da prévia: se alguém mexeu
   num desafio entre a prévia e o aplicar, o aplicar recusa e pede outra conferência). Cada desafio
   com problema fica em rascunho com os problemas anotados, e os outros seguem.
3. **Reenviar é seguro.** O mesmo arquivo de novo dá tudo `igual`. Um pacote com desafios novos só
   acrescenta. Um desafio que saiu do arquivo continua como está (nunca é arquivado sozinho). Para
   arquivar os que saíram, há a opção **Arquivar os que não estão no arquivo**, só com `escopo`
   `ilha` ou `jogo`, que pede confirmação e vale só dentro do escopo.

O pacote do jogo inteiro pode passar do limite do corpo da rota (4 MB). O Admin lê o arquivo,
confere o formato inteiro no navegador e manda em lotes que cabem no limite e no prazo (a análise
roda o executor para cada desafio novo ou mudado); a tela junta o resultado dos lotes.

### Exportar

Na mesma aba: **Exportar** um desafio, a ilha filtrada ou tudo, no formato acima. Serve para
editar fora e subir de novo, e para levar de um ambiente para o outro.

### Onde mora

- **Contrato:** `ManifestoDeDesafiosSchema` e a resposta da conferência em `desafios.ts`.
- **Serviço do jogo:** as regras puras em `domain/manifestos.ts` (`decidir`, `impressaoDigital`,
  `canonico`) e a orquestração no `ServicoDaEquipe` (`conferirManifesto`, `aplicarManifesto`,
  `exportarManifesto`, `exportarDesafio`), com as mesmas regras do cadastro: escrita só para
  superadmin e admin, conflitos, análise e publicação. Rotas da equipe:
  `POST /arquipelago/admin/manifestos/conferir`, `POST /arquipelago/admin/manifestos/aplicar` e
  `GET /arquipelago/admin/manifestos/exportar?publico&ilha&tipo` e
  `GET /arquipelago/admin/desafios/:id/manifesto`. Não precisa de tabela nova: o slug é a
  identidade, e a impressão digital da prévia (o arquivo e a revisão de cada desafio que ele toca)
  impede aplicar duas vezes o mesmo lote (a segunda vez recebe 409 `MANIFESTO_DESATUALIZADO`, e uma
  nova conferência mostra tudo `igual`).
- **Admin:** botão, prévia e aplicar na aba Desafios; exportar no topo da lista e em cada desafio;
  as rotas novas entram na lista de permitidas do proxy do Admin.
- **Documentação:** `docs/arquipelago-manifesto-de-desafios.md` com o formato, um exemplo e o
  passo a passo. Os manifestos prontos ficam em `docs/desafios-do-jogo/<ilha>/`, como os das aulas
  em `docs/aulas-interativas/`.

## Parte 2: desafio do dia

### A regra (serviço do jogo)

- **O banco:** os desafios publicados de tipo `desafio-do-dia` do público da pessoa. Cada um é de
  uma ilha, como hoje.
- **Quem pode cair hoje:** os da pessoa com a ilha aberta e todos os blocos exigidos (as mesmas
  regras 7.4 e 7.5). Os ainda não feitos vêm antes dos já feitos.
- **Mistura de ilhas:** nos dias pares, a ilha aberta mais nova, quando tiver algum para ela; nos
  ímpares, uma ilha anterior (revisão espaçada). Sem candidato no grupo do dia, vale qualquer ilha.
- **Fixo no dia:** a escolha é guardada (`desafio_do_dia`: pessoa, dia de São Paulo, desafio) na
  primeira leitura do dia e não muda mais naquele dia, mesmo se a equipe publicar outro.
- **Feito:** "Amanhã tem outro" até a meia-noite de São Paulo. Fazer de novo é permitido, como
  qualquer desafio.
- **Todos feitos:** o banco recomeça pelos feitos há mais tempo. Refazer não paga de novo (a
  conclusão é gravada uma vez, regra 7.8).
- **Prêmio:** o do cadastro, com padrão menor que o do Quadro (10 no principal e 5 no extra). O
  desafio do dia nunca pinta a ilha (`recompensa.cor` falso; o Admin e o manifesto recusam
  verdadeiro).
- **Resposta:** `GET /arquipelago/desafios` ganha `doDia: { id, dia, feito } | null` (campo novo e
  opcional: o jogo antigo continua lendo).

### No jogo

- O painel do Quadro das Cores ganha, em cima dos seis quadros, o cartão **Desafio de hoje**, com
  "Fazer o desafio", "Feito hoje. Amanhã tem outro." ou "Ainda não há desafio de hoje".
- O Zappy avisa uma vez por dia, ao chegar numa ilha completa: "Tem desafio novo hoje no Quadro das
  Cores."
- O playground ganha um banco de mentira, para dar para ver os três estados.

### Pedido de morador

Usa o mesmo banco e a mesma regra de escolha, mas por morador e por amizade. Fica para a Vila Doce
(Fase 2), quando houver o segundo morador; a Capi continua com o pedido de itens que já faz.

## Parte 3: a Corrida dos bichos

### O desafio (Quadro das Cores do Bosque)

- **História:** os bichos do Bosque querem apostar corrida, mas ninguém sabe montar o jogo.
- **Projeto inicial:** uma pista com os quatro bichos do Bosque na largada e a linha de chegada.
- **Objetivos (conferidos no servidor):**
  1. ao clicar na Largada, os quatro voltam para o começo da pista;
  2. cada bicho anda um passo de tamanho sorteado, repetindo até alguém chegar;
  3. o primeiro que encosta na chegada diz "Ganhei" e a corrida para.
- **Desafio extra:** o bicho escolhido pela criança só anda quando ela aperta a barra de espaço.
- **Conceitos:** eventos, repetição, sorteio e condição. Antes de fechar o enunciado, conferir no
  catálogo quais blocos os cursos do posto do Bosque ensinam (o desafio só usa blocos que a criança
  já conquistou; a análise do Members mostra a cobertura).

### As primeiras variações (desafio do dia do Bosque)

Três para começar o banco, cada uma partindo da corrida pronta: pedras no caminho que fazem o bicho
pular, a corrida à noite (o Zappy acende a pista) e o placar de vitórias de cada bicho.

### O brinquedo do Bosque

- **Guardar o projeto aprovado:** o serviço guarda o projeto que passou (coluna nova em
  `desafios_concluidos`, com migração; testes só num Postgres local descartável).
- **Rota:** `GET /arquipelago/desafios/:id/meu-projeto` (só o dono).
- **A plataforma abre só para jogar:** um modo novo do pedido de ferramenta (`jogar`), sem editar
  e sem conferir. Muda a `Plataforma` de forma compatível (campo opcional).
- **No Bosque:** uma placa "Corrida dos bichos" ao lado do cercadinho, que aparece quando o desafio
  é feito. Com o E, abre o jogo da criança.

### Os arquivos

O manifesto do Bosque em `docs/desafios-do-jogo/bosque/bosque.manifesto.json` (a corrida e as três
variações), pronto para a equipe subir. O gabarito é conferido pelo mesmo executor das aulas antes
de ir para o arquivo.

## Decisões tomadas no plano (reversíveis, anotadas para a dona)

| Pergunta | Decisão | Por quê |
|---|---|---|
| Um formato ou três (desafio, ilha, jogo)? | **Um**, com `escopo` opcional | O mesmo arquivo serve para os três; o escopo só confere |
| O que identifica o desafio no arquivo? | O **slug** | Já é único no cadastro e legível para a equipe |
| Desafio que saiu do arquivo | **Fica como está**; arquivar só com a opção marcada e confirmação | Subir um pacote pequeno nunca apaga nada sem querer |
| Publicar ao subir | Pelo campo `publicar` de cada desafio; com problema, fica em rascunho | A equipe decide por desafio, e nada com problema vai ao ar |
| Desafio do dia fixo no dia | **Guardado** na primeira leitura | Uma publicação nova não troca o desafio no meio do dia |
| Mistura de ilhas | Dias pares a ilha mais nova, ímpares as anteriores | Novidade e revisão espaçada na mesma semana |
| Prêmio padrão do desafio do dia | 10 e 5 | Menor que o Quadro (20 e 10), como na proposta ("médio") |
| Pedido de morador | Depois, com a Vila Doce | Só a Capi existe hoje, e ela já pede itens |

## Ordem de entrega (cada etapa fica de pé sozinha)

1. **Manifesto no serviço:** contrato, conferir, aplicar e exportar no `ServicoDaEquipe`, rotas no
   serviço e no gateway, testes (de integração e de banco num Postgres local descartável).
2. **Manifesto no Admin:** importar, conferir, aplicar em lotes, exportar; testes do Admin.
3. **Desafio do dia no serviço:** a regra pura com testes, a tabela `desafio_do_dia`, o campo
   `doDia` na resposta.
4. **Desafio do dia no jogo:** o cartão no painel do Quadro, a fala do Zappy, o banco de mentira
   do playground; conferido no navegador.
5. **Corrida dos bichos:** o desafio e as três variações no manifesto do Bosque, com o gabarito
   conferido pelo executor; o banco de mentira do playground usa o mesmo conteúdo.
6. **O brinquedo:** guardar o projeto aprovado, a rota, o modo `jogar` da plataforma (member-shell e
   Kids), a placa no Bosque.
7. **Documentação e página:** regras (§7), `docs/arquipelago.md`, os `CLAUDE.md` dos pacotes,
   o guia do manifesto e os cartões da página de acompanhamento.
