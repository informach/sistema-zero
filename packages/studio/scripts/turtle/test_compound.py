"""Run the real browser Turtle engine/backend with a recording transport, no Tk.

This verifies Python geometry, allocation and protocol requests, not rendered
pixels, browser input, a WASM distribution or a graphical native Turtle window.
"""

import importlib.util
import inspect
import json
from copy import deepcopy
from pathlib import Path
import sys
import types
import unittest


ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT / "src/runtime/python/turtle"
package = types.ModuleType("_sz_turtle_runtime")
package.__path__ = [str(DIRECTORY)]
sys.modules[package.__name__] = package
from _sz_turtle_runtime import _sz_turtle_backend as backend

requests = []


def transport(raw):
    request = json.loads(raw)
    requests.append(request)
    query = request.get("query") or {}
    return json.dumps({"events": [], "value": [1010, 860] if query.get("type") == "viewport" else None})


backend.configure(transport, ROOT)


class CompoundShapes(unittest.TestCase):
    def setUp(self):
        # Each case represents a fresh execution, rather than reviving the
        # upstream singleton after bye() has deliberately stopped it.
        global turtle
        spec = importlib.util.spec_from_file_location("_compound_turtle", DIRECTORY / "turtle.py")
        turtle = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(turtle)
        self.maximum = backend.MAX_ITEMS
        self.maximum_points = backend.MAX_POINTS
        requests.clear()
        self.screen = turtle.Screen()
        self.screen.tracer(0)
        self.shape = turtle.Shape("compound")
        self.shape.addcomponent(((0, 0), (10, 0), (0, 10)), "red", "blue")
        self.shape.addcomponent(((0, 0), (-10, 0), (0, -10)), "green")
        self.screen.register_shape("duas_partes", self.shape)

    def tearDown(self):
        backend.MAX_ITEMS = self.maximum
        backend.MAX_POINTS = self.maximum_points
        if not self.screen._closed:
            self.screen.bye()

    def actor(self, shape="duas_partes"):
        actor = turtle.Turtle(shape=shape, visible=False)
        actor.penup()
        return actor

    def snapshot(self):
        return (deepcopy(self.screen._items), self.screen._next_item,
                list(self.screen._turtles), list(self.screen._operations), self.screen._point_count,
                self.screen._updatecounter)

    def test_public_signatures_and_component_validation_match_official_api(self):
        self.assertIn("Shape", turtle.__all__)
        self.assertEqual(str(inspect.signature(turtle.Shape)), "(type_, data=None)")
        self.assertEqual(str(inspect.signature(turtle.Shape.addcomponent)), "(self, poly, fill, outline=None)")
        self.assertEqual(self.shape._data[1][2], "green")
        with self.assertRaises(turtle.TurtleGraphicsError):
            turtle.Shape("polygon", ((0, 0),)).addcomponent(((0, 0),), "red")
        api = json.loads((DIRECTORY / "api-reference.json").read_text(encoding="utf-8"))
        entries = {(entry["owner"], entry["name"]): entry for entry in api["entries"]}
        self.assertEqual(entries[("turtle", "Shape")]["signature"], "(type_, data=None)")
        self.assertEqual(entries[("Shape", "addcomponent")]["signature"], "(poly, fill, outline=None)")

    def test_stamp_preserves_geometry_colors_and_clearstamp_removes_only_its_parts(self):
        actor = self.actor()
        actor.goto(20, 30)
        actor.setheading(90)
        stamp = actor.stamp()
        self.assertIsInstance(stamp, tuple)
        self.assertEqual(len(stamp), 2)
        self.assertEqual(self.screen._items[stamp[0]]["points"], [(20.0, -30.0), (30.0, -30.0), (20.0, -40.0)])
        self.screen.update()
        patches = [operation for request in requests for operation in request["operations"]
                   if operation["op"] == "patch" and operation["id"] in stamp]
        self.assertEqual([(patch["fill"], patch["outline"]) for patch in patches],
                         [("#ff0000", "#0000ff"), ("#008000", "#008000")])
        other = actor.stamp()
        actor.clearstamp(stamp)
        actor.clearstamp(stamp)
        self.assertTrue(all(identifier not in self.screen._items for identifier in stamp))
        self.assertTrue(all(identifier in self.screen._items for identifier in other))
        self.assertNotIn(stamp, actor.stampItems)

    def test_clearstamps_and_clear_retire_complete_compound_stamps(self):
        actor = self.actor()
        stamps = [actor.stamp() for _ in range(3)]
        actor.clearstamps(1)
        self.assertEqual(actor.stampItems, stamps[1:])
        actor.clearstamps(-1)
        self.assertEqual(actor.stampItems, stamps[1:2])
        actor.clear()
        self.assertEqual(actor.stampItems, [])
        self.assertTrue(all(identifier not in self.screen._items for stamp in stamps for identifier in stamp))

    def test_constructor_reserves_every_component_before_publishing_the_actor(self):
        backend.MAX_ITEMS = len(self.screen._items) + 3
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "Limite de objetos"):
            self.actor()
        self.assertEqual(self.snapshot(), before)
        backend.MAX_ITEMS += 1
        self.assertEqual(len(self.actor().turtle._item), 2)

    def check_hidden_constructor_point_reservation(self, component_lengths):
        # Small quota, real scene geometry and real tracer(1) draw path. Hidden
        # compound components emit three dummy points regardless of polygon size.
        backend.MAX_POINTS = 12
        self.screen.tracer(1, 0)
        shape = turtle.Shape("compound")
        for length in component_lengths:
            shape.addcomponent(((0, 0),) * length, "red")
        self.screen.register_shape("curta", shape)
        hidden_points = 3 * len(component_lengths)
        existing = self.screen._createpoly()
        self.screen._drawpoly(existing, ((0, 0),) * (12 - hidden_points + 1), fill="blue")
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "pontos"):
            turtle.Turtle(shape="curta", visible=False)
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.screen.turtles(), [])
        self.screen._drawpoly(existing, ((0, 0),) * (12 - hidden_points), fill="blue")
        actor = turtle.Turtle(shape="curta", visible=False)
        self.assertEqual(self.screen.turtles(), [actor])
        self.assertEqual(self.screen._point_count, 12)
        self.assertTrue(all(len(self.screen._items[item]["points"]) == 3 for item in actor.turtle._item))

    def test_hidden_one_point_component_reserves_its_three_point_draw_before_construction(self):
        self.check_hidden_constructor_point_reservation([1])

    def test_hidden_two_point_component_reserves_its_three_point_draw_before_construction(self):
        self.check_hidden_constructor_point_reservation([2])

    def test_hidden_mixed_components_reserve_the_whole_dummy_geometry(self):
        self.check_hidden_constructor_point_reservation([1, 4])

    def test_visible_short_components_remain_valid_at_their_exact_geometry_capacity(self):
        for length in [1, 2]:
            with self.subTest(length=length):
                self.screen.clear()
                self.screen.tracer(1, 0)
                backend.MAX_POINTS = 12
                shape = turtle.Shape("compound")
                shape.addcomponent(((0, 0),) * length, "red")
                self.screen.register_shape("visivel", shape)
                existing = self.screen._createpoly()
                self.screen._drawpoly(existing, ((0, 0),) * (12 - length), fill="blue")
                actor = turtle.Turtle(shape="visivel", visible=True)
                self.assertEqual(self.screen._point_count, 12)
                self.assertEqual(len(self.screen._items[actor.turtle._item[0]]["points"]), length)

    def test_hidden_empty_compound_does_not_reserve_nonexistent_components(self):
        backend.MAX_POINTS = 12
        self.screen.tracer(1, 0)
        existing = self.screen._createpoly()
        self.screen._drawpoly(existing, ((0, 0),) * 12, fill="blue")
        self.screen.register_shape("vazia", turtle.Shape("compound"))
        actor = turtle.Turtle(shape="vazia", visible=False)
        self.assertEqual(self.screen.turtles(), [actor])
        self.assertEqual(self.screen._point_count, 12)
        self.assertEqual(actor.turtle._item, [])

    def one_point_shape(self):
        shape = turtle.Shape("compound")
        shape.addcomponent(((0, 0),), "red")
        self.screen.register_shape("um_ponto", shape)

    def fill_points(self, count):
        item = self.screen._createpoly()
        self.screen._drawpoly(item, ((0, 0),) * count, fill="blue")
        return item

    def test_polygon_constructor_reserves_real_or_hidden_geometry(self):
        for visible, size in [(False, 3), (True, 1), (True, 5)]:
            with self.subTest(visible=visible, size=size):
                self.screen.clear()
                self.screen.tracer(1, 0)
                backend.MAX_POINTS = 12
                self.screen.register_shape("poligono", ((0, 0),) * size)
                existing = self.fill_points(12 - size + 1)
                before = self.snapshot()
                with self.assertRaisesRegex(RuntimeError, "pontos"):
                    turtle.Turtle(shape="poligono", visible=visible)
                self.assertEqual(self.snapshot(), before)
                self.screen._drawpoly(existing, ((0, 0),) * (12 - size), fill="blue")
                actor = turtle.Turtle(shape="poligono", visible=visible)
                self.assertEqual(len(self.screen._items[actor.turtle._item]["points"]), size)
                self.assertEqual(self.screen._point_count, 12)

    def test_constructor_and_clone_budget_all_pending_actors_at_tracer_boundary(self):
        for operation in ["constructor", "clone"]:
            with self.subTest(operation=operation):
                self.screen.clear()
                self.screen.tracer(2, 0)
                backend.MAX_POINTS = 12
                self.one_point_shape()
                original = turtle.Turtle(shape="um_ponto", visible=False)
                self.assertEqual(self.screen._updatecounter, 1)
                self.assertEqual(self.screen._point_count, 0)
                existing = self.fill_points(8)
                before = self.snapshot()
                with self.assertRaisesRegex(RuntimeError, "pontos"):
                    if operation == "clone":
                        original.clone()
                    else:
                        turtle.Turtle(shape="um_ponto", visible=False)
                self.assertEqual(self.snapshot(), before)
                self.assertFalse(original._hidden_from_screen)
                self.screen._drawpoly(existing, ((0, 0),) * 6, fill="blue")
                if operation == "clone":
                    other = original.clone()
                else:
                    other = turtle.Turtle(shape="um_ponto", visible=False)
                self.assertEqual(self.screen.turtles(), [original, other])
                self.assertEqual(self.screen._point_count, 12)
                self.assertEqual(self.screen._updatecounter, 0)

    def test_shape_swap_budgets_hidden_geometry_before_deleting_the_previous_shape(self):
        self.screen.tracer(2, 0)
        backend.MAX_POINTS = 12
        self.one_point_shape()
        actor = turtle.Turtle(shape="classic", visible=False)
        previous = actor.turtle._item
        existing = self.fill_points(10)
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "pontos"):
            actor.shape("um_ponto")
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(actor.turtle._item, previous)
        self.assertEqual(actor.shape(), "classic")
        self.screen._drawpoly(existing, ((0, 0),) * 9, fill="blue")
        actor.shape("um_ponto")
        self.assertEqual(self.screen._point_count, 12)

    def test_polygon_stamp_checks_capacity_and_transformed_coordinates_before_allocation(self):
        actor = self.actor("classic")
        backend.MAX_POINTS = 12
        self.fill_points(10)
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "pontos"):
            actor.stamp()
        self.assertEqual(self.snapshot(), before)
        actor.shapesize(1e308)
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, "Coordenadas"):
            actor.stamp()
        self.assertEqual(self.snapshot(), before)

    def test_pending_draw_budget_respects_real_order_instead_of_only_final_size(self):
        for grows_first in [True, False]:
            with self.subTest(grows_first=grows_first):
                self.screen.clear()
                self.screen.tracer(0)
                backend.MAX_POINTS = 12
                first_size, second_size = (1, 4) if grows_first else (4, 1)
                self.screen.register_shape("primeira", ((0, 0),) * first_size)
                self.screen.register_shape("segunda", ((0, 0),) * second_size)
                first = turtle.Turtle(shape="primeira")
                second = turtle.Turtle(shape="segunda")
                self.screen.tracer(2, 0)
                first.right(0)  # The next update will redraw every actor.
                self.screen.register_shape("primeira", ((0, 0),) * second_size)
                self.screen.register_shape("segunda", ((0, 0),) * first_size)
                self.fill_points(6 if grows_first else 3)
                before = self.snapshot()
                if grows_first:
                    with self.assertRaisesRegex(RuntimeError, "pontos"):
                        second.clone()
                    self.assertEqual(self.snapshot(), before)
                else:
                    second.clone()
                    self.assertEqual(self.screen._point_count, 12)

    def test_clone_reserves_its_finished_line_before_the_pending_global_redraw(self):
        self.screen.tracer(3, 0)
        backend.MAX_POINTS = 12
        self.one_point_shape()
        actor = turtle.Turtle(shape="um_ponto", visible=False)
        actor.goto(10, 0)
        self.assertEqual(self.screen._updatecounter, 2)
        self.assertEqual(len(actor.currentLine), 2)
        self.assertEqual(self.screen._point_count, 0)
        existing = self.fill_points(5)
        before = self.snapshot()
        previous_line, previous_items = list(actor.currentLine), list(actor.items)
        with self.assertRaisesRegex(RuntimeError, "pontos"):
            actor.clone()
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(actor.currentLine, previous_line)
        self.assertEqual(actor.items, previous_items)
        self.screen._drawpoly(existing, ((0, 0),) * 4, fill="blue")
        actor.clone()
        self.assertEqual(self.screen._point_count, 12)
        self.assertEqual(len(actor.currentLine), 1)

    def test_shape_swap_can_replace_an_empty_compound_at_exact_point_capacity(self):
        self.screen.tracer(1, 0)
        backend.MAX_POINTS = 12
        self.screen.register_shape("vazia", turtle.Shape("compound"))
        self.one_point_shape()
        actor = turtle.Turtle(shape="vazia")
        existing = self.fill_points(12)
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "pontos"):
            actor.shape("um_ponto")
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(actor.shape(), "vazia")
        self.assertEqual(actor.turtle._item, [])
        self.screen._drawpoly(existing, ((0, 0),) * 11, fill="blue")
        actor.shape("um_ponto")
        self.assertEqual(self.screen._point_count, 12)
        actor.shape("vazia")
        self.assertEqual(self.screen._point_count, 11)

    def test_hidden_shape_swap_does_not_charge_for_a_draw_upstream_will_skip(self):
        self.screen.tracer(1, 0)
        backend.MAX_POINTS = 12
        self.one_point_shape()
        actor = turtle.Turtle(shape="um_ponto", visible=False)
        self.assertTrue(actor._hidden_from_screen)
        self.fill_points(9)
        # CPython keeps the hidden flag when replacing the shape. The new
        # compound items remain blank until a future showturtle call.
        actor.shape("duas_partes")
        self.assertEqual(self.screen._point_count, 9)
        self.assertTrue(all(self.screen._items[item]["points"] == [] for item in actor.turtle._item))

    def test_tracer_zero_does_not_reserve_points_that_will_only_draw_later(self):
        backend.MAX_POINTS = 12
        self.fill_points(12)
        actor = turtle.Turtle(shape="duas_partes")
        clone = actor.clone()
        actor.shape("classic")
        self.assertEqual(self.screen._point_count, 12)
        self.assertEqual(self.screen.turtles(), [actor, clone])

    def test_shape_swap_refuses_without_destroying_old_shape_then_reuses_its_capacity(self):
        actor = self.actor("classic")
        previous = actor.turtle._item
        backend.MAX_ITEMS = len(self.screen._items)
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "Limite de objetos"):
            actor.shape("duas_partes")
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(actor.shape(), "classic")
        self.assertEqual(actor.turtle._item, previous)
        backend.MAX_ITEMS += 1
        actor.shape("duas_partes")
        self.assertNotIn(previous, self.screen._items)
        self.assertEqual(len(actor.turtle._item), 2)

    def check_deleted_shape_reuse_at_item_capacity(self, direct):
        # CPython _TurtleImage._setshape reuses the existing item for both
        # polygon->polygon and image->image, even after clearscreen deletes it.
        # Fill a new scene with real stamps; the old actor must not allocate an
        # item or consume capacity just to retain its now-deleted canvas ID.
        backend.MAX_ITEMS = 12
        for original, replacement in [("classic", "triangle"), ("blank", "blank")]:
            with self.subTest(direct=direct, original=original):
                self.screen.clear()
                self.screen.tracer(0)
                old = self.actor(original)
                previous = old.turtle._item
                self.screen.clear()
                self.screen.tracer(0)
                self.assertNotIn(previous, self.screen._items)
                self.screen.register_shape("ponto", ((0, 0),))
                current = self.actor("ponto")
                while len(self.screen._items) < backend.MAX_ITEMS:
                    current.stamp()
                before = self.snapshot()
                if direct:
                    old.turtle._setshape(replacement)
                else:
                    old.shape(replacement)
                self.assertEqual(old.shape(), replacement)
                self.assertEqual(old.turtle._item, previous)
                self.assertEqual(self.snapshot(), before)
                self.assertEqual(self.screen.turtles(), [current])
                # A different shape kind really allocates components and must
                # still refuse before changing this old actor or the new scene.
                with self.assertRaisesRegex(RuntimeError, "Limite de objetos"):
                    if direct:
                        old.turtle._setshape("duas_partes")
                    else:
                        old.shape("duas_partes")
                self.assertEqual(old.shape(), replacement)
                self.assertEqual(old.turtle._item, previous)
                self.assertEqual(self.snapshot(), before)

    def test_shape_reuses_deleted_polygon_or_image_at_full_item_capacity(self):
        self.check_deleted_shape_reuse_at_item_capacity(direct=False)

    def test_shape_image_helper_reuses_deleted_items_without_reserving_new_ones(self):
        self.check_deleted_shape_reuse_at_item_capacity(direct=True)

    def test_stamp_and_clone_fail_before_allocating_any_partial_components(self):
        actor = self.actor()
        backend.MAX_ITEMS = len(self.screen._items) + 1
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "Limite de objetos"):
            actor.stamp()
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(actor.stampItems, [])
        backend.MAX_ITEMS = len(self.screen._items) + 4
        with self.assertRaisesRegex(RuntimeError, "Limite de objetos"):
            actor.clone()
        self.assertEqual(self.snapshot(), before)
        backend.MAX_ITEMS += 1
        clone = actor.clone()
        self.assertEqual(clone.shape(), "duas_partes")
        self.assertEqual(len(clone.turtle._item), 2)
        self.assertIn(clone, self.screen.turtles())

    def check_invalid_stamp(self, component):
        actor = self.actor()
        self.shape._data[1] = component
        before = self.snapshot()
        with self.assertRaises((TypeError, ValueError, KeyError, turtle.TurtleGraphicsError)):
            actor.stamp()
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(actor.stampItems, [])

    def test_bad_second_component_color_does_not_leave_partial_stamp(self):
        self.check_invalid_stamp([((0, 0), (10, 0), (0, 10)), "no-such-color", "blue"])

    def test_bad_second_component_geometry_does_not_leave_partial_stamp(self):
        self.check_invalid_stamp([((0, 0), (float("nan"), 0), (0, 10)), "red", "blue"])

    def test_transformed_coordinates_are_checked_before_stamp_allocation(self):
        actor = self.actor()
        actor.shapesize(1e308)
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, "Coordenadas"):
            actor.stamp()
        self.assertEqual(self.snapshot(), before)

    def test_invalid_constructor_swap_and_clone_preserve_registered_actors(self):
        actor = self.actor("classic")
        self.shape._data[1] = [((0, 0), (10, 0), (0, 10)), "no-such-color", "blue"]
        before = self.snapshot()
        for operation in [lambda: self.actor(), lambda: actor.shape("duas_partes")]:
            with self.subTest(operation=operation):
                with self.assertRaises((ValueError, KeyError, turtle.TurtleGraphicsError)):
                    operation()
                self.assertEqual(self.snapshot(), before)
                self.assertEqual(actor.shape(), "classic")
        self.shape._data[1][1] = "green"
        actor.shape("duas_partes")
        self.shape._data[1][1] = "no-such-color"
        before = self.snapshot()
        with self.assertRaises((ValueError, KeyError, turtle.TurtleGraphicsError)):
            actor.clone()
        self.assertEqual(self.snapshot(), before)

    def test_empty_compound_is_valid_at_exact_capacity(self):
        self.screen.register_shape("vazia", turtle.Shape("compound"))
        backend.MAX_ITEMS = len(self.screen._items) + 2
        actor = self.actor("vazia")
        before = len(self.screen._items)
        stamp = actor.stamp()
        self.assertEqual(stamp, ())
        actor.clearstamp(stamp)
        self.assertEqual(actor.stampItems, [])
        self.assertEqual(len(self.screen._items), before)

    def test_wire_coordinate_and_outline_limits_fail_before_stamp_allocation(self):
        actor = self.actor()
        original = self.shape._data[1]
        self.shape._data[1] = [((0, 0), (20_000_000, 0), (0, 10)), "red", "blue"]
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, "Coordenadas"):
            actor.stamp()
        self.assertEqual(self.snapshot(), before)
        self.shape._data[1] = original
        actor.shapesize(1, 1, 5000)
        before = self.snapshot()
        with self.assertRaisesRegex(ValueError, "Contorno"):
            actor.stamp()
        self.assertEqual(self.snapshot(), before)

    def test_aggregate_component_points_and_single_operation_bytes_are_preflighted(self):
        actor = self.actor()
        self.shape._data = [[((0, 0),) * 60_000, "red", "blue"],
                            [((0, 0),) * 60_000, "green", "green"]]
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "pontos"):
            actor.stamp()
        self.assertEqual(self.snapshot(), before)
        self.shape._data = [[((9_999_999.1234567, 9_999_999.1234567),) * 35_000, "red", "blue"]]
        with self.assertRaisesRegex(RuntimeError, "operação"):
            actor.stamp()
        self.assertEqual(self.snapshot(), before)

    def test_existing_scene_points_are_reserved_before_all_components(self):
        actor = self.actor()
        existing = self.screen._createpoly()
        self.screen._drawpoly(existing, ((0, 0),) * 60_000, fill="red", outline="blue")
        self.shape._data = [[((0, 0),) * 30_000, "red", "blue"],
                            [((0, 0),) * 30_000, "green", "green"]]
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "pontos"):
            actor.stamp()
        self.assertEqual(self.snapshot(), before)
        self.screen._delete(existing)
        self.assertEqual(self.screen._point_count, 0)

    def test_pointer_bindings_preserve_tk_single_tag_semantics_without_fanout(self):
        callback = lambda x, y: None
        for parts in [0, 1, 2]:
            shape = turtle.Shape("compound")
            for _ in range(parts):
                shape.addcomponent(((0, 0), (10, 0), (0, 10)), "red")
            self.screen.register_shape("binding", shape)
            actor = self.actor("binding")
            for method in [actor.onclick, actor.onrelease, actor.ondrag]:
                before = dict(self.screen._bindings)
                method(callback)
                method(callback, add=True)
                if parts == 1:
                    keys = set(self.screen._bindings) - set(before)
                    self.assertEqual(len(keys), 1)
                    self.assertEqual(len(self.screen._bindings[keys.pop()]), 2)
                else:
                    self.assertEqual(self.screen._bindings, before)
                method(None)
                self.assertEqual(self.screen._bindings, before)


if __name__ == "__main__":
    unittest.main(verbosity=2)
