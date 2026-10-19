---
status: pending
file: packages/studio/src/components/code/pro-templates/games/three.ts
line: 117
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Plano válido recebe diagnóstico de caminho incorreto no Pro

## Review Comment

O novo Plano do Molda é uma superfície XZ válida, com bounds `2 × 0 × 2`, material de dois lados e exportação GLB pelo contrato existente. Ao usá-lo em `config.modelPath` nos kits Three, `ModelLibrary.actor` rejeita a altura zero na linha 29, e o catch da linha 117 descarta essa causa e orienta conferir o caminho. O aluno pode repetir importações ou alterar um caminho correto sem conseguir usar esse material. A rejeição em um helper de personagem normalizado por altura é coerente; o diagnóstico atual não distingue esse limite de um arquivo ausente.

Prova causal: o probe `staging-molda-plane-selection-review-probe.mjs` executou a guarda real extraída do SHA remoto `6f4efe55377c9b6530aa0715f73bce6cc5e88041`: bounds `{x:2,y:0,z:2}` e altura-alvo `1.4` lançam “O modelo precisa ter dimensões válidas.” e descartam o skeleton do clone; `{x:2,y:2,z:2}` passa. A criação real da forma foi executada com fronteiras controladas e produz vértices em Y=0 com transformação unitária. Não é uma prova do loader GLB completo ou da renderização. O consumidor clássico usa maior lado, portanto não tem essa mesma divisão por altura. Schema/export/persistência/import Molda não mudaram no delta.

Correção mínima adequada: preservar `actor(path, height, ...)` e sua escala por altura, distinguir a causa “modelo sem altura para personagem” por erro/código específico e apresentar orientação fiel no kit, mantendo deliberadamente o personagem inicial disponível. Falhas de caminho/rede continuam com sua orientação própria. Não converter automaticamente Plano em volume, girar a superfície, trocar todos os atores para maior lado nem ocultar a rejeição com um resultado aparentemente bem-sucedido. Não exigir uma nova API de cenário para corrigir esta mensagem.

Uma opção futura explícita `height | largest-side`, com default `height`, pode permitir normalização de superfícies por dimensão finita positiva, mas não basta para tornar o Plano um chão: o kit adiciona o modelo ao visual móvel do jogador e usa raios fixos no movimento/objetivos, sem colisão derivada do GLB. Objeto/cenário, posição, ancoragem e colisão precisam de contrato próprio quando esse uso for oferecido. Preservar material `doubleSided`, UV/imagens, clone/animação e ownership de cache/dispose, validando também bounds vazios ou não finitos.

Verificação para a correção: gerar ambos os kits Three; reproduzir Plano válido, modelo volumétrico e caminho inexistente com os diagnósticos distintos; verificar personagem inicial e cleanup após rejeição/Stop/fechamento. Prova de compatibilidade ampliada deve usar exportação Molda real → Materiais → Classic/Pro e projeto exportado, incluindo textura pelos dois lados, transformações e comportamento explícito de colisão. Python/Turtle não ganha suporte Molda/3D por este ajuste; Raylib permanece futuro.

## Triage

- Decision: `UNREVIEWED`
- Notes:

Correção local em revisão: `ModelActorDimensionsError` distingue Plano sem altura e `modelHeight` inválido no kit gerado; o catch mostra a orientação específica e mantém o personagem inicial. Erro de caminho/carregamento conserva a orientação anterior. Ambos os kits `three-action`/`three-exploration` tiveram `src/assets.ts` e `src/game.ts` gerados e analisados pelo parser TypeScript 5.9 sem erro; Biome da fonte passou. Isto ainda não prova GLB Molda real, loader/cache/cleanup, export ou player. Review independente e validações funcionais pendentes antes de resolver o achado.

Prova direcionada adicional: `.cache/studio-python-l0/molda-three-actor-real-glb.mjs` gerou Plano (`1512` bytes) e Caixa (`2536` bytes) com `encodeSceneGlb` do Molda, serviu os GLBs por HTTP local e usou o `GLTFLoader` real de Three através do `ModelLibrary` gerado. Plano produziu a mensagem de ausência de altura; `modelHeight=0` produziu a mensagem própria; Caixa criou um ator com objeto carregado e foi descartada; URL inexistente manteve uma classe de erro distinta. Saída JSON e exit `0` no Bun isolado `1.4.3`. Review independente do patch não encontrou novo achado em 16 sondas negativas, 2 válidas, 3 branches de catch e 8 arquivos gerados analisados. Isto exercita o arquivo GLB real e o loader, mas ainda não equivale à passagem pelo navegador, ao fluxo Materiais/Pro, à exportação, ao player nem à inspeção visual da textura e do cleanup.
