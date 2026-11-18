# Lote 7 — Jogo, luz e céu — Implementation Plan

> Executar com writing-plans e executing-plans na sessão principal, sem delegação nem pausas de aprovação. Lotes 0–6 implementados, testados e revisados; staging conferida em `671e8c4c0`, árvore limpa. Somente este lote ativo. Implantação e validação remotas no fechamento global.

**Goal:** editar pontos de início, marcadores, zonas, rotas, propriedades, câmeras, réguas e referência de escala, inspecionar colisões e compor iluminação/céu/névoa na oficina Molda.

**Architecture:** ampliar o marcador existente com configuração tipada opcional, mantendo sua identidade, posição, giro, apoio no chão, propriedades e organização. Dados locais de zona/rota/alvo acompanham a raiz sem dupla translação. Ampliar iluminação existente com overrides opcionais e panorama por referência de textura; hora continua fornecendo o comportamento padrão. Núcleo puro, desenho/consulta/física comuns, mesma fila e clipboard. Recursos e controles com dono, sem um motor paralelo de navegação, missão ou seleção.

**Tech Stack:** Zod/TypeScript no núcleo, Three no motor, React e tokens/componentes Molda na oficina, host/bibliotecas/JSONB existentes.

**Spec:** [plano normativo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [interface aprovada](../../plans/2026-11-16-cenarios-reforma/interface-aprovada.pdf), [fechamento do lote 6](../../plans/2026-11-16-cenarios-reforma/revisao-lote6-caminhos.md), [execução integral](2026-11-16-cenarios-reforma-execucao.md).

## Decisões e limites

- Usuária monta cenários visualmente e depois os percorre com o avatar. Os painéis devem priorizar nome, posição, tamanho e ações de cena, recolhendo parâmetros avançados. Conservar rail, inspector, drawer, componentes e identidade do PDF/Molda; nenhuma nova linguagem visual.
- Marcadores antigos sem configuração continuam sendo pontos. Configurações explícitas: ponto de início, zona (caixa/esfera/polígono), rota, câmera, luz (pontual/foco), régua e referência de escala. Não inferir função pelo nome nem criar arrays paralelos para cada ferramenta.
- Início principal único; outros pontos de início podem ser secundários. Testar escolhe o principal visível ou permite uma escolha explícita. Não alterar a altura/velocidade do personagem para acomodar o cenário.
- Transformações e coordenadas continuam em metros e Y para cima. Configurações locais, parâmetros finitos, limites antes de amostrar/alocar, polígonos simples e direções válidas. Rota e polígono usam a captura/alças existente, por adaptação do contrato, sem duplicar o motor de gestos.
- Propriedades são as já existentes (texto, número, booleano), com limites/chaves validados. Não implementar execução de scripts dentro de propriedades.
- Iluminação: hora, sol (direção/cor/força/sombra), ambiente, céu por cor ou panorama da biblioteca/Molda, névoa linear/desligada, luzes pontuais/focos com alcance/direção/penumbra/sombra. Orçamento explícito de luzes e sombras; sem editor de shader/lightmaps.
- Helpers são de edição e não viram colisores do jogo. Mostrar colisões usa as mesmas fontes físicas do Testar. Nenhuma caixa aproximada será chamada de malha ou cápsula real.
- Seleção/árvore/camada e clipboard abrangem marcadores, conservando referências internas e pose dos externos. Conjuntos permanecem composições de objetos; não incorporar metadados de jogo silenciosamente.
- Panorama tem referência de conteúdo existente, licença e ciclo de descarte. Não usar URL livre como atalho nem remover textura ainda referenciada pelo céu.
- Uma verificação pesada por vez; browser sem edição concorrente de fontes. Consultas assíncronas de QA usam `esperarConsulta`, conferindo o booleano resolvido. Testes e tipagem pertinentes por recorte, revisão e commit. Lote 8 somente após fechar este lote.

## 7.1 — Contratos, geometria e autoria pura

**Files:** core `src/v2/{entidades-schema,documento,comandos,inverter,validacao,organizacao,fragmento,fragmento-schema,arquivos-referenciados}.ts`; novos `marcadores-schema.ts`, `marcadores.ts`, `iluminacao.ts`, `fragmento-marcador.ts`; testes específicos.

- [x] Testar antes: configurações antigas/novas, limites, polígonos inválidos, rotas vazias, câmera/foco sem direção, referências e orçamento de luzes/sombras.
- [x] Implementar schemas opcionais estritos, configuração/pose/volumes mundiais, consultas de zona/rota/início e geometria limitada compartilhável. Conferir terreno e giro sem alterar descritor.
- [x] Integrar validação, comandos existentes de marcador/iluminação, propriedades em entidades, locks, inversão e replay; nova configuração não perde campos antigos.
- [x] Estender o fragmento existente a marcadores, remapeando objeto associado quando copiado e preservando referências externas com pose/propriedades corretas. Deslocar raiz/alvos uma vez; conservar coordenadas locais.
- [x] Proteger referências de panorama na validação e remoção de texturas; conferir arquivos/licenças no fluxo de serviço já existente.
- [x] Núcleo, tipagem, autoria/host e Postgres pertinentes; revisão e checkpoint sem declarar UI entregue.

## 7.2 — Palco, helpers e câmeras

**Files:** motor novos `jogo/*`, `ambiente/*`; `Palco.ts`, `tipos.ts`, `teste/{fontes,sessao}.ts`; testes geométricos/picking/recursos.

- [x] Desenhar/selecionar início, ponto, zonas, rotas, câmera, régua e referência de escala, respeitando ocultação, camada e distância. Helpers fora do Testar/retratos/exportação de geometria.
- [x] Seleção por clique/área/laço e encaixe/movimento pelo fluxo comum; edição de pontos com captura/alças existente. Cancelar, segundo dedo, cabeça nova e desmontagem não publicam intermediários.
- [x] Capturar/restaurar câmera autoral (posição, alvo e campo de visão), vistas de edição e enquadramento; câmera de teste continua isolada do documento.
- [x] Inspeção visual das fontes de colisão reais (nenhuma/caixa/cápsula/malha), com recursos compartilhados e limites; conferir contra a física.
- [x] Início principal alimenta Testar; chão/volume e personagem nativo preservados. Régua mede segmentos e total em metros; referência de escala em metros conferida com o avatar nativo. Seleção de personagem na interface em 7.4.
- [x] Testes, picking, ciclos de descarte e revisão/checkpoint do motor. [Evidências](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote7-palco.md).

## 7.3 — Sol, ambiente, luzes, céu e névoa

**Files:** motor `ambiente/*`, `Palco.ts`, `texturas.ts`; oficina integração de textura existente; testes CPU/browser.

- [x] Preservar hora padrão e aplicar overrides de sol/ambiente; alvo e sombras acompanham a região visível sem mover a luz autoral.
- [x] Luz pontual/foco por marcador, com direção/cor/força/alcance/penumbra e orçamento de sombras. Descarte de targets/maps ao remover ou ocultar.
- [x] Cor de céu e panorama equiretangular da biblioteca/Molda, com rotação/intensidade; resposta antiga não troca o céu atual. Névoa linear coerente com o horizonte, opção desligada. Pipeline de conteúdo existente; seletor visual em 7.4.
- [x] API de prévia com cancelamento, confirmação única e histórico; evitar uma revisão por slider/quadro. Controles do painel em 7.4.
- [x] Conferir dia/noite, sombras, cor/panorama, espera/falha/reentrada e renderer após ciclos. [Revisão e checkpoint](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote7-iluminacao.md).

## 7.4 — Interface Jogo e Luz e céu

**Files:** oficina `useJogo.ts`, `useAmbiente.ts`, `telas/{Jogo,LuzECeu,Propriedades,MarcadorPontos}.tsx` e componentes por responsabilidade; `Oficina.tsx`, CSS prefixado.

**Execução interna, uma etapa de cada vez:** primeiro adaptadores puros/formulários e posse da captura de pontos; depois hooks de rascunho/guarda; em seguida painéis/rail e integração; por último QA da interface nas quatro larguras. Isso não fecha o lote nem dispensa 7.5. A captura compartilhada terá dono explícito (Caminhos/Jogo): um efeito inativo não poderá encerrar a edição de outro painel. Jogo e Luz usarão a projeção de comandos já testada em 7.3, sem uma fila de autoria paralela.

**Intenção visual:** a usuária compõe o cenário olhando o palco. Nome, colocação e medidas vêm primeiro; parâmetros técnicos e propriedades ficam recolhidos. Conservar rail vertical, inspector, gaveta e componentes/tokens Molda da interface aprovada, com ações reais, unidades em metros e mensagens de prévia/guardar/cancelar. Nenhuma nova linguagem visual.

- [ ] Rail Jogo: início, ponto, zona, rota, câmera, régua, escala e colisões; criar por cena/coordenadas e editar no inspector. Nada sem comportamento.
- [ ] Nome/posição/giro/chão, forma/tamanho, lista de pontos, câmera, luz e propriedades com unidades, limites e ajuda curta. Ações avançadas recolhidas.
- [ ] Rail Luz e céu mantém os presets de hora e abre controles reais de ambiente/panorama/névoa/luzes. Escolha de panorama reutiliza importação/biblioteca/Molda.
- [ ] Integrar seleção, organização, copiar/colar, duplicar, Delete, undo/redo e reabertura. Proteger rascunhos contra ferramentas concorrentes e respostas atrasadas.
- [ ] Conferir teclado/mouse/toque em 1440/1366/1024/390, claro/escuro, comparando com a casca aprovada. Revisar e preservar recorte.

## 7.5 — Fechamento exclusivo do lote

- [ ] Comparar linha a linha com o plano/PDF e completar lacunas de todos os recursos deste lote.
- [ ] Suítes de núcleo/motor/oficina, Members/BFF/gateway/JSONB pertinentes; tipagem e build. Sem regressão de objetos/terreno/água/caminhos.
- [ ] Browser: mundo com início, zona, rota, câmera, luz, propriedades; Testar e retorno; edição em cena/coordenadas; clipboard misto e histórico após reabrir.
- [ ] Alterar sol, céu e névoa; panorama real; erros/cancelamentos/descarte e recursos estáveis. Capturas/vídeos em movimento, medidas e limitações explícitas.
- [ ] Revisar, documentar, commitar e enviar à staging. Somente então iniciar lote 8. Composição final, full review, CI, implantação e validação remota continuam no encerramento global.

## Estado atual

**Lote 7 aberto; 7.1, 7.2 e 7.3 implementados, testados e revisados. Única frente ativa seguinte: 7.4 — interface Jogo e Luz e céu.** [Núcleo](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote7-nucleo-fechamento.md), [palco](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote7-palco.md) e [iluminação](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote7-iluminacao.md). Lotes 0–6 fechados localmente. Interface 7.4 e fechamento integral 7.5 continuam pendentes. Não há autorização nova de produção ou abertura a membros.
