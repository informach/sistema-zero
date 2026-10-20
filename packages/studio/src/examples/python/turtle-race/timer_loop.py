"""A single owned timer chain; no graphical dependency or background thread."""

from collections.abc import Callable


class SingleTimerLoop:
    def __init__(
        self,
        schedule: Callable[[Callable[[], None], int], None],
        step: Callable[[], None],
        interval_ms: int,
    ):
        if interval_ms <= 0:
            raise ValueError("The interval must be positive.")
        self._schedule = schedule
        self._step = step
        self._interval = interval_ms
        self._running = False
        self._pending = False
        self._generation = 0

    @property
    def running(self) -> bool:
        return self._running

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._generation += 1
        self._queue()

    def stop(self) -> None:
        self._running = False
        self._pending = False
        self._generation += 1

    def _queue(self) -> None:
        if not self._running or self._pending:
            return
        generation = self._generation
        self._pending = True

        def deliver() -> None:
            # An old callback must not clear the new generation's pending flag.
            if not self._running or generation != self._generation:
                return
            self._pending = False
            try:
                self._step()
            except BaseException:
                self.stop()
                raise
            if self._running and generation == self._generation:
                self._queue()

        try:
            self._schedule(deliver, self._interval)
        except BaseException:
            self.stop()
            raise
