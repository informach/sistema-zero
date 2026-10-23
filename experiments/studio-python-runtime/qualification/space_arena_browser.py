"""Browser QA driver of the original Q02-Q07 fixtures. Not native canvas QA.

No getcanvas emulation: stamps/pen items are Python witnesses. Raster parity
remains a separate browser gate. No algorithm, input timer or pool replaced.
"""
import json
import random
import sys
import time
import turtle
from _qa_space_observer import FunctionalComplete, Observer as NativeObserver, state

CONFIG = {"scenario": "Q02", "seed": 2026}
report = dict(observations=[])
callbacks = {}


class Observer(NativeObserver):
    def event(self, kind, **value):
        super().event(kind, **value)
        print('__SZ_SPACE_QA__' + json.dumps(dict(kind=kind, step=self.step,
              clock=time.monotonic(), **value), separators=(',', ':')))

    def update(self, namespace):
        if self.namespace is None:
            return super().update(namespace)
        self.check_pools()
        assert namespace['game'].state == 'playing'
        self.event('rendered-frame', player=state(namespace['player']),
                   stampCount=len(namespace['pen'].stampItems),
                   canvasItems=None, scope='Raster parity is a separate gate; no Tk canvas API')
        getattr(self, self.scenario)(initial=False)
        self.step += 1

    def cleared(self, before, after):
        self.clears.append(dict(before=before, after=after,
                               penItemsAfter=len(self.namespace['pen'].items)))
        if not self.complete_requested:
            return
        assert self.clears and all(item['before'] > 0 and item['after'] == 0 for item in self.clears)
        self.check_pools()
        self.event('complete', sounds=self.audio, clearWitnesses=self.clears,
                   methodWitnesses=self.witnesses, radarWitnesses=self.radar_witnesses)
        raise FunctionalComplete()


observer = Observer(CONFIG['scenario'], report, callbacks)
real_update = turtle.TurtleScreen.update
real_press = turtle.TurtleScreen.onkeypress
real_release = turtle.TurtleScreen.onkeyrelease
real_timer = turtle.TurtleScreen.ontimer


def timer(self, callback, t=0):
    if (getattr(callback, '__module__', None) != 'space_arena'
            or getattr(callback, '__name__', None) != '_space_arena_tick'):
        return real_timer(self, callback, t)

    def bounded_tick():
        try:
            return callback()
        except FunctionalComplete:
            # A Turtle timer dispatcher catches callback exceptions itself.
            # Close at the declared QA boundary, outside the authored tick.
            turtle.bye()

    return real_timer(self, bounded_tick, t)


def press(self, callback, key=None):
    callbacks['press', key] = callback
    return real_press(self, callback, key)


def release(self, callback, key=None):
    callbacks['release', key] = callback
    return real_release(self, callback, key)


def update(self):
    namespace = sys._getframe(1).f_globals
    result = real_update(self)
    if 'game' in namespace and 'exhaust' in namespace:
        observer.update(namespace)
    return result


turtle.TurtleScreen.update = update
turtle.TurtleScreen.onkeypress = press
turtle.TurtleScreen.onkeyrelease = release
turtle.TurtleScreen.ontimer = timer
random.seed(CONFIG['seed'])
try:
    __import__('space_arena')  # Event-driven recipe, same authored playing rules.
    assert observer.complete_requested, 'Expected explicit QA completion, not natural game exit'
    assert sum(item['kind'] == 'complete' for item in report['observations']) == 1
finally:
    observer.restore()
    if observer.namespace is not None:
        observer.namespace['play_sound'] = observer.original_sound
    turtle.TurtleScreen.update = real_update
    turtle.TurtleScreen.onkeypress = real_press
    turtle.TurtleScreen.onkeyrelease = real_release
    turtle.TurtleScreen.ontimer = real_timer
