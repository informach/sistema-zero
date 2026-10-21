"""Instrumented QA observer of the pinned portable game; not a product module.

Not distributed. Real Turtle, media and author methods remain in use.
State injection is declared per scenario; it is never a full-game/performance oracle.
"""
import json
import random
import time
import main as game

CONFIG = {"scenario": "observe", "seed": 2026}
random.seed(CONFIG["seed"])
_tick = 0
_timers = {}
_original_loop = game.game_loop
_original_init = game.init_screen


def emit(event, value):
    print("__SZ_PACMAN_QA__" + json.dumps({"event": event, "scenario": CONFIG["scenario"],
        "tick": _tick, "clock": time.monotonic(), "value": value}, separators=(",", ":")))


def observed_screen():
    screen = _original_init()
    real_timer = screen.ontimer
    real_onkeypress = screen.onkeypress
    real_bye = screen.bye

    def bye():
        emit("natural-close", {"timersScheduled": dict(_timers)})
        return real_bye()

    screen.bye = bye

    def timer(callback, delay=0):
        key = str(delay)
        _timers[key] = _timers.get(key, 0) + 1
        if delay == 3000:
            scheduled = time.monotonic()
            name = getattr(callback, "__name__", type(callback).__name__)
            emit("timer-scheduled", {"delay": delay, "callback": name, "scheduledClock": scheduled})

            def observed_callback():
                emit("timer-fired", {"delay": delay, "callback": name,
                     "scheduledClock": scheduled, "elapsedSeconds": time.monotonic() - scheduled})
                return callback()

            return real_timer(observed_callback, delay)
        return real_timer(callback, delay)

    screen.ontimer = timer

    def onkeypress(callback, key=None):
        if callback is None:
            return real_onkeypress(None, key)

        def pressed(*args):
            callback(*args)
            player = getattr(callback, "__self__", None)
            emit("key", {"key": key, "heading": player.heading(),
                "state": player.state, "position": list(player.position())})

        return real_onkeypress(pressed, key)

    screen.onkeypress = onkeypress
    return screen


def snapshot(args):
    screen, player, score, lives, pellets, power, sx, sy, enemies = args
    return {"player": {"position": list(player.position()), "heading": player.heading(),
        "state": player.state, "shape": player.shape(), "speed": player.move_speed,
        "score": player.score, "lives": player.lives, "visible": player.isvisible()},
        "start": [sx, sy], "pellets": len(pellets.stamps), "power": len(power.stamps),
        "enemies": [{"position": list(e.position()), "heading": e.heading(),
            "state": e.state, "shape": e.shape(), "visible": e.isvisible()} for e in enemies],
        "timersScheduled": dict(_timers)}


def inject(args):
    screen, player, score, lives, pellets, power, sx, sy, enemies = args
    case = CONFIG["scenario"]
    if case == "observe":
        return
    # The author starts enemies after 2500ms; all these near-start fixtures run first.
    if any(enemy.state != "stop" for enemy in enemies):
        raise RuntimeError("QA precondition: scenario must precede enemy movement")
    if case in ("pellet", "power"):
        pen = pellets if case == "pellet" else power
        candidates = [p for p in pen.stamps if p != (sx, sy)
            and all(enemy.distance(p) > game.CELL_SIZE * 2 for enemy in enemies)]
        if not candidates:
            raise RuntimeError("QA precondition: no isolated collectable for this seed")
        position = sorted(candidates)[0]
        emit("injection", {"operation": "player.goto", "position": list(position),
            "stampId": pen.stamps[position], "before": snapshot(args)})
        player.goto(position)
    elif case in ("death", "defeat-near-end"):
        if case == "defeat-near-end":
            emit("injection", {"operation": "set lives", "from": player.lives, "to": 1})
            player.lives = 1
        emit("injection", {"operation": "enemy.goto player", "enemyIndex": 0})
        enemies[0].goto(player.position())
    elif case == "victory-near-end":
        candidates = [position for position in pellets.stamps
            if position != (sx, sy)
            and all(enemy.distance(position) >= game.CELL_SIZE * 2 for enemy in enemies)]
        if not candidates:
            raise RuntimeError("QA precondition: final pellet must be isolated")
        remaining = sorted(candidates)[0]
        # Clear actual authored stamps, not fake pixels or a replacement collector.
        for pen, keep in ((pellets, remaining), (power, None)):
            for position, stamp in list(pen.stamps.items()):
                if position != keep:
                    pen.clearstamp(stamp)
                    del pen.stamps[position]
        for enemy in enemies:
            if enemy.distance(remaining) < game.CELL_SIZE * 2:
                raise RuntimeError("QA precondition: final pellet must be isolated")
        emit("injection", {"operation": "near-end collectables", "remaining": list(remaining)})
        player.goto(remaining)


def observed_loop(*args):
    global _tick
    if _tick in (0, 1, 2, 3, 10, 156, 188, 200, 250):
        emit("before", snapshot(args))
    if _tick == 1:
        inject(args)
    # Delegate to the SAME game loop, including real drawing/audio/timers/collision.
    _original_loop(*args)
    if _tick in (0, 1, 2, 3, 10, 156, 188, 200, 250):
        emit("after", snapshot(args))
    _tick += 1


game.init_screen = observed_screen
game.game_loop = observed_loop
emit("configuration", CONFIG)
game.main()
