# Seleção de cena glTF e dependências, lote 153

## Contrato

`selectGltfDocument` recebe a fonte validada imutável e um índice explícito.
Reusa `selectGltfScene`: null só representa biblioteca sem cenas; default não
é escolhido pelo coordenador. Mantém a ordem autorada de raízes/filhos e nenhum
canal de animação pode puxar um nó de outra cena para dentro da seleção.

Preflight de 512 nós e 128 instâncias precede acesso a malhas, pixels ou animação.
Uma malha instanciada várias vezes conta várias partes, mas variantes iniciais
iguais compartilham geometria. Chave local por índice de mesh e pesos finitos
com round-trip textual, distinguindo -0; não soldar meshes distintas ou confundir
forma-base compartilhada com vínculo de skin/morph animado por instância.

Dependências são índices originais únicos em ordem crescente: malhas, materiais,
texturas, samplers, imagens, skins, câmeras, accessors, views e buffers. Incluir
todos os atributos/morphs/índices, IBM, cinco mapas core e armazenamento sparse.
Intensidade zero não autoriza apagar mapas autorados. Textura sem source tem
lista explícita; sampler ausente não ganha default inventado. Conferir juntas
e skeleton dentro da seleção, sem buscar apoio em outra cena.

Cada canal fica exatamente em uma categoria: selecionado, fora da cena ou não
resolvido. Preservar todos os clipes e índices, inclusive clipes sem canal
selecionado. Alvo com nó desconhecido ao core mas fora da cena é fora da cena;
alvo sem nó continua não resolvido mesmo em cena vazia. Accessors de animação
só entram pelos samplers dos canais selecionados. Não executar alvos pendentes.

Extensões opcionais globais continuam explícitas: escopo não compreendido não
permite descartá-las por heurística. JSON e ocorrências permanecem na fonte.
Sem copiar dados numéricos/bytes, decodificar rasters, executar IO ou escolher
câmera ativa. Resultado tem metadados próprios, não referências a arrays de nós,
pesos, dependências ou canais da fonte.

## Review

- Não substitui a validação do arquivo inteiro nem evita recursos faltantes do
  leitor anterior. Limita trabalho posterior, não altera obrigações de leitura.
- Não é documento nativo, aceite de perdas ou orçamento completo de conversão.
  Expansão de nós, materiais, pixels, triângulos por instância e bake de animação
  ainda precisam de preflight na montagem correspondente.
- O cache de variantes existe só durante uma seleção. Uma nova chamada observa
  uma nova fonte; sem singleton, cache global ou arrays nativos retidos.
- Índices e tabelas vêm de leitores já validados; seletor não repete todos os
  parsers nem oferece entrada de JSON cru. Pureza cobre o novo entrypoint.
- Fixtures iniciais de morph tinham POSITION sem min/max. O leitor recusou
  corretamente; corrigidos os limites das fixtures, sem mudar validação.
- Testes reais percorrem exportação → leitura → seleção → conversão de geometria
  e pixels. IK/poses local/local-delta e espelhos preservam três skins para uma
  forma compartilhada. Não há mock de leitor/conversor ou promessa visual.
- Getters sentinela provam ausência de leitura de valores, buffers e imagens;
  limites exatos e excedentes, ownership, matriz de dependências e partição de
  canais são verificados diretamente. Não são métodos exclusivos para teste
  adicionados à produção.

## Evidência

Focais: 252 testes, zero falhas, 24 arquivos, 25.179 asserts, 6,45 s. Tipos e
Biome/799 passaram. Integral: 1.877 testes, zero falhas, 263 arquivos, 8.221.175
asserts, 103,04 s. Vite: 1,24 s. Kids: compilação 6,1 s, tipos 8,5 s, 59 páginas
em 398 ms. Diff check passou. Sem novas dependências, ativação pública ou mudança
no formato 1. Headless não homologa GPU/toque; aviso de chunk Three permanece.
