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

- `LIVE_MEDIA_READY=false` em produção até validação de staging e promoção aprovada. Em staging, ativar somente para o ensaio controlado depois da validação técnica de mídia.
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

O teste Linux local confirmou usuário sem privilégios, escrita no volume e Chromium com sandbox após aplicar o perfil seccomp oficial do Playwright. O runtime comum Railway recusou o namespace do Chromium. A VM isolada passou no teste com SFU real. Os Project Tokens próprios foram fornecidos, validados e configurados nos dois ambientes.


## Ajuste identificado na implantação

O Chromium não conseguiu usar seu sandbox no serviço comum Railway. Browser Run da Cloudflare também foi descartado após falha real de recepção WebRTC. A alternativa validada isoladamente usa Railway Sandboxes com Playwright 1.62.1 e Node 24, preservando FFmpeg, SQLite, volume e R2 no serviço existente.

As bases `live-browser-1-62-1-20261014` foram preparadas nos dois ambientes, sem credenciais ou mídia real. `LIVE_BROWSER_RAILWAY_TOKEN`, `LIVE_BROWSER_MODE=railway-sandbox` e `LIVE_BROWSER_CHECKPOINT` foram configurados e conferidos após a escrita. Cada Project Token foi validado contra o projeto, o ambiente e a leitura do checkpoint correspondente. `RAILWAY_ENVIRONMENT_ID` é fornecido automaticamente pelo Railway.

O CI inicial encontrou regressões de menu/copy, interferência entre testes e a restrição AppArmor do runner. Corrigidas em `1ccc907a5`; a suíte geral passou. `e998ae9c4` corrigiu a resolução de tipos Node numa instalação limpa. O deploy subsequente aplicou as migrações `0102`–`0106`, mas revelou uma colisão de parâmetros no roteador composto do Members, corrigida em `b16ec961d` com teste de inicialização HTTP real.

`63b67ee3d` fixa o runtime do gravador em Bun 1.4.3 e testa o handshake Playwright real. `24a682820` corrige a negociação ICE e a ordem de encerramento. A sondagem com o código atualizado, executada dentro do serviço staging, gerou dois segmentos e um MP4 H.264/AAC de 130.010 bytes, confirmou pausa e destruição das VMs. Os objetos sintéticos foram removidos.

Os planos IaC dos dois ambientes retornaram zero alterações. A verificação real confirmou SFU, TURN, isolamento dos supervisores e leitura/escrita/exclusão no R2. Produção conservou os 20 deployments comparados à referência inicial e permanece com mídia desativada. Staging foi habilitado para o ensaio controlado do conjunto implantado.

O [CI 38616509787](https://github.com/informach/sistema-zero/actions/runs/38616509787) concluiu com sucesso e implantou Members, Admin, Community Kids, Community e live-recorder no commit `24a682820`. Todos passaram nos healthchecks. A suíte geral, os testes com bancos, a checagem de tipos e os testes de navegador passaram antes do deploy.

## Validação do ambiente implantado

Uma turma técnica, sem contas de crianças, abriu a sala de espera, entrou como professora e iniciou a aula. O transporte real do cliente publicou demonstração e áudio sintéticos. A gravação recebeu os callbacks privados, confirmou pausa, finalizou o MP4, passou para revisão e foi publicada pelo Members. O artefato de 105.811 bytes foi lido no R2 privado. A ocorrência técnica é `65cf736e-d5d0-4caa-9eca-1d80304babaf`; a oficina e a turma ficaram arquivadas. As VMs temporárias foram destruídas; a listagem posterior retornou zero VMs ativas em staging.

Dezesseis verificações HTTP passaram: saúde dos frontends, exigência de autenticação nas páginas e APIs das oficinas e arquivos locais da câmera no Admin e no Kids (modelo, JavaScript e WebAssembly, MIME e tamanho esperados). A política CORP efetiva dos frontends é `same-site`, conforme os headers globais. Essa prova confirma distribuição dos assets; não é um ensaio visual de segmentação de fundo.

Endereços para o ensaio humano:

- [Configuração das oficinas](https://admin-staging-f8fe.up.railway.app/admin/oficinas).
- [Painel da professora](https://admin-staging-f8fe.up.railway.app/admin/professor/ao-vivo).
- [Oficinas da criança](https://community-kids-staging.up.railway.app/oficinas).

Continuam pendentes a jornada completa pela interface com professora/aluno, oito dispositivos simultâneos, redes instáveis, recuperação de interrupções e medição de custo. Validar também consentimento e cursor de assistência, moderação, materiais, mural e acesso ao replay dentro e fora do prazo da aula. A recuperação automática de gravação interrompida não existe nesta versão; seguir o procedimento do [gravador](../../packages/live-recorder/README.md).

Produção está com infraestrutura e credenciais preparadas, sem promoção da aplicação. `LIVE_MEDIA_READY=false` deve ser alterado na promoção somente depois da validação de staging. `main` permaneceu em `6f93dcbfe8f176017b7b1ace5114d480ad5853b1`, e os 20 deployments existentes foram preservados. Seguir o [plano de runtime](../plans/2026-10-14-gravador-runtime-railway.md).
