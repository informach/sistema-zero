# Lote 5 — Autoria e interface da água

18/11/2026. Continuação de `dbd2e0965`. **5.3 e 5.4 implementados, testados e revisados localmente. O lote 5 continua aberto em 5.5.** A conferência transversal encontrou a extensão da área de transferência às águas, prevista para os lotes 5–7; a parte de água será concluída antes de iniciar Caminhos. Implantação e validação remotas ficam no encerramento global.

## Fluxo entregue

A aba Água usa o rail, inspector, gaveta, tokens, ícones e controles do Molda existente. Mar e Encher de água são as entradas simples; rio, represa e cachoeira ficam no mesmo fluxo. A captura aproveita clique/toque e órbita do palco; coordenadas também podem ser editadas pelo teclado. Há prévia explícita, cancelamento por botão/Escape e aplicação em uma operação autoral.

Lagos informam área/volume estimados, profundidade e teto de transbordo quando a busca o encontra. Água que alcança a borda exige conferência explícita antes de guardar. Rios usam pontos nascente→foz, largura, profundidade do leito, suavização e correnteza. Represas usam duas pontas e montante, largura e altura acima do nível. Cachoeiras usam topo/base, largura e orientação; não inventam volume horizontal de nado.

Material pronto permite cores rasa/profunda, opacidades, transição por profundidade, ondas e espuma. Renomear, alternar visibilidade, escolher camada e remover usam os comandos existentes. A remoção conserva a pose mundial dos objetos apoiados; desfazer restaura os vínculos. Travas são respeitadas. Mudar material/nado/correnteza não reescava um rio: recalcular contorno/leito é ação separada, sobre o relevo atual. Rios densos sem controles originais continuam editáveis; para recalcular, escolhe-se uma nova curva, sem truncar amostras silenciosamente.

## Revisão e correções

- Prévia e worker pertencem a uma cabeça específica. Mudança de cabeça, cancelamento e desmontagem invalidam o preparo; Testar/retratos ficam bloqueados durante a edição.
- A prova completa no Chrome reproduziu uma regressão do recorte anterior: encerrar água sem prévia limpava recursos recém-preparados pelo terreno, antes de instalar a cabeça seguinte. `finalizarPreviaDeAgua` agora só encerra sua prévia. O helper autoral descarta explicitamente os hashes do próprio preparo quando não foi enfileirado; arquivos referenciados pela cabeça atual permanecem protegidos. Uma reprodução mínima falhou antes e passou após a correção.
- Campo + água permanecem em um passo de desfazer. Envio falho conserva o lote otimista para nova tentativa. Mudança inalterada não cria revisão, inclusive quando o documento usa os valores implícitos do material.
- Revisão das capturas corrigiu o tamanho dos checkboxes e um rótulo de suavização colocado na camada. A prova passou a procurar o checkbox pelo nome e a acioná-lo.
- A construção explícita dos workers continua reconhecida pelo Vite. A interface compilada criou terreno, exportou PNG e criou mar usando três workers `.js`, incluindo `agua.worker-*.js`, sem importar fontes de desenvolvimento.

## Evidências locais

[Resultados da oficina](evidencias/lote5-agua/interface-oficina.json), [prévia/cancelamento/cache](evidencias/lote5-agua/edicao-previa.json), [workers compilados](evidencias/lote5-agua/worker-build-local.json) e [vídeo de autoria](evidencias/lote5-agua/interface-agua.mp4).

Capturas: [1440 claro](evidencias/lote5-agua/agua-light-1440.png), [1366 escuro](evidencias/lote5-agua/agua-dark-1366.png), [1024 claro](evidencias/lote5-agua/agua-light-1024.png), [390 escuro](evidencias/lote5-agua/agua-dark-390.png), [baixada preenchida com ilha seca](evidencias/lote5-agua/lago-ilha-preenchido.png). A baixada é fixture técnica; não representa acabamento artístico da Faísca.

Nos quatro layouts: mar, nome, visibilidade, camada, remoção, no-op e histórico; 390 inclui captura por toque emulado. No desktop: rio, correnteza sem reescavar, cachoeira, represa, baixada com ilha seca, recálculo de nível, cancelamento de vazamento, falha de envio/nova tentativa e reabertura. Nenhum erro do navegador. Terreno novamente exercitado nos quatro layouts: pintura, camadas, buracos, PNG, histórico e cancelamento preservados.

| Verificação | Resultado |
|---|---|
| Núcleo | 197 testes, 8.453 asserções |
| Motor | 98 testes, 2.800 asserções |
| Oficina/hosts | 91 testes, 589 asserções |
| Members serviço/HTTP/histórico | 51 testes, 244 asserções |
| BFF | 37 testes, 197 asserções |
| PostgreSQL real | 37 testes, 335 asserções |
| Conversão da Faísca | 2 testes, 3.130 asserções |
| Tipagem | Núcleo, motor, oficina, Members, member-shell e Arquipélago passaram |
| Build | Passou; worker de água 109,57 kB; motor 856,70 kB/230,43 kB gzip |

O aviso anterior de chunk acima de 500 kB permanece registrado. Material GPU e lago real passaram novamente: duas geometrias/três texturas na bancada nativa; sete geometrias/cinco texturas na bancada GLB após ciclos, 162 pontos de profundidade e nado sem piso invisível. A travessia com o avatar real registrou altura 1,170 m, casa–praça 12,63 m, praça–horta 19,76 m e horta–ponte 46,64 m, sem erros. As provas de renderer, dia/noite e física permanecem detalhadas no [checkpoint 5.2](checkpoint-lote5-renderer-fisica.md).

Não há aprovação artística automática, homologação de aparelhos físicos ou alegação de implantação. O fechamento do lote 5 ainda depende da extensão de cópia/colagem de água, sua revisão e a preservação final na staging. Os lotes 6–10 e o encerramento global continuam pendentes.
