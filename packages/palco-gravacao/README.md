# Palco de gravação

As aulas do Kids como a criança vê, para o robô de gravação do EdiAula gravar. Serviço próprio, só
no staging, só para a equipe. Nada do que acontece aqui é salvo.

## Como funciona

- **Entrada:** e-mail e senha de uma conta da equipe (superadmin, admin ou staff, ativa), pelo
  auth do ambiente. Impersonação e sessão de perfil do Kids não entram (`src/lib/staff.ts`). O
  `src/proxy.ts` pede a sessão em toda página e rota e renova o token vencido.
- **A aula:** cole o endereço de uma aula do Kids (`…/cursos/<curso>/aulas/<aula>`) no início, ou
  abra `/aulas/<curso>/<aula>`. A aula é lida pelo gateway com o token da equipe, que vê tudo
  aberto, sem trava e sem progresso. Cada abertura é uma tomada nova (`?tomada=`): o Estúdio e as
  atividades começam do zero.
- **Mesmos componentes do Kids:** o alias `@/` aponta para `packages/community-kids/src`, então o
  player, os blocos, o Estúdio, o livro 3D, as cenas, o CSS e as fontes são os do Kids, sem cópia.
  O palco não muda nenhum outro pacote.
- **Sem escrita:** as atividades são conferidas no navegador (`LearningExecutionProvider`), o
  rascunho na conta fica desligado e concluir só mostra a comemoração. As rotas que a aula chama
  (`/api/members/lessons/...`) são respondidas pelo palco (`src/lib/bff.ts`): navegação, posição
  do vídeo, envio do projeto e o resto recebem a resposta de sucesso que a tela espera.
- **Verificar projeto** vai ao members de verdade, como equipe: o members não guarda progresso
  nem prêmio da equipe, e o tempo da conferência é parte da aula gravada (o EdiAula acelera a
  espera sob a fala).
- **Livro e anexos:** o PDF vem do bucket privado do ambiente pela própria origem, sem marca
  d'água e sem registrar download.
- **Ajustes de palco** (`src/app/globals.css`): os controles do livro que só aparecem ao passar o
  mouse ficam à vista.

## Ponte de gravação

`window.__gravacao` versão 1 (contrato no README do EdiAula), em `src/lib/ponte.tsx`. Os verbos
estão em `src/lib/verbos.ts` e na seção 9 de `docs/aulas-interativas-tecnico/ESPEC-ROTEIRO.md`.
`ocupado()` responde enquanto o Estúdio ou o livro carregam, o jogo pronto prepara ou o projeto
está sendo conferido.

## Rodar

```sh
bun run --filter @sistemazero/palco-gravacao dev   # porta 3010
bun run --filter @sistemazero/palco-gravacao test
bun run --filter @sistemazero/palco-gravacao typecheck
```

Variáveis: `GATEWAY_URL`, `JWT_JWKS_URL` (ou `JWT_HS256_SECRET` em desenvolvimento),
`JWT_ISSUER`, `JWT_AUDIENCE`, `MEMBER_SHELL_HMAC_SECRET` e, para o livro, `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_PRIVATE_BUCKET`. No staging, os valores são os
do `community-kids`.

## Deploy

Definição em `.railway/staging-services/palco-gravacao.json` (o `railway.ts` lê essa pasta só no
staging). O CI publica o palco junto de toda mudança que publica o Kids, depois que o id do
serviço está no mapa `SVC_ID` de `.github/workflows/ci.yml`.

**Ordem da primeira subida.** O CI do staging só aceita ajustes de build e deploy em serviços que
já existem; criar um é recusado e trava o deploy de todos. Então, antes do merge em `staging`:
1. `railway config plan` no staging com este código mostra só "Create service palco-gravacao";
2. a criação é feita por `railway config apply` nesse mesmo plano (mesma origem, réplicas e
   build da definição);
3. as variáveis entram no serviço, com referência às do `community-kids` do staging;
4. o id do serviço entra no `SVC_ID` de `ci.yml`, e o plano volta a não ter mudanças;
5. só então o merge.

## Limites conhecidos

- Os vídeos da aula (Vimeo, YouTube) não são controlados pelo robô.
- O jogo pronto usa `Math.random` como no Kids: o que é sorteado pode mudar de uma tomada para
  outra.
- Ainda não há verbos para trocar um campo ou um número de um bloco nem para encaixar dentro de
  um bloco; esses gestos são marcados à mão no EdiAula.
- Estúdio em Python não funciona no palco: a conferência e o ambiente do Python pedem o vínculo
  do projeto na conta, que o palco não cria. As aulas com blocos e JavaScript funcionam.
- Quiz respondido no palco passa sempre: as respostas certas só o members conhece, e conferir
  ali gravaria uma tentativa.
