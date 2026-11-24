# Parte 3.8 — Testar e fechar o lote 3 — Implementation Plan

> Executar com `executing-plans`, sem delegação e sem aprovações intermediárias. Conferência inicial: `staging` e `origin/staging` em `0287b1cb3`. Somente o lote 3 está ativo. Preservar a árvore paralela do Pinta.

**Goal:** percorrer o cenário real em primeira/terceira pessoa e voo, com avatar de escala conhecida, colisão e medição honesta de caminhada; depois revisar e fechar o lote 3 inteiro.

**Architecture:** sessão transitória no palco existente, sem comandos autorais, banco novo ou Rapier. Cápsula e passo fixo consultam MeshBVH das malhas reais, com índice de volumes e árvores compartilhadas por geometria. O palco fornece terreno/objetos já carregados. A UI permanece na oficina aprovada; ensaio pausa edição/capturas e devolve a câmera à mesma vista. Perfil do Arquipélago continua para o lote 8.

**Tech Stack:** Three.js, MeshBVH e DemandRenderLoop existentes; TypeScript, React e tokens/componentes do Molda; testes Bun e navegador real.

**Spec:** [3.8](2026-11-17-cenarios-lote3-objetos-ensaio.md), [plano do Claude](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), interface aprovada em PDF e issue 267.

## Contratos e restrições

- Entrada somente com arquivos reais prontos. Não usar caixas pendentes para fingir piso/colisão. Cenário `perfil` ainda não convertido não oferece caminhada.
- Chão é apenas a malha da base, respeitando bordas e recortes; o fundo visual externo não vira piso físico. Objetos respeitam nenhuma/caixa/cápsula/malha e visibilidade herdada. Conjuntos usam a projeção existente.
- Árvores BVH pertencem à sessão e não alteram `boundsTree`, índices nem GLBs do catálogo. Triângulos candidatos são resolvidos no mundo para respeitar escala não uniforme e espelhos.
- Parâmetros genéricos do ensaio não modificam velocidade, física ou controlador do jogo. Referência inicial de altura 1,16 m; derivar raio/câmera/degrau do personagem escolhido.
- Avatar GLB da biblioteca conserva esqueleto e clipes. Escolha de clipes/fator de escala é explícita; não adivinhar animação pelo nome nem impor pose T. Ausência de clipe fica visível como ausência, sem afirmar animação aprovada.
- Três modos, pausa, salto, teclado/mouse e toque; perder foco limpa comandos e pausa tempo. Retorno à edição preserva sua vista, documento, seleção e histórico. Voo não atravessa testes de caminhada por substituição.
- Medidor transitório tem início/fim, distância direta, caminhada e tempo ativo; exclui pausa, voo, nado, queda, teletransporte e retomada. Mudança de modo interrompe o trecho, sem unir posições distantes como caminhada.
- Capturas/vídeos e logs sanitizados versionados; fontes GLB e credenciais privadas ficam fora do Git. Não alegar desempenho em dispositivos físicos por emulação.

## 1. Colisão e movimento verificáveis

**Files:** motor `src/teste/{tipos,colisoes,movimento,percurso}.ts`, índice de caixas; testes `tests/teste-*.test.ts`.

**Interfaces:** fontes de geometria com matriz e volume; `MundoDoTeste` fornece resolução de cápsula, chão e bloqueio de câmera. `MovimentoDoTeste` recebe entrada normalizada/delta explícito e devolve estado transitório. `PercursoDoTeste` recebe somente passos aceitos, nunca documento.

- [x] Testes de chão, parede fina, rampa, degrau, teto, abismo/recorte, transformações não uniformes, cápsula e nenhuma colisão.
- [x] Consultas BVH com broad phase, árvores compartilhadas, descarte e limites de iteração/subpassos; sem varredura total por quadro.
- [x] Gravidade, queda, salto, inclinação máxima, subida de degrau com espaço superior e fronteiras reais. Sem túnel por delta grande nem piso invisível.
- [x] Medidor testa pausa, curvas, voo, reposição, queda e retomada sem somar distâncias artificiais.

## 2. Sessão do palco e avatar

**Files:** motor `src/teste/{sessao,personagem,controles}.ts`, `Palco.ts`, `tipos.ts`, `modelos.ts`, `Terreno.ts`.

**Interfaces:** `iniciarTeste(config,sinal)`, `configurarTeste(...)`, `entradaDoTeste(...)`, `medirTeste(...)`, `encerrarTeste()`; estado/callback sem classes Three para a UI. GLB já passa pela conferência de digest existente.

- [x] Preparar fontes apenas ao iniciar; entrada cancelável, sem deixar palco bloqueado em falha. Descartar cena de teste ao sair/reabrir/destruir.
- [x] Três câmeras, zoom/oclusão, controles de mouse/teclado/toque, pausa por visibilidade/foco e retorno exato à edição.
- [x] Avatar genérico e GLB animável, alinhamento dos pés, altura medida, escala uniforme e clipes disponíveis selecionáveis; esconder corpo em primeira pessoa.
- [x] Animação e câmera usam tempo ativo limitado, nunca tempo de aba suspensa. Nenhuma revisão de documento por andar ou mover câmera.

## 3. Interface e provas jogáveis

**Files:** oficina `telas/{Oficina,Testar}.tsx`, regras CSS e captura de retratos; playground `verificar-teste.mjs`.

- [x] Botão Testar destacado conforme identidade Molda; configuração pequena, controles claros e retorno acessível em celular. Nenhuma segunda oficina.
- [x] Indicadores de modo, altura, pausa/queda, percurso e iniciar/finalizar/zerar medição; rótulos humanos sem expor implementação.
- [x] Chrome claro/escuro, 1.440/1.366×768/1.024/390 px, teclado/mouse/toque emulado; erros de carga, cancelamento e vários ciclos de entrada/saída.
- [x] Percorrer formas, GLBs, espelhos e conjuntos; conferir documento/histórico intocados. Registrar vídeos primeira/terceira pessoa e comparação com voo.
- [x] Faísca convertida com avatar real de aproximadamente 1,16 m, lote da Morada e percursos existentes; câmera, colisão, retomada de edição e medição. Não deslocar geografia automaticamente.

## 4. Fechamento exclusivo do lote 3

- [x] Repassar cada item normativo de 3.1–3.8 contra código/testes; corrigir lacunas antes de marcar lote concluído.
- [x] Rodar regressões pertinentes de núcleo/motor/oficina, contratos, Members/BFF/gateway, SQL, tipagem e build. Resolver falhas próprias sem ocultar outras.
- [x] Revisar mudanças, recursos e evidências; registrar implementado/provisório/limites sem aprovação artística automática.
- [x] Commit e push dos caminhos próprios em staging. Só então iniciar lote 4. Implantação/validação remota e full review global permanecem no final.

## Checkpoint funcional, parte 3.8 ainda aberta

Sessão e medidor genéricos funcionam nos cinco layouts; testes de colisão/movimento/representações/clipes passaram. [Registro do checkpoint e pendências concretas](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote3-testar.md). Não marcar os itens acima como integralmente concluídos: faltam os ensaios reais e a revisão de fechamento.


Fechamento de 17/11: lote 3 implementado, testado e revisado em escopo local. [Relatório integral e evidências](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-testar.md). As notas anteriores registram checkpoints históricos; implantação e validação remotas continuam no encerramento global. Próximo lote: 4, terreno.
