//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/util.js
function e(e) {
	let t = Object.values(e).filter((e) => typeof e == "number");
	return Object.entries(e).filter(([e, n]) => t.indexOf(+e) === -1).map(([e, t]) => t);
}
function t(e, t = "|") {
	return e.map((e) => te(e)).join(t);
}
function n(e, t) {
	return typeof t == "bigint" ? t.toString() : t;
}
var r = class {
	constructor(e) {
		this._getter = e, this._value = void 0;
	}
	get value() {
		let e = this._getter;
		return e !== void 0 && (this._value = e(), this._getter = void 0), this._value;
	}
};
function i(e) {
	return new r(e);
}
function a(e) {
	return e == null;
}
function o(e) {
	let t = +!!e.startsWith("^"), n = e.endsWith("$") ? e.length - 1 : e.length;
	return e.slice(t, n);
}
function s(e, t) {
	let n = e / t, r = Math.round(n), i = 4 * 2 ** -52 * Math.max(Math.abs(n), 1);
	return Math.abs(n - r) < i ? 0 : n - r;
}
var c = /* @__PURE__*/ Symbol("evaluating");
function l(e, t, n) {
	let r;
	Object.defineProperty(e, t, {
		get() {
			if (r !== c) return r === void 0 && (r = c, r = n()), r;
		},
		set(n) {
			Object.defineProperty(e, t, { value: n });
		},
		configurable: !0
	});
}
function u(e, t, n) {
	Object.defineProperty(e, t, {
		value: n,
		writable: !0,
		enumerable: !0,
		configurable: !0
	});
}
function d(e) {
	let t = Object.getOwnPropertyDescriptor(e, "shape");
	return t?.get ? t.get.raw : t?.value;
}
function f(e) {
	return d(e._zod.def) ?? e._zod.def.shape;
}
function p(e, t, n) {
	Object.defineProperty(e, t, {
		get() {
			let e = n();
			return u(this, t, e), e;
		},
		enumerable: !0,
		configurable: !0
	});
}
function m(e, t, n) {
	t in e ? u(e, t, n) : e[t] = n;
}
function h(e, t, n, r) {
	let i = f(t);
	for (let a of n) {
		let n = Object.getOwnPropertyDescriptor(i, a);
		n.enumerable && (n.get ? p(e, a, () => {
			let e = t._zod.def.shape[a];
			return r ? r(e, a) : e;
		}) : m(e, a, r ? r(n.value, a) : n.value));
	}
}
function g(e, t) {
	for (let n of Reflect.ownKeys(t)) {
		let r = Object.getOwnPropertyDescriptor(t, n);
		r.enumerable && (r.get ? p(e, n, () => t[n]) : m(e, n, r.value));
	}
}
function _(...e) {
	let t = {};
	for (let n of e) {
		let e = Object.getOwnPropertyDescriptors(n);
		Object.assign(t, e);
	}
	return Object.defineProperties({}, t);
}
function v(e) {
	return JSON.stringify(e);
}
function y(e) {
	return e.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var b = "captureStackTrace" in Error ? Error.captureStackTrace : (...e) => {};
function x(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
var S = /* @__PURE__*/ i(() => {
	if (Ue.jitless || typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare")) return !1;
	try {
		return Function(""), !0;
	} catch {
		return !1;
	}
});
function C(e) {
	if (x(e) === !1) return !1;
	let t = e.constructor;
	if (t === void 0 || typeof t != "function") return !0;
	let n = t.prototype;
	return x(n) !== !1 && Object.prototype.hasOwnProperty.call(n, "isPrototypeOf") !== !1;
}
function ee(e) {
	return C(e) ? { ...e } : Array.isArray(e) ? [...e] : e instanceof Map ? new Map(e) : e instanceof Set ? new Set(e) : e;
}
var w = /* @__PURE__*/ new Set([
	"string",
	"number",
	"symbol"
]);
function T(e) {
	return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function E(e, t, n) {
	let r = new e._zod.constr(t ?? e._zod.def);
	return (!t || n?.parent) && (r._zod.parent = e), r;
}
function D(e) {
	let t = e;
	if (!t) return {};
	if (typeof t == "string") return { error: () => t };
	if (t?.message !== void 0) {
		if (t?.error !== void 0) throw Error("Cannot specify both `message` and `error` params");
		t.error = t.message;
	}
	return delete t.message, typeof t.error == "string" ? {
		...t,
		error: () => t.error
	} : t;
}
function te(e) {
	return typeof e == "bigint" ? e.toString() + "n" : typeof e == "string" ? `"${e}"` : `${e}`;
}
function ne(e) {
	return Object.keys(e).filter((t) => e[t]._zod.optin !== void 0 && e[t]._zod.optout === "optional");
}
var re = {
	safeint: [-(2 ** 53 - 1), 2 ** 53 - 1],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
}, ie = {
	int64: [/* @__PURE__*/ BigInt("-9223372036854775808"), /* @__PURE__*/ BigInt("9223372036854775807")],
	uint64: [/* @__PURE__*/ BigInt(0), /* @__PURE__*/ BigInt("18446744073709551615")]
};
function ae(e, t) {
	let n = e._zod.def, r = n.checks;
	if (r && r.length > 0) throw Error(".pick() cannot be used on object schemas containing refinements");
	let i = {};
	return h(i, e, O(e, t)), E(e, _(n, {
		shape: i,
		checks: []
	}));
}
function O(e, t) {
	let n = f(e), r = [];
	for (let e of Reflect.ownKeys(t)) {
		if (!Object.getOwnPropertyDescriptor(n, e)?.enumerable) throw Error(`Unrecognized key: "${String(e)}"`);
		t[e] && r.push(e);
	}
	return r;
}
function oe(e, t) {
	let n = e._zod.def, r = n.checks;
	if (r && r.length > 0) throw Error(".omit() cannot be used on object schemas containing refinements");
	let i = new Set(O(e, t)), a = {};
	return h(a, e, Reflect.ownKeys(f(e)).filter((e) => !i.has(e))), E(e, _(n, {
		shape: a,
		checks: []
	}));
}
function se(e, t) {
	if (!C(t)) throw Error("Invalid input to extend: expected a plain object");
	let n = e._zod.def.checks;
	if (n && n.length > 0) {
		let n = f(e);
		for (let e of Reflect.ownKeys(t)) if (Object.getOwnPropertyDescriptor(n, e) !== void 0) throw Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
	}
	return E(e, _(e._zod.def, { shape: ce(e, t) }));
}
function ce(e, t) {
	let n = {};
	return h(n, e, Reflect.ownKeys(f(e))), g(n, t), n;
}
function le(e, t) {
	if (!C(t)) throw Error("Invalid input to safeExtend: expected a plain object");
	return E(e, _(e._zod.def, { shape: ce(e, t) }));
}
function ue(e, t) {
	if (!t?._zod?.def) throw Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
	if (e._zod.def.checks?.length) throw Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
	let n = {};
	return h(n, e, Reflect.ownKeys(f(e))), h(n, t, Reflect.ownKeys(f(t))), E(e, _(e._zod.def, {
		shape: n,
		get catchall() {
			return t._zod.def.catchall;
		},
		checks: t._zod.def.checks ?? []
	}));
}
function de(e, t, n, r = "partial") {
	let i = t._zod.def.checks;
	if (i && i.length > 0) throw Error(`.${r}() cannot be used on object schemas containing refinements`);
	let a = n ? new Set(O(t, n)) : void 0, o = {};
	return h(o, t, Reflect.ownKeys(f(t)), e && ((t, n) => a && !a.has(n) ? t : new e({
		type: "optional",
		innerType: t
	}))), E(t, _(t._zod.def, {
		shape: o,
		checks: []
	}));
}
function fe(e, t, n) {
	let r = n ? new Set(O(t, n)) : void 0, i = {};
	return h(i, t, Reflect.ownKeys(f(t)), (t, n) => r && !r.has(n) ? t : new e({
		type: "nonoptional",
		innerType: t
	})), E(t, _(t._zod.def, { shape: i }));
}
function pe(e, t = 0) {
	if (e.aborted === !0) return !0;
	for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue !== !0) return !0;
	return !1;
}
function me(e, t = 0) {
	if (e.aborted === !0) return !0;
	for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue === !1) return !0;
	return !1;
}
function he(e, t) {
	return t.map((t) => {
		var n;
		return (n = t).path ?? (n.path = []), t.path.unshift(e), t;
	});
}
function ge(e) {
	return typeof e == "string" ? e : e?.message;
}
function _e(e) {
	let t = [];
	for (let n of e ?? []) {
		let e = n._zod.def;
		if (!/_(length|size)$|_equals$/.test(e.check)) break;
		let r = e.maximum ?? e.length ?? e.size;
		r >= 0 && t.push([r, n]);
	}
	return t;
}
function ve(e, t, n) {
	var r;
	for (let i = t; i < e.length; i++) (r = e[i]).schema ?? (r.schema = n);
}
function ye(e, t, n) {
	var r;
	let i = e.inst?._zod?.traits;
	i?.has("$ZodType") && (i.has("$ZodCheck") ? (r = e).schema ?? (r.schema = e.inst) : e.schema = e.inst);
	let a = e.schema === e.inst ? void 0 : e.schema?._zod.def?.error, o = e.message ? e.message : ge(e.inst?._zod.def?.error?.(e)) ?? ge(a?.(e)) ?? ge(t?.error?.(e)) ?? ge(n.customError?.(e)) ?? ge(n.localeError?.(e)) ?? "Invalid input", s = {};
	for (let t of Object.keys(e)) t !== "inst" && t !== "schema" && t !== "continue" && t !== "input" && t !== "__proto__" && (s[t] = e[t]);
	return s.path ??= [], s.message = o, t?.reportInput && (s.input = e.input), s;
}
var be = /[\uD800-\uDBFF]/;
function xe(e) {
	let t = e.length;
	if (!be.test(e)) return t;
	let n = t;
	for (let r = 0; r < t - 1; r++) (e.charCodeAt(r) & 64512) == 55296 && (e.charCodeAt(r + 1) & 64512) == 56320 && (n--, r++);
	return n;
}
function Se(e) {
	return Array.isArray(e) ? "array" : typeof e == "string" ? "string" : "unknown";
}
function Ce(e) {
	let t = typeof e;
	switch (t) {
		case "number": return Number.isNaN(e) ? "nan" : "number";
		case "object": {
			if (e === null) return "null";
			if (Array.isArray(e)) return "array";
			let t = e;
			if (t && Object.getPrototypeOf(t) !== Object.prototype && "constructor" in t && t.constructor) return t.constructor.name;
		}
	}
	return t;
}
function we(...e) {
	let [t, n, r] = e;
	return typeof t == "string" ? {
		message: t,
		code: "custom",
		input: n,
		inst: r
	} : { ...t };
}
function Te(e, t) {
	for (let n in t) {
		let r = Object.getOwnPropertyDescriptor(t, n);
		r.get ? Object.defineProperty(e, n, {
			...r,
			enumerable: !1
		}) : ke(e, n, r.value);
	}
}
function Ee(e, t, n, r = !0) {
	return Object.defineProperty(e, t, {
		configurable: !0,
		writable: !0,
		enumerable: r,
		value: n
	}), n;
}
function De(e, t, n) {
	return Ee(e, t, n, !1);
}
/* @__NO_SIDE_EFFECTS__ */
function Oe(e, t) {
	for (let n in e) {
		let r = e[n];
		Object.defineProperty(t, n, {
			configurable: !0,
			enumerable: !0,
			get() {
				return Ee(this, n, r(this));
			},
			set(e) {
				Ee(this, n, e);
			}
		});
	}
	return t;
}
function ke(e, t, n) {
	Object.defineProperty(e, t, {
		configurable: !0,
		get() {
			return this == null ? n : Ee(this, t, n.bind(this));
		},
		set(e) {
			Ee(this, t, e);
		}
	});
}
function Ae(e, t) {
	let n = Object.getPrototypeOf(e);
	return t in n ? void 0 : n;
}
var je, Me = !1, Ne = {
	configurable: !0,
	get() {
		Me = !0;
	}
};
function k(e, t, n) {
	let r = Object.getPrototypeOf(e._zod);
	t in r && je !== e._zod ? je = void 0 : (je = e._zod, Object.defineProperty(r, t, {
		configurable: !0,
		get() {
			Object.defineProperty(this, t, Ne);
			let e = Me;
			Me = !1;
			try {
				let r = n(this);
				return Me ? delete this[t] : Object.defineProperty(this, t, {
					configurable: !0,
					writable: !0,
					value: r
				}), Me ||= e, r;
			} catch (n) {
				throw delete this[t], Me ||= e, n;
			}
		},
		set(e) {
			Object.defineProperty(this, t, {
				configurable: !0,
				writable: !0,
				value: e
			});
		}
	}));
}
function Pe(e, t, n, r) {
	let i = Ae(e, t);
	i && Object.defineProperty(i, t, {
		configurable: !0,
		get() {
			let e = {
				configurable: !0,
				writable: !0,
				enumerable: r,
				value: void 0
			};
			return Object.defineProperty(this, t, e), e.value = n(this), Object.defineProperty(this, t, e), e.value;
		},
		set(e) {
			Object.defineProperty(this, t, {
				configurable: !0,
				writable: !0,
				enumerable: r,
				value: e
			});
		}
	});
}
var Fe = "~constantCatch";
function Ie(e) {
	let t = () => e;
	return t[Fe] = !0, t;
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/core.js
var Le, Re = {
	value: void 0,
	enumerable: !1
}, ze = "captureStackTrace" in Error ? Error : null;
function Be(e) {
	let t = ze;
	if (t) {
		let n = t.stackTraceLimit;
		if (typeof n == "number") {
			try {
				t.stackTraceLimit = 0;
			} catch {
				return ze = null, new e();
			}
			try {
				return new e();
			} finally {
				t.stackTraceLimit = n;
			}
		}
	}
	return new e();
}
/* @__NO_SIDE_EFFECTS__ */
function A(e, t, n, r) {
	let i = {};
	function a(e) {
		this.def = e, this.constr = d, this.traits = /* @__PURE__ */ new Set();
	}
	a.prototype = i;
	let o = n, s = o && /* @__PURE__ */ new WeakSet();
	function c(n, r) {
		if (!n._zod) {
			Re.value = new a(r);
			try {
				Object.defineProperty(n, "_zod", Re);
			} finally {
				Re.value = void 0;
			}
		} else if (n._zod.traits.has(e)) return;
		if (n._zod.traits.add(e), t(n, r), s) {
			let e = Object.getPrototypeOf(n), t = n._zod.constr.prototype, r = e;
			for (; r && r !== t;) r = Object.getPrototypeOf(r);
			let i = r ?? e;
			s.has(i) || (s.add(i), Te(i, o));
		}
		let i = d.prototype;
		for (let e in i) Object.prototype.hasOwnProperty.call(i, e) && (e in n || (n[e] = i[e].bind(n)));
	}
	let l = r?.Parent ?? Object;
	class u extends l {}
	Object.defineProperty(u, "name", { value: e });
	function d(e) {
		let t = r?.Parent ? Be(u) : this;
		c(t, e);
		let n = t._zod.deferred;
		if (n) {
			for (let e of n) e();
			t._zod.deferred = void 0;
		}
		let i = globalThis.__zod_globalConfig?.postProcessor;
		return i && i(t), t;
	}
	return Object.defineProperty(d, "init", { value: c }), Object.defineProperty(d, Symbol.hasInstance, { value: (t) => r?.Parent && t instanceof r.Parent ? !0 : t?._zod?.traits?.has(e) }), Object.defineProperty(d, "name", { value: e }), d;
}
var Ve = class extends Error {
	constructor() {
		super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
	}
}, He = class extends Error {
	constructor(e) {
		super(`Encountered unidirectional transform during encode: ${e}`), this.name = "ZodEncodeError";
	}
};
(Le = globalThis).__zod_globalConfig ?? (Le.__zod_globalConfig = {});
var Ue = globalThis.__zod_globalConfig;
function We(e) {
	return e && Object.assign(Ue, e), Ue;
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/errors.js
function Ge() {
	let e = this._zod;
	return e.message ??= JSON.stringify(e.def, n, 2), e.message;
}
function Ke(e) {
	this._zod.message = e;
}
var qe = {
	get: Ge,
	set: Ke,
	enumerable: !0,
	configurable: !0
}, Je = {
	value: void 0,
	enumerable: !1
}, Ye = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]), Xe = /* @__PURE__ */ A("$ZodError", (e, t) => {
	e.name = "$ZodError", Je.value = t, Object.defineProperty(e, "issues", Je), Je.value = void 0, Object.defineProperty(e, "message", qe);
	let n = Object.getPrototypeOf(e);
	Ye.has(n) || (Ye.add(n), Object.defineProperty(n, "toString", {
		configurable: !0,
		enumerable: !1,
		get() {
			let e = () => this.message;
			return Object.defineProperty(this, "toString", {
				value: e,
				configurable: !0,
				writable: !0
			}), e;
		},
		set(e) {
			Object.defineProperty(this, "toString", {
				value: e,
				configurable: !0,
				writable: !0
			});
		}
	}));
});
function Ze(e, t, n) {
	return Object.prototype.hasOwnProperty.call(e, t) || (t === "__proto__" ? Object.defineProperty(e, t, {
		value: n(),
		writable: !0,
		enumerable: !0,
		configurable: !0
	}) : e[t] = n()), e[t];
}
function Qe(e, t = (e) => e.message) {
	let n = {}, r = [];
	for (let i of e.issues) i.path.length > 0 ? Ze(n, i.path[0], () => []).push(t(i)) : r.push(t(i));
	return {
		formErrors: r,
		fieldErrors: n
	};
}
function $e(e, t = (e) => e.message) {
	let n = { _errors: [] }, r = (e, i = []) => {
		for (let a of e.issues) if (a.code === "invalid_union" && a.errors.length) a.errors.map((e) => r({ issues: e }, [...i, ...a.path]));
		else if (a.code === "invalid_key") r({ issues: a.issues }, [...i, ...a.path]);
		else if (a.code === "invalid_element") r({ issues: a.issues }, [...i, ...a.path]);
		else {
			let e = [...i, ...a.path];
			if (e.length === 0) n._errors.push(t(a));
			else {
				let r = n, i = 0;
				for (; i < e.length;) {
					let n = e[i], o = i === e.length - 1;
					if (n === "_errors") {
						o && r._errors.push(t(a)), i++;
						continue;
					}
					Object.prototype.hasOwnProperty.call(r, n) || Object.defineProperty(r, n, {
						value: { _errors: [] },
						enumerable: !0,
						writable: !0,
						configurable: !0
					});
					let s = r[n];
					o && s._errors.push(t(a)), r = s, i++;
				}
			}
		}
	};
	return r(e), n;
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/parse.js
function et(e, t) {
	return {
		callee: t?.callee ?? e,
		Err: t?.Err
	};
}
var tt = (e) => {
	let t = (n, r, i, a) => {
		let o = i ? {
			...i,
			async: !1
		} : { async: !1 }, s = n._zod.run({
			value: r,
			issues: []
		}, o);
		if (s instanceof Promise) throw new Ve();
		if (s.issues.length) {
			let n = new ((a?.Err) ?? e)(s.issues.map((e) => ye(e, o, We())));
			throw b(n, a?.callee ?? t), n;
		}
		return s.value;
	};
	return t;
}, nt = (e) => {
	let t = async (n, r, i, a) => {
		let o = i ? {
			...i,
			async: !0
		} : { async: !0 }, s = n._zod.run({
			value: r,
			issues: []
		}, o);
		if (s instanceof Promise && (s = await s), s.issues.length) {
			let n = new ((a?.Err) ?? e)(s.issues.map((e) => ye(e, o, We())));
			throw b(n, a?.callee ?? t), n;
		}
		return s.value;
	};
	return t;
}, rt = (e) => (t, n, r) => {
	let i = r ? {
		...r,
		async: !1
	} : { async: !1 }, a = t._zod.run({
		value: n,
		issues: []
	}, i);
	if (a instanceof Promise) throw new Ve();
	return a.issues.length ? it(e, a.issues, i) : {
		success: !0,
		data: a.value
	};
};
function it(e, t, n) {
	let r;
	return {
		success: !1,
		get error() {
			return r || (r = new e(t.map((e) => ye(e, n, We()))), t = void 0, n = void 0), r;
		},
		set error(e) {
			r = e, t = void 0, n = void 0;
		}
	};
}
var at = (e) => async (t, n, r) => {
	let i = r ? {
		...r,
		async: !0
	} : { async: !0 }, a = t._zod.run({
		value: n,
		issues: []
	}, i);
	return a instanceof Promise && (a = await a), a.issues.length ? it(e, a.issues, i) : {
		success: !0,
		data: a.value
	};
}, ot = /* @__PURE__ */ Symbol.for("zod.compile.invalid"), st = /* @__PURE__ */ Symbol.for("zod.compile.fallback"), ct = ((e, t, n) => {
	let r = e._zod.bag.validator;
	if (r !== void 0) {
		if (r(t) !== ot) return !0;
		if (r.definite === !0 && n === void 0) return !1;
	}
	return lt(e, t, n);
});
function lt(e, t, n) {
	let r = n ? {
		...n,
		async: !1,
		abortEarly: !0
	} : {
		async: !1,
		abortEarly: !0
	}, i = e._zod.bag.fallbackRun, a;
	if (i ? (r[st] = !0, a = i({
		value: t,
		issues: []
	}, r)) : a = e._zod.run({
		value: t,
		issues: []
	}, r), a instanceof Promise) throw new Ve();
	return a.issues.length === 0;
}
var ut = async (e, t, n) => {
	let r = n ? {
		...n,
		async: !0,
		abortEarly: !0
	} : {
		async: !0,
		abortEarly: !0
	}, i = e._zod.run({
		value: t,
		issues: []
	}, r);
	return i instanceof Promise && (i = await i), i.issues.length === 0;
}, dt = (e) => {
	let t = tt(e), n = (e, r, i, a) => {
		let o = i ? {
			...i,
			direction: "backward"
		} : { direction: "backward" };
		return t(e, r, o, et(n, a));
	};
	return n;
}, ft = (e) => {
	let t = tt(e), n = (e, r, i, a) => t(e, r, i, et(n, a));
	return n;
}, pt = (e) => {
	let t = nt(e), n = async (e, r, i, a) => {
		let o = i ? {
			...i,
			direction: "backward"
		} : { direction: "backward" };
		return await t(e, r, o, et(n, a));
	};
	return n;
}, mt = (e) => {
	let t = nt(e), n = async (e, r, i, a) => await t(e, r, i, et(n, a));
	return n;
}, ht = (e) => (t, n, r) => {
	let i = r ? {
		...r,
		direction: "backward"
	} : { direction: "backward" };
	return rt(e)(t, n, i);
}, gt = (e) => (t, n, r) => rt(e)(t, n, r), _t = (e) => async (t, n, r) => {
	let i = r ? {
		...r,
		direction: "backward"
	} : { direction: "backward" };
	return at(e)(t, n, i);
}, vt = (e) => async (t, n, r) => at(e)(t, n, r), yt = /^[cC][0-9a-z]{6,}$/, bt = /^[0-9a-z]+$/, xt = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/, St = /^[0-9a-vA-V]{20}$/, Ct = /^[A-Za-z0-9]{27}$/, wt = /^[a-zA-Z0-9_-]{21}$/;
function Tt(e) {
	return RegExp(`^[a-zA-Z0-9_-]{${e}}$`);
}
var Et = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, Dt = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, Ot = (e) => e ? RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, kt = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, At = "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
function jt() {
	return new RegExp(At, "u");
}
var Mt = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, Nt = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/, Pt = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, Ft = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, It = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, Lt = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/, Rt = /^https?$/, zt = /^\+[1-9]\d{6,14}$/, Bt = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
function Vt(e) {
	return RegExp(`^${e}$`);
}
var Ht = /*@__PURE__*/ Vt(Bt);
function Ut(e) {
	let t = "(?:[01]\\d|2[0-3]):[0-5]\\d";
	return typeof e.precision == "number" ? e.precision === -1 ? `${t}` : e.precision === 0 ? `${t}:[0-5]\\d` : `${t}:[0-5]\\d\\.\\d{${e.precision}}` : e.seconds ? `${t}:[0-5]\\d(?:\\.\\d+)?` : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function Wt(e) {
	return RegExp(`^${Ut(e)}$`);
}
function Gt(e) {
	let t = ["Z"];
	e.offset && t.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
	let n = `${Ut({
		precision: e.precision,
		seconds: !0
	})}(?:${t.join("|")})`, r = e.local ? `${n}|${Ut({ precision: e.precision })}` : n;
	return RegExp(`^${Bt}T(?:${r})$`);
}
var Kt = /^[\s\S]{0,}$/, qt = /^-?\d+$/, Jt = /^-?\d+(?:\.\d+)?$/, Yt = /^(?:true|false)$/i, Xt = /^null$/i, Zt = /^[^A-Z]*$/, Qt = /^[^a-z]*$/, j = /*@__PURE__*/ A("$ZodCheck", (e, t) => {
	var n;
	e._zod ??= {}, e._zod.def = t, (n = e._zod).onattach ?? (n.onattach = []);
}), $t = (e) => {
	let t = e.value;
	return !a(t) && t.length !== void 0;
}, en = {
	number: "number",
	bigint: "bigint",
	object: "date"
}, tn = /*@__PURE__*/ A("$ZodCheckLessThan", (e, t) => {
	j.init(e, t);
	let n = en[typeof t.value];
	e._zod.check = (r) => {
		(t.inclusive ? r.value <= t.value : r.value < t.value) || r.issues.push({
			origin: en[typeof r.value] ?? n,
			code: "too_big",
			maximum: typeof t.value == "object" ? t.value.getTime() : t.value,
			input: r.value,
			inclusive: t.inclusive,
			inst: e,
			continue: !t.abort
		});
	};
}), nn = /*@__PURE__*/ A("$ZodCheckGreaterThan", (e, t) => {
	j.init(e, t);
	let n = en[typeof t.value];
	e._zod.check = (r) => {
		(t.inclusive ? r.value >= t.value : r.value > t.value) || r.issues.push({
			origin: en[typeof r.value] ?? n,
			code: "too_small",
			minimum: typeof t.value == "object" ? t.value.getTime() : t.value,
			input: r.value,
			inclusive: t.inclusive,
			inst: e,
			continue: !t.abort
		});
	};
}), rn = /*@__PURE__*/ A("$ZodCheckMultipleOf", (e, t) => {
	j.init(e, t), e._zod.check = (n) => {
		if (typeof n.value != typeof t.value) throw Error("Cannot mix number and bigint in multiple_of check.");
		(typeof n.value == "bigint" ? t.value !== BigInt(0) && n.value % t.value === BigInt(0) : s(n.value, t.value) === 0) || n.issues.push({
			origin: typeof n.value,
			code: "not_multiple_of",
			divisor: t.value,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), an = /*@__PURE__*/ A("$ZodCheckNumberFormat", (e, t) => {
	j.init(e, t), t.format = t.format || "float64";
	let n = t.format?.includes("int"), r = n ? "int" : "number", [i, a] = re[t.format];
	e._zod.check = (o) => {
		let s = o.value;
		if (n) {
			if (!Number.isInteger(s)) {
				o.issues.push({
					expected: r,
					format: t.format,
					code: "invalid_type",
					continue: !1,
					input: s,
					inst: e
				});
				return;
			}
			if (!Number.isSafeInteger(s)) {
				s > 0 ? o.issues.push({
					input: s,
					code: "too_big",
					maximum: 2 ** 53 - 1,
					note: "Integers must be within the safe integer range.",
					inst: e,
					origin: r,
					inclusive: !0,
					continue: !t.abort
				}) : o.issues.push({
					input: s,
					code: "too_small",
					minimum: -(2 ** 53 - 1),
					note: "Integers must be within the safe integer range.",
					inst: e,
					origin: r,
					inclusive: !0,
					continue: !t.abort
				});
				return;
			}
		}
		s < i && o.issues.push({
			origin: "number",
			input: s,
			code: "too_small",
			minimum: i,
			inclusive: !0,
			inst: e,
			continue: !t.abort
		}), s > a && o.issues.push({
			origin: "number",
			input: s,
			code: "too_big",
			maximum: a,
			inclusive: !0,
			inst: e,
			continue: !t.abort
		});
	};
}), on = /*@__PURE__*/ A("$ZodCheckMaxLength", (e, t) => {
	var n;
	j.init(e, t), (n = e._zod.def).when ?? (n.when = $t), e._zod.check = (n) => {
		let r = n.value, i = r.length;
		if ((typeof r == "string" && i > t.maximum ? xe(r) : i) <= t.maximum) return;
		let a = Se(r);
		n.issues.push({
			origin: a,
			code: "too_big",
			maximum: t.maximum,
			inclusive: !0,
			input: r,
			inst: e,
			continue: !t.abort
		});
	};
}), sn = /*@__PURE__*/ A("$ZodCheckMinLength", (e, t) => {
	var n;
	j.init(e, t), (n = e._zod.def).when ?? (n.when = $t), e._zod.check = (n) => {
		let r = n.value, i = r.length;
		if ((typeof r == "string" && i >= t.minimum && i < t.minimum * 2 ? xe(r) : i) >= t.minimum) return;
		let a = Se(r);
		n.issues.push({
			origin: a,
			code: "too_small",
			minimum: t.minimum,
			inclusive: !0,
			input: r,
			inst: e,
			continue: !t.abort
		});
	};
}), cn = /*@__PURE__*/ A("$ZodCheckLengthEquals", (e, t) => {
	var n;
	j.init(e, t), (n = e._zod.def).when ?? (n.when = $t), e._zod.check = (n) => {
		let r = n.value, i = r.length, a = typeof r == "string" && i >= t.length && i <= t.length * 2 ? xe(r) : i;
		if (a === t.length) return;
		let o = Se(r), s = a > t.length;
		n.issues.push({
			origin: o,
			...s ? {
				code: "too_big",
				maximum: t.length
			} : {
				code: "too_small",
				minimum: t.length
			},
			inclusive: !0,
			exact: !0,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), ln = /*@__PURE__*/ A("$ZodCheckStringFormat", (e, t) => {
	var n, r;
	j.init(e, t), t.pattern ? (n = e._zod).check ?? (n.check = (n) => {
		t.pattern.lastIndex = 0, !t.pattern.test(n.value) && n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: t.format,
			input: n.value,
			...t.pattern ? { pattern: t.pattern.toString() } : {},
			inst: e,
			continue: !t.abort
		});
	}) : (r = e._zod).check ?? (r.check = () => {});
}), un = /*@__PURE__*/ A("$ZodCheckRegex", (e, t) => {
	ln.init(e, t), e._zod.check = (n) => {
		t.pattern.lastIndex = 0, !t.pattern.test(n.value) && n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: n.value,
			pattern: t.pattern.toString(),
			inst: e,
			continue: !t.abort
		});
	};
}), dn = /*@__PURE__*/ A("$ZodCheckLowerCase", (e, t) => {
	t.pattern ??= Zt, ln.init(e, t);
}), fn = /*@__PURE__*/ A("$ZodCheckUpperCase", (e, t) => {
	t.pattern ??= Qt, ln.init(e, t);
}), pn = /*@__PURE__*/ A("$ZodCheckIncludes", (e, t) => {
	j.init(e, t);
	let n = T(t.includes);
	t.pattern = new RegExp(typeof t.position == "number" ? `^.{${t.position},}${n}` : n), e._zod.check = (n) => {
		n.value.includes(t.includes, t.position) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: t.includes,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), mn = /*@__PURE__*/ A("$ZodCheckStartsWith", (e, t) => {
	j.init(e, t);
	let n = RegExp(`^${T(t.prefix)}.*`);
	t.pattern ??= n, e._zod.check = (n) => {
		n.value.startsWith(t.prefix) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: t.prefix,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), hn = /*@__PURE__*/ A("$ZodCheckEndsWith", (e, t) => {
	j.init(e, t);
	let n = RegExp(`.*${T(t.suffix)}$`);
	t.pattern ??= n, e._zod.check = (n) => {
		n.value.endsWith(t.suffix) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: t.suffix,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), gn = /*@__PURE__*/ A("$ZodCheckOverwrite", (e, t) => {
	j.init(e, t), e._zod.check = (e) => {
		e.value = t.tx(e.value);
	};
}), _n = class {
	constructor(e = [], t = {}) {
		this.content = [], this.indent = 0, this.args = e, this.closed = t;
	}
	indented(e) {
		this.indent += 1;
		try {
			e(this);
		} finally {
			--this.indent;
		}
	}
	write(e) {
		if (typeof e == "function") {
			e(this, { execution: "sync" }), e(this, { execution: "async" });
			return;
		}
		let t = e.split("\n").filter((e) => e), n = Math.min(...t.map((e) => e.length - e.trimStart().length)), r = t.map((e) => e.slice(n)).map((e) => " ".repeat(this.indent * 2) + e);
		for (let e of r) this.content.push(e);
	}
	compile() {
		let e = Function, t = this?.content ?? [""];
		return new e(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {\n${t.join("\n")}\n};`)(...Object.values(this.closed));
	}
}, vn = {
	major: 4,
	minor: 6,
	patch: 7
}, M = /*@__PURE__*/ A("$ZodType", (e, t) => {
	var n;
	e ??= {}, e._zod.def = t, e._zod.bag = e._zod.bag || {}, e._zod.version = vn;
	let r = e._zod.def.checks, i = e._zod.traits.has("$ZodCheck") ? [e, ...r ?? []] : r?.length ? [...r] : [];
	for (let t of i) for (let n of t._zod.onattach) n(e);
	if (i.length === 0) (n = e._zod).deferred ?? (n.deferred = []), e._zod.deferred?.push(() => {
		e._zod.run = e._zod.parse;
	});
	else {
		let t = (t, n, r) => {
			if (t.memo) return t;
			let i = pe(t), a;
			for (let o of n) {
				if (o._zod.def.when) {
					if (me(t) || !o._zod.def.when(t)) continue;
				} else if (i) continue;
				let n = t.issues.length, s = o._zod.check(t);
				if (s instanceof Promise && r?.async === !1) throw new Ve();
				if (a || s instanceof Promise) a = (a ?? Promise.resolve()).then(async () => {
					await s, t.issues.length !== n && (ve(t.issues, n, e), i ||= pe(t, n));
				});
				else {
					if (t.issues.length === n) continue;
					ve(t.issues, n, e), i ||= pe(t, n);
				}
			}
			return a ? a.then(() => t) : t;
		}, n = (n, r, a) => {
			if (pe(n)) return n.aborted = !0, n;
			let o = t(r, i, a);
			if (o instanceof Promise) {
				if (a.async === !1) throw new Ve();
				return o.then((t) => e._zod.parse(t, a));
			}
			return e._zod.parse(o, a);
		};
		e._zod.run = (r, a) => {
			if (a.skipChecks) return e._zod.parse(r, a);
			if (a.direction === "backward") {
				let t = e._zod.parse({
					value: r.value,
					issues: []
				}, {
					...a,
					skipChecks: !0
				});
				return t instanceof Promise ? t.then((e) => n(e, r, a)) : n(t, r, a);
			}
			let o = e._zod.parse(r, a);
			if (o instanceof Promise) {
				if (a.async === !1) throw new Ve();
				return o.then((e) => t(e, i, a));
			}
			return t(o, i, a);
		};
	}
}, {
	get "~standard"() {
		return De(this, "~standard", xn(this));
	},
	set "~standard"(e) {
		Ee(this, "~standard", e);
	}
}), yn = (e, t) => e.issues.length ? { issues: e.issues.map((e) => ye(e, t, We())) } : { value: e.value };
async function bn(e, t) {
	let n = { async: !0 };
	return yn(await e._zod.run({
		value: t,
		issues: []
	}, n), n);
}
function xn(e) {
	return {
		validate: (t) => {
			let n = { async: !1 };
			try {
				let r = e._zod.run({
					value: t,
					issues: []
				}, n);
				if (!(r instanceof Promise)) return yn(r, n);
			} catch {}
			return bn(e, t);
		},
		vendor: "zod",
		version: 1
	};
}
var Sn = /*@__PURE__*/ A("$ZodString", (e, t) => {
	M.init(e, t), e._zod.pattern = t.pattern ?? Kt, e._zod.parse = (n, r) => {
		if (t.coerce) try {
			n.value = String(n.value);
		} catch {}
		return typeof n.value == "string" || n.issues.push({
			expected: "string",
			code: "invalid_type",
			input: n.value,
			inst: e
		}), n;
	};
}), N = /*@__PURE__*/ A("$ZodStringFormat", (e, t) => {
	ln.init(e, t), Sn.init(e, t);
}), Cn = /*@__PURE__*/ A("$ZodGUID", (e, t) => {
	t.pattern ??= Dt, N.init(e, t);
}), wn = /*@__PURE__*/ A("$ZodUUID", (e, t) => {
	if (t.version) {
		let e = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		}[t.version];
		if (e === void 0) throw Error(`Invalid UUID version: "${t.version}"`);
		t.pattern ??= Ot(e);
	} else t.pattern ??= Ot();
	N.init(e, t);
}), Tn = /*@__PURE__*/ A("$ZodEmail", (e, t) => {
	t.pattern ??= kt, N.init(e, t);
});
function En(e) {
	try {
		return typeof URL < "u" && typeof URL.canParse == "function" ? URL.canParse(e) : (new URL(e), !0);
	} catch {
		return !1;
	}
}
function Dn(e, t) {
	return !("normalize" in t) && !("hostname" in t) && !("protocol" in t) ? En(e) || 2 : On(e, t);
}
function On(e, t) {
	if (!t.normalize && t.protocol?.source === Rt.source && !/^https?:\/\//i.test(e)) return 1;
	try {
		if (typeof URL < "u") {
			let t = URL;
			if (typeof t.parse == "function") return t.parse(e) ?? 2;
		}
		return new URL(e);
	} catch {
		return 2;
	}
}
var kn = /[\t\n\r]/g;
function An(e) {
	return e.replace(kn, "");
}
function jn(e, t) {
	return t.lastIndex = 0, t.test(e.hostname);
}
function Mn(e, t) {
	return t.lastIndex = 0, t.test(e.protocol.endsWith(":") ? e.protocol.slice(0, -1) : e.protocol);
}
var Nn = /*@__PURE__*/ A("$ZodURL", (e, t) => {
	N.init(e, t), e._zod.check = (n) => {
		try {
			let r = n.value.trim(), i = Dn(r, t);
			if (i === 1) {
				n.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid URL format",
					input: n.value,
					inst: e,
					continue: !t.abort
				});
				return;
			}
			if (i === 2) {
				n.issues.push({
					code: "invalid_format",
					format: "url",
					input: n.value,
					inst: e,
					continue: !t.abort
				});
				return;
			}
			if (i === !0) {
				n.value = An(r);
				return;
			}
			t.hostname && !jn(i, t.hostname) && n.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid hostname",
				pattern: t.hostname.source,
				input: n.value,
				inst: e,
				continue: !t.abort
			}), t.protocol && !Mn(i, t.protocol) && n.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid protocol",
				pattern: t.protocol.source,
				input: n.value,
				inst: e,
				continue: !t.abort
			}), n.value = t.normalize ? i.href : An(r);
			return;
		} catch {
			n.issues.push({
				code: "invalid_format",
				format: "url",
				input: n.value,
				inst: e,
				continue: !t.abort
			});
		}
	};
}), Pn = /*@__PURE__*/ A("$ZodEmoji", (e, t) => {
	t.pattern ??= jt(), N.init(e, t);
}), Fn = /*@__PURE__*/ A("$ZodNanoID", (e, t) => {
	if (t.length !== void 0 && (!Number.isInteger(t.length) || t.length < 1)) throw Error(`Invalid nanoid length: ${t.length}`);
	t.pattern ??= t.length === void 0 ? wt : Tt(t.length), N.init(e, t);
}), In = /*@__PURE__*/ A("$ZodCUID", (e, t) => {
	t.pattern ??= yt, N.init(e, t);
}), Ln = /*@__PURE__*/ A("$ZodCUID2", (e, t) => {
	t.pattern ??= bt, N.init(e, t);
}), Rn = /*@__PURE__*/ A("$ZodULID", (e, t) => {
	t.pattern ??= xt, N.init(e, t);
}), zn = /*@__PURE__*/ A("$ZodXID", (e, t) => {
	t.pattern ??= St, N.init(e, t);
}), Bn = /*@__PURE__*/ A("$ZodKSUID", (e, t) => {
	t.pattern ??= Ct, N.init(e, t);
}), Vn = /*@__PURE__*/ A("$ZodISODateTime", (e, t) => {
	t.pattern ??= Gt(t), N.init(e, t);
}), Hn = /*@__PURE__*/ A("$ZodISODate", (e, t) => {
	t.pattern ??= Ht, N.init(e, t);
}), Un = /*@__PURE__*/ A("$ZodISOTime", (e, t) => {
	t.pattern ??= Wt(t), N.init(e, t);
}), Wn = /*@__PURE__*/ A("$ZodISODuration", (e, t) => {
	t.pattern ??= Et, N.init(e, t);
}), Gn = /*@__PURE__*/ A("$ZodIPv4", (e, t) => {
	t.pattern ??= Mt, N.init(e, t);
}), Kn = /^[0-9a-fA-F:.]+$/;
function qn(e) {
	return Kn.test(e) ? En(`http://[${e}]`) : !1;
}
var Jn = /*@__PURE__*/ A("$ZodIPv6", (e, t) => {
	t.pattern ??= Nt, N.init(e, t), e._zod.check = (n) => {
		qn(n.value) || n.issues.push({
			code: "invalid_format",
			format: "ipv6",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Yn = /*@__PURE__*/ A("$ZodCIDRv4", (e, t) => {
	t.pattern ??= Pt, N.init(e, t);
});
function Xn(e) {
	let t = e.split("/");
	if (t.length !== 2) return !1;
	let [n, r] = t;
	if (!r) return !1;
	let i = Number(r);
	return `${i}` !== r || i < 0 || i > 128 ? !1 : qn(n);
}
var Zn = /*@__PURE__*/ A("$ZodCIDRv6", (e, t) => {
	t.pattern ??= Ft, N.init(e, t), e._zod.check = (n) => {
		Xn(n.value) || n.issues.push({
			code: "invalid_format",
			format: "cidrv6",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
});
function Qn(e) {
	if (e === "") return !0;
	if (/\s/.test(e) || e.length % 4 != 0) return !1;
	try {
		return atob(e), !0;
	} catch {
		return !1;
	}
}
var $n = /^[0-9a-zA-Z+/]*={0,2}$/, er = /*@__PURE__*/ A("$ZodBase64", (e, t) => {
	t.pattern ??= $n, N.init(e, t), e._zod.check = (n) => {
		Qn(n.value) || n.issues.push({
			code: "invalid_format",
			format: "base64",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), tr = /^[A-Za-z0-9_-]*$/;
function nr(e) {
	if (!tr.test(e)) return !1;
	let t = e.replace(/[-_]/g, (e) => e === "-" ? "+" : "/");
	return Qn(t.padEnd(Math.ceil(t.length / 4) * 4, "="));
}
var rr = /*@__PURE__*/ A("$ZodBase64URL", (e, t) => {
	t.pattern ??= tr, N.init(e, t), e._zod.check = (n) => {
		nr(n.value) || n.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), ir = /*@__PURE__*/ A("$ZodE164", (e, t) => {
	t.pattern ??= zt, N.init(e, t);
});
function ar(e, t = null) {
	try {
		let n = e.split(".");
		if (n.length !== 3) return !1;
		let [r] = n;
		if (!r) return !1;
		let i = JSON.parse(atob(r));
		return !("typ" in i && i?.typ !== "JWT" || !i.alg || t && (!("alg" in i) || i.alg !== t));
	} catch {
		return !1;
	}
}
var or = /*@__PURE__*/ A("$ZodJWT", (e, t) => {
	N.init(e, t), e._zod.check = (n) => {
		ar(n.value, t.alg) || n.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), sr = /*@__PURE__*/ A("$ZodNumber", (e, t) => {
	M.init(e, t), e._zod.pattern = Jt, e._zod.parse = (n, r) => {
		if (t.coerce) try {
			n.value = Number(n.value);
		} catch {}
		let i = n.value;
		if (typeof i == "number" && !Number.isNaN(i) && Number.isFinite(i)) return n;
		let a = typeof i == "number" ? Number.isNaN(i) ? "NaN" : Number.isFinite(i) ? void 0 : String(i) : void 0;
		return n.issues.push({
			expected: "number",
			code: "invalid_type",
			input: i,
			inst: e,
			...a ? { received: a } : {}
		}), n;
	};
}), cr = /*@__PURE__*/ A("$ZodNumberFormat", (e, t) => {
	an.init(e, t), sr.init(e, t);
}), lr = /*@__PURE__*/ A("$ZodBoolean", (e, t) => {
	M.init(e, t), e._zod.pattern = Yt, e._zod.parse = (n, r) => {
		if (t.coerce) try {
			n.value = !!n.value;
		} catch {}
		let i = n.value;
		return typeof i == "boolean" || n.issues.push({
			expected: "boolean",
			code: "invalid_type",
			input: i,
			inst: e
		}), n;
	};
}), ur = /*@__PURE__*/ A("$ZodNull", (e, t) => {
	M.init(e, t), e._zod.pattern = Xt, e._zod.values = /* @__PURE__ */ new Set([null]), e._zod.parse = (t, n) => {
		let r = t.value;
		return r === null || t.issues.push({
			expected: "null",
			code: "invalid_type",
			input: r,
			inst: e
		}), t;
	};
}), dr = /*@__PURE__*/ A("$ZodUnknown", (e, t) => {
	M.init(e, t), e._zod.parse = (e) => e;
}), fr = /*@__PURE__*/ A("$ZodNever", (e, t) => {
	M.init(e, t), e._zod.parse = (t, n) => (t.issues.push({
		expected: "never",
		code: "invalid_type",
		input: t.value,
		inst: e
	}), t);
});
function pr(e, t) {
	let n = _e(e._zod.def.checks);
	if (!n.length) return;
	let r = Math.min(...n.map((e) => e[0])), i = e._zod.parse;
	e._zod.parse = (n, a) => {
		let o = t(n.value);
		if (o > r && !a?.skipChecks && a?.direction !== "backward") {
			for (let [t, r] of _e(e._zod.def.checks)) if (o > t && r._zod.def.when(n)) {
				let t = n.issues.length;
				return r._zod.check(n), n.issues[t].continue = !1, ve(n.issues, t, e), n;
			}
		}
		return i(n, a);
	};
}
var mr = (e) => Array.isArray(e) ? e.length : -1;
function hr(e, t, n) {
	e.issues.length && t.issues.push(...he(n, e.issues)), t.value[n] = e.value;
}
var gr = /*@__PURE__*/ A("$ZodArray", (e, t) => {
	M.init(e, t);
	let n = Ue.memoizer;
	n?.attach(e), e._zod.parse = (r, i) => {
		let a = r.value;
		if (!Array.isArray(a)) return r.issues.push({
			expected: "array",
			code: "invalid_type",
			input: a,
			inst: e
		}), r;
		r.value = n ? n.alloc(e, r, Array(a.length), i) : Array(a.length);
		let o = [], s = i?.abortEarly;
		for (let e = 0; e < a.length; e++) {
			let n = a[e], c = t.element._zod.run({
				value: n,
				issues: []
			}, i);
			if (c instanceof Promise) o.push(c.then((t) => hr(t, r, e)));
			else if (hr(c, r, e), s && c.issues.length !== 0 && pe(c)) break;
		}
		return o.length ? Promise.all(o).then(() => r) : r;
	}, pr(e, mr);
});
function _r(e, t, n, r, i, a) {
	let o = n in r, s = a === "optional";
	if (o || !s || i !== "optional") {
		if (e.issues.length) {
			if (i !== void 0 && s && !o) return;
			t.issues.push(...he(n, e.issues));
		}
		!o && i === void 0 ? e.issues.length || t.issues.push({
			code: "invalid_type",
			expected: "nonoptional",
			input: void 0,
			path: [n]
		}) : e.value === void 0 ? (o || i === "defaulted" && !s) && (t.value[n] = void 0) : t.value[n] = e.value;
	}
}
var vr = [];
function yr(e) {
	let t = Object.keys(e.shape), n = Object.getOwnPropertySymbols(e.shape), r = n.length ? n : vr, i = r.length ? [...t, ...r] : t;
	for (let t of i) if (!e.shape?.[t]?._zod?.traits?.has("$ZodType")) throw Error(`Invalid element at key "${String(t)}": expected a Zod schema`);
	let a = ne(e.shape);
	return {
		...e,
		allKeys: i,
		symbolKeys: r,
		keySet: new Set(t),
		numKeys: t.length,
		optionalKeys: new Set(a)
	};
}
function br(e, t, n, r, i, a, o) {
	let s = [], c = i.keySet, l = i.catchall._zod, u = l.def.type, d = l.optin, f = l.optout, p = 0;
	for (let i in t) {
		if (o && n.issues.length !== p) {
			if (pe(n, p)) break;
			p = n.issues.length;
		}
		if (c.has(i)) continue;
		if (i === "__proto__") {
			u === "never" && s.push(i);
			continue;
		}
		if (u === "never") {
			s.push(i);
			continue;
		}
		let a = l.run({
			value: t[i],
			issues: []
		}, r);
		a instanceof Promise ? e.push(a.then((e) => _r(e, n, i, t, d, f))) : _r(a, n, i, t, d, f);
	}
	return s.length && n.issues.push({
		code: "unrecognized_keys",
		keys: s,
		input: t,
		inst: a,
		continue: !0
	}), e.length ? Promise.all(e).then(() => n) : n;
}
var xr = /*@__PURE__*/ A("$ZodObject", (e, t) => {
	M.init(e, t);
	let n = Object.getOwnPropertyDescriptor(t, "shape"), r = n?.get ? n.get.raw : t.shape ?? {};
	if (r) {
		let e = () => {
			let n = { ...r };
			return Object.defineProperty(t, "shape", { value: n }), e.raw = n, n;
		};
		e.raw = r, Object.defineProperty(t, "shape", { get: e });
	}
	let a = i(() => yr(t));
	k(e, "propValues", (e) => {
		let t = e.def.shape, n = {};
		for (let e in t) {
			let r = t[e]._zod;
			if (r.values) {
				Object.prototype.hasOwnProperty.call(n, e) || u(n, e, /* @__PURE__ */ new Set());
				for (let t of r.values) n[e].add(t);
				r.optin !== void 0 && n[e].add(void 0);
			}
		}
		return n;
	});
	let o = x, s = t.catchall, c, l = Ue.memoizer;
	l?.attach(e), e._zod.parse = (t, n) => {
		c ??= a.value;
		let r = t.value;
		if (!o(r)) return t.issues.push({
			expected: "object",
			code: "invalid_type",
			input: r,
			inst: e
		}), t;
		t.value = l ? l.alloc(e, t, {}, n) : {};
		let i = [], u = c.shape, d = n?.abortEarly, f = t.issues.length;
		for (let e of c.allKeys) {
			if (d && t.issues.length !== f) {
				if (pe(t, f)) break;
				f = t.issues.length;
			}
			if (e === "__proto__") continue;
			let a = u[e], o = a._zod.optin, s = a._zod.optout, c = a._zod.run({
				value: r[e],
				issues: []
			}, n);
			c instanceof Promise ? i.push(c.then((n) => _r(n, t, e, r, o, s))) : _r(c, t, e, r, o, s);
		}
		return s ? br(i, r, t, n, a.value, e, d === !0) : i.length ? Promise.all(i).then(() => t) : t;
	};
}), Sr = /*@__PURE__*/ A("$ZodObjectJIT", (e, t) => {
	xr.init(e, t);
	let n = e._zod.parse, r = i(() => yr(t)), a = Ue.memoizer, o = (t) => {
		let n = r.value, i = n.symbolKeys, o = new _n(["payload", "ctx"], {
			shape: t,
			inst: e,
			memo: a,
			syms: i
		}), s = (e) => `shape[${e}]._zod.run({ value: input[${e}], issues: [] }, ctx)`, c = (e, t) => `
          let ${e}_ab = false;
          for (let i = 0; i < ${e}.issues.length; i++) {
            const iss = ${e}.issues[i];
            iss.path = iss.path ? [${t}, ...iss.path] : [${t}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${e}_ab = true;
          }
          if (${e}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
		o.write("const input = payload.value;");
		let l = Object.create(null), u = 0;
		for (let e of n.allKeys) l[e] = `key_${u++}`;
		o.write(a ? "const newResult = memo.alloc(inst, payload, {}, ctx);" : "const newResult = {};");
		for (let e of n.allKeys) {
			if (e === "__proto__") continue;
			let n = l[e], r = typeof e == "symbol" ? `syms[${i.indexOf(e)}]` : v(e), a = `${r} in input`, u = t[e], d = u?._zod?.optin, f = d !== void 0, p = u?._zod?.optout === "optional";
			if (o.write(`const ${n} = ${s(r)};`), f && p) {
				let e = d === "optional" ? `${n}_present` : `${n}.value !== undefined || ${n}_present`;
				o.write(`
        const ${n}_present = ${a};
        if (!${n}.issues.length || ${n}_present) {
          if (${n}.issues.length) {${c(n, r)}
          }

          if (${e}) {
            newResult[${r}] = ${n}.value;
          }
        }

      `);
			} else f ? (o.write(`
        if (${n}.issues.length) {${c(n, r)}
        }
      `), d === "defaulted" ? o.write(`newResult[${r}] = ${n}.value;`) : o.write(`
        if (${n}.value !== undefined || ${a}) {
          newResult[${r}] = ${n}.value;
        }
      `)) : o.write(`
        const ${n}_present = ${a};
        if (${n}.issues.length) {${c(n, r)}
        }
        if (!${n}_present && !${n}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${r}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${n}_present) {
          newResult[${r}] = ${n}.value;
        }

      `);
		}
		return o.write("payload.value = newResult;"), o.write("return payload;"), o.compile();
	}, s, c = x, l = !Ue.jitless, u = l && S.value, d = t.catchall, f;
	e._zod.parse = (i, a) => {
		f ??= r.value;
		let p = i.value;
		return c(p) ? l && u && a?.async === !1 && a.jitless !== !0 ? (s ||= o(t.shape), i = s(i, a), d ? br([], p, i, a, f, e, a?.abortEarly === !0) : i) : n(i, a) : (i.issues.push({
			expected: "object",
			code: "invalid_type",
			input: p,
			inst: e
		}), i);
	};
});
function Cr(e, t, n, r) {
	for (let n of e) if (n.issues.length === 0) return t.value = n.value, t;
	let i = e.filter((e) => !pe(e));
	return i.length === 1 ? (t.value = i[0].value, i[0]) : (t.issues.push({
		code: "invalid_union",
		input: t.value,
		inst: n,
		errors: e.map((e) => e.issues.map((e) => ye(e, r, We())))
	}), t);
}
var wr = /*@__PURE__*/ A("$ZodUnion", (e, t) => {
	M.init(e, t), k(e, "optin", (e) => e.def.options.some((e) => e._zod.optin === "defaulted") ? "defaulted" : e.def.options.some((e) => e._zod.optin !== void 0) ? "optional" : void 0), k(e, "optout", (e) => e.def.options.some((e) => e._zod.optout === "optional") ? "optional" : void 0), k(e, "values", (e) => {
		if (e.def.options.every((e) => e._zod.values)) return new Set(e.def.options.flatMap((e) => Array.from(e._zod.values)));
	}), k(e, "pattern", (e) => {
		if (e.def.options.every((e) => e._zod.pattern)) {
			let t = e.def.options.map((e) => e._zod.pattern);
			return RegExp(`^(${t.map((e) => o(e.source)).join("|")})$`);
		}
	});
	let n = t.options.length === 1 ? t.options[0]._zod.run : null;
	e._zod.parse = (r, i) => {
		if (n) return n(r, i);
		let a = !1, o = [];
		for (let e of t.options) {
			let t = e._zod.run({
				value: r.value,
				issues: []
			}, i);
			if (t instanceof Promise) o.push(t), a = !0;
			else {
				if (t.issues.length === 0) return t;
				o.push(t);
			}
		}
		return a ? Promise.all(o).then((t) => Cr(t, r, e, i)) : Cr(o, r, e, i);
	};
});
function Tr(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e.options) {
		let r = n._zod.propValues?.[e.discriminator];
		if (!r || r.size === 0) throw Error(`Invalid discriminated union option at index "${e.options.indexOf(n)}"`);
		for (let e of r) if (t.has(e)) {
			if (e !== void 0) throw Error(`Duplicate discriminator value "${String(e)}"`);
			t.set(e, null);
		} else t.set(e, n);
	}
	return t;
}
var Er = /*@__PURE__*/ A("$ZodDiscriminatedUnion", (e, t) => {
	t.inclusive = !1, wr.init(e, t);
	let n = e._zod.parse;
	k(e, "propValues", (e) => {
		let t = {}, n = 0;
		for (let r of e.def.options) {
			let i = r._zod.propValues;
			if (!i || Object.keys(i).length === 0) throw Error(`Invalid discriminated union option at index "${e.def.options.indexOf(r)}"`);
			i[e.def.discriminator]?.has(void 0) && n++;
			for (let [e, n] of Object.entries(i)) {
				Object.prototype.hasOwnProperty.call(t, e) || u(t, e, /* @__PURE__ */ new Set());
				for (let r of n) t[e].add(r);
			}
		}
		return !e.def.unionFallback && n > 1 && t[e.def.discriminator]?.delete(void 0), t;
	}), t.options.forEach((e, n) => {
		let r = d(e._zod.def);
		if (r && !Object.prototype.hasOwnProperty.call(r, t.discriminator)) throw Error(`Invalid discriminated union option at index "${n}"`);
	});
	let r = i(() => Tr(t));
	e._zod.parse = (i, a) => {
		let o = i.value;
		if (!x(o)) return i.issues.push({
			code: "invalid_type",
			expected: "object",
			input: o,
			inst: e
		}), i;
		let s = o?.[t.discriminator], c = r.value.get(s);
		return c && (s !== void 0 || a.direction !== "backward") ? c._zod.run(i, a) : t.unionFallback || a.direction === "backward" ? n(i, a) : (i.issues.push({
			code: "invalid_union",
			errors: [],
			note: "No matching discriminator",
			discriminator: t.discriminator,
			options: Array.from(r.value.keys()).filter((e) => r.value.get(e) !== null),
			input: o,
			path: [t.discriminator],
			inst: e
		}), i);
	};
}), Dr = /*@__PURE__*/ A("$ZodIntersection", (e, t) => {
	M.init(e, t), e._zod.parse = (e, n) => {
		let r = e.value, i = t.left._zod.run({
			value: r,
			issues: []
		}, n), a = t.right._zod.run({
			value: r,
			issues: []
		}, n);
		return i instanceof Promise || a instanceof Promise ? Promise.all([i, a]).then(([t, n]) => kr(e, t, n)) : kr(e, i, a);
	};
});
function Or(e, t) {
	if (e === t || e instanceof Date && t instanceof Date && +e == +t) return {
		valid: !0,
		data: e
	};
	if (C(e) && C(t)) {
		let n = Object.keys(t), r = Object.keys(e).filter((e) => n.indexOf(e) !== -1), i = {
			...e,
			...t
		};
		Object.prototype.hasOwnProperty.call(i, "__proto__") && delete i.__proto__;
		for (let n of r) {
			if (n === "__proto__") continue;
			let r = Or(e[n], t[n]);
			if (!r.valid) return {
				valid: !1,
				mergeErrorPath: [n, ...r.mergeErrorPath]
			};
			i[n] = r.data;
		}
		return {
			valid: !0,
			data: i
		};
	}
	if (Array.isArray(e) && Array.isArray(t)) {
		if (e.length !== t.length) return {
			valid: !1,
			mergeErrorPath: []
		};
		let n = [];
		for (let r = 0; r < e.length; r++) {
			let i = e[r], a = t[r], o = Or(i, a);
			if (!o.valid) return {
				valid: !1,
				mergeErrorPath: [r, ...o.mergeErrorPath]
			};
			n.push(o.data);
		}
		return {
			valid: !0,
			data: n
		};
	}
	return {
		valid: !1,
		mergeErrorPath: []
	};
}
function kr(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i, a = /* @__PURE__ */ new Map(), o = (e, t) => {
		let n;
		if (e.code === "unrecognized_keys" && !e.path?.length) i ??= e, n = e.keys;
		else if (e.code === "invalid_key" && e.origin === "record" && e.path?.length === 1) {
			let t = String(e.path[0]);
			a.has(t) || a.set(t, e), n = [t];
		} else return !1;
		for (let e of n) r.has(e) || r.set(e, {}), r.get(e)[t] = !0;
		return !0;
	};
	for (let n of t.issues) o(n, "l") || e.issues.push(n);
	for (let t of n.issues) o(t, "r") || e.issues.push(t);
	let s = [...r].filter(([, e]) => e.l && e.r).map(([e]) => e);
	if (s.length) {
		let t = i ? s.filter((e) => i.keys.includes(e)) : [];
		t.length && e.issues.push({
			...i,
			keys: t
		});
		for (let n of s) !t.includes(n) && a.has(n) && e.issues.push(a.get(n));
	}
	let c = Or(t.value, n.value);
	if (!c.valid) {
		if (pe(e)) return e;
		throw Error(`Unmergable intersection. Error path: ${JSON.stringify(c.mergeErrorPath)}`);
	}
	return e.value = c.data, e;
}
var Ar = /*@__PURE__*/ A("$ZodTuple", (e, t) => {
	M.init(e, t);
	let n = t.items, r = Ue.memoizer;
	r?.attach(e), e._zod.parse = (i, a) => {
		let o = i.value;
		if (!Array.isArray(o)) return i.issues.push({
			input: o,
			inst: e,
			expected: "tuple",
			code: "invalid_type"
		}), i;
		i.value = r ? r.alloc(e, i, [], a) : [];
		let s = [], c = jr(n, "optin"), l = jr(n, "optout");
		if (!t.rest) {
			if (o.length < c) return i.issues.push({
				code: "too_small",
				minimum: c,
				inclusive: !0,
				input: o,
				inst: e,
				origin: "array"
			}), i;
			o.length > n.length && i.issues.push({
				code: "too_big",
				maximum: n.length,
				inclusive: !0,
				input: o,
				inst: e,
				origin: "array"
			});
		}
		let u = Array(n.length), d = t.rest ? a?.abortEarly : void 0, f = !1;
		for (let e = 0; e < n.length; e++) {
			let t = n[e]._zod.run({
				value: o[e],
				issues: []
			}, a);
			t instanceof Promise ? s.push(t.then((t) => {
				u[e] = t;
			})) : (u[e] = t, d && !f && t.issues.length && (f = pe(t)));
		}
		if (t.rest && !f) {
			let e = n.length - 1, r = o.slice(n.length), c = i.issues.length;
			for (let n of r) {
				if (d && i.issues.length !== c) {
					if (pe(i, c)) break;
					c = i.issues.length;
				}
				e++;
				let r = t.rest._zod.run({
					value: n,
					issues: []
				}, a);
				r instanceof Promise ? s.push(r.then((t) => Mr(t, i, e))) : Mr(r, i, e);
			}
		}
		return s.length ? Promise.all(s).then(() => Nr(u, i, n, o, l)) : Nr(u, i, n, o, l);
	};
});
function jr(e, t) {
	for (let n = e.length - 1; n >= 0; n--) if (!(t === "optin" ? e[n]._zod.optin !== void 0 : e[n]._zod.optout === "optional")) return n + 1;
	return 0;
}
function Mr(e, t, n) {
	e.issues.length && t.issues.push(...he(n, e.issues)), t.value[n] = e.value;
}
function Nr(e, t, n, r, i) {
	for (let a = 0; a < n.length; a++) {
		let o = e[a], s = a < r.length;
		if (!s && a >= i && n[a]._zod.optin === "optional") {
			t.value.length = a;
			break;
		}
		if (o.issues.length) {
			if (!s && a >= i) {
				t.value.length = a;
				break;
			}
			t.issues.push(...he(a, o.issues));
		}
		t.value[a] = o.value;
	}
	for (let e = t.value.length - 1; e >= r.length && n[e]._zod.optout === "optional" && t.value[e] === void 0; e--) t.value.length = e;
	return t;
}
var Pr = /*@__PURE__*/ A("$ZodRecord", (e, t) => {
	M.init(e, t);
	let n = Ue.memoizer;
	n?.attach(e), e._zod.parse = (r, i) => {
		let a = r.value;
		if (!C(a)) return r.issues.push({
			expected: "record",
			code: "invalid_type",
			input: a,
			inst: e
		}), r;
		let o = [], s = t.keyType._zod.values;
		if (s && !t.partial) {
			r.value = n ? n.alloc(e, r, {}, i) : {};
			let c = /* @__PURE__ */ new Set();
			for (let n of s) if (typeof n == "string" || typeof n == "number" || typeof n == "symbol") {
				if (c.add(typeof n == "number" ? n.toString() : n), n === "__proto__") continue;
				let s = t.keyType._zod.run({
					value: n,
					issues: []
				}, i);
				if (s instanceof Promise) throw Error("Async schemas not supported in object keys currently");
				if (s.issues.length) {
					r.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: s.issues.map((e) => ye(e, i, We())),
						input: n,
						path: [n],
						inst: e
					});
					continue;
				}
				let l = s.value;
				if (l === "__proto__") continue;
				let u = t.valueType._zod.run({
					value: a[n],
					issues: []
				}, i);
				u instanceof Promise ? o.push(u.then((e) => {
					e.issues.length && r.issues.push(...he(n, e.issues)), r.value[l] = e.value;
				})) : (u.issues.length && r.issues.push(...he(n, u.issues)), r.value[l] = u.value);
			}
			let l;
			for (let e in a) if (!c.has(e)) {
				if (t.mode === "loose") {
					if (e === "__proto__") continue;
					r.value[e] = a[e];
				} else l ??= [], l.push(e);
			}
			l && l.length > 0 && r.issues.push({
				code: "unrecognized_keys",
				input: a,
				inst: e,
				keys: l,
				continue: !0
			});
		} else {
			r.value = n ? n.alloc(e, r, {}, i) : {};
			let c;
			for (let n of Reflect.ownKeys(a)) {
				if (n === "__proto__" || !Object.prototype.propertyIsEnumerable.call(a, n)) continue;
				let l = t.keyType._zod.run({
					value: n,
					issues: []
				}, i);
				if (l instanceof Promise) throw Error("Async schemas not supported in object keys currently");
				if (typeof n == "string" && Jt.test(n) && l.issues.length) {
					let e = t.keyType._zod.run({
						value: Number(n),
						issues: []
					}, i);
					if (e instanceof Promise) throw Error("Async schemas not supported in object keys currently");
					e.issues.length === 0 && (l = e);
				}
				if (l.issues.length) {
					t.mode === "loose" ? r.value[n] = a[n] : s ? (c ??= [], c.push(n)) : r.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: l.issues.map((e) => ye(e, i, We())),
						input: n,
						path: [n],
						inst: e
					});
					continue;
				}
				let u = l.value;
				if (u === "__proto__") continue;
				let d = t.valueType._zod.run({
					value: a[n],
					issues: []
				}, i);
				d instanceof Promise ? o.push(d.then((e) => {
					e.issues.length && r.issues.push(...he(n, e.issues)), r.value[u] = e.value;
				})) : (d.issues.length && r.issues.push(...he(n, d.issues)), r.value[u] = d.value);
			}
			c && c.length > 0 && r.issues.push({
				code: "unrecognized_keys",
				input: a,
				inst: e,
				keys: c,
				continue: !0
			});
		}
		return o.length ? Promise.all(o).then(() => r) : r;
	};
}), Fr = /*@__PURE__*/ A("$ZodEnum", (t, n) => {
	M.init(t, n);
	let r = e(n.entries), i = new Set(r);
	t._zod.values = i, k(t, "pattern", (t) => {
		let n = e(t.def.entries).filter((e) => w.has(typeof e));
		return RegExp(n.length ? `^(${n.map((e) => T(e.toString())).join("|")})$` : "^[^\\s\\S]$");
	}), t._zod.parse = (e, n) => {
		let a = e.value;
		return i.has(a) || e.issues.push({
			code: "invalid_value",
			values: r,
			input: a,
			inst: t
		}), e;
	};
}), Ir = /*@__PURE__*/ A("$ZodLiteral", (e, t) => {
	M.init(e, t);
	let n = new Set(t.values);
	e._zod.values = n, k(e, "pattern", (e) => {
		let t = e.def.values;
		return RegExp(t.length ? `^(${t.map((e) => typeof e == "string" ? T(e) : e ? T(e.toString()) : String(e)).join("|")})$` : "^[^\\s\\S]$");
	}), e._zod.parse = (r, i) => {
		let a = r.value;
		return n.has(a) || r.issues.push({
			code: "invalid_value",
			values: t.values,
			input: a,
			inst: e
		}), r;
	};
}), Lr = /*@__PURE__*/ A("$ZodTransform", (e, t) => {
	M.init(e, t), e._zod.optin = "optional", Ue.memoizer?.guard(e), e._zod.parse = (n, r) => {
		if (r.direction === "backward") throw new He(e.constructor.name);
		let i = t.transform(n.value, n);
		if (r.async) return (i instanceof Promise ? i : Promise.resolve(i)).then((e) => (n.value = e, n));
		if (i instanceof Promise) throw new Ve();
		return n.value = i, n;
	};
});
function Rr(e, t) {
	return e.value = t.issues.length ? void 0 : t.value, e;
}
var zr = /*@__PURE__*/ A("$ZodOptional", (e, t) => {
	M.init(e, t), k(e, "optin", (e) => e.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), e._zod.optout = "optional", k(e, "values", (e) => {
		let t = e.def.innerType._zod.values;
		return t ? /* @__PURE__ */ new Set([...t, void 0]) : void 0;
	}), k(e, "pattern", (e) => {
		let t = e.def.innerType._zod.pattern;
		return t ? RegExp(`^(${o(t.source)})?$`) : void 0;
	}), e._zod.parse = (e, n) => {
		if (e.value === void 0) {
			if (t.innerType._zod.optin !== "defaulted") return e;
			let r = t.innerType._zod.run({
				value: e.value,
				issues: []
			}, n);
			return r instanceof Promise ? r.then((t) => Rr(e, t)) : Rr(e, r);
		}
		return t.innerType._zod.run(e, n);
	};
}), Br = /*@__PURE__*/ A("$ZodExactOptional", (e, t) => {
	zr.init(e, t), k(e, "values", (e) => e.def.innerType._zod.values), k(e, "pattern", (e) => e.def.innerType._zod.pattern), e._zod.parse = (e, n) => t.innerType._zod.run(e, n);
}), Vr = /*@__PURE__*/ A("$ZodNullable", (e, t) => {
	M.init(e, t), k(e, "optin", (e) => e.def.innerType._zod.optin), k(e, "optout", (e) => e.def.innerType._zod.optout), k(e, "pattern", (e) => {
		let t = e.def.innerType._zod.pattern;
		return t ? RegExp(`^(${o(t.source)}|null)$`) : void 0;
	}), k(e, "values", (e) => e.def.innerType._zod.values ? /* @__PURE__ */ new Set([...e.def.innerType._zod.values, null]) : void 0), e._zod.parse = (e, n) => e.value === null ? e : t.innerType._zod.run(e, n);
}), Hr = /*@__PURE__*/ A("$ZodDefault", (e, t) => {
	M.init(e, t), e._zod.optin = "defaulted", k(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		if (e.value === void 0) return e.value = t.defaultValue, e;
		let r = t.innerType._zod.run(e, n);
		return r instanceof Promise ? r.then((e) => Ur(e, t)) : Ur(r, t);
	};
});
function Ur(e, t) {
	return e.value === void 0 && (e.value = t.defaultValue), e;
}
var Wr = /*@__PURE__*/ A("$ZodPrefault", (e, t) => {
	M.init(e, t), e._zod.optin = "defaulted", k(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => (n.direction === "backward" || e.value === void 0 && (e.value = t.defaultValue), t.innerType._zod.run(e, n));
}), Gr = /*@__PURE__*/ A("$ZodNonOptional", (e, t) => {
	M.init(e, t), k(e, "values", (e) => {
		let t = e.def.innerType._zod.values;
		return t ? new Set([...t].filter((e) => e !== void 0)) : void 0;
	}), e._zod.parse = (n, r) => {
		let i = t.innerType._zod.run(n, r);
		return i instanceof Promise ? i.then((t) => Kr(t, e)) : Kr(i, e);
	};
});
function Kr(e, t) {
	return !e.issues.length && e.value === void 0 && e.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: e.value,
		inst: t
	}), e;
}
function qr(e, t, n, r) {
	return t.issues.length ? (e.value = n.catchValue({
		...t,
		value: e.value,
		error: { issues: t.issues.map((e) => ye(e, r, We())) },
		input: e.value
	}), e) : (e.value = t.value, t.memo && (e.memo = !0), e);
}
var Jr = /*@__PURE__*/ A("$ZodCatch", (e, t) => {
	M.init(e, t), k(e, "optin", (e) => e.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), k(e, "optout", (e) => e.def.innerType._zod.optout), k(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		let r = t.innerType._zod.run({
			value: e.value,
			issues: []
		}, n);
		return r instanceof Promise ? r.then((r) => qr(e, r, t, n)) : qr(e, r, t, n);
	};
}), Yr = /*@__PURE__*/ A("$ZodPipe", (e, t) => {
	M.init(e, t), k(e, "values", (e) => e.def.in._zod.values), k(e, "optin", (e) => e.def.in._zod.optin), k(e, "optout", (e) => e.def.out._zod.optout), k(e, "propValues", (e) => e.def.in._zod.propValues), e._zod.parse = (e, n) => {
		if (n.direction === "backward") {
			let r = t.out._zod.run(e, n);
			return r instanceof Promise ? r.then((e) => Xr(e, t.in, n)) : Xr(r, t.in, n);
		}
		let r = t.in._zod.run(e, n);
		return r instanceof Promise ? r.then((e) => Xr(e, t.out, n)) : Xr(r, t.out, n);
	};
});
function Xr(e, t, n) {
	return e.issues.some((e) => e.code !== "unrecognized_keys") ? (e.aborted = !0, e) : t._zod.run({
		value: e.value,
		issues: e.issues
	}, n);
}
var Zr = /*@__PURE__*/ A("$ZodReadonly", (e, t) => {
	M.init(e, t), k(e, "propValues", (e) => e.def.innerType._zod.propValues), k(e, "values", (e) => e.def.innerType._zod.values), k(e, "optin", (e) => e.def.innerType?._zod?.optin), k(e, "optout", (e) => e.def.innerType?._zod?.optout), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		let r = t.innerType._zod.run(e, n);
		return r instanceof Promise ? r.then(Qr) : Qr(r);
	};
});
function Qr(e) {
	return e.memo || (e.value = Object.freeze(e.value)), e;
}
var $r = /*@__PURE__*/ A("$ZodLazy", (e, t) => {
	M.init(e, t), l(e._zod, "innerType", () => {
		let e = t;
		return e._cachedInner ||= t.getter(), e._cachedInner;
	}), k(e, "pattern", (e) => e.innerType?._zod?.pattern), k(e, "propValues", (e) => e.innerType?._zod?.propValues), k(e, "optin", (e) => e.innerType?._zod?.optin ?? void 0), k(e, "optout", (e) => e.innerType?._zod?.optout ?? void 0), e._zod.parse = (t, n) => e._zod.innerType._zod.run(t, n);
}), ei = /*@__PURE__*/ A("$ZodCustom", (e, t) => {
	j.init(e, t), M.init(e, t), e._zod.parse = (e, t) => e, e._zod.check = (n) => {
		let r = n.value, i = t.fn(r);
		if (i instanceof Promise) return i.then((t) => ti(t, n, r, e));
		ti(i, n, r, e);
	};
});
function ti(e, t, n, r) {
	if (!e) {
		let e = {
			code: "custom",
			input: n,
			inst: r,
			path: [...r._zod.def.path ?? []],
			continue: !r._zod.def.abort
		};
		r._zod.def.params && (e.params = r._zod.def.params), t.issues.push(we(e));
	}
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/memoizer.js
var ni = class extends Error {
	constructor() {
		super("Cannot parse a reference cycle that closes through a transform"), this.name = "ZodCyclicError";
	}
}, ri = "~memo", ii = [];
function ai(e) {
	return typeof e == "object" && !!e;
}
function oi(e) {
	return e.map((e) => e.path ? {
		...e,
		path: e.path.slice()
	} : { ...e });
}
var si = /*@__PURE__*/ new WeakMap(), ci = 0, li = 1, ui = 2;
function di(e, t, n) {
	let r = si.get(e);
	if (r !== void 0) return r ? ui : ci;
	if (t.has(e)) return ui;
	t.add(e);
	let i = ci, a = (e) => {
		if (i !== ui && e?._zod) {
			let r = di(e, t, n);
			r > i && (i = r);
		}
	}, o = (e, r) => {
		let i = ci;
		for (let a of Reflect.ownKeys(e)) {
			let o = Object.getOwnPropertyDescriptor(e, a);
			if (r && !o.enumerable) continue;
			let s = o.get ? li : o.value?._zod ? di(o.value, t, n) : ci;
			s > i && (i = s);
		}
		return i;
	}, s = (e) => {
		e > i && (i = e);
	}, c = e._zod.def;
	switch (c.type) {
		case "object": {
			let e = d(c);
			s(e ? o(e, !0) : li), a(c.catchall);
			break;
		}
		case "array":
			a(c.element);
			break;
		case "tuple":
			for (let e of c.items) a(e);
			a(c.rest);
			break;
		case "record":
		case "map":
			a(c.keyType), a(c.valueType);
			break;
		case "set":
			a(c.valueType);
			break;
		case "union":
			for (let e of c.options) a(e);
			break;
		case "intersection":
			a(c.left), a(c.right);
			break;
		case "optional":
		case "nullable":
		case "default":
		case "prefault":
		case "catch":
		case "readonly":
		case "nonoptional":
		case "promise":
		case "success":
			a(c.innerType);
			break;
		case "pipe":
			a(c.in), a(c.out);
			break;
		case "function":
			a(c.input), a(c.output);
			break;
		case "lazy": {
			let r = c._cachedInner ?? (n ? e._zod.innerType : void 0);
			s(r ? di(r, t, !1) : li);
			break;
		}
		case "template_literal":
		case "string":
		case "number":
		case "int":
		case "boolean":
		case "bigint":
		case "symbol":
		case "undefined":
		case "null":
		case "void":
		case "never":
		case "any":
		case "unknown":
		case "date":
		case "nan":
		case "enum":
		case "literal":
		case "file":
		case "transform":
		case "custom": break;
		default: for (let e in c) {
			let t = Object.getOwnPropertyDescriptor(c, e);
			if (!t || t.get) continue;
			let n = t.value;
			if (n && typeof n == "object") {
				if (n._zod) a(n);
				else if (Array.isArray(n)) for (let e of n) a(e);
			}
		}
	}
	return t.delete(e), fi(e, i);
}
function fi(e, t) {
	return t !== li && si.set(e, t === ui), t;
}
function pi(e, t) {
	let n = e.buckets.get(t);
	return n || (n = /* @__PURE__ */ new WeakMap(), e.buckets.set(t, n)), n;
}
var mi, hi = [], gi = {
	alloc(e, t, n) {
		let r = mi;
		if (!r) return n;
		mi = void 0;
		let i = {
			value: n,
			issues: null
		};
		return r.set(t.value, i), hi.push(i), n;
	},
	guard(e) {
		var t;
		(t = e._zod).deferred ?? (t.deferred = []), e._zod.deferred.push(() => {
			let t = e._zod.parse, n = (e, n) => {
				if (n.direction !== "backward" && vi(n, e.value)) throw new ni();
				return t(e, n);
			};
			e._zod.parse = n, e._zod.run === t && (e._zod.run = n);
		});
	},
	attach(e) {
		var t;
		let n, r = !1, i, a;
		(t = e._zod).deferred ?? (t.deferred = []), e._zod.deferred.push(() => {
			let t = e._zod.parse, o = (s, c) => {
				if (n === void 0) {
					let i = di(e, /* @__PURE__ */ new Set(), !1);
					if (i === ci) return e._zod.parse = t, e._zod.run === o && (e._zod.run = t), t(s, c);
					i === ui || r ? n = !0 : r = !0;
				}
				let l = s.value;
				if (!ai(l)) return t(s, c);
				let u = c[ri];
				u || (u = {
					buckets: /* @__PURE__ */ new WeakMap(),
					backEdges: void 0
				}, c[ri] = u);
				let d;
				i === c ? d = a : (d = pi(u, e), i = c, a = d);
				let f = d.get(l);
				if (f) return s.value = f.value, f.issues ? f.issues.length && s.issues.push(...oi(f.issues)) : (s.memo = !0, u.backEdges ?? (u.backEdges = /* @__PURE__ */ new WeakSet()), u.backEdges.add(f.value)), s;
				mi = d;
				let p = hi.length, m = t(s, c);
				mi = void 0;
				let h = hi.length > p ? hi.pop() : void 0;
				return m instanceof Promise ? m.then((e) => (h && (h.issues = e.issues.length ? oi(e.issues) : ii), e)) : (h && (h.issues = m.issues.length ? oi(m.issues) : ii), m);
			};
			e._zod.parse = o, e._zod.run === t && (e._zod.run = o);
		});
	}
};
function _i() {
	return gi;
}
function vi(e, t) {
	let n = e[ri]?.backEdges;
	return n !== void 0 && ai(t) && n.has(t);
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/locales/en.js
var yi = () => {
	let e = {
		string: {
			unit: "characters",
			verb: "to have"
		},
		file: {
			unit: "bytes",
			verb: "to have"
		},
		array: {
			unit: "items",
			verb: "to have"
		},
		set: {
			unit: "items",
			verb: "to have"
		},
		map: {
			unit: "entries",
			verb: "to have"
		}
	};
	function n(t) {
		return e[t] ?? null;
	}
	let r = {
		regex: "input",
		email: "email address",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO datetime",
		date: "ISO date",
		time: "ISO time",
		duration: "ISO duration",
		ipv4: "IPv4 address",
		ipv6: "IPv6 address",
		mac: "MAC address",
		cidrv4: "IPv4 range",
		cidrv6: "IPv6 range",
		base64: "base64-encoded string",
		base64url: "base64url-encoded string",
		json_string: "JSON string",
		e164: "E.164 number",
		currency_code: "currency code",
		credit_card: "credit card number",
		iban: "IBAN",
		jwt: "JWT",
		template_literal: "input"
	}, i = { nan: "NaN" };
	function a(e, t) {
		return e === "number" && typeof t == "number" && !Number.isFinite(t) ? String(t) : i[e] ?? e;
	}
	return (e) => {
		switch (e.code) {
			case "invalid_type": return `Invalid input: expected ${a(e.expected)}, received ${a(Ce(e.input), e.input)}`;
			case "invalid_value": return e.values.length === 1 ? `Invalid input: expected ${te(e.values[0])}` : `Invalid option: expected one of ${t(e.values, "|")}`;
			case "too_big": {
				let t = e.exact ? "exactly " : e.inclusive ? "<=" : "<", r = n(e.origin);
				return r ? `Too big: expected ${e.origin ?? "value"} to have ${t}${e.maximum.toString()} ${r.unit ?? "elements"}` : `Too big: expected ${e.origin ?? "value"} to be ${t}${e.maximum.toString()}`;
			}
			case "too_small": {
				let t = e.exact ? "exactly " : e.inclusive ? ">=" : ">", r = n(e.origin);
				return r ? `Too small: expected ${e.origin} to have ${t}${e.minimum.toString()} ${r.unit}` : `Too small: expected ${e.origin} to be ${t}${e.minimum.toString()}`;
			}
			case "invalid_format": {
				let t = e;
				return t.format === "starts_with" ? `Invalid string: must start with "${t.prefix}"` : t.format === "ends_with" ? `Invalid string: must end with "${t.suffix}"` : t.format === "includes" ? `Invalid string: must include "${t.includes}"` : t.format === "regex" ? `Invalid string: must match pattern ${t.pattern}` : `Invalid ${r[t.format] ?? e.format}`;
			}
			case "not_multiple_of": return `Invalid number: must be a multiple of ${e.divisor}`;
			case "unrecognized_keys": return `Unrecognized key${e.keys.length > 1 ? "s" : ""}: ${t(e.keys, ", ")}`;
			case "invalid_key": return `Invalid key in ${e.origin}`;
			case "invalid_union": return e.options && Array.isArray(e.options) && e.options.length > 0 ? `Invalid discriminator value. Expected ${e.options.map((e) => `'${e}'`).join(" | ")}` : e.inclusive === !1 ? "Invalid input: more than one option matched" : "Invalid input";
			case "invalid_element": return `Invalid value in ${e.origin}`;
			default: return "Invalid input";
		}
	};
};
function bi() {
	return { localeError: yi() };
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/registries.js
var xi, Si = class {
	constructor() {
		this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map();
	}
	add(e, ...t) {
		let n = t[0];
		return this._map.set(e, n), n && typeof n == "object" && "id" in n && this._idmap.set(n.id, e), this;
	}
	clear() {
		return this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map(), this;
	}
	remove(e) {
		let t = this._map.get(e);
		return t && typeof t == "object" && "id" in t && this._idmap.delete(t.id), this._map.delete(e), this;
	}
	get(e) {
		let t = e._zod.parent;
		if (t) {
			let n = { ...this.get(t) ?? {} };
			delete n.id;
			let r = {
				...n,
				...this._map.get(e)
			};
			return Object.keys(r).length ? r : void 0;
		}
		return this._map.get(e);
	}
	has(e) {
		return this._map.has(e);
	}
};
function Ci() {
	return new Si();
}
(xi = globalThis).__zod_globalRegistry ?? (xi.__zod_globalRegistry = Ci());
var wi = globalThis.__zod_globalRegistry;
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/api.js
function Ti(e) {
	return e.checks &&= [...e.checks], e;
}
// @__NO_SIDE_EFFECTS__
function Ei(e, t) {
	return new e(Ti({
		type: "string",
		...D(t)
	}));
}
// @__NO_SIDE_EFFECTS__
function Di(e, t) {
	return new e({
		type: "string",
		format: "email",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Oi(e, t) {
	return new e({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ki(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ai(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v4",
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ji(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v6",
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Mi(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v7",
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ni(e, t) {
	return new e({
		type: "string",
		format: "url",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Pi(e, t) {
	return new e({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Fi(e, t) {
	return new e({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ii(e, t) {
	return new e({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Li(e, t) {
	return new e({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ri(e, t) {
	return new e({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function zi(e, t) {
	return new e({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Bi(e, t) {
	return new e({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Vi(e, t) {
	return new e({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Hi(e, t) {
	return new e({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ui(e, t) {
	return new e({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Wi(e, t) {
	return new e({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Gi(e, t) {
	return new e({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ki(e, t) {
	return new e({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function qi(e, t) {
	return new e({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ji(e, t) {
	return new e({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: !1,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Yi(e, t) {
	return new e({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: !1,
		local: !1,
		precision: null,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Xi(e, t) {
	return new e({
		type: "string",
		format: "date",
		check: "string_format",
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Zi(e, t) {
	return new e({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Qi(e, t) {
	return new e({
		type: "string",
		format: "duration",
		check: "string_format",
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function $i(e, t) {
	return new e(Ti({
		type: "number",
		checks: [],
		...D(t)
	}));
}
// @__NO_SIDE_EFFECTS__
function ea(e, t) {
	return new e({
		type: "number",
		check: "number_format",
		abort: !1,
		format: "safeint",
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ta(e, t) {
	return new e({
		type: "boolean",
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function na(e, t) {
	return new e({
		type: "null",
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ra(e) {
	return new e({ type: "unknown" });
}
// @__NO_SIDE_EFFECTS__
function ia(e, t) {
	return new e({
		type: "never",
		...D(t)
	});
}
// @__NO_SIDE_EFFECTS__
function aa(e, t) {
	return new tn({
		check: "less_than",
		...D(t),
		value: e,
		inclusive: !1
	});
}
// @__NO_SIDE_EFFECTS__
function oa(e, t) {
	return new tn({
		check: "less_than",
		...D(t),
		value: e,
		inclusive: !0
	});
}
// @__NO_SIDE_EFFECTS__
function sa(e, t) {
	return new nn({
		check: "greater_than",
		...D(t),
		value: e,
		inclusive: !1
	});
}
// @__NO_SIDE_EFFECTS__
function ca(e, t) {
	return new nn({
		check: "greater_than",
		...D(t),
		value: e,
		inclusive: !0
	});
}
// @__NO_SIDE_EFFECTS__
function la(e, t) {
	return new rn({
		check: "multiple_of",
		...D(t),
		value: e
	});
}
// @__NO_SIDE_EFFECTS__
function ua(e, t) {
	return new on({
		check: "max_length",
		...D(t),
		maximum: e
	});
}
// @__NO_SIDE_EFFECTS__
function da(e, t) {
	return new sn({
		check: "min_length",
		...D(t),
		minimum: e
	});
}
// @__NO_SIDE_EFFECTS__
function fa(e, t) {
	return new cn({
		check: "length_equals",
		...D(t),
		length: e
	});
}
// @__NO_SIDE_EFFECTS__
function pa(e, t) {
	return new un({
		check: "string_format",
		format: "regex",
		...D(t),
		pattern: e
	});
}
// @__NO_SIDE_EFFECTS__
function ma(e) {
	return new dn({
		check: "string_format",
		format: "lowercase",
		...D(e)
	});
}
// @__NO_SIDE_EFFECTS__
function ha(e) {
	return new fn({
		check: "string_format",
		format: "uppercase",
		...D(e)
	});
}
// @__NO_SIDE_EFFECTS__
function ga(e, t) {
	return new pn({
		check: "string_format",
		format: "includes",
		...D(t),
		includes: e
	});
}
// @__NO_SIDE_EFFECTS__
function _a(e, t) {
	return new mn({
		check: "string_format",
		format: "starts_with",
		...D(t),
		prefix: e
	});
}
// @__NO_SIDE_EFFECTS__
function va(e, t) {
	return new hn({
		check: "string_format",
		format: "ends_with",
		...D(t),
		suffix: e
	});
}
// @__NO_SIDE_EFFECTS__
function ya(e) {
	return new gn({
		check: "overwrite",
		tx: e
	});
}
// @__NO_SIDE_EFFECTS__
function ba(e) {
	return /* @__PURE__ */ ya((t) => t.normalize(e));
}
// @__NO_SIDE_EFFECTS__
function xa() {
	return /* @__PURE__ */ ya((e) => e.trim());
}
// @__NO_SIDE_EFFECTS__
function Sa() {
	return /* @__PURE__ */ ya((e) => e.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function Ca() {
	return /* @__PURE__ */ ya((e) => e.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function wa() {
	return /* @__PURE__ */ ya((e) => y(e));
}
// @__NO_SIDE_EFFECTS__
function Ta(e, t, n) {
	return new e({
		type: "array",
		element: t,
		...D(n)
	});
}
// @__NO_SIDE_EFFECTS__
function Ea(e, t, n) {
	return new e({
		type: "custom",
		check: "custom",
		fn: t,
		...D(n)
	});
}
// @__NO_SIDE_EFFECTS__
function Da(e, t) {
	let n = /* @__PURE__ */ Oa((t) => (t.addIssue = (e) => {
		if (typeof e == "string") t.issues.push(we(e, t.value, n._zod.def));
		else {
			let r = e;
			r.fatal && (r.continue = !1), r.code ??= "custom", "input" in r || (r.input = t.value), r.inst ??= n, r.continue ??= !n._zod.def.abort, t.issues.push(we(r));
		}
	}, e(t.value, t)), t);
	return n;
}
// @__NO_SIDE_EFFECTS__
function Oa(e, t) {
	let n = new j({
		check: "custom",
		...D(t)
	});
	return n._zod.check = e, n;
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/to-json-schema.js
function ka(e, ...t) {
	for (let n of t) for (let t of Reflect.ownKeys(n)) Object.prototype.propertyIsEnumerable.call(n, t) && u(e, t, n[t]);
	return e;
}
function Aa(e) {
	let t = e?.target ?? "draft-2020-12";
	return t === "draft-4" && (t = "draft-04"), t === "draft-7" && (t = "draft-07"), {
		processors: e.processors ?? {},
		metadataRegistry: e?.metadata ?? wi,
		target: t,
		unrepresentable: e?.unrepresentable ?? "throw",
		override: e?.override ?? (() => {}),
		io: e?.io ?? "output",
		counter: 0,
		seen: /* @__PURE__ */ new Map(),
		sharedDefsExtractedFor: void 0,
		sharedEmitDoneFor: void 0,
		cycles: e?.cycles ?? "ref",
		reused: e?.reused ?? "inline",
		intersections: [],
		deferred: [],
		external: e?.external ?? void 0
	};
}
function ja(e, t, n, r, i) {
	let a = typeof t.unrepresentable == "function" ? t.unrepresentable({
		zodSchema: e,
		path: r.path,
		message: i
	}) : t.unrepresentable;
	if (a === "any") return !1;
	if (a === void 0 || a === "throw") throw Error(i);
	return Object.assign(n, a), !0;
}
function P(e, t, n = {
	path: [],
	schemaPath: []
}) {
	var r;
	let i = e._zod.def, a = t.seen.get(e);
	if (a) return a.count++, n.schemaPath.includes(e) && (a.cycle = n.path), a.schema;
	let o = {
		schema: {},
		count: 1,
		cycle: void 0,
		path: n.path
	};
	t.seen.set(e, o), t.sharedDefsExtractedFor = void 0, t.sharedEmitDoneFor = void 0;
	let s = e._zod.toJSONSchema?.();
	if (s) o.schema = s;
	else {
		let r = {
			...n,
			schemaPath: [...n.schemaPath, e],
			path: n.path
		};
		if (e._zod.processJSONSchema) e._zod.processJSONSchema(t, o.schema, r);
		else {
			let n = o.schema, a = t.processors[i.type];
			if (!a) throw Error(`[toJSONSchema]: Non-representable type encountered: ${i.type}`);
			a(e, t, n, r);
		}
		let a = e._zod.parent;
		a && (o.ref ||= a, P(a, t, r), t.seen.get(a).isParent = !0);
	}
	let c = t.metadataRegistry.get(e);
	return c && ka(o.schema, c), t.io === "input" && F(e) && (delete o.schema.examples, delete o.schema.default), t.io === "input" && "_prefault" in o.schema && ((r = o.schema).default ?? (r.default = o.schema._prefault)), delete o.schema._prefault, t.seen.get(e).schema;
}
function Ma(e) {
	return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
function Na(e, t) {
	let n = e.seen.get(t);
	if (!n) throw Error("Unprocessed schema. This is a bug in Zod.");
	if (e.external && e.sharedDefsExtractedFor === e.external) return;
	let r = /* @__PURE__ */ new Map();
	for (let t of e.seen.entries()) {
		let n = e.metadataRegistry.get(t[0])?.id;
		if (n) {
			let e = r.get(n);
			if (e && e !== t[0]) throw Error(`Duplicate schema id "${n}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
			r.set(n, t[0]);
		}
	}
	let i = (t) => {
		let r = e.target === "draft-2020-12" ? "$defs" : "definitions";
		if (e.external) {
			let n = e.external.registry.get(t[0])?.id, i = e.external.uri ?? ((e) => e);
			if (n) return { ref: i(n) };
			let a = t[1].defId ?? t[1].schema.id ?? `schema${e.counter++}`;
			return t[1].defId = a, {
				defId: a,
				ref: `${i("__shared")}#/${r}/${Ma(a)}`
			};
		}
		let i = `#/${r}/`;
		if (t[1] === n && !t[1].schema.id) return { ref: "#" };
		let a = t[1].schema.id ?? `__schema${e.counter++}`;
		return {
			defId: a,
			ref: i + Ma(a)
		};
	}, a = (e) => {
		if (e[1].schema.$ref) return;
		let t = e[1], { ref: n, defId: r } = i(e);
		t.def = { ...t.schema }, r && (t.defId = r);
		let a = t.schema;
		for (let e in a) delete a[e];
		a.$ref = n;
	};
	if (e.cycles === "throw") for (let t of e.seen.entries()) {
		let e = t[1];
		if (e.cycle) throw Error(`Cycle detected: #/${e.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
	}
	for (let n of e.seen.entries()) {
		let r = n[1];
		if (t === n[0]) a(n);
		else {
			if (e.external) {
				let r = e.external.registry.get(n[0])?.id;
				if (t !== n[0] && r) {
					a(n);
					continue;
				}
			}
			(e.metadataRegistry.get(n[0])?.id || r.cycle || r.count > 1 && e.reused === "ref") && a(n);
		}
	}
	e.external && (e.sharedDefsExtractedFor = e.external);
}
function Pa(e) {
	let t = e.anyOf;
	if (!Array.isArray(t) || t.length === 0 || e.type !== void 0) return;
	let n = [];
	for (let e of t) {
		if (!e || typeof e != "object") return;
		Pa(e);
		let t = Object.keys(e);
		if (t.length !== 1 || t[0] !== "type") return;
		let r = e.type;
		for (let e of Array.isArray(r) ? r : [r]) {
			if (typeof e != "string") return;
			n.includes(e) || n.push(e);
		}
	}
	delete e.anyOf, e.type = n.length === 1 ? n[0] : n;
}
var Fa = /* @__PURE__ */ new Set([
	"type",
	"properties",
	"required",
	"additionalProperties"
]), Ia = ["oneOf", "anyOf"];
function La(e) {
	let t = e.additionalProperties;
	return t === void 0 || t === !1 || typeof t != "object" || !t ? null : Object.keys(t).length ? t : null;
}
function Ra(e) {
	let t = [];
	for (let n of e) {
		if (typeof n != "object" || n.type !== "object") return null;
		for (let e in n) if (!Fa.has(e)) return null;
		t.push(n);
	}
	let n = {}, r = /* @__PURE__ */ new Set();
	for (let e of t) {
		for (let r in e.properties) {
			if (Object.prototype.hasOwnProperty.call(n, r)) continue;
			let e = [];
			for (let n of t) {
				let t = n.properties?.[r] ?? La(n);
				t != null && (e.some((e) => JSON.stringify(e) === JSON.stringify(t)) || e.push(t));
			}
			u(n, r, e.length === 1 ? e[0] : Ra(e) ?? { allOf: e });
		}
		for (let t of e.required ?? []) r.add(t);
	}
	let i = {
		type: "object",
		properties: n
	};
	if (r.size && (i.required = [...r]), t.every((e) => e.additionalProperties === !1)) i.additionalProperties = !1;
	else {
		let e = [];
		for (let n of t) {
			let t = La(n);
			t && !e.some((e) => JSON.stringify(e) === JSON.stringify(t)) && e.push(t);
		}
		e.length === 1 ? i.additionalProperties = e[0] : e.length > 1 && (i.additionalProperties = { allOf: e });
	}
	return i;
}
function za(e) {
	let t = e.allOf;
	if (!Array.isArray(t) || t.length < 2) return;
	for (let t of Fa) if (t in e) return;
	let n = t.filter((e) => Ia.some((t) => Array.isArray(e[t]))), r = null;
	if (!n.length) r = Ra(t);
	else {
		let e = n[0], i = Ia.find((t) => Array.isArray(e[t]));
		if (Object.keys(e).length !== 1) return;
		let a = t.filter((t) => t !== e), o = e[i].map((e) => Ra([...a, e]));
		if (o.some((e) => !e)) return;
		r = { [i]: o };
	}
	r && (delete e.allOf, ka(e, r));
}
function Ba(e, t) {
	let n = e.seen.get(t);
	if (!n) throw Error("Unprocessed schema. This is a bug in Zod.");
	let r = (t) => {
		let n = e.seen.get(t);
		if (n.ref === null) return;
		let i = n.def ?? n.schema, a = { ...i }, o = n.ref;
		if (n.ref = null, o) {
			r(o);
			let n = e.seen.get(o), s = n.schema;
			if (s.$ref && (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0") ? (i.allOf = i.allOf ?? [], i.allOf.push(s)) : ka(i, s), ka(i, a), t._zod.parent === o) for (let e in i) e !== "$ref" && e !== "allOf" && (e in a || delete i[e]);
			if (s.$ref && n.def) for (let e in i) e !== "$ref" && e !== "allOf" && e in n.def && JSON.stringify(i[e]) === JSON.stringify(n.def[e]) && delete i[e];
		}
		let s = t._zod.parent;
		if (s && s !== o) {
			r(s);
			let t = e.seen.get(s);
			if (t?.schema.$ref && (i.$ref = t.schema.$ref, t.def)) for (let e in i) e !== "$ref" && e !== "allOf" && e in t.def && JSON.stringify(i[e]) === JSON.stringify(t.def[e]) && delete i[e];
		}
		e.override({
			zodSchema: t,
			jsonSchema: i,
			path: n.path ?? []
		});
	};
	if (!e.external || e.sharedEmitDoneFor !== e.external) {
		for (let t of [...e.seen.entries()].reverse()) r(t[0]);
		if (e.target !== "openapi-3.0") for (let t of e.seen.entries()) Pa(t[1].def ?? t[1].schema);
		for (let t of e.deferred) t();
		if (e.intersections.length) {
			let t = /* @__PURE__ */ new Map();
			for (let n of e.seen.values()) for (let e of [n.schema, n.def]) {
				let n = e?.allOf;
				if (!Array.isArray(n)) continue;
				let r = t.get(n);
				r ? r.push(e) : t.set(n, [e]);
			}
			for (let n of e.intersections) for (let e of t.get(n) ?? []) za(e);
		}
	}
	let i = {};
	if (e.target === "draft-2020-12" ? i.$schema = "https://json-schema.org/draft/2020-12/schema" : e.target === "draft-07" ? i.$schema = "http://json-schema.org/draft-07/schema#" : e.target === "draft-04" ? i.$schema = "http://json-schema.org/draft-04/schema#" : e.target, e.external?.uri) {
		let n = e.external.registry.get(t)?.id;
		if (!n) throw Error("Schema is missing an `id` property");
		i.$id = e.external.uri(n);
	}
	ka(i, n.defId ? n.schema : n.def ?? n.schema);
	let a = e.metadataRegistry.get(t)?.id;
	a !== void 0 && i.id === a && delete i.id;
	let o = e.external?.defs ?? {};
	if (!e.external || e.sharedEmitDoneFor !== e.external) for (let t of e.seen.entries()) {
		let e = t[1];
		e.def && e.defId && (e.def.id === e.defId && delete e.def.id, u(o, e.defId, e.def));
	}
	e.external && (e.sharedEmitDoneFor = e.external), e.external || Object.keys(o).length > 0 && (e.target === "draft-2020-12" ? i.$defs = o : i.definitions = o);
	try {
		let n = JSON.parse(JSON.stringify(i));
		return Object.defineProperty(n, "~standard", {
			value: {
				...t["~standard"],
				jsonSchema: {
					input: Ha(t, "input", e.processors),
					output: Ha(t, "output", e.processors)
				}
			},
			enumerable: !1,
			writable: !1
		}), n;
	} catch {
		throw Error("Error converting schema to JSON.");
	}
}
function F(e, t) {
	let n = t ?? { seen: /* @__PURE__ */ new Set() };
	if (n.seen.has(e)) return !1;
	n.seen.add(e);
	let r = e._zod.def;
	if (r.type === "transform") return !0;
	if (r.type === "array") return F(r.element, n);
	if (r.type === "set") return F(r.valueType, n);
	if (r.type === "lazy") return F(r.getter(), n);
	if (r.type === "promise" || r.type === "optional" || r.type === "nonoptional" || r.type === "nullable" || r.type === "readonly" || r.type === "default" || r.type === "prefault" || r.type === "catch") return F(r.innerType, n);
	if (r.type === "intersection") return F(r.left, n) || F(r.right, n);
	if (r.type === "record" || r.type === "map") return F(r.keyType, n) || F(r.valueType, n);
	if (r.type === "pipe") return e._zod.traits.has("$ZodCodec") ? !0 : F(r.in, n) || F(r.out, n);
	if (r.type === "object") {
		for (let e in r.shape) if (F(r.shape[e], n)) return !0;
		return !1;
	}
	if (r.type === "union") {
		for (let e of r.options) if (F(e, n)) return !0;
		return !1;
	}
	if (r.type === "tuple") {
		for (let e of r.items) if (F(e, n)) return !0;
		return !!(r.rest && F(r.rest, n));
	}
	return !1;
}
var Va = (e, t = {}) => (n) => {
	let r = Aa({
		...n,
		processors: t
	});
	return P(e, r), Na(r, e), Ba(r, e);
}, Ha = (e, t, n = {}) => (r) => {
	let { libraryOptions: i, target: a } = r ?? {}, o = Aa({
		...i ?? {},
		target: a,
		io: t,
		processors: n
	});
	return P(e, o), Na(o, e), Ba(o, e);
}, Ua = (e, t, n) => {
	(e[t] === void 0 || n > e[t]) && (e[t] = n);
}, Wa = (e, t, n) => {
	(e[t] === void 0 || n < e[t]) && (e[t] = n);
}, Ga = (e, t) => {
	Ua(e, "minimum", t), Wa(e, "maximum", t);
}, Ka = (e, t) => {
	e.multipleOf ??= [], e.multipleOf.includes(t) || e.multipleOf.push(t);
}, qa = (e, t) => {
	e.patterns ??= /* @__PURE__ */ new Set(), e.patterns.add(t);
}, Ja = (e, t) => {
	e.mime = e.mime ? e.mime.filter((e) => t.includes(e)) : [...t];
}, Ya = (e, t) => {
	e.format = t, t.includes("int") && (e.isInt = !0);
}, Xa = (e, t) => Ua(e, "minimum", t.minimum), Za = (e, t) => Wa(e, "maximum", t.maximum), Qa = (e) => (t, n) => {
	Ya(t, n.format);
	let [r, i] = e[n.format];
	Ua(t, "minimum", r), Wa(t, "maximum", i);
}, $a = {
	greater_than: (e, t) => Ua(e, t.inclusive ? "minimum" : "exclusiveMinimum", t.value),
	less_than: (e, t) => Wa(e, t.inclusive ? "maximum" : "exclusiveMaximum", t.value),
	multiple_of: (e, t) => Ka(e, t.value),
	number_format: Qa(re),
	bigint_format: Qa(ie),
	min_length: Xa,
	max_length: Za,
	length_equals: (e, t) => Ga(e, t.length),
	min_size: Xa,
	max_size: Za,
	size_equals: (e, t) => Ga(e, t.size),
	string_format: (e, t) => {
		Ya(e, t.format), t.pattern && qa(e, t.pattern), (t.format === "base64" || t.format === "base64url") && (e.contentEncoding = t.format), (t.local || t.precision === -1) && (e.laxFormat = !0);
	},
	mime_type: (e, t) => Ja(e, t.mime)
};
function eo(e) {
	let t = {}, n = e._zod.def, r = e._zod.traits.has("$ZodCheck") ? [e, ...n.checks ?? []] : n.checks ?? [];
	for (let e of r) $a[e._zod.def.check]?.(t, e._zod.def);
	let i = e._zod.bag;
	i.minimum !== void 0 && Ua(t, "minimum", i.minimum), i.exclusiveMinimum !== void 0 && Ua(t, "exclusiveMinimum", i.exclusiveMinimum), i.maximum !== void 0 && Wa(t, "maximum", i.maximum), i.exclusiveMaximum !== void 0 && Wa(t, "exclusiveMaximum", i.exclusiveMaximum), i.multipleOf !== void 0 && Ka(t, i.multipleOf), i.format !== void 0 && (t.format ??= i.format, i.format.includes("int") && (t.isInt = !0)), i.mime && Ja(t, i.mime);
	for (let e of i.patterns ?? []) qa(t, e);
	return t;
}
var to = {
	guid: "uuid",
	url: "uri",
	datetime: "date-time",
	json_string: "json-string",
	regex: ""
}, no = /* @__PURE__ */ new Map([[$n, It], [tr, Lt]]), ro = (e) => no.get(e) ?? e, io = (e, t, n, r) => {
	let i = n;
	i.type = "string";
	let { minimum: a, maximum: o, format: s, patterns: c, contentEncoding: l, laxFormat: u } = eo(e);
	if (typeof a == "number" && (i.minLength = a), typeof o == "number" && (i.maxLength = o), s && (i.format = to[s] ?? s, i.format === "" && delete i.format, (s === "time" || u) && delete i.format), l && (i.contentEncoding = l), c && c.size > 0) {
		let e = [...c].map(ro);
		e.length === 1 ? i.pattern = e[0].source : e.length > 1 && (i.allOf = [...e.map((e) => ({
			...t.target === "draft-07" || t.target === "draft-04" || t.target === "openapi-3.0" ? { type: "string" } : {},
			pattern: e.source
		}))]);
	}
}, ao = (e, t, n, r) => {
	let i = n, { minimum: a, maximum: o, multipleOf: s, exclusiveMaximum: c, exclusiveMinimum: l, isInt: u } = eo(e);
	i.type = u ? "integer" : "number";
	let d = typeof l == "number" && l >= (a ?? -Infinity), f = typeof c == "number" && c <= (o ?? Infinity), p = t.target === "draft-04" || t.target === "openapi-3.0";
	if (d ? p ? (i.minimum = l, i.exclusiveMinimum = !0) : i.exclusiveMinimum = l : typeof a == "number" && (i.minimum = a), f ? p ? (i.maximum = c, i.exclusiveMaximum = !0) : i.exclusiveMaximum = c : typeof o == "number" && (i.maximum = o), s) {
		let n = /* @__PURE__ */ new Set();
		for (let a of s) Number.isFinite(a) && a !== 0 ? n.add(Math.abs(a)) : ja(e, t, i, r, `A multipleOf divisor of ${a} cannot be represented in JSON Schema`);
		let [a, ...o] = n;
		a !== void 0 && (i.multipleOf = a), o.length && (i.allOf = [...i.allOf ?? [], ...o.map((e) => ({ multipleOf: e }))]);
	}
}, oo = (e, t, n, r) => {
	n.type = "boolean";
}, so = (e, t, n, r) => {
	t.target === "openapi-3.0" ? (n.type = "string", n.nullable = !0, n.enum = [null]) : n.type = "null";
}, co = (e, t, n, r) => {
	n.not = {};
}, lo = (t, n, r, i) => {
	let a = t._zod.def, o = e(a.entries);
	o.length === 0 ? r.not = {} : (o.every((e) => typeof e == "number") && (r.type = "number"), o.every((e) => typeof e == "string") && (r.type = "string"), r.enum = o);
}, uo = (e, t, n, r) => {
	let i = e._zod.def;
	if (i.values.length === 0) {
		n.not = {};
		return;
	}
	let a = [];
	for (let o of i.values) if (o === void 0) {
		if (ja(e, t, n, r, "Literal `undefined` cannot be represented in JSON Schema")) return;
	} else if (typeof o == "bigint") {
		if (ja(e, t, n, r, "BigInt literals cannot be represented in JSON Schema")) return;
		a.push(Number(o));
	} else a.push(o);
	if (a.length !== 0) {
		if (a.length === 1) {
			let e = a[0];
			n.type = e === null ? "null" : typeof e, t.target === "draft-04" || t.target === "openapi-3.0" ? n.enum = [e] : n.const = e;
		} else a.every((e) => typeof e == "number") && (n.type = "number"), a.every((e) => typeof e == "string") && (n.type = "string"), a.every((e) => typeof e == "boolean") && (n.type = "boolean"), a.every((e) => e === null) && (n.type = "null"), n.enum = a;
	}
}, fo = (e, t, n, r) => {
	ja(e, t, n, r, "Custom types cannot be represented in JSON Schema");
}, po = (e, t, n, r) => {
	ja(e, t, n, r, "Transforms cannot be represented in JSON Schema");
}, mo = (e, t, n, r) => {
	let i = n, a = e._zod.def, { minimum: o, maximum: s } = eo(e);
	typeof o == "number" && (i.minItems = o), typeof s == "number" && (i.maxItems = s), i.type = "array", i.items = P(a.element, t, {
		...r,
		path: [...r.path, "items"]
	});
};
function ho(e) {
	let t = e._zod.def;
	return t.type === "pipe" && t.in._zod.traits.has("$ZodTransform") ? ho(t.out) : t.type === "catch" ? ho(t.innerType) : e._zod.optin;
}
var go = (e, t, n, r) => {
	let i = n, a = e._zod.def, o = a.shape;
	if (Object.getOwnPropertySymbols(o).length && ja(e, t, i, r, "Symbol keys cannot be represented in JSON Schema")) return;
	i.type = "object", i.properties = {};
	for (let e in o) u(i.properties, e, P(o[e], t, {
		...r,
		path: [
			...r.path,
			"properties",
			e
		]
	}));
	let s = [];
	for (let e of Object.keys(o)) {
		let n = a.shape[e];
		(t.io === "input" ? ho(n) === void 0 : n._zod.optout === void 0) && s.push(e);
	}
	s.length > 0 && (i.required = s), a.catchall?._zod.def.type === "never" ? i.additionalProperties = !1 : a.catchall ? a.catchall && (i.additionalProperties = P(a.catchall, t, {
		...r,
		path: [...r.path, "additionalProperties"]
	})) : t.io === "output" && (i.additionalProperties = !1);
}, _o = (e, t, n, r) => {
	let i = e._zod.def, a = i.inclusive === !1, o = i.options.map((e, n) => P(e, t, {
		...r,
		path: [
			...r.path,
			a ? "oneOf" : "anyOf",
			n
		]
	}));
	a ? n.oneOf = o : n.anyOf = o;
}, vo = (e, t, n, r) => {
	let i = e._zod.def, a = P(i.left, t, {
		...r,
		path: [
			...r.path,
			"allOf",
			0
		]
	}), o = P(i.right, t, {
		...r,
		path: [
			...r.path,
			"allOf",
			1
		]
	}), s = (e) => "allOf" in e && Object.keys(e).length === 1, c = [...s(a) ? a.allOf : [a], ...s(o) ? o.allOf : [o]];
	n.allOf = c, t.intersections.push(c);
}, yo = (e, t, n, r) => {
	let i = n, a = e._zod.def;
	i.type = "array";
	let o = t.target === "draft-2020-12" ? "prefixItems" : "items", s = t.target === "draft-2020-12" || t.target === "openapi-3.0" ? "items" : "additionalItems", c = a.items.map((e, n) => P(e, t, {
		...r,
		path: [
			...r.path,
			o,
			n
		]
	})), l = a.rest ? P(a.rest, t, {
		...r,
		path: [
			...r.path,
			s,
			...t.target === "openapi-3.0" ? [a.items.length] : []
		]
	}) : null, u = a.items.length;
	for (; u > 0;) {
		let e = a.items[u - 1];
		if (!(t.io === "input" ? ho(e) !== void 0 : e._zod.optout === "optional")) break;
		u--;
	}
	let d = a.items.length, f = !a.rest;
	t.target === "draft-2020-12" ? (i.prefixItems = c, f ? i.items = !1 : l && (i.items = l), u > 0 && (i.minItems = u), f && (i.maxItems = d)) : t.target === "openapi-3.0" ? (i.items = { anyOf: c }, l && i.items.anyOf.push(l), u > 0 && (i.minItems = u), f && (i.maxItems = d)) : (i.items = c, f ? i.additionalItems = !1 : l && (i.additionalItems = l), u > 0 && (i.minItems = u), f && (i.maxItems = d));
	let { minimum: p, maximum: m } = eo(e);
	typeof p == "number" && (i.minItems = p), typeof m == "number" && (i.maxItems = m);
};
function bo(e, t, n) {
	if (t.$ref) {
		if (n.has(t)) return t;
		n.add(t);
		let r = e.get(t)?.def;
		if (!r) return t;
		let i = bo(e, r, n);
		return i === r ? t : i;
	}
	for (let r of ["anyOf", "oneOf"]) {
		let i = t[r];
		if (!Array.isArray(i)) continue;
		let a = i.map((t) => bo(e, t, n));
		a.some((e, t) => e !== i[t]) && (t = {
			...t,
			[r]: a
		});
	}
	let r = Array.isArray(t.type) ? t.type : [t.type], i = !r.includes("string") && r.some((e) => e === "number" || e === "integer"), a = t.enum ?? (t.const === void 0 ? void 0 : [t.const]);
	if (!i && !a?.some((e) => typeof e == "number")) return t;
	let { minimum: o, maximum: s, exclusiveMinimum: c, exclusiveMaximum: l, multipleOf: u, format: d, id: f, ...p } = t;
	return p.enum ? p.enum = p.enum.map((e) => typeof e == "number" ? String(e) : e) : typeof p.const == "number" && (p.const = String(p.const)), i && (p.type = "string", a || (p.pattern = (r.includes("number") ? Jt : qt).source)), p;
}
var xo = /* @__PURE__ */ new WeakMap();
function So(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e.seen.values()) n.def && !t.has(n.schema) && t.set(n.schema, n);
	let n = /* @__PURE__ */ new Map();
	for (let r of xo.get(e) ?? []) {
		let i = e.seen.get(r), a = (i?.def ?? i?.schema)?.propertyNames;
		if (!a || a === !0 || n.has(a)) continue;
		let o = bo(t, a, /* @__PURE__ */ new Set());
		o !== a && n.set(a, o);
	}
	if (n.size) for (let t of e.seen.values()) for (let e of [t.schema, t.def]) {
		let t = e && n.get(e.propertyNames);
		t && (e.propertyNames = t);
	}
}
var Co = (e, t, n, r) => {
	let i = n, a = e._zod.def;
	i.type = "object";
	let o = a.keyType, s = eo(o).patterns;
	if (a.mode === "loose" && s && s.size > 0) {
		let e = P(a.valueType, t, {
			...r,
			path: [
				...r.path,
				"patternProperties",
				"*"
			]
		});
		i.patternProperties = {};
		for (let t of s) u(i.patternProperties, ro(t).source, e);
	} else {
		if (t.target === "draft-07" || t.target === "draft-2020-12") {
			i.propertyNames = P(a.keyType, t, {
				...r,
				path: [...r.path, "propertyNames"]
			});
			let n = xo.get(t);
			n || (n = [], xo.set(t, n), t.deferred.push(() => So(t))), n.push(e);
		}
		i.additionalProperties = P(a.valueType, t, {
			...r,
			path: [...r.path, "additionalProperties"]
		});
	}
	let c = o._zod.values, l = t.io === "input" && ho(a.valueType) !== void 0;
	if (c && !a.partial && !l) {
		let e = [...c].filter((e) => typeof e == "string" || typeof e == "number");
		e.length > 0 && (i.required = e.map(String));
	}
}, wo = (e, t, n, r) => {
	let i = e._zod.def, a = P(i.innerType, t, r), o = t.seen.get(e);
	t.target === "openapi-3.0" ? (o.ref = i.innerType, n.nullable = !0) : n.anyOf = [a, { type: "null" }];
}, To = (e, t, n, r) => {
	let i = e._zod.def;
	P(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
}, Eo = Symbol();
function Do(e, t, n, r, i) {
	let a = !1, o = JSON.stringify(e, (e, t) => typeof t == "bigint" ? (a = !0, null) : t);
	return a ? (ja(t, n, r, i, "BigInt defaults cannot be represented in JSON Schema"), Eo) : JSON.parse(o);
}
var Oo = (e, t, n, r) => {
	let i = e._zod.def;
	P(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
	let o = Do(i.defaultValue, e, t, n, r);
	o !== Eo && (n.default = o);
}, ko = (e, t, n, r) => {
	let i = e._zod.def;
	P(i.innerType, t, r);
	let a = t.seen.get(e);
	if (a.ref = i.innerType, t.io !== "input") return;
	let o = Do(i.defaultValue, e, t, n, r);
	o !== Eo && (n._prefault = o);
}, Ao = (e, t, n, r) => {
	let i = e._zod.def;
	P(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
	let o;
	try {
		o = i.catchValue(void 0);
	} catch {
		ja(e, t, n, r, "Dynamic catch values are not supported in JSON Schema");
		return;
	}
	n.default = o;
}, jo = (e, t, n, r) => {
	let i = e._zod.def, a = i.in._zod.traits.has("$ZodTransform"), o = t.io === "input" ? a ? i.out : i.in : i.out;
	P(o, t, r);
	let s = t.seen.get(e);
	s.ref = o;
}, Mo = (e, t, n, r) => {
	let i = e._zod.def;
	P(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType, n.readOnly = !0;
}, No = (e, t, n, r) => {
	let i = e._zod.def;
	P(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
}, Po = (e, t, n, r) => {
	let i = e._zod.innerType;
	P(i, t, r);
	let a = t.seen.get(e);
	a.ref = i;
}, Fo = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
function Io(e, t, n) {
	Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !1,
		get() {
			let e = n(this);
			return Object.defineProperty(this, t, {
				value: e,
				configurable: !0,
				writable: !0
			}), e;
		},
		set(e) {
			Object.defineProperty(this, t, {
				value: e,
				configurable: !0,
				writable: !0
			});
		}
	});
}
var Lo = /*@__PURE__*/ A("ZodError", (e, t) => {
	Xe.init(e, t), e.name = "ZodError";
	let r = Object.getPrototypeOf(e);
	Fo.has(r) || (Fo.add(r), Io(r, "format", (e) => (t) => $e(e, t)), Io(r, "flatten", (e) => (t) => Qe(e, t)), Io(r, "addIssue", (e) => (t) => {
		e.issues.push(t), e.message = JSON.stringify(e.issues, n, 2);
	}), Io(r, "addIssues", (e) => (t) => {
		e.issues.push(...t), e.message = JSON.stringify(e.issues, n, 2);
	}), Object.defineProperty(r, "isEmpty", {
		configurable: !0,
		enumerable: !1,
		get() {
			return this.issues.length === 0;
		}
	}));
}, void 0, { Parent: Error }), Ro = /* @__PURE__ */ tt(Lo), zo = /* @__PURE__ */ nt(Lo), Bo = /* @__PURE__ */ rt(Lo), Vo = /* @__PURE__ */ at(Lo), Ho = /* @__PURE__ */ dt(Lo), Uo = /* @__PURE__ */ ft(Lo), Wo = /* @__PURE__ */ pt(Lo), Go = /* @__PURE__ */ mt(Lo), Ko = /* @__PURE__ */ ht(Lo), qo = /* @__PURE__ */ gt(Lo), Jo = /* @__PURE__ */ _t(Lo), Yo = /* @__PURE__ */ vt(Lo);
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/classic/schemas.js
function Xo() {
	Ue.localeError || We(bi());
}
function Zo() {
	Ue.memoizer || We({ memoizer: _i() });
}
var I = /*@__PURE__*/ A("ZodType", (e, t) => (Xo(), M.init(e, t), e.def = t, e.type = t.type, e), {
	check(...e) {
		let t = this.def;
		return this.clone(_(t, { checks: [...t.checks ?? [], ...e.map((e) => typeof e == "function" ? { _zod: {
			check: e,
			def: { check: "custom" },
			onattach: []
		} } : e)] }), { parent: !0 });
	},
	with(...e) {
		return this.check(...e);
	},
	clone(e, t) {
		return E(this, e, t);
	},
	brand() {
		return this;
	},
	register(e, t) {
		return e.add(this, t), this;
	},
	refine(e, t) {
		return this.check(mc(e, t));
	},
	superRefine(e, t) {
		return this.check(hc(e, t));
	},
	overwrite(e) {
		return this.check(/* @__PURE__ */ ya(e));
	},
	optional() {
		return Js(this);
	},
	exactOptional() {
		return Xs(this);
	},
	nullable() {
		return Qs(this);
	},
	nullish() {
		return Js(Qs(this));
	},
	nonoptional(e) {
		return ic(this, e);
	},
	array() {
		return H(this);
	},
	or(e) {
		return W([this, e]);
	},
	and(e) {
		return Rs(this, e);
	},
	transform(e) {
		return cc(this, Ks(e));
	},
	default(e) {
		return ec(this, e);
	},
	prefault(e) {
		return nc(this, e);
	},
	catch(e) {
		return oc(this, e);
	},
	pipe(e) {
		return cc(this, e);
	},
	readonly() {
		return uc(this);
	},
	describe(e) {
		let t = this.clone();
		return wi.add(t, { description: e }), t;
	},
	meta(...e) {
		if (e.length === 0) return wi.get(this);
		let t = this.clone();
		return wi.add(t, e[0]), t;
	},
	isOptional() {
		return this.safeParse(void 0).success;
	},
	isNullable() {
		return this.safeParse(null).success;
	},
	apply(e, ...t) {
		return t.length === 0 ? e(this) : e(this, ...t);
	},
	get "~standard"() {
		return De(this, "~standard", {
			...xn(this),
			jsonSchema: {
				input: Ha(this, "input"),
				output: Ha(this, "output")
			}
		});
	},
	set "~standard"(e) {
		Ee(this, "~standard", e);
	},
	parse: function e(t, n) {
		return Ro(this, t, n, { callee: e });
	},
	parseAsync: async function e(t, n) {
		return await zo(this, t, n, { callee: e });
	},
	safeParse(e, t) {
		return Bo(this, e, t);
	},
	async safeParseAsync(e, t) {
		return Vo(this, e, t);
	},
	get spa() {
		return this?.safeParseAsync;
	},
	set spa(e) {
		Ee(this, "spa", e);
	},
	validate(e, t) {
		return ct(this, e, t);
	},
	validateAsync(e, t) {
		return ut(this, e, t);
	},
	encode: function e(t, n) {
		return Ho(this, t, n, { callee: e });
	},
	decode: function e(t, n) {
		return Uo(this, t, n, { callee: e });
	},
	encodeAsync: async function e(t, n) {
		return await Wo(this, t, n, { callee: e });
	},
	decodeAsync: async function e(t, n) {
		return await Go(this, t, n, { callee: e });
	},
	safeEncode(e, t) {
		return Ko(this, e, t);
	},
	safeDecode(e, t) {
		return qo(this, e, t);
	},
	async safeEncodeAsync(e, t) {
		return Jo(this, e, t);
	},
	async safeDecodeAsync(e, t) {
		return Yo(this, e, t);
	},
	toJSONSchema(e) {
		return Va(this, {})(e);
	},
	get description() {
		return wi.get(this)?.description;
	},
	get _def() {
		return this._zod.def;
	}
}), Qo = /*@__PURE__*/ A("_ZodString", (e, t) => {
	Sn.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => io(e, t, n, r);
}, /*@__PURE__*/ Oe({
	format: (e) => eo(e).format ?? null,
	minLength: (e) => eo(e).minimum ?? null,
	maxLength: (e) => eo(e).maximum ?? null
}, {
	regex(...e) {
		return this.check(/* @__PURE__ */ pa(...e));
	},
	includes(...e) {
		return this.check(/* @__PURE__ */ ga(...e));
	},
	startsWith(...e) {
		return this.check(/* @__PURE__ */ _a(...e));
	},
	endsWith(...e) {
		return this.check(/* @__PURE__ */ va(...e));
	},
	min(...e) {
		return this.check(/* @__PURE__ */ da(...e));
	},
	max(...e) {
		return this.check(/* @__PURE__ */ ua(...e));
	},
	length(...e) {
		return this.check(/* @__PURE__ */ fa(...e));
	},
	nonempty(...e) {
		return this.check(/* @__PURE__ */ da(1, ...e));
	},
	lowercase(e) {
		return this.check(/* @__PURE__ */ ma(e));
	},
	uppercase(e) {
		return this.check(/* @__PURE__ */ ha(e));
	},
	trim() {
		return this.check(/* @__PURE__ */ xa());
	},
	normalize(...e) {
		return this.check(/* @__PURE__ */ ba(...e));
	},
	toLowerCase() {
		return this.check(/* @__PURE__ */ Sa());
	},
	toUpperCase() {
		return this.check(/* @__PURE__ */ Ca());
	},
	slugify() {
		return this.check(/* @__PURE__ */ wa());
	}
})), $o = /*@__PURE__*/ A("ZodString", (e, t) => {
	Sn.init(e, t), Qo.init(e, t);
}, {
	email(e) {
		return this.check(/* @__PURE__ */ Di(is, e));
	},
	url(e) {
		return this.check(/* @__PURE__ */ Ni(ss, e));
	},
	jwt(e) {
		return this.check(/* @__PURE__ */ Ji(Ss, e));
	},
	emoji(e) {
		return this.check(/* @__PURE__ */ Pi(cs, e));
	},
	guid(e) {
		return this.check(/* @__PURE__ */ Oi(as, e));
	},
	uuid(e) {
		return this.check(/* @__PURE__ */ ki(os, e));
	},
	uuidv4(e) {
		return this.check(/* @__PURE__ */ Ai(os, e));
	},
	uuidv6(e) {
		return this.check(/* @__PURE__ */ ji(os, e));
	},
	uuidv7(e) {
		return this.check(/* @__PURE__ */ Mi(os, e));
	},
	nanoid(e) {
		return this.check(/* @__PURE__ */ Fi(ls, e));
	},
	cuid(e) {
		return this.check(/* @__PURE__ */ Ii(us, e));
	},
	cuid2(e) {
		return this.check(/* @__PURE__ */ Li(ds, e));
	},
	ulid(e) {
		return this.check(/* @__PURE__ */ Ri(fs, e));
	},
	base64(e) {
		return this.check(/* @__PURE__ */ Gi(ys, e));
	},
	base64url(e) {
		return this.check(/* @__PURE__ */ Ki(bs, e));
	},
	xid(e) {
		return this.check(/* @__PURE__ */ zi(ps, e));
	},
	ksuid(e) {
		return this.check(/* @__PURE__ */ Bi(ms, e));
	},
	ipv4(e) {
		return this.check(/* @__PURE__ */ Vi(hs, e));
	},
	ipv6(e) {
		return this.check(/* @__PURE__ */ Hi(gs, e));
	},
	cidrv4(e) {
		return this.check(/* @__PURE__ */ Ui(_s, e));
	},
	cidrv6(e) {
		return this.check(/* @__PURE__ */ Wi(vs, e));
	},
	e164(e) {
		return this.check(/* @__PURE__ */ qi(xs, e));
	},
	datetime(e) {
		return this.check(/* @__PURE__ */ Yi(es, e));
	},
	date(e) {
		return this.check(/* @__PURE__ */ Xi(ts, e));
	},
	time(e) {
		return this.check(/* @__PURE__ */ Zi(ns, e));
	},
	duration(e) {
		return this.check(/* @__PURE__ */ Qi(rs, e));
	}
});
function L(e) {
	return /* @__PURE__ */ Ei($o, e);
}
var R = /*@__PURE__*/ A("ZodStringFormat", (e, t) => {
	N.init(e, t), Qo.init(e, t);
}), es = /*@__PURE__*/ A("ZodISODateTime", (e, t) => {
	Vn.init(e, t), R.init(e, t);
}), ts = /*@__PURE__*/ A("ZodISODate", (e, t) => {
	Hn.init(e, t), R.init(e, t);
}), ns = /*@__PURE__*/ A("ZodISOTime", (e, t) => {
	Un.init(e, t), R.init(e, t);
}), rs = /*@__PURE__*/ A("ZodISODuration", (e, t) => {
	Wn.init(e, t), R.init(e, t);
}), is = /*@__PURE__*/ A("ZodEmail", (e, t) => {
	Tn.init(e, t), R.init(e, t);
}), as = /*@__PURE__*/ A("ZodGUID", (e, t) => {
	Cn.init(e, t), R.init(e, t);
}), os = /*@__PURE__*/ A("ZodUUID", (e, t) => {
	wn.init(e, t), R.init(e, t);
}), ss = /*@__PURE__*/ A("ZodURL", (e, t) => {
	Nn.init(e, t), R.init(e, t);
}), cs = /*@__PURE__*/ A("ZodEmoji", (e, t) => {
	Pn.init(e, t), R.init(e, t);
}), ls = /*@__PURE__*/ A("ZodNanoID", (e, t) => {
	Fn.init(e, t), R.init(e, t);
}), us = /*@__PURE__*/ A("ZodCUID", (e, t) => {
	In.init(e, t), R.init(e, t);
}), ds = /*@__PURE__*/ A("ZodCUID2", (e, t) => {
	Ln.init(e, t), R.init(e, t);
}), fs = /*@__PURE__*/ A("ZodULID", (e, t) => {
	Rn.init(e, t), R.init(e, t);
}), ps = /*@__PURE__*/ A("ZodXID", (e, t) => {
	zn.init(e, t), R.init(e, t);
}), ms = /*@__PURE__*/ A("ZodKSUID", (e, t) => {
	Bn.init(e, t), R.init(e, t);
}), hs = /*@__PURE__*/ A("ZodIPv4", (e, t) => {
	Gn.init(e, t), R.init(e, t);
}), gs = /*@__PURE__*/ A("ZodIPv6", (e, t) => {
	Jn.init(e, t), R.init(e, t);
}), _s = /*@__PURE__*/ A("ZodCIDRv4", (e, t) => {
	Yn.init(e, t), R.init(e, t);
}), vs = /*@__PURE__*/ A("ZodCIDRv6", (e, t) => {
	Zn.init(e, t), R.init(e, t);
}), ys = /*@__PURE__*/ A("ZodBase64", (e, t) => {
	er.init(e, t), R.init(e, t);
}), bs = /*@__PURE__*/ A("ZodBase64URL", (e, t) => {
	rr.init(e, t), R.init(e, t);
}), xs = /*@__PURE__*/ A("ZodE164", (e, t) => {
	ir.init(e, t), R.init(e, t);
}), Ss = /*@__PURE__*/ A("ZodJWT", (e, t) => {
	or.init(e, t), R.init(e, t);
}), Cs = /*@__PURE__*/ A("ZodNumber", (e, t) => {
	sr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => ao(e, t, n, r), e.isFinite = !0;
}, /*@__PURE__*/ Oe({
	minValue: (e) => {
		let { minimum: t, exclusiveMinimum: n } = eo(e);
		return Math.max(t ?? -Infinity, n ?? -Infinity);
	},
	maxValue: (e) => {
		let { maximum: t, exclusiveMaximum: n } = eo(e);
		return Math.min(t ?? Infinity, n ?? Infinity);
	},
	isInt: (e) => {
		let { isInt: t, multipleOf: n } = eo(e);
		return !!t || !!n?.some(Number.isSafeInteger);
	},
	format: (e) => eo(e).format ?? null
}, {
	gt(e, t) {
		return this.check(/* @__PURE__ */ sa(e, t));
	},
	gte(e, t) {
		return this.check(/* @__PURE__ */ ca(e, t));
	},
	min(e, t) {
		return this.check(/* @__PURE__ */ ca(e, t));
	},
	lt(e, t) {
		return this.check(/* @__PURE__ */ aa(e, t));
	},
	lte(e, t) {
		return this.check(/* @__PURE__ */ oa(e, t));
	},
	max(e, t) {
		return this.check(/* @__PURE__ */ oa(e, t));
	},
	int(e) {
		return this.check(Ts(e));
	},
	safe(e) {
		return this.check(Ts(e));
	},
	positive(e) {
		return this.check(/* @__PURE__ */ sa(0, e));
	},
	nonnegative(e) {
		return this.check(/* @__PURE__ */ ca(0, e));
	},
	negative(e) {
		return this.check(/* @__PURE__ */ aa(0, e));
	},
	nonpositive(e) {
		return this.check(/* @__PURE__ */ oa(0, e));
	},
	multipleOf(e, t) {
		return this.check(/* @__PURE__ */ la(e, t));
	},
	step(e, t) {
		return this.check(/* @__PURE__ */ la(e, t));
	},
	finite() {
		return this;
	}
}));
function z(e) {
	return /* @__PURE__ */ $i(Cs, e);
}
var ws = /*@__PURE__*/ A("ZodNumberFormat", (e, t) => {
	cr.init(e, t), Cs.init(e, t);
});
function Ts(e) {
	return /* @__PURE__ */ ea(ws, e);
}
var Es = /*@__PURE__*/ A("ZodBoolean", (e, t) => {
	lr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => oo(e, t, n, r);
});
function B(e) {
	return /* @__PURE__ */ ta(Es, e);
}
var Ds = /*@__PURE__*/ A("ZodNull", (e, t) => {
	ur.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => so(e, t, n, r);
});
function Os(e) {
	return /* @__PURE__ */ na(Ds, e);
}
var ks = /*@__PURE__*/ A("ZodUnknown", (e, t) => {
	dr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (e, t, n) => void 0;
});
function V() {
	return /* @__PURE__ */ ra(ks);
}
var As = /*@__PURE__*/ A("ZodNever", (e, t) => {
	fr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => co(e, t, n, r);
});
function js(e) {
	return /* @__PURE__ */ ia(As, e);
}
var Ms = /*@__PURE__*/ A("ZodArray", (e, t) => {
	Zo(), gr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => mo(e, t, n, r), e.element = t.element;
}, {
	min(e, t) {
		return this.check(/* @__PURE__ */ da(e, t));
	},
	nonempty(e) {
		return this.check(/* @__PURE__ */ da(1, e));
	},
	max(e, t) {
		return this.check(/* @__PURE__ */ ua(e, t));
	},
	length(e, t) {
		return this.check(/* @__PURE__ */ fa(e, t));
	},
	unwrap() {
		return this.element;
	}
});
function H(e, t) {
	return /* @__PURE__ */ Ta(Ms, e, t);
}
var Ns = /*@__PURE__*/ A("ZodObject", (e, t) => {
	Zo(), Sr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => go(e, t, n, r), Pe(e, "shape", (e) => e._zod.def.shape, !1);
}, {
	keyof() {
		return K(Object.keys(this._zod.def.shape));
	},
	catchall(e) {
		return this.clone(_(this._zod.def, { catchall: e }));
	},
	passthrough() {
		return this.clone(_(this._zod.def, { catchall: V() }));
	},
	loose() {
		return this.clone(_(this._zod.def, { catchall: V() }));
	},
	strict() {
		return this.clone(_(this._zod.def, { catchall: js() }));
	},
	strip() {
		return this.clone(_(this._zod.def, { catchall: void 0 }));
	},
	extend(e) {
		return se(this, e);
	},
	safeExtend(e) {
		return le(this, e);
	},
	merge(e) {
		return ue(this, e);
	},
	pick(e) {
		return ae(this, e);
	},
	omit(e) {
		return oe(this, e);
	},
	partial(...e) {
		return de(qs, this, e[0]);
	},
	exactPartial(...e) {
		return de(Ys, this, e[0], "exactPartial");
	},
	required(...e) {
		return fe(rc, this, e[0]);
	}
});
function Ps(e, t) {
	return new Ns({
		type: "object",
		shape: e ?? {},
		...D(t)
	});
}
function U(e, t) {
	return new Ns({
		type: "object",
		shape: e,
		catchall: js(),
		...D(t)
	});
}
var Fs = /*@__PURE__*/ A("ZodUnion", (e, t) => {
	wr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => _o(e, t, n, r), e.options = t.options;
});
function W(e, t) {
	return new Fs({
		type: "union",
		options: e,
		...D(t)
	});
}
var Is = /*@__PURE__*/ A("ZodDiscriminatedUnion", (e, t) => {
	Fs.init(e, t), Er.init(e, t);
});
function G(e, t, n) {
	return new Is({
		type: "union",
		options: t,
		discriminator: e,
		...D(n)
	});
}
var Ls = /*@__PURE__*/ A("ZodIntersection", (e, t) => {
	Dr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => vo(e, t, n, r);
});
function Rs(e, t) {
	return new Ls({
		type: "intersection",
		left: e,
		right: t
	});
}
var zs = /*@__PURE__*/ A("ZodTuple", (e, t) => {
	Zo(), Ar.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => yo(e, t, n, r);
}, {
	rest(e) {
		return this.clone({
			...this._zod.def,
			rest: e
		});
	},
	partial() {
		let e = this._zod.def;
		if (e.checks?.length) throw Error(".partial() cannot be used on tuple schemas containing refinements");
		return this.clone({
			...e,
			items: e.items.map((e) => new qs({
				type: "optional",
				innerType: e
			}))
		});
	}
});
function Bs(e, t, n) {
	let r = t instanceof M;
	return new zs({
		type: "tuple",
		items: e,
		rest: r ? t : null,
		...D(r ? n : t)
	});
}
var Vs = /*@__PURE__*/ A("ZodRecord", (e, t) => {
	Zo(), Pr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => Co(e, t, n, r), e.keyType = t.keyType, e.valueType = t.valueType;
});
function Hs(e, t, n) {
	return !t || !t._zod ? new Vs({
		type: "record",
		keyType: L(),
		valueType: e,
		...D(t)
	}) : new Vs({
		type: "record",
		keyType: e,
		valueType: t,
		...D(n)
	});
}
var Us = /*@__PURE__*/ A("ZodEnum", (e, t) => {
	Fr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => lo(e, t, n, r), e.enum = t.entries, e.options = [...e._zod.values];
	let n = new Set(Object.keys(t.entries));
	e.extract = (e, r) => {
		let i = {};
		for (let r of e) if (n.has(r)) i[r] = t.entries[r];
		else throw Error(`Key ${r} not found in enum`);
		return new Us({
			...t,
			checks: [],
			...D(r),
			entries: i
		});
	}, e.exclude = (e, r) => {
		let i = { ...t.entries };
		for (let t of e) if (n.has(t)) delete i[t];
		else throw Error(`Key ${t} not found in enum`);
		return new Us({
			...t,
			checks: [],
			...D(r),
			entries: i
		});
	};
});
function K(e, t) {
	return new Us({
		type: "enum",
		entries: Array.isArray(e) ? Object.fromEntries(e.map((e) => [e, e])) : e,
		...D(t)
	});
}
var Ws = /*@__PURE__*/ A("ZodLiteral", (e, t) => {
	Ir.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => uo(e, t, n, r), e.values = new Set(t.values), Object.defineProperty(e, "value", { get() {
		if (t.values.length > 1) throw Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return t.values[0];
	} });
});
function q(e, t) {
	return new Ws({
		type: "literal",
		values: Array.isArray(e) ? e : [e],
		...D(t)
	});
}
var Gs = /*@__PURE__*/ A("ZodTransform", (e, t) => {
	Zo(), Lr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => po(e, t, n, r), e._zod.parse = (n, r) => {
		if (r.direction === "backward") throw new He(e.constructor.name);
		n.addIssue = (r) => {
			if (typeof r == "string") n.issues.push(we(r, n.value, t));
			else {
				let t = r;
				t.fatal && (t.continue = !1), t.code ??= "custom", "input" in t || (t.input = n.value), t.inst ??= e, n.issues.push(we(t));
			}
		};
		let i = t.transform(n.value, n);
		return i instanceof Promise ? i.then((e) => (n.value = e, n)) : (n.value = i, n);
	};
});
function Ks(e) {
	return new Gs({
		type: "transform",
		transform: e
	});
}
var qs = /*@__PURE__*/ A("ZodOptional", (e, t) => {
	zr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => No(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Js(e) {
	return new qs({
		type: "optional",
		innerType: e
	});
}
var Ys = /*@__PURE__*/ A("ZodExactOptional", (e, t) => {
	Br.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => No(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Xs(e) {
	return new Ys({
		type: "optional",
		innerType: e
	});
}
var Zs = /*@__PURE__*/ A("ZodNullable", (e, t) => {
	Vr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => wo(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Qs(e) {
	return new Zs({
		type: "nullable",
		innerType: e
	});
}
var $s = /*@__PURE__*/ A("ZodDefault", (e, t) => {
	Hr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => Oo(e, t, n, r), e.unwrap = () => e._zod.def.innerType, e.removeDefault = e.unwrap;
});
function ec(e, t) {
	return new $s({
		type: "default",
		innerType: e,
		get defaultValue() {
			return typeof t == "function" ? t() : ee(t);
		}
	});
}
var tc = /*@__PURE__*/ A("ZodPrefault", (e, t) => {
	Wr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => ko(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function nc(e, t) {
	return new tc({
		type: "prefault",
		innerType: e,
		get defaultValue() {
			return typeof t == "function" ? t() : ee(t);
		}
	});
}
var rc = /*@__PURE__*/ A("ZodNonOptional", (e, t) => {
	Gr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => To(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function ic(e, t) {
	return new rc({
		type: "nonoptional",
		innerType: e,
		...D(t)
	});
}
var ac = /*@__PURE__*/ A("ZodCatch", (e, t) => {
	Jr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => Ao(e, t, n, r), e.unwrap = () => e._zod.def.innerType, e.removeCatch = e.unwrap;
});
function oc(e, t) {
	return new ac({
		type: "catch",
		innerType: e,
		catchValue: typeof t == "function" ? t : Ie(t)
	});
}
var sc = /*@__PURE__*/ A("ZodPipe", (e, t) => {
	Yr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => jo(e, t, n, r), e.in = t.in, e.out = t.out;
});
function cc(e, t) {
	return new sc({
		type: "pipe",
		in: e,
		out: t
	});
}
var lc = /*@__PURE__*/ A("ZodReadonly", (e, t) => {
	Zr.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => Mo(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function uc(e) {
	return new lc({
		type: "readonly",
		innerType: e
	});
}
var dc = /*@__PURE__*/ A("ZodLazy", (e, t) => {
	$r.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => Po(e, t, n, r), e.unwrap = () => e._zod.def.getter();
});
function fc(e) {
	return new dc({
		type: "lazy",
		getter: e
	});
}
var pc = /*@__PURE__*/ A("ZodCustom", (e, t) => {
	ei.init(e, t), I.init(e, t), e._zod.processJSONSchema = (t, n, r) => fo(e, t, n, r);
});
function mc(e, t = {}) {
	return /* @__PURE__ */ Ea(pc, e, t);
}
function hc(e, t) {
	return /* @__PURE__ */ Da(e, t);
}
//#endregion
//#region ../../node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/_u64.js
var gc = (e) => e / 2 ** 32 | 0, _c = (e) => e >>> 0;
function vc(e, t, n, r) {
	let i = gc(n), a = _c(n);
	e.setUint32(t, r ? a : i, r), e.setUint32(t + 4, r ? i : a, r);
}
//#endregion
//#region ../../node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/utils.js
function yc(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
var bc = (e) => e ? `"${e}" ` : "";
function xc(e, t = "") {
	if (typeof e != "number") throw TypeError(bc(t) + "expected number, got " + typeof e);
	if (!Number.isSafeInteger(e) || e < 0) throw RangeError(bc(t) + "expected integer >= 0, got " + e);
	return e;
}
function Sc(e, t, n = "") {
	if (yc(e) && (t === void 0 || e.length === t)) return e;
	t !== void 0 && xc(t, "length");
	let r = yc(e), i = t === void 0 ? "" : ` of length ${t}`, a = r ? `length=${e.length}` : `type=${typeof e}`, o = bc(n) + "expected Uint8Array" + i + ", got " + a;
	throw r ? RangeError(o) : TypeError(o);
}
var Cc = (e, t) => {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError((t === "object" ? "" : `"${t}" `) + "expected object, got type=" + typeof e);
}, wc = (e, t) => {
	Cc(e, t);
	let n = Object.getPrototypeOf(e);
	if (n !== Object.prototype && n !== null) throw TypeError(`"${t}" expected plain object`);
	if (Object.hasOwn(e, "__proto__")) throw TypeError(`"${t}.__proto__" is not allowed`);
};
function Tc(e, t = !0) {
	if (e.destroyed) throw Error("hash was destroyed");
	if (t && e.finished) throw Error("digest() was already called");
}
function Ec(e, t) {
	Sc(e, void 0, "output");
	let n = t.outputLen;
	if (!(e.length >= n)) throw RangeError("\"output\" expected length >= " + n);
}
function Dc(...e) {
	for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function Oc(e) {
	return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function kc(e, t) {
	return e << 32 - t | e >>> t;
}
var Ac = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", jc = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Mc(e) {
	if (Sc(e), Ac) return e.toHex();
	let t = "";
	for (let n = 0; n < e.length; n++) t += jc[e[n]];
	return t;
}
function Nc(e, t, n = "opts") {
	return wc(e, "defaults"), t !== void 0 && wc(t, n), Object.assign(Object.create(null), e, t);
}
function Pc(e, t = {}) {
	if (typeof e != "function") throw TypeError("\"hashCons\" expected function, got type=" + typeof e);
	t = Nc({}, t, "info");
	let n = (t, n) => e(n).update(t).digest(), r = e(void 0);
	return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.canXOF = r.canXOF, n.create = (t) => e(t), Object.assign(n, t), Object.freeze(n);
}
var Fc = (e) => ({ oid: Uint8Array.from([
	6,
	9,
	96,
	134,
	72,
	1,
	101,
	3,
	4,
	2,
	e
]) });
//#endregion
//#region ../../node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/_md.js
function Ic(e, t, n) {
	return e & t ^ ~e & n;
}
function Lc(e, t, n) {
	return e & t ^ e & n ^ t & n;
}
var Rc = class {
	blockLen;
	outputLen;
	canXOF = !1;
	padOffset;
	isLE;
	buffer;
	view;
	finished = !1;
	length = 0;
	pos = 0;
	destroyed = !1;
	constructor(e, t, n, r) {
		this.blockLen = e, this.outputLen = t, this.padOffset = n, this.isLE = r, this.buffer = new Uint8Array(e), this.view = Oc(this.buffer);
	}
	update(e) {
		Tc(this), Sc(e);
		let { view: t, buffer: n, blockLen: r } = this, i = e.length, a = !1;
		for (let o = 0; o < i;) {
			let s = Math.min(r - this.pos, i - o);
			if (s === r) {
				let t = Oc(e);
				for (; r <= i - o; o += r) this.process(t, o);
				a = !0;
			} else n.set(o === 0 && s === i ? e : e.subarray(o, o + s), this.pos), this.pos += s, o += s, this.pos === r && (this.process(t, 0), this.pos = 0, a = !0);
		}
		return this.length += e.length, a && this.roundClean(), this;
	}
	digestInto(e) {
		Tc(this), Ec(e, this), this.finished = !0;
		let { buffer: t, view: n, blockLen: r, isLE: i } = this, { pos: a } = this;
		t[a++] = 128, t.fill(0, a), this.padOffset > r - a && (this.process(n, 0), t.fill(0)), vc(n, r - 8, this.length * 8, i), this.process(n, 0), this.roundClean();
		let o = e === t ? n : Oc(e), s = this.outputLen, c = s / 4, l = this.get();
		if (s % 4 || c > l.length) throw Error("invalid outputLen");
		for (let e = 0; e < c; e++) o.setUint32(4 * e, l[e], i);
	}
	digest() {
		let { buffer: e, outputLen: t } = this;
		this.digestInto(e);
		let n = e.slice(0, t);
		return this.destroy(), n;
	}
	_cloneIntoMeta(e) {
		let { buffer: t, length: n, finished: r, destroyed: i, pos: a } = this;
		return e.destroyed = i, e.finished = r, e.length = n, e.pos = a, a && e.buffer.set(t), e;
	}
	clone() {
		return this._cloneInto();
	}
}, zc = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]), Bc = /* @__PURE__ */ Uint32Array.from([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]), Vc = /* @__PURE__ */ new Uint32Array(64), Hc = class extends Rc {
	A = 0;
	B = 0;
	C = 0;
	D = 0;
	E = 0;
	F = 0;
	G = 0;
	H = 0;
	constructor(e, t) {
		super(64, e, 8, !1), this.A = t[0] | 0, this.B = t[1] | 0, this.C = t[2] | 0, this.D = t[3] | 0, this.E = t[4] | 0, this.F = t[5] | 0, this.G = t[6] | 0, this.H = t[7] | 0;
	}
	get() {
		let { A: e, B: t, C: n, D: r, E: i, F: a, G: o, H: s } = this;
		return [
			e,
			t,
			n,
			r,
			i,
			a,
			o,
			s
		];
	}
	set(e, t, n, r, i, a, o, s) {
		this.A = e | 0, this.B = t | 0, this.C = n | 0, this.D = r | 0, this.E = i | 0, this.F = a | 0, this.G = o | 0, this.H = s | 0;
	}
	_cloneInto(e) {
		return (e ||= new this.constructor()).set(...this.get()), this._cloneIntoMeta(e);
	}
	process(e, t) {
		for (let n = 0; n < 16; n++, t += 4) Vc[n] = e.getUint32(t, !1);
		for (let e = 16; e < 64; e++) {
			let t = Vc[e - 15], n = Vc[e - 2], r = kc(t, 7) ^ kc(t, 18) ^ t >>> 3, i = kc(n, 17) ^ kc(n, 19) ^ n >>> 10;
			Vc[e] = i + Vc[e - 7] + r + Vc[e - 16] | 0;
		}
		let { A: n, B: r, C: i, D: a, E: o, F: s, G: c, H: l } = this;
		for (let e = 0; e < 64; e++) {
			let t = kc(o, 6) ^ kc(o, 11) ^ kc(o, 25), u = l + t + Ic(o, s, c) + Bc[e] + Vc[e] | 0, d = (kc(n, 2) ^ kc(n, 13) ^ kc(n, 22)) + Lc(n, r, i) | 0;
			l = c, c = s, s = o, o = a + u | 0, a = i, i = r, r = n, n = u + d | 0;
		}
		n = n + this.A | 0, r = r + this.B | 0, i = i + this.C | 0, a = a + this.D | 0, o = o + this.E | 0, s = s + this.F | 0, c = c + this.G | 0, l = l + this.H | 0, this.set(n, r, i, a, o, s, c, l);
	}
	roundClean() {
		Dc(Vc);
	}
	destroy() {
		this.destroyed = !0, this.set(0, 0, 0, 0, 0, 0, 0, 0), Dc(this.buffer);
	}
}, Uc = class extends Hc {
	constructor() {
		super(32, zc);
	}
}, Wc = /* @__PURE__ */ Pc(() => new Uc(), /* @__PURE__ */ Fc(1)), Gc = 4e6, Kc = Math.ceil(Gc / 3) * 4;
function qc(e) {
	if (!(e instanceof Uint8Array) || e.byteLength < 1 || e.byteLength > 4e6) throw Error("Recurso vazio ou maior que 4 MB.");
}
//#endregion
//#region ../../packages/edi-motion/src/xmlText.ts
function Jc(e) {
	for (let t of e) {
		let e = t.codePointAt(0);
		if (e === void 0 || e < 32 && e !== 9 && e !== 10 && e !== 13 || e >= 55296 && e <= 57343 || e === 65534 || e === 65535) return !1;
	}
	return !0;
}
//#endregion
//#region ../../packages/edi-motion/src/assets/font.ts
function Yc(e, t, n, r = !1) {
	let i = 0;
	for (let a = 0; a < n; a += 4) {
		let o = 0;
		for (let i = 0; i < 4; i++) o = o << 8 | (a + i < n && !(r && a + i >= 8 && a + i < 12) ? e[t + a + i] ?? 0 : 0);
		i = i + (o >>> 0) >>> 0;
	}
	return i;
}
function Xc(e) {
	if (qc(e), e.length < 12) throw Error("Fonte OpenType truncada.");
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = t.getUint32(0), r = n === 65536 ? "truetype" : n === 1330926671 ? "opentype" : null;
	if (!r) throw Error("Use uma fonte TTF/OTF descomprimida, de uma única face; WOFF/WOFF2/coleções requerem conversão explícita.");
	let i = t.getUint16(4), a = 12 + i * 16;
	if (!i || i > 128 || a > e.length) throw Error("Diretório OpenType inválido/excessivo.");
	let o = 2 ** Math.floor(Math.log2(i));
	if (t.getUint16(6) !== o * 16 || t.getUint16(8) !== Math.log2(o) || t.getUint16(10) !== i * 16 - o * 16) throw Error("Índice de pesquisa OpenType inconsistente.");
	let s = /* @__PURE__ */ new Map(), c = "", l = 0;
	for (let n = 0; n < i; n++) {
		let r = 12 + n * 16, i = String.fromCharCode(...e.subarray(r, r + 4)), o = t.getUint32(r + 8), u = t.getUint32(r + 12);
		if (!/^[\x20-\x7e]{4}$/.test(i) || i <= c || o % 4 || o < a || o + u > e.length || !u) throw Error("Tabela OpenType inválida, duplicada, sobreposta ao diretório ou fora de ordem.");
		if (c = i, l += u, l > 16e6) throw Error("Fonte excede orçamento de tabelas.");
		let d = t.getUint32(r + 4);
		if (Yc(e, o, u, i === "head") !== d) throw Error(`Checksum inválido na tabela ${i}.`);
		s.set(i, {
			tag: i,
			offset: o,
			length: u,
			checksum: d
		});
	}
	let u = [...s.values()].sort((e, t) => e.offset - t.offset), d = a;
	for (let t of u) {
		if (t.offset < d) throw Error("Tabelas OpenType sobrepostas.");
		d = t.offset + t.length;
		for (let t = d; t < Math.ceil(d / 4) * 4 && t < e.length; t++) if (e[t] !== 0) throw Error("Padding OpenType não nulo.");
	}
	if (Yc(e, 0, e.length) !== 2981146554) throw Error("Checksum global OpenType inválido.");
	let f = (e, t) => {
		let n = s.get(e);
		if (!n || n.length < t) throw Error(`Fonte sem tabela ${e} válida.`);
		return n;
	}, p = f("head", 54), m = f("maxp", 6), h = f("OS/2", 64), g = f("hhea", 36), _ = f("cmap", 4), v = f("name", 6);
	if (f("post", 32), t.getUint32(p.offset + 12) !== 1594834165 || t.getUint32(p.offset) !== 65536) throw Error("Cabeçalho OpenType inválido.");
	let y = t.getUint16(p.offset + 18), b = t.getUint16(m.offset + 4), x = t.getUint16(g.offset + 34), S = t.getUint16(h.offset + 8), C = t.getUint16(h.offset + 4), ee = t.getUint16(h.offset);
	if (y < 16 || y > 16384 || !b || !x || x > b || C < 1 || C > 1e3 || ee > 5) throw Error("Métricas/cabeçalho de fonte inválidos.");
	if (![0, 8].includes(S & 15) || S & 512 || S & 64753) throw Error("Fonte declara incorporação restrita, somente leitura/bitmap ou flags incompatíveis com edição.");
	if (f("hmtx", x * 4 + (b - x) * 2), r === "truetype") {
		if (t.getUint32(m.offset) !== 65536 || m.length < 32) throw Error("maxp TrueType inválido.");
		let e = f("glyf", 1), n = t.getInt16(p.offset + 50);
		if (n !== 0 && n !== 1) throw Error("Formato loca inválido.");
		let r = f("loca", (b + 1) * (n ? 4 : 2)), i = 0;
		for (let a = 0; a <= b; a++) {
			let o = n ? t.getUint32(r.offset + a * 4) : t.getUint16(r.offset + a * 2) * 2;
			if (o < i || o > e.length) throw Error("Referência de glifo fora dos limites.");
			i = o;
		}
	} else if (t.getUint32(m.offset) !== 20480 || !s.has("CFF ") && !s.has("CFF2")) throw Error("Fonte OpenType sem outlines CFF/CFF2.");
	if (s.has("SVG ")) throw Error("Fontes com glifos SVG requerem perfil gráfico específico.");
	let w = t.getUint16(v.offset + 2), T = t.getUint16(v.offset + 4), E = t.getUint16(v.offset);
	if (w > 1e3 || v.length < 6 + w * 12 || T < 6 + w * 12 || T > v.length || E > 1) throw Error("Diretório de nomes da fonte inválido.");
	let D = /* @__PURE__ */ new Map();
	for (let n = 0; n < w; n++) {
		let r = v.offset + 6 + n * 12, i = t.getUint16(r), a = t.getUint16(r + 2), o = t.getUint16(r + 4), s = t.getUint16(r + 6), c = t.getUint16(r + 8), l = t.getUint16(r + 10);
		if (T + l + c > v.length) throw Error("Nome de fonte fora dos limites.");
		if (![
			0,
			1,
			13,
			16
		].includes(s) || !(i === 0 || i === 3 && [
			0,
			1,
			10
		].includes(a))) continue;
		if (c > 16e3 || c % 2) throw Error("Texto de metadado da fonte inválido/excessivo.");
		let u = new TextDecoder("utf-16be", { fatal: !0 }).decode(e.subarray(v.offset + T + l, v.offset + T + l + c)).trim(), d = (i === 3 ? 2 : 0) + +(o === 1033);
		u && d > (D.get(s)?.priority ?? -1) && D.set(s, {
			text: u,
			priority: d
		});
	}
	let te = D.get(16)?.text ?? D.get(1)?.text;
	if (!te || !Jc(te) || te.length > 120 || [...te].some((e) => e.charCodeAt(0) < 32 || e.charCodeAt(0) === 127)) throw Error("Fonte sem família Unicode válida no perfil.");
	let ne = [D.get(0)?.text, D.get(13)?.text].filter(Boolean).join("\n\n");
	if (ne.length > 16e3 || !Jc(ne)) throw Error("Avisos de fonte inválidos ou excessivos.");
	return {
		info: {
			family: te,
			notice: ne,
			format: r,
			unitsPerEm: y,
			glyphs: b,
			weight: C,
			italic: !!(t.getUint16(h.offset + 62) & 1),
			embedding: S
		},
		characterMap: e.subarray(_.offset, _.offset + _.length),
		layout: Object.fromEntries(["GSUB", "GPOS"].flatMap((t) => {
			let n = s.get(t);
			return n ? [[t, e.subarray(n.offset, n.offset + n.length)]] : [];
		}))
	};
}
function Zc(e) {
	return Xc(e).info;
}
//#endregion
//#region ../../node_modules/.pnpm/fflate@0.8.3/node_modules/fflate/esm/browser.js
var J = Uint8Array, Qc = Uint16Array, $c = Int32Array, el = new J([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1,
	1,
	1,
	1,
	2,
	2,
	2,
	2,
	3,
	3,
	3,
	3,
	4,
	4,
	4,
	4,
	5,
	5,
	5,
	5,
	0,
	0,
	0,
	0
]), tl = new J([
	0,
	0,
	0,
	0,
	1,
	1,
	2,
	2,
	3,
	3,
	4,
	4,
	5,
	5,
	6,
	6,
	7,
	7,
	8,
	8,
	9,
	9,
	10,
	10,
	11,
	11,
	12,
	12,
	13,
	13,
	0,
	0
]), nl = new J([
	16,
	17,
	18,
	0,
	8,
	7,
	9,
	6,
	10,
	5,
	11,
	4,
	12,
	3,
	13,
	2,
	14,
	1,
	15
]), rl = function(e, t) {
	for (var n = new Qc(31), r = 0; r < 31; ++r) n[r] = t += 1 << e[r - 1];
	for (var i = new $c(n[30]), r = 1; r < 30; ++r) for (var a = n[r]; a < n[r + 1]; ++a) i[a] = a - n[r] << 5 | r;
	return {
		b: n,
		r: i
	};
}, il = rl(el, 2), al = il.b, ol = il.r;
al[28] = 258, ol[258] = 28;
var sl = rl(tl, 0), cl = sl.b;
sl.r;
for (var ll = new Qc(32768), Y = 0; Y < 32768; ++Y) {
	var ul = (Y & 43690) >> 1 | (Y & 21845) << 1;
	ul = (ul & 52428) >> 2 | (ul & 13107) << 2, ul = (ul & 61680) >> 4 | (ul & 3855) << 4, ll[Y] = ((ul & 65280) >> 8 | (ul & 255) << 8) >> 1;
}
for (var dl = (function(e, t, n) {
	for (var r = e.length, i = 0, a = new Qc(t); i < r; ++i) e[i] && ++a[e[i] - 1];
	var o = new Qc(t);
	for (i = 1; i < t; ++i) o[i] = o[i - 1] + a[i - 1] << 1;
	var s;
	if (n) {
		s = new Qc(1 << t);
		var c = 15 - t;
		for (i = 0; i < r; ++i) if (e[i]) for (var l = i << 4 | e[i], u = t - e[i], d = o[e[i] - 1]++ << u, f = d | (1 << u) - 1; d <= f; ++d) s[ll[d] >> c] = l;
	} else for (s = new Qc(r), i = 0; i < r; ++i) e[i] && (s[i] = ll[o[e[i] - 1]++] >> 15 - e[i]);
	return s;
}), fl = new J(288), Y = 0; Y < 144; ++Y) fl[Y] = 8;
for (var Y = 144; Y < 256; ++Y) fl[Y] = 9;
for (var Y = 256; Y < 280; ++Y) fl[Y] = 7;
for (var Y = 280; Y < 288; ++Y) fl[Y] = 8;
for (var pl = new J(32), Y = 0; Y < 32; ++Y) pl[Y] = 5;
var ml = /*#__PURE__*/ dl(fl, 9, 1), hl = /*#__PURE__*/ dl(pl, 5, 1), gl = function(e) {
	for (var t = e[0], n = 1; n < e.length; ++n) e[n] > t && (t = e[n]);
	return t;
}, _l = function(e, t, n) {
	var r = t / 8 | 0;
	return (e[r] | e[r + 1] << 8) >> (t & 7) & n;
}, vl = function(e, t) {
	var n = t / 8 | 0;
	return (e[n] | e[n + 1] << 8 | e[n + 2] << 16) >> (t & 7);
}, yl = function(e) {
	return (e + 7) / 8 | 0;
}, bl = function(e, t, n) {
	return (t == null || t < 0) && (t = 0), (n == null || n > e.length) && (n = e.length), new J(e.subarray(t, n));
}, xl = [
	"unexpected EOF",
	"invalid block type",
	"invalid length/literal",
	"invalid distance",
	"stream finished",
	"no stream handler",
	,
	"no callback",
	"invalid UTF-8 data",
	"extra field too long",
	"date not in range 1980-2099",
	"filename too long",
	"stream finishing",
	"invalid zip data"
], Sl = function(e, t, n) {
	var r = Error(t || xl[e]);
	if (r.code = e, Error.captureStackTrace && Error.captureStackTrace(r, Sl), !n) throw r;
	return r;
}, Cl = function(e, t, n, r) {
	var i = e.length, a = r ? r.length : 0;
	if (!i || t.f && !t.l) return n || new J(0);
	var o = !n, s = o || t.i != 2, c = t.i;
	o && (n = new J(i * 3));
	var l = function(e) {
		var t = n.length;
		if (e > t) {
			var r = new J(Math.max(t * 2, e));
			r.set(n), n = r;
		}
	}, u = t.f || 0, d = t.p || 0, f = t.b || 0, p = t.l, m = t.d, h = t.m, g = t.n, _ = i * 8;
	do {
		if (!p) {
			u = _l(e, d, 1);
			var v = _l(e, d + 1, 3);
			if (d += 3, !v) {
				var y = yl(d) + 4, b = e[y - 4] | e[y - 3] << 8, x = y + b;
				if (x > i) {
					c && Sl(0);
					break;
				}
				s && l(f + b), n.set(e.subarray(y, x), f), t.b = f += b, t.p = d = x * 8, t.f = u;
				continue;
			}
			if (v == 1) p = ml, m = hl, h = 9, g = 5;
			else if (v == 2) {
				var S = _l(e, d, 31) + 257, C = _l(e, d + 10, 15) + 4, ee = S + _l(e, d + 5, 31) + 1;
				d += 14;
				for (var w = new J(ee), T = new J(19), E = 0; E < C; ++E) T[nl[E]] = _l(e, d + E * 3, 7);
				d += C * 3;
				for (var D = gl(T), te = (1 << D) - 1, ne = dl(T, D, 1), E = 0; E < ee;) {
					var re = ne[_l(e, d, te)];
					d += re & 15;
					var y = re >> 4;
					if (y < 16) w[E++] = y;
					else {
						var ie = 0, ae = 0;
						for (y == 16 ? (ae = 3 + _l(e, d, 3), d += 2, ie = w[E - 1]) : y == 17 ? (ae = 3 + _l(e, d, 7), d += 3) : y == 18 && (ae = 11 + _l(e, d, 127), d += 7); ae--;) w[E++] = ie;
					}
				}
				var O = w.subarray(0, S), oe = w.subarray(S);
				h = gl(O), g = gl(oe), p = dl(O, h, 1), m = dl(oe, g, 1);
			} else Sl(1);
			if (d > _) {
				c && Sl(0);
				break;
			}
		}
		s && l(f + 131072);
		for (var se = (1 << h) - 1, ce = (1 << g) - 1, le = d;; le = d) {
			var ie = p[vl(e, d) & se], ue = ie >> 4;
			if (d += ie & 15, d > _) {
				c && Sl(0);
				break;
			}
			if (ie || Sl(2), ue < 256) n[f++] = ue;
			else if (ue == 256) {
				le = d, p = null;
				break;
			} else {
				var de = ue - 254;
				if (ue > 264) {
					var E = ue - 257, fe = el[E];
					de = _l(e, d, (1 << fe) - 1) + al[E], d += fe;
				}
				var pe = m[vl(e, d) & ce], me = pe >> 4;
				pe || Sl(3), d += pe & 15;
				var oe = cl[me];
				if (me > 3) {
					var fe = tl[me];
					oe += vl(e, d) & (1 << fe) - 1, d += fe;
				}
				if (d > _) {
					c && Sl(0);
					break;
				}
				s && l(f + 131072);
				var he = f + de;
				if (f < oe) {
					var ge = a - oe, _e = Math.min(oe, he);
					for (ge + f < 0 && Sl(3); f < _e; ++f) n[f] = r[ge + f];
				}
				for (; f < he; ++f) n[f] = n[f - oe];
			}
		}
		t.l = p, t.p = le, t.b = f, t.f = u, p && (u = 1, t.m = h, t.d = m, t.n = g);
	} while (!u);
	return f != n.length && o ? bl(n, 0, f) : n.subarray(0, f);
}, wl = /*#__PURE__*/ new J(0), Tl = function(e, t) {
	return ((e[0] & 15) != 8 || e[0] >> 4 > 7 || (e[0] << 8 | e[1]) % 31) && Sl(6, "invalid zlib data"), (e[1] >> 5 & 1) == +!t && Sl(6, "invalid zlib data: " + (e[1] & 32 ? "need" : "unexpected") + " dictionary"), (e[1] >> 3 & 4) + 2;
}, El = /* @__PURE__ */ function() {
	function e(e, t) {
		typeof e == "function" && (t = e, e = {}), this.ondata = t;
		var n = e && e.dictionary && e.dictionary.subarray(-32768);
		this.s = {
			i: 0,
			b: n ? n.length : 0
		}, this.o = new J(32768), this.p = new J(0), n && this.o.set(n);
	}
	return e.prototype.e = function(e) {
		if (this.ondata || Sl(5), this.d && Sl(4), !this.p.length) this.p = e;
		else if (e.length) {
			var t = new J(this.p.length + e.length);
			t.set(this.p), t.set(e, this.p.length), this.p = t;
		}
	}, e.prototype.c = function(e) {
		this.s.i = +(this.d = e || !1);
		var t = this.s.b, n = Cl(this.p, this.s, this.o);
		this.ondata(bl(n, t, this.s.b), this.d), this.o = bl(n, this.s.b - 32768), this.s.b = this.o.length, this.p = bl(this.p, this.s.p / 8 | 0), this.s.p &= 7;
	}, e.prototype.push = function(e, t) {
		this.e(e), this.c(t);
	}, e;
}(), Dl = /* @__PURE__ */ function() {
	function e(e, t) {
		El.call(this, e, t), this.v = e && e.dictionary ? 2 : 1;
	}
	return e.prototype.push = function(e, t) {
		if (El.prototype.e.call(this, e), this.v) {
			if (this.p.length < 6 && !t) return;
			this.p = this.p.subarray(Tl(this.p, this.v - 1)), this.v = 0;
		}
		t && (this.p.length < 4 && Sl(6, "invalid zlib data"), this.p = this.p.subarray(0, -4)), El.prototype.c.call(this, t);
	}, e;
}(), Ol = typeof TextDecoder < "u" && /*#__PURE__*/ new TextDecoder();
try {
	Ol.decode(wl, { stream: !0 });
} catch {}
//#endregion
//#region ../../packages/edi-motion/src/assets/png.ts
var kl = Uint32Array.from({ length: 256 }, (e, t) => {
	let n = t;
	for (let e = 0; e < 8; e++) n = n & 1 ? 3988292384 ^ n >>> 1 : n >>> 1;
	return n >>> 0;
});
function Al(e) {
	let t = 4294967295;
	for (let n of e) {
		let e = kl[(t ^ n) & 255];
		if (e === void 0) throw Error("CRC inválido.");
		t = e ^ t >>> 8;
	}
	return (t ^ 4294967295) >>> 0;
}
function jl(e, t = !1) {
	if (qc(e), ![
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10
	].every((t, n) => e[n] === t)) throw Error("Assinatura PNG inválida.");
	let n = new DataView(e.buffer, e.byteOffset, e.byteLength), r = [], i = 8, a = 0, o = 0, s = 0, c = 0, l = 0, u = !1, d = 0, f = !1, p = !1, m = /* @__PURE__ */ new Set();
	for (; i < e.length;) {
		if (r.length >= 1024 || i + 12 > e.length) throw Error("PNG truncado ou com chunks excessivos.");
		let h = n.getUint32(i), g = String.fromCharCode(...e.subarray(i + 4, i + 8)), _ = i + 12 + h;
		if (h > 4e6 || _ > e.length || !/^[A-Za-z]{4}$/.test(g) || g.charCodeAt(2) & 32) throw Error("Chunk PNG inválido.");
		if (Al(e.subarray(i + 4, _ - 4)) !== n.getUint32(_ - 4)) throw Error("CRC de PNG inválido.");
		if (!r.length && g !== "IHDR") throw Error("PNG requer IHDR inicial.");
		if (g === "acTL" || g === "fcTL" || g === "fdAT") throw Error("PNG animado requer importação de frames explícita.");
		if (g !== "IDAT" && [
			"IHDR",
			"PLTE",
			"IEND",
			"tRNS",
			"sRGB",
			"gAMA",
			"cICP"
		].includes(g)) {
			if (m.has(g)) throw Error("Chunk PNG duplicado.");
			m.add(g);
		}
		if (g === "IHDR") {
			if (h !== 13) throw Error("IHDR PNG inválido.");
			if (a = n.getUint32(i + 8), o = n.getUint32(i + 12), c = e[i + 16] ?? 0, s = e[i + 17] ?? -1, !a || !o || a > 16384 || o > 16384 || a * o > 16e6 || !{
				0: [
					1,
					2,
					4,
					8,
					16
				],
				2: [8, 16],
				3: [
					1,
					2,
					4,
					8
				],
				4: [8, 16],
				6: [8, 16]
			}[s]?.includes(c) || e[i + 18] !== 0 || e[i + 19] !== 0 || ![0, 1].includes(e[i + 20] ?? -1)) throw Error("PNG excede dimensões ou usa cabeçalho inválido.");
		} else if (g === "PLTE") {
			if (u || m.has("tRNS") || h < 3 || h > 768 || h % 3 || s === 0 || s === 4) throw Error("Paleta PNG inválida.");
			if (l = h / 3, s === 3 && l > 2 ** c) throw Error("Paleta excede profundidade PNG.");
		} else if (g === "tRNS") {
			if (u || !(s === 0 && h === 2 || s === 2 && h === 6 || s === 3 && l > 0 && h > 0 && h <= l)) throw Error("Transparência PNG inválida.");
		} else if (g === "IDAT") {
			if (f || s === 3 && !l) throw Error("IDAT fora de ordem ou sem paleta.");
			u = !0, d += h;
		} else if (g === "IEND") {
			if (h !== 0 || !u || !d || _ !== e.length) throw Error("PNG incompleto ou com dados após IEND.");
			p = !0;
		} else {
			if (!(g.charCodeAt(0) & 32)) throw Error("Chunk crítico PNG não suportado.");
			if ([
				"sRGB",
				"gAMA",
				"cICP"
			].includes(g) && (u || l > 0)) throw Error("Metadado de cor PNG fora de ordem.");
			if (t && !(g === "sRGB" && h === 1 && (e[i + 8] ?? 9) <= 3 || g === "gAMA" && h === 4 && n.getUint32(i + 8) > 0 || g === "cICP" && h === 4 && e[i + 8] === 1 && e[i + 9] === 13 && e[i + 10] === 0 && e[i + 11] === 1)) throw Error("PNG precisa de normalização para remover metadados não suportados.");
		}
		u && g !== "IDAT" && (f = !0), r.push({
			type: g,
			offset: i,
			length: h
		}), i = _;
	}
	if (!p) throw Error("PNG sem IEND.");
	return {
		width: a,
		height: o,
		chunks: r
	};
}
function Ml(e, t) {
	let n = t.chunks[0];
	if (!n) throw Error("PNG sem cabeçalho.");
	let r = {
		0: 1,
		2: 3,
		3: 1,
		4: 2,
		6: 4
	}, i = e[n.offset + 16] ?? 0, a = r[e[n.offset + 17] ?? -1];
	if (!a) throw Error("PNG sem canais válidos.");
	let o = e[n.offset + 20] === 1 ? [
		[
			0,
			0,
			8,
			8
		],
		[
			4,
			0,
			8,
			8
		],
		[
			0,
			4,
			4,
			8
		],
		[
			2,
			0,
			4,
			4
		],
		[
			0,
			2,
			2,
			4
		],
		[
			1,
			0,
			2,
			2
		],
		[
			0,
			1,
			1,
			2
		]
	] : [[
		0,
		0,
		1,
		1
	]], s = [];
	for (let e of o) {
		let [n, r, o, c] = e;
		if (n === void 0 || r === void 0 || !o || !c) throw Error("Passe PNG inválido.");
		let l = Math.max(0, Math.ceil((t.width - n) / o)), u = Math.max(0, Math.ceil((t.height - r) / c));
		l && u && s.push({
			stride: 1 + Math.ceil(l * a * i / 8),
			count: u
		});
	}
	let c = s.reduce((e, t) => e + t.stride * t.count, 0), l = t.chunks.filter((e) => e.type === "IDAT"), u = new Uint8Array(l.reduce((e, t) => e + t.length, 0)), d = 0;
	for (let t of l) u.set(e.subarray(t.offset + 8, t.offset + 8 + t.length), d), d += t.length;
	if (u.length < 6) throw Error("IDAT PNG truncado.");
	let f = new DataView(u.buffer).getUint32(u.length - 4), p = 0, m = 1, h = 0, g = 0, _ = 0, v = 0, y = new Dl((e) => {
		if (p + e.length > c) throw Error("IDAT excede tamanho de pixels declarado.");
		for (; g < p + e.length;) {
			let t = e[g - p], n = s[_];
			if (t === void 0 || t > 4 || !n) throw Error("Filtro PNG inválido.");
			g += n.stride, ++v === n.count && (_++, v = 0);
		}
		for (let t = 0; t < e.length; t += 5552) {
			let n = Math.min(t + 5552, e.length);
			for (let r = t; r < n; r++) m += e[r] ?? 0, h += m;
			m %= 65521, h %= 65521;
		}
		p += e.length;
	});
	for (let e = 0; e < u.length; e += 4096) y.push(u.subarray(e, e + 4096), e + 4096 >= u.length);
	if (p !== c || (h << 16 | m) >>> 0 !== f) throw Error("IDAT PNG incompleto ou Adler-32 inválido.");
}
//#endregion
//#region ../../packages/edi-motion/src/assets/wav.ts
function Nl(e) {
	qc(e);
	let t = new DataView(e.buffer, e.byteOffset, e.byteLength), n = (t) => String.fromCharCode(...e.subarray(t, t + 4));
	if (e.length < 44 || n(0) !== "RIFF" || n(8) !== "WAVE" || t.getUint32(4, !0) !== e.length - 8) throw Error("RIFF/WAVE inválido ou truncado.");
	let r = 12, i = 0, a = 0, o = 0, s = -1, c = 0, l = !1;
	for (; r < e.length;) {
		if (++i > 1024 || r + 8 > e.length) throw Error("WAVE excede chunks ou está truncado.");
		let u = n(r), d = t.getUint32(r + 4, !0), f = r + 8 + d, p = f + d % 2;
		if (f > e.length || p > e.length) throw Error("Chunk WAVE truncado.");
		if (u === "fmt ") {
			if (l || d !== 16 || t.getUint16(r + 8, !0) !== 1) throw Error("Recurso WAVE requer PCM16 normalizado.");
			l = !0, a = t.getUint16(r + 10, !0), o = t.getUint32(r + 12, !0);
			let e = t.getUint32(r + 16, !0), n = t.getUint16(r + 20, !0), i = t.getUint16(r + 22, !0);
			if (![1, 2].includes(a) || o < 8e3 || o > 48e3 || i !== 16 || n !== a * 2 || e !== o * n) throw Error("Formato PCM WAVE inválido ou excessivo.");
		} else if (u === "data") {
			if (s !== -1 || !d) throw Error("Chunk de áudio duplicado/vazio.");
			s = r + 8, c = d;
		} else throw Error("WAVE precisa de normalização para remover metadados/chunks não suportados.");
		r = p;
	}
	let u = c / (a * 2);
	if (!l || s < 0 || !Number.isInteger(u) || u < 1 || u > o * 30) throw Error("Áudio excede duração ou contém amostras incompletas.");
	return {
		channels: a,
		sampleRate: o,
		frames: u,
		dataOffset: s,
		dataLength: c
	};
}
//#endregion
//#region ../../packages/edi-motion/src/assets/model.ts
var Pl = L().regex(/^asset-[0-9a-f]{64}$/), Fl = {
	id: Pl,
	name: L().trim().min(1).max(120),
	byteLength: z().int().min(1).max(Gc),
	data: L().min(4).max(Kc)
}, Il = U({
	...Fl,
	kind: q("image"),
	mime: q("image/png"),
	width: z().int().min(1).max(16384),
	height: z().int().min(1).max(16384)
}), Ll = G("kind", [
	Il,
	U({
		...Fl,
		kind: q("audio"),
		mime: q("audio/wav"),
		channels: W([q(1), q(2)]),
		sampleRate: z().int().min(8e3).max(48e3),
		frames: z().int().min(1).max(144e4)
	}),
	U({
		...Fl,
		kind: q("font"),
		mime: K(["font/ttf", "font/otf"]),
		format: K(["truetype", "opentype"]),
		family: L().min(1).max(120),
		unitsPerEm: z().int().min(16).max(16384),
		glyphs: z().int().min(1).max(65535),
		weight: z().int().min(1).max(1e3),
		italic: B(),
		embedding: z().int().min(0).max(65535),
		rightsConfirmed: q(!0),
		notice: L().max(16e3).refine(Jc, "Aviso deve ser texto XML válido."),
		licenseNotice: L().max(16e3).refine(Jc, "Aviso deve ser texto XML válido.")
	})
]), Rl = /* @__PURE__ */ new WeakMap();
function zl(e) {
	let { data: t, name: n, ...r } = e;
	return JSON.stringify(r);
}
function Bl(e) {
	return `asset-${Mc(Wc(e))}`;
}
function Vl(e) {
	if (e.length > 5333336 || e.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(e)) throw Error("Base64 de recurso inválido/excessivo.");
	let t = atob(e);
	if (!t.length || t.length > 4e6 || btoa(t) !== e) throw Error("Base64 de recurso não canônico ou excessivo.");
	return Uint8Array.from(t, (e) => e.charCodeAt(0));
}
function Hl(e) {
	let t = Ll.parse(e, { jitless: !0 }), n = zl(t), r = typeof e == "object" && e ? Rl.get(e) : void 0;
	if (r?.data === t.data && r.metadata === n) return Rl.set(t, r), t;
	let i = Vl(t.data);
	if (i.length !== t.byteLength || t.id !== Bl(i)) throw Error("Integridade/tamanho do recurso não corresponde aos bytes.");
	if (t.kind === "image") {
		let e = jl(i, !0);
		if (Ml(i, e), t.width !== e.width || t.height !== e.height) throw Error("Dimensões do recurso não correspondem à imagem.");
	} else if (t.kind === "audio") {
		let e = Nl(i);
		if (t.channels !== e.channels || t.sampleRate !== e.sampleRate || t.frames !== e.frames) throw Error("Metadados do recurso não correspondem ao áudio.");
	} else {
		let e = Zc(i);
		if (t.mime !== (e.format === "truetype" ? "font/ttf" : "font/otf") || Object.entries(e).some(([e, n]) => Reflect.get(t, e) !== n)) throw Error("Metadados da fonte não correspondem aos bytes.");
	}
	let a = {
		data: t.data,
		metadata: n
	};
	return typeof e == "object" && e && Rl.set(e, a), Rl.set(t, a), t;
}
function Ul(e) {
	if (!Array.isArray(e) || e.length > 256) throw Error("Catálogo requer até 256 recursos.");
	let t = 0, n = 0;
	for (let r of e) if (typeof r == "object" && r && "kind" in r && (r.kind === "image" && "width" in r && "height" in r && typeof r.width == "number" && Number.isInteger(r.width) && r.width > 0 && typeof r.height == "number" && Number.isInteger(r.height) && r.height > 0 ? t += r.width * r.height : r.kind === "audio" && "frames" in r && "channels" in r && typeof r.frames == "number" && Number.isInteger(r.frames) && r.frames > 0 && (r.channels === 1 || r.channels === 2) && (n += r.frames * r.channels), t > 16e6 || n > 288e4)) throw Error("Catálogo excede orçamento de pixels/amostras antes da decodificação.");
	let r = 0;
	for (let t of e) if (typeof t == "object" && t && "data" in t && typeof t.data == "string" && (r += t.data.length, t.data.length > 5333336 || r > 5333336 + e.length * 4)) throw Error("Catálogo excede orçamento de bytes.");
	let i = [], a = /* @__PURE__ */ new Set(), o = 0, s = 0, c = 0;
	for (let t of e) {
		let e = Hl(t);
		if (a.has(e.id)) throw Error("Recurso duplicado; reutilize sua identidade de conteúdo.");
		if (a.add(e.id), o += e.byteLength, e.kind === "image" ? s += e.width * e.height : e.kind === "audio" && (c += e.frames * e.channels), o > 4e6 || s > 16e6 || c > 288e4) throw Error("Catálogo excede orçamento de bytes/pixels/amostras.");
		i.push(e);
	}
	return i;
}
function Wl(e) {
	return `data:${e.mime};base64,${e.data}`;
}
//#endregion
//#region ../../packages/edi-motion/src/assets/fontStack.ts
var Gl = H(Pl).max(7).refine((e) => new Set(e).size === e.length, "Fontes de fallback não podem se repetir.");
function Kl(e) {
	let t = e.fontAssetId;
	if (t === void 0) {
		if (e.fontFallbackIds !== void 0) throw Error("Fallback incorporado requer uma fonte principal incorporada.");
		return [];
	}
	Pl.parse(t);
	let n = Gl.parse(e.fontFallbackIds ?? []);
	if (n.includes(t)) throw Error("Fonte principal não pode repetir no fallback.");
	return [t, ...n];
}
function ql(e, t) {
	return Kl(t).map((t) => {
		let n = e.get(t);
		if (n?.kind !== "font") throw Error("Cadeia de fontes referencia recurso ausente/incompatível.");
		return n;
	});
}
//#endregion
//#region ../../packages/edi-motion/src/affine.ts
var Jl = () => [
	1,
	0,
	0,
	1,
	0,
	0
];
function Yl(e, t) {
	let n = [
		e[0] * t[0] + e[2] * t[1],
		e[1] * t[0] + e[3] * t[1],
		e[0] * t[2] + e[2] * t[3],
		e[1] * t[2] + e[3] * t[3],
		e[0] * t[4] + e[2] * t[5] + e[4],
		e[1] * t[4] + e[3] * t[5] + e[5]
	];
	if (n.some((e) => !Number.isFinite(e))) throw Error("Matriz fora do limite numérico.");
	return n;
}
function Xl(e) {
	let t = e[0] * e[3] - e[1] * e[2], n = Math.max(Math.abs(e[0]), Math.abs(e[1]), Math.abs(e[2]), Math.abs(e[3]));
	return Number.isFinite(t) && n !== 0 && Math.abs(t) > 2 ** -52 * n * n * 8;
}
function Zl(e) {
	let t = e[0] * e[3] - e[1] * e[2];
	if (!Xl(e)) throw Error("Não é possível editar um espaço singular ou numericamente instável.");
	return [
		e[3] / t,
		-e[1] / t,
		-e[2] / t,
		e[0] / t,
		(e[2] * e[5] - e[3] * e[4]) / t,
		(e[1] * e[4] - e[0] * e[5]) / t
	];
}
function Ql(e, t, n) {
	return {
		x: e[0] * t + e[2] * n + e[4],
		y: e[1] * t + e[3] * n + e[5]
	};
}
function $l(e) {
	let t = e.rotation * Math.PI / 180, n = Math.cos(t), r = Math.sin(t), i = e.px ?? 0, a = e.py ?? 0, o = Math.tan((e.skewX ?? 0) * Math.PI / 180), s = n * e.sx, c = r * e.sx, l = (n * o - r) * e.sy, u = (r * o + n) * e.sy;
	return [
		s,
		c,
		l,
		u,
		e.x + i - s * i - l * a,
		e.y + a - c * i - u * a
	];
}
function eu(e) {
	if (e.length > 1e4) throw Error("Lista de transformações excessiva.");
	let t = Jl(), n = 0, r = "[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][-+]?\\d+)?", i = RegExp(`^\\s*${r}(?:(?:\\s+,?\\s*|,\\s*)${r})*\\s*$`);
	for (let r of e.matchAll(/([A-Za-z]+)\(([^)]*)\)\s*/g)) {
		if (r.index !== n || !r[2] || !i.test(r[2])) throw Error("Transformação SVG inválida.");
		let e = r[2].trim().split(/[\s,]+/).map(Number);
		if (e.some((e) => !Number.isFinite(e) || Math.abs(e) > 1e7)) throw Error("Número SVG fora do limite permitido.");
		let [a = 0, o = 0, s = 0, c = 0, l = 0, u = 0] = e, d;
		switch (r[1]) {
			case "matrix":
				if (e.length !== 6) throw Error("Matriz SVG exige seis valores.");
				d = [
					a,
					o,
					s,
					c,
					l,
					u
				];
				break;
			case "translate":
				if (e.length < 1 || e.length > 2) throw Error("Translação SVG inválida.");
				d = [
					1,
					0,
					0,
					1,
					a,
					o
				];
				break;
			case "scale":
				if (e.length < 1 || e.length > 2) throw Error("Escala SVG inválida.");
				d = [
					a,
					0,
					0,
					e.length === 1 ? a : o,
					0,
					0
				];
				break;
			case "rotate": {
				if (e.length !== 1 && e.length !== 3) throw Error("Rotação SVG inválida.");
				let t = $l({
					x: 0,
					y: 0,
					rotation: a,
					sx: 1,
					sy: 1
				});
				d = e.length === 1 ? t : Yl(Yl([
					1,
					0,
					0,
					1,
					o,
					s
				], t), [
					1,
					0,
					0,
					1,
					-o,
					-s
				]);
				break;
			}
			case "skewX":
			case "skewY": {
				if (e.length !== 1) throw Error("Inclinação SVG inválida.");
				let t = Math.tan(a * Math.PI / 180);
				if (!Number.isFinite(t) || Math.abs(t) > 1e7) throw Error("Inclinação SVG singular.");
				d = r[1] === "skewX" ? [
					1,
					0,
					t,
					1,
					0,
					0
				] : [
					1,
					t,
					0,
					1,
					0,
					0
				];
				break;
			}
			default: throw Error("Transformação SVG não suportada.");
		}
		t = Yl(t, d), n += r[0].length;
	}
	if (n !== e.length) throw Error("Transformação SVG inválida.");
	return t;
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/svgValidation.ts
var tu = "[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][-+]?\\d+)?", nu = RegExp(`^(${tu})(px|%|em|ex|cm|mm|in|pt|pc)?$`), ru = RegExp(`^\\s*${tu}(?:(?:\\s+,?\\s*|,\\s*)${tu})*\\s*$`), iu = /* @__PURE__ */ new Set([
	"x",
	"y",
	"x1",
	"y1",
	"x2",
	"y2",
	"cx",
	"cy",
	"letter-spacing",
	"word-spacing"
]), au = /* @__PURE__ */ new Set([
	"width",
	"height",
	"rx",
	"ry",
	"r",
	"stroke-width",
	"font-size"
]), ou = /* @__PURE__ */ new Set([
	"opacity",
	"fill-opacity",
	"stroke-opacity"
]);
function su(e) {
	if (!Number.isFinite(e) || Math.abs(e) > 1e7) throw Error("Número SVG fora do limite permitido.");
	return e;
}
function cu(e, t) {
	let n = {
		"font-style": [
			"normal",
			"italic",
			"oblique",
			"inherit"
		],
		direction: [
			"ltr",
			"rtl",
			"inherit"
		],
		"unicode-bidi": [
			"normal",
			"embed",
			"bidi-override",
			"isolate",
			"isolate-override",
			"plaintext"
		],
		"text-anchor": [
			"start",
			"middle",
			"end",
			"inherit"
		]
	};
	if (n[e]) {
		if (!n[e].includes(t)) throw Error(`Valor SVG inválido: ${e}`);
	} else if (e === "font-weight") {
		if (![
			"normal",
			"bold",
			"bolder",
			"lighter",
			"inherit"
		].includes(t) && !/^(?:[1-9]\d{0,2}|1000)$/.test(t)) throw Error("Peso de fonte inválido.");
	} else if (e === "viewBox") {
		if (!ru.test(t)) throw Error("ViewBox SVG inválido.");
		let e = t.trim().split(/[\s,]+/).map(Number);
		if (e.length !== 4 || e.some((e) => !Number.isFinite(e) || Math.abs(e) > 1e5) || (e[2] ?? 0) <= 0 || (e[3] ?? 0) <= 0) throw Error("ViewBox SVG inválido.");
	} else if (e === "preserveAspectRatio") {
		if (!/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/.test(t)) throw Error("Proporção SVG inválida.");
	} else if (e === "overflow") {
		if (t !== "hidden" && t !== "visible") throw Error("Clipping de viewport inválido.");
	} else if (e === "transform") eu(t);
	else if (iu.has(e) || au.has(e) || ou.has(e)) {
		let n = nu.exec(t.trim());
		if (!n?.[1]) throw Error(`Número SVG inválido: ${e}`);
		let r = su(Number(n[1]));
		if (au.has(e) && r < 0) throw Error(`Dimensão SVG negativa: ${e}`);
		if (ou.has(e) && (r < 0 || r > (n[2] === "%" ? 100 : 1) || n[2] && n[2] !== "%")) throw Error(`Opacidade SVG inválida: ${e}`);
	} else if (e === "points" || e === "stroke-dasharray" && t !== "none") {
		if (!ru.test(t)) throw Error(`Lista numérica SVG inválida: ${e}`);
		let n = t.trim().split(/[\s,]+/).map(Number);
		if (n.length > 8e3 || e === "points" && n.length % 2 != 0) throw Error("Lista de coordenadas SVG inválida ou muito grande.");
		if (n.forEach(su), e === "stroke-dasharray" && n.some((e) => e < 0)) throw Error("Traçado SVG negativo.");
	}
}
//#endregion
//#region ../../packages/edi-motion/src/assets/imagePresentation.ts
var lu = U({
	top: z().min(0).max(16384),
	right: z().min(0).max(16384),
	bottom: z().min(0).max(16384),
	left: z().min(0).max(16384)
}), uu = U({
	source: U({
		width: z().int().positive().max(16384),
		height: z().int().positive().max(16384)
	}),
	insets: lu
}).superRefine(({ source: e, insets: t }, n) => {
	(t.left + t.right >= e.width || t.top + t.bottom >= e.height) && n.addIssue({
		code: "custom",
		message: "Nine-slice requer centro com extensão positiva na imagem de origem."
	});
}), du = L().regex(/^[a-z]+-[\w-]{1,100}$/), fu = U({
	id: du,
	eventId: du,
	assetId: Pl,
	volume: z().min(0).max(1),
	caption: L().trim().min(1).max(500).refine(Jc)
}), pu = U({
	version: q(1),
	bindings: H(fu).max(256)
});
function mu(e, t, n) {
	let r = pu.parse(e, { jitless: !0 }), i = /* @__PURE__ */ new Set();
	for (let e of r.bindings) {
		if (i.has(e.id)) throw Error("IDs de vínculos de áudio duplicados.");
		if (i.add(e.id), t.get(e.assetId)?.kind !== "audio") throw Error("Vínculo de áudio referencia recurso ausente/incompatível.");
		if (!n.has(e.eventId)) throw Error("Vínculo de áudio referencia evento ausente.");
	}
	return r;
}
//#endregion
//#region ../../packages/edi-motion/src/data/model.ts
var hu = L().regex(/^[a-z]+-[\w-]{1,100}$/), gu = {
	id: hu,
	name: L().trim().min(1).max(120)
}, _u = G("kind", [
	U({
		...gu,
		kind: q("number"),
		min: z().min(-1e7).max(1e7),
		max: z().min(-1e7).max(1e7)
	}),
	U({
		...gu,
		kind: K([
			"string",
			"boolean",
			"color"
		])
	}),
	U({
		...gu,
		kind: q("enum"),
		values: H(L().min(1).max(120)).min(1).max(100)
	}),
	U({
		...gu,
		kind: K(["model", "list"]),
		modelId: hu
	})
]), vu = U({
	version: q(1),
	models: H(U({
		...gu,
		fields: H(_u).max(100)
	})).max(100),
	instances: H(U({
		...gu,
		modelId: hu,
		value: V()
	})).max(100),
	context: U({
		modelId: hu,
		instanceId: hu
	}).optional(),
	links: H(U({
		id: hu,
		instanceId: hu.nullable(),
		path: H(hu).min(1).max(16),
		inputId: hu,
		direction: K(["one-way", "two-way"])
	})).max(100)
});
function yu(e) {
	return typeof e == "object" && !!e && !Array.isArray(e) && [null, Object.prototype].includes(Object.getPrototypeOf(e));
}
var bu = /* @__PURE__ */ new Set([
	"__proto__",
	"prototype",
	"constructor"
]);
function xu(e) {
	let t = 0, n = 0, r = /* @__PURE__ */ new Set();
	function i(e, a) {
		if (++t > 1e5 || a > 40) throw Error("Orçamento estrutural de dados excedido.");
		if (typeof e == "string" && (n += e.length), typeof e == "object" && e) {
			if (r.has(e)) throw Error("Dados cíclicos não são persistíveis.");
			if (Array.isArray(e) ? e.length > 2e4 : !yu(e) || Object.keys(e).length > 1e3) throw Error("Estrutura de dados inválida ou excessiva.");
			r.add(e);
			for (let [t, r] of Object.entries(e)) {
				if (bu.has(t)) throw Error("Chave de dados reservada.");
				n += t.length, i(r, a + 1);
			}
			r.delete(e);
		}
		if (n > 1e6) throw Error("Orçamento textual de dados excedido.");
	}
	i(e, 0);
}
function Su(e) {
	xu(e);
	let t = vu.parse(e, { jitless: !0 }), n = new Map(t.models.map((e) => [e.id, e])), r = /* @__PURE__ */ new Set(), i = (e) => {
		if (r.has(e)) throw Error("IDs de dados precisam ser únicos.");
		r.add(e);
	}, a = 0;
	for (let e of t.models) {
		i(e.id), a += e.fields.length;
		for (let t of e.fields) {
			if (i(t.id), t.kind === "number" && t.min > t.max) throw Error("Intervalo numérico do campo invertido.");
			if (t.kind === "enum" && new Set(t.values).size !== t.values.length) throw Error("Opções de campo duplicadas.");
			if ((t.kind === "model" || t.kind === "list") && !n.has(t.modelId)) throw Error("Modelo composto órfão.");
		}
	}
	if (a > 1e3) throw Error("Orçamento agregado de campos excedido.");
	let o = /* @__PURE__ */ new Map(), s = (e, t) => {
		if (t.has(e)) throw Error("Modelos cíclicos não são permitidos.");
		let r = o.get(e);
		if (r !== void 0) return r;
		let i = n.get(e);
		if (!i) throw Error("Modelo ausente.");
		let a = /* @__PURE__ */ new Set([...t, e]), c = 1;
		for (let e of i.fields) (e.kind === "model" || e.kind === "list") && (c = Math.max(c, 1 + s(e.modelId, a)));
		if (c > 8) throw Error("Modelos profundos não são permitidos.");
		return o.set(e, c), c;
	};
	for (let e of t.models) s(e.id, /* @__PURE__ */ new Set());
	let c = {
		document: t,
		models: n,
		initial: /* @__PURE__ */ new Map()
	}, l = /* @__PURE__ */ new Map();
	for (let e of t.instances) i(e.id), l.set(e.id, Tu(c, e.modelId, e.value));
	if (t.context) {
		let e = t.instances.find((e) => e.id === t.context?.instanceId);
		if (!n.has(t.context.modelId)) throw Error("Modelo da prancheta ausente; escolha outro no inspetor da prancheta.");
		if (!e) throw Error("Instância da prancheta ausente; escolha outra no inspetor da prancheta.");
		if (e.modelId !== t.context.modelId) throw Error("Instância da prancheta precisa ser do modelo da prancheta.");
	}
	for (let e of t.links) {
		if (i(e.id), e.instanceId === null && wu(c, t.context?.modelId, e.path)) throw Error("Link da instância da prancheta não atravessa listas.");
		let n = Cu(t, e);
		if (!l.has(n)) throw Error("Instância vinculada órfã.");
		let r = Du(c, l, n, e.path);
		if (r.field.kind === "model" || r.field.kind === "list") throw Error("Input requer campo escalar, não lista/modelo.");
	}
	Eu(c, l);
	let u = /* @__PURE__ */ new Set(), d = /* @__PURE__ */ new Set(), f = new Set(t.links.filter((e) => e.instanceId === null && e.direction === "two-way").map((e) => JSON.stringify(e.path)));
	for (let e of t.links) {
		let n = JSON.stringify([e.instanceId, e.path]);
		if (u.has(e.inputId) || e.direction === "two-way" && d.has(n) || e.direction === "two-way" && e.instanceId !== null && f.has(JSON.stringify(e.path)) && t.instances.find((t) => t.id === e.instanceId)?.modelId === t.context?.modelId) throw Error("Links de dados conflitantes.");
		u.add(e.inputId), e.direction === "two-way" && d.add(n);
	}
	return {
		...c,
		initial: l
	};
}
function Cu(e, t, n = e.context?.instanceId) {
	let r = t.instanceId ?? n;
	if (!r) throw Error("Link da instância da prancheta requer modelo da prancheta.");
	return r;
}
function wu(e, t, n) {
	let r = t ? e.models.get(t) : void 0;
	for (let t of n) {
		let n = r?.fields.find((e) => e.id === t);
		if (!n) return !1;
		if (n.kind === "list") return !0;
		r = n.kind === "model" ? e.models.get(n.modelId) : void 0;
	}
	return !1;
}
function Tu(e, t, n) {
	let r = 0, i = 0;
	function a(t, n, o) {
		let s = e.models.get(t);
		if (!s || !yu(n) || Object.keys(n).length !== s.fields.length || o > 8) throw Error("Instância não corresponde ao modelo.");
		return Object.fromEntries(s.fields.map((e) => {
			if (++r > 2e4 || !Object.hasOwn(n, e.id)) throw Error("Campo ausente ou orçamento de valores excedido.");
			let t = n[e.id], s;
			if (e.kind === "model") s = a(e.modelId, t, o + 1);
			else if (e.kind === "list") {
				if (!Array.isArray(t) || t.length > 1e3) throw Error("Lista requer até 1000 itens.");
				let n = /* @__PURE__ */ new Set();
				if (i += t.length, i > 4e3) throw Error("Orçamento agregado de itens de lista excedido.");
				s = t.map((t) => {
					if (!yu(t) || typeof t.id != "string" || !hu.safeParse(t.id).success || n.has(t.id) || Object.keys(t).length !== 2 || !Object.hasOwn(t, "value")) throw Error("Item de lista requer identidade única e valor.");
					return n.add(t.id), {
						id: t.id,
						value: a(e.modelId, t.value, o + 1)
					};
				});
			} else if (e.kind === "number") {
				if (typeof t != "number" || !Number.isFinite(t) || t < e.min || t > e.max) throw Error("Número de campo fora do intervalo.");
				s = t;
			} else if (e.kind === "boolean") {
				if (typeof t != "boolean") throw Error("Campo requer booleano.");
				s = t;
			} else {
				if (typeof t != "string" || t.length > 1e4 || e.kind === "color" && !/^#[\da-f]{6}$/i.test(t) || e.kind === "enum" && !e.values.includes(t)) throw Error("Texto/cor/opção de campo inválido.");
				s = t;
			}
			return [e.id, s];
		}));
	}
	return a(t, n, 0);
}
function Eu(e, t) {
	if (xu([...t]), t.size !== e.document.instances.length) throw Error("Instâncias incompletas.");
	let n = /* @__PURE__ */ new Map();
	for (let r of e.document.instances) n.set(r.id, Tu(e, r.modelId, t.get(r.id)));
	for (let t of e.document.links) Du(e, n, Cu(e.document, t), t.path);
	return n;
}
function Du(e, t, n, r) {
	let i = e.document.instances.find((e) => e.id === n), a = i ? e.models.get(i.modelId) : void 0, o = t.get(n);
	if (!a || !o || r.length < 1 || r.length > 16) throw Error("Caminho de dados inválido.");
	for (let t = 0; t < r.length; t++) {
		let n = a.fields.find((e) => e.id === r[t]);
		if (!n) throw Error("Campo de caminho órfão.");
		if (!o) throw Error("Valor de caminho ausente.");
		let i = o[n.id];
		if (i === void 0) throw Error("Valor de caminho ausente.");
		if (t === r.length - 1) return {
			owner: o,
			field: n,
			value: i
		};
		if (n.kind === "model") {
			if (!yu(i)) throw Error("Modelo composto inválido.");
			o = i, a = e.models.get(n.modelId);
		} else if (n.kind === "list") {
			if (!Array.isArray(i)) throw Error("Lista inválida.");
			let s = i.find((e) => e.id === r[t + 1]);
			if (t++, !s) throw Error("Item vinculado não existe na lista.");
			o = s.value, a = e.models.get(n.modelId);
		} else throw Error("Caminho atravessa campo escalar.");
		if (!a) throw Error("Modelo de caminho órfão.");
	}
	throw Error("Caminho deve terminar em um campo.");
}
//#endregion
//#region ../../packages/edi-motion/src/model.ts
var Ou = K([
	"x",
	"y",
	"rotation",
	"sx",
	"sy",
	"opacity",
	"px",
	"py",
	"skewX"
]), ku = {
	x: [-1e4, 1e4],
	y: [-1e4, 1e4],
	rotation: [-1e4, 1e4],
	sx: [-20, 20],
	sy: [-20, 20],
	px: [-1e4, 1e4],
	py: [-1e4, 1e4],
	skewX: [-85, 85],
	opacity: [0, 100]
}, Au = L().regex(/^[a-z]+-[\w-]{1,100}$/), X = L().regex(/^node-[\w-]{1,100}$/), ju = K([
	"loop",
	"ping-pong",
	"once"
]), Mu = W([
	K(["linear", "hold"]),
	U({
		kind: q("elastic"),
		amplitude: z().min(1).max(10),
		period: z().min(.05).max(2)
	}),
	U({
		kind: q("cubic-bezier"),
		points: Bs([
			z().min(0).max(1),
			z().min(-10).max(10),
			z().min(0).max(1),
			z().min(-10).max(10)
		])
	})
]), Nu = U({
	id: Au,
	frame: z().min(0).max(36e4),
	value: z(),
	easing: Mu
}), Pu = U({
	id: Au,
	targetId: X,
	property: Ou,
	keys: H(Nu).min(1).max(1e4)
}), Fu = U({
	id: Au,
	frame: z().int().min(0).max(36e4),
	order: H(X).min(1).max(2e3)
}), Iu = U({
	id: Au,
	scopeId: X.nullable(),
	keys: H(Fu).min(1).max(1e3)
}), Lu = U({
	id: Au,
	name: L().trim().min(1).max(120),
	fps: z().int().min(1).max(240),
	frames: z().int().min(1).max(36e4),
	mode: ju,
	tracks: H(Pu).max(12e3),
	drawOrders: H(Iu).max(256).optional()
}), Ru = U({
	version: W([q(1), q(2)]),
	animations: H(Lu).max(100)
}), zu = U({
	x: z().min(-1e4).max(1e4),
	y: z().min(-1e4).max(1e4),
	rotation: z().min(-1e4).max(1e4),
	sx: z().min(-20).max(20),
	sy: z().min(-20).max(20),
	px: z().min(-1e4).max(1e4).optional(),
	py: z().min(-1e4).max(1e4).optional(),
	skewX: z().min(-85).max(85).optional(),
	opacity: z().min(0).max(100)
});
zu.partial();
function Bu(e, t) {
	let n = 0, r = 0;
	if (typeof e == "object" && e && "animations" in e && Array.isArray(e.animations)) {
		if (e.animations.length > 100) throw Error("Orçamento de animações excedido.");
		for (let t of e.animations) {
			if (typeof t == "object" && t && "drawOrders" in t && Array.isArray(t.drawOrders)) {
				for (let e of t.drawOrders) if (typeof e == "object" && e && "keys" in e && Array.isArray(e.keys)) {
					for (let t of e.keys) if (r += 1 + (typeof t == "object" && t && "order" in t && Array.isArray(t.order) ? t.order.length : 0), r > 1e5) throw Error("Orçamento de chaves excedido.");
				}
			}
			if (typeof t == "object" && t && "tracks" in t && Array.isArray(t.tracks)) {
				if (n += t.tracks.length, n > 12e3) throw Error("Orçamento de trilhas excedido.");
				for (let e of t.tracks) if (typeof e == "object" && e && "keys" in e && Array.isArray(e.keys) && (r += e.keys.length, r > 1e5)) throw Error("Orçamento de chaves excedido.");
			}
		}
	}
	let i = Ru.parse(e, { jitless: !0 });
	if (i.version === 1) {
		for (let e of i.animations) for (let t of e.tracks) if (t.property === "px" || t.property === "py" || t.property === "skewX" || t.keys.some((e) => typeof e.easing != "string" && e.easing.kind === "elastic" || (t.property === "sx" || t.property === "sy") && e.value <= 0)) throw Error("Canal/interpolação exige o formato de movimento v2.");
	}
	let a = {
		...i,
		version: 2
	}, o = /* @__PURE__ */ new Set(), s = 0, c = 0, l = (e) => {
		if (o.has(e)) throw Error("ID de animação/trilha/chave duplicado.");
		o.add(e);
	};
	for (let e of a.animations) {
		l(e.id);
		let n = /* @__PURE__ */ new Set();
		for (let r of e.tracks) {
			if (++c > 12e3) throw Error("Orçamento de trilhas excedido.");
			if (l(r.id), !t.has(r.targetId)) throw Error("Trilha referencia um objeto inexistente.");
			let i = `${r.targetId}:${r.property}`;
			if (n.has(i)) throw Error("Há duas trilhas para a mesma propriedade/objeto.");
			n.add(i);
			let a = -1, [o, u] = ku[r.property];
			for (let t of r.keys) {
				if (l(t.id), ++s > 1e5) throw Error("Orçamento de chaves excedido.");
				if (t.frame <= a || t.frame > e.frames) throw Error("Chaves precisam ser ordenadas, únicas e dentro da duração.");
				if (t.value < o || t.value > u) throw Error("Valor de chave fora dos limites da propriedade.");
				a = t.frame;
			}
		}
		let r = /* @__PURE__ */ new Set();
		for (let n of e.drawOrders ?? []) {
			if (l(n.id), n.scopeId !== null && !t.has(n.scopeId)) throw Error("Ordem de desenho referencia um grupo inexistente.");
			if (n.scopeId !== null) {
				if (r.has(n.scopeId)) throw Error("Há duas ordens de desenho para o mesmo grupo.");
				r.add(n.scopeId);
			}
			let i = -1;
			for (let r of n.keys) {
				if (l(r.id), s += r.order.length, ++s > 1e5) throw Error("Orçamento de chaves excedido.");
				if (r.frame <= i || r.frame > e.frames) throw Error("Chaves precisam ser ordenadas, únicas e dentro da duração.");
				if (new Set(r.order).size !== r.order.length) throw Error("Ordem de desenho repete um objeto.");
				for (let e of r.order) if (!t.has(e) || e === n.scopeId) throw Error("Ordem de desenho referencia um objeto inexistente.");
				i = r.frame;
			}
		}
	}
	return a;
}
//#endregion
//#region ../../packages/edi-motion/src/parameters.ts
function Vu(e, t, n) {
	return JSON.stringify([
		e,
		t,
		n
	]);
}
//#endregion
//#region ../../packages/edi-motion/src/behavior/formulas.ts
var Hu = L().regex(/^[a-z]+-[\w-]{1,100}$/), Z = fc(() => G("op", [
	U({
		op: q("number"),
		value: z().min(-1e7).max(1e7)
	}),
	U({
		op: q("text"),
		value: L().max(1e3).refine(Jc, "Texto de fórmula inválido.")
	}),
	U({
		op: q("boolean"),
		value: B()
	}),
	U({
		op: q("input"),
		inputId: Hu
	}),
	U({ op: q("time") }),
	U({
		op: K([
			"add",
			"subtract",
			"multiply",
			"divide",
			"modulo"
		]),
		left: Z,
		right: Z
	}),
	U({
		op: K(["min", "max"]),
		args: H(Z).min(2).max(8)
	}),
	U({
		op: K([
			"abs",
			"floor",
			"ceil",
			"round",
			"sin",
			"cos",
			"sqrt",
			"negate"
		]),
		arg: Z
	}),
	U({
		op: q("clamp"),
		value: Z,
		min: Z,
		max: Z
	}),
	U({
		op: q("compare"),
		operator: K([
			"eq",
			"neq",
			"lt",
			"lte",
			"gt",
			"gte"
		]),
		left: Z,
		right: Z
	}),
	U({
		op: K(["and", "or"]),
		left: Z,
		right: Z
	}),
	U({
		op: q("not"),
		arg: Z
	}),
	U({
		op: q("if"),
		condition: Z,
		ifTrue: Z,
		ifFalse: Z
	}),
	U({
		op: q("concat"),
		args: H(Z).min(1).max(8)
	}),
	U({
		op: q("noise"),
		seed: z().int().min(0).max(65535),
		arg: Z
	})
])), Uu = U({
	id: L().regex(/^formula-[\w-]{1,100}$/),
	inputId: Hu,
	expression: Z
}), Wu = {
	formulas: 64,
	nodes: 256,
	depth: 16,
	totalNodes: 4096
};
function Gu(e) {
	switch (e.op) {
		case "number":
		case "text":
		case "boolean":
		case "input":
		case "time": return [];
		case "add":
		case "subtract":
		case "multiply":
		case "divide":
		case "modulo":
		case "compare":
		case "and":
		case "or": return [e.left, e.right];
		case "min":
		case "max":
		case "concat": return e.args;
		case "abs":
		case "floor":
		case "ceil":
		case "round":
		case "sin":
		case "cos":
		case "sqrt":
		case "negate":
		case "not":
		case "noise": return [e.arg];
		case "clamp": return [
			e.value,
			e.min,
			e.max
		];
		case "if": return [
			e.condition,
			e.ifTrue,
			e.ifFalse
		];
	}
}
function Ku(e) {
	let t = 0, n = 0, r = /* @__PURE__ */ new Set(), i = [[e, 1]];
	for (; i.length;) {
		let e = i.pop();
		if (!e) break;
		let [a, o] = e;
		if (++t > Wu.nodes || o > Wu.depth) throw Error(`Fórmula excede ${Wu.nodes} nós ou profundidade ${Wu.depth}.`);
		n = Math.max(n, o), a.op === "input" && r.add(a.inputId);
		for (let e of Gu(a)) i.push([e, o + 1]);
	}
	return {
		nodes: t,
		depth: n,
		reads: r
	};
}
function qu(e, t) {
	let n = (e, n) => {
		let r = qu(e, t);
		if (r !== n) throw Error(`Fórmula espera ${n} e recebeu ${r}.`);
	};
	switch (e.op) {
		case "number":
		case "time": return "number";
		case "text": return "text";
		case "boolean": return "boolean";
		case "input": return t(e.inputId);
		case "add":
		case "subtract":
		case "multiply":
		case "divide":
		case "modulo": return n(e.left, "number"), n(e.right, "number"), "number";
		case "min":
		case "max":
			for (let t of e.args) n(t, "number");
			return "number";
		case "abs":
		case "floor":
		case "ceil":
		case "round":
		case "sin":
		case "cos":
		case "sqrt":
		case "negate":
		case "noise": return n(e.arg, "number"), "number";
		case "clamp": return n(e.value, "number"), n(e.min, "number"), n(e.max, "number"), "number";
		case "compare": {
			let r = qu(e.left, t);
			if (e.operator !== "eq" && e.operator !== "neq" && r !== "number") throw Error("Comparação de ordem requer números.");
			return n(e.right, r), "boolean";
		}
		case "and":
		case "or": return n(e.left, "boolean"), n(e.right, "boolean"), "boolean";
		case "not": return n(e.arg, "boolean"), "boolean";
		case "if": {
			n(e.condition, "boolean");
			let r = qu(e.ifTrue, t);
			return n(e.ifFalse, r), r;
		}
		case "concat":
			for (let n of e.args) qu(n, t);
			return "text";
	}
}
function Ju(e) {
	let t = new Map(e.map((e) => [e.inputId, e])), n = [], r = /* @__PURE__ */ new Map(), i = (e) => {
		let a = r.get(e.inputId);
		if (a !== "done") {
			if (a === "visiting") throw Error("Fórmulas formam um ciclo entre inputs.");
			r.set(e.inputId, "visiting");
			for (let n of Ku(e.expression).reads) {
				let e = t.get(n);
				e && i(e);
			}
			r.set(e.inputId, "done"), n.push(e);
		}
	};
	for (let t of e) i(t);
	return n;
}
//#endregion
//#region ../../packages/edi-motion/src/behavior/model.ts
var Q = L().regex(/^[a-z]+-[\w-]{1,100}$/), Yu = L().trim().min(1).max(120), Xu = {
	id: Q,
	name: Yu
}, Zu = G("kind", [
	U({
		...Xu,
		kind: q("number"),
		initial: z().min(-1e7).max(1e7),
		min: z().min(-1e7).max(1e7),
		max: z().min(-1e7).max(1e7)
	}),
	U({
		...Xu,
		kind: q("boolean"),
		initial: B()
	}),
	U({
		...Xu,
		kind: q("string"),
		initial: L().max(1e4)
	}),
	U({
		...Xu,
		kind: q("color"),
		initial: L().regex(/^#[\da-f]{6}$/i)
	}),
	U({
		...Xu,
		kind: q("enum"),
		initial: L().max(120),
		values: H(L().min(1).max(120)).min(1).max(100)
	}),
	U({
		...Xu,
		kind: q("trigger")
	})
]), Qu = G("operator", [
	U({
		inputId: Q,
		operator: q("trigger")
	}),
	U({
		inputId: Q,
		operator: K(["eq", "neq"]),
		value: W([
			z().min(-1e7).max(1e7),
			B(),
			L().max(1e4)
		])
	}),
	U({
		inputId: Q,
		operator: K([
			"gt",
			"gte",
			"lt",
			"lte"
		]),
		value: z().min(-1e7).max(1e7)
	})
]), $u = {
	id: Q,
	name: Yu,
	x: z().min(-1e4).max(1e4),
	y: z().min(-1e4).max(1e4),
	speed: z().min(.01).max(20)
}, ed = G("kind", [
	U({
		...$u,
		kind: q("base")
	}),
	U({
		...$u,
		kind: q("animation"),
		animationId: Q
	}),
	U({
		...$u,
		kind: q("blend1d"),
		inputId: Q,
		points: H(U({
			at: z().min(-1e7).max(1e7),
			animationId: Q
		})).min(2).max(32)
	})
]), td = U({
	id: Q,
	from: W([Q, q("*")]),
	to: Q,
	conditions: H(Qu).max(32),
	priority: z().int().min(-1e4).max(1e4),
	exitAt: z().min(0).max(1e3).nullable(),
	duration: z().min(0).max(60),
	easing: Mu,
	interrupt: K(["never", "immediate"])
}), nd = U({
	id: Q,
	name: Yu,
	layers: H(U({
		id: Q,
		name: Yu,
		entryStateId: Q,
		weight: z().min(0).max(1),
		mode: K(["override", "additive"]),
		targetIds: H(X).max(2e3),
		properties: H(Ou).min(1).max(9),
		states: H(ed).min(1).max(100),
		transitions: H(td).max(1e3)
	})).min(1).max(32)
}), rd = U({
	id: Q,
	animationId: Q,
	frame: z().min(0).max(36e4),
	name: Yu,
	data: Hs(L().min(1).max(80), W([
		L().max(1e3),
		z().min(-1e7).max(1e7),
		B(),
		Os()
	])).refine((e) => Object.keys(e).length <= 20)
}), id = G("kind", [
	U({
		id: Q,
		kind: q("parameter"),
		inputId: Q,
		targetId: L().regex(/^(?:constraint|morph|solo|trim|joystick)-[\w-]{1,100}$/),
		property: K([
			"strength",
			"progress",
			"weight",
			"activeIndex",
			"start",
			"end",
			"offset",
			"x",
			"y"
		]),
		scale: z().min(-1e4).max(1e4),
		offset: z().min(-1e4).max(1e4),
		direction: K(["one-way", "two-way"])
	}),
	U({
		id: Q,
		kind: q("transform"),
		inputId: Q,
		targetId: X,
		property: Ou,
		scale: z().min(-1e4).max(1e4),
		offset: z().min(-1e4).max(1e4),
		direction: K(["one-way", "two-way"])
	}),
	U({
		id: Q,
		kind: q("text"),
		inputId: Q,
		targetId: X,
		direction: K(["one-way", "two-way"])
	}),
	U({
		id: Q,
		kind: q("visibility"),
		inputId: Q,
		targetId: X,
		invert: B(),
		direction: q("one-way")
	}),
	U({
		id: Q,
		kind: q("color"),
		inputId: Q,
		targetId: X,
		property: K(["fill", "stroke"]),
		direction: K(["one-way", "two-way"])
	}),
	U({
		id: Q,
		kind: q("semantics"),
		inputId: Q,
		targetId: X,
		property: K(["label", "description"]),
		template: L().min(1).max(500).refine((e) => e.split("{valor}").length === 2 && Jc(e), "Modelo semântico requer um único {valor} e texto XML válido."),
		direction: q("one-way")
	})
]), ad = G("kind", [
	U({
		kind: q("set-input"),
		inputId: Q,
		value: W([
			L().max(1e4),
			z().min(-1e7).max(1e7),
			B()
		])
	}),
	U({
		kind: q("trigger"),
		inputId: Q
	}),
	U({
		kind: q("pointer-coordinate"),
		inputId: Q,
		axis: K(["x", "y"]),
		normalized: B()
	})
]), od = U({
	id: Q,
	targetId: X.nullable(),
	event: K([
		"enter",
		"leave",
		"activate",
		"move"
	]),
	actions: H(ad).min(1).max(16)
}), sd = U({
	version: W([q(1), q(2)]),
	inputs: H(Zu).max(100),
	machines: H(nd).max(20),
	bindings: H(id).max(1e3),
	listeners: H(od).max(1e3),
	events: H(rd).max(1e4),
	defaultMachineId: Q.nullable(),
	data: vu.optional(),
	formulas: H(Uu).max(Wu.formulas).optional()
});
function cd(e, t) {
	if (e.kind === "trigger") throw Error("Use trigger para disparar um gatilho.");
	if (e.kind === "number") {
		if (typeof t != "number" || !Number.isFinite(t) || t < e.min || t > e.max) throw Error("Valor numérico fora do intervalo do input.");
	} else if (e.kind === "boolean") {
		if (typeof t != "boolean") throw Error("Input requer booleano.");
	} else {
		if (typeof t != "string" || t.length > 1e4) throw Error("Input requer texto válido.");
		if (e.kind === "color" && !/^#[\da-f]{6}$/i.test(t)) throw Error("Input requer cor #RRGGBB.");
		if (e.kind === "enum" && !e.values.includes(t)) throw Error("Opção não pertence ao input.");
	}
	if (typeof t != "string" && typeof t != "number" && typeof t != "boolean") throw Error("Tipo de input inválido.");
	return t;
}
function ld(e, t, n, r) {
	let i = [[e, 0]], a = 0, o = 0;
	for (; i.length;) {
		let e = i.pop();
		if (!e) break;
		let [t, n] = e;
		if (++a > 2e5) throw Error("Orçamento estrutural de lógica excedido.");
		if (n > 96) throw Error("Lógica excede a profundidade estrutural.");
		if (typeof t == "string") o += t.length;
		else if (Array.isArray(t)) {
			if (t.length > 1e4) throw Error("Array de lógica excede o limite.");
			for (let e of t) i.push([e, n + 1]);
		} else if (typeof t == "object" && t) {
			let e = Object.entries(t);
			if (e.length > 1e3) throw Error("Objeto de lógica excede o limite.");
			for (let [t, r] of e) o += t.length, i.push([r, n + 1]);
		}
		if (o > 2e6) throw Error("Orçamento textual de lógica excedido.");
	}
	let s = 0, c = 0, l = 0;
	if (typeof e == "object" && e && "machines" in e && Array.isArray(e.machines)) {
		if (e.machines.length > 20) throw Error("Orçamento de máquinas excedido.");
		for (let t of e.machines) if (typeof t == "object" && t && "layers" in t && Array.isArray(t.layers)) {
			l += t.layers.length;
			for (let e of t.layers) typeof e == "object" && e && ("states" in e && Array.isArray(e.states) && (s += e.states.length), "transitions" in e && Array.isArray(e.transitions) && (c += e.transitions.length));
		}
	}
	if (s > 1e3 || c > 5e3 || l > 64) throw Error("Orçamento agregado de lógica excedido.");
	let u = sd.parse(e, { jitless: !0 }), d = new Map(u.inputs.map((e) => [e.id, e])), f = new Map(n.map((e) => [e.id, e])), p = /* @__PURE__ */ new Set(), m = (e) => {
		if (p.has(e)) throw Error("IDs de lógica precisam ser únicos.");
		p.add(e);
	}, h = (e) => {
		let t = d.get(e);
		if (!t) throw Error("Referência de input órfã.");
		return t;
	}, g = (e) => {
		let n = t.get(e);
		if (!n) throw Error("Referência de objeto órfã.");
		return n;
	};
	for (let e of u.inputs) {
		if (m(e.id), e.kind === "number" && e.min > e.max) throw Error("Intervalo de input invertido.");
		if (e.kind === "enum" && new Set(e.values).size !== e.values.length) throw Error("Opções de input duplicadas.");
		e.kind !== "trigger" && cd(e, e.initial);
	}
	for (let e of u.machines) {
		m(e.id);
		for (let t of e.layers) {
			if (m(t.id), new Set(t.targetIds).size !== t.targetIds.length || new Set(t.properties).size !== t.properties.length) throw Error("Máscara de camada duplicada.");
			for (let e of t.targetIds) g(e);
			if (t.mode === "additive" && t.weight > 0) {
				for (let e of r?.clips.values() ?? []) for (let n of e) if (typeof n.clockId == "string") {
					let e = r?.definitions.get(n.key);
					if (e?.discrete && (!t.targetIds.length || e.ownerIds.every((e) => t.targetIds.includes(e)))) throw Error("Canal solo discreto de componente não admite camada aditiva.");
				}
			}
			let e = new Set(t.states.map((e) => e.id));
			if (!e.has(t.entryStateId)) throw Error("Estado de entrada órfão.");
			for (let e of t.states) {
				m(e.id);
				let n = e.kind === "animation" ? [e.animationId] : e.kind === "blend1d" ? e.points.map((e) => e.animationId) : [];
				for (let e of n) if (!f.has(e)) throw Error("Animação de estado órfã.");
				if (t.mode === "additive" && t.weight > 0) for (let e of n) for (let n of r?.clips.get(e) ?? []) {
					let e = r?.definitions.get(n.key);
					if (e?.discrete && (!t.targetIds.length || e.ownerIds.every((e) => t.targetIds.includes(e)))) throw Error("Canal solo discreto não admite camada aditiva.");
				}
				if (e.kind === "blend1d") {
					if (h(e.inputId).kind !== "number") throw Error("Blend 1D requer input numérico.");
					if (e.points.some((t, n) => n > 0 && t.at <= (e.points[n - 1]?.at ?? t.at))) throw Error("Pontos de blend precisam estar em ordem crescente sem repetição.");
				}
			}
			for (let n of t.transitions) {
				if (m(n.id), n.from !== "*" && !e.has(n.from) || !e.has(n.to)) throw Error("Transição referencia estado órfão.");
				for (let e of n.conditions) {
					let t = h(e.inputId);
					if (e.operator === "trigger") {
						if (t.kind !== "trigger") throw Error("Condição trigger requer gatilho.");
					} else if (cd(t, e.value), !["eq", "neq"].includes(e.operator) && t.kind !== "number") throw Error("Comparação de ordem requer número.");
				}
			}
		}
	}
	if (u.machines.length === 0 != (u.defaultMachineId === null) || u.defaultMachineId !== null && !u.machines.some((e) => e.id === u.defaultMachineId)) throw Error("Máquina inicial inválida.");
	let _ = /* @__PURE__ */ new Set();
	for (let e of u.bindings) {
		if (m(e.id), e.kind === "parameter") {
			let t = r?.definitions.get(Vu([], e.targetId, e.property)), n = h(e.inputId);
			if (u.version !== 2 || !t || n.kind !== "number") throw Error("Binding de parâmetro requer lógica v2, destino existente e input numérico.");
			if (e.direction === "two-way" && (e.scale === 0 || t.discrete)) throw Error("Parâmetro bidirecional requer conversão contínua invertível.");
			let i = Vu([], e.targetId, e.property);
			if (_.has(i)) throw Error("Bindings conflitantes no mesmo destino.");
			_.add(i);
			continue;
		}
		if (e.kind === "semantics") {
			let t = h(e.inputId), n = g(e.targetId).semantics;
			if (t.kind === "trigger" || t.kind === "color") throw Error("Binding semântico requer input de texto, número, booleano ou lista.");
			if (!n || n.kind === "decorative" || e.property === "description" && !n.description) throw Error("Binding semântico requer objeto com nome acessível (e descrição, para a descrição).");
			let r = `${e.targetId}:semantics:${e.property}`;
			if (_.has(r)) throw Error("Bindings conflitantes no mesmo destino.");
			_.add(r);
			continue;
		}
		let t = h(e.inputId), n = g(e.targetId), i = e.kind === "transform" ? "number" : e.kind === "visibility" ? "boolean" : e.kind === "color" ? "color" : "string";
		if (t.kind !== i && (e.kind !== "text" || t.kind !== "enum")) throw Error("Tipos incompatíveis no binding.");
		if (e.kind === "text" && n.tag !== "text") throw Error("Binding textual requer objeto de texto.");
		if (e.kind === "color" && n.tag === "image") throw Error("Imagens raster não aceitam bindings de preenchimento/contorno vetorial.");
		if (e.kind === "transform" && e.direction === "two-way" && e.scale === 0) throw Error("Conversão bidirecional precisa ser invertível.");
		let a = `${e.targetId}:${e.kind}:${"property" in e ? e.property : ""}`;
		if (_.has(a)) throw Error("Bindings conflitantes no mesmo destino.");
		_.add(a);
	}
	for (let e of u.listeners) {
		m(e.id), e.targetId !== null && g(e.targetId);
		for (let t of e.actions) {
			let e = h(t.inputId);
			if (t.kind === "set-input" && cd(e, t.value), t.kind === "trigger" && e.kind !== "trigger") throw Error("Listener requer input trigger.");
			if (t.kind === "pointer-coordinate" && e.kind !== "number") throw Error("Coordenada requer input numérico.");
		}
	}
	for (let e of u.events) {
		m(e.id);
		let t = f.get(e.animationId);
		if (!t || e.frame > t.frames) throw Error("Evento fora da animação/prancheta.");
	}
	if (u.data) {
		let e = Su(u.data);
		for (let t of e.document.links) {
			let n = h(t.inputId), r = Du(e, e.initial, Cu(e.document, t), t.path), i = r.field;
			if (i.kind !== n.kind) throw Error("Link requer input e campo do mesmo tipo.");
			if (i.kind === "number" && n.kind === "number" && (i.min < n.min || i.max > n.max || t.direction === "two-way" && (i.min !== n.min || i.max !== n.max))) throw Error("Intervalos incompatíveis no link de dados.");
			if (i.kind === "enum" && n.kind === "enum" && (i.values.some((e) => !n.values.includes(e)) || t.direction === "two-way" && n.values.some((e) => !i.values.includes(e)))) throw Error("Opções incompatíveis no link de dados.");
			if (cd(n, r.value), t.direction === "one-way" && (u.listeners.some((e) => e.actions.some((e) => e.inputId === n.id)) || u.bindings.some((e) => e.inputId === n.id && e.direction === "two-way"))) throw Error("Input controlado por modelo somente leitura não admite listener de escrita/binding bidirecional.");
		}
	}
	if (u.formulas?.length) {
		let e = /* @__PURE__ */ new Set(), t = new Set(u.data ? Su(u.data).document.links.map((e) => e.inputId) : []), n = 0, r = (e) => {
			let t = h(e);
			if (t.kind === "trigger") throw Error("Fórmula não lê gatilhos.");
			return t.kind === "number" ? "number" : t.kind === "boolean" ? "boolean" : "text";
		};
		for (let i of u.formulas) {
			if (m(i.id), e.has(i.inputId)) throw Error("Input com duas fórmulas.");
			e.add(i.inputId);
			let a = h(i.inputId);
			if (a.kind === "enum" || a.kind === "color") throw Error("Fórmula calcula número, booleano ou texto livre; listas e cores não.");
			let o = r(i.inputId);
			if (t.has(i.inputId)) throw Error("Input ligado a dados não pode ser calculado por fórmula.");
			if (n += Ku(i.expression).nodes, n > Wu.totalNodes) throw Error(`Fórmulas excedem ${Wu.totalNodes} nós no total.`);
			let s = qu(i.expression, r);
			if (s !== o) throw Error(`Fórmula de ${i.inputId} produz ${s}, mas o input espera ${o}.`);
		}
		if (Ju(u.formulas), u.listeners.some((t) => t.actions.some((t) => e.has(t.inputId))) || u.bindings.some((t) => t.direction === "two-way" && e.has(t.inputId))) throw Error("Input calculado por fórmula é somente leitura para listeners e bindings bidirecionais.");
	}
	return u;
}
//#endregion
//#region ../../packages/edi-motion/src/svgPrimitive.ts
var ud = z().min(-1e7).max(1e7), dd = z().min(0).max(1e7), fd = H(Bs([ud, ud])).min(2).max(4e3), pd = G("kind", [
	U({
		kind: q("circle"),
		cx: ud,
		cy: ud,
		r: dd
	}),
	U({
		kind: q("ellipse"),
		cx: ud,
		cy: ud,
		rx: dd,
		ry: dd
	}),
	U({
		kind: q("rect"),
		x: ud,
		y: ud,
		width: dd,
		height: dd,
		rx: dd,
		ry: dd
	}).refine((e) => e.rx <= e.width / 2 && e.ry <= e.height / 2, "Raios de canto devem estar normalizados à dimensão da primitiva."),
	U({
		kind: q("line"),
		x1: ud,
		y1: ud,
		x2: ud,
		y2: ud
	}),
	U({
		kind: q("polyline"),
		points: fd
	}),
	U({
		kind: q("polygon"),
		points: fd
	})
]);
function md(e, t) {
	function n(e, n = 0) {
		let r = t[e];
		if (r === void 0) return n;
		if (r.length > 80 || !/^[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?(?:px)?$/i.test(r.trim())) throw Error("Primitiva SVG requer dimensões numéricas/px em userSpaceOnUse.");
		let i = Number(r.trim().replace(/px$/i, ""));
		if (!Number.isFinite(i) || Math.abs(i) > 1e7) throw Error("Coordenada de primitiva SVG fora do limite.");
		return i;
	}
	if (e === "circle") return pd.parse({
		kind: e,
		cx: n("cx"),
		cy: n("cy"),
		r: n("r")
	});
	if (e === "ellipse") return pd.parse({
		kind: e,
		cx: n("cx"),
		cy: n("cy"),
		rx: n("rx"),
		ry: n("ry")
	});
	if (e === "rect") {
		let t = n("width"), r = n("height"), i = n("rx", n("ry")), a = n("ry", n("rx"));
		if (i < 0 || a < 0) throw Error("Raio de canto SVG não pode ser negativo.");
		return pd.parse({
			kind: e,
			x: n("x"),
			y: n("y"),
			width: t,
			height: r,
			rx: Math.min(t / 2, i),
			ry: Math.min(r / 2, a)
		});
	}
	if (e === "line") return pd.parse({
		kind: e,
		x1: n("x1"),
		y1: n("y1"),
		x2: n("x2"),
		y2: n("y2")
	});
	if (e === "polyline" || e === "polygon") {
		let n = t.points ?? "", r = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi, i = [];
		if (n.length > 5e5 || n.replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?|[\s,]/gi, "")) throw Error("Lista de pontos SVG inválida/excessiva.");
		for (let e of n.matchAll(r)) {
			if (i.length >= 8e3) throw Error("Primitiva SVG excede 4000 pontos.");
			i.push(Number(e[0]));
		}
		if (i.length < 4 || i.length % 2) throw Error("Lista de pontos SVG incompleta.");
		let a = [];
		for (let e = 0; e < i.length; e += 2) {
			let t = i[e], n = i[e + 1];
			if (t === void 0 || n === void 0) throw Error("Coordenada SVG ausente.");
			a.push([t, n]);
		}
		return pd.parse({
			kind: e,
			points: a
		});
	}
	throw Error("Tag não é primitiva SVG suportada.");
}
function hd(e) {
	if (e.kind === "line") return `M${e.x1} ${e.y1}L${e.x2} ${e.y2}`;
	if (e.kind === "polygon" || e.kind === "polyline") return e.points.map(([e, t], n) => `${n ? "L" : "M"}${e} ${t}`).join(" ") + (e.kind === "polygon" ? "Z" : "");
	if (e.kind === "rect") {
		let { x: t, y: n, width: r, height: i, rx: a, ry: o } = e;
		return a && o ? `M${t + a} ${n}H${t + r - a}A${a} ${o} 0 0 1 ${t + r} ${n + o}V${n + i - o}A${a} ${o} 0 0 1 ${t + r - a} ${n + i}H${t + a}A${a} ${o} 0 0 1 ${t} ${n + i - o}V${n + o}A${a} ${o} 0 0 1 ${t + a} ${n}Z` : `M${t} ${n}H${t + r}V${n + i}H${t}Z`;
	}
	let { cx: t, cy: n } = e, r = e.kind === "circle" ? e.r : e.rx, i = e.kind === "circle" ? e.r : e.ry;
	return !r || !i ? `M${t} ${n}` : `M${t + r} ${n}A${r} ${i} 0 0 1 ${t - r} ${n}A${r} ${i} 0 0 1 ${t + r} ${n}Z`;
}
//#endregion
//#region ../../packages/edi-motion/src/geometry.ts
var gd = z().min(-1e7).max(1e7), _d = U({
	x: gd,
	y: gd
}), vd = _d.extend({
	in: _d.nullable(),
	out: _d.nullable()
}), yd = H(U({
	closed: B(),
	points: H(vd).min(1).max(4e3)
})).min(1).max(4e3);
function bd(e) {
	let t = 0;
	if (Array.isArray(e)) {
		if (e.length > 4e3) throw Error("Geometria excede 4000 contornos.");
		for (let n of e) if (typeof n == "object" && n && Array.isArray(n.points) && (t += n.points.length, t > 4e3)) throw Error("Geometria excede 4000 vértices.");
	}
	return t;
}
function xd(e) {
	return bd(e), yd.parse(e, { jitless: !0 });
}
function Sd(e, t) {
	if (e.length !== t.length) throw Error("Morph requer o mesmo número de contornos.");
	for (let [n, r] of e.entries()) {
		let e = t[n];
		if (!e || e.closed !== r.closed || e.points.length !== r.points.length) throw Error("Morph requer topologia e fechamento idênticos.");
		for (let [t, n] of r.points.entries()) {
			let r = e.points[t];
			if (!r || n.in === null != (r.in === null) || n.out === null != (r.out === null)) throw Error("Morph requer alças correspondentes; normalize a topologia antes de capturar.");
		}
	}
}
function Cd(e) {
	let t = (e) => `${e.x} ${e.y}`, n = [];
	for (let r of e) {
		let e = r.points[0];
		if (!e) throw Error("Contorno vazio.");
		n.push(`M${t(e)}`);
		for (let e = 1; e < r.points.length + +!!r.closed; e++) {
			let i = r.points[e - 1], a = r.points[e % r.points.length];
			if (!i || !a) throw Error("Segmento órfão.");
			n.push(i.out || a.in ? `C${t(i.out ?? i)} ${t(a.in ?? a)} ${t(a)}` : `L${t(a)}`);
		}
		r.closed && n.push("Z");
	}
	return n.join(" ");
}
//#endregion
//#region ../../packages/edi-motion/src/affineSchema.ts
var wd = z().min(-1e7).max(1e7), Td = Bs([
	wd,
	wd,
	wd,
	wd,
	wd,
	wd
]), Ed = (e, t) => ({
	x: e,
	y: t,
	in: null,
	out: null
}), Dd = (e) => ({
	x: e.x,
	y: e.y
}), Od = (e, t, n) => ({
	x: e.x + (t.x - e.x) * n,
	y: e.y + (t.y - e.y) * n
}), kd = (e, t) => ({
	x: 2 * e.x - t.x,
	y: 2 * e.y - t.y
}), Ad = (e, t) => Math.hypot(e.x - t.x, e.y - t.y) < 1e-8;
function jd(e, t) {
	let n = e[t];
	if (n === void 0 || !Number.isFinite(n)) throw Error("Parâmetros SVG incompletos/inválidos.");
	return n;
}
function Md(e, t) {
	let n = Math.abs(jd(t, 0)), r = Math.abs(jd(t, 1)), i = jd(t, 2), a = jd(t, 3), o = jd(t, 4), s = jd(t, 5), c = jd(t, 6);
	if (![0, 1].includes(a) || ![0, 1].includes(o)) throw Error("Flags de arco inválidas.");
	if (Ad(e, {
		x: s,
		y: c
	})) return [];
	if (!n || !r) return [{ end: Ed(s, c) }];
	let l = i * Math.PI / 180, u = Math.cos(l), d = Math.sin(l), f = (e.x - s) / 2, p = (e.y - c) / 2, m = u * f + d * p, h = -d * f + u * p, g = m * m / (n * n) + h * h / (r * r);
	g > 1 && (n *= Math.sqrt(g), r *= Math.sqrt(g));
	let _ = (a === o ? -1 : 1) * Math.sqrt(Math.max(0, (n * n * r * r - n * n * h * h - r * r * m * m) / (n * n * h * h + r * r * m * m))), v = _ * n * h / r, y = -_ * r * m / n, b = u * v - d * y + (e.x + s) / 2, x = d * v + u * y + (e.y + c) / 2, S = (m - v) / n, C = (h - y) / r, ee = (-m - v) / n, w = (-h - y) / r, T = Math.atan2(C, S), E = Math.atan2(S * w - C * ee, S * ee + C * w);
	!o && E > 0 && (E -= 2 * Math.PI), o && E < 0 && (E += 2 * Math.PI);
	let D = Math.ceil(Math.abs(E) / (Math.PI / 2)), te = E / D, ne = (e, t) => ({
		x: b + n * u * e - r * d * t,
		y: x + n * d * e + r * u * t
	}), re = [];
	for (let e = 0; e < D; e++) {
		let e = T + te, t = 4 / 3 * Math.tan(te / 4);
		re.push({
			c1: ne(Math.cos(T) - t * Math.sin(T), Math.sin(T) + t * Math.cos(T)),
			c2: ne(Math.cos(e) + t * Math.sin(e), Math.sin(e) - t * Math.cos(e)),
			end: {
				...Ed(0, 0),
				...ne(Math.cos(e), Math.sin(e))
			}
		}), T = e;
	}
	let ie = re.at(-1);
	if (!ie) throw Error("Arco SVG numericamente degenerado.");
	return Object.assign(ie.end, {
		x: s,
		y: c
	}), re;
}
function Nd(e) {
	if (typeof e != "string" || e.length > 5e5) throw Error("Dados de caminho inválidos.");
	let t = e.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? [];
	if (e.replace(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?|[\s,]/g, "")) throw Error("Sintaxe SVG inválida.");
	let n = {
		M: 2,
		L: 2,
		H: 1,
		V: 1,
		C: 6,
		S: 4,
		Q: 4,
		T: 2,
		A: 7
	}, r = [], i, a = Ed(0, 0), o = "", s = "", c = null, l = 0, u = 0, d = () => {
		if (++u > 4e3) throw Error("O caminho excede 4000 vértices.");
	}, f = (e, t = null, n = null) => {
		if (!i) throw Error("O segmento precisa iniciar com M.");
		i.closed && (d(), i = {
			closed: !1,
			points: [Ed(a.x, a.y)]
		}, r.push(i)), d();
		let o = i.points.at(-1);
		if (!o) throw Error("Contorno SVG vazio.");
		t && (o.out = t), e.in = n, i.points.push(e), a = e;
	};
	for (; l < t.length;) {
		let e = t[l];
		if (e === void 0 || (/^[a-z]$/i.test(e) && (o = e, l++), !o)) throw Error("Comando SVG ausente.");
		let u = o.toUpperCase(), p = o !== u;
		if (u === "Z") {
			if (!i || i.closed) throw Error("Fechamento inválido.");
			let e = i.points[0], t = i.points.at(-1);
			if (!e || !t) throw Error("Contorno SVG vazio.");
			i.points.length > 1 && Ad(e, t) && (e.in = t.in, i.points.pop()), i.closed = !0, a = e, o = "", s = "Z", c = null;
			continue;
		}
		let m = n[u];
		if (!m) throw Error(`Comando SVG não suportado: ${o}`);
		let h = [];
		for (let e = 0; e < m; e++) {
			let n = t[l];
			if (n === void 0 || /^[a-z]$/i.test(n)) throw Error("Parâmetros SVG incompletos.");
			if (u === "A" && (e === 3 || e === 4) && n.length > 1 && /^[01]\d/.test(n)) {
				h.push(Number(n[0])), t[l] = n.slice(1);
				continue;
			}
			let r = Number(n);
			if (l++, !Number.isFinite(r)) throw Error("Número SVG inválido.");
			h.push(r);
		}
		let g = (e, t) => ({
			x: e + (p ? a.x : 0),
			y: t + (p ? a.y : 0)
		}), _ = (e, t) => ({
			...Ed(0, 0),
			...g(e, t)
		}), v = (e) => jd(h, e);
		if (u === "M") d(), a = _(v(0), v(1)), i = {
			closed: !1,
			points: [a]
		}, r.push(i), o = p ? "l" : "L";
		else if (u === "L") f(_(v(0), v(1)));
		else if (u === "H") f(Ed(v(0) + (p ? a.x : 0), a.y));
		else if (u === "V") f(Ed(a.x, v(0) + (p ? a.y : 0)));
		else if (u === "C") f(_(v(4), v(5)), g(v(0), v(1)), g(v(2), v(3)));
		else if (u === "S") f(_(v(2), v(3)), ["C", "S"].includes(s) && a.in ? kd(a, a.in) : Dd(a), g(v(0), v(1)));
		else if (u === "Q" || u === "T") {
			let e = u === "Q" ? g(v(0), v(1)) : ["Q", "T"].includes(s) && c ? kd(a, c) : Dd(a), t = u === "Q" ? _(v(2), v(3)) : _(v(0), v(1));
			f(t, Od(a, e, 2 / 3), Od(t, e, 2 / 3)), c = e;
		} else if (u === "A") {
			let e = g(v(5), v(6));
			for (let t of Md(a, [
				...h.slice(0, 5),
				e.x,
				e.y
			])) f(t.end, t.c1 ?? null, t.c2 ?? null);
		}
		["Q", "T"].includes(u) || (c = null), s = u;
	}
	if (!r.length) throw Error("Caminho vazio.");
	return xd(r);
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/patterns.ts
var Pd = z().min(-1e5).max(1e5), Fd = z().positive().max(1e5), Id = z().min(0).max(1), Ld = L().regex(/^#[\da-f]{6}$/i).transform((e) => e.toLowerCase()), Rd = 4e3, zd = 1e5;
function Bd(e) {
	return e.shapes.reduce((e, t) => e + Nd(t.d).reduce((e, t) => e + t.points.length, 0), 0);
}
var Vd = U({
	d: L().min(1).max(2e5),
	fill: W([q("none"), Ld]),
	fillOpacity: Id,
	fillRule: K(["nonzero", "evenodd"]),
	stroke: W([q("none"), Ld]),
	strokeOpacity: Id,
	strokeWidth: z().min(0).max(1e4),
	strokeLinecap: K([
		"butt",
		"round",
		"square"
	]),
	strokeLinejoin: K([
		"miter",
		"round",
		"bevel"
	]),
	opacity: Id,
	transform: Td.optional()
}), Hd = L().regex(/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/), Ud = U({
	kind: q("pattern"),
	units: K(["objectBoundingBox", "userSpaceOnUse"]),
	contentUnits: K(["objectBoundingBox", "userSpaceOnUse"]),
	x: Pd,
	y: Pd,
	width: Fd,
	height: Fd,
	viewBox: Bs([
		Pd,
		Pd,
		Fd,
		Fd
	]).optional(),
	preserveAspectRatio: Hd.optional(),
	transform: Td.optional(),
	shapes: H(Vd).min(1).max(64)
}).superRefine((e, t) => {
	for (let n of [e.transform, ...e.shapes.map((e) => e.transform)]) if (n) try {
		Zl(n);
	} catch {
		t.addIssue({
			code: "custom",
			message: "Transformação do padrão precisa ser invertível."
		});
	}
	e.preserveAspectRatio && !e.viewBox && t.addIssue({
		code: "custom",
		message: "preserveAspectRatio do padrão requer viewBox."
	}), e.viewBox && e.contentUnits !== "userSpaceOnUse" && t.addIssue({
		code: "custom",
		message: "Com viewBox, o conteúdo do padrão usa o sistema do viewBox (userSpaceOnUse)."
	});
	let n = 0;
	for (let r of e.shapes) {
		try {
			n += Nd(r.d).reduce((e, t) => e + t.points.length, 0);
		} catch (e) {
			t.addIssue({
				code: "custom",
				message: e instanceof Error ? e.message : "Caminho do padrão inválido."
			});
			return;
		}
		r.fill === "none" && r.stroke === "none" && t.addIssue({
			code: "custom",
			message: "Forma do padrão sem pintura visível."
		});
	}
	n > 4e3 && t.addIssue({
		code: "custom",
		message: `Padrão excede ${Rd} vértices por tile.`
	});
});
function Wd(e) {
	let t = Ud.parse(e);
	return `edi-pattern-${Mc(Wc(new TextEncoder().encode(JSON.stringify(t))))}`;
}
var Gd = (e) => `matrix(${e.join(" ")})`;
function Kd(e) {
	let t = Ud.parse(e), n = {
		id: Wd(t),
		patternUnits: t.units,
		patternContentUnits: t.contentUnits,
		x: String(t.x),
		y: String(t.y),
		width: String(t.width),
		height: String(t.height)
	};
	return t.viewBox && (n.viewBox = t.viewBox.join(" ")), t.preserveAspectRatio && (n.preserveAspectRatio = t.preserveAspectRatio), t.transform && (n.patternTransform = Gd(t.transform)), {
		tag: "pattern",
		attrs: n,
		children: t.shapes.map((e) => ({
			tag: "path",
			attrs: {
				d: e.d,
				fill: e.fill,
				"fill-opacity": String(e.fillOpacity),
				"fill-rule": e.fillRule,
				stroke: e.stroke,
				"stroke-opacity": String(e.strokeOpacity),
				"stroke-width": String(e.strokeWidth),
				"stroke-linecap": e.strokeLinecap,
				"stroke-linejoin": e.strokeLinejoin,
				opacity: String(e.opacity),
				...e.transform ? { transform: Gd(e.transform) } : {}
			},
			children: []
		}))
	};
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/gradients.ts
var qd = z().min(-1e5).max(1e5), Jd = {
	units: K(["objectBoundingBox", "userSpaceOnUse"]),
	spread: K([
		"pad",
		"reflect",
		"repeat"
	]),
	transform: Td.optional(),
	stops: V().refine((e) => Array.isArray(e) && e.length >= 2 && e.length <= 32, {
		error: "Gradiente requer 2–32 paradas.",
		abort: !0
	}).pipe(H(U({
		offset: z().min(0).max(1),
		color: L().regex(/^#[\da-f]{6}$/i).transform((e) => e.toLowerCase()),
		opacity: z().min(0).max(1)
	})).min(2).max(32))
}, Yd = G("kind", [U({
	...Jd,
	kind: q("linear"),
	x1: qd,
	y1: qd,
	x2: qd,
	y2: qd
}), U({
	...Jd,
	kind: q("radial"),
	cx: qd,
	cy: qd,
	r: z().positive().max(1e5),
	fx: qd,
	fy: qd
})]).superRefine((e, t) => {
	if (e.transform) try {
		Zl(e.transform);
	} catch {
		t.addIssue({
			code: "custom",
			message: "Transformação do gradiente precisa ser invertível."
		});
	}
	e.stops.some((t, n) => n > 0 && t.offset < (e.stops[n - 1]?.offset ?? 0)) && t.addIssue({
		code: "custom",
		message: "Paradas do gradiente devem estar ordenadas."
	}), e.kind === "linear" && e.x1 === e.x2 && e.y1 === e.y2 && t.addIssue({
		code: "custom",
		message: "Vetor de gradiente linear precisa ter extensão."
	});
}), Xd = W([Yd, Ud]), Zd = U({
	fill: Xd.optional(),
	stroke: Xd.optional()
}).refine((e) => e.fill || e.stroke, "Informe ao menos um gradiente ou padrão.");
function Qd(e) {
	return e.kind === "pattern" ? Wd(e) : tf(e);
}
function $d(e) {
	return e.kind === "pattern" ? Kd(e) : nf(e);
}
function ef(e) {
	return e?.fill?.kind === "pattern" || e?.stroke?.kind === "pattern";
}
function tf(e) {
	let t = Yd.parse(e), n = JSON.stringify(t);
	return `edi-gradient-${Mc(Wc(new TextEncoder().encode(n)))}`;
}
function nf(e) {
	let t = Yd.parse(e), n = {
		id: tf(t),
		gradientUnits: t.units,
		spreadMethod: t.spread,
		"color-interpolation": "sRGB"
	};
	return t.transform && (n.gradientTransform = `matrix(${t.transform.join(" ")})`), t.kind === "linear" ? Object.assign(n, {
		x1: String(t.x1),
		y1: String(t.y1),
		x2: String(t.x2),
		y2: String(t.y2)
	}) : Object.assign(n, {
		cx: String(t.cx),
		cy: String(t.cy),
		r: String(t.r),
		fx: String(t.fx),
		fy: String(t.fy)
	}), {
		tag: t.kind === "linear" ? "linearGradient" : "radialGradient",
		attrs: n,
		children: t.stops.map((e) => ({
			tag: "stop",
			attrs: {
				offset: String(e.offset),
				"stop-color": e.color,
				"stop-opacity": String(e.opacity)
			},
			children: []
		}))
	};
}
function rf(e) {
	let t = /* @__PURE__ */ new Map(), n = 0, r = 0;
	for (let i of e) {
		if (++n > 12e3) throw Error("Orçamento de pinturas inspecionadas excedido.");
		for (let e of [i?.fill, i?.stroke]) if (e) {
			let n = $d(e), i = n.attrs.id;
			if (!i) throw Error("Identidade de gradiente ausente.");
			if (e.kind === "pattern" && !t.has(i) && (r += Bd(e), r > 1e5)) throw Error(`Padrões distintos excedem ${zd} vértices por cena/documento.`);
			if (t.set(i, n), t.size > 256) throw Error("Limite de 256 gradientes/padrões distintos por cena/documento.");
		}
	}
	return [...t.values()];
}
var af = /* @__PURE__ */ new Set([
	"g",
	"path",
	"rect",
	"circle",
	"ellipse",
	"line",
	"polyline",
	"polygon",
	"text"
]), of = [
	"fill",
	"fill-opacity",
	"stroke",
	"stroke-width",
	"stroke-opacity",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-dasharray"
], sf = {
	"": 1,
	px: 1,
	pt: 4 / 3,
	pc: 16,
	mm: 96 / 25.4,
	cm: 96 / 2.54,
	in: 96
};
function cf(e) {
	let t = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-z]*)\s*$/i.exec(e ?? "1"), n = t ? sf[(t[2] ?? "").toLowerCase()] : void 0, r = t && n !== void 0 ? Number(t[1]) * n : NaN;
	if (!Number.isFinite(r) || r < 0 || r > 1e7) throw Error("Contorno de fonte de máscara pintada precisa de largura absoluta (px, pt, mm…), não relativa (em, %).");
	return r;
}
function lf(e, t) {
	let n = { ...t };
	for (let t of e) {
		for (let e of of) {
			let r = t.attrs?.[e];
			r !== void 0 && r !== "inherit" && r !== "unset" && (n[e] = r);
		}
		for (let e of ["fill", "stroke"]) {
			let r = t.gradients?.[e];
			r && (n[e] = `url(#${Qd(r)})`);
		}
	}
	return n;
}
function uf(e) {
	return !!e?.mask?.mode && e.mask.mode !== "silhouette";
}
function df(e, t, n = {}) {
	let r = new Set([...t.values()].flatMap((e) => uf(e) && e.mask ? [e.mask.sourceId] : [])), i = /* @__PURE__ */ new Map();
	if (!r.size) return i;
	let a = /* @__PURE__ */ new Map(), o = 0;
	for (let t of e) {
		if (++o > 2e3) throw Error("Fontes de máscara excedem orçamento de objetos.");
		a.set(t.id, t);
	}
	for (let e of r) {
		let t = [];
		for (let n = a.get(e); n; n = n.parentId ? a.get(n.parentId) : void 0) if (t.unshift(n), t.length > 33) throw Error("Herança da fonte de máscara profunda demais.");
		let r = t.at(-1);
		if (!r || r.id !== e) throw Error("Fonte de máscara pintada ausente.");
		if (r.filter !== void 0) throw Error("Fonte de máscara pintada com filtro fica fora do perfil.");
		if (r.paintLayers?.length) throw Error("Fonte de máscara pintada com camadas de pintura extras fica fora do perfil.");
		let o = lf(t, n);
		o.stroke !== void 0 && o.stroke !== "none" && cf(o["stroke-width"]), i.set(e, o);
	}
	return i;
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/filters.ts
var ff = z().min(-1e4).max(1e4), pf = Bs([z().min(0).max(200), z().min(0).max(200)]), mf = z().min(0).max(1), hf = L().regex(/^#[\da-f]{6}$/i).transform((e) => e.toLowerCase()), gf = W([
	q("SourceGraphic"),
	q("SourceAlpha"),
	z().int().min(0).max(15)
]), _f = G("kind", [
	U({
		kind: q("blur"),
		in: gf,
		stdDeviation: pf,
		edgeMode: K([
			"none",
			"duplicate",
			"wrap"
		])
	}),
	U({
		kind: q("offset"),
		in: gf,
		dx: ff,
		dy: ff
	}),
	U({
		kind: q("dropShadow"),
		in: gf,
		dx: ff,
		dy: ff,
		stdDeviation: pf,
		color: hf,
		opacity: mf
	}),
	U({
		kind: q("colorMatrix"),
		in: gf,
		type: K([
			"matrix",
			"saturate",
			"hueRotate",
			"luminanceToAlpha"
		]),
		values: H(z().min(-36e3).max(36e3)).max(20)
	}),
	U({
		kind: q("flood"),
		color: hf,
		opacity: mf
	}),
	U({
		kind: q("blend"),
		in: gf,
		in2: gf,
		mode: K([
			"normal",
			"multiply",
			"screen",
			"overlay",
			"darken",
			"lighten",
			"color-dodge",
			"color-burn",
			"hard-light",
			"soft-light",
			"difference",
			"exclusion",
			"hue",
			"saturation",
			"color",
			"luminosity"
		])
	}),
	U({
		kind: q("composite"),
		in: gf,
		in2: gf,
		operator: K([
			"over",
			"in",
			"out",
			"atop",
			"xor",
			"lighter",
			"arithmetic"
		]),
		k: Bs([
			ff,
			ff,
			ff,
			ff
		]).optional()
	}),
	U({
		kind: q("merge"),
		inputs: H(gf).min(1).max(16)
	})
]), vf = z().min(-1e5).max(1e5), yf = U({
	units: K(["objectBoundingBox", "userSpaceOnUse"]),
	primitiveUnits: K(["userSpaceOnUse", "objectBoundingBox"]),
	x: vf,
	y: vf,
	width: z().positive().max(1e5),
	height: z().positive().max(1e5),
	colorInterpolation: K(["linearRGB", "sRGB"]),
	primitives: H(_f).min(1).max(16)
}).superRefine((e, t) => {
	for (let [n, r] of e.primitives.entries()) {
		if ((r.kind === "flood" ? [] : r.kind === "merge" ? r.inputs : r.kind === "blend" || r.kind === "composite" ? [r.in, r.in2] : [r.in]).some((e) => typeof e == "number" && e >= n) && t.addIssue({
			code: "custom",
			message: "Entrada de filtro precisa referir uma primitiva anterior."
		}), r.kind === "colorMatrix") {
			let e = {
				matrix: 20,
				saturate: 1,
				hueRotate: 1,
				luminanceToAlpha: 0
			}[r.type];
			(r.values.length !== e || r.type === "matrix" && r.values.some((e) => Math.abs(e) > 1e3) || r.type === "saturate" && !((r.values[0] ?? -1) >= 0 && (r.values[0] ?? 101) <= 100)) && t.addIssue({
				code: "custom",
				message: "Valores de feColorMatrix fora do perfil."
			});
		}
		r.kind === "composite" && r.operator === "arithmetic" != !!r.k && t.addIssue({
			code: "custom",
			message: "Coeficientes k1–k4 existem somente no composite aritmético."
		});
	}
});
function bf(e) {
	let t = yf.parse(e);
	return `edi-filter-${Mc(Wc(new TextEncoder().encode(JSON.stringify(t))))}`;
}
var xf = (e) => typeof e == "number" ? `edi-r${e}` : e;
function Sf(e) {
	let t = yf.parse(e);
	return {
		tag: "filter",
		attrs: {
			id: bf(t),
			filterUnits: t.units,
			primitiveUnits: t.primitiveUnits,
			x: String(t.x),
			y: String(t.y),
			width: String(t.width),
			height: String(t.height),
			"color-interpolation-filters": t.colorInterpolation
		},
		children: t.primitives.map((e, t) => {
			let n = { result: `edi-r${t}` };
			switch (e.kind) {
				case "blur": return {
					tag: "feGaussianBlur",
					attrs: {
						in: xf(e.in),
						stdDeviation: e.stdDeviation.join(" "),
						edgeMode: e.edgeMode,
						...n
					},
					children: []
				};
				case "offset": return {
					tag: "feOffset",
					attrs: {
						in: xf(e.in),
						dx: String(e.dx),
						dy: String(e.dy),
						...n
					},
					children: []
				};
				case "dropShadow": return {
					tag: "feDropShadow",
					attrs: {
						in: xf(e.in),
						dx: String(e.dx),
						dy: String(e.dy),
						stdDeviation: e.stdDeviation.join(" "),
						"flood-color": e.color,
						"flood-opacity": String(e.opacity),
						...n
					},
					children: []
				};
				case "colorMatrix": return {
					tag: "feColorMatrix",
					attrs: {
						in: xf(e.in),
						type: e.type,
						...e.values.length ? { values: e.values.join(" ") } : {},
						...n
					},
					children: []
				};
				case "flood": return {
					tag: "feFlood",
					attrs: {
						"flood-color": e.color,
						"flood-opacity": String(e.opacity),
						...n
					},
					children: []
				};
				case "blend": return {
					tag: "feBlend",
					attrs: {
						in: xf(e.in),
						in2: xf(e.in2),
						mode: e.mode,
						...n
					},
					children: []
				};
				case "composite": return {
					tag: "feComposite",
					attrs: {
						in: xf(e.in),
						in2: xf(e.in2),
						operator: e.operator,
						...e.k ? {
							k1: String(e.k[0]),
							k2: String(e.k[1]),
							k3: String(e.k[2]),
							k4: String(e.k[3])
						} : {},
						...n
					},
					children: []
				};
				case "merge": return {
					tag: "feMerge",
					attrs: n,
					children: e.inputs.map((e) => ({
						tag: "feMergeNode",
						attrs: { in: xf(e) },
						children: []
					}))
				};
			}
			throw Error(`Primitiva de filtro desconhecida: ${JSON.stringify(e)}`);
		})
	};
}
function Cf(e) {
	let t = /* @__PURE__ */ new Map(), n = 0;
	for (let r of e) {
		if (++n > 12e3) throw Error("Orçamento de filtros inspecionados excedido.");
		if (!r) continue;
		let e = Sf(r), i = e.attrs.id;
		if (!i) throw Error("Identidade de filtro ausente.");
		if (t.set(i, e), t.size > 64) throw Error("Limite de 64 filtros distintos por cena/documento.");
	}
	return [...t.values()];
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/nativeEffectSources.ts
function wf(e, t) {
	if (!t.size) return /* @__PURE__ */ new Map();
	if (t.size > 2e3) throw Error("Efeitos excedem orçamento de objetos.");
	let n = /* @__PURE__ */ new Map(), r = 0;
	for (let t of e) {
		if (++r > 2e3) throw Error("Fontes de efeitos excedem orçamento de objetos.");
		n.set(t.id, t);
	}
	let i = new Set([...t.values()].flatMap((e) => [e.clip?.sourceId, e.mask?.sourceId].filter((e) => e !== void 0))), a = /* @__PURE__ */ new Map(), o = 0;
	if (n.size > 2e3 || i.size > 256) throw Error("Fontes de efeitos excedem orçamento.");
	for (let e of i) {
		let t = n.get(e);
		if (!t) throw Error("Fonte de efeito ausente.");
		if (t.tag === "path") continue;
		if (!t.attrs) throw Error("Primitiva de efeito requer desenho portátil validado.");
		let r = md(t.tag, t.attrs);
		if (o += r.kind === "polygon" || r.kind === "polyline" ? r.points.length : 8, o > 1e5) throw Error("Primitivas de efeitos excedem orçamento agregado de vértices.");
		a.set(e, r);
	}
	return a;
}
var Tf = H(U({
	id: L().regex(/^paint-[\w-]{1,100}$/),
	kind: K(["fill", "stroke"]),
	color: L().regex(/^#[\da-f]{6}$/i).transform((e) => e.toLowerCase()),
	paint: Xd.optional(),
	opacity: z().min(0).max(1),
	visible: B(),
	name: L().trim().min(1).max(120).optional(),
	width: z().min(0).max(1e4).optional(),
	linecap: K([
		"butt",
		"round",
		"square"
	]).optional(),
	linejoin: K([
		"miter",
		"round",
		"bevel"
	]).optional()
}).superRefine((e, t) => {
	e.kind === "fill" && (e.width !== void 0 || e.linecap !== void 0 || e.linejoin !== void 0) && t.addIssue({
		code: "custom",
		message: "Espessura, ponta e junção valem só para camadas de contorno."
	});
})).min(1).max(16).superRefine((e, t) => {
	new Set(e.map((e) => e.id)).size !== e.length && t.addIssue({
		code: "custom",
		message: "Camadas de pintura com identificador repetido."
	});
}), Ef = /* @__PURE__ */ new Set([
	"path",
	"rect",
	"circle",
	"ellipse",
	"line",
	"polyline",
	"polygon"
]);
function Df(e) {
	return (e ?? []).filter((e) => e.visible);
}
function Of(e) {
	return Df(e).flatMap((e) => e.paint ? [e.paint] : []);
}
//#endregion
//#region ../../packages/edi-motion/src/rig/kinematics.ts
function kf(e, t, n = { remaining: 2e6 }) {
	if (e.size > 2e3) throw Error("Rig excede o orçamento de objetos.");
	let r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Set();
	if (!Number.isInteger(n.remaining) || n.remaining < 0 || n.remaining > 2e6) throw Error("Orçamento de avaliação de rig inválido.");
	for (let [n, i] of e) r.set(n, { ...t.get(n) ?? i.transform });
	function o(t) {
		let n = e.get(t);
		if (!n) throw Error("Objeto do rig ausente.");
		return n;
	}
	function s(e) {
		let t = r.get(e);
		if (!t) throw Error("Pose do rig ausente.");
		return t;
	}
	function c(e, t = 0) {
		let n = o(e);
		return Yl(n.parentId === null ? Jl() : l(n.parentId, t + 1), n.basis ?? Jl());
	}
	function l(e, t = 0) {
		if (--n.remaining < 0 || t > 32) throw Error("Rig excede o orçamento de avaliação/profundidade.");
		let r = i.get(e);
		if (r) return r;
		if (a.has(e)) throw Error("Hierarquia de rig cíclica.");
		a.add(e);
		let l = Yl(Yl(c(e, t), $l(s(e))), o(e).attributeMatrix ?? Jl());
		return a.delete(e), i.set(e, l), l;
	}
	return {
		objects: e,
		poses: r,
		object: o,
		pose: s,
		world: l,
		pre: c,
		point(e, t = 0, n = 0) {
			return Ql(l(e), t, n);
		},
		set(e, t) {
			let n = {
				...s(e),
				...t
			};
			for (let [e, t] of Object.entries(ku)) {
				let r = Reflect.get(n, e);
				if (r !== void 0 && (typeof r != "number" || !Number.isFinite(r) || r < t[0] || r > t[1])) throw Error("Restrição produz pose fora dos limites.");
			}
			r.set(e, n), i.clear();
		}
	};
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/vectorEffects.ts
var Af = U({
	sourceId: X,
	rule: K(["nonzero", "evenodd"])
}), jf = U({
	clip: Af.optional(),
	mask: Af.extend({
		opacity: z().min(0).max(1),
		mode: K([
			"silhouette",
			"alpha",
			"luminance"
		]).optional()
	}).optional()
}).refine((e) => e.clip !== void 0 || e.mask !== void 0, { error: "Informe um recorte ou máscara." });
function Mf(e) {
	if (e.size > 2e3) throw Error("Efeitos excedem o orçamento de objetos.");
	let t = new Map(e), n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Set();
	function i(e, a = 0) {
		let o = n.get(e);
		if (o) return o;
		if (a > 32 || r.has(e)) throw Error("Hierarquia de efeitos inválida.");
		let s = t.get(e);
		if (!s) throw Error("Referência de hierarquia de efeitos ausente.");
		r.add(e);
		let c = s.parentId === null ? void 0 : t.get(s.parentId);
		if (s.parentId !== null && !c) throw Error("Grupo de efeito ausente.");
		let l = s.parentId === null ? void 0 : i(s.parentId, a + 1), u = (l?.depth ?? 0) + 1;
		if (u > 33) throw Error("Hierarquia de efeitos profunda demais.");
		let d = {
			depth: u,
			viewport: c?.tag === "svg" ? s.parentId : l?.viewport ?? null
		};
		return r.delete(e), n.set(e, d), d;
	}
	let a = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set(), c = 0, l = [];
	for (let [e, n] of t) {
		if (i(e), !n.effects) continue;
		let r = jf.parse(n.effects);
		if (n.tag === "svg") throw Error("Aplique o efeito à instância, não ao viewport.");
		for (let n of ["clip", "mask"]) {
			let u = r[n];
			if (!u) continue;
			let d = t.get(u.sourceId);
			if (d?.nativeShape && !s.has(u.sourceId)) {
				let e = pd.parse(d.nativeShape), n = xd(Nd(hd(e)));
				if (e.kind !== d.tag || d.geometry && Cd(d.geometry) !== Cd(n)) throw Error("Primitiva nativa de efeito não corresponde à geometria/tag.");
				if (e.kind === "polygon" || e.kind === "polyline") {
					for (let t of e.points) Object.freeze(t);
					Object.freeze(e.points);
				}
				Object.freeze(e), d = {
					...d,
					nativeShape: e,
					geometry: n
				}, t.set(u.sourceId, d), s.add(u.sourceId);
			}
			if (!d || d.tag !== "path" && !d.nativeShape || !d.geometry?.length || u.sourceId === e) throw Error("Recorte/máscara requer outro caminho vetorial não vazio.");
			if (d.effects) throw Error("A fonte do efeito não pode possuir recorte/máscara.");
			if (d.pathData !== void 0 && !a.has(u.sourceId)) {
				if (Cd(Nd(d.pathData)) !== Cd(d.geometry)) throw Error("Sintaxe nativa do efeito não corresponde à geometria.");
				a.add(u.sourceId);
			}
			if (!o.has(u.sourceId)) {
				if (c += d.geometry.reduce((e, t) => e + t.points.length, 0), c > 1e5) throw Error("Fontes de efeitos excedem orçamento agregado de geometria.");
				o.add(u.sourceId);
			}
			if (i(e).viewport !== i(u.sourceId).viewport) throw Error("Fonte e destino do efeito precisam compartilhar o viewport.");
			if (l.length >= 256) throw Error("Cena excede 256 recortes/máscaras.");
			let f = n === "mask" && r.mask?.mode && r.mask.mode !== "silhouette" ? r.mask.mode : void 0;
			if (f && !d.paint) throw Error("Máscara pintada requer a pintura efetiva da fonte.");
			l.push({
				targetId: e,
				kind: n,
				sourceId: u.sourceId,
				rule: u.rule,
				opacity: n === "mask" && r.mask ? r.mask.opacity : 1,
				...f ? { mode: f } : {}
			});
		}
	}
	return {
		objects: new Map([...t].map(([e, n]) => [e, n.parentId !== null && t.get(n.parentId)?.tag === "svg" ? {
			...n,
			parentId: null
		} : n])),
		references: l
	};
}
function Nf(e, t, n, r, i) {
	if (!t.size) return Mf(/* @__PURE__ */ new Map());
	let a = /* @__PURE__ */ new Map();
	for (let o of e.objects) {
		if (!o.tag || o.parentId === void 0) throw Error("Efeitos requerem metadados completos de playback v3.");
		a.set(o.id, {
			...o,
			tag: o.tag,
			parentId: o.parentId,
			effects: t.get(o.id),
			pathData: n?.get(o.id),
			nativeShape: r?.get(o.id),
			paint: i?.get(o.id)
		});
	}
	for (let e of t.keys()) if (!a.has(e)) throw Error("Destino do efeito ausente.");
	return Mf(a);
}
//#endregion
//#region ../../packages/edi-motion/src/layout/model.ts
var $ = z().min(0).max(1e5), Pf = z().min(-1e5).max(1e5), Ff = G("kind", [
	U({
		kind: q("fixed"),
		value: $
	}),
	U({ kind: q("hug") }),
	U({
		kind: q("fill"),
		weight: z().min(.001).max(1e3)
	}),
	U({
		kind: q("percent"),
		value: z().min(0).max(1)
	})
]), If = U({
	axis: K([
		"x",
		"y",
		"both"
	]),
	friction: z().min(1).max(30),
	spring: z().min(1).max(1e3),
	damping: z().min(1).max(100),
	bounce: B()
}), Lf = U({
	flow: K([
		"row",
		"column",
		"grid"
	]),
	direction: K(["ltr", "rtl"]),
	wrap: B(),
	padding: Bs([
		$,
		$,
		$,
		$
	]),
	gap: Bs([$, $]),
	justify: K([
		"start",
		"center",
		"end",
		"space-between",
		"space-around",
		"space-evenly"
	]),
	align: K([
		"start",
		"center",
		"end",
		"stretch"
	]),
	columns: W([U({
		kind: q("fixed"),
		count: z().int().min(1).max(24)
	}), U({
		kind: q("auto-fit"),
		minWidth: z().min(.1).max(1e5)
	})]).optional(),
	clip: B(),
	scroll: If.nullable()
}), Rf = U({
	targetId: X,
	width: Ff,
	height: Ff,
	minWidth: $,
	maxWidth: $,
	minHeight: $,
	maxHeight: $,
	margin: Bs([
		$,
		$,
		$,
		$
	]),
	alignSelf: K([
		"auto",
		"start",
		"center",
		"end",
		"stretch"
	]),
	aspectRatio: z().min(1e-4).max(1e4).nullable(),
	position: G("kind", [U({ kind: q("flow") }), U({
		kind: q("absolute"),
		left: Pf.nullable(),
		right: Pf.nullable(),
		top: Pf.nullable(),
		bottom: Pf.nullable()
	})])
}), zf = K([
	"fixed",
	"hug",
	"fill"
]), Bf = U({
	width: zf,
	height: zf
}), Vf = U({
	version: q(1),
	root: Lf,
	rootSize: Bf.optional(),
	containers: H(U({
		targetId: X,
		config: Lf
	})).max(2e3),
	items: H(Rf).max(2e3)
});
function Hf(e) {
	return {
		targetId: e,
		width: { kind: "hug" },
		height: { kind: "hug" },
		minWidth: 0,
		maxWidth: 1e5,
		minHeight: 0,
		maxHeight: 1e5,
		margin: [
			0,
			0,
			0,
			0
		],
		alignSelf: "auto",
		aspectRatio: null,
		position: { kind: "flow" }
	};
}
function Uf(e, t) {
	if (typeof e == "object" && e && ("items" in e && Array.isArray(e.items) && e.items.length > 2e3 || "containers" in e && Array.isArray(e.containers) && e.containers.length > 2e3)) throw Error("Orçamento de layout excedido.");
	if (t.size > 2e3) throw Error("Layout excede o orçamento de objetos.");
	let n = Vf.parse(e, { jitless: !0 }), r = new Map(n.containers.map((e) => [e.targetId, e.config])), i = new Map(n.items.map((e) => [e.targetId, e]));
	if (r.size !== n.containers.length || i.size !== n.items.length) throw Error("Layout possui referências duplicadas.");
	for (let [e, n] of t) {
		let r = /* @__PURE__ */ new Set([e]), i = n.parentId;
		for (; i !== null;) {
			if (r.has(i) || r.size > 32) throw Error("Hierarquia cíclica/profunda no layout.");
			r.add(i);
			let e = t.get(i);
			if (!e) throw Error("Pai de layout órfão.");
			i = e.parentId;
		}
	}
	for (let e of n.containers) {
		let n = t.get(e.targetId);
		if (n?.tag !== "g" || n.isComponent) throw Error("Contêiner de layout requer grupo editável, não instância de componente.");
		if (n.parentId !== null && !r.has(n.parentId)) throw Error("Ative layout nos grupos ancestrais antes deste contêiner.");
	}
	for (let e of [n.root, ...r.values()]) if (e.flow === "grid" != (e.columns !== void 0)) throw Error("Grade uniforme requer colunas; outros fluxos não usam colunas.");
	for (let e of n.items) {
		let n = t.get(e.targetId);
		if (!n || n.parentId !== null && !r.has(n.parentId)) throw Error("Item não pertence a um contêiner de layout ativo.");
		if (e.minWidth > e.maxWidth || e.minHeight > e.maxHeight) throw Error("Limites de layout invertidos.");
		if (e.position.kind === "absolute" && (e.position.left !== null && e.position.right !== null && e.width.kind !== "fill" || e.position.top !== null && e.position.bottom !== null && e.height.kind !== "fill")) throw Error("Duas âncoras opostas exigem preencher o eixo, sem largura/altura contraditória.");
		let i = r.get(e.targetId);
		if (i?.flow === "grid" && i.columns?.kind === "auto-fit" && e.width.kind === "hug") throw Error("Grade auto-fit precisa de largura definida pelo pai, não hug circular.");
	}
	let a = n.rootSize;
	if (a?.width === "hug" && n.root.columns?.kind === "auto-fit") throw Error("Grade auto-fit com largura hug é circular.");
	if (a?.width === "hug" || a?.height === "hug") for (let [e, n] of t) {
		if (n.parentId !== null) continue;
		let t = i.get(e) ?? Hf(e);
		if (t.position.kind !== "absolute" && (a.width === "hug" && ["fill", "percent"].includes(t.width.kind) || a.height === "hug" && ["fill", "percent"].includes(t.height.kind))) throw Error("Hug/fill ou percent cria dependência circular; defina o tamanho da prancheta.");
	}
	for (let [e, n] of r) {
		let r = i.get(e) ?? Hf(e);
		if (n.flow === "grid" && n.columns?.kind === "auto-fit" && r.width.kind === "hug") throw Error("Grade auto-fit com largura hug é circular.");
		for (let [n, a] of t) {
			if (a.parentId !== e) continue;
			let t = i.get(n) ?? Hf(n);
			if (t.position.kind !== "absolute" && (r.width.kind === "hug" && ["fill", "percent"].includes(t.width.kind) || r.height.kind === "hug" && ["fill", "percent"].includes(t.height.kind))) throw Error("Hug/fill ou percent cria dependência circular; defina o tamanho do contêiner.");
		}
	}
	return n;
}
//#endregion
//#region ../../packages/edi-motion/src/rig/cost.ts
function Wf(e) {
	let t = 0, n = 0, r = 0, i = 0;
	for (let n of e?.morphs ?? []) t += n.geometry.reduce((e, t) => e + t.points.length, 0);
	for (let t of e?.skins ?? []) n += t.weights.length;
	n += (e?.joysticks?.length ?? 0) * 2;
	for (let t of e?.parameterClips ?? []) r += t.tracks.length, i += t.tracks.reduce((e, t) => e + t.keys.length, 0);
	return {
		vertices: t,
		controls: n,
		tracks: r,
		keys: i,
		deformers: (e?.morphs?.length ?? 0) + (e?.skins?.length ?? 0) + (e?.solos?.length ?? 0) + (e?.trims?.length ?? 0)
	};
}
//#endregion
//#region ../../packages/edi-motion/src/rig/ik.ts
function Gf(e, t) {
	if (t.length < 1 || t.length > 8 || new Set(t.map((e) => e.targetId)).size !== t.length) throw Error("IK requer cadeia única de 1 a 8 ossos.");
	for (let [n, r] of t.entries()) {
		let i = e.object(r.targetId), a = e.pose(r.targetId), o = t[n - 1];
		if (!Number.isFinite(r.length) || r.length <= 0 || r.length > 1e5 || r.minRotation > r.maxRotation || ![r.minRotation, r.maxRotation].every((e) => Number.isFinite(e) && Math.abs(e) <= 1e4)) throw Error("Dimensões/limites do osso inválidos.");
		if (i.tag !== "g" || i.isComponent || a.sx <= 0 || a.sx !== a.sy || a.px || a.py || a.skewX || n > 0 && i.basis?.some((e, t) => e !== Jl()[t]) || i.attributeMatrix?.some((e, t) => e !== Jl()[t]) || o && (i.parentId !== o.targetId || a.x !== o.length || a.y !== 0)) throw Error("IK requer ossos contíguos, escala uniforme positiva e pivô/skew/basis neutros; FK mantém os demais perfis.");
	}
}
//#endregion
//#region ../../packages/edi-motion/src/rig/joystick.ts
var Kf = z().min(-1).max(1), qf = U({
	id: L().regex(/^joystick-[\w-]{1,100}$/),
	name: L().trim().min(1).max(120),
	targetId: X,
	x: Kf,
	y: Kf,
	rangeX: z().min(1e-6).max(1e4),
	rangeY: z().min(1e-6).max(1e4),
	limit: K(["square", "circle"])
});
function Jf(e, t, n) {
	if (![e, t].every((e) => Number.isFinite(e) && e >= -1 && e <= 1)) throw Error("Eixos de joystick devem ficar entre -1 e 1.");
	if (n !== "square" && n !== "circle") throw Error("Limite de joystick inválido.");
	let r = Math.hypot(e, t), i = n === "circle" && r > 1 ? r : 1;
	return {
		x: e / i,
		y: t / i
	};
}
function Yf(e, t, n) {
	if (!Number.isInteger(n.remaining) || n.remaining < 0 || n.remaining > 2e6) throw Error("Orçamento de joystick inválido.");
	if (n.remaining -= 8, n.remaining < 0) throw Error("Joystick excede orçamento compartilhado.");
	let r = Jf(t.x, t.y, e.limit), i = r.x * e.rangeX, a = r.y * e.rangeY;
	if (![i, a].every((e) => Number.isFinite(e) && Math.abs(e) <= 1e4)) throw Error("Deslocamento de joystick fora do perfil numérico.");
	return {
		axes: r,
		offset: {
			x: i,
			y: a
		}
	};
}
function Xf(e, t, n, r) {
	for (let i of t) {
		let { offset: t } = Yf(i, {
			x: r?.get(Vu([], i.id, "x")) ?? i.x,
			y: r?.get(Vu([], i.id, "y")) ?? i.y
		}, n), a = e.pose(i.targetId);
		try {
			e.set(i.targetId, {
				x: a.x + t.x,
				y: a.y + t.y
			});
		} catch (e) {
			throw Error(`Joystick ${i.id} produz posição local fora dos limites.`, { cause: e });
		}
	}
}
//#endregion
//#region ../../packages/edi-motion/src/rig/model.ts
var Zf = z().min(-1e4).max(1e4), Qf = z().min(0).max(1e5), $f = z().min(0).max(1), ep = L().regex(/^constraint-[\w-]{1,100}$/);
function tp(e) {
	return e?.tag === "path" || e?.tag === "image" && e.geometry !== void 0;
}
var np = U({
	id: L().regex(/^skin-[\w-]{1,100}$/),
	targetId: X,
	bindMatrix: Td,
	bones: H(U({
		targetId: X,
		inverseBindMatrix: Td
	})).min(1).max(256),
	weights: H(H(U({
		boneId: X,
		weight: z().positive().max(1)
	})).min(1).max(4)).min(1).max(4e3)
}), rp = U({
	id: L().regex(/^trim-[\w-]{1,100}$/),
	targetId: X,
	layerId: L().regex(/^paint-[\w-]{1,100}$/).optional(),
	start: $f,
	end: $f,
	offset: z().min(-36e3).max(36e3),
	tolerance: z().min(1e-6).max(100),
	mode: K(["parallel", "sequential"])
}), ip = U({
	targetId: X,
	length: z().positive().max(1e4),
	minRotation: Zf,
	maxRotation: Zf
}), ap = G("kind", [
	U({
		id: ep,
		kind: q("path"),
		ownerId: X,
		targetId: X,
		contour: z().int().min(0).max(3999),
		progress: $f,
		orient: B(),
		rotationOffset: Zf,
		offset: Zf,
		tolerance: z().min(1e-6).max(100),
		strength: $f
	}),
	U({
		id: ep,
		kind: q("ik"),
		chain: H(X).min(1).max(8),
		targetId: X,
		strength: $f,
		bend: K(["positive", "negative"]),
		tolerance: z().min(1e-6).max(100),
		iterations: z().int().min(1).max(128)
	}),
	U({
		id: ep,
		kind: q("distance"),
		ownerId: X,
		targetId: X,
		min: Qf,
		max: Qf,
		strength: $f
	}),
	U({
		id: ep,
		kind: q("transform"),
		ownerId: X,
		targetId: X,
		space: K(["local", "world"]),
		channels: H(K([
			"x",
			"y",
			"rotation",
			"sx",
			"sy",
			"skewX"
		])).min(1).max(6),
		offset: U({
			x: Zf,
			y: Zf,
			rotation: Zf,
			sx: z().min(-20).max(20),
			sy: z().min(-20).max(20)
		}),
		strength: $f
	})
]), op = U({
	id: L().regex(/^track-[\w-]{1,100}$/),
	targetId: L().regex(/^(?:constraint|morph|solo|trim|joystick)-[\w-]{1,100}$/),
	property: K([
		"strength",
		"progress",
		"weight",
		"activeIndex",
		"start",
		"end",
		"offset",
		"x",
		"y"
	]),
	keys: H(Nu).min(1).max(1e4)
}), sp = U({
	version: W([
		q(1),
		q(2),
		q(3),
		q(4)
	]),
	bones: H(ip).max(256),
	constraints: H(ap).max(256),
	targets: H(X).max(256).default([]),
	skins: H(np).max(256).optional(),
	trims: H(rp).max(256).optional(),
	joysticks: H(qf).max(256).optional(),
	morphs: H(U({
		id: L().regex(/^morph-[\w-]{1,100}$/),
		name: L().trim().min(1).max(120),
		targetId: X,
		geometry: yd,
		weight: $f
	})).max(256).optional(),
	solos: H(U({
		id: L().regex(/^solo-[\w-]{1,100}$/),
		targetId: X,
		children: H(X).min(1).max(2e3),
		activeIndex: z().int().min(-1).max(1999)
	})).max(256).optional(),
	parameterClips: H(U({
		animationId: L().regex(/^[a-z]+-[\w-]{1,100}$/),
		tracks: H(op).max(12e3)
	})).max(100).optional()
});
function cp(e) {
	let t = e.constraints.map((e) => ({
		targetId: e.id,
		property: "strength",
		definition: {
			initial: e.strength,
			bounds: [0, 1],
			discrete: !1,
			ownerIds: dp(e)
		}
	}));
	for (let n of e.constraints) n.kind === "path" && t.push({
		targetId: n.id,
		property: "progress",
		definition: {
			initial: n.progress,
			bounds: [0, 1],
			discrete: !1,
			ownerIds: [n.ownerId]
		}
	});
	for (let n of e.morphs ?? []) t.push({
		targetId: n.id,
		property: "weight",
		definition: {
			initial: n.weight,
			bounds: [0, 1],
			discrete: !1,
			ownerIds: [n.targetId]
		}
	});
	let n = t;
	for (let t of e.solos ?? []) n.push({
		targetId: t.id,
		property: "activeIndex",
		definition: {
			initial: t.activeIndex,
			bounds: [-1, t.children.length - 1],
			discrete: !0,
			ownerIds: [t.targetId, ...t.children]
		}
	});
	for (let t of e.trims ?? []) for (let e of [
		"start",
		"end",
		"offset"
	]) n.push({
		targetId: t.id,
		property: e,
		definition: {
			initial: t[e],
			bounds: e === "offset" ? [-36e3, 36e3] : [0, 1],
			discrete: !1,
			ownerIds: [t.targetId]
		}
	});
	for (let t of e.joysticks ?? []) for (let e of ["x", "y"]) n.push({
		targetId: t.id,
		property: e,
		definition: {
			initial: t[e],
			bounds: [-1, 1],
			discrete: !1,
			ownerIds: [t.targetId]
		}
	});
	return n;
}
function lp(e) {
	return new Map(cp(e).map((e) => [Vu([], e.targetId, e.property), e.definition]));
}
function up(e, t) {
	for (let n of e.parameterClips ?? []) {
		let e = t.find((e) => e.id === n.animationId);
		if (!e || n.tracks.some((t) => t.keys.some((t) => t.frame > e.frames))) throw Error("Canal de rig requer animação existente e chaves dentro da duração.");
	}
}
function dp(e) {
	return e.kind === "ik" ? e.chain : [e.ownerId];
}
function fp(e, t) {
	if (typeof e == "object" && e && "joysticks" in e && Array.isArray(e.joysticks) && e.joysticks.length > 256) throw Error("Orçamento de joysticks excedido.");
	let n = 0, r = 0;
	if (typeof e == "object" && e && "skins" in e && Array.isArray(e.skins)) {
		let t = 0;
		if (e.skins.length > 256) throw Error("Orçamento de malhas excedido.");
		for (let n of e.skins) if (typeof n == "object" && n && Array.isArray(n.weights) && (t += n.weights.length, n.weights.length > 4e3 || t > 1e5 || n.weights.some((e) => Array.isArray(e) && e.length > 4))) throw Error("Malhas excedem orçamento de vértices/influências.");
	}
	if (typeof e == "object" && e && "morphs" in e && Array.isArray(e.morphs)) {
		let t = 0;
		if (e.morphs.length > 256) throw Error("Orçamento de morphs excedido.");
		for (let n of e.morphs) if (typeof n == "object" && n && "geometry" in n && (t += bd(n.geometry), t > 1e5)) throw Error("Morphs excedem orçamento de geometria.");
	}
	if (typeof e == "object" && e && "parameterClips" in e && Array.isArray(e.parameterClips)) {
		if (e.parameterClips.length > 100) throw Error("Orçamento de clips de rig excedido.");
		for (let t of e.parameterClips) if (typeof t == "object" && t && Array.isArray(t.tracks)) {
			if (r += t.tracks.length, r > 12e3) throw Error("Orçamento de canais de rig excedido.");
			for (let e of t.tracks) if (typeof e == "object" && e && Array.isArray(e.keys) && (n += e.keys.length, n > 1e5)) throw Error("Orçamento de chaves de rig excedido.");
		}
	}
	let i = sp.parse(e, { jitless: !0 }), a = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set();
	if (t.size > 2e3) throw Error("Rig excede o orçamento de objetos.");
	let s = Wf(i);
	if (s.deformers > 256 || s.vertices > 1e5 || s.controls > 1e5) throw Error("Rig excede orçamento agregado de deformação.");
	if (i.version === 1 && (i.parameterClips !== void 0 || i.morphs !== void 0 || i.solos !== void 0 || i.skins !== void 0 || i.constraints.some((e) => e.kind === "path"))) throw Error("Canais/deformação/caminho/solo exigem formato v2.");
	let c = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Set();
	if (i.version < 3 && i.trims !== void 0) throw Error("Trim paths exigem formato de rig v3.");
	if (i.version < 4 && i.joysticks !== void 0) throw Error("Joysticks exigem formato de rig v4.");
	let u = /* @__PURE__ */ new Set();
	for (let e of i.trims ?? []) {
		let n = t.get(e.targetId), r = `${e.targetId}#${e.layerId ?? ""}`;
		if (c.has(e.id) || u.has(r) || n?.tag !== "path" || n.isComponent || !n.geometry?.length) throw Error("Trim requer ID único e um caminho local por controlador.");
		c.add(e.id), u.add(r);
	}
	for (let e of i.morphs ?? []) {
		let n = t.get(e.targetId);
		if (c.has(e.id) || !tp(n) || !n?.geometry) throw Error("Morph requer ID único e geometria de caminho ou malha válida.");
		c.add(e.id), Sd(n.geometry, e.geometry);
	}
	for (let e of i.solos ?? []) {
		let n = t.get(e.targetId), r = [...t].filter(([, t]) => t.parentId === e.targetId).map(([e]) => e);
		if (c.has(e.id) || l.has(e.targetId) || n?.tag !== "g" || n.isComponent || e.activeIndex >= e.children.length || JSON.stringify(r) !== JSON.stringify(e.children)) throw Error("Solo requer grupo local, filhos diretos na ordem original e índice válido.");
		c.add(e.id), l.add(e.targetId);
	}
	let d = /* @__PURE__ */ new Set(), f = new Set(i.constraints.flatMap((e) => [...dp(e)])), p = new Set(i.bones.map((e) => e.targetId));
	for (let e of i.joysticks ?? []) {
		let n = t.get(e.targetId);
		if (c.has(e.id) || d.has(e.targetId) || !i.targets.includes(e.targetId) || n?.tag !== "g" || n.parentId !== null || n.isComponent || p.has(e.targetId) || f.has(e.targetId)) throw Error("Joystick requer ID único e um alvo raiz local exclusivo, sem osso/constraint escrevendo sua posição.");
		c.add(e.id), d.add(e.targetId);
	}
	let m = lp(i), h = /* @__PURE__ */ new Set(), g = /* @__PURE__ */ new Set();
	for (let e of i.parameterClips ?? []) {
		if (h.has(e.animationId)) throw Error("Clip de rig duplicado.");
		h.add(e.animationId);
		let t = /* @__PURE__ */ new Set();
		for (let n of e.tracks) {
			let e = Vu([], n.targetId, n.property), r = m.get(e);
			if (!r || t.has(e) || g.has(n.id)) throw Error("Canal de rig duplicado ou órfão.");
			t.add(e), g.add(n.id);
			let i = -1;
			for (let e of n.keys) {
				if (g.has(e.id) || e.frame <= i || e.value < r.bounds[0] || e.value > r.bounds[1] || r.discrete && (!Number.isInteger(e.value) || e.easing !== "hold")) throw Error("Chaves de parâmetro duplicadas, desordenadas ou fora dos limites.");
				g.add(e.id), i = e.frame;
			}
		}
	}
	if (new Set(i.targets).size !== i.targets.length || i.targets.some((e) => t.get(e)?.tag !== "g" || t.get(e)?.isComponent)) throw Error("Alvos requerem grupos únicos e válidos.");
	for (let e of i.bones) {
		let n = t.get(e.targetId);
		if (n?.tag !== "g" || n.isComponent || a.has(e.targetId) || e.minRotation > e.maxRotation) throw Error("Osso requer grupo único e limites válidos.");
		a.add(e.targetId);
	}
	let _ = /* @__PURE__ */ new Set();
	for (let e of i.skins ?? []) {
		let n = t.get(e.targetId), r = n?.geometry?.reduce((e, t) => e + t.points.length, 0), i = new Set(e.bones.map((e) => e.targetId));
		if (c.has(e.id) || _.has(e.targetId) || !tp(n) || !r || r !== e.weights.length || i.size !== e.bones.length) throw Error("Malha requer caminho único e pesos correspondentes à topologia.");
		c.add(e.id), _.add(e.targetId), Zl(e.bindMatrix);
		for (let t of e.bones) {
			if (!a.has(t.targetId)) throw Error("Osso da malha ausente.");
			Zl(t.inverseBindMatrix);
		}
		for (let t of e.weights) if (new Set(t.map((e) => e.boneId)).size !== t.length || t.some((e) => !i.has(e.boneId)) || Math.abs(t.reduce((e, t) => e + t.weight, 0) - 1) > 1e-6) throw Error("Pesos da malha requerem até quatro ossos únicos e soma 1.");
	}
	let v = (e) => {
		let n = /* @__PURE__ */ new Set(), r = e;
		for (; r !== null;) {
			if (n.has(r) || n.size >= 32) throw Error("Hierarquia de rig cíclica/profunda.");
			n.add(r);
			let e = t.get(r);
			if (!e) throw Error("Referência de rig órfã.");
			r = e.parentId;
		}
		return n;
	};
	for (let e of t.keys()) v(e);
	let y = i.constraints.map((e) => {
		if (o.has(e.id)) throw Error("ID de restrição duplicado.");
		if (o.add(e.id), e.kind === "distance" && e.min > e.max) throw Error("Limites de distância invertidos.");
		if (e.kind === "path" && (t.get(e.targetId)?.tag !== "path" || !t.get(e.targetId)?.geometry?.[e.contour])) throw Error("Seguir caminho requer um caminho com o contorno indicado.");
		if (e.kind === "path" && _.has(e.targetId)) throw Error("Seguir caminho usa geometria estática/morph; malha dependente do pós-rig não é alvo suportado.");
		if (e.kind === "transform" && new Set(e.channels).size !== e.channels.length) throw Error("Canal de restrição duplicado.");
		let n = dp(e), r = e.kind === "transform" && e.space === "local", i = r ? /* @__PURE__ */ new Set([e.targetId]) : v(e.targetId);
		for (let [o, s] of n.entries()) {
			let c = t.get(s);
			if (!c) throw Error("Destino de restrição órfão.");
			if (i.has(s)) throw Error("Restrição não pode depender de seu próprio resultado.");
			if (e.kind === "ik" && (!a.has(s) || o > 0 && c.parentId !== n[o - 1])) throw Error("Cadeia IK requer ossos contíguos.");
			if (!r && c.parentId !== null) for (let e of v(c.parentId)) n.includes(e) || i.add(e);
		}
		if (!t.has(e.targetId)) throw Error("Alvo de restrição órfão.");
		return i;
	}), b = i.constraints.map(() => /* @__PURE__ */ new Set());
	for (let [e, t] of i.constraints.entries()) {
		let n = y[e], r = dp(t), a = b[e];
		if (!n || !a) throw Error("Grafo de restrições incompleto.");
		for (let [t, o] of i.constraints.entries()) {
			if (t === e) continue;
			let i = dp(o);
			(i.some((e) => n.has(e)) || t < e && i.some((e) => r.includes(e))) && a.add(t);
		}
	}
	let x = [], S = /* @__PURE__ */ new Set(), C = /* @__PURE__ */ new Set();
	function ee(e) {
		if (S.has(e)) return;
		if (C.has(e)) throw Error("Restrições formam dependência circular.");
		C.add(e);
		for (let t of b[e] ?? []) ee(t);
		let t = i.constraints[e];
		if (!t) throw Error("Restrição ausente.");
		S.add(e), C.delete(e), x.push(t);
	}
	for (let e of i.constraints.keys()) ee(e);
	let w = { remaining: 2e6 }, T = kf(t, /* @__PURE__ */ new Map(), w), E = new Map(i.bones.map((e) => [e.targetId, e]));
	Xf(T, i.joysticks ?? [], w);
	for (let e of x) if (e.kind === "ik" && (e.strength > 0 || i.parameterClips?.some((t) => t.tracks.some((t) => t.targetId === e.id && t.keys.some((e) => e.value > 0))))) {
		let t = e.chain.map((e) => {
			let t = E.get(e);
			if (!t) throw Error("Osso IK ausente.");
			return t;
		});
		Gf(T, t);
		let n = t[0];
		if (!n) throw Error("Cadeia IK vazia.");
		Zl(T.pre(n.targetId));
	}
	return {
		...i,
		constraints: x
	};
}
//#endregion
//#region ../../packages/edi-motion/src/playback.ts
var pp = H(U({
	id: X,
	transform: zu
})).max(2e3), mp = U({
	id: X,
	parentId: X.nullable().default(null),
	animation: V(),
	speed: z().min(.01).max(100),
	offsetSeconds: z().min(-3600).max(3600)
}), hp = U({
	version: q(1),
	motion: V(),
	objects: pp
}), gp = U({
	version: q(2),
	motion: V(),
	objects: pp,
	drivers: H(mp).max(2e3),
	sources: H(U({
		id: X,
		objectId: X,
		artboardId: L().regex(/^artboard-[\w-]{1,100}$/),
		instancePath: H(X).max(8)
	})).max(2e3).default([])
}), _p = gp.extend({
	version: q(3),
	objects: H(U({
		id: X,
		transform: zu,
		tag: L().min(1).max(20),
		parentId: X.nullable(),
		basis: Td.optional(),
		attributeMatrix: Td.optional(),
		isComponent: B().optional(),
		geometry: yd.optional()
	})).max(2e3),
	rigScopes: H(U({
		instancePath: H(X).max(8),
		clockId: X.nullable(),
		rig: V()
	})).max(128)
});
function vp(e) {
	if (typeof e == "object" && e && "objects" in e && Array.isArray(e.objects)) {
		if (e.objects.length > 2e3) throw Error("Runtime excede o orçamento de objetos.");
		let t = 0;
		for (let n of e.objects) if (typeof n == "object" && n && "geometry" in n && (t += bd(n.geometry), t > 1e5)) throw Error("Geometria de runtime excede orçamento agregado.");
	}
	let t = Ps({ version: z() }).parse(e, { jitless: !0 }), n = t.version === 1 ? hp.parse(e, { jitless: !0 }) : t.version === 3 ? _p.parse(e, { jitless: !0 }) : gp.parse(e, { jitless: !0 }), r = new Set(n.objects.map((e) => e.id));
	if (r.size !== n.objects.length) throw Error("ID de objeto duplicado no runtime.");
	let i = Bu(n.motion, r);
	for (let e of i.animations) if ((e.drawOrders ?? []).filter((e) => e.scopeId === null).length > 1) throw Error("Há duas ordens de desenho para a raiz.");
	let a = "sources" in n ? n.sources : [], o = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set();
	for (let e of a) {
		let t = JSON.stringify([e.objectId, e.instancePath]);
		if (!r.has(e.id) || o.has(e.id) || s.has(t)) throw Error("Identidade de origem incompatível com o runtime.");
		o.add(e.id), s.add(t);
	}
	let c = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Set(), u = [], d = i.animations.reduce((e, t) => e + t.tracks.length, 0), f = i.animations.reduce((e, t) => e + t.tracks.reduce((e, t) => e + t.keys.length, 0), 0), p = new Set(i.animations.flatMap((e) => (e.drawOrders ?? []).flatMap((e) => e.scopeId === null ? [] : [e.scopeId])));
	for (let e of "drivers" in n ? n.drivers : []) {
		if (!r.has(e.id) || l.has(e.id)) throw Error("Identidade de componente inválida.");
		l.add(e.id);
		let t = Bu({
			version: i.version,
			animations: [e.animation]
		}, r).animations[0];
		if (!t) throw Error("Animação do componente ausente.");
		let n = new Set(t.tracks.map((e) => e.targetId));
		for (let e of n) {
			if (c.has(e)) throw Error("Objeto com dois relógios de componente.");
			c.add(e);
		}
		for (let e of t.drawOrders ?? []) {
			if (e.scopeId === null || p.has(e.scopeId)) throw Error("Ordem de desenho de componente precisa de um grupo próprio.");
			p.add(e.scopeId);
			for (let t of e.keys) f += 1 + t.order.length;
		}
		if (d += t.tracks.length, f += t.tracks.reduce((e, t) => e + t.keys.length, 0), d > 12e3 || f > 1e5) throw Error("Orçamento agregado de componentes excedido.");
		u.push({
			...e,
			animation: t
		});
	}
	if (i.animations.some((e) => e.tracks.some((e) => c.has(e.targetId)))) throw Error("Uma trilha do componente não pode ter dois donos de tempo.");
	let m = [], h = /* @__PURE__ */ new Set(), g = /* @__PURE__ */ new Map(), _ = new Map(u.map((e) => [e.id, e]));
	function v(e) {
		let t = g.get(e.id);
		if (t !== void 0) return t;
		if (h.has(e.id)) throw Error("Relógios de componentes cíclicos ou profundos demais.");
		h.add(e.id);
		let n = 1;
		if (e.parentId !== null) {
			let t = _.get(e.parentId);
			if (!t) throw Error("Relógio pai de componente inexistente.");
			n = v(t) + 1;
		}
		if (h.delete(e.id), n > 8) throw Error("Relógios de componentes profundos demais.");
		return g.set(e.id, n), m.push(e), n;
	}
	for (let e of u) v(e);
	let y = [], b = /* @__PURE__ */ new Set(), x = 0, S = 0, C = 0, ee = 0, w = n.objects, T = 0;
	for (let e of w) if (e.geometry) {
		if (e.tag !== "path" && e.tag !== "image") throw Error("Geometria de runtime requer caminho ou malha de imagem.");
		if (e.geometry = xd(e.geometry), e.tag === "image" && (e.geometry.length !== 1 || e.geometry[0]?.closed || e.geometry[0]?.points.some((e) => e.in || e.out))) throw Error("Malha de imagem requer vértices de grade sem alças.");
		if (T += e.geometry.reduce((e, t) => e + t.points.length, 0), T > 1e5) throw Error("Geometria de runtime excede orçamento agregado.");
	}
	for (let e of "rigScopes" in n ? n.rigScopes : []) {
		let t = JSON.stringify(e.instancePath);
		if (b.has(t) || e.clockId !== null && !l.has(e.clockId)) throw Error("Escopo/relógio de rig inválido.");
		if (e.instancePath.length) {
			let t = e.instancePath.slice(0, -1), n = e.instancePath.at(-1), r = a.find((e) => e.objectId === n && JSON.stringify(e.instancePath) === JSON.stringify(t));
			if (!r || !w.find((e) => e.id === r.id)?.isComponent || e.clockId !== null && e.clockId !== r.id) throw Error("Escopo de rig não corresponde à instância/relógio declarado.");
		} else if (e.clockId !== null) throw Error("Rig raiz utiliza o relógio raiz.");
		b.add(t);
		let n = new Set(a.filter((e) => JSON.stringify(e.instancePath) === t).map((e) => e.id)), r = /* @__PURE__ */ new Map();
		for (let e of w) if (n.has(e.id)) {
			if (!e.tag || e.parentId === void 0) throw Error("Rig requer hierarquia e tags explícitas.");
			r.set(e.id, {
				...e,
				tag: e.tag,
				parentId: e.parentId !== null && n.has(e.parentId) ? e.parentId : null
			});
		}
		let o = fp(e.rig, r), s = Wf(o);
		if (T += s.vertices, C += s.controls, ee += s.deformers, T > 1e5 || C > 1e5 || ee > 256) throw Error("Runtime excede orçamento agregado de deformação/geometria.");
		if (up(o, [...i.animations, ...u.map((e) => e.animation)]), d += (o.parameterClips ?? []).reduce((e, t) => e + t.tracks.length, 0), f += (o.parameterClips ?? []).reduce((e, t) => e + t.tracks.reduce((e, t) => e + t.keys.length, 0), 0), d > 12e3 || f > 1e5) throw Error("Orçamento agregado de canais/chaves excedido.");
		if (x += o.bones.length, S += o.constraints.length, x > 1e3 || S > 256) throw Error("Rig expandido excede orçamento agregado.");
		y.push({
			...e,
			rig: o
		});
	}
	return {
		version: n.version === 3 ? 3 : 2,
		motion: i,
		objects: w,
		drivers: m,
		sources: a,
		...n.version === 3 ? { rigScopes: y } : {}
	};
}
//#endregion
//#region ../../packages/edi-motion/src/rig/playbackRig.ts
function yp(e) {
	return bp(e.rigScopes ?? []);
}
function bp(e) {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map();
	for (let r of e) {
		for (let e of cp(r.rig)) t.set(Vu(r.instancePath, e.targetId, e.property), e.definition);
		for (let e of r.rig.parameterClips ?? []) {
			let t = n.get(e.animationId) ?? [];
			t.push(...e.tracks.map((e) => ({
				key: Vu(r.instancePath, e.targetId, e.property),
				clockId: r.instancePath.length ? r.clockId ?? void 0 : null,
				keys: e.keys
			}))), n.set(e.animationId, t);
		}
	}
	return {
		definitions: t,
		clips: n
	};
}
//#endregion
//#region ../../packages/edi-motion/src/visual/imageMesh.ts
var xp = U({
	columns: z().int().min(1).max(16),
	rows: z().int().min(1).max(16)
});
function Sp(e) {
	let t = (t, n) => {
		let r = e[t];
		if (r === void 0 && n !== void 0) return n;
		let i = Number(r?.replace(/px$/, ""));
		if (r === void 0 || !/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:px)?$/.test(r) || !Number.isFinite(i)) throw Error("Malha de imagem requer x, y, largura e altura absolutos.");
		return i;
	};
	if (e.preserveAspectRatio !== "none") throw Error("Malha de imagem requer preserveAspectRatio=\"none\" (sem recorte de aspecto).");
	let n = t("width"), r = t("height");
	if (n <= 0 || r <= 0) throw Error("Malha de imagem requer área positiva.");
	return {
		x: t("x", 0),
		y: t("y", 0),
		width: n,
		height: r
	};
}
var Cp = (e) => e.columns * e.rows * 2, wp = (e) => e ? Cp(e) * 4 : 0;
function Tp(e, t) {
	let { x: n, y: r, width: i, height: a } = Sp(t), o = [];
	for (let t = 0; t <= e.rows; t++) for (let s = 0; s <= e.columns; s++) o.push({
		x: n + s / e.columns * i,
		y: r + t / e.rows * a,
		in: null,
		out: null
	});
	return [{
		closed: !1,
		points: o
	}];
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/attributes.ts
var Ep = /* @__PURE__ */ new Set(/* @__PURE__ */ "d.x.y.x1.y1.x2.y2.width.height.rx.ry.cx.cy.r.points.fill.stroke.stroke-width.stroke-linecap.stroke-linejoin.stroke-dasharray.fill-rule.opacity.fill-opacity.stroke-opacity.transform.font-size.font-family.font-weight.font-style.letter-spacing.word-spacing.direction.unicode-bidi.text-anchor.display.visibility.viewBox.preserveAspectRatio.overflow".split("."));
function Dp(e, t) {
	if (!Ep.has(e) || typeof t != "string" || t.length > 5e5 || !Jc(t) || /url\s*\(|(?:var|env|paint|image|image-set|cross-fade|element|attr)\s*\(|[<>\\]|(?:javascript|data|https?):/i.test(t)) return `Atributo SVG não suportado: ${e}`;
	try {
		cu(e, t), e === "d" && t.trim() && Nd(t);
	} catch (e) {
		if (!(e instanceof Error)) throw e;
		return e.message;
	}
	return null;
}
function Op(e) {
	return typeof e == "object" && !!e && !Array.isArray(e) && Object.keys(e).length <= Ep.size;
}
var kp = V().refine(Op, {
	error: "Atributos SVG inválidos/excessivos.",
	abort: !0
}).pipe(Hs(L().max(80), L().max(5e5))).superRefine((e, t) => {
	let n = 0;
	for (let [r, i] of Object.entries(e)) {
		n += i.length;
		let e = Dp(r, i);
		e !== null && t.addIssue({
			code: "custom",
			path: [r],
			message: e
		});
	}
	n > 4e6 && t.addIssue({
		code: "custom",
		message: "Atributos SVG excedem o orçamento textual."
	});
}), Ap = q("auto"), jp = U({
	d: L().trim().min(1).max(2e5).superRefine((e, t) => {
		try {
			bd(Nd(e)) > 4e3 && t.addIssue({
				code: "custom",
				message: "Caminho do texto excede 4000 vértices."
			});
		} catch (e) {
			if (!(e instanceof Error)) throw e;
			t.addIssue({
				code: "custom",
				message: e.message
			});
		}
	}),
	startOffset: z().min(0).max(100)
});
function Mp(e) {
	return e ? bd(Nd(e.d)) : 0;
}
//#endregion
//#region ../../packages/edi-motion/src/visual/model.ts
var Np = K([
	"image",
	"g",
	"svg",
	"path",
	"rect",
	"circle",
	"ellipse",
	"line",
	"polyline",
	"polygon",
	"text"
]), Pp = U({ lineHeight: z().min(.25).max(10) }), Fp = U({
	attrs: kp.superRefine((e, t) => {
		for (let n of ["transform"]) n in e && t.addIssue({
			code: "custom",
			path: [n],
			message: "Geometria/transformação pertence ao playback espacial."
		});
	}),
	text: L().max(1e4).refine(Jc, "Texto deve conter caracteres XML válidos."),
	visible: B(),
	textLayout: Pp.optional(),
	textDirection: Ap.optional(),
	textPath: jp.optional()
}), Ip = U({
	viewBox: Bs([
		z().min(-1e5).max(1e5),
		z().min(-1e5).max(1e5),
		z().positive().max(1e5),
		z().positive().max(1e5)
	]),
	preserveAspectRatio: L().regex(/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/),
	globalTransform: zu
}), Lp = {
	label: L().min(1).max(500).refine((e) => !!e.trim() && Jc(e), "Nome acessível inválido."),
	description: L().min(1).max(2e3).refine((e) => !!e.trim() && Jc(e), "Descrição acessível inválida.").optional(),
	live: K(["polite", "assertive"]).optional()
}, Rp = G("kind", [
	U({ kind: q("decorative") }),
	U({
		kind: q("group"),
		...Lp
	}),
	U({
		kind: q("image"),
		...Lp
	}),
	U({
		kind: q("button"),
		...Lp
	})
]);
function zp(e, t, n) {
	if (e.length > 2e3) throw Error("Semântica excede orçamento de objetos.");
	let r = new Map(e.map((e) => [e.id, e]));
	if (r.size !== e.length) throw Error("IDs semânticos repetidos.");
	let i = 0;
	for (let t of e) {
		let e = t.semantics;
		if (e && e.kind !== "decorative" && (i += e.label.length + (e.description?.length ?? 0)), i > 1e6) throw Error("Semântica excede orçamento textual.");
		if (e?.kind === "button" && !n.has(t.id)) throw Error(`Botão acessível ${t.id} requer listener de ativação.`);
		if (e?.kind === "group" && n.has(t.id)) throw Error(`Grupo acessível ${t.id} com ativação deve ser configurado como botão.`);
	}
	for (let e of t) {
		let t = r.get(e), i = 0;
		if (!t) throw Error("Destino semântico ausente.");
		for (; t;) {
			if (++i > 33) throw Error("Hierarquia semântica cíclica/profunda.");
			let a = t.semantics?.kind;
			if (a === "decorative" || a === "image" || (a === "button" || n.has(t.id)) && t.id !== e) throw Error(`Semântica ${a} de ${t.id} esconderia a interação de ${e}.`);
			if (t.parentId === null) break;
			let o = r.get(t.parentId);
			if (!o) throw Error("Pai semântico ausente.");
			t = o;
		}
	}
}
//#endregion
//#region ../../packages/edi-motion/src/visual/validation.ts
function Bp(e) {
	if (e.version < 6) return;
	if (!e.visual || !e.assets) throw Error("Documento portátil requer cena e catálogo raiz.");
	let t = new Map(e.assets.map((e) => [e.id, e])), n = /* @__PURE__ */ new Map(), r = [], i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), o = 0;
	function s(c, l) {
		if (c.version !== e.version) throw Error("Cena portátil requer mesma versão em todos os escopos.");
		let u = new Map(c.content.map((e) => [e.id, e])), d = new Map(c.playback.objects.map((e) => [e.id, e]));
		for (let e of c.content) {
			if (!e.visual || e.parentId === void 0 || e.parentId !== null && !u.has(e.parentId)) throw Error("Conteúdo portátil requer metadados visuais e hierarquia local completa.");
			if (e.visual.textLayout && e.tag !== "text") throw Error("Layout textual requer texto.");
			if (e.visual.textDirection && (e.tag !== "text" || e.visual.attrs.direction !== void 0)) throw Error("Direção automática requer texto sem direção explícita.");
			if (e.textDirection !== e.visual.textDirection) throw Error("Direção portátil não corresponde ao conteúdo.");
			if (e.visual.textPath && (e.tag !== "text" || e.visual.textLayout)) throw Error("Texto em caminho requer texto de uma linha.");
			let i = e.visual.attrs.d;
			if (i !== void 0 && e.tag !== "path") throw Error("Dados de caminho requerem path.");
			if (i?.trim()) {
				let t = d.get(e.id)?.geometry;
				if (!t || Cd(Nd(i)) !== Cd(t)) throw Error("Caminho nativo não corresponde à geometria espacial.");
			} else if (i !== void 0 && d.get(e.id)?.geometry) throw Error("Caminho vazio não corresponde à geometria espacial.");
			if (e.lineHeight !== e.visual.textLayout?.lineHeight) throw Error("Altura de linha portátil não corresponde ao conteúdo.");
			if (e.visual.textLayout) {
				let t = Math.max(1, e.visual.text.replace(/\r\n?/g, "\n").split("\n").length);
				if (o += t, t > 200 || o > 2e3) throw Error("Texto portátil excede orçamento de linhas.");
			}
			if (e.assetId) {
				let n = t.get(e.assetId);
				if (n?.kind !== "image") throw Error("Imagem portátil sem recurso raiz correspondente.");
				if (e.imageSlice && (e.imageSlice.source.width !== n.width || e.imageSlice.source.height !== n.height)) throw Error("Nine-slice portátil não corresponde à imagem real.");
				if (e.imageMesh && Cd(d.get(e.id)?.geometry ?? []) !== Cd(Tp(e.imageMesh, e.visual.attrs))) throw Error("Malha raster portátil não corresponde à grade da imagem.");
			}
			ql(t, e), n.set(e.id, {
				parentId: e.parentId ?? l,
				tag: e.tag
			}), r.push({
				id: e.id,
				parentId: e.parentId ?? l,
				semantics: e.semantics
			});
		}
		for (let e of c.behavior.listeners) {
			let t = e.targetId ?? l;
			t !== null && (i.add(t), e.event === "activate" && a.add(t));
		}
		for (let e of c.components ?? []) {
			if (c.content.some((t) => t.parentId === e.rootId)) throw Error("Viewport independente não pode conter objetos do escopo pai.");
			s(e.document, e.rootId);
		}
	}
	s(e, null);
	let c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Set();
	function u(e, t = 0) {
		let r = c.get(e);
		if (r !== void 0) return r;
		if (t > 32 || l.has(e)) throw Error("Hierarquia visual portátil cíclica/profunda.");
		let i = n.get(e);
		if (!i) throw Error("Pai visual portátil ausente.");
		l.add(e);
		let a = i.parentId === null ? void 0 : n.get(i.parentId);
		if (i.parentId !== null && (!a || !["g", "svg"].includes(a.tag))) throw Error("Pai visual portátil precisa ser grupo/viewport.");
		let o = i.parentId === null ? 1 : u(i.parentId, t + 1) + 1;
		if (o > 33) throw Error("Hierarquia visual portátil profunda demais.");
		return l.delete(e), c.set(e, o), o;
	}
	for (let e of n.keys()) u(e);
	if (e.version >= 8 && e.behavior.listeners.some((e) => e.targetId === null && e.event === "activate") && i.size) throw Error("Botão do artboard esconderia interações descendentes; use um grupo e botões locais.");
	e.version >= 8 && zp(r, i, a);
}
var Vp = U({
	id: X,
	parentId: X.nullable().optional(),
	isComponent: B().optional(),
	intrinsic: U({
		x: z().min(-1e5).max(1e5),
		y: z().min(-1e5).max(1e5),
		width: z().positive().max(1e5),
		height: z().positive().max(1e5)
	}).optional(),
	name: L().trim().min(1).max(120),
	assetId: Pl.optional(),
	imageSlice: uu.optional(),
	imageMesh: xp.optional(),
	gradients: Zd.optional(),
	filter: yf.optional(),
	paintLayers: Tf.optional(),
	effects: jf.optional(),
	visual: Fp.optional(),
	fontAssetId: Pl.optional(),
	fontFallbackIds: Gl.optional(),
	semantics: Rp.optional(),
	tag: Np,
	lineHeight: z().min(.25).max(10).optional(),
	textDirection: Ap.optional()
}), Hp = U({
	version: W([
		q(1),
		q(2),
		q(3),
		q(4),
		q(5),
		q(6),
		q(7),
		q(8),
		q(9),
		q(10),
		q(11),
		q(12),
		q(13),
		q(14)
	]),
	playback: V(),
	behavior: V(),
	content: H(Vp).max(2e3),
	layout: V().optional(),
	audio: V().optional(),
	audioAssets: V().optional(),
	assets: V().optional(),
	visual: Ip.optional(),
	animationId: L().regex(/^[a-z]+-[\w-]{1,100}$/).optional(),
	components: H(U({
		rootId: X,
		instanceId: X,
		instancePath: H(X).min(1).max(8),
		speed: z().min(.01).max(100).default(1),
		document: V()
	})).max(128).optional()
});
function Up(e) {
	let t = 0, n = 0, r = /* @__PURE__ */ new Set();
	function i(e, a) {
		if (++t > 2e6 || a > 100) throw Error("Documento interativo excede o orçamento estrutural.");
		if (typeof e == "string") {
			if (n += e.length, n > 8e6) throw Error("Documento interativo excede o orçamento textual.");
		} else if (e && typeof e == "object") {
			if (r.has(e)) throw Error("Documento interativo contém ciclo estrutural.");
			if (r.add(e), Array.isArray(e)) {
				if (e.length > 1e5) throw Error("Coleção interativa excede o orçamento.");
				for (let t of e) i(t, a + 1);
			} else {
				let t = Object.getPrototypeOf(e);
				if (t !== Object.prototype && t !== null) throw Error("Documento requer objetos de dados simples.");
				let n = Object.entries(e);
				if (n.length > 1e4) throw Error("Objeto interativo excede o orçamento.");
				for (let [e, t] of n) i(e, a + 1), i(t, a + 1);
			}
			r.delete(e);
		}
	}
	i(e, 0);
}
function Wp(e) {
	Up(e);
	let t = /* @__PURE__ */ new Set(), n = [], r = [], i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), s = !1, c, l = 0, u = 0, d = 0, f = 0, p = 0, m = 0, h = 0, g = 0, _ = 0, v = 0, y = 0, b = 0;
	function x(e, S, C = [], ee = 1) {
		if (S > 8 || ++l > 128) throw Error("Cena excede o orçamento de componentes interativos.");
		let w = Hp.parse(e, { jitless: !0 }), T = vp(w.playback), E = new Map(w.content.map((e) => [e.id, e]));
		if (S === 0 && (s = w.version >= 6, c = w.version), w.version >= 6 !== s || s && w.version !== c) throw Error("Contrato visual portátil requer raiz/escopos de mesma versão.");
		if (w.version < 6 && (w.assets !== void 0 || w.visual !== void 0 || w.content.some((e) => e.visual))) throw Error("Conteúdo visual portátil requer blueprint v6.");
		if (w.version >= 6 && (T.version !== 3 || w.audioAssets !== void 0)) throw Error("Blueprint v6 requer playback espacial v3 e catálogo unificado, sem audioAssets duplicado.");
		let D;
		if (w.assets !== void 0 || w.visual !== void 0) {
			if (S !== 0) throw Error("Cena e catálogo portátil pertencem somente à raiz.");
			if (w.assets === void 0 || w.visual === void 0) throw Error("Cena portátil requer metadados e catálogo juntos.");
			D = Ul(w.assets);
			for (let e of D) i.set(e.id, e), a.add(e.id);
		}
		if ((w.audio !== void 0 || w.audioAssets !== void 0) && w.version < 3) throw Error("Áudio interativo requer blueprint v3.");
		let te;
		if (w.audioAssets !== void 0) {
			if (S !== 0) throw Error("Recursos de áudio pertencem somente à raiz.");
			te = [];
			for (let e of Ul(w.audioAssets)) {
				if (e.kind !== "audio") throw Error("Catálogo de áudio contém recurso incompatível.");
				i.set(e.id, e), a.add(e.id), te.push(e);
			}
		}
		for (let e of T.rigScopes ?? []) {
			if (e.rig.version >= 4 && w.version < 11) throw Error("Rig v4 requer blueprint v11.");
			if (e.rig.version >= 3 && w.version < 10) throw Error("Rig v3 requer blueprint v10.");
			for (let t of e.rig.trims ?? []) {
				let e = E.get(t.targetId);
				if (!e?.visual || /[aA]/.test(e.visual.attrs.d ?? "")) throw Error("Trim requer caminho visual sem arcos nativos; converta explicitamente antes.");
				if (t.layerId) {
					if (w.version < 14) throw Error("Trim de camada de pintura requer blueprint v14.");
					if (!e.paintLayers?.some((e) => e.id === t.layerId)) throw Error("Trim de camada de pintura sem a camada no objeto.");
				}
			}
			let t = Wf(e.rig);
			v += t.vertices, y += t.controls, b += t.deformers, g += e.rig.bones.length, _ += e.rig.constraints.length;
			for (let t of e.rig.parameterClips ?? []) p += t.tracks.length, m += t.tracks.reduce((e, t) => e + t.keys.length, 0);
		}
		if (g > 1e3 || _ > 256) throw Error("Cena interativa excede orçamento agregado de rig.");
		for (let e of T.objects) v += (e.geometry ?? []).reduce((e, t) => e + t.points.length, 0);
		if (v > 1e5 || y > 1e5 || b > 256) throw Error("Cena interativa excede orçamento agregado de deformação/geometria.");
		for (let e of w.content) {
			if (e.filter) {
				if (w.version < 12) throw Error("Filtros requerem blueprint v12.");
				r.push(e.filter);
			}
			if (e.paintLayers) {
				if (w.version < 14) throw Error("Camadas de pintura requerem blueprint v14.");
				if (!Ef.has(e.tag)) throw Error("Camadas de pintura valem só para formas e caminhos.");
				if (e.filter) throw Error("Camadas de pintura extras com filtro ficam fora do perfil.");
				n.push(...Of(e.paintLayers).map((e) => ({ fill: e })));
			}
			if (e.effects && w.version < 5) throw Error("Recortes/máscaras requerem blueprint v5.");
			if (f += Number(!!e.effects?.clip) + Number(!!e.effects?.mask), f > 256) throw Error("Cena interativa excede 256 recortes/máscaras.");
			if (e.gradients) {
				if (w.version < 4 || !af.has(e.tag)) throw Error("Gradiente requer forma/texto e blueprint v4.");
				if (ef(e.gradients) && w.version < 12) throw Error("Padrões requerem blueprint v12.");
				n.push(e.gradients);
			}
			if (u += 1 + (e.semantics && e.semantics.kind !== "decorative" && e.semantics.description ? 1 : 0) + (e.imageSlice ? 18 : 0) + Df(e.paintLayers).length + wp(e.imageMesh) + (e.effects?.clip ? 2 : 0) + (e.effects?.mask ? 2 : 0), u > 2e3) throw Error("Cena excede orçamento agregado de células SVG.");
			if (e.assetId && a.add(e.assetId), e.fontFallbackIds !== void 0 && w.version < 7) throw Error("Fallback de fontes requer blueprint v7.");
			if (e.semantics !== void 0 && w.version < 8) throw Error("Semântica configurável requer blueprint v8.");
			for (let t of Kl(e)) a.add(t);
			if (a.size > 256) throw Error("Cena excede orçamento agregado de referências a recursos.");
			if (t.has(e.id)) throw Error("ID compartilhado por dois escopos interativos.");
			if (t.add(e.id), t.size > 2e3) throw Error("Cena interativa excede o orçamento agregado de objetos.");
		}
		for (let e of [...T.motion.animations, ...T.drivers.map((e) => e.animation)]) {
			p += e.tracks.length, m += e.tracks.reduce((e, t) => e + t.keys.length, 0);
			for (let t of e.drawOrders ?? []) for (let e of t.keys) m += 1 + e.order.length;
		}
		if (p > 12e3 || m > 1e5) throw Error("Cena interativa excede o orçamento agregado de animação.");
		if (E.size !== w.content.length || E.size !== T.objects.length || T.objects.some((e) => !E.has(e.id))) throw Error("Conteúdo interativo não corresponde aos objetos.");
		let ne = new Map(w.content.flatMap((e) => e.effects ? [[e.id, e.effects]] : [])), re = wf(w.content.map((e) => ({
			...e,
			attrs: e.visual?.attrs
		})), ne);
		if (re.size && w.version < 9) throw Error("Primitivas nativas como fontes de efeitos requerem blueprint v9.");
		let ie = new Set(T.objects.filter((e) => e.geometry).map((e) => e.id));
		for (let [e, t] of re) ie.has(e) || (v += bd(Nd(hd(t))));
		for (let e of w.content) v += Mp(e.visual?.textPath);
		if (v > 1e5) throw Error("Cena interativa excede geometria agregada incluindo efeitos nativos.");
		if (w.version < 12 && [...ne.values()].some((e) => e.mask?.mode)) throw Error("Modos de máscara requerem blueprint v12.");
		if (w.version < 12 && [...T.motion.animations, ...T.drivers.map((e) => e.animation)].some((e) => e.drawOrders)) throw Error("Ordem de desenho animável requer blueprint v12.");
		if (Nf(T, ne, void 0, re, df(w.content.map((e) => ({
			...e,
			parentId: e.parentId ?? null,
			attrs: e.visual?.attrs
		})), new Map([...ne].filter(([, e]) => uf(e))))), ne.size || s) for (let e of T.objects) {
			let t = E.get(e.id);
			if (!t || t.tag !== e.tag || t.parentId !== e.parentId) throw Error("Hierarquia visual do efeito não corresponde ao playback.");
		}
		for (let e of E.values()) if (e.tag === "image" != (e.assetId !== void 0) || e.assetId && w.version < 3) throw Error("Referência de imagem interativa requer blueprint v3 e assetId tipado.");
		else if (e.fontAssetId && (e.tag !== "text" || w.version < 3)) throw Error("Referência de fonte requer texto e blueprint v3.");
		else if (e.imageSlice && (e.tag !== "image" || w.version < 4)) throw Error("Nine-slice requer imagem e blueprint v4.");
		else if (e.isComponent && (e.tag !== "g" || !e.intrinsic) || !e.isComponent && e.intrinsic) throw Error("Medidas intrínsecas requerem instância de componente válida.");
		else if (e.lineHeight !== void 0 && e.tag !== "text") throw Error("Layout interativo requer texto.");
		else if (e.textDirection && (e.tag !== "text" || w.version < 12)) throw Error("Direção automática requer texto e blueprint v12.");
		else if (e.semantics && e.semantics.kind !== "decorative" && e.semantics.live && w.version < 12) throw Error("Região viva requer blueprint v12.");
		else if (e.visual?.textPath && w.version < 12) throw Error("Texto em caminho requer blueprint v12.");
		else if (e.imageMesh && (e.tag !== "image" || e.imageSlice || w.version < 12)) throw Error("Malha raster requer imagem sem nine-slice e blueprint v12.");
		let ae = new Map(T.sources.filter((e) => e.instancePath.length === 0).flatMap((e) => {
			let t = E.get(e.id);
			return t ? [[e.id, t]] : [];
		}));
		if (ae.size === 0 && T.objects.length > 0) throw Error("Conteúdo interativo requer mapa de identidades de autoria.");
		let O = ld(w.behavior, ae, T.motion.animations, yp(T));
		if (w.version < 12 && O.bindings.some((e) => e.kind === "semantics")) throw Error("Binding semântico requer blueprint v12.");
		if (w.version < 12 && O.formulas?.length) throw Error("Fórmulas requerem blueprint v12.");
		if (w.version < 13 && (O.data?.context || O.data?.links.some((e) => e.instanceId === null))) throw Error("Modelo da prancheta requer blueprint v13.");
		let oe = w.audio === void 0 ? void 0 : mu(w.audio, i, new Set(O.events.map((e) => e.id)));
		if (d += oe?.bindings.length ?? 0, d > 256) throw Error("Cena excede orçamento agregado de vínculos de áudio.");
		if (h += O.inputs.length + O.bindings.length + O.listeners.length + O.events.length + O.machines.reduce((e, t) => e + t.layers.reduce((e, t) => e + t.states.length + t.transitions.length, 0), 0), h > 2e4) throw Error("Cena interativa excede o orçamento agregado de lógica.");
		if (w.animationId && (!T.motion.animations.some((e) => e.id === w.animationId) || O.machines.length > 0)) throw Error("Clip inicial requer cena sem máquina e animação válida.");
		let se;
		if (w.layout !== void 0) {
			let e = /* @__PURE__ */ new Map();
			for (let [t, n] of ae) {
				if (n.parentId === void 0) throw Error("Layout requer hierarquia explícita do conteúdo.");
				e.set(t, {
					tag: n.tag,
					parentId: n.parentId,
					isComponent: n.isComponent
				});
			}
			if (se = Uf(w.layout, e), se.rootSize && w.version < 13) throw Error("Tamanho da prancheta no layout requer blueprint v13.");
		}
		if (w.version === 1 && w.components?.length) throw Error("Componentes independentes requerem documento interativo v2.");
		let ce = /* @__PURE__ */ new Set(), le = /* @__PURE__ */ new Set(), ue = w.components?.map((e) => {
			let t = E.get(e.rootId), n = E.get(e.instanceId), r = T.sources.find((t) => t.id === e.instanceId), i = JSON.stringify(e.instancePath);
			if (t?.tag !== "svg" || t.parentId !== e.instanceId || !n?.isComponent || !r || JSON.stringify([...r.instancePath, r.objectId]) !== i || ce.has(e.rootId) || le.has(i)) throw Error("Raiz/caminho de componente interativo inválido.");
			ce.add(e.rootId), le.add(i);
			let a = [...C, ...e.instancePath], s = JSON.stringify(a), c = ee * e.speed;
			if (a.length > 8 || o.has(s) || c > 100) throw Error("Caminho/velocidade agregada de componente inválido.");
			return o.add(s), {
				...e,
				document: x(e.document, S + 1, a, c)
			};
		});
		return {
			version: w.version,
			playback: T,
			behavior: O,
			content: w.content,
			...w.animationId ? { animationId: w.animationId } : {},
			...se ? { layout: se } : {},
			...oe ? { audio: oe } : {},
			...te ? { audioAssets: te } : {},
			...D ? { assets: D } : {},
			...w.visual ? { visual: w.visual } : {},
			...ue?.length ? { components: ue } : {}
		};
	}
	let S = x(e, 0);
	return rf(n), Cf(r), Bp(S), S;
}
var Gp = U({
	format: q("edi-animation"),
	version: q(1),
	title: L().trim().min(1).max(200),
	fit: K([
		"contain",
		"cover",
		"stretch"
	]),
	autoplay: B(),
	respectReducedMotion: B(),
	pauseOffscreen: B(),
	poster: Il.refine((e) => e.width <= 1024 && e.height <= 1024, "A prévia excede 1024 pixels.").optional(),
	document: V()
});
function Kp(e) {
	return {
		inputs: e.document.behavior.inputs.map(({ id: e, name: t, kind: n }) => ({
			id: e,
			name: t,
			kind: n
		})),
		events: [...new Set(e.document.behavior.events.map(({ name: e }) => e))]
	};
}
function qp(e) {
	let t = /* @__PURE__ */ new Set(), n = 0, r = 0, i = new TextEncoder();
	function a(e, o) {
		if (++n > 2e5 || o > 128) throw Error("Animação excede o limite de profundidade ou de elementos.");
		if (typeof e == "string") {
			if (e.length > 1e7 - r || (r += i.encode(e).byteLength, r > 1e7)) throw Error("Animação excede o tamanho permitido.");
		} else if (typeof e == "object" && e) {
			if (t.has(e)) throw Error("Animação contém uma referência circular.");
			let n = Object.getPrototypeOf(e);
			if (!Array.isArray(e) && n !== Object.prototype && n !== null) throw Error("Animação precisa conter somente dados JSON.");
			t.add(e);
			for (let [t, n] of Object.entries(e)) a(t, o + 1), a(n, o + 1);
			t.delete(e);
		} else if (typeof e == "function" || typeof e == "symbol" || typeof e == "bigint") throw Error("Animação precisa conter somente dados JSON.");
	}
	a(e, 0);
}
function Jp(e) {
	let t = e;
	if (typeof t == "string") {
		if (t.length > 1e7 || new TextEncoder().encode(t).byteLength > 1e7) throw Error("Animação excede o tamanho permitido.");
		t = JSON.parse(t);
	}
	qp(t);
	let n = Gp.parse(t, { jitless: !0 });
	n.poster && Hl(n.poster);
	let r = Wp(n.document);
	if (!r.visual) throw Error("Animação precisa incluir a descrição visual portátil.");
	if (!r.content.length) throw Error("A prancheta selecionada está vazia. Escolha a prancheta com o desenho.");
	let i = /* @__PURE__ */ new Set();
	for (let e of r.behavior.inputs) {
		if (i.has(e.name)) throw Error("Os controles da animação têm nomes repetidos. Renomeie os inputs antes de exportar.");
		i.add(e.name);
	}
	i.clear();
	for (let e of r.behavior.machines) {
		if (i.has(e.name)) throw Error("As máquinas da animação têm nomes repetidos. Renomeie antes de exportar.");
		i.add(e.name);
	}
	let a = {
		...n,
		document: r
	};
	if (new TextEncoder().encode(JSON.stringify(a)).byteLength > 1e7) throw Error("Animação excede o tamanho permitido.");
	return a;
}
function Yp(e) {
	let t = Jp(e);
	return JSON.stringify(t);
}
//#endregion
//#region ../../packages/edi-motion/src/webPlayerData.ts
function Xp(e) {
	return Yp(e);
}
function Zp(e) {
	let t = Jp(e), n = t.document.visual?.viewBox;
	if (!n) throw Error("A animação não tem dimensão visual.");
	return {
		title: t.title,
		version: t.version,
		viewBox: [...n],
		fit: t.fit,
		autoplay: t.autoplay,
		respectReducedMotion: t.respectReducedMotion,
		pauseOffscreen: t.pauseOffscreen,
		inputs: Kp(t).inputs.map(({ name: e, kind: t }) => ({
			name: e,
			kind: t
		})),
		machines: t.document.behavior.machines.map(({ name: e }) => e),
		events: Kp(t).events,
		...t.poster ? { poster: {
			dataUri: Wl(t.poster),
			width: t.poster.width,
			height: t.poster.height,
			bytes: t.poster.byteLength
		} } : {}
	};
}
function Qp(e) {
	let t = Jp(e).poster;
	return t ? {
		bytes: Vl(t.data),
		width: t.width,
		height: t.height,
		mime: "image/png"
	} : null;
}
//#endregion
export { Xp as normalizeWebAnimation, Zp as readWebAnimation, Qp as webAnimationPoster };
