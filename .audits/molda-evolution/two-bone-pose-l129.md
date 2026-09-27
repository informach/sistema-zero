# Dois ossos na timeline, lote 129

## Contrato e prova

`prepareSceneTwoBonePose` captura três apoios distintos, ligados diretamente,
com raiz/articulação editáveis e descendentes destravados. Alvo/indicação entram
em mundo; a solução usa o referencial euclidiano do pai da raiz no tempo escolhido.
Sob pai afim, alcance refere-se a essa métrica, não a comprimento fixo em mundo.
Pai singular/sem precisão é recusa explícita. Nenhuma aproximação de bases afins.

Primeiro giro rígido leva o segmento superior à dobra calculada; o segundo gira
a parte inferior já movida pela raiz até a ponta resolvida. O arco mínimo usa
atan2 do produto vetorial e escalar para não perder a componente transversal
próxima do antiparalelo; o caso exatamente oposto tem eixo determinístico.

Matrizes desejadas são convertidas ao espaço local/relativo e passam pela prova
TRS existente. Somente a rotação é aproveitada. A prévia usa translações/escalas
originais, inclusive as animadas, e precisa reconstruir eixos e três origens com
erro relativo ≤2048 eps. Shear induzido, singularidade e perda de precisão são
recusas, não alterações ocultas dos canais. Alvos fora do alcance são limitados
e reportados pelo solver, sem stretch. No-op mantém quaternions autorais crus.

Chaves ficam em WeakMap privado por frame. O consumidor recebe cópias; alterar
pose, status ou chaves retornadas não forja o commit. `cancel` revoga todos os
frames e entradas daquela captura. Commit exige documento atual explícito e
conteúdo COW equivalente; miniatura/save são conservados. Comando geral faz a
validação final e o editor registra um único undo. Sem autosave de prévia.

## Revisão e evidência

12 testes focais/2 arquivos, zero falhas, 902 expectativas, 559 ms. Incluem 108
combinações de direções/magnitudes (1e-150 a 1e150), 48 rigs sob pais afins,
pai animado, local/local-delta, canais TRS/curvas existentes, escala negativa,
alcance interno/externo, skin com IBM/pesos preservados, igualdade exata com
playback confirmado, cancelamento/undo, propriedade, locks e orçamento.
Guardas provam ausência de leitura de geometria/imagens/chaves nas amostras.
Teste de pureza percorre dependências sem React/Three/stores no domínio.

Expectativas corrigidas durante desenvolvimento: histórico reconstrói arrays
(igualdade de conteúdo, não identidade); reescalamento de direções altera ULPs
(sem impor quaternion identidade a entradas diferentes); `bindSceneSkin` retorna
um vínculo, não documento; alvo inicialmente dentro da zona inacessível do modo
local foi substituído por um ponto alcançável. Nenhuma tolerância de produção foi
afrouxada para fazer esses testes passarem.

Integral: **1.582 testes, zero falhas, 234 arquivos, 87,99 s**. Tipos, Biome/700
e Vite/1,03 s passaram. Kids: compilação/5,7 s, tipos/8,8 s, 59 páginas/626 ms,
exit 0. Diff check passou. Aviso do chunk Three permanece.

## Limites

Ainda não é um controle disponível na oficina. Faltam integração da sessão/UI,
limites de juntas, poses espelhadas de rig e bake. A aceitação de transformações
é condicionada à representação somente por rotações; nem todo rig afim pode
atingir qualquer alvo. Sem medição de latência em hardware/GPU nem homologação
de toque/crianças. Código próprio; nenhuma implementação Blockbench incorporada.
