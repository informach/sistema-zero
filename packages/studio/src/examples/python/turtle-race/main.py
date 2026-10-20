"""Original, asset-free Turtle game. Target: Python 3.14 and Python Pro."""

import turtle

from model import LANE_NAMES, TICK_MS, TurtleRace
from timer_loop import SingleTimerLoop
from view import HEIGHT, WIDTH, RaceView


class RaceGame:
    def __init__(self, seed: int | None = None):
        self.model = TurtleRace(seed)
        self.closed = False
        self.dirty = True
        self.screen = turtle.Screen()
        self.screen.setup(WIDTH, HEIGHT)
        self.screen.title("Corrida das Tartarugas — Sistema Zero")
        self.screen.bgcolor("#0b1220")
        self.screen.tracer(0, 0)
        self.view = RaceView(self.screen)
        self.loop = SingleTimerLoop(self.screen.ontimer, self._tick, TICK_MS)
        self.screen.onkey(self.start, "space")
        for key in ("p", "P"):
            self.screen.onkey(self.pause, key)
        for key in ("r", "R"):
            self.screen.onkey(self.reset, key)
        self.screen.onkey(self.close, "Escape")
        for lane in range(len(LANE_NAMES)):
            self.screen.onkey(lambda selected=lane: self.choose(selected), str(lane + 1))
        self.screen.onclick(self.click)
        self.screen.listen()

    def choose(self, lane: int) -> None:
        if not self.closed:
            self.dirty = self.model.choose(lane) or self.dirty

    def start(self) -> None:
        if self.closed:
            return
        if self.model.phase == "paused":
            self.model.toggle_pause()
        else:
            self.model.start()
        self.dirty = True

    def pause(self) -> None:
        if not self.closed:
            self.dirty = self.model.toggle_pause() or self.dirty

    def reset(self) -> None:
        if not self.closed:
            self.model.reset()
            self.dirty = True

    def click(self, x: float, y: float) -> None:
        action = self.view.hit(x, y)
        if type(action) is int:
            self.choose(action)
        elif action == "start":
            self.start()
        elif action == "pause":
            self.pause()
        elif action == "reset":
            self.reset()

    def _tick(self) -> None:
        if self.closed:
            return
        changed = self.model.advance()
        if changed or self.dirty:
            self.view.render(self.model.snapshot())
            self.dirty = False
            try:
                self.screen.update()
            except turtle.Terminator:
                self.closed = True
                self.loop.stop()

    def close(self) -> None:
        if self.closed:
            return
        self.closed = True
        self.loop.stop()
        self.screen.bye()

    def run(self) -> None:
        self.loop.start()
        self.screen.mainloop()


def main(seed: int | None = None) -> None:
    RaceGame(seed).run()


if __name__ == "__main__":
    main()
