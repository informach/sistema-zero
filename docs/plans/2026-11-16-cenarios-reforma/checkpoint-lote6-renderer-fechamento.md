# Lote 6.2 — Revisão do desenho e da física de Caminhos

18/11/2026 · base `23c3d6314`, staging conferida e limpa. **6.2 implementado, testado e revisado; lote 6 permanece aberto.**

## Escopo conferido

As seis variantes usam o gerenciador de Caminhos do Palco: trilha, praça, estrada, cerca, muro e ponte. A representação exibida participa do picking e, quando sólido, da física do Testar. Piso nativo não duplica a colisão do chão. Modelos, encaixes, materiais, texturas, visibilidade e descarte seguem os contratos existentes.

Os checkpoints anteriores registram a integração, os encontros sem superfícies duplicadas e as pontes: [Palco](checkpoint-lote6-palco.md), [encontros](checkpoint-lote6-encontros.md), [pontes e pilares](checkpoint-lote6-pontes.md). Esta revisão acrescenta o ensaio de estrada e módulos reais sobre relevo irregular.

## Estrada e módulos no relevo

O laboratório usa o núcleo público para preparar uma estrada em uma cópia do campo. A prévia de terreno existente recebe essa cópia; o mesmo gerenciador atualiza o piso e reconstrói as estruturas afetadas. O molde preservou o campo de origem, e a malha visual da estrada efetivamente mudou. A autoria atômica estrada+terreno e a edição por gesto pertencem a **6.3**, ainda não entregues.

Foram carregados os GLBs reais `cerca_01_pacote` (`d3801d31a4a9…`, Adventure Land), `muro_ameias_reto_3_5m` (`fe03f543e2b5…`, Reino) e `caminho_terra_reto` (`804d14830d95…`, Reino). Eixo X e base local zero foram conferidos no ensaio. A cerca usa largura 0,1924 m, altura 0,6001 m e módulo de referência 2,2276 m; o muro usa 1,22 × 3 m e módulos de referência de 3,5 m. Pontos de mudança de direção são preservados.

Em 1.774 vértices próximos à base, a maior penetração numérica medida foi de aproximadamente 0,00012 mm. A consulta física encontra o muro no trecho ensaiado. Geometrias do acervo mantiveram seus buffers originais. Três ciclos mantiveram 5 geometrias, 11 texturas, 5 chamadas de desenho e 31.014 triângulos; nenhum erro de navegador.

[Antes da moldagem](evidencias/lote6-relevo/antes.png) · [Depois](evidencias/lote6-relevo/depois.png) · [Noite](evidencias/lote6-relevo/noite.png) · [Registro](evidencias/lote6-relevo/resultado.json).

São imagens de laboratório para conferir implantação, atualização e juntas. Não demonstram a composição final da Faísca nem aprovam o acabamento desses materiais. A seleção de peças e a montagem artística continuam sujeitas ao aceite final.

## Revisão técnica e limites

- A montagem conserva os materiais originais sem override; cópias conformadas e lotes de desenho têm dono e descarte explícitos.
- Piso, modelos modulares e partes de ponte compartilham os referenciais das operações e dos apoios. Não há nova física, inventário ou navegação.
- Chaves de partes, visibilidade, reentrada e alteração de alturas/topologia foram conferidas nos testes do motor. Falta de recurso e encaixe inválido produzem estado de espera ou erro individual.
- Os encontros entre pisos são recortes de geometria, não deslocamentos arbitrários em Y. As tampas dos pilares usam faces reais; ausência ou contato parcial gera aviso.
- O último conjunto de verificações da implementação passou: núcleo 274/10.203, motor 117/3.740, oficina 96/610, Members 51/244 e Postgres 40/358; tipagem dos três pacotes, Biome, build e workers compilados. O ensaio adicional de relevo, único arquivo executável acrescentado neste recorte, passou com Biome.
- O percurso completo da Faísca, após a correção compartilhada de recorte, chegou à praça, horta, ponte, retorno e Farol com o Cute Characters em 1,17004 m, sem erros. Água passou nos quatro layouts de teste.

## Próxima frente exclusiva

**6.3 — pontos, prévia, worker e autoria.** Criar/mover/inserir/remover pontos na cena e por coordenadas; preparar estrada+campo antes do lote; integrar cancelamento, troca de cabeça, falha/retomada e undo/redo. Depois, aba Caminhos (6.4) e fechamento integral do lote (6.5).

Não iniciar lote 7 antes de fechar o 6. Vídeos de gestos, avaliações da interface, revisão transversal, composição final, CI e implantação/validação em staging continuam pendentes nos respectivos marcos. Nenhum teste emulado é apresentado como homologação de aparelho físico.
