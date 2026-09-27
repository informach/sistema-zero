# Hierarquia nativa glTF, lote 154

## Conversão delimitada

`convertGltfHierarchy` materializa nós nativos de uma seleção da mesma fonte
imutável. As geometrias são fornecidas por variante e o material padrão é o
fallback do nó; faces convertidas mantêm suas referências próprias. Não converte
materiais, vínculos/pesos ou clipes, nem aprova perdas ou grava documento completo.

IDs determinísticos por índice fonte. Mapas separados para alvos TRS/juntas e
instâncias de malha. Uma junta que também carrega mesh vira grupo com o transform
original e filho de forma com identidade. Filhos autorados continuam no grupo,
nunca no novo filho de forma. Pré-contar expansão dentro dos 512 nós antes de
copiar transforms. Somente juntas de skins selecionadas exigem essa separação.

TRS e matrizes são copiados exatamente, sem snap, decomposição, normalização ou
cópia de posições. Matriz local glTF válida pode ter eixo nulo e deve continuar
válida como nó; isso não promete que uma skin com mundo singular será aceita na
etapa de binding. Orçamento de desenho e finitude do mundo pertencem também ao
documento final; não confundir hierarquia convertida com aceite integral.

Câmera sem representação nativa gera ocorrência por nó, conservando seu apoio
transformado, sem mudar a câmera da oficina. Nomes ausentes/vazios recebem nome
de edição e aviso; nomes maiores que 128 unidades UTF-16 são encurtados com aviso,
sem quebrar par substituto. Não trim, normalização Unicode ou deduplicação de
nomes autorados. Separação estrutural também é relatada. JSON fonte fica intacto.

## Review e evidência de comportamento

- Grupos, raízes/filhos em ordem, nomes duplicados, escala negativa/zero, matriz
  autorada e ownership de arrays. Leitor nativo aceita os grupos materializados.
- Limite exato de 512 após expansão e excesso com getter de transform sentinela;
  IDs de geometria completos/únicos e ID do material padrão conferidos.
- Fixture GLB real tem duas juntas com formas rígidas, pele com transformação
  própria e acessório rígido filho. Exportador Molda não produziria esse caso
  porque o seu contrato já separa grupos e malhas; fixture própria exercita a
  fronteira externa e é validada por Khronos.
- Três warnings esperados, todos explícitos: animação em nó com skin, nó com
  skin não raiz e transform local da pele. Primeiro teste omitia o warning de
  animação; corrigida a expectativa, preservado o validador e seus warnings.
- Hierarquia/posições em cinco tempos fora de ordem confrontadas com Three e
  AnimationMixer reais. Mapeamento de canais TRS alcança grupo, não forma filha.
  Binding manual apenas da fixture exerce o contrato nativo já existente e prova
  que o mundo da malha é cancelado antes da deformação; não anuncia conversor de
  pesos em produção. Acessório rígido mantém transform local do pai.
- Recursos Three/mixer descartados. Nenhum mock de decoder/renderer ou alteração
  de protótipo. Criação nativa de teste recebeu nome exigido; referência do alvo
  capturada antes de callback para preservar narrowing de TypeScript, sem cast.

Segundo a [especificação glTF, hierarquia de juntas](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins),
apenas transforms das juntas afetam a pele; o transform do nó da malha não pode
ser aplicado novamente. O domínio Molda calcula inverse(meshWorld) × jointWorld ×
IBM em espaço da malha e a renderização aplica meshWorld, cancelando esse fator
quando invertível. Não apagar o transform autorado: seus filhos rígidos dependem dele.

Focais: 258 testes, zero falhas, 25 arquivos, 25.721 asserts, 6,24 s. Biome/803
passou. Tipos passaram. Integral: 1.883 testes, zero falhas, 264 arquivos,
8.221.712 asserts, 106,00 s. Vite passou em 945 ms. Kids: compilação 5,4 s,
tipos 23,0 s, 59 páginas em 524 ms. Diff check passou.
Sem dependências novas, ativação pública ou homologação visual/GPU/toque.
