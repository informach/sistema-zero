# Chuva de Meteoros

Meteoros girando caem do céu: pilote a nave, atire com o laser e veja quantos segundos você aguenta.

Um exemplo original feito com [raylib](https://www.raylib.com/) em Python (o pacote
`raylib`, com os módulos `pyray` e `raylib`): o programa inteiro está em `main.py` e é
o mesmo nas versões de Blocos e de Código da galeria.

## Como jogar

As setas pilotam a nave e o espaço atira. Um meteoro que encostar na nave acaba o voo; Enter voa de novo e o recorde fica guardado.

## Ideias para mudar

- Mude TEMPO_ENTRE_METEOROS para chover mais ou menos meteoros.
- Faça o laser mais rápido em VELOCIDADE_LASER.
- Desenhe a sua nave no Pinta e troque `images/nave.png`.

## Imagens, sons e fontes

O raylib abre cada arquivo pelo caminho, com a extensão: `load_texture('images/nave.png')`
abre `images/nave.png` (a barra `/` funciona também no Windows). As imagens ficam em `images/`, os sons em
`sounds/`, as músicas em `music/` e as fontes em `fonts/`. Para trocar um desenho,
edite-o no Pinta pelo Estúdio, ou traga outro e use no código o caminho que o painel mostra
em "nome no código".

## Jogar no computador

```
python -m pip install raylib==6.0.1.0
python main.py
```
