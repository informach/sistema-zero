# O Jardim Secreto: direção de arte

28/10/2026 · Briefing da [proposta da missão](proposta.md). Define o que produzir e como revisar; as artes finais desta missão ainda não foram criadas.

## Referências e resultado esperado

O Jardim deve pertencer à mesma família visual de **A Chave do Farol**, **A Ilha do Farol** e **Cadê Todo Mundo**, com o mesmo cuidado de acabamento. Ter poucos elementos simplifica a missão, mas não reduz a qualidade das artes.

| Referência do repositório | O que aproveitar |
| --- | --- |
| [Artes do Farol 2D](../../../../packages/studio/src/arte/assets/farol/) e [catálogo](../../../../packages/studio/src/arte/farol-assets.ts) | Personagens, proporções, desenho limpo, leitura do movimento e organização do espaço jogável |
| [Artes do Cadê Todo Mundo](../../../../packages/studio/src/arte/jardim-assets.ts), [sprites](../../../../packages/studio/src/arte/jardim-sprites.generated.ts) e [quadros](../../../../packages/studio/src/arte/jardim-quadros.ts) | Vegetação em camadas, flores coloridas, pedras orgânicas, formas arredondadas e ambiente acolhedor |
| [Produção 3D da Ilha](../../../design/ilha-do-farol-blender/README.md), [modelos](../../../design/ilha-do-farol-blender/modelos.json) e [galeria](../../../design/ilha-do-farol-blender/galeria/) | Volumes estilizados, materiais, proporções, luz, sombras e acabamento dos modelos |

A comparação final deve usar as versões atuais dos jogos na prévia do Estúdio. Imagens de comparação da produção 3D contêm versões intermediárias; não tomar um modelo antigo como referência final apenas porque aparece nelas.

Cadê é referência visual complementar, não pré-requisito pedagógico. Sua cena lateral não deve ser copiada literalmente: o Jardim precisa permitir caminhada nas quatro direções. Personagens estáticos do Cadê não substituem automaticamente os personagens animados dos Faróis.

## Cena e composição

Um pequeno jardim com caminho largo, vegetação nas bordas e quatro elementos imediatamente legíveis: personagem, regador, flor e área por onde andar. A composição 3D deve corresponder à 2D, com os mesmos elementos e relações de posição na entrada da aula. A pessoa muda o lugar do regador depois.

Deve ser possível chegar à flor sem pegar o regador. A rota não exige desvio difícil, salto, câmera livre nem descoberta de uma passagem escondida. Nenhum objeto de coleta começa em contato com o personagem ou com a flor.

O centro fica visualmente tranquilo; detalhes mais ricos se concentram nas bordas. Plantas decorativas não encobrem o regador nem se parecem com objetos recolhíveis. Pedras e plantas grandes ficam fora da caminhada ou têm sua relação com a área pronta resolvida pela equipe. Não criar obstáculos que obriguem a criança a programar uma colisão nova.

No 2D, a área interna é livre para caminhar até as quatro bordas: o limite ensinado é o da tela. Não desenhar cercas internas ou corredores que pareçam bloquear o personagem quando ele pode atravessá-los. No 3D, a decoração respeita as áreas de caminhada preparadas.

A pergunta de ponto de vista usa uma composição própria, com uma pedra que encobre parcialmente o regador antes da mudança de vista. Essa oclusão tem função no quiz e não deve ser copiada para o projeto da missão, onde os elementos importantes ficam visíveis.

A flor é o destino visual, mas seu destaque não pode esconder a diferença entre estar fechada e aberta. O regador deve contrastar com a vegetação pelo contorno e pela cor. Rever a leitura na prévia estreita, sem depender de aumentar o objeto até ele parecer fora de escala.

## Elementos a produzir ou adaptar

| Elemento | Direção visual | Comportamento preparado pela equipe |
| --- | --- | --- |
| Jardim | Verde em camadas, caminho claro, pequenos detalhes naturais e espaço de circulação | Fundo 2D; terreno e áreas permitidas 3D coerentes com o desenho |
| Personagem | Personagem compatível dos Faróis, com o mesmo acabamento | Artes e animações de andar/parar prontas; comando de movimento por montar |
| Regador | Alça, recipiente e bico reconhecíveis, silhueta arredondada, tamanho legível | Imagem/modelo e contato coerente; coleta e memória por montar |
| Flor fechada | Botão bem definido, caule e folhas simples | Estado inicial e contato estável |
| Flor aberta | Pétalas visíveis e crescimento perceptível, sem depender apenas da mudança de cor | Imagem final 2D e clipe `florescer` 3D; acionamento por montar |
| Pedras | Volumes arredondados e irregulares inspirados no Cadê, com planos e sombras suaves | Decoração sem regra nova para a criança |
| Vegetação | Folhas agrupadas em camadas, flores pequenas e variação controlada de tamanho | Decoração que preserva a visão e a circulação |

O conjunto mínimo precisa estar completo nas duas dimensões. Variações adicionais de personagem ou aparência são opcionais e só entram quando forem compatíveis. Não prometer uma galeria nova extensa para uma missão de duas aulas.

Uma variação da flor é sempre um par fechado/aberto no 2D ou um modelo com o clipe correspondente no 3D. Conservar dimensões, ponto de apoio e contato entre variantes; oferecer apenas opções validadas. Assim a criança pode escolher sem precisar compensar deformações ou aprender configuração nova para fazer a regra funcionar.

O florescimento pode incluir um efeito visual breve, preparado pela equipe, desde que seja compreensível que o personagem levou o regador até a flor. Não exige água contada, item na mão, inventário, tecla de uso, física de líquido nem som programado pelo aluno.

## Acabamento em 2D e 3D

No 2D, seguir o desenho dos sprites existentes: contornos limpos, planos de cor consistentes, formas amigáveis e poucos detalhes pequenos. A flor aberta deve preservar o ponto de apoio da fechada, sem saltar de lugar na troca de imagem. Evitar halos, cortes e bordas com resíduos de transparência.

No 3D, manter volumes estilizados, com facetas e curvas coerentes com a Ilha. Pedras não devem ser caixas; plantas não devem parecer hastes genéricas com esferas. Usar materiais e iluminação compatíveis com a produção atual, sem recorrer a realismo fotográfico ou misturar pacotes de estilos diferentes.

Modelos devem apoiar no chão, respeitar escala, origem e orientação. A flor conserva o ponto de contato ao abrir: pétalas maiores não podem alterar silenciosamente a distância necessária para o encontro. O regador precisa continuar recolhível depois de uma mudança válida de posição.

O clipe `florescer` termina com a flor aberta e conserva a pose. Um novo toque pode repetir a animação sem reprovar a missão; não exigir uma variável adicional para impedir a repetição. Defeito na pose final ou no clipe é problema do material fornecido.

## Critérios para revisar a arte

Comparar lado a lado com os cursos-base, no mesmo navegador, tamanho de prévia e condições de execução:

- Personagem, regador e flor são reconhecíveis na prévia estreita e na ampliada.
- As cenas 2D e 3D parecem versões do mesmo jardim, sem mudança gratuita de composição.
- A flor fechada e a aberta diferem pela forma, inclusive sem animação e sem depender só da cor.
- Vegetação e pedras têm acabamento comparável ao Cadê e aos Faróis; não há peças flutuando, interseções acidentais, frestas ou cenário vazando para fora do terreno.
- A caminhada, os dois caminhos de teste e a posição alternativa funcionam sem obstáculos decorativos indevidos.
- Sombras, contraste e enquadramento preservam a leitura; a criança não precisa ajustar a câmera ou a luz.
- Carregamento, tamanho dos arquivos e fluidez são medidos nas mesmas condições das bases. Investigar regressões e otimizar as peças antes de aprovar; não declarar desempenho apenas pela contagem de polígonos.

Peças provisórias são úteis para testes internos de mecânica. O protótipo submetido à aprovação visual precisa mostrar artes representativas do acabamento final, incluindo o regador e os dois estados da flor. Uma captura estática bonita não substitui a revisão dentro do jogo.

## Entregas da produção

Preservar fontes editáveis das artes 2D e dos modelos 3D, com arquivos ou scripts suficientes para reproduzir as exportações. Entregar imagens e modelos otimizados no padrão atual do Estúdio, incluindo texturas e clipes necessários, além de prévias dos estados fechado/aberto.

Registrar nomes, dimensões, origem, escala, área de contato e clipes no catálogo técnico. Conferir o pacote portátil do projeto com todos os recursos, inclusive numa importação limpa. Nenhum modelo pode depender de um caminho local de quem o produziu.

A equipe prepara e testa essas peças. A aprendizagem cobrada continua sendo a definida na matriz da proposta, sem transformar produção de arte ou correção de carregamento em tarefa da criança.
