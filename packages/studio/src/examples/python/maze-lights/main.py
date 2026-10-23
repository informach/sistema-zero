"""Labirinto das Luzes: partida, teclas, pontos, vidas e encerramento.

Use as setas para recolher luzes e escapar dos drones.
Leia README.md para jogar e experimentar mudanças.
Código derivado de Pac-Man in Python, TheWannabeCoder (2025), MIT.
Créditos e alterações: NOTICE.md. Licença completa: LICENSE.
"""
import random
import turtle
import sz_audio

from actors import Player, Enemy
from constants import CELL_SIZE, ENEMY_NUMBER, SCREEN_HEIGHT, SCREEN_WIDTH
from renderer import Wall, Pellet, PowerPellet, UiPen, register_editorial_shapes

VERSION = "maze-lights-editorial-0.1.1"


class LabyrinthGame:
    """Uma cadeia de atualização; os timers pertencem a esta partida."""

    def __init__(self, seed=None):
        if seed is not None:
            random.seed(seed)  # Diagnóstico explícito, nunca altera o default.
        self.closed = False
        self.phase = "starting"
        self._generation = 0
        self._tick_pending = False
        self._callback_errors = []
        self._close_attempted = False
        self.screen = turtle.Screen()
        self.screen.tracer(0)
        self.screen.title("Labirinto das Luzes — Setas para mover · Esc para sair")
        self.screen.setup(SCREEN_WIDTH + 10, SCREEN_HEIGHT + 10)
        self.screen.bgcolor("#07111f")
        register_editorial_shapes(self.screen)
        self.wall_pen = Wall()
        self.pellet_pen = Pellet()
        self.power_pen = PowerPellet()
        self.ui_pen = UiPen()
        self.score_pen = UiPen()
        self.lives_pen = UiPen()
        self.wall_pen.draw()
        self.pellet_pen.draw()
        self.power_pen.draw()
        self.ui_pen.draw_ui_area()
        self.start = random.choice(self.pellet_pen.pellets)
        self.player = Player(self.wall_pen.walls)
        self.player.goto(self.start)
        self.enemies = []
        shapes = ("light-hex", "light-diamond", "light-star")
        colors = ("#a78bfa", "#fb7185", "#34d399")
        for _ in range(ENEMY_NUMBER):
            safe = [position for position in self.pellet_pen.pellets
                    if self.player.distance(position) > CELL_SIZE * 5]
            if not safe:
                raise RuntimeError("Não há posição inicial segura para os drones.")
            x, y = random.choice(safe)
            enemy = Enemy(x, y, self.wall_pen.walls, self.player)
            style = random.randrange(len(shapes))
            enemy.shape(shapes[style])
            enemy.color("#e2e8f0", colors[style])
            self.enemies.append(enemy)
        self.screen.listen()
        self.screen.onkey(self._guard(self.close), "Escape")

    def _guard(self, callback):
        """Tk reporta erros de callbacks fora da pilha de mainloop()."""
        def protected(*args, **kwargs):
            if self.closed:
                return
            try:
                callback(*args, **kwargs)
            except BaseException as primary:
                self._callback_errors.append(primary)
                try:
                    self.close()
                except BaseException as cleanup:
                    self._callback_errors.append(cleanup)
                # Não relançar aqui: Tk só imprimiria o erro. run() o reapresenta.

        return protected

    def _later(self, callback, delay):
        generation = self._generation

        def current_callback():
            if not self.closed and generation == self._generation:
                self._guard(callback)()

        self.screen.ontimer(current_callback, delay)

    def _enable_controls(self):
        if self.phase != "starting":
            return
        self.phase = "running"
        for key, action in (("Right", self.player.turn_right),
                            ("Left", self.player.turn_left),
                            ("Up", self.player.turn_up),
                            ("Down", self.player.turn_down)):
            self.screen.onkeypress(self._guard(lambda turn=action: self._turn(turn)), key)
        for enemy in self.enemies:
            enemy.start_move()

    def _turn(self, action):
        if not self.closed and self.phase == "running":
            action()

    def _collect(self):
        for position, stamp in list(self.pellet_pen.stamps.items()):
            if self.player.distance(position) < CELL_SIZE / 2:
                self.pellet_pen.clearstamp(stamp)
                del self.pellet_pen.stamps[position]
                if position != self.start:
                    self.player.score += 2
                    sz_audio.play("collect.wav")
        for position, stamp in list(self.power_pen.stamps.items()):
            if self.player.distance(position) < CELL_SIZE / 2:
                self.power_pen.clearstamp(stamp)
                del self.power_pen.stamps[position]
                self.player.score += 50
                sz_audio.play("collect.wav")
                self.player.move_speed += 3
                # Preserva a semântica da referência, inclusive boosts sobrepostos.
                self._later(self.player.reset_speed, 3000)

    def _hud(self):
        self.score_pen.write_score(self.player.score, self.player.lives,
                                   self.pellet_pen.stamps, self.power_pen.stamps)
        self.lives_pen.write_lives(self.player.lives,
                                   self.pellet_pen.stamps, self.power_pen.stamps)

    def _finish(self, won):
        if self.phase == "finished":
            return
        self.phase = "finished"
        self._generation += 1  # Cancela callbacks pendentes desta partida ativa.
        self.player.state = "stop"
        if not won:
            self.player.hideturtle()
        for enemy in self.enemies:
            enemy.state = "stop"
            if won:
                enemy.hideturtle()
        self._hud()
        self.screen.update()
        self._later(self.close, 3000)  # Um único fechamento, não um por frame.

    def _schedule_tick(self):
        if not self._tick_pending and not self.closed and self.phase != "finished":
            self._tick_pending = True
            self._later(self._tick, 1000 // 60)

    def _tick(self):
        self._tick_pending = False
        if self.closed or self.phase == "finished":
            return
        self._collect()
        self.player.move()
        self.player.check_wall_collision()
        for enemy in self.enemies:
            enemy.move()
            enemy.check_wall_collision()
            enemy.go_after_player()
            if enemy.distance(self.player) < CELL_SIZE / 2:
                sz_audio.play("collision.wav")
                safe = [position for position in self.pellet_pen.pellets
                        if all(other.distance(position) > CELL_SIZE * 5
                               for other in self.enemies)]
                if not safe:
                    raise RuntimeError("Não há posição segura para continuar a partida.")
                self.player.goto(random.choice(safe))
                self.player.lives -= 1
        if not self.pellet_pen.stamps and not self.power_pen.stamps:
            self._finish(won=True)
        elif self.player.lives <= 0:
            self._finish(won=False)
        else:
            self._hud()
            self.screen.update()
            self._schedule_tick()

    def _dispose(self):
        if self.closed:
            return
        self.closed = True
        self._generation += 1
        self._tick_pending = False
        sz_audio.stop()

    def close(self):
        if self.closed or self._close_attempted:
            return
        self._close_attempted = True
        failures = []
        try:
            self._dispose()
        except BaseException as error:
            failures.append(error)
        try:
            self.screen.bye()
        except BaseException as error:
            failures.append(error)
            # Failsafe nativo: bye pode falhar antes de destruir a janela.
            # Canvas browser não precisa nem recebe uma API Tk inventada.
            try:
                top_level = getattr(self.screen.getcanvas(), "winfo_toplevel", None)
                if callable(top_level):
                    top_level().quit()
            except BaseException as fallback:
                failures.append(fallback)
        if failures:
            raise BaseExceptionGroup("Falha ao fechar a partida", failures)

    def run(self):
        failures = []
        try:
            sz_audio.play("opening.wav")
            self._later(self._enable_controls, 2500)
            self._tick()
            self.screen.mainloop()
        except BaseException as error:
            failures.append(error)
        failures.extend(self._callback_errors)
        try:
            if failures:
                self.close()
            else:
                self._dispose()  # A janela nativa pode ter sido fechada pelo usuário.
        except BaseException as cleanup:
            failures.append(cleanup)
        if len(failures) == 1:
            raise failures[0]
        if failures:
            raise BaseExceptionGroup("Execução e fechamento falharam", failures)


def main(seed=None):
    LabyrinthGame(seed=seed).run()


if __name__ == "__main__":
    main()
