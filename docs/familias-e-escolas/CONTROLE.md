# Famílias e Escolas: controle

> Atualize este arquivo a cada tarefa concluída, e não só no fim do lote. Ele vai no mesmo commit do código.
> Detalhe de cada lote (arquivos, peças a reaproveitar, cuidados): [PLANO.md](PLANO.md), seção 6.

## Como retomar

- **Lote atual:** 1, papéis em um lugar só.
- **Situação:** a fazer. O Lote 0 terminou (commit `de893bf4a`, push em 28/11/2026).
- **Próximo passo exato:** começar o Lote 1 lendo `PLANO.md`, seção 6, "Lote 1", e o `CLAUDE.md` de `packages/core` e de `packages/api-gateway`.
- **Trabalho sem commit:** nenhum desta frente.
- **Última atualização:** 28/11/2026.

## Legenda

`a fazer` · `em andamento` · `revisado` (testes, Biome e code-review feitos) · `commit` · `push` · `CI verde`

## Quadro dos lotes

| Lote | Nome | Estado | Commit | CI | Ressalvas |
|---|---|---|---|---|---|
| 0 | Preparação e registro | push | `de893bf4a` | acompanhar | Só documentos; o push levou junto 18 commits de outras sessões (docs da LG05 e `palco-gravacao`, testes do pacote verdes). |
| 1 | Papéis em um lugar só | a fazer | | | |
| 2 | Chaves dos pais e interruptor da IA | a fazer | | | |
| 3 | Sequência sem perda, conversas e aviso | a fazer | | | |
| 4 | Tempo de uso com limite (B12) | a fazer | | | |
| 5 | Habilidades no manifesto | a fazer | | | |
| 6 | Soma e habilidades da semana (B5, B6) | a fazer | | | |
| 7 | Moderação com retorno e recurso | a fazer | | | |
| 8 | Promessa nova nas páginas | a fazer | | | |
| 9 | Serviço `institutions`, isolamento e bateria | a fazer | | | |
| 10 | Vínculos, claim e cabeçalho | a fazer | | | |
| 11 | Admin, grupo Instituições (A1, A8) | a fazer | | | |
| 12 | Degrau da família e travas | a fazer | | | |
| 13 | Catálogo e compra | a fazer | | | |
| 14 | Página do código e inscrição (B1, B3, B4, E1) | a fazer | | | |
| 15 | Conta e Planos (B8, B9) | a fazer | | | |
| 16 | Cortesia e contagem (E6) | a fazer | | | |
| 17 | Mural da instituição (C4) | a fazer | | | |
| 18 | Conjuntos de aulas e motor de tarefa e plano | a fazer | | | |
| 19 | Área das instituições (D6, E2–E5, B10) | a fazer | | | |
| 20 | Recados da instituição (B11, C6, D5) | a fazer | | | |
| 21 | Computador da instituição e crachá (A4, C1) | a fazer | | | |
| 22 | Curso para educadores e visualizador (D1) | a fazer | | | |
| 23 | Site: clínicas e parceiras | a fazer | | | |
| 24 | Turmas, sala do professor e recados por turma (D2) | a fazer | | | |
| 25 | Tarefas com prazo e resultado (D3, D4, C2, C3, C5) | a fazer | | | |
| 26 | IA por ano escolar e botão do professor (A10) | a fazer | | | |
| 27 | Gestão da escola e Para escolas (A2, A6, B7) | a fazer | | | |
| 28 | Cadastro do aluno (A3, A5, B2) | a fazer | | | |
| 29 | Vagas pagas pela instituição | a fazer | | | |
| 30 | Contrato da grade e cobrança (A7) | a fazer | | | |
| 31 | Relatório da BNCC, nota e programa próprio (A9) | a fazer | | | |
| 32 | Ranking da escola (C7) | a fazer | | | |
| Final | Full review | a fazer | | | |

## Tarefas por lote

Marque `[x]` ao concluir. Toda tarefa de código inclui os testes dela. Todo lote termina com as tarefas de fechamento:

> **Fechamento de cada lote:** testes dos pacotes mexidos, um por vez · `bun run ci` · `code-review` em `high` no diff do lote · correções · telas conferidas no navegador · controle atualizado · commit por caminho · push conferindo o mesmo sha · CI acompanhado.

### Lote 0: preparação e registro
- [x] Especificação copiada para `especificacao/` (53 textos + anexo da BNCC de computação)
- [x] Fonte do Canvas e geradores copiados para `canvas/`, com os caminhos relativos ao repositório
- [x] Geradores conferidos do novo lugar (`texto.mjs` reproduz a especificação igual; `arrumar.mjs` não muda nada)
- [x] `canvas/` fora do Biome (`biome.json`)
- [x] `PLANO.md`, `REGRAS-DE-NEGOCIO.md`, `LEVANTAMENTO-DO-CODIGO.md`, `LEIA-PRIMEIRO.md`, `CONTROLE.md`, `canvas/README.md`
- [x] Memória local aponta para o controle
- [x] `bun run ci` (sem erro)
- [x] Commit (`de893bf4a`) e push

### Lote 1: papéis em um lugar só
- [ ] Lista e grupos (`equipe`, `admins`) exportados de `packages/core/src/identity/index.ts`
- [ ] `packages/core/src/staff/index.ts` passa a importar dali
- [ ] `gateway.config.ts` e módulos de rota usam as constantes
- [ ] Teste que barra lista literal nova na borda
- [ ] Prova de que nenhuma rota mudou de regra (comparar a config resolvida antes e depois)

### Lote 2: chaves dos pais e interruptor da IA
- [ ] Tabela `parent_controls` no members (migration conferida)
- [ ] Política única `aiChatAllowed(perfil)`, falha fechada
- [ ] Aplicada em `consume-ai-usage` (com o perfil), `studio-ai/usage` e `pensa` (`canGenerate`)
- [ ] BFF: descrição do jogo confere também no Kids
- [ ] Rotas dos pais (ler e gravar), na borda e na política Kids
- [ ] Interruptor na página do filho; mensagem para a criança

### Lote 3: sequência sem perda, conversas e aviso
- [ ] Sai a compra do protetor; moedas dos protetores guardados devolvidas
- [ ] Sequência como contador simples, sem perda
- [ ] Chave dos pais para desligar a sequência
- [ ] Lista de com quem cada filho conversa
- [ ] Aviso para a criança de que os pais acompanham

### Lote 4: tempo de uso com limite (B12)
- [ ] Tabela de eventos por perfil e dia (molde do `arquipelago-api`)
- [ ] Rota de batimento, na borda e na política Kids
- [ ] Batimento no layout Kids
- [ ] Tela B12: tempo do dia e da semana, limite
- [ ] Ao bater o limite, a área da criança avisa e fecha

### Lote 5: habilidades no manifesto
- [ ] Habilidades e códigos da BNCC em `packages/core/src/skills`
- [ ] Campo `skills` opcional na seção, no objetivo e na questão, com validador
- [ ] Import (`learning-import.service.ts`) e DTOs (`learning.dtos.ts`)
- [ ] Vista da criança sem o campo
- [ ] Cadê, Chave e Ilha do Farol reimportados sem diferença

### Lote 6: soma e habilidades da semana (B5, B6)
- [ ] Soma por criança lida das evidências
- [ ] Item novo no `GetChildrenStatsService`
- [ ] Bloco na área dos pais e no e-mail semanal
- [ ] Tela do Mapa de habilidades em Conteúdo, no Admin

### Lote 7: moderação com retorno e recurso
- [ ] Estado e resposta da denúncia no hub
- [ ] Aviso para quem denunciou
- [ ] Pedido de recurso de quem publicou
- [ ] Fila no Admin

### Lote 8: promessa nova nas páginas
- [ ] Textos do funil com "aprender a pensar criando jogos"
- [ ] Guardas de copy do funil verdes

### Lote 9: serviço `institutions`, isolamento e bateria
- [ ] Pacote no molde do `referrals` (package, Dockerfile, drizzle.config, schema, composition-root, CLAUDE.md)
- [ ] Papel sem posse, políticas de linha, ajudante de transação
- [ ] Tabelas `institutions`, `institution_codes`, `invitations`, `staff_entries`
- [ ] Módulo opcional na borda (rotas, HMAC, token)
- [ ] `.railway` (serviço, variáveis, railway.ts, production-sources) e `ci.yml`
- [ ] Bateria de isolamento em `tests/db`
- [ ] Prova de que a borda sem a variável fica igual

### Lote 10: vínculos, claim e cabeçalho
- [ ] Tabela `institution_links` no auth
- [ ] Leitura na renovação, claim, `toClaims`
- [ ] Cabeçalho em `IDENTITY_HEADERS` e no resolver
- [ ] Sessão do member-shell expõe os vínculos
- [ ] Rotas internas: gravar, encerrar, checar na hora
- [ ] Motivo no "entrar como"

### Lote 11: Admin, grupo Instituições (A1, A8)
- [ ] Grupo novo no menu do Admin
- [ ] Criar o espaço
- [ ] Convidar pessoas e aceitar o convite
- [ ] Lista de pessoas; entrar no espaço com motivo

### Lote 12: degrau da família e travas
- [ ] Resolvedor do degrau no core
- [ ] Trava do ranking geral e da liga
- [ ] Trava do Arquipélago
- [ ] Trava do Mural dos Criadores (fim da passagem livre da chave-mestra)
- [ ] Teste: nenhum tipo de matrícula de hoje perde acesso

### Lote 13: catálogo e compra
- [ ] Combo do plano pelo código e as duas ofertas (seed)
- [ ] Campo de meio de pagamento na oferta (6 meses só no Pix)
- [ ] Perfil extra que soma
- [ ] Trava por grupo de planos (funil e member-shell)
- [ ] Textos de plano para oferta de compra única

### Lote 14: página do código e inscrição (B1, B3, B4, E1)
- [ ] Página pública do código, com limite de tentativas
- [ ] Entrar ou criar conta ali
- [ ] Origem nova no mini checkout
- [ ] Venda só com código válido de instituição ativa
- [ ] Vínculo da criança gravado ao pagar

### Lote 15: Conta e Planos (B8, B9)
- [ ] Conta: de onde vem o acesso de cada filho, preço, bilhete ou código
- [ ] Tela Planos com os três degraus
- [ ] Troca de plano a pedido (nova com desconto, depois encerra a antiga)
- [ ] Perfil extra na área dos pais

### Lote 16: cortesia e contagem (E6)
- [ ] Contagem das famílias pagantes por instituição
- [ ] Cortesia a cada 20, indicada pela instituição
- [ ] Liberação pelo `grant-manual` com `sourceId` da instituição

### Lote 17: mural da instituição (C4)
- [ ] Mural como marca do espaço
- [ ] Acesso pelo vínculo, também na publicação Kids
- [ ] BFF e páginas sem o nome fixo
- [ ] Trocar de mural
- [ ] Professor e gestão tiram do ar; conta para a Jornada

### Lote 18: conjuntos de aulas e motor de tarefa e plano
- [ ] Conjuntos no Admin
- [ ] Rota interna de evidências em lote
- [ ] Motor de tarefa e plano no `institutions`
- [ ] Resultado no fim do prazo, com os três fatos

### Lote 19: área das instituições (D6, E2–E5, B10)
- [ ] Escolher a área antes do login
- [ ] Menu por vínculo na comunidade
- [ ] Coordenação, painel do profissional, plano combinado, ficha da criança
- [ ] O que a clínica vê, na área dos pais

### Lote 20: recados da instituição (B11, C6, D5)
- [ ] Conversas da instituição
- [ ] Profissional fala com a família, nunca com a criança
- [ ] Gestão abre conversas com registro
- [ ] Recados na bateria de isolamento

### Lote 21: computador da instituição e crachá (A4, C1)
- [ ] Tabelas de computador e crachá
- [ ] Limite de tentativas por computador
- [ ] Sair confirma o salvamento; saída sozinha em 10 minutos

### Lote 22: curso para educadores e visualizador (D1)
- [ ] Tipo de curso liberado pelo vínculo
- [ ] Formação de mediador libera as turmas
- [ ] Visualizador de entregas na área das instituições

### Lote 23: site, clínicas e parceiras
- [ ] Entrada Para clínicas e projetos educativos
- [ ] Página das instituições parceiras

### Lote 24: turmas, sala do professor e recados por turma (D2)
- [ ] Turmas e participantes
- [ ] Sala do professor
- [ ] Caixa por turma e recado para a turma inteira

### Lote 25: tarefas com prazo e resultado (D3, D4, C2, C3, C5)
- [ ] Tarefa para a turma
- [ ] Tarefa no Início da criança
- [ ] Resultado por aluno
- [ ] Menu curto no espaço da escola

### Lote 26: IA por ano escolar e botão do professor (A10)
- [ ] Regra por ano escolar empurrada para o members
- [ ] Botão do professor com validade
- [ ] Ensino médio decidido pela gestão

### Lote 27: gestão da escola e Para escolas (A2, A6, B7)
- [ ] Primeiros passos, computadores, crachás, pessoas
- [ ] O que a escola vê, na área dos pais
- [ ] Entrada Para escolas no site

### Lote 28: cadastro do aluno (A3, A5, B2)
- [ ] Importação da planilha
- [ ] Conta criada ou encontrada (`ensure-buyer` com consumidores permitidos)
- [ ] Rota interna de criar o perfil do aluno
- [ ] Bilhete e primeiro acesso
- [ ] Escolha do perfil que segue; conta provisória; aviso à família cliente

### Lote 29: vagas pagas pela instituição
- [ ] Rota interna de liberação com prazo no members
- [ ] Número de perfis como união e cobertura por criança
- [ ] 30 dias depois do fim; apagamento em 90 dias

### Lote 30: contrato da grade e cobrança (A7)
- [ ] Contrato e alunos ativos no dia 1º
- [ ] Lançamento mensal, Pix e número da nota

### Lote 31: relatório da BNCC, nota e programa próprio (A9)
- [ ] Relatório em arquivo
- [ ] Nota opcional da tarefa
- [ ] Programa próprio das parceiras

### Lote 32: ranking da escola (C7)
- [ ] Coorte por instituição
- [ ] Desligado por padrão; primeiros lugares e a posição da criança

### Lote final: full review
- [ ] `code-review` em `high` no diff inteiro da frente
- [ ] Revisor independente sem contexto
- [ ] Bateria de isolamento completa
- [ ] Lista do que vai para a produção e em que ordem

## Ressalvas

Abertas:
- **Typecheck:** não roda na máquina original; fica com o CI depois do push. Anotar aqui cada CI vermelho e o conserto.
- **Regras adotadas sem confirmação da Helena:** as nove de [REGRAS-DE-NEGOCIO.md](REGRAS-DE-NEGOCIO.md), seção 17.
- **Validação pedagógica:** a ligação de cada código da BNCC com as habilidades e as aulas é proposta; a equipe pedagógica valida antes de publicar o relatório (lote 31).

## Decisões tomadas durante a implementação

| Data | Lote | Decisão | Por quê |
|---|---|---|---|
| 28/11/2026 | 0 | `docs/familias-e-escolas/canvas` fora do Biome | São geradores e páginas do Canvas, não código do produto. |
| 28/11/2026 | 0 | Push no fim de cada lote (antes, esta frente só commitava local) | Pedido da Helena: outra sessão, em outro computador, precisa continuar. |

## O que depende da Helena

- Criar o serviço `institutions` no Railway de staging e, depois, de produção (o lote 9 deixa tudo pronto).
- Autorizar a conferência, no banco da staging, de que o usuário da aplicação respeita o isolamento.
- Produção: quando e como.
- Confirmar ou mudar as nove regras adotadas.

## Fora do código

- Gravar as aulas: posto Faísca completo (fase 1), formação de mediador (fase 2), posto Construtor e trilha Ensinar a pensar (fase 3), posto Inventor e os módulos de Mundo Digital e Cidadania Digital (fase 4).
- Três documentos para o advogado: termo de parceria (com anexo de vagas), termo do contraturno com acordo de dados, contrato da grade.
- Conversas: com a primeira clínica parceira, sobre o painel; com uma escola próxima, sobre a turma de contraturno de maio.
- Validação pedagógica dos códigos da BNCC.

## Histórico das sessões

| Data | Sessão | O que fez |
|---|---|---|
| 28/11/2026 | Proposta e plano | Canvas versão 3.0 aprovado, levantamento do código, plano aprovado, Lote 0. |
