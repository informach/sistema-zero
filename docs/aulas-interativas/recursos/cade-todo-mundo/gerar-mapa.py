"""Folha opcional de uma página para a criança retomar o jogo em casa.

Uso: python docs/aulas-interativas/recursos/cade-todo-mundo/gerar-mapa.py
Saída: output/pdf/cade-todo-mundo-mapa-do-jogo.pdf
"""

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = ROOT / "output" / "pdf" / "cade-todo-mundo-mapa-do-jogo.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

FONT_DIR = Path("C:/Windows/Fonts")
if (FONT_DIR / "arial.ttf").exists():
    pdfmetrics.registerFont(TTFont("MapaRegular", str(FONT_DIR / "arial.ttf")))
    pdfmetrics.registerFont(TTFont("MapaBold", str(FONT_DIR / "arialbd.ttf")))
    REGULAR, BOLD = "MapaRegular", "MapaBold"
else:
    REGULAR, BOLD = "Helvetica", "Helvetica-Bold"

W, H = A4
ink = HexColor("#173844")
muted = HexColor("#51716F")
mint = HexColor("#E9F7E7")
blue = HexColor("#DFF5FB")
yellow = HexColor("#FFF3CB")
purple = HexColor("#F0E8FB")
pink = HexColor("#FCE8EF")

c = canvas.Canvas(str(OUTPUT), pagesize=A4)
c.setTitle("Cadê Todo Mundo? - Mapa do jogo")
c.setAuthor("Sistema Zero")

c.setFillColor(blue)
c.roundRect(36, H - 162, W - 72, 126, 22, fill=1, stroke=0)
c.setFillColor(ink)
c.setFont(BOLD, 25)
c.drawString(58, H - 85, "Cadê Todo Mundo?")
c.setFont(REGULAR, 12)
c.drawString(58, H - 111, "Seu mapa para criar o primeiro jogo")
c.setFillColor(muted)
c.setFont(REGULAR, 10)
c.drawString(58, H - 138, "Guarde para consultar quando continuar em casa.")

steps = [
    ("1", "Veja o jardim", "Há três personagens escondidos. Qual deles você vai achar primeiro?", mint),
    ("2", "Experimente o toque", "Toque no esconderijo. Ligue a reação e toque de novo. Compare.", yellow),
    ("3", "Faça alguém aparecer", "No evento do toque, deixe o esconderijo escolhido com 0% de visibilidade.", purple),
    ("4", "Teste seu jogo", "Toque em um esconderijo no jogo. Alguém apareceu? Teste os outros.", pink),
    ("5", "Continue em casa", "Na próxima aula, faça cada achado somar 1 ao contador.", mint),
]

top = H - 195
card_h = 83
gap = 12
for index, (number, title, description, fill) in enumerate(steps):
    y = top - index * (card_h + gap) - card_h
    c.setFillColor(fill)
    c.roundRect(36, y, W - 72, card_h, 16, fill=1, stroke=0)
    c.setFillColor(ink)
    c.circle(70, y + 42, 21, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont(BOLD, 17)
    c.drawCentredString(70, y + 36, number)
    c.setFillColor(ink)
    c.setFont(BOLD, 14)
    c.drawString(103, y + 52, title)
    c.setFont(REGULAR, 10)
    c.drawString(103, y + 29, description)

c.setFillColor(muted)
c.setFont(REGULAR, 9)
c.drawCentredString(W / 2, 35, "A folha ajuda a lembrar. Os vídeos mostram todos os passos.")
c.showPage()
c.save()
print(OUTPUT)
