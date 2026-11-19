# Etapa 5 — autoria profissional e modelos

Continuação isolada sobre a integração `89553b719` do Estúdio. Não altera Molda,
motores 3D ou o estilo do Pinta. [Guia e decisões](../../level-design.md).

## Defeito corrigido

Guardar um modelo girado usava largura/altura sem transformação. A reprodução
pela oficina encontrou a caixa 16 pixels fora do conjunto: [red](modelo-red.txt).
O mesmo teste passou após extrair a operação pura com o recorte inteiro:
[green](modelo-green.txt). A origem não muda e salvar um modelo não acrescenta
uma edição ao histórico do mapa.

Giros livres, espelhos, polilinha, propriedades/autorreferência, offsets de
grupo/camada, base neutra, exclusão de vizinhos, recursos guardados e animação
têm regressões. Modelo maior que o teto é recusado sem corte. A versão privada
chega à cena sem depender da arte original. [31 testes, 312 asserções](nucleo.txt).

## Fluxos reais de navegador nesta máquina

[Seis aprovados](autoria.json), sem skip, retry ou instabilidade, em build de
produção com Chromium: desktop, toque Pixel 7 emulado e CPU 4×.

1. Inserir arte, girar/espelhar, configurar propriedade inteira, guardar modelo,
   colocar instância vinculada, conferir geometria e propriedades no backup,
   desfazer/refazer e reabrir com os mesmos dados.
2. Desenhar caminho e polígono ponto a ponto, marcar colisão, início e porta,
   escrever destino, criar grupo, configurar opacidade, offset fracionário,
   parallax e propriedade de camada. Reabrir sem perda e executar o conversor
   de cena e consultas comuns sobre o documento criado pela UI.

Capturas: [modelo](modelo-reutilizado-desktop.png) e
[autoria](autoria-profissional-desktop.png); as versões de toque e CPU estão
ao lado. [Log](navegador.txt). O backup fecha somente as dependências usadas:
o teste coloca a instância antes de procurar a definição nesse arquivo.

A regressão completa de cenários/Phaser passou em **38 casos**, desktop e toque:
autoria de 32 camadas, Vila, terrenos, biblioteca, pincel de objetos, contornos,
plataformas, animação/versões, clipboard, reabertura, movimento e portas do pacote
Phaser real. [Resultado](cenarios.json), [log](cenarios-e-phaser.txt). Essa execução
precede apenas a extensão do teste com propriedade de camada, revalidada nos seis
casos acima; não houve mudança de comportamento do produto entre elas.

## Demais gates e seus limites

- Suíte Pinta: **2.160 aprovados, zero falhas, 26.600 asserções em 187 arquivos**,
  [log](suite-pinta.txt), com Python/Pygame habilitado.
- Após ampliar a prova da base neutra, os 31 casos direcionados passaram de novo.
- As duas regressões condicionais de Pygame foram executadas com o intérprete
  real: **6 aprovados, 5.092 asserções**, [log](adaptadores-pygame.txt). A primeira
  rodada sem a variável PYTHON havia omitido dois casos; ela não é a prova final.
- Typecheck Pinta final e Estúdio após a integração: exit 0. Uma anotação do teste
  de base foi corrigida com narrowing da camada; não foi removida a verificação.
- Rotas/contrato da casca integrados do remoto: **8 aprovados, 24 asserções**;
  isso não equivale à homologação da execução dessa casca no Firefox.

Toque e CPU são simulações, sem aparelhos físicos adicionais nem crianças.
Consultas sobre o documento e execução do pacote Phaser não substituem o ciclo
autenticado no Estúdio. O rollout A e o CI completo permanecem em andamento.
Tiled e Godot não foram executados novamente neste lote; pertencem à etapa 7.
