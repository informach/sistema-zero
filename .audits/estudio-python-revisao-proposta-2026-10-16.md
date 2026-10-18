# Revisão aprofundada da proposta Estúdio JS/Python

16/10/2026 · Revisão documental, sem implementação do produto ou benchmark Python.

Documento principal revisado: [proposta, revisão 3](../docs/plans/2026-10-16-estudio-javascript-python-turtle-proposta.md). A revisão confrontou os quatro documentos, o checkout local, as especificações Pro/live e fontes técnicas primárias. As leituras paralelas da revisão 2 foram verificadas nos arquivos principais; a revisão 3 registra o detalhamento posterior de Programação e extensões. Alterações concorrentes de outros trabalhos não foram modificadas.

## 1. Resultado e escopo consolidado

- JavaScript continua padrão, com seus dados, recursos, permissões e integrações preservados.
- Python/Turtle deve funcionar no Clássico e Pro, Completo, admin, aulas, sala ao vivo e publicação pública.
- Navegador executa Python real via WebAssembly; adaptação gráfica não é tradução autoral para JavaScript. A fonte desktop usa CPython/Tk.
- Conforme a última orientação do usuário, **Turtle integra Pinta**. **Molda em Python fica para Raylib 3D**; suas integrações JS permanecem. A conversão Molda→imagem Turtle foi retirada do escopo.
- A recomendação é preservar missões Pensa em JS nesta etapa e preparar a identidade de linguagem. Pensa Python continua decisão futura; Zappy e atividades do admin em Python permanecem previstos.
- pygame-ce, Pygame Zero e Raylib continuam futuros. Nenhum instalador Python arbitrário é prometido na entrega Turtle.

## 2. Lacunas corrigidas

| Achado | Evidência/conflito | Correção na proposta |
|---|---|---|
| Validade confundida com disponibilidade | Resolver recebia grants/perfil, sem recursos do executor/browser | Operações disponíveis, pendentes e indisponíveis separadas de validade; host fornece capacidade real |
| Schema poderia gerar ciclo de pacotes | `studio/core/project.ts` usa IR ligada a extensões; Studio já depende de core | Envelope e variantes no core, IR/validação semântica nos módulos de linguagem; core não importa Studio |
| Metadados Python Pro sem localização definida | `proMeta` guarda assistência, publicação, origem e devScript juntos | Manter caminhos comuns; apenas devScript é exclusivo JS |
| Candidato Zappy podia ignorar mudança de ambiente | [pro-revision](../packages/core/src/studio/pro-revision.ts) calcula revisão com campos JS | CAS v2 inclui runtime, linguagem, entrypoint, lock e extensões; configuração participa de revisão/undo |
| Promoção poderia quebrar vínculo com aula/nuvem | [projectStore](../packages/studio/src/state/projectStore.ts) preserva ID ativo e salva backup com ID novo | Python segue esse protocolo, condicionado à revisão e confirmação do backup |
| Lock não representava promessa de todos os destinos | Uma versão única e hashes web eram apresentados como base para browser/desktop | Lock inicial explicitamente browser, vazio de pacotes externos para Turtle; locks nativos entram com biblioteca futura |
| Entrypoint Pro contradizia README de exportação | Pro aceitava script arbitrário; instruções sempre executavam main.py | Execução de script definida, comando gerado pelo entrypoint, cwd/imports testados |
| Bootstrap de worker opaco não estava resolvido | CORS não substitui regra de origem do worker; blob herda CSP | Prova L0 da topologia e CSP por camada, FFI/subworkers; não tratar carregamento de exemplo como isolamento homologado |
| Fila de eventos não definia despacho durante movimento | Turtle CPython pode processar eventos antes de mainloop | Bombeamento no fluxo Python, provas de reentrância/timer/erro, sem entrada Pyodide concorrente |
| Memória descrita como controle mais forte que o browser oferece | Cotas da API gráfica não limitam alocação Python/FFI arbitrária | Separar orçamento observado de limites do adapter; testar recuperação sem garantia falsa de impossibilidade de OOM |
| Prova Pyright prevista cedo, mas planejada só em L5 | Serviço novo tem risco de memória, transporte e introspecção | Ensaio real pequeno já em L0; integração completa em L5 e carga em L8 |
| Grant único dependia de aula publicada | Não atendia admin rascunho, Completo, continuidade ou público | Contextos e fontes de autorização explícitos; público sem grant de edição |
| Nova semente podia invalidar projeto antigo | Grant usaria revisão autoral atual contra snapshot criado antes | Baseline de criação persistida; renovar direitos sem substituir semente/ambiente |
| Troca de perfil dependia de props fixadas no mount | [StudioCore](../packages/studio/src/studio/StudioCore.tsx) fixa proRuntime e limites | Registro estável e seleção por projeto, transição atômica sem perda de buffers |
| Assistência/performance ignoravam pausa de gravação | [live-workspace.service](../packages/members/src/application/live/live-workspace.service.ts) exige confirmação de pausa | Preservar guarda; medir pausa e transferência separadamente |
| Cursor podia usar offsets de buffer novo com revisão antiga | [live-workspace](../packages/member-shell/src/components/live/live-workspace.tsx) envia revisão persistida | Âncora inclui hash/versão do conteúdo; invalidar até sincronizar |
| Tolerância de desempenho aceitava queda grande de frames JS | Margem global de 20 ms por medição | Métricas distintas para operações discretas, frames, CPU/memória e bytes |
| Player escolhia ambiente só por Clássico/Pro | [StudioProjectPlayer](../packages/studio/src/components/preview/StudioProjectPlayer.tsx) e [PublicPlayer](../packages/community-kids/src/components/kids/public-player.tsx) | Dispatch por perfil/artefato, também para Python clássico; mobile/controles/entrada e carregamento próprios |
| Timeout público contradizia primeira carga proposta | Handshake JS de 10 s versus meta Python fria de 12 s | Distinguir documento, interpretador e jogo prontos; prazo fatal de rede separado da meta de desempenho |
| Manifesto descartaria dependências compartilhadas | [pro-artifact](../packages/core/src/studio/pro-artifact.ts) retorna somente version/files | Manifesto v2 com referências transitivas; retenção/GC e hash abrangem runtime/extensões |
| Imutabilidade não explicava revogação | Atualização e retirada de execução eram indistintas | Estados de release fora dos bytes imutáveis, preservando fonte e vedando upgrade silencioso |
| Importar Pinta não significava imagem Turtle utilizável | [studioBridge](../packages/pinta/src/export/studioBridge.ts) usa metadados de sprite/mapa e thumbnail | Materialização PNG real; derivados têm identidade/receita próprias, sem sobrescrever original |
| Qualquer Pro era tratado como consumidor 3D | [has3DConsumer](../packages/studio/src/components/assets/has3DConsumer.ts) retorna true por kind | Capacidade por perfil, preservando JS e sem anunciar Molda no Turtle |
| Missão Pensa não distinguia linguagem | [contratos Pensa](../packages/core/src/pensa/index.ts) distinguem autoria, sem linguagem | JS explícito nos novos contextos e validação do documento vinculado |

## 3. Provas ainda obrigatórias

São dependências de implementação, não defeitos declarados resolvidos por escrever requisitos:

1. Bootstrap, JSPI e isolamento compatíveis nos browsers/dispositivos alvo, incluindo reprodução pública móvel.
2. Semântica do módulo Turtle contra patch CPython/Tk fixo: animação, eventos durante movimento, input, espera, callbacks e encerramento.
3. Metas reais de CPU/memória/latência com editor e vídeo; player leve e operação em celulares físicos.
4. Processo Pyright isolado, stubs, transporte, orçamento de memória e cancelamento.
5. Exportação desktop de fontes e materiais idênticos, inclusive Pro multiarquivo.

L0 decide a viabilidade dessas escolhas antes de contratos novos entrarem em produção. Falhar uma prova exige corrigir a arquitetura ou revisar explicitamente seu alcance; não permite chamar a implementação de concluída.

## 4. Fontes e repositórios reais

Consultadas fontes oficiais Python/Pyodide, V8/WebKit, Pyright, Ruff e normas de workers/CSP, referenciadas junto às decisões nos documentos. Os três repositórios enviados pelo usuário foram analisados separadamente em [jogos Turtle e compatibilidade](estudio-turtle-repositorios-2026-10-16.md). Essa leitura acrescentou exemplos de herança Turtle, cores Tk, loops, espera e dependências não portáveis; não substitui executar os programas nos dois ambientes.

Não foram executados jogos externos, instalados pacotes desses repositórios nem incorporados seus assets/códigos ao produto. A verificação desta rodada cobre documentos, evidências de código e consistência dos contratos; não afirma que Python já funciona na plataforma.

## 5. Revisão 3: Programação Python e extensão Turtle

O usuário esclareceu que deseja os recursos comuns de Python em **Programação**, e Turtle como extensão adicionada, à semelhança de Jogo 2D em JavaScript. O código atual confirma a categoria guarda-chuva e a importância de usar seu caminho visual real na ajuda do Zappy: [programmingContract](../packages/studio/src/blockly/programmingContract.ts), [toolbox](../packages/studio/src/blockly/toolbox.ts), [blockCatalog](../packages/studio/src/blockly/blockCatalog.ts).

A revisão 2 já chamava Turtle de extensão, mas não delimitava suficientemente um projeto Python sem gráficos nem a taxonomia da base. A revisão 3 especifica:

- Python vazio e Python com Turtle como templates distintos; linguagem não implica extensão adicionada.
- Onze subcategorias pedagógicas, com fundamentos, coleções, funções, módulos, classes simples e erros; progressão e curadoria independentes dos IDs JS.
- Ampliação explícita do subconjunto visual para coleções/classes simples/erros; preservação de construções textuais ainda fora dele, como herança e generators.
- Adição/remoção com dependências, permissões, revisão e preservação de fontes/assets; nenhuma instalação fictícia via pip.
- Catálogo comum a paleta, admin e Zappy; fundamentos não duplicados dentro de Turtle.
- R19/R20 e F10: execução, publicação, exportação e desempenho de Python sem Turtle, além do ciclo da extensão.

Foram consultados o tutorial e as referências oficiais Python para controle de fluxo, coleções e funções embutidas, citados na proposta. Nenhuma implementação ou execução Python acompanha essa ampliação documental.
