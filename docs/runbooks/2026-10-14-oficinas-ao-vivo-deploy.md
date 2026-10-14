# Implantação das oficinas ao vivo

Escopo autorizado: preparar infraestrutura de staging e produção; publicar a aplicação somente em staging. A promoção para main depende da validação em staging.

## Sequência

1. Conferir recursos e autenticação; preservar segredos e serviços existentes.
2. Criar SFU/TURN e supervisor separados por ambiente; configurar R2 privado.
3. Criar gravador privado e volume por ambiente; configurar comunicação interna sem disparar deploys da aplicação em produção.
4. Integrar gravador, variáveis e volumes à configuração central Railway; preparar testes de mídia no CI.
5. Validar container Linux, configuração, testes e builds; versionar somente o módulo e suas dependências.
6. Commit e push em staging; acompanhar CI, migrações e deploys até os healthchecks.
7. Ensaiar infraestrutura e jornada em staging; manter produção com mídia desativada até sua promoção aprovada.

## Restrições operacionais

- `LIVE_MEDIA_READY=false` até validação de mídia no ambiente correspondente.
- Um gravador, uma réplica, uma gravação simultânea por ambiente inicialmente.
- Gravações, materiais e prévias no bucket privado do ambiente. Expiração de prévias apenas no prefixo `live/previews/`.
- O gravador prepara as permissões do volume. Chromium executa como usuário sem privilégios numa VM Railway Sandbox privada, criada apenas durante a captura, com sandbox habilitado.
- Tokens ficam nos provedores; somente nomes de variáveis e identificadores de recursos são versionados.
- Migrações Members `0102`–`0106` pelo preDeploy; não executar `db:push`.
- Atualizar Members e BFFs de forma coordenada. Novas publicações no mural exigem chave de idempotência.
- A configuração automática continua recusando exclusões e mudanças de infraestrutura fora do escopo. Provisionamento inicial é uma operação explícita anterior ao deploy normal.

## Evidências

Preparação em 14/10/2026:

| Recurso | Staging | Produção |
| --- | --- | --- |
| Railway live-recorder | `a4e0c11a-03be-4ada-bd79-d8f4cdf8d3fd` | Mesmo serviço, instância isolada no ambiente |
| Volume | `live-recorder-volume`, `/data/live-recorder` | Volume próprio do ambiente, mesmo nome |
| SFU | `25aae1191f5f1295780e35d0f2103e2b` | `acd60e5538426615eacfcd117c68bfe9` |
| TURN | `30788537e9788b1fb9b999438ccd6c99` | `3aea6c71e9378bf393aa3ce802a8cd35` |
| Supervisor | `sistemazero-live-supervisor-staging.helena-bcc.workers.dev` | `sistemazero-live-supervisor-production.helena-bcc.workers.dev` |
| Bucket privado | `testes-privado` | `comunidade-sistema-zero-privado` |

A variável GitHub `RAILWAY_LIVE_RECORDER_SERVICE_ID` identifica o gravador nos workflows. As novas credenciais foram configuradas via operação com `skipDeploys:true`; produção permanece com `LIVE_MEDIA_READY=false`. Os volumes adotam a capacidade padrão de 50 GB do projeto e alertas em 80/95/100%; acompanhar uso efetivo e retenção. Não aplicar redução de volume pelo gate automático.

Supervisores publicados em ambos os ambientes. A verificação autenticada confere escrita/leitura real do Durable Object, rejeição de token do outro ambiente, geração de credenciais TURN e gravação/leitura/exclusão de um objeto técnico no R2. A política de expiração de um dia foi adicionada somente a `live/previews/`, preservando as regras existentes.

O teste Linux local confirmou usuário sem privilégios, escrita no volume e Chromium com sandbox após aplicar o perfil seccomp oficial do Playwright. O runtime comum Railway recusou o namespace do Chromium. A VM isolada passou no teste com SFU real; a integração completa depende dos Project Tokens próprios e do ensaio de staging.


## Ajuste identificado na implantação

O Chromium não conseguiu usar seu sandbox no serviço comum Railway. Browser Run da Cloudflare também foi descartado após falha real de recepção WebRTC. A alternativa validada isoladamente usa Railway Sandboxes com Playwright 1.62.1 e Node 24, preservando FFmpeg, SQLite, volume e R2 no serviço existente.

As bases `live-browser-1-62-1-20261014` foram preparadas nos dois ambientes, sem credenciais ou mídia real. Falta configurar `LIVE_BROWSER_RAILWAY_TOKEN` com Project Token de cada ambiente, `LIVE_BROWSER_MODE=railway-sandbox` e `LIVE_BROWSER_CHECKPOINT`. A criação dos tokens foi recusada para a sessão da CLI (`Not Authorized`); a pessoa responsável precisa criá-los em Project Settings → Tokens. A adaptação permanece sem implantação até validar essa configuração. `RAILWAY_ENVIRONMENT_ID` é fornecido automaticamente pelo Railway.

O CI inicial encontrou regressões de menu/copy, interferência entre testes e a restrição AppArmor do runner. Corrigidas em `1ccc907a5`; a suíte geral passou. O passo seguinte revelou mistura de tipos Node numa instalação limpa: `@types/node` passou a ser dependência direta do gravador em `e998ae9c4`, com reprodução e correção verificadas em Linux. Esse commit dispara nova validação e deploy de todos os serviços de staging por alterar `bun.lock`. Ainda não significa deploy concluído.

Durante a pendência, `LIVE_MEDIA_READY=false` nos dois ambientes. Nenhuma aplicação de produção foi atualizada. A VM temporária usada nas sondagens foi destruída. Seguir o [plano de runtime](../plans/2026-10-14-gravador-runtime-railway.md) para terminar a integração e registrar a validação final.
