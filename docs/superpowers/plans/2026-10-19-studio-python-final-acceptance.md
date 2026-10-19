# Fechamento integrado do Estúdio Python

Este registro organiza o aceite final. Não substitui os contratos R01–R22 de [validação](../../plans/2026-10-16-estudio-python-validacao-entregas.md) nem as metas de [desempenho](../../plans/2026-10-16-estudio-python-desempenho.md). Um teste funcional verde não aprova automaticamente desempenho ou implantação.

Base integrada: `fb90b50559b9e84401a332754f42563bcd291d79`, enviada a `staging`. A frente pedagógica adicional permanece em outro worktree; sua imagem de validação não está implantada. O histórico detalhado e os resultados anteriores estão no [registro de execução](2026-10-16-studio-python-execution-state.md).

## Identidades que não podem ser confundidas

| Objeto | Identidade / situação |
| --- | --- |
| Distribuição imutável Python | `996e6097c599d21c5d92fc7e9f03145f155d080a2d83f6d4aaa6a25785c0afd7`, 39 arquivos, 22.327.910 bytes |
| Release aprovada no plano de staging | `56204780388c78e8ecf978da984eca182ed4ac958e78c63a22ac286210ab7880` |
| Catálogo de execução de staging | `40ce822aab07184da90bec7a0902296d4889c011740063be6c859bc5b60c57b2`, carregado no R2, ainda sem ativação Members |
| Release do harness de editor | `9e37cb151ab61effadad2c49eecd6217f0137effc773db4c1d16fc23833465f7`: aprovação exclusiva de QA sobre os mesmos bytes; nunca promover como release do produto |
| Fingerprint pedagógico em qualificação | `992c1d36c85fd15cdb77ff29f1a033e8d403ec7d1b4f4deee475a2663e86249c`: identifica o contrato do Worker/imagem, não substitui o manifesto Python |

## Gates finais e dependências

| Gate | Evidência atual | Trabalho necessário para fechar |
| --- | --- | --- |
| Checkpoint local de banco | `members-db-ci39308143317-full-r3/receipt.json`: 339 aprovados, 38 ignorados, zero falhas; ferramentas PostgreSQL nativas verificadas | Tratar cada teste ignorado conforme seu contrato; não contar como aprovado. CI Linux atual é prova separada |
| Tipos e estilo do checkpoint | Members e Studio completos aprovados; Biome CI em 10.420 arquivos, sem mudança das regras | Repetir somente os gates afetados por novo diff ou falha |
| CI remoto e rollout | CI39328119176, no checkpoint7ada, aprovou os oito jobs independentes, testes e38checagens de tipos. Falhou somente no Hub: tipos Node22/25 conflitantes em `Server.once`. Hub agora declara Node24.19.0; instalação Bun1.3.11 frozen isolada e HubTSC completo passaram, mantendo o teste intacto e a dependência transitiva25 no grafo instalado | Novo catch-up com base anterior ao rollout `3190d9e0…`. Preflight SSH, sequência canônica da Jornada e implantação ainda não foram alcançados; não declarar CI completo |
| Inicialização F1 | Quatro combinações passaram nas medições locais abaixo: 52 fluxos funcionais, dez amostras medidas por combinação | Amostragem normativa e vídeo. Este recorte não aprova F1 completo |
| Memória e encerramento | Provas anteriores de console em Chrome/Edge e 30 ciclos, sem relaxar 256 MiB | Editor + parser + execução agregados, F4 e vídeo; não extrapolar a prova de console |
| Publicação e jogo públicos | Cadeia real Auth/SQL/R2/browser anterior passou oito percursos por navegador; publicação/remix/moderação observados | Revalidar as mudanças pertinentes e a implantação de staging, incluindo as quatro variantes JS/Python e execução anônima |
| Serviço de linguagem | Worker isolado qualificado em staging e produção, 12 controles reais em cada ambiente | Editor e carga de oficina com o serviço implantado, sem confundir saúde do serviço com desempenho do editor |
| Pedagogia adicional | Provas992 completas, incluindo Python assíncrono/preview. P2 de sprites projetados corrigido e revisto; seis tipos,173testes e novo perfil/imagem78 passaram. Imagem78: quatro casos projetados e matriz18/90observações aprovados | Concluir Worker/SQL/Python78. As provas992 permanecem históricas, sem alegar validade para bytes posteriores; conteúdo A2 não ativado |
| Infra Python staging | Distribuição R2 e entrega pública verificadas; Worker e serviço de linguagem preparados | Concluir rollout e ativar catálogo/hosts no Members por último; depois validar UI e autoridade reais |
| Infra Python produção | Variáveis preparadas, análise qualificada; distribuição ainda incompleta | Resolver causa do operador R2 e qualificar promoção. Não atualizar o runtime compartilhado enquanto o aplicativo publicado usar o contrato JS antigo |

Os diretórios de evidência acima são relativos a `.cache/studio-python-l0/` no worktree Python; a frente pedagógica guarda seus recibos em `.cache/pedagogical-p0/` no worktree integrado dela. Cache local não é artefato disponível automaticamente no GitHub.

## F1: medições locais parciais

| Combinação | p95 frio | p95 cache | p95 após editar | Evidência |
| --- | --- | --- | --- | --- |
| Pro / Chrome | 8.395,70 ms | 1.428,40 ms | 1.429,90 ms | `jci-f1-overlap-candidate-chrome-pro-20261019T192837787Z/` |
| Clássico / Chrome | 7.966,80 ms | 1.080,10 ms | 1.113,50 ms | `jci-f1-overlap-classic-chrome-20261019T203348014Z/` |
| Pro / Edge | 8.379,30 ms | 1.479,70 ms | 1.363,20 ms | `jci-f1-overlap-pro-edge-20261019T203918493Z/` |
| Clássico / Edge | 8.016,10 ms | 1.412,70 ms | 1.113,40 ms | `jci-f1-overlap-classic-edge-20261019T205421564Z/` |

Cada série tem três aquecimentos e dez amostras medidas, sem retries ou exclusão de falhas. Todos os 13 fluxos e todas as dez amostras de cada série passaram. Distribuição996 preservada e sete hashes capturados conferidos após cada série. Mesmo computador de 16 GB; condições de memória inicial diferentes estão nos recibos, sem alegar controle completo do sistema. Servidor de QA com shaping de respostas 20 Mbps/80 ms, não emulação completa da rede. Tempo até bitmap útil observado, não até apresentação pelo compositor. Nenhuma chamada de vídeo nesta prova.

## Matriz de revisão antes da conclusão

Todos os requisitos abaixo continuam abertos para o aceite final integrado. A base implementada e os testes existentes devem ser reaproveitados com sua identidade original; repetir sem novo risco não substitui localizar a evidência correta.

| Requisitos | Conferência final |
| --- | --- |
| R01–R02 | JS como padrão, leitura/migração sem perda e distinção entre documento válido, permissão e executor disponível; tráfego de sessão somente JS sem interpretador/analisador Python |
| R03–R04 | Blocos/Ponte preservando fontes e undo; Pro com imports, diagnóstico, navegação, rename revisado, console e input nos hosts finais |
| R05–R08 | Admin → aula gravada e live, clássico e Pro; semente/extensões; revisão, lease, epoch e devolução de assistência sem escrita tardia |
| R09–R10 | Mural e `/jogar/:id` anônimos nas quatro variantes; continuidade pós-oficina, fonte atual e política de acesso preservadas |
| R11–R12 | Conformance Turtle com referência CPython/Tk e execução de ZIP fresco fora do monorepo; evidência nativa não deve ser chamada de teste no VS Code se o editor não foi exercitado |
| R13–R14 | Publicação e retenção transitivas, revogação, descarte e replay; Zappy/atividades com ambiente e CAS atuais, sem expor solução privada |
| R15 | F0–F10 e metas completas, inclusive entrada/frame, fila/renderer, parser + execução agregados, vídeo, F4 e carga professor/30 alunos |
| R16–R18 | Futuras bibliotecas apenas previstas; Pinta com bytes e proveniência, atualização/cancelamento/exportação; Molda Python não oferecido neste lote; Pensa permanece JS |
| R19–R20 | Python básico independente; zero implementação gráfica Turtle quando ausente; adicionar/remover/importar/remixar sem apagar fonte nem ampliar permissões |
| R21–R22 | Mapear cada item P01–P16 de Pac-Man e S01–S10 de Space Arena às provas de fonte/corpus pinado; adaptações e fronteiras de OS explícitas |

## Próxima janela de desempenho

1. As quatro séries diagnósticas F1 estão encerradas e seus servidores foram encerrados. A janela pesada está com a revisão/validação pedagógica; não disputar CPU e memória com outra medição.
2. Preservar as 52 execuções e suas distribuições originais. Áudio portátil e qualificação integral de Pac-Man/Space Arena ainda exigem implementação, além de testes; consultar os contratos R21/R22.
3. Ampliar para vídeo/F4 e amostragem normativa somente com artefato e cenário explicitamente identificados. Uma nova distribuição não herda as medidas996 como se fossem suas.
4. A sala admite no máximo oito alunos. Medir a UI com oito e professor; para carga de trinta alunos, usar quatro salas válidas (8+8+8+6) e registrar quatro professores. Não remover a guarda de capacidade para produzir o benchmark.
5. Se uma meta falhar, guardar o negativo e perfilar antes de mudar produto. Hardware de 16 GB serve à validação local, não substitui o computador de referência de 8 GB.

O teste no segundo computador e a homologação física móvel seguem o adiamento solicitado pelo usuário. A programação é priorizada no computador; consulta responsiva continua no escopo. Nenhuma dessas medições adiadas será apresentada como executada.
