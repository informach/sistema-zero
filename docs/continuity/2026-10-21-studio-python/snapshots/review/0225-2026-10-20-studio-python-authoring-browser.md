# Studio Python: recorte de autoria em Chrome e Edge — 2026-10-20

A execução r5 aprovou 16 casos de Fonte/Ponte e remoção de Turtle, oito em Chrome e oito em Edge, sem falhas, pulos ou resultados instáveis. Este registro documenta esse recorte de autoria; não concede aceite completo do Studio Python.

## Fonte e execução

- Worktree: `C:/Users/tocha/projects/sistema-zero-python-review`, branch `feat/studio-python-authoring-review`.
- HEAD testado: `44a27bde60c6ccc5cc8d68e75310f54d172deafe`, com diff vazio antes e depois. O lote R20 é `71ee6b497f734e6e17312ea430f2f478708c6691`; o commit `44a27bde6` contém o lote de dois arquivos de preparação E2E.
- Distribuição imutável: `a8a6c625e8c35552c66265f03a7de1bcda96f44306306206d2ac5f88366b6b4a`. O preflight registra os hashes de Node, Bun, operador, config e três specs.
- Operador: `.cache/authoring-browser-r5/run.mjs`, com um worker, zero retries e limite global Playwright de 360.000 ms. Chrome e Edge executaram em sequência. O build leve da fixture Vite integrou a execução.
- Preflight fresco: 4,977729797 GiB livres; binds exclusivos de 5297/5298 disponíveis em IPv4 e IPv6; hashes conferidos.

Todos os horários abaixo são UTC de 2026-10-20. A autorização terminava às 18:23, com início proibido após 18:17.

| Evento | Horário |
| --- | --- |
| START do runner r5 | 18:13:25.043 |
| END do operador r5 | 18:14:32.848 |
| Conferência adicional de identidades | 18:15:07.817 |

O relatório registrou 67.009,67 ms, incluindo setup, CLI 0 e nenhum erro global. Não houve nova execução após END. A janela foi devolvida à coordenação antes do limite autorizado.

## Casos efetivamente executados

| Comportamento observado | Por navegador | Total |
| --- | ---: | ---: |
| Ponte sincroniza edições Blockly/Monaco e executa o Python salvo | 1 | 2 |
| Curadoria e revogação da aprovação de blocos preservam a fonte Python | 1 | 2 |
| R20 clássico/Pro: import conhecido recusa remoção com `main.py:2`; fonte corrigida permite remoção e permanece salva | 2 | 4 |
| Clássico/Pro: Undo não restaura fonte que passou a exceder a cota do projeto | 2 | 4 |
| Clássico/Pro: fonte recusada mantém modelo/fonte consistentes e Undo/Redo das edições aceitas | 2 | 4 |
| **Total** | **8** | **16** |

Os casos R20 usam o editor Monaco por `executeEdits`, os controles reais de extensões e `Ctrl+S`, com comparação da fonte persistida. A verificação não representa digitação física nem execução de desenho Turtle nesses casos. Os fluxos de criação também confirmam JavaScript como opção inicialmente selecionada.

## Encerramento e revisão independente

O runner r5 foi o PID 40356. Os snapshots registraram Bun 13396 em `http://127.0.0.1:5297` e runtime `http://127.0.0.1:61662`, e preview Node 37024 em `http://127.0.0.1:5298`. A saída manteve a fonte estável, drenou os logs e confirmou liberação das três portas.

A conferência posterior comparou PID e horário de criação das 29 identidades registradas nas fases Chrome/Edge: nenhuma permanecia viva, nenhum PID havia sido reutilizado e não havia listeners nas portas observadas. Nenhum processo alheio foi encerrado.

Oito anexos de teardown das sessões de linguagem registraram zero erros de coleta/limpeza; as métricas cumulativas das leases HTTP observadas foram três abertas, três fechadas e zero vivas. Frames locais do parser têm outra fronteira: os specs fecham/desmontam a UI e o operador encerra o host. As métricas HTTP não demonstram, sozinhas, o ciclo de vida de todo Worker/frame.

A revisão independente, somente leitura, conferiu 21/21 artefatos, cinco hashes de entrada, relatório, janela, origens e identidades. A aprovação está no suplemento `authoring-review-receipt-r4-review.json`. O consolidado anterior mantém o campo de revisão pendente tal como foi emitido; o suplemento referencia seu hash, sem reescrevê-lo.

## Negativo r4 preservado

A tentativa anterior teve START às 18:12:39.700 e END às 18:12:43.677, com CLI 1 antes dos testes. O config de QA em `.cache` não fixava o `cwd` do servidor do editor; Node procurou `.cache/authoring-browser-r4/scripts/python-editor-web-server.mjs` e falhou com `MODULE_NOT_FOUND`.

A correção ficou somente no novo config de QA r5: ambos os `webServer` herdados receberam `cwd` explícito em `packages/studio`. A revisão independente confirmou a resolução dos dois comandos. O negativo r4, seus logs e recibo permanecem intactos; suas portas 5297/5298/runtime 61617 foram liberadas. Nenhum caso r4 foi contado como aprovado.

## Recibos e hashes

Os caminhos da tabela são relativos ao worktree acima. Os artefatos ficam no cache local, fora deste commit documental. O consolidado positivo `authoring-review-receipt-r4.json` descreve **a execução r5**; seu nome não transforma a tentativa de execução r4 em sucesso.

| Artefato | SHA-256 |
| --- | --- |
| `.cache/authoring-browser-r4/receipt.json` — negativo | `03154e7308c99e40113997776fbe4842364bf57132a860187765695119956966` |
| `.cache/authoring-browser-r4/stderr.log` — causa | `176a0dc0b3b2ea65927cf13045d0e1c45a31e72171b5ef16abfabce1f863e7a8` |
| `.cache/authoring-browser-r5/preflight.json` | `aa0ae31ccd162b377b6ef942bab472533d670ca50bdee4e2cd664f259a811172` |
| `.cache/authoring-browser-r5/receipt.json` | `6a8bcbf3f8acc3f214a67696b4de38f8687079b6a66dcca800248030efc994cf` |
| `.cache/authoring-browser-r5/playwright-results.json` | `a021a41bd6a0318589e5c14d1497ee7001e5d66d04b63d76823766b8db54d08d` |
| `.cache/authoring-browser-r5/stdout.log` | `8c5f1f7ee16ede79d291637a8f95a711e21552c26c61cf217358a930391a9228` |
| `.cache/authoring-browser-r5/cleanup-identity-check.json` | `c254b3c041c60c747acdb68c74e6001abbfe916e0ffa9f3c1f026d90bee8fb61` |
| `.cache/authoring-review-receipt-r4.json` — consolidado r5 | `c36c90bd503e957e51fe67dc8b8760dfa100b4862ed4797dd2c5131b1600dc39` |
| `.cache/authoring-review-receipt-r4-review.json` — aprovação delimitada | `c2989ab6ebcdcff3e4c91f7dd95b37363e7d1e27a5651413d7f18abdb5f591f7` |

## Limites deste registro

O recorte de browser confirma apenas a seleção padrão de JavaScript; não repete nem substitui a suíte JS completa ou os controles anteriores, que conservam seus próprios horizontes. A inspeção estática R20 cobre imports conhecidos, sem promessa geral para imports dinâmicos como `importlib.import_module(...)` ou `__import__(...)`.

Este resultado não qualifica mobile, desempenho, full TSC, outros hosts, infraestrutura, aulas/Admin/live, Mural, galeria pública ou os fluxos Pinta/Zappy. Não houve Docker, alterações em provedores, Core/Runtime de produção ou fingerprint durante a janela. Os avisos existentes do build sobre chunks/imports dinâmicos foram observados sem ajuste de desempenho. Este commit acrescenta somente este documento; nenhum teste foi reexecutado para produzi-lo.
