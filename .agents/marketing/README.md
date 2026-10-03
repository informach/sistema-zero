# Marketing do Sistema Zero

Recursos adaptados do Fluxo Criativo em 01/10/2026 para pesquisa, produtos, copy do funil, conteúdo e campanhas. A avaliação e as decisões estão em [importacao-fluxo-criativo.md](importacao-fluxo-criativo.md); o [inventário](inventario-origem.csv) registra cada entrada da origem e seu destino.

## Uso

| Trabalho | Codex | Claude Code |
| --- | --- | --- |
| Coordenar marketing | `$marketing-sistema-zero` | `/marketing` |
| Pesquisa de mercado | `$pesquisa-mercado` | `/pesquisa-mercado` |
| Referências de anúncios | `$biblioteca-anuncios` | `/biblioteca-anuncios` |
| Produto e oferta | `$estrategia-produto` | `/produto-concepcao` |
| Copy da landing/quiz/checkout | `$copy-funil` | `/copy-pagina` ou `/lt-quiz` |
| Revisão de copy | `$revisao-copy` | `/feedback-pagina` |
| Anúncios e roteiros comerciais | `$criativos-anuncios` | `/copy-anuncio` ou `/copy-roteiro` |
| Social e calendário | `$conteudo-editorial` | `/copy-social` ou `/carrossel` |
| Métricas e experimentos | `$analise-marketing` | `/trafego-analise`, `/trafego-otimizar` ou `/trafego-escalar` |
| Estratégia de jornada/evento | `$estrategia-produto` | `/estrategia-funil` ou `/estrategia-lancamento` |
| Plano/execução de campanha | `$criativos-anuncios` | `/trafego-criar-campanha` |

Exemplos de pedidos:

- “Use $pesquisa-mercado para mapear alternativas à Comunidade dos Criadores no Brasil, com preço, suporte e objeções dos pais.”
- “Use $copy-funil para revisar o argumento da oferta do Desafio com base nas entregas reais e nas pesquisas existentes.”
- “Use $criativos-anuncios para preparar três anúncios da Comunidade, cada um com hipótese, roteiro, CTA e destino.”
- “Use $analise-marketing para comparar este CSV de campanhas com as conversões do funil e propor o próximo teste.”

Os seis especialistas do Claude ficam em `.claude/agents/`: `pesquisa-mercado`, `estrategista-de-produto`, `copywriter`, `criador-de-campanhas`, `analista-marketing` e `revisor-marketing`. No Codex, as mesmas capacidades são expostas pelas skills; não há dependência de um formato de agente exclusivo do Claude. A descoberta das novas skills pode exigir uma nova sessão; os arquivos também podem ser lidos diretamente.

## Organização e manutenção

- Fonte editável das nove skills: `.agents/skills/`.
- Espelhos completos para descoberta no Claude: `.claude/skills/`. Mantenha os arquivos correspondentes iguais; o validador detecta divergência.
- Comandos: atalhos pequenos para as skills, sem duplicar metodologia.
- Regra de marketing: `.claude/rules/marketing.md`, limitada aos caminhos de marketing.
- Hook: `.claude/hooks/marketing-copy-review.ts`, registrado em `.claude/settings.json` sem mudar permissões locais.

As skills preexistentes foram preservadas. O pacote não precisa do checkout do Fluxo Criativo, dos scripts de lá, de Apify ou de um modelo específico para funcionar. O caminho da origem aparece apenas no registro da importação.

As ferramentas de `.agents/` e `.claude/` podem ser versionadas normalmente, incluindo skills, agentes, comandos, regras, hooks e configurações compartilhadas. Depois de commit e push, elas acompanham o clone em outro computador. O `.gitignore` exclui apenas configurações pessoais (`settings.local.json`), worktrees, histórico local de sessões/planos, locks, caches Python e backups dessas pastas. Nenhum arquivo precisa ser forçado para o índice.

O Biome exclui `.agents/` e `.claude/` do lint da aplicação: as bibliotecas incluem templates e exemplos de terceiros que não são código executável do produto. O pacote de marketing tem as verificações próprias descritas abaixo.

## Revisão automática e manual

O hook usa Bun, já usado pelo monorepo. Após `Write`, `Edit` ou `MultiEdit`, fornece lembrete de revisão em arquivos de marketing. Para texto limpo em `docs/marketing/<audience>/<produto>/copy/*.{md,txt}`, lê o arquivo completo e usa o linter existente do backend. Em código, pesquisa e briefings mistos, só lembra a revisão: não interpreta operadores, citações ou notas como anúncio. Não altera arquivos, não bloqueia edições e não faz chamadas de rede.

O hook não roda em alterações por shell, `apply_patch`, ferramentas externas ou no Codex. Nesses casos, use a skill de revisão e, para texto limpo:

```powershell
bun .agents/skills/revisao-copy/scripts/check-copy.ts caminho/da/copy.md
```

Saídas: `0` sem ocorrências mecânicas, `1` com ocorrências para revisar, `2` erro de uso/leitura. Isso não verifica oferta, provas ou conversão.

## Verificação do pacote

Da raiz do repositório:

```powershell
python -X utf8 .agents/marketing/validate.py
bun test ./.agents/marketing/tests/marketing-copy-review.test.ts
```

O validador usa Python 3 e PyYAML e confere metadados, referências locais, espelhos, roteamento, inventário e configuração. Os testes exercitam a integração com o linter real, os limites do hook e os códigos de saída da CLI. A validação não executa campanha, não cria conteúdo no app e não testa conversão.
