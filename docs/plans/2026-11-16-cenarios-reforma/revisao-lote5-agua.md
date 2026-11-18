# Lote 5 — Água: revisão e fechamento local

18/11/2026. Base anterior: `79a953afd`. **Lote 5 implementado, testado e revisado no escopo da especificação.** Preservar este registro junto do código e das evidências na staging antes de iniciar o lote 6. Push não significa implantação; implantação e validação remotas continuam no encerramento global.

## Cobertura da especificação

| Requisito | Implementação e prova |
|---|---|
| Mar mundial | Um por cenário, nível editável e consulta física comum; duplicação de um segundo mar recusada atomicamente |
| Encher uma baixada | Clique/toque ou coordenadas, contorno, ilhas secas, estimativas, teto de transbordo e confirmação explícita de vazamento |
| Rio | Nascente→foz, curva suavizada, perfil descendente, escavação que não eleva o leito, largura/profundidade/correnteza limitadas |
| Represa | Pontas e montante, largura, nível e crista; campo elevado sem abaixar o terreno anterior |
| Cachoeira | Topo/base, largura e orientação, desenho vertical, sem volume horizontal fictício de nado |
| Material pronto | Cor/opacidade por profundidade, ondas e espuma; iluminação real, movimento reduzido e recursos com dono |
| Física | Mesma cobertura do visual, ilhas excluídas, fundo real do GLB e correnteza; a água não cria piso sólido |
| Autoria | Worker cancelável, prévia separada da cabeça, um passo para água+leito, no-op e retomada de upload/reply perdidos |
| Interface | Rail/painel Molda, pontos por cena/teclado, selecionar/renomear/camada/visibilidade/remover, erros úteis e recálculo explícito |
| Transferência | Mesmo fragmento e clipboard dos objetos; água, modelos, camadas, apoios, novos IDs, corte e histórico preservados |

Contratos/hidrologia e armazenamento: [5.1](checkpoint-lote5-contratos-consulta.md). Renderer, física, GLB e recursos: [5.2](checkpoint-lote5-renderer-fisica.md). Worker/prévia: [5.3](checkpoint-lote5-worker-autoria.md). Interface, correção de cache e evidências: [5.4](checkpoint-lote5-interface.md).

## Revisão da transferência de água

Dois testes vermelhos reproduziram a recusa de água sozinha e de pasta com água. O fragmento existente agora aceita as cinco variantes, sem criar outro clipboard. Captura conserva somente modelos/formas/texturas necessários, ancestrais, camadas e parâmetros. O GLB referenciado pela água é incluído na mesma tabela de recursos autorizados, com as regras de espaço já existentes.

Colagem remapeia água e apoios internos, desloca centros/níveis, perfil e controles do rio, topo/base da queda e crista da represa. Anéis locais e encaixe do GLB permanecem locais. Apoios no mar/rio têm coordenadas mundiais deslocadas uma vez; os de lago/represa conservam seu referencial local. Apoios externos à escolha continuam convertidos para pose absoluta. Captura/colagem não mutam os documentos de origem/destino.

Recortar libera os objetos apoiados que ficam na origem, preservando suas poses; remoção e liberação são o mesmo lote desfazível. Travas impedem a operação antes de qualquer mudança. Copiar, recortar, colar e duplicar usam o alvo da árvore para a água selecionada, sem outro estado de seleção. O painel permite copiar a água guardada e explica que **o relevo não é copiado**: nível e leito precisam ser conferidos no destino.

Conjuntos de objetos continuam tipados como objetos, sem incorporar água silenciosamente. A tentativa informa que a composição completa deve usar copiar/colar. Caminhos e marcadores entram na mesma extensão nos lotes 6/7; continuam recusados quando uma pasta mista contém tipos ainda não suportados.

## Verificações finais

| Verificação | Resultado |
|---|---|
| Núcleo | 202 testes, 8.478 asserções |
| Motor | 98 testes, 2.800 asserções |
| Oficina/hosts | 92 testes, 595 asserções |
| Members serviço/HTTP/histórico | 51 testes, 244 asserções |
| BFF | 37 testes, 197 asserções |
| PostgreSQL real | 38 testes, 343 asserções |
| Conversão da Faísca | 2 testes, 3.130 asserções |
| Tipagem | Núcleo, motor, oficina, Members, member-shell e Arquipélago aprovados |
| Biome/diff | Arquivos alterados conferidos, sem erro de formatação ou whitespace |
| Build da oficina | Aprovado; workers concretos de terreno e água compilados |

O teste novo no PostgreSQL confere fragmento de lago+barco, material, nado, pose, IDs, JSONB, replay idempotente e undo/redo após reabrir o serviço. As regras de origem/permissão e referências de arquivos continuam passando nos ensaios do serviço/BFF.

Chrome local: quatro layouts (1440/1366/1024/390), claro/escuro, teclado, toque emulado e painel recolhido. O desktop também copiou o lago para outro cenário, manteve o terreno do destino, conservou a origem, duplicou, recortou e desfez/refez a transferência. [Resultados e fluxo filmado](evidencias/lote5-agua/interface-oficina.json), [vídeo](evidencias/lote5-agua/interface-agua.mp4). [Build local](evidencias/lote5-agua/worker-build-local.json) criou terreno, exportou PNG e criou mar com três instâncias de workers `.js`, sem fontes de desenvolvimento.

[Regressão do terreno](evidencias/lote5-agua/regressao-terreno-interface.json) preservou pincéis, pintura, camadas, buracos, PNG, histórico e cancelamento nos quatro layouts. [Prévia/cache](evidencias/lote5-agua/edicao-previa.json) conferiu restauração real de alturas, cabeça nova, resposta antiga e recursos preparados por outra ferramenta. [Faísca](evidencias/lote5-agua/regressao-faisca.json) percorreu casa–praça–horta–ponte–Farol com o avatar real de 1,170 m, sem erro. Material GPU, 162 profundidades do lago GLB, nado sem piso invisível e contagens estáveis após ciclos estão no checkpoint 5.2.

## Limites e sequência

O aviso anterior de chunk do motor acima de 500 kB permanece registrado (856,70 kB; 230,43 kB gzip). Não foi ocultado nem usado para afirmar desempenho homologado. As provas são locais e de emulação; não substituem aparelhos físicos nem aprovam direção de arte. A baixada com ilha é fixture técnica, não acabamento da Faísca.

Não houve nova migração SQL, mudança de narrativa, velocidade, inventário ou identidade Kids/adulta. Nenhum GLB licenciado ou dado de acesso foi versionado. A implantação não foi antecipada.

**Próximo lote: 6 — Caminhos**, somente após preservar este fechamento na staging. Depois: 7, 8, 9 e 10, composição final da Faísca pela ferramenta, full review, CI, implantação e validação final em staging. A tarefa global continua aberta.
