# Studio Pro — revisão integrada sem flags de liberação

Base: `95aad63db4b5caf21525adbb27248c96ed54e763` (`staging` local, incluindo Pensa e Molda). Revisão em `fix/studio-pro-full-review`. Este relatório substitui as recomendações de liberação M1/M2/M3 da revisão anterior. Os relatórios anteriores permanecem como histórico das provas realizadas.

## Escopo

Revisão dos contratos e caminhos críticos dos lotes 0–9 e dos adendos Canvas e Zappy A01–A06: acesso, catálogo e factories, normal/Pro, terminal e sincronização, serviço TypeScript, materiais Pinta/Molda, missões Pensa, assistência por revisões, persistência e desfazer, conta OpenRouter e ledger familiar, runtime isolado, exportação, publicação e limpeza. Inclui revisão do diff sobre a integração existente, testes completos do Studio e BFF, testes dos contratos compartilhados e dos hosts, verificações de geração, compilação e provas no navegador/runtime. Não foi feita uma alegação de inspeção manual linha a linha dos arquivos gerados de bibliotecas e fontes: sua consistência é conferida pelos geradores e testes.

## Achados e correções

| ID | Achado | Correção e regressão |
|---|---|---|
| F01 | Flags adicionais ocultavam kits e impediam construção/publicação apesar do acesso Pro conquistado. O Zappy também tinha um interruptor independente e o exemplo de ambiente ainda anunciava piloto. | Removidos envs, parser de allowlist, default restritivo, prop do host e verificações de liberação. Catálogo completo por padrão. Testes exercitam os 14 modelos para criação, disponibilidade/construção e publicação sem configuração de flags. Permissões da jornada, autenticação, quotas e preflight técnico permanecem. |
| F02 | Publicação Pro livre verificava posse do produto, mas não o nível Pro, permitindo invocação direta do compilador pelo endpoint. | Verificação autoritativa da jornada antes de compilar/publicar/atualizar. Ausência de jornada retorna indisponibilidade. Aulas e snapshots ao vivo mantêm sua autorização específica; regressão comprova aula Pro elegível antes do nível Pro livre. |
| F03 | A primeira página de tarefas de limpeza do BFF podia ficar permanentemente ocupada por falhas. | Paginação com cursor persistido fora do prefixo da fila. Falha conserva a tarefa e permite processar páginas seguintes; ao fim, a leitura retorna ao começo. Prova com seis tarefas e quatro falhas persistentes. |
| F04 | Exclusão de capas pelo bucket público ignorava erros parciais de `DeleteObjects`. | Operações públicas e UGC usam o mesmo adapter de exclusão por objeto/lote. Falhas parciais são recuperadas ou propagadas, sem confirmação falsa. A intenção de limpeza só sai após todas as exclusões. |
| F05 | Configuração de runtime ausente podia classificar um jogo Pro como clássico durante a limpeza. | Identificação pelo snapshot privado e gravação dessa obrigação na intenção durável. O caminho imediato usa a mesma intenção. A falta do serviço mantém a tarefa pendente. |
| F06 | Endpoint de limpeza respondia 204 sem segredo de autenticação e sem guardar intenção. | Responde 503, permitindo retry e tornando a indisponibilidade observável. Não executa exclusões sem autenticação. |
| F07 | Exclusão local de jobs parava na primeira recusa e sempre começava pelos mesmos 20 IDs. | Falhas independentes são agregadas; confirmações removem apenas o registro correspondente. Cursor persiste no IndexedDB do perfil e mantém a fila avançando entre lotes. Testes com 24 entradas, falha individual e troca A → B → A. |
| F08 | Uma ação do Pensa podia terminar após troca de perfil/projeto ou desmontagem e enviar progresso ou atualizar a interface anterior. | Identidade da sessão por perfil, projeto, missão, revisão, posse e adapter de nuvem. Revalidação antes/depois de operações assíncronas e antes de envio/navegação. Regressões reproduzem A → B → A durante confirmação e resposta tardia após desmontagem. |
| F09 | Ajuda de materiais de todos os kits indicava um arquivo específico da arena Canvas. | Orientação comum usa os caminhos efetivos do manifesto, sem prometer arquivo existente somente em um kit. |
| F10 | Testes de reconciliação financeira dependiam de mudar uma variável depois de o cache de ambiente já estar carregado por outra suíte. | Fixture explícita de configuração por teste, restaurada depois; comportamento de produção inalterado. A bateria completa do BFF cobre a combinação, além da execução isolada. |

A remoção da allowlist também exigiu manter a validação técnica de IDs no endpoint de disponibilidade. Modelo desconhecido continua sendo recusado; ausência de runtime continua sendo indisponibilidade de serviço, sem ser tratada como uma flag de liberação.

## Revisão das demais áreas

- Terminal e tipos: fila única de filesystem, reconciliação de três vias e cópias de conflito; invalidação por instalação/remoção, limites explícitos de indexação e worker TypeScript por projeto. Sem supressão dos diagnósticos reais ou declarações fictícias.
- Materiais: IDs e caminhos estáveis, bytes fora dos prompts e da árvore textual, cache por objeto imutável, limites antes da codificação, manifesto e licenças preservados. GLB, sprites, áudio e projeção no filesystem mantêm o mesmo contrato em exportação e runtime.
- Zappy: política normal/Pro compartilhada entre contexto, resposta, histórico e sugestões. Propostas continuam separadas do documento, com comparação da base, revisão explícita, recibo persistido e inversa para desfazer.
- Pensa/Pinta/Molda: mantidos os adapters compartilhados e as correções da integração anterior, inclusive ID real do Pro, vínculo provisório v2, confirmação de salvamento e mensagens de conflito do servidor.
- Custos: autorização de envio de uso único, reserva e liquidação duráveis, valores incertos não viram custo zero, nenhuma troca silenciosa para a conta da plataforma. Chave do responsável permanece cifrada e fora do navegador.
- Runtime/publicação: preflight anterior à inferência, dependências/lock controlados, limites de envelope, execução sem rede, usuário sem privilégios, validação e captura. Publicação mantém CAS, histórico, hashes, tombstone e autorização do Hub inclusive para 304.
- Desempenho: preservados imports específicos e carregamento seletivo dos motores; nenhum orçamento de bundle, memória, entidades ou tempo foi ampliado nesta revisão.

## Verificação

Resultados desta revisão, com os arquivos corrigidos:

| Verificação | Resultado |
|---|---|
| Studio completo — `bun test src --timeout 15000` | 9.048 passaram; zero falhas; 137.674 asserções em 590 arquivos. Inclui build Vite com os tetos originais de bundle e testes de armazenamento em navegador. |
| BFF completo — `bun test tests --timeout 15000` | 1.590 passaram; zero falhas; 9.787 asserções em 171 arquivos. |
| Members completo — `bun test tests --timeout 15000` | 1.414 passaram; 345 ignorados; zero falhas; 10.876 asserções em 197 arquivos. Casos dependentes de banco/serviços não foram reexecutados nesta rodada. |
| Kids — seleção Studio/Pensa/acesso Molda | 194 passaram; zero falhas; 647 asserções em 22 arquivos. |
| Contratos core — `bun test src/studio` | 6 passaram; zero falhas; 18 asserções em dois arquivos. |
| Runtime completo — `bun test --timeout 15000` | 64 passaram; zero falhas; 435 asserções em 12 arquivos. Inclui build/typecheck dos 14 modelos e instalação independente pelo lock. |
| Tipagem completa | Studio, member-shell, community-kids, Members, Admin e studio-runtime passaram; checagens executadas sequencialmente. |
| Fontes, packs, locks e bibliotecas TypeScript | `check:pro-kits`, `check:pro-typescript-libs` e `check:validation-profile` passaram. |
| Biome dos arquivos TS/TSX alterados | 25 arquivos; zero erros ou avisos. |
| Imagem Docker reconstruída | Smoke passou: uid 1000, sem rede, dependências protegidas; seis kits passaram TypeScript, build, playtest por objetivo e captura. |
| Chromium — revisão, candidata, publicação e áudio | 6 cenários passaram, zero falhas (49,9 s). Comparação/aplicar/desfazer, descarte em StrictMode, 20 trocas de preview, expiração/indisponibilidade, progresso publicado entre revisões e áudio opt-in. Capturas de 360 px inspecionadas. |

As seis baterias de testes somam 12.316 aprovações e zero falhas na execução final de cada bateria, além dos seis cenários Chromium. Os 345 casos ignorados de Members não entram nesse total. Evidência estruturada e hashes dos logs locais: [JSON desta revisão](studio-pro-revisao-sem-flags-evidencias-2026-10-15.json). `git diff --check` também passou.

Fingerprint do verificador: `faf7548afcfd6d5d8c18a6ff4ba28dd4d96076baf89b85239e306292a5364b49`. Imagem local: `sha256:f82c4ea1bea97daaf2ec15c414463a58b5956531c00f41488545180bfdcb5c70`. Os seis kits no Docker foram Canvas Puzzle, Canvas Survival, exploração Three, arena em grade, tático Phaser e tático Three. A execução limitada a 1 CPU/1 GB valida o funcionamento; seus tempos, coletados durante outras verificações, não são benchmarks de desempenho.

Os testes novos de F02, F07 e F08 foram executados contra os arquivos anteriores: falharam (exit 1), e passaram após restaurar as correções (exit 0). As primeiras execuções amplas também revelaram o erro de fixture F10 e a ausência da instalação npm independente do runtime nesta worktree; a configuração dos testes foi corrigida e `npm ci --ignore-scripts` preparou o runtime pelo lock versionado. As falhas iniciais não são contabilizadas como provas de sucesso.

O primeiro runner temporário do Chromium omitiu a URL base exigida pelo fixture de áudio; os demais cinco cenários passaram. O áudio passou com a configuração original do Studio, e a seleção inteira de seis cenários passou após o runner reutilizar o servidor e a URL base originais. Nenhum código do produto foi alterado para essa falha de preparação.

## Limites e operação

Esta entrega é local: não inclui deploy, push, migrações remotas ou chamadas pagas. As provas anteriores de soak de 30 minutos, terminal real e performance dos nove kits continuam registradas no relatório anterior; não serão apresentadas como novas execuções nesta revisão. Homologação com credenciais reais de OpenRouter e hosts, infraestrutura Cloudflare e aparelhos físicos exige esses ambientes.

A07 continua fora do escopo aprovado A01–A06. A retenção conservadora da primeira promoção com resposta ambígua do Hub e o replay de webhook não entregue seguem a operação documentada no README: não se apagam dados referenciados apenas por timeout. Isso não é um bloqueio de liberação nem foi substituído por uma flag.

As mudanças desta revisão ficam isoladas na worktree de integração. Os arquivos concorrentes de marketing, TUI e Molda na pasta principal não entram no commit.
