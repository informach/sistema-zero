# Cenários (imagens de fundo)

Coloque aqui as imagens de fundo das cenas, em PNG na resolução do vídeo (1280×720):

- `cenario-a.png` — abertura e fecho (avatar grande).
- `cenario-b.png` — meio da aula (teoria e prática).

Cada `roteiro.yaml` escolhe os nomes em `meta.cenarioAbertura` / `meta.cenarioMeio`.
Se a imagem não existir, a montagem usa um gradiente de cortesia (não quebra).

Os PNGs não são versionados por padrão? São — só as SAÍDAS (`aulas/**/out/`) ficam
fora do git. Cenários são de entrada; commite se quiser reuso entre máquinas.
