# Integração da staging e revisão da fronteira — 21/11/2026

Pais: entrega Pinta `dffe8608329d0b1038ec2e05f97fd82cb0132699` e staging remota
`f5b1ceca8e542580f6285bcd0a95ae1310c600af`. Ancestral comum:
`33cd419d8592fc2d2ba19c32e82d7912f932a8ef`. Integração na branch isolada;
não é merge da feature em staging nem publicação de serviço.

## Revisão

A origem traz 222 arquivos alterados, com trabalhos do Estúdio, Molda, operações
e documentação. O único conflito foi a redação de uma exceção em
`testing/contracts/contracts.test.ts`; foi escolhido o texto remoto, mantendo o
mesmo guarda de abertura. O índice dos conteúdos recebidos e sua igualdade com
a origem está em `index.json`. O Pinta autoral conserva o código verificado no
commit anterior. Os diretórios 3D conferidos não recebem adaptações locais.

A revisão funcional desta integração se concentra na fronteira Pinta–Estúdio,
execução 2D e empacotamento. Não declara nova homologação funcional da missão
Molda, do funil ou das demais áreas que chegaram do remoto.

O runtime compartilhado passou a consultar IDs pelo mesmo ajudante, pedir imagens
ao preparar o cenário e recortar objetos fora da tela. O recorte conserva uma
envoltória pelo comprimento da diagonal, considerando offset/parallax; conjuntos
e objetos dentro deles ficam fora desse descarte, preservando filhos transformados
que alcançam o viewport. Objetos lógicos continuam disponíveis nas consultas.
Foram conferidos bootstrap, contratos congelados, máscaras de colisão, versão
anterior do leitor, atualização de arte e conservação de programação.

A compactação recebida conserva linhas ambíguas de comentários; os controles de
AST e limites de runtime fazem parte da regressão. Medição desta árvore, em
caracteres: Jogo 2D 368.067 sem cenário / 394.538 com cenário; Avançado 409.977 /
436.444. Fragmentos: 26.471 / 26.467. Os tetos existentes são conservados.
Os tempos de compilação presentes no recibo não constituem um benchmark de
latência ou comparação de desempenho: houve outros verificadores em paralelo.

## Validação desta árvore

- Pinta completo: **2.641 aprovados, zero falhas e zero omissões**, 34.581
  asserções, 237 arquivos, 172,10 s. Os três controles antes opcionais de Pygame
  foram executados com superfícies reais, incluindo geometria e namespaces.
- Fronteiras e runtimes: **184 aprovados**, 7.952 asserções, 21 arquivos. Inclui
  contratos de versões, importação/atualização, dois motores 2D, composição do
  bootstrap, compactação e limites de payload.
- Navegador local Pinta–Estúdio: **12 percursos**, sem retry. Inclui jogar mapa,
  leitores anteriores, Python/mundo, portas, atualização de peças, programação
  preservada e falha transacional no segundo `put`.
- Phaser portátil real: **dez percursos**, desktop/toque emulado, sem retry:
  plataformas, contornos, portas, animação e renderização/movimentação do mapa.
- Tipos completos do Pinta/Estúdio e lint dos 13 arquivos de fronteira revisados
  aprovados. O diff da integração não tem erro de whitespace.

Ambiente Python conferido: 3.12.10, Pygame-ce 2.5.8, SDL 2.32.10, vídeo `dummy`.
É regressão real de superfícies em software, sem alegação de janela gráfica ou
aparelho físico adicional. Phaser usa a versão 3.90.0 incluída no pacote. Os
percursos do Estúdio são locais; não são publicação autenticada ou rollout.
Tiled e Godot não foram reexecutados nesta integração.

O documento público permanece nativo 7, cena 3/PNG 4, físico local 2 e nuvem 6.
Regiões 8 continuam internas. Estas provas não ativam seus novos contratos,
não concluem autorregras/projeções e não substituem o ciclo final dos dez passos
da Vila e Floresta/PyDew Valley. Recibos compactados, hashes e escopo em `index.json`.
