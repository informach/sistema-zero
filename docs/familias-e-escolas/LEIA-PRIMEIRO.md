# Famílias e Escolas: leia primeiro

Esta pasta guarda tudo o que é preciso para implementar a proposta "Famílias e Escolas" e para qualquer sessão, em qualquer computador, continuar de onde a anterior parou.

A proposta põe por cima da plataforma de famílias uma camada de instituições (escolas, clínicas e projetos parceiros). Ela foi aprovada pela Helena (dona do produto) no Canvas https://claude.ai/artifact/6NZdjAZCjLGGB5CMMcJFfS, versão 3.0, em novembro de 2026. O Canvas fica na conta principal dela; se você não conseguir abri-lo, use a especificação em texto desta pasta.

## Ordem de leitura

1. **Este arquivo**, inteiro.
2. **[CONTROLE.md](CONTROLE.md)**, seção "Como retomar": o lote atual, o próximo passo exato e o que ficou sem commit.
3. **[PLANO.md](PLANO.md)**: a arquitetura (seção 4), as regras de entrega (seção 5) e o lote atual (seção 6).
4. **[REGRAS-DE-NEGOCIO.md](REGRAS-DE-NEGOCIO.md)**: as regras aprovadas. Elas vencem qualquer tela ou teste.
5. **[LEVANTAMENTO-DO-CODIGO.md](LEVANTAMENTO-DO-CODIGO.md)**: as seções dos pacotes do lote. As linhas citadas envelhecem: confira no arquivo.
6. **[especificacao/](especificacao/)**: as telas do lote (`Tela-*.txt`) e as pranchas citadas.
7. O `CLAUDE.md` de cada pacote que o lote mexe, antes de editar nele.

## Como retomar em outro computador

1. `git fetch origin` e confira em que ramo você está (`git rev-parse --abbrev-ref HEAD`). Trabalhe na `staging`, atualizada com `origin/staging`.
2. Leia o "Como retomar" do controle.
3. Se o lote atual estava **em andamento**, o trabalho sem push do outro computador não existe aqui. Recomece o lote a partir do último commit que subiu, olhando no controle as tarefas marcadas e no `git log` o que entrou.
4. Siga o ciclo do lote (abaixo) e atualize o controle a cada tarefa.

Para perder o mínimo se a sessão parar: num lote grande, faça commits menores, cada um deixando tudo funcionando, com o controle atualizado junto, e dê push ao fim de cada um.

## Ciclo de cada lote

1. Marcar o lote como "em andamento" no controle.
2. Ler o lote em `PLANO.md` e o `CLAUDE.md` dos pacotes.
3. Implementar com os testes junto, marcando cada tarefa no controle.
4. Rodar os testes de cada pacote mexido, **um por vez**: `bun run --filter @sistemazero/<pacote> test`. Na máquina original, com o sandbox do agente desligado (`bun test` com vários arquivos trava sob o sandbox).
5. Rodar o Biome: `bun run ci`. **Nunca num pipe** (`| tail`, `| grep`): o pipe esconde a falha.
6. Revisar o diff do lote com o skill `code-review` em `high`. O revisor só lê; se precisar provar um teste por mutação, faz numa cópia, nunca na árvore de trabalho.
7. Corrigir e rodar de novo.
8. Conferir no navegador as telas do lote contra a especificação e o Canvas. O que não der para conferir vira ressalva no controle.
9. Fechar o controle do lote, commit e push (regras abaixo).
10. Acompanhar o CI. Vermelho é consertado antes do lote seguinte.

## Regras de trabalho

Estas regras vêm da Helena e valem para qualquer sessão desta frente.

**Conversa**
- Responda **sempre em português**. Ela não lê inglês. Texto de tela, documentação e commits também em português.
- Proposta é apresentada **inteira**, sem pedir aprovação de pedacinho por pedacinho.
- Sem excesso de cautela jurídica nos textos e nas decisões.
- Pergunte só o que for decisão dela de verdade. O resto, decida, registre no controle e siga.

**Git**
- Só existem os ramos `staging` e `main`. Não crie ramo de trabalho nem PR. Não mexa na `main` nem dispare deploy de produção sem ela pedir com essas palavras.
- Commit na `staging`, por caminho: `git add <caminhos do lote>`, conferir `git diff --cached --name-only` (só o lote), `git commit -F <arquivo da mensagem> -- <caminhos>`. **Nunca** `git add -A`, `git stash`, `git checkout -- <arquivo>`, `git reset` na árvore: outras sessões trabalham nela ao mesmo tempo e o trabalho delas sem commit só tem uma cópia.
- Mensagem: `feat(familias-escolas): lote N, <resumo>` (ou `docs(familias-escolas): ...`), terminando com a linha de coautoria que o ambiente pedir.
- **Push:** quem dá o push confere tudo o que sobe, inclusive commits de outras sessões, e conserta o que estiver quebrado antes. Confira e empurre o **mesmo sha**:
  ```bash
  alvo=$(git rev-parse staging)
  git log --oneline origin/staging..$alvo     # o que vai subir
  # testes focados dos pacotes desses commits + bun run ci
  git push origin $alvo:refs/heads/staging
  ```
- O push publica no ambiente de staging do Railway e roda as migrations de lá.
- **Staging é sua; produção, não.** A sessão implanta e configura a staging inteira, inclusive criar serviço, variáveis e banco no Railway pela CLI e pelos MCPs (decisão da Helena, 28/11/2026). Para a produção não sobe nada desta frente até tudo estar muito bem testado na staging e a Helena decidir a promoção.
- Só entra no commit o que funciona inteiro. Nada de "o teste eu conserto no próximo lote".

**Testes e máquina**
- **Typecheck:** a Helena deixa o typecheck com uma sessão designada (a máquina original tem pouca memória e várias sessões ao mesmo tempo). Se você não é essa sessão, não rode; o CI confere depois do push e o resultado entra no controle. Nunca use `bun x tsc`.
- **Uma coisa pesada por vez:** nada de servidor, e2e, suíte inteira e typecheck juntos. Desligue o servidor de um e2e antes do próximo.
- As suítes passam **sem nenhum `.env`**. Teste novo não pode depender de variável local.
- Testes de banco de verdade (`tests/db`) só rodam com a variável `*_TEST_DATABASE_URL` do pacote, num banco local descartável. Teste pulado não prova o SQL: sem banco, registre a ressalva.

**Produto**
- **Os cursos gravados não podem quebrar:** Cadê Todo Mundo, Chave e Ilha do Farol. Campo novo no manifesto da aula é sempre opcional.
- Desktop primeiro; tablet basta.
- Arte e imagens da plataforma saem do Pinta (2D) ou do Molda (3D).
- Texto de tela mostra o que a plataforma oferece; nunca "curso em preparação". Siga o vocabulário de [REGRAS-DE-NEGOCIO.md](REGRAS-DE-NEGOCIO.md), seção 16.

**Repositório** (do `CLAUDE.md` da raiz)
- Migration: `bun run --filter @sistemazero/<serviço> db:generate` na hora do lote. O carimbo `when` é relógio: migration abaixo da maior já aplicada é pulada em silêncio. Confira o `_journal.json` e nunca escreva `when` à mão.
- Rota nova só existe na borda se entrar em `packages/api-gateway/gateway.config.ts`. Se a criança ou os pais usam, também em `kids-access-policy.ts`.
- Variável nova entra em `.railway/variables.ts` e precisa ser criada no painel antes do deploy.
- O CI usa Bun 1.3.11. Arquivos gerados no Windows saem com CRLF; o repositório é LF.

## Comandos

```bash
bun install
bun run --filter @sistemazero/<pacote> test
cd packages/<pacote> && bun test caminho/do/arquivo.test.ts -t "nome do teste"
bun run ci                                    # Biome, como o CI
bun run --filter @sistemazero/<serviço> db:generate
bun run dev:up [serviços...] | dev:status | dev:logs <svc> | dev:down
```

## O Canvas

A fonte do Canvas e os geradores estão em [canvas/](canvas/), com instruções em [canvas/README.md](canvas/README.md). A especificação em texto é extraída dele por `canvas/scripts/texto.mjs`. Se a proposta mudar, mude o Canvas, extraia o texto de novo e registre no controle.

## O que é só da máquina original

- Pouca memória e várias sessões do Claude ao mesmo tempo na mesma árvore. Daí as regras de uma coisa pesada por vez, do typecheck numa sessão só e do `git add` por caminho.
- A memória do Claude daquela máquina tem uma nota que aponta para esta pasta. Em outro computador, esta pasta é a fonte: não dependa daquela memória.
- A pasta temporária onde o Canvas nasceu não existe mais para você: tudo o que importava está aqui.
