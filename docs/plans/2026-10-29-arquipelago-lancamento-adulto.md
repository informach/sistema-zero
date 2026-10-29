# Arquipélago na comunidade adulta, fase3-13

**Objetivo:** deixar o jogo pronto para abrir na comunidade adulta. As etapas abrem as ilhas, não
há limite dos pais, e o jogo e as telas por cima dele vestem a pele adulta. Nada foi ligado em
staging nem em produção: a lista de lançamento está no fim.
**Arquitetura:** o público já chega ao jogo pela `Plataforma` do contrato (`publico`). Nenhum
campo novo e nenhum salvamento novo. A pele adulta do jogo é um pedaço próprio do build, carregado
por `import()` só no adulto. A porta do member-shell ganhou uma entrada própria, no padrão do
avatar e do quarto adultos.

## 1. Levantamento (conferido no código e nos testes em 29/10/2026)

### (a) As etapas abrem as mesmas ilhas, pelo mesmo caminho do Kids

- `arquipelago-contracts/src/ilhas.ts` é o único mapa ilha → posto. A ilha abre pela POSIÇÃO
  (1 a 8). No adulto vale a etapa na mesma posição; a última é a Lenda nas duas jornadas.
- O caminho é o mesmo: a página `/arquipelago` do community monta o `ArquipelagoHost` do
  member-shell. Ele lê o manifesto e importa a mesma entrada do jogo. `lerJornada` usa
  `adultJourneyPosition(journey)` no adulto e `posicaoDoPostoKids(level.slug)` no Kids. O jogo só
  vê `posicao`.
- O serviço confere o mapa contra a jornada publicada (`conferirMapaDasIlhas`,
  `tests/unit/mapa-das-ilhas.test.ts`). Os cartões da rotina usam o currículo adulto
  (`tests/integration/http.test.ts`, bloco das cartas do adulto).
- A CSP do community já tem `'wasm-unsafe-eval'` na política estrita (`next.config.ts`), o
  que o Rapier pede. O menu (lateral e "Mais") só mostra o item quando `/arquipelago/acesso`
  libera (`(app)/layout.tsx`, `tests/arquipelago-navigation.test.ts`).

### (b) Família, limite dos pais, visitas e cartão dos pais

- **Serviço:** sem perfil e sem contexto do Kids, a sessão é um membro adulto (`lerJogador`).
  `/familia/*` exige o responsável (`lerResponsavel`), então a conta adulta recebe 403. `/irmaos`
  devolve a lista vazia. `/acesso` devolve `limiteDiarioMinutos: null` e
  `contabilizaTempo: false`.
- **Plataforma:** o community não tem os shims dos pais, e o cartão dos pais existe só no Kids.
- **O que faltava (corrigido nesta fase):**
  - o menu do jogo oferecia "Visitar um irmão" ao adulto;
  - o resultado de cada percurso mostrava "Lendo os recordes da família." e lia `/irmaos`;
  - o community tinha os shims `api/arquipelago/irmaos` (fase3-12) e o host deixava o pedido
    passar.
- O jogo não começa a contar o tempo no adulto (`jogo.tsx`: só `publico === 'kids'`). O host já
  respondia 404 a `/tempo/sessao` e `/tempo/recuperar` fora do Kids.

### (c) Suporte somente leitura

O suporte vale igual nos dois públicos. `x-auth-impersonator-id` dá `somenteLeitura` em
`base()` (`identidade.ts`), seja qual for o público. Gravar salvamento, comprar na galeria ou
somar tempo dá 403 `SOMENTE_LEITURA`. O jogo não abre a fila de salvamento com
`acesso.somenteLeitura`. Faltava só o recado da galeria, que dizia "Olhando o jogo como a
criança". O adulto agora tem o recado dele.

### (d) Liberar por `ARQUIPELAGO_PUBLICOS=adulto` sem deploy da plataforma

`decidirAcesso` lê a política do env do serviço (`ARQUIPELAGO_MODO`, `ARQUIPELAGO_PUBLICOS`,
`ARQUIPELAGO_LISTA`). O community pergunta a cada página (`/arquipelago/acesso`, prazo de 1,5 s)
e esconde o item quando o serviço não libera ou não responde. Mudar a variável no Railway reinicia
só o `arquipelago-api`. O community, o Kids e o gateway não sobem de novo. Testes:
`tests/unit/acesso.test.ts` e o bloco do adulto em `tests/integration/http.test.ts`.

⚠️ Esta fase muda a página do community (a entrada adulta) e o cliente do jogo. O primeiro
lançamento adulto precisa desses deploys (lista no fim). Depois disso, abrir e fechar é só a
variável.

### (e) Textos e telas que se dirigiam à criança

| Onde | Antes, no adulto | Decisão |
| --- | --- | --- |
| Porta (member-shell) | voz adulta já existia, mas na mesma tela do Kids e com a ação `sz-btn-gradient` | tela adulta própria (`arquipelago-porta-adulta.tsx`), entrada `arquipelago-host-adulto` |
| Diálogo da ferramenta | cabeçalho claro e ação na cor da pessoa | no adulto, cabeçalho no palco e ação amarela (`sz-btn`) |
| Telas do jogo (abrindo, fechado, erro) | "O Zappy está trazendo...", "Quase lá", "Voltar para a plataforma" | voz adulta, palco sem mascote |
| Tela de descanso e aviso do tempo | não aparecem (sem limite) | voz adulta no formato, nunca mostrada |
| Menu | "Visitar um irmão", "Voltar para a plataforma" | sem visitas; "Voltar para a comunidade" |
| Resultado dos percursos | "Recordes da família" | some no adulto |
| Luneta (painel) | nomes dos postos do Kids ("chegar a Mestre dos Jogos") | "chegar à etapa 5 da sua jornada" |
| Projeto azul | "Abre no posto Explorador(a) de Mundos" | "Abre na etapa 4 da sua jornada" |
| Galeria, suporte | "Olhando o jogo como a criança" | "No acesso de suporte o jogo só mostra." |
| Desafios (Quadro das Cores) | textos neutros; cursos e avaliação vêm do serviço pelo público | sem mudança |
| Álbum, diário, caderno | falam do mundo e dos cursos (os adultos vêm do serviço) | sem mudança |
| Zappy e moradores | falas do mundo | sem mudança (o mundo é o mesmo) |

**Decisões registradas:**

- **A etapa pelo número.** As etapas adultas têm nomes que a equipe publica no Members, e o jogo
  só recebe a posição. O texto adulto diz "a etapa N da sua jornada".
- **O Zappy continua no mundo.** Ele voa ao lado de quem joga e fala nas dicas, como no Kids. As
  telas adultas (porta, abrindo, fechado) não mostram o mascote, como a porta já fazia.
- **Se o pedaço adulto não baixar,** o jogo abre com a voz e o desenho do Kids (o erro vai para
  `relatarErro`). Não abrir seria pior.

**Fechado na conferência (29/10/2026):** a placa 3D da ponte fechada (`mundo/placa-da-ponte.tsx`)
e a fala da luneta dita pelo `mundo/luneta.tsx` usavam os nomes dos postos do Kids. Agora leem a
voz: `placaDaPonte(ilha)` (no adulto, "A ponte abre na" e "etapa 3 da jornada") e
`recadoDaIris(ilha)` entraram na `VozDoJogo`, e a luneta do mundo usa `useVoz().falaDaLuneta`. O
R3F 9 leva o contexto da voz para dentro do `<Canvas>`.

## 2. Pele adulta do jogo

- `src/interface/voz.ts`: `VozDoJogo`, `VOZ_KIDS` (os textos de antes, sem mudar um byte),
  `VozContexto` e `useVoz`.
- `src/adulto/voz-adulta.ts` (`VOZ_ADULTA`, mesmo formato) e `src/adulto/estilos-adultos.ts`
  (`ESTILOS_ADULTOS`, tudo dentro de `.arq-adulto`). Estes arquivos ficam juntos em
  `src/adulto/pele-adulta.ts`.
- `jogo.tsx` (`usePele`): o Kids usa a voz que já está no pedaço principal. O adulto faz
  `import('./adulto/pele-adulta')` antes da primeira tela e põe o `<style>` adulto. `entrada.tsx`
  dá à raiz a classe `arq-adulto`. O build já separa pedaços (`splitting`), então o Kids não baixa
  o adulto.
- O CSS adulto usa os tokens do "Estúdio à noite" (`--noite`, `--palco`, `--carta`, `--cta`,
  `--cta-degrau`, `--font-sans`, `--font-display`), herdados da página do community, com os
  mesmos literais como reserva para o playground. O conceito é o de lá: a noite para esperar e
  comemorar (telas, dicas, pílulas, resultado) e a bancada clara para ler e fazer (menu e
  painéis). A ação é o amarelo com degrau de 4 px, a letra é a Atkinson e os títulos são em
  Bricolage. O menu e os painéis não têm texto abaixo de 15 px.
- Família: `hud.tsx` só mostra "Visitar um irmão" e os "Recordes da família" com
  `plataforma.publico === 'kids'`.

## 3. A porta e o diálogo na plataforma

- `arquipelago-porta.tsx` virou só do Kids e exporta `PeleDaPorta`, `PELE_KIDS_DA_PORTA`, a
  `Paisagem` e as animações.
- `arquipelago-porta-adulta.tsx` traz a mesma paisagem, com o cartão `sz-palco`, o `sz-kicker`, o
  `sz-h2` e as ações `sz-btn` e `sz-btn-outline`, sem mascote. Os textos adultos ficam em
  `TEXTOS_DA_PORTA_ADULTA` e `AVISOS_DA_PORTA_ADULTA`.
- `arquipelago-host-adulto.tsx` (`ArquipelagoHostAdulto`) é a entrada adulta. O
  `ArquipelagoHost` recebe `pele` (padrão: a do Kids). A página do community importa a entrada
  adulta, e a do Kids continua importando `arquipelago-host`.
- `criarPlataformaDoArquipelago`: `soDoKids` (tempo e família) responde 404 sem ir à rede fora
  do Kids. Os shims `community/src/app/api/arquipelago/irmaos/*` saíram.
- `arquipelago-creation-dialog.tsx`: o cabeçalho e a ação mudam por `audience`, só por classes
  (`CABECALHO`). O Kids ficou igual.

## Execução

- [x] Levantamento (a) a (e), acima.
- [x] Voz do jogo: `VOZ_KIDS` e `VOZ_ADULTA` no mesmo formato, testadas com a mesma régua.
- [x] Pele adulta do jogo num pedaço próprio, só por `import()`.
- [x] Menu e resultado sem família no adulto.
- [x] Porta adulta por entrada própria; diálogo da ferramenta no palco; host sem `/irmaos` no
  adulto; shims adultos dos irmãos removidos.
- [x] Testes: `arquipelago/tests/pele-do-jogo.test.tsx` (Kids byte a byte por hash, forma e
  régua das duas vozes, CSS só em `.arq-adulto`, só `jogo.tsx` chega ao adulto e por
  `import()`); `member-shell/tests/arquipelago-porta.test.tsx` (porta do Kids byte a byte) e
  `arquipelago-porta-adulta.test.tsx` (pele, voz, entrada); `arquipelago-host.test.ts`
  (família só no Kids); `arquipelago-api/tests/integration/familia.test.ts` (conta adulta sem
  família).
- [x] Navegador: `playground/verificar-pele-adulta-browser.ts` (adulto no computador e no
  celular emulado, a tela de fechado e o Kids de sempre), aprovado com o Chrome local e o
  SwiftShader. Prints em `docs/qa/2026-10-29-arquipelago-pele-adulta/`. A letra conferida é a
  reserva do playground: a Atkinson de verdade só existe na página do community.
- [x] Documentação: `docs/arquipelago.md`, `docs/arquipelago-regras.md`, `CLAUDE.md` do jogo,
  do member-shell e do community.

Suítes: o jogo inteiro (898 aprovados, 1 pulado), os testes do Arquipélago no member-shell (69),
o `copy-sem-ia` do community e o `copy-vocabulario` do Kids (com prazo maior: os dois varrem o
repositório e estouravam 5 s com a máquina ocupada), e unidade e integração do serviço (226). As 2
falhas do serviço (`salvamento > V10 migra na rota` e `recebe V4 como a atual`) vêm do
`arquipelago-contracts/src/salvamento.ts` que outra sessão está mudando sem commit, e não desta
fase.

Typecheck: não rodado nesta sessão. A dona deixou os typechecks com uma sessão só (29/10/2026).

## Pedidos de arte

Nenhum. A pele adulta usa a mesma paisagem, os mesmos modelos e só tokens e CSS.

## 4. Lista de lançamento (não ligar nada sem a dona)

**Variáveis do `arquipelago-api` por ambiente** (no painel do Railway, nunca no Git):

| Variável | Staging, para conferir | Produção, para abrir |
| --- | --- | --- |
| `ARQUIPELAGO_MODO` | `lista` | `lista` primeiro; `aberto` depois |
| `ARQUIPELAGO_PUBLICOS` | `kids,adulto` | `kids,adulto` (ou só `kids` até a hora) |
| `ARQUIPELAGO_LISTA` | ids das contas adultas de teste | ids das primeiras contas adultas |
| `ARQUIPELAGO_DESAFIOS`, `ARQUIPELAGO_MEMBERS_TOKEN`, `ARQUIPELAGO_COINS_TOKEN` | como já estão | como já estão |

A equipe sempre entra, com qualquer lista. Nada muda no gateway (`ARQUIPELAGO_URL` e
`ARQUIPELAGO_INTERNAL_TOKEN` já existem) nem no community.

**Ordem:**

1. Deploy do `member-shell`/`community` (a entrada adulta e sem os shims dos irmãos) e do
   `arquipelago-api` (o cliente novo vem no build do serviço). Os dois juntos: com o community
   novo e o cliente antigo, a porta já é a adulta e o jogo ainda veste o Kids (funciona). Com o
   cliente novo e o community antigo, o jogo pede `/irmaos` só no Kids (funciona).
2. Staging: `ARQUIPELAGO_PUBLICOS=kids,adulto` com `ARQUIPELAGO_MODO=lista` e as contas de teste
   na lista. Conferir (abaixo).
3. Produção: o mesmo, com a lista das primeiras contas. Só depois `ARQUIPELAGO_MODO=aberto`.
   **Lista antes de aberto**, sempre.
4. Para fechar: tirar `adulto` de `ARQUIPELAGO_PUBLICOS` (o item do menu some na próxima página).

**O que conferir em staging com uma conta adulta** (comunidade adulta, computador e celular):

- O item "Arquipélago" aparece no menu lateral e em "Mais" só para quem está na lista; uma conta
  fora da lista não vê o item e, pelo endereço, recebe "Ainda não abriu para você".
- A porta é a adulta (cartão no palco, sem o Zappy) e o jogo abre com a pele adulta (raiz
  `.arq-adulto`, botões amarelos com degrau).
- As ilhas coloridas são as da etapa da conta (uma conta na etapa 3 vê até a Vila Doce).
- Não há pílula "Hoje: N min", "Visitar um irmão" nem "Recordes da família"; nenhum pedido a
  `/api/arquipelago/irmaos` nem a `/tempo/*` na aba de rede.
- Salvar e recarregar mantém a casa; numa sessão de suporte, nada grava e a galeria dá o
  recado do suporte.
- Pinta, Molda e Estúdio abrem por cima do jogo com o cabeçalho adulto, e "Usar no jogo" volta.
- Um desafio do Quadro das Cores abre o Estúdio de desafio com os cursos adultos.
- Uma conta do Kids, no mesmo staging, continua igual (Zappy na porta, tempo livre, visitas).

**O que observar depois de abrir:**

- Erros `[arquipelago] pele-adulta` no console (o pedaço adulto não baixou) e 4xx/5xx de
  `/api/arquipelago/*` no community.
- Medição do Admin com `publico=adulto` (a volta ao jogo do adulto ainda não tem histórico de
  dias, como diz `docs/arquipelago.md`).
- Tempo de abertura do jogo na comunidade adulta (o pedaço adulto é pequeno, só texto e CSS).
- Chamados no Help Desk que falem do jogo.
