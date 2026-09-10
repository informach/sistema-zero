# Recorte de transparência — lote 223

Recorte do plano já aprovado, fases 5/8. Implementação interna; público/cloud v1
inalterados. Motivação: glTF MASK é recusado atualmente por não existir no domínio.
Folhas e cercas precisam de partes vazadas sem ordenação de transparência suave.

## Decisão

Campo opcional `SceneMaterial.alphaMask: { cutoff: number; opacity: number }`.
Cutoff finito ≥0, sem teto 1 (glTF aceita >1); opacity finita entre 0 e 1. Ausência
mantém a inferência atual de transparência pelo composto. Presença testa o alfa do
composto vezes opacity contra cutoff, escreve profundidade somente nos fragmentos
que passam, e não usa blending. Não altera os pixels autorais ao ajustar o recorte.

Alternativas rejeitadas: transformar MASK em BLEND muda o desenho/profundidade;
converter alpha para 0/255 perde o limite editável; assar o fator alpha em bytes
antes do teste pode trocar o resultado perto do limite por arredondamento. O fator
fica explícito no material e é aplicado depois da composição. Base continua sendo
fundo da pintura, não um multiplicador duplicado.

## Integração sequencial

1. Leitor fechado e comando patch com remoção explícita por null, ownership,
   identidade em no-op, undo e armazenamento/codec existentes.
2. Material Three com alphaTest/cutoff, opacity multiplicada, transparent false e
   depthWrite true. Remover restaura o comportamento antigo, incluindo mudanças de
   pixels e flipbooks. Setter nativo de alphaTest invalida programa ao cruzar zero.
3. GLB exporta MASK/cutoff e fator alpha separado. Importação preserva alpha RGBA8
   da textura sem assar o fator; RGB continua a conversão já relatada. Sem textura,
   base recebe o alpha original e alphaMask.opacity=1. Testar limite 0, >1, fator 0
   e casos próximos do limite; hashes antigos de materiais sem MASK não mudam.
4. Controles contextuais em Acabamento: explicação curta sobre espaços entre folhas,
   limite e força exatos, aplicar/remover com um undo. Respeitar bloqueio de material,
   tokens/alvos existentes; sem exibir termos de arquivo na tarefa infantil.
5. Leitura→worker→adoção→armazenamento→GLB, validator independente/GLTFLoader,
   tipos/Biome/integral/builds e review. Visual/GPU ainda depende de navegador real.

## Review: cor invisível e atlas

O compositor source-over antigo zera RGB quando alfa composto é zero. Em MASK com
cutoff zero essa cor passa a ser visível. Política explícita e restrita aos usos
MASK: preservar o RGB da última camada RGBA participante quando o alfa final é zero;
sem camada RGBA, usar RGB da base. Camadas invisíveis/opacidade zero não participam;
índice zero permanece vazio, não uma camada preta. Composição antiga sem MASK não muda.

O raster/cache distingue essa política, incluindo patches, flipbooks, GLB e atlas.
Atlas transporta a política pelo protocolo fechado do worker e mantém cutoff/opacity
por material, sem assar o recorte ou o fator na imagem. As restrições já existentes
de atlas misto opaco/transparente e mapas detalhados continuam explícitas.

## Fontes conferidas antes de implementar

- [glTF 2.0, alpha coverage](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#alpha-coverage):
  critério ≥cutoff; alpha é linear e multiplicado pelo fator, não premultiplicado.
- Octocode leu `KhronosGroup/glTF`, `specification/2.0/schema/material.schema.json`,
  main: cutoff mínimo 0, sem máximo, só permitido quando alphaMode está declarado.
  O guard atual de alphaCutoff NÃO é bug e deve permanecer.
- Context7 resolveu `/mrdoob/three.js` e consultou alphaTest/opacity. Three instalado
  0.184.0: GLTFLoader usa opacity do fator, transparent=false para MASK; shader
  descarta alpha < cutoff antes de forçar a saída opaca. Sem código externo copiado.
