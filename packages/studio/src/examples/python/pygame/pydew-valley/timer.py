import pygame


class Timer:
    """Counts `duration` milliseconds after start() and then calls `when_done` (if given)."""

    def __init__(self, duration, when_done=None):
        self.duration = duration
        self.when_done = when_done
        self.active = False
        self.start_time = 0

    def start(self):
        self.active = True
        self.start_time = pygame.time.get_ticks()

    def update(self):
        if self.active and pygame.time.get_ticks() - self.start_time >= self.duration:
            self.active = False
            if self.when_done:
                self.when_done()
