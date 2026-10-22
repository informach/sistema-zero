# Correções da revisão Python — 22/10/2026

Implementa os ajustes aprovados na [revisão da continuação](2026-10-22-review-continuacao-python.md),
a partir de `c4222471a`, conforme o [plano de execução](2026-10-22-python-review-fixes.md).
Os lotes foram implementados em worktree própria, revisados entre si e submetidos
a uma revisão final do conjunto. A sessão de chaves Railway permaneceu dona dessa
frente: não houve alteração de credenciais, configuração hospedada ou produção.

## Correções

| Achado | Resultado |
| --- | --- |
| Dotenv na pilha local | Preflight antes de escrita/spawn nos entrypoints e helpers. Bun usa `--no-env-file`; caminhos descobertos por Next e pelo fallback Wrangler são recusados sem ler valores. O `.dev.vars` local gerado continua permitido e o encerramento seguro permanece utilizável. |
| Portabilidade | Distribuição padrão deriva da worktree e do SHA do plano. Plano, catálogo, descritor, tamanhos, hashes, gzip e caminhos são conferidos antes de gerar segredos/configuração/banco. Há opção explícita de omitir a preparação Python, sem falso sucesso silencioso. |
| Latência de entrada | Removido o segundo repaint arbitrário como prova de resposta. O instrumento correlaciona entrada confiável, efeito no ator original e token visual na mesma apresentação. Recusa efeitos ausentes, atrasados, invertidos ou de geração anterior. O marcador não cria outra Turtle nem gera animação nos updates sem mudança. |
| Gate F1 | Reporter integrado ao workload F1 exige pelo menos 30 amostras por fase, identidade/pins/cache/rede coerentes e p95 ≤ 12.000/3.000/1.500 ms. Preserva negativos antes de reprovar. Perfil de CPU ligado não aprova o orçamento normal. Não exige que uma única amostra lenta reprove uma série cujo p95 permanece válido. |
| Duração F3/Space | Padrão de 600.000 ms, duração real monotônica anexada e janelas menores identificadas como diagnóstico. Decisão de dois quadros conciliada no contrato, mantendo os limites de entrada e pintura. |
| Continuidade dos artefatos | `65c9bffd…` reproduzida duas vezes, incluindo stdlib compilada dos inputs. Os 41 arquivos correspondem ao descritor. ZIP complementar remoto publicado no rascunho autorizado e baixado novamente com SHA/tamanho idênticos. |
| Aviso Admin | Vincular manifesto informa o modo efetivamente selecionado, preserva a escolha e mantém a confirmação de substituição obrigatória. Não promete preservação de mídias que o manifesto pode retirar do rascunho. |
| Status documental | Retomada/lacunas distinguem o histórico do estado atual. `python-live` em memória e sem mídia não fecha contas/perfis/banco/vídeo/gravação nem Admin→aula gravada→aluno. CI aprovado não foi confundido com deploy. |

## Verificação final executada

Execuções Bun 1.3.11 seriais com `--no-env-file --smol`, no cwd canônico:

| Grupo | Testes | Asserções |
| --- | ---: | ---: |
| Isolamento e input local | 12 | 350 |
| Reprodução da distribuição | 8 | 25 |
| Promoção canônica, incluindo extração do verificador | 28 | 204 |
| Matcher, sampler real serializado e reporter F1 | 36 | 81 |
| Preparação/preservação de Space Arena | 10 | 83 |
| Admin: vincular nos dois modos e confirmar substituição | 2 | 22 |
| Oferta Python/retorno para JavaScript | 3 | 9 |
| Core: publicação e capacidades | 10 | 69 |
| **Total, sem duplicar wrappers internos** | **109** | **843** |

Zero falhas e zero skips nessa seleção. Adicionalmente:

- Nove testes Python inertes do witness passaram em CPython 3.12; não são execução
  nativa do jogo nem homologação CPython/Tk 3.14. Os testes gráficos abaixo usam o
  interpretador da distribuição pinada.
- Biome verificou 39 arquivos de código/metadados; `git diff --check` passou.
- `validation-profile.ts --check` passou. Os fontes de runtime/Worker e o builder
  canônico não tiveram delta em relação à base; `bun.lock` permaneceu intacto.
- A descoberta Node 24.22 do workload F1 encontrou os quatro casos esperados com
  exit 0, sem iniciar serviços. Descoberta não foi somada como teste executado.
- A tipagem estrita focada passou com Node 24.22, TypeScript 5.9.3 e heap de
  1.536 MiB, primeiro com oito raízes temporárias e depois com as nove raízes do
  perfil versionado [tsconfig.python-qa.json](../../../packages/studio/tsconfig.python-qa.json),
  incluindo o teste do reproducer, após o ensaio F3 e sem concorrência.
- Dois passos explícitos foram acrescentados ao CI para os testes QA fora de
  `src/`, que o runner isolado do Studio não descobre. As seleções exatas passaram
  localmente: 22 testes/433 asserções e 44 testes/106 asserções, mais os nove testes
  Python. São repetições da seleção acima, não testes adicionais no total de 109.

Os logs finais estão em `.cache/review-fixes/final-*.log`. Os testes não substituem
o typecheck integral ou a suíte completa de todos os aplicativos.

### Limites e negativos da checagem de tipos

Uma tentativa inicial de configuração temporária na raiz não resolveu
`vite/client`; corrigiu-se a localização do config para o contexto do pacote.
Um escopo maior, incluindo as fixtures completas de editor, atingiu o limite de
heap de 1.536 MiB e encerrou com exit 134. Não foi declarado aprovado.

O experimento de aplicar o config estrito do Studio também à biblioteca legada
`scripts/local-studio-stack/lib.ts` revelou 34 diagnósticos de acesso indexado.
Os mesmos 34 diagnósticos/mensagens foram reproduzidos com os bytes de `c4222471a`,
sem diferenças. Isso não é um typecheck integral verde nem um erro novo introduzido
por este lote. O perfil focado não altera nem enfraquece o typecheck integral
existente do Studio; cobre explicitamente os instrumentos/helpers listados nele.

## Provas gráficas e artefatos

Os [dois diagnósticos gráficos](../../continuity/2026-10-22-python-witness-smoke.md)
passaram serialmente em Chrome 155 com Bun 1.4.3 e Node 24.22, sem Next, Vite,
Docker ou outro teste pesado simultâneo:

| Caso | Duração medida | Entradas/efeitos | Latência causal p95 | Pintura p95 |
| --- | ---: | ---: | ---: | ---: |
| F3 | 10.012,9 ms | 30/30 | 56,8 ms | 0,2 ms |
| Space Arena | 10.404,2 ms | 30/30 | 64,2 ms | 0,3 ms |

Não houve tarefa longa nem falha causal. Limites existentes permaneceram ativos.
Os processos conhecidos encerraram normalmente e a porta ficou fechada; isso não
substitui F6 de 30 ciclos ou enumeração independente de todo o kernel.

Em execução separada, F3 de dez minutos passou no Chrome: **600.015,9 ms**,
30/30 entradas e efeitos, resposta causal p95 de **62,4 ms**, pintura p95 de
0,2 ms e nenhuma tarefa longa. O anexo integral seguro e a reconciliação de
limpeza estão no [adendo do recibo gráfico](../../continuity/2026-10-22-python-witness-smoke.md#adendo-f3-completo-no-chrome-local).
Isso fecha a duração de F3 no Chrome nesta máquina, mantendo pendentes os outros
perfis e ambientes. Os dois smokes acima continuam diagnósticos.

A [reprodução e cópia remota](../../continuity/2026-10-22-python-distribution-reproduction.md)
têm instruções e recibo versionados. O ZIP tem 12.685.507 bytes e SHA-256
`5418f61888e2d9482421345015c0a47c011524d74e544e7f0462c33eec4e5bbd`.
Os recibos históricos de navegador da outra máquina continuam ausentes; não
foram fabricados nem substituídos pelos recibos novos.

## Fronteiras que continuam abertas

Continuam separadas desta correção: F1 estatístico real completo, perfis de
desempenho restantes, máquina de referência, fluxo hospedado Admin→aula→aluno,
identidade/persistência/mídia/gravação reais, promoção/ativação da `audio-2` com
baseline remoto fresco e provas restantes de jogos/áudio. O seletor Python
administrativo e os comportamentos JavaScript permanecem como no código integrado.
Executar os jogos de referência em Python não comprova construir cada jogo inteiro
somente com blocos: a cobertura visual integral de Pac-Man e Space Arena ainda
precisa de qualificação própria, distinguindo blocos reais de trechos preservados
como código fonte quando não há codec correspondente.
Não houve autorização ou declaração de aceite de produção neste lote.
