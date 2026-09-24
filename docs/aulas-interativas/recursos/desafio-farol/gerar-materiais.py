"""Gera os dois apoios opcionais de A Chave do Farol (A4, uma página cada)."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = ROOT / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)

FONT_DIR = Path("C:/Windows/Fonts")
pdfmetrics.registerFont(TTFont("ArialFarol", str(FONT_DIR / "arial.ttf")))
pdfmetrics.registerFont(TTFont("ArialFarolBold", str(FONT_DIR / "arialbd.ttf")))

PAPER_W, PAPER_H = A4
INK = colors.HexColor("#243b49")
NAVY = colors.HexColor("#234760")
SEA = colors.HexColor("#d9eef2")
CREAM = colors.HexColor("#fff8e9")
GOLD = colors.HexColor("#f2c766")
GREEN = colors.HexColor("#dfeeda")
CORAL = colors.HexColor("#f6c9b7")


def paragraph(canvas: Canvas, text: str, x: float, top: float, width: float,
              size: int = 11, leading: int = 15, bold: bool = False,
              color=INK, align=TA_LEFT) -> float:
    style = ParagraphStyle(
        "farol", fontName="ArialFarolBold" if bold else "ArialFarol",
        fontSize=size, leading=leading, textColor=color, alignment=align,
    )
    item = Paragraph(text, style)
    _, height = item.wrap(width, PAPER_H)
    item.drawOn(canvas, x, top - height)
    return height


def header(canvas: Canvas, kicker: str, title: str, subtitle: str) -> None:
    canvas.setFillColor(SEA)
    canvas.rect(0, PAPER_H - 166, PAPER_W, 166, stroke=0, fill=1)
    canvas.setFillColor(NAVY)
    canvas.roundRect(38, PAPER_H - 49, 194, 24, 10, stroke=0, fill=1)
    canvas.setFont("ArialFarolBold", 10)
    canvas.setFillColor(colors.white)
    canvas.drawCentredString(135, PAPER_H - 41, kicker.upper())
    paragraph(canvas, title, 38, PAPER_H - 63, 438, 24, 28, True, NAVY)
    paragraph(canvas, subtitle, 38, PAPER_H - 102, 435, 11, 16)
    # Farol vetorial simples: a mesma cor da aventura, sem depender de uma imagem remota.
    canvas.setFillColor(GOLD)
    canvas.wedge(481, PAPER_H - 109, 590, PAPER_H - 26, 150, 60, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#f7eee2"))
    canvas.roundRect(514, PAPER_H - 143, 45, 76, 5, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#dc6963"))
    canvas.rect(514, PAPER_H - 105, 45, 12, stroke=0, fill=1)
    canvas.setFillColor(GOLD)
    canvas.rect(520, PAPER_H - 75, 33, 18, stroke=0, fill=1)
    canvas.setFillColor(NAVY)
    canvas.roundRect(531, PAPER_H - 143, 12, 25, 3, stroke=0, fill=1)


def footer(canvas: Canvas, page: str) -> None:
    canvas.setStrokeColor(colors.HexColor("#c9d9db"))
    canvas.line(38, 42, PAPER_W - 38, 42)
    canvas.setFont("ArialFarol", 9)
    canvas.setFillColor(NAVY)
    canvas.drawString(38, 27, "Sistema Zero  |  A Chave do Farol")
    canvas.drawRightString(PAPER_W - 38, 27, page)


def card(canvas: Canvas, y: float, height: float, number: str, title: str,
         description: str, question: str, fill) -> None:
    canvas.setFillColor(fill)
    canvas.roundRect(38, y, PAPER_W - 76, height, 14, stroke=0, fill=1)
    canvas.setFillColor(NAVY)
    canvas.circle(68, y + height - 30, 17, stroke=0, fill=1)
    canvas.setFont("ArialFarolBold", 13)
    canvas.setFillColor(colors.white)
    canvas.drawCentredString(68, y + height - 35, number)
    paragraph(canvas, title, 97, y + height - 17, 420, 15, 19, True, NAVY)
    paragraph(canvas, description, 57, y + height - 58, 475, 11, 15)
    paragraph(canvas, question, 57, y + 44, 475, 10, 14, True)


def caderno() -> None:
    path = OUTPUT / "desafio-farol-caderno.pdf"
    canvas = Canvas(str(path), pagesize=A4)
    header(canvas, "Caderno da criança", "Meu mapa da aventura",
           "Três dias para ajudar um barco a encontrar o farol. Use esta folha quando quiser lembrar o caminho.")
    paragraph(canvas, "Meu nome: _________________________________________", 44, PAPER_H - 182, 480, 11, 16, True)
    card(canvas, 486, 122, "1", "Faço o personagem andar",
         "Coloco quatro direções na tela, faço o personagem se mover e observo o que acontece na borda.",
         "Meu teste: toquei nas setas e experimentei chegar à beirada.", GREEN)
    card(canvas, 348, 122, "2", "Encontro a chave",
         "Faço o encontro com a chave ter uma ação e guardo a resposta na variável temChave.",
         "Meu teste: a chave saiu do chão uma vez só?", CREAM)
    card(canvas, 210, 122, "3", "Acendo o farol",
         "Faço a porta perguntar se o personagem está com a chave. A luz acesa orienta o barco.",
         "Meu teste: tentei a porta sem chave e depois com a chave?", CORAL)
    paragraph(canvas, "Se eu travar", 44, 195, 210, 12, 16, True, NAVY)
    paragraph(canvas, "Posso pausar o vídeo, rever um trecho ou usar Preciso de ajuda na aula. Não preciso acertar tudo de primeira.",
              44, 174, 493, 10, 14)
    footer(canvas, "Caderno opcional")
    canvas.save()


def mapa_familia() -> None:
    path = OUTPUT / "desafio-farol-mapa-responsaveis.pdf"
    canvas = Canvas(str(path), pagesize=A4)
    header(canvas, "Para a família", "A aventura em três dias",
           "Um mapa breve para acompanhar a primeira experiência de programação da criança.")
    y = PAPER_H - 181
    y -= paragraph(canvas,
        "<b>O que ela vai criar.</b> Um personagem percorre um mapa, encontra uma chave e acende o farol para um barco chegar. O cenário, os desenhos e a animação do barco vêm preparados. A criança programa as regras que ligam esses momentos.",
        42, y, 510, 11, 16) + 18
    for number, title, text, fill in [
        ("Dia 1", "Movimento", "Quatro direções por toque ou teclado; depois, uma regra para não sair da tela.", GREEN),
        ("Dia 2", "Chave", "O encontro retira a chave e muda uma informação guardada pelo jogo.", CREAM),
        ("Dia 3", "Decisão", "A porta confere a chave; com ela, a luz acende e o barco chega.", CORAL),
    ]:
        canvas.setFillColor(fill)
        canvas.roundRect(42, y - 73, 510, 67, 11, stroke=0, fill=1)
        paragraph(canvas, f"{number} - {title}", 57, y - 15, 460, 13, 18, True, NAVY)
        paragraph(canvas, text, 57, y - 36, 460, 10, 14)
        y -= 83
    y -= 5
    y -= paragraph(canvas, "Como ajudar sem fazer no lugar dela", 42, y, 500, 13, 18, True, NAVY) + 7
    y -= paragraph(canvas,
        "Peça que mostre o que esperava acontecer e o que aconteceu no jogo. Se algo não funcionar, convide-a a rever o vídeo da seção e conferir os nomes dos blocos. Ela pode usar <b>Preciso de ajuda</b> para contar onde travou. O caderno da criança é opcional; não precisa imprimir para completar a aula.",
        42, y, 510, 11, 16) + 17
    y -= paragraph(canvas,
        "<b>Onde ela trabalha:</b> no Estúdio que aparece dentro da aula, só com a extensão Jogo 2D e blocos básicos. Não precisa abrir o Pinta nem o Estúdio completo. O projeto pode ser retomado no dia seguinte. Antes de seguir, vale conferir a indicação <b>Salvo</b> e usar <b>Enviar para o professor</b> quando a seção pedir.",
        42, y, 510, 11, 16) + 15
    paragraph(canvas,
        "No fim, ela recebe um certificado. A apresentação de outros cursos é uma conversa separada com o responsável; compra não é condição para concluir o Desafio.",
        42, y, 510, 10, 15)
    footer(canvas, "Mapa opcional")
    canvas.save()


if __name__ == "__main__":
    caderno()
    mapa_familia()
    print(OUTPUT / "desafio-farol-caderno.pdf")
    print(OUTPUT / "desafio-farol-mapa-responsaveis.pdf")
