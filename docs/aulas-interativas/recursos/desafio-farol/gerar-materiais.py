"""Gera o caderno único de consulta que acompanha as aulas de A Chave do Farol."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
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
pdfmetrics.registerFontFamily("ArialFarol", normal="ArialFarol", bold="ArialFarolBold")

PAPER_W, PAPER_H = A4
INK = colors.HexColor("#243b49")
NAVY = colors.HexColor("#234760")
SEA = colors.HexColor("#d9eef2")
CREAM = colors.HexColor("#fff8e9")
GOLD = colors.HexColor("#f2c766")
GREEN = colors.HexColor("#dfeeda")
CORAL = colors.HexColor("#f6c9b7")
MARGIN = 42
WIDTH = PAPER_W - MARGIN * 2


def paragraph(canvas, text, x, top, width, size=11, leading=16,
              bold=False, color=INK):
    style = ParagraphStyle(
        "farol", fontName="ArialFarolBold" if bold else "ArialFarol",
        fontSize=size, leading=leading, textColor=color, alignment=TA_LEFT,
    )
    item = Paragraph(text, style)
    _, height = item.wrap(width, PAPER_H)
    if top - height < 58:
        raise ValueError(f"Texto ultrapassa a área útil: {text[:80]}")
    item.drawOn(canvas, x, top - height)
    return height


def header(canvas, kicker, title, subtitle):
    canvas.setFillColor(SEA)
    canvas.rect(0, PAPER_H - 166, PAPER_W, 166, stroke=0, fill=1)
    canvas.setFillColor(NAVY)
    canvas.roundRect(38, PAPER_H - 49, 240, 24, 10, stroke=0, fill=1)
    canvas.setFont("ArialFarolBold", 10)
    canvas.setFillColor(colors.white)
    canvas.drawCentredString(158, PAPER_H - 41, kicker.upper())
    paragraph(canvas, title, 38, PAPER_H - 63, 455, 23, 27, True, NAVY)
    paragraph(canvas, subtitle, 38, PAPER_H - 108, 445, 11, 16)
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


def footer(canvas, page, total):
    canvas.setStrokeColor(colors.HexColor("#c9d9db"))
    canvas.line(38, 42, PAPER_W - 38, 42)
    canvas.setFont("ArialFarol", 9)
    canvas.setFillColor(NAVY)
    canvas.drawString(38, 27, "Sistema Zero  |  A Chave do Farol")
    canvas.drawRightString(PAPER_W - 38, 27, f"{page} / {total}")


class Page:
    def __init__(self, canvas, kicker, title, subtitle):
        self.canvas = canvas
        self.y = PAPER_H - 190
        header(canvas, kicker, title, subtitle)

    def text(self, text, size=11, gap=12):
        self.y -= paragraph(self.canvas, text, MARGIN, self.y, WIDTH, size, size + 5) + gap

    def step(self, title, text):
        self.y -= paragraph(self.canvas, title, MARGIN, self.y, WIDTH, 13, 18, True, NAVY) + 6
        self.text(text)

    def box(self, title, text, fill=CREAM):
        style = ParagraphStyle("measure", fontName="ArialFarol", fontSize=11, leading=16)
        _, body_height = Paragraph(text, style).wrap(WIDTH - 28, PAPER_H)
        height = body_height + 51
        bottom = self.y - height
        if bottom < 58:
            raise ValueError(f"Caixa ultrapassa a área útil: {title}")
        self.canvas.setFillColor(fill)
        self.canvas.roundRect(MARGIN, bottom, WIDTH, height, 12, stroke=0, fill=1)
        paragraph(self.canvas, title, MARGIN + 14, self.y - 12, WIDTH - 28, 12, 17, True, NAVY)
        paragraph(self.canvas, text, MARGIN + 14, self.y - 36, WIDTH - 28)
        self.y = bottom - 15

    def diagram(self, lines):
        # Esquema de leitura dos encaixes, não uma captura da interface.
        content = "<br/>".join(
            "&nbsp;" * (indent * 4) + label for indent, label in lines
        )
        self.box("Confira os encaixes", content, SEA)


def delivery(page, finish):
    page.box(
        "Confira antes de enviar",
        "Teste o jogo. Aperte <b>Verificar esta etapa</b>. Se aparecer uma pendência, "
        "corrija o bloco indicado e verifique novamente.<br/>"
        "Quando aparecer <b>Objetivo da etapa cumprido!</b>, espere <b>Salvo</b>. "
        "Aperte <b>Enviar para o professor</b> e confirme em <b>Enviar</b>. "
        f"Espere o envio terminar e aperte <b>{finish}</b>.",
        GREEN,
    )


def caderno():
    path = OUTPUT / "desafio-farol-caderno.pdf"
    canvas = Canvas(str(path), pagesize=A4, invariant=1)
    canvas.setTitle("Caderno do Aluno - A Chave do Farol")
    canvas.setAuthor("Sistema Zero")
    total = 10

    p = Page(canvas, "Caderno do Aluno", "A Chave do Farol",
             "Um barco precisa chegar à costa. Você vai programar as regras para a aventura acontecer.")
    p.text("O cenário, os desenhos e o movimento do barco já vêm preparados. "
           "Você faz o personagem andar, recolher a chave e decidir quando acender o farol.")
    p.box("Use quando precisar",
          "Este caderno reúne os caminhos dos blocos, os encaixes e os testes. "
          "Você pode ler na aula, baixar ou imprimir. Não precisa preencher nada para concluir.", CREAM)
    p.step("Encontre seu passo",
           "<b>Dia 1:</b> movimento e bordas, páginas 2 e 3.<br/>"
           "<b>Dia 2:</b> coleta e memória da chave, páginas 4 e 5.<br/>"
           "<b>Dia 3:</b> experiência e decisão, páginas 6 e 7; testes, página 8.<br/>"
           "<b>Seu jogo no Mural:</b> página 9.<br/>"
           "<b>Certificado e ajuda:</b> página 10.")
    p.box("Antes de montar",
          "Na introdução, jogue a versão pronta. Use as setas da tela ou, no computador, "
          "clique no jogo e use as setas do teclado. Experimente antes de seguir. "
          "Você não precisa vencer a partida para continuar.", SEA)
    footer(canvas, 1, total)
    canvas.showPage()

    p = Page(canvas, "Dia 1 · Montagem", "O personagem começa a andar",
             "Nesta versão, o mapa está pronto, mas o personagem ainda está parado.")
    p.step("1. Mostre as quatro setas",
           "<b>Jogo 2D &gt; Controles &gt; Teclado, ações e toque.</b><br/>"
           "Pegue <b>Ativar controles clássicos</b>. Encaixe no fim de <b>Ao iniciar</b>, "
           "depois dos blocos preparados. Escolha <b>só as quatro direções</b>.")
    p.step("2. Programe o movimento",
           "<b>Jogo 2D &gt; Movimento &gt; Movimentos prontos.</b><br/>"
           "Pegue <b>Mover sprite em 4 direções com setas</b>. Em <b>Enquanto estiver rodando</b>, "
           "encaixe dentro de <b>A cada quadro</b>, logo depois de <b>Desenhar o cenário cenario</b>. "
           "Escolha o sprite <b>personagem</b>. A velocidade já vem em <b>3</b>; deixe assim.")
    p.box("Duas palavras que aparecem aqui",
          "<b>Sprite:</b> um elemento do jogo que podemos controlar, como o personagem.<br/>"
          "<b>Velocidade:</b> quanto ele anda a cada repetição. O movimento fica dentro de "
          "A cada quadro para ser repetido enquanto o jogo funciona.", SEA)
    p.step("Teste",
           "Segure uma seta da tela. No computador, pode clicar no jogo e usar o teclado. "
           "Vá até uma beirada e observe se o personagem fica inteiro na tela. "
           "Se não andar, confira o nome personagem e o encaixe dentro de A cada quadro.")
    footer(canvas, 2, total)
    canvas.showPage()

    p = Page(canvas, "Dia 1 · Teste e entrega", "Até a borda do mapa",
             "O personagem anda. Agora ele precisa continuar visível quando chega ao limite.")
    p.step("3. Limite o caminho",
           "<b>Jogo 2D &gt; Movimento &gt; Bordas e rebatidas.</b><br/>"
           "Pegue <b>Manter o sprite dentro da tela</b>. Encaixe logo depois do bloco "
           "de movimento, dentro de <b>A cada quadro</b>. Escolha <b>personagem</b>.")
    p.diagram([
        (0, "Enquanto estiver rodando"),
        (1, "A cada quadro"),
        (2, "Limpar a tela [preparado]"),
        (2, "Desenhar o cenário cenario [preparado]"),
        (2, "<b>Mover personagem em 4 direções, velocidade 3</b>"),
        (2, "<b>Manter personagem dentro da tela</b>"),
        (2, "Outros blocos preparados"),
    ])
    p.text("Teste cima, baixo, esquerda e direita até os limites. O personagem deve continuar "
           "visível. A ordem é importante: mover primeiro, conferir a borda depois.")
    delivery(p, "Concluir aula")
    footer(canvas, 3, total)
    canvas.showPage()

    p = Page(canvas, "Dia 2 · Montagem", "A chave precisa ser lembrada",
             "Seu personagem já anda. Agora o encontro com a chave precisa mudar o jogo.")
    p.step("1. Crie a informação temChave",
           "<b>Programação &gt; Variáveis.</b> Pegue <b>Criar variável com valor</b> e "
           "encaixe no fim de <b>Ao iniciar</b>, depois de Ativar controles clássicos. "
           "Nome: <b>temChave</b>, tudo junto, com C maiúsculo.<br/>"
           "Em <b>Programação &gt; Lógica &amp; Se</b>, pegue <b>Verdadeiro ou falso</b>. "
           "Substitua o valor inicial por esse bloco e escolha <b>falso</b>.")
    p.text("Uma <b>variável</b> guarda uma informação que pode mudar. No começo da partida, "
           "temChave é falso porque o personagem ainda não pegou a chave.")
    p.step("2. Programe o encontro",
           "<b>Jogo 2D &gt; Colisões &gt; Encostar e bloquear.</b><br/>"
           "Pegue <b>Quando o sprite começar a encostar no sprite</b> e encaixe em "
           "<b>Quando acontecer</b>. Escolha <b>personagem</b> primeiro e <b>chave</b> depois. "
           "Este evento vai executar as ações colocadas dentro dele.")
    p.step("3. Retire a chave do chão",
           "<b>Jogo 2D &gt; Sprites &gt; Criar e trocar aparência.</b><br/>"
           "Pegue <b>Destruir o sprite</b>, encaixe dentro do encontro e escolha <b>chave</b>. "
           "Isso retira a chave da partida. Não apaga a imagem do projeto.")
    footer(canvas, 4, total)
    canvas.showPage()

    p = Page(canvas, "Dia 2 · Teste e entrega", "O jogo guarda a coleta",
             "Retirar a chave não basta: o jogo precisa lembrar que ela foi encontrada.")
    p.step("4. Guarde verdadeiro",
           "<b>Programação &gt; Variáveis.</b> Pegue <b>Alterar variável para</b>. "
           "Encaixe abaixo de Destruir o sprite, dentro do encontro, e escolha <b>temChave</b>. "
           "Em <b>Programação &gt; Lógica &amp; Se</b>, pegue <b>Verdadeiro ou falso</b>, "
           "encaixe no valor e mantenha <b>verdadeiro</b>, como veio no bloco.")
    p.step("5. Mostre a mensagem",
           "Em <b>Programação &gt; Variáveis</b>, pegue outro <b>Alterar variável para</b>. "
           "Encaixe abaixo e escolha <b>aviso</b>. Em <b>Programação &gt; Valores</b>, "
           "pegue <b>texto</b>, encaixe no valor e escreva:<br/>"
           "<b>Você pegou a chave! Agora vá ao farol.</b>")
    p.step("Teste a coleta",
           "Pegue a chave, confira se ela sumiu e se a mensagem mudou. Passe pelo mesmo "
           "lugar outra vez. Aperte <b>Atualizar</b> para recomeçar: a chave deve voltar. "
           "Se não sumiu, confira os nomes do encontro e Destruir o sprite chave dentro dele. "
           "Se a mensagem não mudou, confira aviso e seu texto.")
    delivery(p, "Concluir aula")
    footer(canvas, 5, total)
    canvas.showPage()

    p = Page(canvas, "Dia 3 · Experiência e montagem", "O que a porta precisa?",
             "A coleta está pronta, mas a porta ainda não responde quando você chega ao farol.")
    p.box("Experimente antes de programar",
          "Uma <b>condição</b> é uma pergunta que o jogo confere. Na experiência da aula, "
          "aperte <b>Testar a porta</b> sem a chave. Depois aperte <b>Levar a chave</b> e "
          "<b>Testar a porta</b> outra vez. Compare as respostas e siga em <b>Próxima seção</b>.", SEA)
    p.step("1. Crie outro encontro",
           "<b>Jogo 2D &gt; Colisões &gt; Encostar e bloquear.</b> Pegue "
           "<b>Quando o sprite começar a encostar no sprite</b>. Encaixe em <b>Quando acontecer</b>, "
           "abaixo do evento da chave, sem colocar um evento dentro do outro. "
           "Escolha <b>personagem</b> e <b>farol</b>.")
    p.step("2. Faça a pergunta",
           "<b>Programação &gt; Lógica &amp; Se.</b> Pegue <b>Se</b> e encaixe dentro "
           "do evento do farol. Em <b>Programação &gt; Valores</b>, pegue <b>valor da variável</b>, "
           "encaixe na pergunta do Se e escolha <b>temChave</b>.")
    p.step("3. Prepare a resposta sem chave",
           "No bloco Se, aperte <b>+ senão</b>, não + senão se. Em <b>Programação &gt; Variáveis</b>, "
           "pegue <b>Alterar variável para</b> e encaixe em <b>senão</b>. Escolha <b>aviso</b>. "
           "Em <b>Programação &gt; Valores</b>, pegue <b>texto</b> e encaixe no valor. Escreva:<br/>"
           "<b>A porta não abriu. Falta a chave.</b>")
    footer(canvas, 6, total)
    canvas.showPage()

    p = Page(canvas, "Dia 3 · Montagem", "Quando a chave está com você",
             "O ramo então guarda as ações para quando temChave for verdadeiro.")
    p.step("4. Ligue a chegada do barco",
           "<b>Programação &gt; Variáveis.</b> Pegue <b>Alterar variável para</b>, encaixe "
           "no começo de <b>então</b> e escolha <b>ganhou</b>. Em <b>Programação &gt; Lógica &amp; Se</b>, "
           "pegue <b>Verdadeiro ou falso</b>, encaixe no valor e mantenha <b>verdadeiro</b>, como veio. "
           "Essa informação liga o movimento do barco que já veio preparado.")
    p.step("5. Acenda o farol",
           "<b>Jogo 2D &gt; Sprites &gt; Criar e trocar aparência.</b> Pegue "
           "<b>Trocar imagem do sprite para</b> e encaixe abaixo, ainda em <b>então</b>. "
           "Escolha o sprite <b>farol</b> e a imagem <b>farol-aceso</b>.")
    p.step("6. Conte o que aconteceu",
           "Em <b>Programação &gt; Variáveis</b>, pegue outro <b>Alterar variável para</b>, "
           "encaixe abaixo da troca de imagem e escolha <b>aviso</b>. Em "
           "<b>Programação &gt; Valores</b>, pegue <b>texto</b> e encaixe no valor. Escreva:<br/>"
           "<b>Você acendeu o farol! Olhe o barco chegando.</b>")
    p.diagram([
        (0, "Encontro: personagem com farol"),
        (1, "Se temChave"),
        (2, "<b>então:</b> ganhou verdadeiro, imagem acesa, aviso"),
        (2, "<b>senão:</b> aviso de que falta a chave"),
    ])
    footer(canvas, 7, total)
    canvas.showPage()

    p = Page(canvas, "Dia 3 · Teste e entrega", "Compare os dois caminhos",
             "A condição está montada. Confira se cada situação recebe a resposta certa.")
    p.box("Teste 1 · Sem a chave",
          "Aperte <b>Atualizar</b> para recomeçar. Vá direto ao farol, sem passar pela chave. "
          "A luz deve continuar apagada, e a mensagem deve dizer que falta a chave.", CREAM)
    p.box("Teste 2 · Com a chave",
          "Aperte <b>Atualizar</b> outra vez. Pegue a chave e vá ao farol. "
          "A luz deve acender, a mensagem deve mudar e o barco deve chegar.", GREEN)
    p.step("Se a resposta saiu diferente",
           "Acendeu sem chave? Confira se a troca de imagem está em <b>então</b> e se o Se "
           "consulta <b>temChave</b>.<br/>Não acendeu com chave? Confira a coleta, "
           "<b>temChave verdadeiro</b> e a imagem <b>farol-aceso</b>.<br/>"
           "O barco não veio? Confira <b>ganhou verdadeiro</b> em então.<br/>"
           "Corrija e repita os dois testes.")
    delivery(p, "Próxima seção")
    footer(canvas, 8, total)
    canvas.showPage()

    p = Page(canvas, "Dia 3 · Publicação", "Seu jogo no Mural",
             "Você enviou o jogo para o professor. Agora outras pessoas também podem jogar.")
    p.step("1. Abra Compartilhar",
           "Continue no mesmo Estúdio da aula. Aperte <b>Compartilhar</b>. "
           "O título e o resumo já estão preenchidos. Deixe como estão.")
    p.step("2. Prepare a capa",
           "Aperte <b>Gerar capa</b> e espere a imagem aparecer. Confira a imagem: "
           "ela vai apresentar seu jogo no Mural.")
    p.step("3. Publique e espere",
           "Aperte <b>Publicar</b>. Espere aparecer <b>Seu jogo está no Mural!</b>. "
           "Aperte <b>Fechar</b> e depois <b>Concluir aula</b>.")
    p.box("Quer copiar o link ou rever um passo?",
          "Na seção de publicação, abra o link <b>Como publicar seu jogo no Mural e copiar o link</b>. "
          "Ele leva ao Como Fazer, nossa área de ajuda. Você pode consultar o passo a passo "
          "e usar a opção de voltar para a aula.", SEA)
    p.box("Se Compartilhar não estiver disponível",
          "Confira se terminou o envio para o professor na seção anterior. "
          "Se continuar sem conseguir, use <b>Preciso de ajuda</b> na aula e conte o que aparece. "
          "O acesso para publicar também precisa estar ativo na conta.", CREAM)
    footer(canvas, 9, total)
    canvas.showPage()

    p = Page(canvas, "Sua conquista", "Guarde o que você criou",
             "Você programou movimento, coleta e uma decisão que faz a aventura acontecer.")
    p.box("Seu certificado",
          "Na aula do certificado, aperte <b>Pegar meu certificado</b>. "
          "Se já tiver emitido, use <b>Baixar certificado (PDF)</b>. "
          "Depois, aperte <b>Concluir aula</b>.", GREEN)
    p.step("Se travar em alguma atividade",
           "Volte ao trecho do vídeo que mostra aquele encaixe e compare com o seu projeto. "
           "Você também pode consultar a página correspondente deste caderno.")
    p.box("Preciso de ajuda",
          "No rodapé da seção da aula, use <b>Preciso de ajuda</b>. Conte o que tentou fazer "
          "e o que aconteceu. Por exemplo: <b>Estou no Dia 3. Peguei a chave, mas o farol "
          "continua apagado. Conferi o bloco temChave.</b><br/>"
          "Isso ajuda o professor a entender em que ponto você está.", SEA)
    p.step("Para guardar e para entregar",
           "<b>Salvo</b> indica que a mudança ficou guardada.<br/>"
           "<b>Verificar esta etapa</b> confere os blocos pedidos na atividade.<br/>"
           "<b>Enviar para o professor</b>, com a confirmação em <b>Enviar</b>, entrega seu trabalho.<br/>"
           "São passos diferentes. O caderno e o Como Fazer podem ser consultados quando precisar.")
    footer(canvas, 10, total)
    canvas.save()


if __name__ == "__main__":
    caderno()
    print(OUTPUT / "desafio-farol-caderno.pdf")
