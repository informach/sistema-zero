# Prévia de rotações articuladas, lote 128

`prepareSceneAnimationRotationPreview` captura hierarquia, trilhas, tempo e alvos
de uma revisão imutável. Aceita rotações temporárias apenas desses alvos, inclusive
raiz e descendente ao mesmo tempo. Não colapsa a seleção em raízes de subárvores.
Reusa a composição da reprodução: TRS local absoluto ou base afim multiplicada
pelo TRS relativo. Nenhuma decomposição de bases, nova chave, histórico ou pixels.

O compilador compartilha a matemática dos canais com a reprodução comum. A prévia
fixa conserva matrizes locais e canais amostrados uma vez; atualizações não releem
arrays de chaves. Apenas canais de rotação fornecidos são normalizados, como no
sampler de chaves. Ausência de override reproduz a pose original, inclusive canais
sem trilha. Alvos locais absolutos com base afim são recusados explicitamente.

Cada resultado possui Map e matrizes próprios, inclusive ramos estáticos. Alterar
saídas não contamina a captura ou resultados seguintes. Entrada inteira é validada
antes de amostrar; listas/rotações do consumidor não são retidas. A revisão fonte
é uma referência COW imutável, não um snapshot contra mutação in-place externa.
Locks e orçamento de escrita continuam responsabilidade do comando, não do desenho.

## Verificação e revisão

Seis testes novos e 19 focais passaram, zero falhas, 3.353 expectativas, 536 ms.
160 combinações de tempos/rotações em local e local-delta comparam matrizes exatas
com `setSceneAnimationKeys` seguido de reprodução. Oráculo independente Three cobre
hierarquia invertida na lista, bases afins/shear/escala negativa; testes também
cobrem saídas mutáveis, guarda de geometria/imagens/chaves, batches inválidos,
alvos/tempo inválidos e pai afim não editado.

Revisão: hierarquia resolve uma vez na ordem topológica; não modifica canais fora
do override, não decompõe transformações importadas nem reconstitui clipes com
chaves artificiais. Biome apontou retorno de callback de teste; corrigido o corpo
sem suprimir regra. Integral: **1.569 testes, zero falhas, 232 arquivos, 87,43 s**.
Tipos, Biome/696 e Vite/1,13 s passaram. Kids: compilação/5,7 s, tipos/16,2 s,
59 páginas/626 ms, exit 0. Diff check passou; aviso do chunk Three permanece.

É uma fronteira de desenho de domínio, não IK disponível na oficina. Não demonstra
latência de hardware, GPU, toque ou usabilidade. Conversão para rotações, revisão/
confirmação, UI e limites/bake são os próximos incrementos, sem ativação pública.
