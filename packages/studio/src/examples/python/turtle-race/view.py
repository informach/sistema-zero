"""All artwork uses ordinary Turtle geometry and the built-in turtle shape."""

import turtle

from model import LANE_COLORS, LANE_NAMES, TRACK_LENGTH, RaceFrame

WIDTH = 900
HEIGHT = 600
START_X = -300
FINISH_X = 300
LANE_Y = (145, 60, -25, -110)


def pen(color: str = "#e2e8f0") -> turtle.Turtle:
    result = turtle.Turtle()
    result.hideturtle()
    result.speed(0)
    result.penup()
    result.color(color)
    return result


def text(writer: turtle.Turtle, x: float, y: float, value: str, size: int = 14) -> None:
    writer.goto(x, y)
    writer.write(value, align="center", font=("Arial", size, "bold"))


def rectangle(writer: turtle.Turtle, x: float, y: float, width: float, height: float, color: str) -> None:
    writer.goto(x, y)
    writer.setheading(0)
    writer.color(color)
    writer.pendown()
    writer.begin_fill()
    for length in (width, height, width, height):
        writer.forward(length)
        writer.left(90)
    writer.end_fill()
    writer.penup()


class RaceView:
    def __init__(self, screen):
        self.screen = screen
        self.background = pen()
        self.status = pen()
        self.selection = pen()
        self.score = pen()
        self.clock = pen()
        self._hud = None
        self._positions = None
        self._draw_track()
        self.racers = []
        for lane, color in enumerate(LANE_COLORS):
            racer = turtle.Turtle(shape="turtle")
            racer.penup()
            racer.speed(0)
            racer.color("#0f172a", color)
            racer.shapesize(1.5, 1.5, 2)
            racer.setheading(0)
            racer.goto(START_X, LANE_Y[lane])
            self.racers.append(racer)

    def _draw_track(self) -> None:
        text(self.background, 0, 252, "CORRIDA DAS TARTARUGAS", 24)
        text(self.background, 0, 219, "Escolha uma cor. Torça, pause e corra outra vez!", 13)
        for lane, y in enumerate(LANE_Y):
            rectangle(self.background, -350, y - 31, 705, 62, "#172033")
            self.background.color(LANE_COLORS[lane])
            text(self.background, -391, y - 7, f"{lane + 1}", 19)
        for row in range(33):
            for column in range(2):
                rectangle(
                    self.background, FINISH_X + column * 10, -145 + row * 10,
                    10, 10, "#f8fafc" if (row + column) % 2 else "#334155",
                )
        text(self.background, FINISH_X + 10, 191, "CHEGADA", 11)
        for x, label in ((-240, "COMEÇAR"), (0, "PAUSAR / RETOMAR"), (240, "REINICIAR")):
            rectangle(self.background, x - 105, -251, 210, 42, "#334155")
            self.background.color("#f8fafc")
            text(self.background, x, -238, label, 12)
        self.background.color("#94a3b8")
        text(self.background, 0, -284, "1–4: escolher · Espaço: começar · P: pausa · R: reiniciar · Esc: sair", 11)

    @staticmethod
    def hit(x: float, y: float):
        if -251 <= y <= -209:
            for center, action in ((-240, "start"), (0, "pause"), (240, "reset")):
                if abs(x - center) <= 105:
                    return action
        if -430 <= x <= FINISH_X + 30:
            for lane, center in enumerate(LANE_Y):
                if abs(y - center) <= 31:
                    return lane
        return None

    def render(self, frame: RaceFrame) -> None:
        if frame.positions != self._positions:
            for lane, position in enumerate(frame.positions):
                x = START_X + (FINISH_X - START_X) * position / TRACK_LENGTH
                self.racers[lane].goto(x, LANE_Y[lane])
            self._positions = frame.positions
        hud = (
            frame.phase, frame.selected, frame.winner,
            (frame.countdown_ms + 999) // 1000, frame.elapsed_ms // 100,
            frame.rounds, frame.points,
        )
        if hud == self._hud:
            return
        self._hud = hud
        for writer in (self.status, self.selection, self.score, self.clock):
            writer.clear()
        if frame.phase == "ready":
            message = "Escolha a favorita e clique em COMEÇAR"
        elif frame.phase == "countdown":
            message = f"Prepare-se: {(frame.countdown_ms + 999) // 1000}"
        elif frame.phase == "running":
            message = "Valendo! Cada tartaruga tem a mesma chance."
        elif frame.phase == "paused":
            message = "PAUSADO — P ou PAUSAR / RETOMAR para continuar"
        else:
            if frame.winner is None:
                raise RuntimeError("The finished race has no winner.")
            result = "Você acertou!" if frame.winner == frame.selected else "Tente outra cor na próxima!"
            message = f"{LANE_NAMES[frame.winner]} venceu. {result}"
        text(self.status, 0, -181, message, 15)
        self.selection.color(LANE_COLORS[frame.selected])
        text(self.selection, -222, 185, f"Favorita: {LANE_NAMES[frame.selected]}", 13)
        text(self.score, 148, 185, f"Corridas: {frame.rounds}  ·  Acertos: {frame.points}", 13)
        text(self.clock, 0, -204, f"Tempo de corrida: {frame.elapsed_ms / 1000:.1f} s", 11)
