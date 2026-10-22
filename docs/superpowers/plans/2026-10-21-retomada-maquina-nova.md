# Retomada na máquina nova — 21/10/2026

Continuação do [relatório de transferência](2026-10-21-transferencia-estudio-python.md). Este registro separa **implementação**, **implantação** e **homologação**. Produção não foi tocada nem liberada.

## Ambiente reconstruído

- Windows 11 Pro 10.0.26200, 32 GB RAM (cerca de 16 GB livres), 20 CPUs.
- Checkout: worktree `sistema-zero-studio-python`, branch `feat/studio-python-continuation-20261021`, a partir de `c133a2ff5`, que é o checkpoint e o staging remoto atual. O checkpoint `b46a7503e` está no histórico.
- ZIP complementar: baixado do rascunho de release. Tamanho e SHA-256 `97a27e13…5f78` conferem, 433/433 arquivos do pacote conferem e os 382/382 snapshots versionados conferem. A conferência foi feita por um port em Node dos dois verificadores, porque o PowerShell desta máquina é lento demais (ver Pendências de ambiente).
- Bundle incremental: verificado e importado como `transfer/{python,games,lessons,review}`, sem alterar branches existentes. `transfer/python` já está contido em staging. Os commits de games, lessons e review chegaram a staging por composições novas (`8c0bb250d`, `b641c629`). Nenhum foi reaplicado.
- `bun install --frozen-lockfile`: 2.872 pacotes, sem mudar arquivos rastreados.
- Ferramentas fixadas instaladas em `.cache/tools/`, ignorado pelo Git, com hash conferido:
  - Bun 1.4.3: `bun.exe` com SHA `095db4ab…`, igual ao anexo de jogos.
  - Node 24.22.0: `node.exe` com SHA `ba93f9a7…`, igual ao anexo.
- O Bun global continua 1.3.11 (lock/CI) e o Node global 24.15.0.
- CPython 3.14.2 com Tk 8.6.15 instalado no usuário, a partir do instalador oficial com assinatura PSF válida.
- Chrome 155.0.8059.85, igual ao das provas anteriores.
- Railway CLI 5.62.1 instalada, ainda sem login (pane do provedor). Wrangler 4.120.1 instalada, com login na conta `bcc0f2d4…`.
- Corpora de referência clonados em `.cache/studio-python-l0/{pacman-upstream,space-arena-upstream}` nos commits dos manifestos: 19/19 e 29/29 arquivos conferem por SHA.

Por que Node 24.22 e Bun 1.4.3: o servidor de qualificação Python recusa Bun < 1.4 no Windows (vazamento de sockets no Bun 1.3). Com o Node 24.15, o `vite preview` da suíte de editor caiu uma vez com `0xC0000409`; com 24.22 a suíte completa passou.

## Implementação

| Commit | Mudança |
| --- | --- |
| `12fb2f5ee` | Galeria de exemplos: o seletor JavaScript/Python só aparece quando o host oferece Python (admin/superadmin). Antes, staff via a opção Python e a mensagem "Python Pro ainda não está disponível". |
| `77e5ac21f` | Diagnóstico de memória do Pro completo (`experiments/studio-pro-webcontainer-memory`). |
| `96e26913b` | Suíte local do Estúdio Completo Pro (`playwright.pro-full.config.ts`), fora do CI. |
| `8813955b1` | Achados da revisão: galeria volta a JavaScript quando a oferta reaparece; README e amostrador; a suíte Pro prova que o servidor não reinicia na edição. |
| `959d6d77b` | Serviço local de publicação Python alinhado à jornada canônica, à publicação em duas fases do Hub e às operações R2. |
| `facde61ca` | A página de jogar não carrega mais o cliente de análise de código Python. O núcleo do ambiente contextual recebe a análise como argumento obrigatório; os editores mantêm o mesmo contrato. |
| `d4afe4352` | Producer de aulas aceita origem Admin HTTPS revisada e curso adulto `qa-js-pro`, para o percurso hospedado Admin → aula gravada → aluno. |
| `fd91ffbfd` | Driver do controlador de análise digita no campo editável `NUMBER` do bloco inteiro, não no rótulo `PYTHON_TITLE`. |
| `1664c454c` | Spec da aula Python espera a mensagem real de acesso revogado. |

Os achados antigos de Zappy/Pinta foram conferidos contra o código integrado. Os oito corrigidos (Z1, Z2, P1–P5, P8) não foram reaplicados. Não copiar arquivos de `transfer/games` sobre o código atual: isso desfaria `1964b56a3` e `0076a9bc6`.

Decisões pendentes do usuário:
1. Perfil funcional de memória para homologar o Pro completo no staging. Proposta: cerca de 3,5 GiB, sem mudar a meta de desempenho.
2. Exigir `publish`/`assist` na publicação Python e no Zappy. Hoje só `execute`/`edit` são conferidos.
3. Perfis Kids de contas admin/superadmin veem a oferta Python, por desenho do token.

## Implantação

Nenhuma nesta etapa.
- CI `39571138230` em `c133a2ff5`: os 8 jobs de teste passaram; `deploy-staging` falhou na barreira SSH (`ssh-auth-rejected`).
- O diagnóstico SSH falha em todo push desde `8c0bb250d`.
- Railway em Major Outage: dashboard e API indisponíveis, builds pausados.
- Cloudflare (leitura): Worker staging na versão `26063240` (par 9e33, `old40ce`), sem deploy novo; buckets visíveis.

## Homologação

Local nesta máquina. Não é homologação hospedada.

| Percurso | Resultado |
| --- | --- |
| Pro completo JS (projeto novo, preview, edição sem reiniciar o servidor, terminal `npm run build`, recarregar e reabrir) | 4/4 execuções passaram |
| `python-bridge` (Blocos/Ponte/Código, linguagem, autoria, ao vivo, livre, player público, exportação web, remoção de extensão; Chrome + Edge) | 86/86 com Node 24.22 + Bun 1.4.3 |
| `python-runtime` (rodada inicial, sem corpus) | 244 passaram e 38 falharam; causas abaixo |
| `python-runtime` (com corpus e correções) | **264 passaram e 18 falharam**: 16 do Pac-Man instrumentado e 2 do teste de 30 ciclos, ambas descritas abaixo |

Sobre as 18 falhas restantes:
- **Pac-Man portátil instrumentado (8 casos × 2 navegadores):** a qualificação fixa a distribuição `19de08fb…`. Ela não veio na transferência e não é a `a8a6c625…` de staging (remontada do pacote, 42/42) nem a `d396083c…` construída aqui com o código atual. O pin do oráculo não foi trocado. É a pendência 3 do anexo de jogos, que precisa de configuração e distribuição revisadas.
- **30 ciclos do provider:** o PowerShell desta máquina passa do prazo de 10 s do medidor nativo.

As 38 falhas da rodada inicial de `python-runtime`, por causa:
- **26 por corpus ausente** (Pac-Man e Space Arena), já preparado; reexecução pendente.
- **2 por oráculo defasado**: a mensagem de revogação da aula esperava um texto que o produto nunca teve; o spec foi corrigido para a mensagem real.
- **6 no controlador de análise (gesto Blockly → CPython)**: era defeito do driver de teste. O bloco inteiro ganhou o rótulo `PYTHON_TITLE`, só apresentação e não editável, antes do campo `NUMBER`, e a fixture escrevia no primeiro campo com nome. O driver passou a digitar no campo editável (`fd91ffbfd`), sem mudar oráculos, e os 14 casos de controlador e aula passaram nos dois navegadores. O produto não tinha o defeito.
- **2 no teste de 30 ciclos**, por inicialização do `powershell.exe` de 70 s a mais de 5 min nesta máquina, contra o prazo de 10 s do teste. É ambiente; o prazo não foi alterado.
- **2 de perfil de materiais**, por corpus ausente.

### Space Arena 1.2 Q08-pause nativo

Primeira execução deste caso. Nunca havia rodado na máquina antiga.
- **Insumos:** os 4 arquivos do pacote (`e6cefcb3…`, `7e5cf907…`, `cae7c8fd…`, `8eb18712…`) foram restaurados dos snapshots com bytes idênticos. A exportação usada foi `source.zip` `14b95ac8…` com `receipt.json` `9acc5ea7…`.
- **Ambiente:** venv novo com CPython 3.14.2, `miniaudio 1.71`, `cffi 2.1.1` e `pycparser 3.11`. Os 7 arquivos `sz_audio` instalados batem; o Node 24.22.0 bate. `tcl86t.dll` e `tk86t.dll` diferem do r1, embora o Tcl seja o mesmo 8.6.15. A admissão foi registrada como **ambiente novo**, não como reprodução do r1, em `.cache/studio-python-l0/games-functional-r1/space12-native-q08-pause-package-r3/packet-r2.json`.
- **Tentativa r2 (NEG, preservada):** usei a árvore já extraída no lugar de `source.zip` + `receipt.json`. O runner recusou em 3 ms, antes de iniciar o Tk ou o jogo.
- **Tentativa r3 (PASS):** 17,2 s, exit 0, sem prazo estourado nem sinal. Map 0 e Destroy 1, WASAPI liberado, temporário removido, exportação inalterada, `errors: []`. Pausa de 1,207 s (mínimo estrito 1,2 s) com os métodos originais congelados; retomada 26→52 sprites e 25→50 inimigos; conclusão na fronteira do timer autoral. Node 81836 e Python 49696 ausentes depois da saída. Recibo `.cache/studio-python-l0/games-functional-r1/space12-native-q08-pause-package-r3/launch-receipt-r3.json` `cdbcdb7f…`; resultado `.cache/studio-python-l0/space12-native-q08-pause-r3/result/native.json` `2c18b9ce…`. As evidências ficam só no cache local ignorado pelo Git desta máquina; os hashes permitem conferir uma cópia.
- A suíte `python-runtime` rodava ao mesmo tempo, então esta execução não vale como medida de desempenho.

O Q08-bgm (replay de 120 s) continua sem execução e precisa de pacote e saída próprios.

Não homologado aqui:
- Reparo do documento JS antigo (Vite 8.0.16): depende do serviço hospedado de preparação.
- Admin → aula → aluno com contas reais.
- Ativação Python em staging, Mural e `/jogar` hospedados, Zappy hospedado.
- Pico de 128 MiB no isolate.
- Space Q08-bgm, finais do Pac-Man 1.1 no navegador e partidas completas, 10 min e 30 reinícios.

## Pendências de ambiente

- O Windows PowerShell 5.1 desta máquina leva de 70 s a mais de 5 min para iniciar, mesmo com `-NoProfile`. Investigar antivírus/AMSI antes de usar os helpers de Windows Job e o medidor nativo.
- PowerShell 7 não instalado.
- Railway: login e chave SSH desta máquina, após a recuperação do provedor.
