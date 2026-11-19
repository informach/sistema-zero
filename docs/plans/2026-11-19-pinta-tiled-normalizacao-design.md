# Preservar o documento após normalização do Tiled

A exportação nativa do Tiled 1.12.2 transformou o JSON da Vila em TMX e mudou
a folha de 28 para 32 peças, completando a última linha da imagem. Também
omitiu entradas Wang cujos oito valores são zero. A cena voltou sem avisos,
mas diferente da original. A comparação integral deve continuar obrigatória.

## Decisões

- Reservar o espaço físico completo de cada atlas ao calcular `firstgid`,
  incluindo os atlas de sprites. Assim as células vazias da última linha
  não se sobrepõem ao próximo conjunto, inclusive em outros consumidores.
- Guardar `pinta:atlas`, versão 1, nas propriedades da folha parcial:
  contagem autoral, colunas, tamanho da peça e SHA-256 da data URL original.
  Reutilizar o hash assíncrono do core. O exportador Tiled passa a ser
  assíncrono; o empacotador já oferece uma fronteira assíncrona.
- A importação primeiro lê o espaço físico completo. Só restaura a contagem
  autoral quando imagem e geometria continuam iguais e nenhuma célula,
  arte de objeto, definição de conjunto, animação, propriedade/colisão de
  peça ou regra de terreno utiliza o preenchimento adicional.
- Uma imagem alterada ou uma peça adicional utilizada conserva a contagem
  física. Não recortar edições feitas no Tiled para encaixá-las no snapshot.
- Guardar os índices das regras inteiramente zero em `pinta:emptyTiles`,
  dentro de cada Wang set. Restaurar somente índices ausentes: uma regra
  não nula criada no Tiled tem prioridade.
- Validar versão, índices e tamanho desses metadados antes de usá-los.
  Os dados nativos do Pinta e sua versão permanecem os mesmos. Não há
  mudança de interface, paleta, desenho ou comportamento de jogos publicados.

## Aceite e testes

Fixture pequena gerada pelo Tiled real, com atlas parcial, duas folhas e
regra zero. Arquivar entrada, PNGs, TMX/JSON de saída, versão e hashes.
O teste deve falhar no adaptador anterior e comparar a cena inteira após a
correção. Cobrir mudança da imagem, novas referências ao preenchimento,
regras editadas, metadados inválidos e preservação dos formatos anteriores.

Repetir JSON → TMX e TMX → JSON reais para Vila/Cabana, recursos versionados,
contornos e arte. Validar pacotes Phaser, Pygame e Godot sem substituir as
asserções por uma comparação parcial. Rodar tipos e a suíte do Pinta, rever
orçamentos e registrar as provas antes do commit funcional.
