# Lote 7 — Jogo, luz e céu: revisão de fechamento

18/11/2026 · `staging` · implementação da interface em `0843c302c`.

**Lote implementado, testado e revisado localmente.** A oficina permite preparar a exploração, editar metadados de jogo e compor luz/céu pelo mesmo núcleo, motor, seleção, histórico e fila de persistência. A conferência conjunta não encontrou lacuna impeditiva neste lote. Implantação e validação de staging seguem no encerramento global, após os lotes restantes.

## Conferência do escopo

| Requisito do plano/PDF | Implementação e prova |
| --- | --- |
| Início e marcadores nomeados | Início principal único, secundários e ponto genérico; edição por coordenadas, clique no cenário e gizmos comuns. Testar oferece principal, início escolhido ou centro da vista. |
| Zonas e rotas | Caixa, esfera e polígono simples com altura; controles locais, alças compartilhadas, captura com dono, limites de pontos/amostragem. Rotas abertas/fechadas, livres ou acompanhando terreno. |
| Propriedades de objetos | Texto, número e booleano nos comandos existentes; validação de chaves/limites, editor compartilhado, conflitos sem sobrescrever rascunho. |
| Colisão por objeto e inspeção | Nenhuma/caixa/cápsula/malha no inspector existente, inclusive em Jogo; guias extraídas das mesmas fontes físicas do Testar. Limite explícito de 200 mil triângulos, com recusa antes de exibir resultado parcial. |
| Câmera, régua e escala | Captura/restauração de posição, alvo e FOV; medidas do núcleo em metros; referência de altura conforme modelo/personagem, sem alterar o avatar para acomodar cenário. |
| Sol, ambiente e sombras | Hora fornece padrões; overrides de direção/cor/força/sombra, luz ambiente de céu/chão, alcance/resolução de sombra. Inspeção não altera o documento. |
| Pontual e foco | Marcadores tipados, com alcance, direção e penumbra do foco; orçamento de 32 luzes e quatro sombras locais. Objetos/targets/maps descartados ao retirar recursos. |
| Céu e névoa | Cor ou panorama 2:1 por referência autorizada da biblioteca, importação de arquivo ou seletor Molda existente; giro/intensidade, névoa linear/desligada/padrão. Sem URL livre. |
| Autoria e histórico | Prévia com dono, cancelamento sem publicar intermediários, guarda conjunta, undo/redo e reabertura. Clipboard misto remapeia associação interna entre objeto e marcador. |
| Casca e controles aprovados | Seis abas, rail, inspector recolhível e gaveta Molda preservados; parâmetros avançados recolhidos. Mouse/teclado e toque emulado; 1440×900, 1366×768, 1024×768 e 390×844. |

As decisões e provas detalhadas estão nos checkpoints de [núcleo](checkpoint-lote7-nucleo-fechamento.md), [palco](checkpoint-lote7-palco.md), [iluminação](checkpoint-lote7-iluminacao.md) e [interface](checkpoint-lote7-interface.md). Não foram acrescentados motor de NPC, missão, navegação automática, script de propriedades, shader editor ou lightmaps.

## Revisão conjunta

Foram conferidos: equivalência entre controles da interface e schemas/comandos, coordenadas mundiais/locais e apoio no terreno, locks/ocultação, seleção e associação, transações e inversão, donos de captura/prévia, espera de recursos e respostas antigas, limites antes de alocar/amostrar e descarte de materiais/texturas/targets. A colisão visual usa as mesmas geometrias, transformações e draw ranges da fonte física.

O ensaio adicional de seleção mista criou um bloco, alterou sua colisão para cápsula pelo inspector de Jogo, associou um marcador, selecionou ambos pelo teclado e copiou/colou pela interface. A associação da cópia aponta para o objeto novo. Excluir e desfazer após reabrir restaura as duas entidades e a associação. A colagem gera uma única revisão.

O ensaio de recusas confirmou que nome vazio, rota degenerada e sol sem direção não publicam revisão. Panorama quadrado é recusado antes do upload. Uma falha de transporte controlada após enfileirar a guarda mantém o marcador local; “Tentar de novo” publica a mesma operação uma vez. Alterar propriedades localmente e desfazer sua versão guardada preserva o texto local e exige recarregamento explícito, em vez de sobrescrever a edição.

O ensaio do motor distingue o início principal em `(-4, -3)` do centro da vista em `(0, 0)` nos eixos X/Z. Escape, segundo toque e cabeça nova continuam cancelando gestos sem publicar intermediários. Guias não aparecem em retratos nem no Testar. A prévia de ambiente continua produzindo uma revisão por guarda, descartando respostas antigas e recusando recursos inválidos sem substituir o cenário aceito.

## Verificação

| Verificação | Resultado nesta revisão |
| --- | --- |
| Núcleo completo | 303 testes, 10.364 verificações |
| Motor completo | 149 testes, 3.961 verificações |
| Oficina/hosts completos | 110 testes, 735 verificações |
| Members serviço/HTTP/histórico | 51 testes, 244 verificações |
| PostgreSQL real isolado | 41 testes, 369 verificações; JSONB, referências, concorrência, reconstrução e histórico |
| BFF member-shell | 37 testes, 197 verificações |
| Gateway — cenários, registro e política Kids | 45 testes, 587 verificações |
| Conversão de cenário | 2 testes, 3.130 verificações |
| Tipagem | Núcleo, motor, oficina e Members aprovados |
| Formatação/lint e diff | Biome e `git diff --check` aprovados nos arquivos alterados |
| Build e workers | Build aprovado; quatro workers JavaScript compilados exercitados com terreno, PNG16, água e caminhos |
| Regressão Terreno | Pintura, buracos, camadas, reamostragem, PNG16 e histórico; quatro larguras sem erros registrados |
| Regressão Água/Caminhos | Escopos dos ensaios da interface repetidos e aprovados, incluindo transferência de água, seis caminhos e alças |
| Chrome — Jogo/Luz | Criação/edição, prévias, guarda, importação de panorama, cancelamento, clipboard, histórico, Testar e quatro layouts aprovados |
| Recursos | Três ciclos de guias/colisões e três ciclos de ambiente/luzes estáveis; nenhuma resposta antiga trocou o panorama atual |

Todos os testes listados passaram sem falhas. O aviso de chunks acima de 500 kB permanece no build; não foi suprimido nem convertido em aprovação de desempenho.

### Regressão da Faísca com o avatar real

Percurso em cenário convertido com Cute Characters nativo: porta → praça → horta → ponte, retorno e subida ao Farol. Altura medida **1,17004 m**, caminhada porta–praça **12,68 m**, praça–horta **19,41 m**, percurso horta–ponte **43,20 m**, altura final na subida **9,60 m**. Pequenas variações em relação às execuções anteriores decorrem dos passos do percurso; geografia e velocidades não foram alteradas. Documento autoral preservado e zero erros registrados.

## Evidências reproduzíveis

- [Recusas e retomada](evidencias/lote7-fechamento/recusas.json), [clipboard misto](evidencias/lote7-fechamento/clipboard-misto.json), [quatro layouts](evidencias/lote7-fechamento/layout.json) e [1366×768](evidencias/lote7-fechamento/jogo-1366x768.png).
- [Gestos, câmera e entradas](evidencias/lote7-fechamento/guias.json), [ambiente e ciclos](evidencias/lote7-fechamento/ambiente.json), [terreno](evidencias/lote7-fechamento/terreno.json).
- [Percurso da Faísca](evidencias/lote7-fechamento/faisca.json), [chegada ao Farol](evidencias/lote7-fechamento/faisca-farol.png) e [vídeo do percurso](evidencias/lote7-fechamento/faisca-percurso.mp4).
- [Interface em movimento e demais capturas](checkpoint-lote7-interface.md#verificações-e-evidências).

Scripts novos: `verificar-jogo-luz-recusas.mjs` e `verificar-jogo-clipboard-misto.mjs`. O ensaio `verificar-marcadores-gestos.mjs` inclui a entrada explícita no centro, e `verificar-jogo-luz-layout.mjs` confere também a altura normativa de 768 px em 1366. Demais scripts reproduzíveis seguem nos checkpoints, sem acessos privados adicionados ao código de produção.

## Limites e sequência

Os ensaios são locais no Chrome; toque é emulação. A prova PostgreSQL usa banco de QA descartável, separado das contas. Falha de transporte e fonte Molda da interface usam adaptadores controlados; a prova autenticada do serviço remoto pertence à validação final de staging. O vídeo foi comprimido para evidência e não mede FPS. Não foi declarado desempenho aprovado em aparelhos físicos ou aprovação artística da Faísca.

**Lotes 0–7 fechados localmente. Próximo lote exclusivo: 8, exportação.** Depois seguem 9 e 10, composição final da Faísca pela ferramenta, full review, CI, implantação e validação em staging. Push preserva o código no GitHub; não equivale a implantação. A abertura a membros e produção continua dependendo de instrução da usuária.
