"""Original race rules, independent of Turtle, clocks and the graphical host."""

from dataclasses import dataclass
from random import Random
from typing import Literal

TICK_MS = 50
COUNTDOWN_MS = 3000
TRACK_LENGTH = 600.0
LANE_NAMES = ("Laranja", "Verde", "Azul", "Rosa")
LANE_COLORS = ("#fb923c", "#4ade80", "#60a5fa", "#f472b6")
Phase = Literal["ready", "countdown", "running", "paused", "finished"]


@dataclass(frozen=True)
class RaceFrame:
    phase: Phase
    positions: tuple[float, ...]
    selected: int
    winner: int | None
    countdown_ms: int
    elapsed_ms: int
    rounds: int
    points: int


class TurtleRace:
    """Choosing a favourite does not influence the random movement of any lane."""

    def __init__(self, seed: int | None = None):
        self._random = Random(seed)
        self.selected = 0
        self.rounds = 0
        self.points = 0
        self.reset()

    def reset(self) -> None:
        """Prepare another race; retain the session's score and favourite."""
        self.phase: Phase = "ready"
        self.positions = [0.0] * len(LANE_NAMES)
        self.winner = None
        self.countdown_ms = COUNTDOWN_MS
        self.elapsed_ms = 0
        self._paused_phase: Literal["countdown", "running"] | None = None

    def choose(self, lane: int) -> bool:
        if type(lane) is not int or not 0 <= lane < len(LANE_NAMES):
            raise ValueError("Choose one of the four lanes.")
        if self.phase != "ready":
            return False
        self.selected = lane
        return True

    def start(self) -> bool:
        if self.phase != "ready":
            return False
        self.phase = "countdown"
        return True

    def toggle_pause(self) -> bool:
        if self.phase in ("countdown", "running"):
            self._paused_phase = self.phase
            self.phase = "paused"
            return True
        if self.phase == "paused":
            if self._paused_phase is None:
                raise RuntimeError("The paused race lost its previous phase.")
            self.phase = self._paused_phase
            self._paused_phase = None
            return True
        return False

    def advance(self) -> bool:
        """Advance one simulation tick, never use sleep or read wall-clock time."""
        if self.phase == "countdown":
            self.countdown_ms = max(0, self.countdown_ms - TICK_MS)
            if self.countdown_ms == 0:
                self.phase = "running"
            return True
        if self.phase != "running":
            return False
        self.elapsed_ms += TICK_MS
        crossings = []
        for lane, position in enumerate(self.positions):
            distance = self._random.uniform(30.0, 130.0) * TICK_MS / 1000.0
            following = position + distance
            if following >= TRACK_LENGTH:
                # First crossing within this tick, not the first lane in the loop.
                crossings.append(((TRACK_LENGTH - position) / distance, lane))
            self.positions[lane] = min(TRACK_LENGTH, following)
        if crossings:
            self.winner = min(crossings)[1]
            self.phase = "finished"
            self.rounds += 1
            self.points += int(self.winner == self.selected)
        return True

    def snapshot(self) -> RaceFrame:
        return RaceFrame(
            phase=self.phase,
            positions=tuple(self.positions),
            selected=self.selected,
            winner=self.winner,
            countdown_ms=self.countdown_ms,
            elapsed_ms=self.elapsed_ms,
            rounds=self.rounds,
            points=self.points,
        )
