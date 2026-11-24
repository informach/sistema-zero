# Verificação e continuidade — incremento das etapas 0 e 1

**A missão integral não está concluída.** Este incremento implementa salvamento
antes de executar e correção de escopo de persistência, além do laboratório
reproduzível e da restauração das imagens originais do Blockly pela própria origem.
O portão de isolamento ainda reprova um caso. As etapas restantes
seguem abertas em `plano-execucao.md`; não houve merge, deploy ou acesso a produção.

## Referência e alterações

- Origem: `origin/estudio-evolucao`, `d9ebd3fefe174530c7daf08340f72ceb78ac8258`.
- Branch: `estudio-evolucao-conclusao`, em worktree isolada.
- `1d82ae4e6`: decomposição da missão e critérios de execução.
- `eacbac8bc`: baseline, percentis por rodada, variante do Chromium e executor no Windows.
- `5e1e4f7be`: serviço local vinculado ao ciclo do perfil.
- `360a2bc58`: salvamento antes de Rodar/Rodar de novo, intenção cancelável e snapshot atual.
- `0b169f837`: mídia original do Blockly servida localmente nos quatro hosts.

O incremento não modifica CSS, temas, faces de blocos, categorias, campos, valores,
opções, projetos das aulas ou referências de código. Pinta, Molda e Molda Cenários
não foram alterados. As variações de glifos de emoji entre Linux e Windows nas
capturas não são mudança de estilo no código.

## Evidência final

| Verificação | Resultado |
|---|---|
| Matriz pedagógica | 43 casos aprovados, sem regravar referências |
| Cursos no Blockly sem tela | 15 casos aprovados; sete projetos preservados |
| Cursos no navegador completo | Cinco aulas aprovadas; 399 gestos, 13 partes |
| Objetivos pelo executor do servidor | 49 de estrutura e 17 de execução aprovados |
| Unidade, todos os grupos do pacote | 11.301 casos diretos aprovados em 162 grupos, 846 arquivos; rodada final completa aprovada |
| Typecheck do pacote | Aprovado com `tsc --noEmit` e cache incremental local |
| Biome dos arquivos de implementação e testes | Aprovado |
| Chromium: mídia, execução, segurança, falhas e gravação | 13 aprovações, **uma falha de reinício nativo** |
| Firefox: execução e segurança | Cinco aprovações |
| WebKit: gravação ao recarregar/esconder | Três aprovações |
| Mídia local do Blockly | Teste de navegador aprovado com hash correto; 18 arquivos por host conferidos contra o SDK |
| Capturas de depois | 13 PNGs, 13 resultados de objetivos e manifesto de hashes versionados |

A primeira rodada geral parou no grupo `src/state` porque a worktree nova não tinha as
dependências separadas do compilador. Os 156 grupos anteriores aprovaram 10.815
casos. Depois do **mesmo preparo do CI**, `src/state` aprovou 313 casos e os quatro
grupos restantes aprovaram 106 (`studio`), 12 (`styles`), 46 (`three`) e oito
(`ui-internal`). Depois da correção adicional das imagens do Blockly e do novo
teste de integridade, a rodada final executou os **162 grupos em uma única chamada**
do runner: 11.301 aprovações e nenhuma falha. Não foi removido ou enfraquecido nenhum
teste; as rodadas anteriores com falha não foram apresentadas como aprovadas.

O problema de cache de perfil teve reprodução vermelha antes da correção e verde
depois. O grupo de componentes foi repetido, com 590 aprovações. Os testes de
salvamento usam serviço, stores e adapters reais controlados por confirmação:
falha, buffers, clique duplo, Parar, desmontagem, edição durante a espera,
troca de projeto, observador e geração de escritor. O teste de Rodar de novo
observa além dos 800 ms para provar que o debounce não antecipa a gravação.

## Reproduzir a preparação e os testes

Na raiz da worktree:

```powershell
bun install --frozen-lockfile
npm ci --ignore-scripts --no-audit --no-fund --prefix packages/studio-runtime/runtime
bun test docs/aulas-interativas-tecnico/qa/matriz-compatibilidade.test.ts
cd packages/studio
bunx playwright install chromium firefox webkit
node scripts/test-isolated.mjs
$env:NODE_OPTIONS='--max-old-space-size=8192'
bunx tsc --noEmit
```

Os objetivos dinâmicos precisam do Chromium completo. O executor usa uma junção
no Windows, sem pedir privilégio para criar um link simbólico de diretório.

```powershell
$env:PW_CHROMIUM = node -p "require('playwright-core').chromium.executablePath()"
$env:SZ_CHECK_CHROMIUM=$env:PW_CHROMIUM
bunx playwright test e2e/protected-lessons.spec.ts --project=chromium --trace off
bunx playwright test e2e/blockly-media.spec.ts --project=chromium --trace off
bunx playwright test e2e/preview-hostile-programs.spec.ts e2e/reload-flush.spec.ts e2e/preview-security.spec.ts e2e/preview-executes-user-code.spec.ts --project=chromium --trace off
bunx playwright test e2e/preview-security.spec.ts e2e/preview-executes-user-code.spec.ts e2e/reload-flush.spec.ts --project=firefox --project=webkit --trace off
```

Se a preparação automática exceder o prazo, o procedimento já documentado do
repositório é subir `serve-e2e.ts` à parte; isso foi necessário neste laboratório
compartilhado. Não aumentar os prazos para esconder uma falha funcional:

```powershell
# Terminal de preparação, mantendo o processo vivo durante os testes:
$env:E2E_PORT='5297'
bun scripts/serve-e2e.ts
# Outro terminal, depois de o servidor anunciar a URL:
$env:E2E_PORT='5297'
$env:PW_REUSE_SERVER='1'
# Repetir os comandos Playwright acima, com as mesmas variáveis do Chromium.
```

## Portão ainda aberto: B3

`preview-hostile-programs.spec.ts`, caso **trabalho síncrono longo que não é laço**:
o relógio do editor responde, Parar responde, mas o programa corrigido não apresenta
`data-voltou="sim"` em 15 s. A mesma falha foi obtida numa construção com
`PreviewIframe.tsx` e `useDebounced.ts` originais de `d9ebd3fef`. Os arquivos foram
restaurados. Uma tentativa de trocar novamente o frame no início da execução não
resolveu e foi retirada; não ficou no produto como suposto conserto.

Não está demonstrado se a causa é reutilização de processo/SiteInstance, navegação
pendente ou outra diferença do Chromium 148. Essa investigação é a próxima tarefa
de isolamento. Não aumentar o timeout nem trocar o programa hostil por um laço
instrumentado. A casca de outra origem e a medição mínima, isoladamente, não
comprovam que o editor real reinicia com segurança.

## Continuidade obrigatória

1. Reproduzir B3, coletando navegação, frames, heartbeat e processo antes/depois
   de Parar e Rodar. Fechar a causa no executor existente, com o mesmo teste.
2. Completar B2/B4: estratégias viáveis por navegador e runtime, Worker/
   OffscreenCanvas onde compatível, preservando DOM, entrada, áudio e segurança.
3. Completar o baseline de Pro, motores e memória; a RAM da máquina no arquivo de
   ambiente não é medição da memória da aplicação. Confirmar as metas por fixture.
4. Completar A4 na página real do app de homologação: expandir, Verificar, Enviar,
   avançar e concluir. O navegador conectado disponível estava em `about:blank`;
   esta sessão não exerceu um login ou uma conta de homologação no app.
5. Seguir a ordem das etapas 2–10 no plano: Clássico em escala; Pro; motores e
   streaming; depuração; profiling; testes do aluno; contratos Pinta/Molda;
   persistência; produção e homologação. Não tocar nos produtores paralelos.

Os PDFs versionados foram inspecionados sem alteração, conforme inventário e hashes
em `evidencias/pdf-inventario.json`. Faltam aparelhos físicos e conferência dos vídeos,
além das funcionalidades e manuais completos dessas etapas. O guia `salvar-e-executar.md` documenta apenas
o incremento entregue. O PR deve permanecer em rascunho e não autoriza merge ou
deploy; não é o PR final da missão integral.

Os PNGs temporários da leitura dos PDFs permanecem em `tmp/pdfs`, ignorado pelo
Git: a política de execução recusou sua remoção. Eles não fazem parte do PR.
