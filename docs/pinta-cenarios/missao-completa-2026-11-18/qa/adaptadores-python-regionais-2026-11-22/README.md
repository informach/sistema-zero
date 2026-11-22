# Adaptadores Python regionais — 22/11/2026

O núcleo e os adaptadores continuam privados. Há composição e consultas comuns
para os três destinos; pygame-ce e Pygame Zero reutilizam o backend Surface, e
Raylib 2D nativo usa texturas/UVs. A fachada pygame-ce recebe/devolve FRect sem
mover os corpos do programa. Abrir uma porta seleciona outro mapa do registro;
o programa continua responsável por decidir quando atravessar.

Os recursos são decodificados antes de trocar a cena. Uma falha gráfica tardia
preserva o mundo e o quadro anteriores. Os lugares compartilham recursos e
relógio; descarte é explícito/context manager. Raylib exige a thread e o contexto
da janela original. Não existe Surface proporcional ao mundo de 10.000².

## Revisão e correções

- Reproduzida a perda de apoio do FRect em plataforma de y=100.000,004. A fachada
  informa a tolerância relativa de float32 já usada pelo adaptador publicado;
  o núcleo conserva seu padrão de precisão dupla. Dois PNGs reais, gravidade
  normal/invertida e 40 quadros consecutivos comprovam o apoio após arredondar.
- A consulta de objetos devolve o iterador do núcleo. Uma cena admitida com
  mais de 26 milhões de filhos potenciais encontra a primeira porta expandindo
  um único candidato. O contador envolve a transformação real, com corte de
  segurança para que a regressão não esgote memória na versão anterior.
- O SAT das peças usa a mesma margem interna da consulta de contornos do Core.
  Elipses subnormais deixam de lançar divisão por zero/overflow; casos comparados
  ao Core, com reprodução anterior arquivada. O gerador atualiza essa pequena
  correção numérica também no módulo pygame entregue. Os demais formatos não mudam.
- A prova de portas Wasm exige pixels específicos da Cabana e a volta aos pixels
  estáveis da Vila; contagem de cores e logs isolados não bastam.

## Evidências locais

- 20 testes nativos focados, 2.046 asserções, quatro arquivos, 8,28 s, sem
  omissões/falhas. Incluem pygame-ce 2.5.8, Pygame Zero 1.2.1 e pyray 6.0.1.0
  reais, geometrias/consultas, RGBA, IDAT inválido e ciclo de recursos.
- Quatro ensaios Chrome/Chromium, escalas 1×/2×, 13,5 s, sem retry/omissão/falha.
  Python 3.14.2/Pyodide 314.0.7 e pygame-ce 2.5.7 em Emscripten executam o código
  comum de verdade. Conferem animação, 18 camadas, largura lógica 160.000/320.000,
  40 quadros de plataforma fracionária e Vila → Cabana → Vila com pixels.
- O código privado é composto no fonte do projeto de prova. A distribuição
  imutável `5667348a2784bba2fd46d6ac146d2ef8db7629cd853d394212c032a0227f30ab`
  fornece o worker/Pyodide/pygame existentes; não anuncia esses novos módulos.
  Bun 1.4.3 usado só pelo servidor QA isolado na porta 5569.
- Typecheck Pinta aprovado. O Studio completo registrou dois erros de globais
  no teste JavaScript regional; foram corrigidos no lote `34d9c0a8d`, e a nova
  rodada completa pertence à integração seguinte. Não declarar Studio completo
  aprovado por esse recibo nem substituir isso pelo ensaio de navegador.
- Biome dos 12 fontes verificados e gerador Python aprovados. A regressão
  completa Pinta 2.804 pertence à base `d266d82f2`, anterior a estes adaptadores.

Os recibos incluem as falhas anteriores de float32/elipse, os controles positivos,
tipos, lint e o relatório Chromium. O índice registra hashes de fontes e recibos.
Não houve teste em outro aparelho físico ou com crianças.

## Pendências explícitas

Os backends de navegador Pygame Zero/Raylib 2D têm lote próprio em revisão; estas
provas nativas não os homologam. A poda de instâncias de conjuntos fora da tela,
os gates completos da integração, o runtime combinado, catálogos/recibos, os
fluxos públicos, a promoção segura dos formatos e o ciclo final permanecem abertos.
Nativo 7/físico 2/cena 3/PNG 4/nuvem 6 públicos preservados. Sem mudança visual,
alteração funcional 3D, implantação ou merge em staging.
