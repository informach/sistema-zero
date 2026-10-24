# Gravação: conferência das implantações

## Versões ativas

- PR #212, merge `93f7f9221d5f97b4281d131d0b372b676378fad2`; árvore de produto aprovada no head `b2d096faec691b31ae7c798bd179b87da65a45de`.
- Staging: 18 serviços conferidos, cada um com uma única implantação ativa SUCCESS no head aprovado; zero pendentes.
- Produção: Admin, comunidade adulta, Kids e funil com uma única implantação ativa SUCCESS no merge aprovado; zero pendentes. Versões anteriores retiradas.
- Os dois jobs principais de CI e todas as provas exigidas passaram. O CI do PR `40098730322` concluiu SUCCESS.

## Conferência independente do acompanhamento

O workflow de staging `40098726146` falhou no acompanhamento porque o polling por serviço excedeu a cota da API do Railway. O workflow de produção `40101791461` expirou após os 20 minutos reservados aos aplicativos. Esses resultados negativos foram preservados: não são workflows de deploy verdes.

As operações já tinham sido aceitas pelo Railway. Não foram repetidas. A reconciliação posterior conferiu suas identidades e o resultado real: os deployments terminaram e as versões anteriores foram retiradas.

Por SSH somente leitura, com serviço/ambiente/commit conferidos, os bundles ativos dos três aplicativos Next nos dois ambientes contêm “Objetivos do projeto” e “Verificar projeto”. O CSS novo do menu adulto existe nos dois. Health público dos quatro aplicativos nos dois ambientes: oito respostas 200. As duas páginas públicas de oferta testadas também retornam 200 e a ação nova; o CSS adulto servido publicamente confirma o menu novo.

Isso confirma a publicação desta entrega; não equivale a uma nova homologação autenticada de todos os fluxos da plataforma. A prova visual local do menu e os demais testes estão em [recording-release](2026-10-24-recording-release.md).

## Gravações e próximos lotes

Nenhum texto de aula publicado foi migrado diretamente: a responsável reimportará os manifestos. Nenhum áudio/vídeo foi substituído. Nas fontes, os 87 clipes afetados usam exatamente o mesmo trecho: “Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.” Ele pode ser gravado uma vez e reutilizado. [Inventário](2026-10-24-project-label-recording-impact.md).

As novas funções financeiras permanecem fora desta implantação. Por orientação da responsável, a correção do acompanhamento será integrada junto da entrega financeira. A mudança do orçamento dos aplicativos de produção para 60 minutos conserva o teto global de 175 minutos e a recusa quando o prazo se esgota, sem repetir POST. Regressão causal: os casos de conclusão em 21 e 59 minutos falhavam antes e passaram depois; controles de 60 minutos e do limite global continuam recusados. Suíte `scripts/ci`: 273 testes, 1.010 asserções, zero falhas. O batching/backoff do acompanhamento de staging ainda precisa ser corrigido nesse lote operacional.
