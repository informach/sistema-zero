//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/util.js
function e(e) {
	let t = Object.values(e).filter((e) => typeof e == "number");
	return Object.entries(e).filter(([e, n]) => t.indexOf(+e) === -1).map(([e, t]) => t);
}
function t(e, t = "|") {
	return e.map((e) => k(e)).join(t);
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
	if (Ne.jitless || typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare")) return !1;
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
function w(e) {
	return C(e) ? { ...e } : Array.isArray(e) ? [...e] : e instanceof Map ? new Map(e) : e instanceof Set ? new Set(e) : e;
}
var T = /* @__PURE__*/ new Set([
	"string",
	"number",
	"symbol"
]);
function E(e) {
	return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function D(e, t, n) {
	let r = new e._zod.constr(t ?? e._zod.def);
	return (!t || n?.parent) && (r._zod.parent = e), r;
}
function O(e) {
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
function k(e) {
	return typeof e == "bigint" ? e.toString() + "n" : typeof e == "string" ? `"${e}"` : `${e}`;
}
function A(e) {
	return Object.keys(e).filter((t) => e[t]._zod.optin !== void 0 && e[t]._zod.optout === "optional");
}
var j = {
	safeint: [-(2 ** 53 - 1), 2 ** 53 - 1],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
}, M = {
	int64: [/* @__PURE__*/ BigInt("-9223372036854775808"), /* @__PURE__*/ BigInt("9223372036854775807")],
	uint64: [/* @__PURE__*/ BigInt(0), /* @__PURE__*/ BigInt("18446744073709551615")]
};
function ee(e, t) {
	let n = e._zod.def, r = n.checks;
	if (r && r.length > 0) throw Error(".pick() cannot be used on object schemas containing refinements");
	let i = {};
	return h(i, e, N(e, t)), D(e, _(n, {
		shape: i,
		checks: []
	}));
}
function N(e, t) {
	let n = f(e), r = [];
	for (let e of Reflect.ownKeys(t)) {
		if (!Object.getOwnPropertyDescriptor(n, e)?.enumerable) throw Error(`Unrecognized key: "${String(e)}"`);
		t[e] && r.push(e);
	}
	return r;
}
function te(e, t) {
	let n = e._zod.def, r = n.checks;
	if (r && r.length > 0) throw Error(".omit() cannot be used on object schemas containing refinements");
	let i = new Set(N(e, t)), a = {};
	return h(a, e, Reflect.ownKeys(f(e)).filter((e) => !i.has(e))), D(e, _(n, {
		shape: a,
		checks: []
	}));
}
function ne(e, t) {
	if (!C(t)) throw Error("Invalid input to extend: expected a plain object");
	let n = e._zod.def.checks;
	if (n && n.length > 0) {
		let n = f(e);
		for (let e of Reflect.ownKeys(t)) if (Object.getOwnPropertyDescriptor(n, e) !== void 0) throw Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
	}
	return D(e, _(e._zod.def, { shape: re(e, t) }));
}
function re(e, t) {
	let n = {};
	return h(n, e, Reflect.ownKeys(f(e))), g(n, t), n;
}
function ie(e, t) {
	if (!C(t)) throw Error("Invalid input to safeExtend: expected a plain object");
	return D(e, _(e._zod.def, { shape: re(e, t) }));
}
function P(e, t) {
	if (!t?._zod?.def) throw Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
	if (e._zod.def.checks?.length) throw Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
	let n = {};
	return h(n, e, Reflect.ownKeys(f(e))), h(n, t, Reflect.ownKeys(f(t))), D(e, _(e._zod.def, {
		shape: n,
		get catchall() {
			return t._zod.def.catchall;
		},
		checks: t._zod.def.checks ?? []
	}));
}
function F(e, t, n, r = "partial") {
	let i = t._zod.def.checks;
	if (i && i.length > 0) throw Error(`.${r}() cannot be used on object schemas containing refinements`);
	let a = n ? new Set(N(t, n)) : void 0, o = {};
	return h(o, t, Reflect.ownKeys(f(t)), e && ((t, n) => a && !a.has(n) ? t : new e({
		type: "optional",
		innerType: t
	}))), D(t, _(t._zod.def, {
		shape: o,
		checks: []
	}));
}
function ae(e, t, n) {
	let r = n ? new Set(N(t, n)) : void 0, i = {};
	return h(i, t, Reflect.ownKeys(f(t)), (t, n) => r && !r.has(n) ? t : new e({
		type: "nonoptional",
		innerType: t
	})), D(t, _(t._zod.def, { shape: i }));
}
function I(e, t = 0) {
	if (e.aborted === !0) return !0;
	for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue !== !0) return !0;
	return !1;
}
function oe(e, t = 0) {
	if (e.aborted === !0) return !0;
	for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue === !1) return !0;
	return !1;
}
function L(e, t) {
	return t.map((t) => {
		var n;
		return (n = t).path ?? (n.path = []), t.path.unshift(e), t;
	});
}
function se(e) {
	return typeof e == "string" ? e : e?.message;
}
function ce(e) {
	let t = [];
	for (let n of e ?? []) {
		let e = n._zod.def;
		if (!/_(length|size)$|_equals$/.test(e.check)) break;
		let r = e.maximum ?? e.length ?? e.size;
		r >= 0 && t.push([r, n]);
	}
	return t;
}
function le(e, t, n) {
	var r;
	for (let i = t; i < e.length; i++) (r = e[i]).schema ?? (r.schema = n);
}
function ue(e, t, n) {
	var r;
	let i = e.inst?._zod?.traits;
	i?.has("$ZodType") && (i.has("$ZodCheck") ? (r = e).schema ?? (r.schema = e.inst) : e.schema = e.inst);
	let a = e.schema === e.inst ? void 0 : e.schema?._zod.def?.error, o = e.message ? e.message : se(e.inst?._zod.def?.error?.(e)) ?? se(a?.(e)) ?? se(t?.error?.(e)) ?? se(n.customError?.(e)) ?? se(n.localeError?.(e)) ?? "Invalid input", s = {};
	for (let t of Object.keys(e)) t !== "inst" && t !== "schema" && t !== "continue" && t !== "input" && t !== "__proto__" && (s[t] = e[t]);
	return s.path ??= [], s.message = o, t?.reportInput && (s.input = e.input), s;
}
var de = /[\uD800-\uDBFF]/;
function R(e) {
	let t = e.length;
	if (!de.test(e)) return t;
	let n = t;
	for (let r = 0; r < t - 1; r++) (e.charCodeAt(r) & 64512) == 55296 && (e.charCodeAt(r + 1) & 64512) == 56320 && (n--, r++);
	return n;
}
function fe(e) {
	return Array.isArray(e) ? "array" : typeof e == "string" ? "string" : "unknown";
}
function pe(e) {
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
function me(...e) {
	let [t, n, r] = e;
	return typeof t == "string" ? {
		message: t,
		code: "custom",
		input: n,
		inst: r
	} : { ...t };
}
function he(e, t) {
	for (let n in t) {
		let r = Object.getOwnPropertyDescriptor(t, n);
		r.get ? Object.defineProperty(e, n, {
			...r,
			enumerable: !1
		}) : ye(e, n, r.value);
	}
}
function ge(e, t, n, r = !0) {
	return Object.defineProperty(e, t, {
		configurable: !0,
		writable: !0,
		enumerable: r,
		value: n
	}), n;
}
function _e(e, t, n) {
	return ge(e, t, n, !1);
}
/* @__NO_SIDE_EFFECTS__ */
function ve(e, t) {
	for (let n in e) {
		let r = e[n];
		Object.defineProperty(t, n, {
			configurable: !0,
			enumerable: !0,
			get() {
				return ge(this, n, r(this));
			},
			set(e) {
				ge(this, n, e);
			}
		});
	}
	return t;
}
function ye(e, t, n) {
	Object.defineProperty(e, t, {
		configurable: !0,
		get() {
			return this == null ? n : ge(this, t, n.bind(this));
		},
		set(e) {
			ge(this, t, e);
		}
	});
}
function be(e, t) {
	let n = Object.getPrototypeOf(e);
	return t in n ? void 0 : n;
}
var xe, Se = !1, Ce = {
	configurable: !0,
	get() {
		Se = !0;
	}
};
function z(e, t, n) {
	let r = Object.getPrototypeOf(e._zod);
	t in r && xe !== e._zod ? xe = void 0 : (xe = e._zod, Object.defineProperty(r, t, {
		configurable: !0,
		get() {
			Object.defineProperty(this, t, Ce);
			let e = Se;
			Se = !1;
			try {
				let r = n(this);
				return Se ? delete this[t] : Object.defineProperty(this, t, {
					configurable: !0,
					writable: !0,
					value: r
				}), Se ||= e, r;
			} catch (n) {
				throw delete this[t], Se ||= e, n;
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
function we(e, t, n, r) {
	let i = be(e, t);
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
var Te = "~constantCatch";
function Ee(e) {
	let t = () => e;
	return t[Te] = !0, t;
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/core.js
var De, Oe = {
	value: void 0,
	enumerable: !1
}, ke = "captureStackTrace" in Error ? Error : null;
function Ae(e) {
	let t = ke;
	if (t) {
		let n = t.stackTraceLimit;
		if (typeof n == "number") {
			try {
				t.stackTraceLimit = 0;
			} catch {
				return ke = null, new e();
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
function B(e, t, n, r) {
	let i = {};
	function a(e) {
		this.def = e, this.constr = d, this.traits = /* @__PURE__ */ new Set();
	}
	a.prototype = i;
	let o = n, s = o && /* @__PURE__ */ new WeakSet();
	function c(n, r) {
		if (!n._zod) {
			Oe.value = new a(r);
			try {
				Object.defineProperty(n, "_zod", Oe);
			} finally {
				Oe.value = void 0;
			}
		} else if (n._zod.traits.has(e)) return;
		if (n._zod.traits.add(e), t(n, r), s) {
			let e = Object.getPrototypeOf(n), t = n._zod.constr.prototype, r = e;
			for (; r && r !== t;) r = Object.getPrototypeOf(r);
			let i = r ?? e;
			s.has(i) || (s.add(i), he(i, o));
		}
		let i = d.prototype;
		for (let e in i) Object.prototype.hasOwnProperty.call(i, e) && (e in n || (n[e] = i[e].bind(n)));
	}
	let l = r?.Parent ?? Object;
	class u extends l {}
	Object.defineProperty(u, "name", { value: e });
	function d(e) {
		let t = r?.Parent ? Ae(u) : this;
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
var je = class extends Error {
	constructor() {
		super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
	}
}, Me = class extends Error {
	constructor(e) {
		super(`Encountered unidirectional transform during encode: ${e}`), this.name = "ZodEncodeError";
	}
};
(De = globalThis).__zod_globalConfig ?? (De.__zod_globalConfig = {});
var Ne = globalThis.__zod_globalConfig;
function Pe(e) {
	return e && Object.assign(Ne, e), Ne;
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/errors.js
function Fe() {
	let e = this._zod;
	return e.message ??= JSON.stringify(e.def, n, 2), e.message;
}
function Ie(e) {
	this._zod.message = e;
}
var Le = {
	get: Fe,
	set: Ie,
	enumerable: !0,
	configurable: !0
}, Re = {
	value: void 0,
	enumerable: !1
}, ze = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]), Be = /* @__PURE__ */ B("$ZodError", (e, t) => {
	e.name = "$ZodError", Re.value = t, Object.defineProperty(e, "issues", Re), Re.value = void 0, Object.defineProperty(e, "message", Le);
	let n = Object.getPrototypeOf(e);
	ze.has(n) || (ze.add(n), Object.defineProperty(n, "toString", {
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
function Ve(e, t, n) {
	return Object.prototype.hasOwnProperty.call(e, t) || (t === "__proto__" ? Object.defineProperty(e, t, {
		value: n(),
		writable: !0,
		enumerable: !0,
		configurable: !0
	}) : e[t] = n()), e[t];
}
function He(e, t = (e) => e.message) {
	let n = {}, r = [];
	for (let i of e.issues) i.path.length > 0 ? Ve(n, i.path[0], () => []).push(t(i)) : r.push(t(i));
	return {
		formErrors: r,
		fieldErrors: n
	};
}
function Ue(e, t = (e) => e.message) {
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
function We(e, t) {
	return {
		callee: t?.callee ?? e,
		Err: t?.Err
	};
}
var Ge = (e) => {
	let t = (n, r, i, a) => {
		let o = i ? {
			...i,
			async: !1
		} : { async: !1 }, s = n._zod.run({
			value: r,
			issues: []
		}, o);
		if (s instanceof Promise) throw new je();
		if (s.issues.length) {
			let n = new ((a?.Err) ?? e)(s.issues.map((e) => ue(e, o, Pe())));
			throw b(n, a?.callee ?? t), n;
		}
		return s.value;
	};
	return t;
}, Ke = (e) => {
	let t = async (n, r, i, a) => {
		let o = i ? {
			...i,
			async: !0
		} : { async: !0 }, s = n._zod.run({
			value: r,
			issues: []
		}, o);
		if (s instanceof Promise && (s = await s), s.issues.length) {
			let n = new ((a?.Err) ?? e)(s.issues.map((e) => ue(e, o, Pe())));
			throw b(n, a?.callee ?? t), n;
		}
		return s.value;
	};
	return t;
}, qe = (e) => (t, n, r) => {
	let i = r ? {
		...r,
		async: !1
	} : { async: !1 }, a = t._zod.run({
		value: n,
		issues: []
	}, i);
	if (a instanceof Promise) throw new je();
	return a.issues.length ? Je(e, a.issues, i) : {
		success: !0,
		data: a.value
	};
};
function Je(e, t, n) {
	let r;
	return {
		success: !1,
		get error() {
			return r || (r = new e(t.map((e) => ue(e, n, Pe()))), t = void 0, n = void 0), r;
		},
		set error(e) {
			r = e, t = void 0, n = void 0;
		}
	};
}
var Ye = (e) => async (t, n, r) => {
	let i = r ? {
		...r,
		async: !0
	} : { async: !0 }, a = t._zod.run({
		value: n,
		issues: []
	}, i);
	return a instanceof Promise && (a = await a), a.issues.length ? Je(e, a.issues, i) : {
		success: !0,
		data: a.value
	};
}, Xe = /* @__PURE__ */ Symbol.for("zod.compile.invalid"), Ze = /* @__PURE__ */ Symbol.for("zod.compile.fallback"), Qe = ((e, t, n) => {
	let r = e._zod.bag.validator;
	if (r !== void 0) {
		if (r(t) !== Xe) return !0;
		if (r.definite === !0 && n === void 0) return !1;
	}
	return $e(e, t, n);
});
function $e(e, t, n) {
	let r = n ? {
		...n,
		async: !1,
		abortEarly: !0
	} : {
		async: !1,
		abortEarly: !0
	}, i = e._zod.bag.fallbackRun, a;
	if (i ? (r[Ze] = !0, a = i({
		value: t,
		issues: []
	}, r)) : a = e._zod.run({
		value: t,
		issues: []
	}, r), a instanceof Promise) throw new je();
	return a.issues.length === 0;
}
var et = async (e, t, n) => {
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
}, tt = (e) => {
	let t = Ge(e), n = (e, r, i, a) => {
		let o = i ? {
			...i,
			direction: "backward"
		} : { direction: "backward" };
		return t(e, r, o, We(n, a));
	};
	return n;
}, nt = (e) => {
	let t = Ge(e), n = (e, r, i, a) => t(e, r, i, We(n, a));
	return n;
}, rt = (e) => {
	let t = Ke(e), n = async (e, r, i, a) => {
		let o = i ? {
			...i,
			direction: "backward"
		} : { direction: "backward" };
		return await t(e, r, o, We(n, a));
	};
	return n;
}, it = (e) => {
	let t = Ke(e), n = async (e, r, i, a) => await t(e, r, i, We(n, a));
	return n;
}, at = (e) => (t, n, r) => {
	let i = r ? {
		...r,
		direction: "backward"
	} : { direction: "backward" };
	return qe(e)(t, n, i);
}, ot = (e) => (t, n, r) => qe(e)(t, n, r), st = (e) => async (t, n, r) => {
	let i = r ? {
		...r,
		direction: "backward"
	} : { direction: "backward" };
	return Ye(e)(t, n, i);
}, ct = (e) => async (t, n, r) => Ye(e)(t, n, r), lt = /^[cC][0-9a-z]{6,}$/, ut = /^[0-9a-z]+$/, dt = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/, ft = /^[0-9a-vA-V]{20}$/, pt = /^[A-Za-z0-9]{27}$/, mt = /^[a-zA-Z0-9_-]{21}$/;
function ht(e) {
	return RegExp(`^[a-zA-Z0-9_-]{${e}}$`);
}
var gt = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, _t = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, vt = (e) => e ? RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, yt = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, bt = "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
function xt() {
	return new RegExp(bt, "u");
}
var St = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, Ct = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/, wt = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, Tt = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, Et = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, Dt = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/, Ot = /^https?$/, kt = /^\+[1-9]\d{6,14}$/, At = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
function jt(e) {
	return RegExp(`^${e}$`);
}
var Mt = /*@__PURE__*/ jt(At);
function Nt(e) {
	let t = "(?:[01]\\d|2[0-3]):[0-5]\\d";
	return typeof e.precision == "number" ? e.precision === -1 ? `${t}` : e.precision === 0 ? `${t}:[0-5]\\d` : `${t}:[0-5]\\d\\.\\d{${e.precision}}` : e.seconds ? `${t}:[0-5]\\d(?:\\.\\d+)?` : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function Pt(e) {
	return RegExp(`^${Nt(e)}$`);
}
function Ft(e) {
	let t = ["Z"];
	e.offset && t.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
	let n = `${Nt({
		precision: e.precision,
		seconds: !0
	})}(?:${t.join("|")})`, r = e.local ? `${n}|${Nt({ precision: e.precision })}` : n;
	return RegExp(`^${At}T(?:${r})$`);
}
var It = /^[\s\S]{0,}$/, Lt = /^-?\d+$/, Rt = /^-?\d+(?:\.\d+)?$/, zt = /^(?:true|false)$/i, Bt = /^null$/i, Vt = /^[^A-Z]*$/, Ht = /^[^a-z]*$/, Ut = /*@__PURE__*/ B("$ZodCheck", (e, t) => {
	var n;
	e._zod ??= {}, e._zod.def = t, (n = e._zod).onattach ?? (n.onattach = []);
}), Wt = (e) => {
	let t = e.value;
	return !a(t) && t.length !== void 0;
}, Gt = {
	number: "number",
	bigint: "bigint",
	object: "date"
}, Kt = /*@__PURE__*/ B("$ZodCheckLessThan", (e, t) => {
	Ut.init(e, t);
	let n = Gt[typeof t.value];
	e._zod.check = (r) => {
		(t.inclusive ? r.value <= t.value : r.value < t.value) || r.issues.push({
			origin: Gt[typeof r.value] ?? n,
			code: "too_big",
			maximum: typeof t.value == "object" ? t.value.getTime() : t.value,
			input: r.value,
			inclusive: t.inclusive,
			inst: e,
			continue: !t.abort
		});
	};
}), qt = /*@__PURE__*/ B("$ZodCheckGreaterThan", (e, t) => {
	Ut.init(e, t);
	let n = Gt[typeof t.value];
	e._zod.check = (r) => {
		(t.inclusive ? r.value >= t.value : r.value > t.value) || r.issues.push({
			origin: Gt[typeof r.value] ?? n,
			code: "too_small",
			minimum: typeof t.value == "object" ? t.value.getTime() : t.value,
			input: r.value,
			inclusive: t.inclusive,
			inst: e,
			continue: !t.abort
		});
	};
}), Jt = /*@__PURE__*/ B("$ZodCheckMultipleOf", (e, t) => {
	Ut.init(e, t), e._zod.check = (n) => {
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
}), Yt = /*@__PURE__*/ B("$ZodCheckNumberFormat", (e, t) => {
	Ut.init(e, t), t.format = t.format || "float64";
	let n = t.format?.includes("int"), r = n ? "int" : "number", [i, a] = j[t.format];
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
}), Xt = /*@__PURE__*/ B("$ZodCheckMaxLength", (e, t) => {
	var n;
	Ut.init(e, t), (n = e._zod.def).when ?? (n.when = Wt), e._zod.check = (n) => {
		let r = n.value, i = r.length;
		if ((typeof r == "string" && i > t.maximum ? R(r) : i) <= t.maximum) return;
		let a = fe(r);
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
}), Zt = /*@__PURE__*/ B("$ZodCheckMinLength", (e, t) => {
	var n;
	Ut.init(e, t), (n = e._zod.def).when ?? (n.when = Wt), e._zod.check = (n) => {
		let r = n.value, i = r.length;
		if ((typeof r == "string" && i >= t.minimum && i < t.minimum * 2 ? R(r) : i) >= t.minimum) return;
		let a = fe(r);
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
}), Qt = /*@__PURE__*/ B("$ZodCheckLengthEquals", (e, t) => {
	var n;
	Ut.init(e, t), (n = e._zod.def).when ?? (n.when = Wt), e._zod.check = (n) => {
		let r = n.value, i = r.length, a = typeof r == "string" && i >= t.length && i <= t.length * 2 ? R(r) : i;
		if (a === t.length) return;
		let o = fe(r), s = a > t.length;
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
}), $t = /*@__PURE__*/ B("$ZodCheckStringFormat", (e, t) => {
	var n, r;
	Ut.init(e, t), t.pattern ? (n = e._zod).check ?? (n.check = (n) => {
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
}), en = /*@__PURE__*/ B("$ZodCheckRegex", (e, t) => {
	$t.init(e, t), e._zod.check = (n) => {
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
}), tn = /*@__PURE__*/ B("$ZodCheckLowerCase", (e, t) => {
	t.pattern ??= Vt, $t.init(e, t);
}), nn = /*@__PURE__*/ B("$ZodCheckUpperCase", (e, t) => {
	t.pattern ??= Ht, $t.init(e, t);
}), rn = /*@__PURE__*/ B("$ZodCheckIncludes", (e, t) => {
	Ut.init(e, t);
	let n = E(t.includes);
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
}), an = /*@__PURE__*/ B("$ZodCheckStartsWith", (e, t) => {
	Ut.init(e, t);
	let n = RegExp(`^${E(t.prefix)}.*`);
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
}), on = /*@__PURE__*/ B("$ZodCheckEndsWith", (e, t) => {
	Ut.init(e, t);
	let n = RegExp(`.*${E(t.suffix)}$`);
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
}), sn = /*@__PURE__*/ B("$ZodCheckOverwrite", (e, t) => {
	Ut.init(e, t), e._zod.check = (e) => {
		e.value = t.tx(e.value);
	};
}), cn = class {
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
}, ln = {
	major: 4,
	minor: 6,
	patch: 7
}, V = /*@__PURE__*/ B("$ZodType", (e, t) => {
	var n;
	e ??= {}, e._zod.def = t, e._zod.bag = e._zod.bag || {}, e._zod.version = ln;
	let r = e._zod.def.checks, i = e._zod.traits.has("$ZodCheck") ? [e, ...r ?? []] : r?.length ? [...r] : [];
	for (let t of i) for (let n of t._zod.onattach) n(e);
	if (i.length === 0) (n = e._zod).deferred ?? (n.deferred = []), e._zod.deferred?.push(() => {
		e._zod.run = e._zod.parse;
	});
	else {
		let t = (t, n, r) => {
			if (t.memo) return t;
			let i = I(t), a;
			for (let o of n) {
				if (o._zod.def.when) {
					if (oe(t) || !o._zod.def.when(t)) continue;
				} else if (i) continue;
				let n = t.issues.length, s = o._zod.check(t);
				if (s instanceof Promise && r?.async === !1) throw new je();
				if (a || s instanceof Promise) a = (a ?? Promise.resolve()).then(async () => {
					await s, t.issues.length !== n && (le(t.issues, n, e), i ||= I(t, n));
				});
				else {
					if (t.issues.length === n) continue;
					le(t.issues, n, e), i ||= I(t, n);
				}
			}
			return a ? a.then(() => t) : t;
		}, n = (n, r, a) => {
			if (I(n)) return n.aborted = !0, n;
			let o = t(r, i, a);
			if (o instanceof Promise) {
				if (a.async === !1) throw new je();
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
				if (a.async === !1) throw new je();
				return o.then((e) => t(e, i, a));
			}
			return t(o, i, a);
		};
	}
}, {
	get "~standard"() {
		return _e(this, "~standard", fn(this));
	},
	set "~standard"(e) {
		ge(this, "~standard", e);
	}
}), un = (e, t) => e.issues.length ? { issues: e.issues.map((e) => ue(e, t, Pe())) } : { value: e.value };
async function dn(e, t) {
	let n = { async: !0 };
	return un(await e._zod.run({
		value: t,
		issues: []
	}, n), n);
}
function fn(e) {
	return {
		validate: (t) => {
			let n = { async: !1 };
			try {
				let r = e._zod.run({
					value: t,
					issues: []
				}, n);
				if (!(r instanceof Promise)) return un(r, n);
			} catch {}
			return dn(e, t);
		},
		vendor: "zod",
		version: 1
	};
}
var pn = /*@__PURE__*/ B("$ZodString", (e, t) => {
	V.init(e, t), e._zod.pattern = t.pattern ?? It, e._zod.parse = (n, r) => {
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
}), H = /*@__PURE__*/ B("$ZodStringFormat", (e, t) => {
	$t.init(e, t), pn.init(e, t);
}), mn = /*@__PURE__*/ B("$ZodGUID", (e, t) => {
	t.pattern ??= _t, H.init(e, t);
}), hn = /*@__PURE__*/ B("$ZodUUID", (e, t) => {
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
		t.pattern ??= vt(e);
	} else t.pattern ??= vt();
	H.init(e, t);
}), gn = /*@__PURE__*/ B("$ZodEmail", (e, t) => {
	t.pattern ??= yt, H.init(e, t);
});
function _n(e) {
	try {
		return typeof URL < "u" && typeof URL.canParse == "function" ? URL.canParse(e) : (new URL(e), !0);
	} catch {
		return !1;
	}
}
function vn(e, t) {
	return !("normalize" in t) && !("hostname" in t) && !("protocol" in t) ? _n(e) || 2 : yn(e, t);
}
function yn(e, t) {
	if (!t.normalize && t.protocol?.source === Ot.source && !/^https?:\/\//i.test(e)) return 1;
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
var bn = /[\t\n\r]/g;
function xn(e) {
	return e.replace(bn, "");
}
function Sn(e, t) {
	return t.lastIndex = 0, t.test(e.hostname);
}
function Cn(e, t) {
	return t.lastIndex = 0, t.test(e.protocol.endsWith(":") ? e.protocol.slice(0, -1) : e.protocol);
}
var wn = /*@__PURE__*/ B("$ZodURL", (e, t) => {
	H.init(e, t), e._zod.check = (n) => {
		try {
			let r = n.value.trim(), i = vn(r, t);
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
				n.value = xn(r);
				return;
			}
			t.hostname && !Sn(i, t.hostname) && n.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid hostname",
				pattern: t.hostname.source,
				input: n.value,
				inst: e,
				continue: !t.abort
			}), t.protocol && !Cn(i, t.protocol) && n.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid protocol",
				pattern: t.protocol.source,
				input: n.value,
				inst: e,
				continue: !t.abort
			}), n.value = t.normalize ? i.href : xn(r);
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
}), Tn = /*@__PURE__*/ B("$ZodEmoji", (e, t) => {
	t.pattern ??= xt(), H.init(e, t);
}), En = /*@__PURE__*/ B("$ZodNanoID", (e, t) => {
	if (t.length !== void 0 && (!Number.isInteger(t.length) || t.length < 1)) throw Error(`Invalid nanoid length: ${t.length}`);
	t.pattern ??= t.length === void 0 ? mt : ht(t.length), H.init(e, t);
}), Dn = /*@__PURE__*/ B("$ZodCUID", (e, t) => {
	t.pattern ??= lt, H.init(e, t);
}), On = /*@__PURE__*/ B("$ZodCUID2", (e, t) => {
	t.pattern ??= ut, H.init(e, t);
}), kn = /*@__PURE__*/ B("$ZodULID", (e, t) => {
	t.pattern ??= dt, H.init(e, t);
}), An = /*@__PURE__*/ B("$ZodXID", (e, t) => {
	t.pattern ??= ft, H.init(e, t);
}), jn = /*@__PURE__*/ B("$ZodKSUID", (e, t) => {
	t.pattern ??= pt, H.init(e, t);
}), Mn = /*@__PURE__*/ B("$ZodISODateTime", (e, t) => {
	t.pattern ??= Ft(t), H.init(e, t);
}), Nn = /*@__PURE__*/ B("$ZodISODate", (e, t) => {
	t.pattern ??= Mt, H.init(e, t);
}), Pn = /*@__PURE__*/ B("$ZodISOTime", (e, t) => {
	t.pattern ??= Pt(t), H.init(e, t);
}), Fn = /*@__PURE__*/ B("$ZodISODuration", (e, t) => {
	t.pattern ??= gt, H.init(e, t);
}), In = /*@__PURE__*/ B("$ZodIPv4", (e, t) => {
	t.pattern ??= St, H.init(e, t);
}), Ln = /^[0-9a-fA-F:.]+$/;
function Rn(e) {
	return Ln.test(e) ? _n(`http://[${e}]`) : !1;
}
var zn = /*@__PURE__*/ B("$ZodIPv6", (e, t) => {
	t.pattern ??= Ct, H.init(e, t), e._zod.check = (n) => {
		Rn(n.value) || n.issues.push({
			code: "invalid_format",
			format: "ipv6",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Bn = /*@__PURE__*/ B("$ZodCIDRv4", (e, t) => {
	t.pattern ??= wt, H.init(e, t);
});
function Vn(e) {
	let t = e.split("/");
	if (t.length !== 2) return !1;
	let [n, r] = t;
	if (!r) return !1;
	let i = Number(r);
	return `${i}` !== r || i < 0 || i > 128 ? !1 : Rn(n);
}
var Hn = /*@__PURE__*/ B("$ZodCIDRv6", (e, t) => {
	t.pattern ??= Tt, H.init(e, t), e._zod.check = (n) => {
		Vn(n.value) || n.issues.push({
			code: "invalid_format",
			format: "cidrv6",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
});
function Un(e) {
	if (e === "") return !0;
	if (/\s/.test(e) || e.length % 4 != 0) return !1;
	try {
		return atob(e), !0;
	} catch {
		return !1;
	}
}
var Wn = /^[0-9a-zA-Z+/]*={0,2}$/, Gn = /*@__PURE__*/ B("$ZodBase64", (e, t) => {
	t.pattern ??= Wn, H.init(e, t), e._zod.check = (n) => {
		Un(n.value) || n.issues.push({
			code: "invalid_format",
			format: "base64",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Kn = /^[A-Za-z0-9_-]*$/;
function qn(e) {
	if (!Kn.test(e)) return !1;
	let t = e.replace(/[-_]/g, (e) => e === "-" ? "+" : "/");
	return Un(t.padEnd(Math.ceil(t.length / 4) * 4, "="));
}
var Jn = /*@__PURE__*/ B("$ZodBase64URL", (e, t) => {
	t.pattern ??= Kn, H.init(e, t), e._zod.check = (n) => {
		qn(n.value) || n.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Yn = /*@__PURE__*/ B("$ZodE164", (e, t) => {
	t.pattern ??= kt, H.init(e, t);
});
function Xn(e, t = null) {
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
var Zn = /*@__PURE__*/ B("$ZodJWT", (e, t) => {
	H.init(e, t), e._zod.check = (n) => {
		Xn(n.value, t.alg) || n.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Qn = /*@__PURE__*/ B("$ZodNumber", (e, t) => {
	V.init(e, t), e._zod.pattern = Rt, e._zod.parse = (n, r) => {
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
}), $n = /*@__PURE__*/ B("$ZodNumberFormat", (e, t) => {
	Yt.init(e, t), Qn.init(e, t);
}), er = /*@__PURE__*/ B("$ZodBoolean", (e, t) => {
	V.init(e, t), e._zod.pattern = zt, e._zod.parse = (n, r) => {
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
}), tr = /*@__PURE__*/ B("$ZodNull", (e, t) => {
	V.init(e, t), e._zod.pattern = Bt, e._zod.values = /* @__PURE__ */ new Set([null]), e._zod.parse = (t, n) => {
		let r = t.value;
		return r === null || t.issues.push({
			expected: "null",
			code: "invalid_type",
			input: r,
			inst: e
		}), t;
	};
}), nr = /*@__PURE__*/ B("$ZodUnknown", (e, t) => {
	V.init(e, t), e._zod.parse = (e) => e;
}), rr = /*@__PURE__*/ B("$ZodNever", (e, t) => {
	V.init(e, t), e._zod.parse = (t, n) => (t.issues.push({
		expected: "never",
		code: "invalid_type",
		input: t.value,
		inst: e
	}), t);
});
function ir(e, t) {
	let n = ce(e._zod.def.checks);
	if (!n.length) return;
	let r = Math.min(...n.map((e) => e[0])), i = e._zod.parse;
	e._zod.parse = (n, a) => {
		let o = t(n.value);
		if (o > r && !a?.skipChecks && a?.direction !== "backward") {
			for (let [t, r] of ce(e._zod.def.checks)) if (o > t && r._zod.def.when(n)) {
				let t = n.issues.length;
				return r._zod.check(n), n.issues[t].continue = !1, le(n.issues, t, e), n;
			}
		}
		return i(n, a);
	};
}
var ar = (e) => Array.isArray(e) ? e.length : -1;
function or(e, t, n) {
	e.issues.length && t.issues.push(...L(n, e.issues)), t.value[n] = e.value;
}
var sr = /*@__PURE__*/ B("$ZodArray", (e, t) => {
	V.init(e, t);
	let n = Ne.memoizer;
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
			if (c instanceof Promise) o.push(c.then((t) => or(t, r, e)));
			else if (or(c, r, e), s && c.issues.length !== 0 && I(c)) break;
		}
		return o.length ? Promise.all(o).then(() => r) : r;
	}, ir(e, ar);
});
function cr(e, t, n, r, i, a) {
	let o = n in r, s = a === "optional";
	if (o || !s || i !== "optional") {
		if (e.issues.length) {
			if (i !== void 0 && s && !o) return;
			t.issues.push(...L(n, e.issues));
		}
		!o && i === void 0 ? e.issues.length || t.issues.push({
			code: "invalid_type",
			expected: "nonoptional",
			input: void 0,
			path: [n]
		}) : e.value === void 0 ? (o || i === "defaulted" && !s) && (t.value[n] = void 0) : t.value[n] = e.value;
	}
}
var lr = [];
function ur(e) {
	let t = Object.keys(e.shape), n = Object.getOwnPropertySymbols(e.shape), r = n.length ? n : lr, i = r.length ? [...t, ...r] : t;
	for (let t of i) if (!e.shape?.[t]?._zod?.traits?.has("$ZodType")) throw Error(`Invalid element at key "${String(t)}": expected a Zod schema`);
	let a = A(e.shape);
	return {
		...e,
		allKeys: i,
		symbolKeys: r,
		keySet: new Set(t),
		numKeys: t.length,
		optionalKeys: new Set(a)
	};
}
function dr(e, t, n, r, i, a, o) {
	let s = [], c = i.keySet, l = i.catchall._zod, u = l.def.type, d = l.optin, f = l.optout, p = 0;
	for (let i in t) {
		if (o && n.issues.length !== p) {
			if (I(n, p)) break;
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
		a instanceof Promise ? e.push(a.then((e) => cr(e, n, i, t, d, f))) : cr(a, n, i, t, d, f);
	}
	return s.length && n.issues.push({
		code: "unrecognized_keys",
		keys: s,
		input: t,
		inst: a,
		continue: !0
	}), e.length ? Promise.all(e).then(() => n) : n;
}
var fr = /*@__PURE__*/ B("$ZodObject", (e, t) => {
	V.init(e, t);
	let n = Object.getOwnPropertyDescriptor(t, "shape"), r = n?.get ? n.get.raw : t.shape ?? {};
	if (r) {
		let e = () => {
			let n = { ...r };
			return Object.defineProperty(t, "shape", { value: n }), e.raw = n, n;
		};
		e.raw = r, Object.defineProperty(t, "shape", { get: e });
	}
	let a = i(() => ur(t));
	z(e, "propValues", (e) => {
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
	let o = x, s = t.catchall, c, l = Ne.memoizer;
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
				if (I(t, f)) break;
				f = t.issues.length;
			}
			if (e === "__proto__") continue;
			let a = u[e], o = a._zod.optin, s = a._zod.optout, c = a._zod.run({
				value: r[e],
				issues: []
			}, n);
			c instanceof Promise ? i.push(c.then((n) => cr(n, t, e, r, o, s))) : cr(c, t, e, r, o, s);
		}
		return s ? dr(i, r, t, n, a.value, e, d === !0) : i.length ? Promise.all(i).then(() => t) : t;
	};
}), pr = /*@__PURE__*/ B("$ZodObjectJIT", (e, t) => {
	fr.init(e, t);
	let n = e._zod.parse, r = i(() => ur(t)), a = Ne.memoizer, o = (t) => {
		let n = r.value, i = n.symbolKeys, o = new cn(["payload", "ctx"], {
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
	}, s, c = x, l = !Ne.jitless, u = l && S.value, d = t.catchall, f;
	e._zod.parse = (i, a) => {
		f ??= r.value;
		let p = i.value;
		return c(p) ? l && u && a?.async === !1 && a.jitless !== !0 ? (s ||= o(t.shape), i = s(i, a), d ? dr([], p, i, a, f, e, a?.abortEarly === !0) : i) : n(i, a) : (i.issues.push({
			expected: "object",
			code: "invalid_type",
			input: p,
			inst: e
		}), i);
	};
});
function mr(e, t, n, r) {
	for (let n of e) if (n.issues.length === 0) return t.value = n.value, t;
	let i = e.filter((e) => !I(e));
	return i.length === 1 ? (t.value = i[0].value, i[0]) : (t.issues.push({
		code: "invalid_union",
		input: t.value,
		inst: n,
		errors: e.map((e) => e.issues.map((e) => ue(e, r, Pe())))
	}), t);
}
var hr = /*@__PURE__*/ B("$ZodUnion", (e, t) => {
	V.init(e, t), z(e, "optin", (e) => e.def.options.some((e) => e._zod.optin === "defaulted") ? "defaulted" : e.def.options.some((e) => e._zod.optin !== void 0) ? "optional" : void 0), z(e, "optout", (e) => e.def.options.some((e) => e._zod.optout === "optional") ? "optional" : void 0), z(e, "values", (e) => {
		if (e.def.options.every((e) => e._zod.values)) return new Set(e.def.options.flatMap((e) => Array.from(e._zod.values)));
	}), z(e, "pattern", (e) => {
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
		return a ? Promise.all(o).then((t) => mr(t, r, e, i)) : mr(o, r, e, i);
	};
});
function gr(e) {
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
var _r = /*@__PURE__*/ B("$ZodDiscriminatedUnion", (e, t) => {
	t.inclusive = !1, hr.init(e, t);
	let n = e._zod.parse;
	z(e, "propValues", (e) => {
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
	let r = i(() => gr(t));
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
}), vr = /*@__PURE__*/ B("$ZodIntersection", (e, t) => {
	V.init(e, t), e._zod.parse = (e, n) => {
		let r = e.value, i = t.left._zod.run({
			value: r,
			issues: []
		}, n), a = t.right._zod.run({
			value: r,
			issues: []
		}, n);
		return i instanceof Promise || a instanceof Promise ? Promise.all([i, a]).then(([t, n]) => br(e, t, n)) : br(e, i, a);
	};
});
function yr(e, t) {
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
			let r = yr(e[n], t[n]);
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
			let i = e[r], a = t[r], o = yr(i, a);
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
function br(e, t, n) {
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
	let c = yr(t.value, n.value);
	if (!c.valid) {
		if (I(e)) return e;
		throw Error(`Unmergable intersection. Error path: ${JSON.stringify(c.mergeErrorPath)}`);
	}
	return e.value = c.data, e;
}
var xr = /*@__PURE__*/ B("$ZodTuple", (e, t) => {
	V.init(e, t);
	let n = t.items, r = Ne.memoizer;
	r?.attach(e), e._zod.parse = (i, a) => {
		let o = i.value;
		if (!Array.isArray(o)) return i.issues.push({
			input: o,
			inst: e,
			expected: "tuple",
			code: "invalid_type"
		}), i;
		i.value = r ? r.alloc(e, i, [], a) : [];
		let s = [], c = Sr(n, "optin"), l = Sr(n, "optout");
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
			})) : (u[e] = t, d && !f && t.issues.length && (f = I(t)));
		}
		if (t.rest && !f) {
			let e = n.length - 1, r = o.slice(n.length), c = i.issues.length;
			for (let n of r) {
				if (d && i.issues.length !== c) {
					if (I(i, c)) break;
					c = i.issues.length;
				}
				e++;
				let r = t.rest._zod.run({
					value: n,
					issues: []
				}, a);
				r instanceof Promise ? s.push(r.then((t) => Cr(t, i, e))) : Cr(r, i, e);
			}
		}
		return s.length ? Promise.all(s).then(() => wr(u, i, n, o, l)) : wr(u, i, n, o, l);
	};
});
function Sr(e, t) {
	for (let n = e.length - 1; n >= 0; n--) if (!(t === "optin" ? e[n]._zod.optin !== void 0 : e[n]._zod.optout === "optional")) return n + 1;
	return 0;
}
function Cr(e, t, n) {
	e.issues.length && t.issues.push(...L(n, e.issues)), t.value[n] = e.value;
}
function wr(e, t, n, r, i) {
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
			t.issues.push(...L(a, o.issues));
		}
		t.value[a] = o.value;
	}
	for (let e = t.value.length - 1; e >= r.length && n[e]._zod.optout === "optional" && t.value[e] === void 0; e--) t.value.length = e;
	return t;
}
var Tr = /*@__PURE__*/ B("$ZodRecord", (e, t) => {
	V.init(e, t);
	let n = Ne.memoizer;
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
						issues: s.issues.map((e) => ue(e, i, Pe())),
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
					e.issues.length && r.issues.push(...L(n, e.issues)), r.value[l] = e.value;
				})) : (u.issues.length && r.issues.push(...L(n, u.issues)), r.value[l] = u.value);
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
				if (typeof n == "string" && Rt.test(n) && l.issues.length) {
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
						issues: l.issues.map((e) => ue(e, i, Pe())),
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
					e.issues.length && r.issues.push(...L(n, e.issues)), r.value[u] = e.value;
				})) : (d.issues.length && r.issues.push(...L(n, d.issues)), r.value[u] = d.value);
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
}), Er = /*@__PURE__*/ B("$ZodEnum", (t, n) => {
	V.init(t, n);
	let r = e(n.entries), i = new Set(r);
	t._zod.values = i, z(t, "pattern", (t) => {
		let n = e(t.def.entries).filter((e) => T.has(typeof e));
		return RegExp(n.length ? `^(${n.map((e) => E(e.toString())).join("|")})$` : "^[^\\s\\S]$");
	}), t._zod.parse = (e, n) => {
		let a = e.value;
		return i.has(a) || e.issues.push({
			code: "invalid_value",
			values: r,
			input: a,
			inst: t
		}), e;
	};
}), Dr = /*@__PURE__*/ B("$ZodLiteral", (e, t) => {
	V.init(e, t);
	let n = new Set(t.values);
	e._zod.values = n, z(e, "pattern", (e) => {
		let t = e.def.values;
		return RegExp(t.length ? `^(${t.map((e) => typeof e == "string" ? E(e) : e ? E(e.toString()) : String(e)).join("|")})$` : "^[^\\s\\S]$");
	}), e._zod.parse = (r, i) => {
		let a = r.value;
		return n.has(a) || r.issues.push({
			code: "invalid_value",
			values: t.values,
			input: a,
			inst: e
		}), r;
	};
}), Or = /*@__PURE__*/ B("$ZodTransform", (e, t) => {
	V.init(e, t), e._zod.optin = "optional", Ne.memoizer?.guard(e), e._zod.parse = (n, r) => {
		if (r.direction === "backward") throw new Me(e.constructor.name);
		let i = t.transform(n.value, n);
		if (r.async) return (i instanceof Promise ? i : Promise.resolve(i)).then((e) => (n.value = e, n));
		if (i instanceof Promise) throw new je();
		return n.value = i, n;
	};
});
function kr(e, t) {
	return e.value = t.issues.length ? void 0 : t.value, e;
}
var Ar = /*@__PURE__*/ B("$ZodOptional", (e, t) => {
	V.init(e, t), z(e, "optin", (e) => e.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), e._zod.optout = "optional", z(e, "values", (e) => {
		let t = e.def.innerType._zod.values;
		return t ? /* @__PURE__ */ new Set([...t, void 0]) : void 0;
	}), z(e, "pattern", (e) => {
		let t = e.def.innerType._zod.pattern;
		return t ? RegExp(`^(${o(t.source)})?$`) : void 0;
	}), e._zod.parse = (e, n) => {
		if (e.value === void 0) {
			if (t.innerType._zod.optin !== "defaulted") return e;
			let r = t.innerType._zod.run({
				value: e.value,
				issues: []
			}, n);
			return r instanceof Promise ? r.then((t) => kr(e, t)) : kr(e, r);
		}
		return t.innerType._zod.run(e, n);
	};
}), jr = /*@__PURE__*/ B("$ZodExactOptional", (e, t) => {
	Ar.init(e, t), z(e, "values", (e) => e.def.innerType._zod.values), z(e, "pattern", (e) => e.def.innerType._zod.pattern), e._zod.parse = (e, n) => t.innerType._zod.run(e, n);
}), Mr = /*@__PURE__*/ B("$ZodNullable", (e, t) => {
	V.init(e, t), z(e, "optin", (e) => e.def.innerType._zod.optin), z(e, "optout", (e) => e.def.innerType._zod.optout), z(e, "pattern", (e) => {
		let t = e.def.innerType._zod.pattern;
		return t ? RegExp(`^(${o(t.source)}|null)$`) : void 0;
	}), z(e, "values", (e) => e.def.innerType._zod.values ? /* @__PURE__ */ new Set([...e.def.innerType._zod.values, null]) : void 0), e._zod.parse = (e, n) => e.value === null ? e : t.innerType._zod.run(e, n);
}), Nr = /*@__PURE__*/ B("$ZodDefault", (e, t) => {
	V.init(e, t), e._zod.optin = "defaulted", z(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		if (e.value === void 0) return e.value = t.defaultValue, e;
		let r = t.innerType._zod.run(e, n);
		return r instanceof Promise ? r.then((e) => Pr(e, t)) : Pr(r, t);
	};
});
function Pr(e, t) {
	return e.value === void 0 && (e.value = t.defaultValue), e;
}
var Fr = /*@__PURE__*/ B("$ZodPrefault", (e, t) => {
	V.init(e, t), e._zod.optin = "defaulted", z(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => (n.direction === "backward" || e.value === void 0 && (e.value = t.defaultValue), t.innerType._zod.run(e, n));
}), Ir = /*@__PURE__*/ B("$ZodNonOptional", (e, t) => {
	V.init(e, t), z(e, "values", (e) => {
		let t = e.def.innerType._zod.values;
		return t ? new Set([...t].filter((e) => e !== void 0)) : void 0;
	}), e._zod.parse = (n, r) => {
		let i = t.innerType._zod.run(n, r);
		return i instanceof Promise ? i.then((t) => Lr(t, e)) : Lr(i, e);
	};
});
function Lr(e, t) {
	return !e.issues.length && e.value === void 0 && e.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: e.value,
		inst: t
	}), e;
}
function Rr(e, t, n, r) {
	return t.issues.length ? (e.value = n.catchValue({
		...t,
		value: e.value,
		error: { issues: t.issues.map((e) => ue(e, r, Pe())) },
		input: e.value
	}), e) : (e.value = t.value, t.memo && (e.memo = !0), e);
}
var zr = /*@__PURE__*/ B("$ZodCatch", (e, t) => {
	V.init(e, t), z(e, "optin", (e) => e.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), z(e, "optout", (e) => e.def.innerType._zod.optout), z(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		let r = t.innerType._zod.run({
			value: e.value,
			issues: []
		}, n);
		return r instanceof Promise ? r.then((r) => Rr(e, r, t, n)) : Rr(e, r, t, n);
	};
}), Br = /*@__PURE__*/ B("$ZodPipe", (e, t) => {
	V.init(e, t), z(e, "values", (e) => e.def.in._zod.values), z(e, "optin", (e) => e.def.in._zod.optin), z(e, "optout", (e) => e.def.out._zod.optout), z(e, "propValues", (e) => e.def.in._zod.propValues), e._zod.parse = (e, n) => {
		if (n.direction === "backward") {
			let r = t.out._zod.run(e, n);
			return r instanceof Promise ? r.then((e) => Vr(e, t.in, n)) : Vr(r, t.in, n);
		}
		let r = t.in._zod.run(e, n);
		return r instanceof Promise ? r.then((e) => Vr(e, t.out, n)) : Vr(r, t.out, n);
	};
});
function Vr(e, t, n) {
	return e.issues.some((e) => e.code !== "unrecognized_keys") ? (e.aborted = !0, e) : t._zod.run({
		value: e.value,
		issues: e.issues
	}, n);
}
var Hr = /*@__PURE__*/ B("$ZodReadonly", (e, t) => {
	V.init(e, t), z(e, "propValues", (e) => e.def.innerType._zod.propValues), z(e, "values", (e) => e.def.innerType._zod.values), z(e, "optin", (e) => e.def.innerType?._zod?.optin), z(e, "optout", (e) => e.def.innerType?._zod?.optout), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		let r = t.innerType._zod.run(e, n);
		return r instanceof Promise ? r.then(Ur) : Ur(r);
	};
});
function Ur(e) {
	return e.memo || (e.value = Object.freeze(e.value)), e;
}
var Wr = /*@__PURE__*/ B("$ZodLazy", (e, t) => {
	V.init(e, t), l(e._zod, "innerType", () => {
		let e = t;
		return e._cachedInner ||= t.getter(), e._cachedInner;
	}), z(e, "pattern", (e) => e.innerType?._zod?.pattern), z(e, "propValues", (e) => e.innerType?._zod?.propValues), z(e, "optin", (e) => e.innerType?._zod?.optin ?? void 0), z(e, "optout", (e) => e.innerType?._zod?.optout ?? void 0), e._zod.parse = (t, n) => e._zod.innerType._zod.run(t, n);
}), Gr = /*@__PURE__*/ B("$ZodCustom", (e, t) => {
	Ut.init(e, t), V.init(e, t), e._zod.parse = (e, t) => e, e._zod.check = (n) => {
		let r = n.value, i = t.fn(r);
		if (i instanceof Promise) return i.then((t) => Kr(t, n, r, e));
		Kr(i, n, r, e);
	};
});
function Kr(e, t, n, r) {
	if (!e) {
		let e = {
			code: "custom",
			input: n,
			inst: r,
			path: [...r._zod.def.path ?? []],
			continue: !r._zod.def.abort
		};
		r._zod.def.params && (e.params = r._zod.def.params), t.issues.push(me(e));
	}
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/memoizer.js
var qr = class extends Error {
	constructor() {
		super("Cannot parse a reference cycle that closes through a transform"), this.name = "ZodCyclicError";
	}
}, Jr = "~memo", Yr = [];
function Xr(e) {
	return typeof e == "object" && !!e;
}
function Zr(e) {
	return e.map((e) => e.path ? {
		...e,
		path: e.path.slice()
	} : { ...e });
}
var Qr = /*@__PURE__*/ new WeakMap(), $r = 0, ei = 1, ti = 2;
function ni(e, t, n) {
	let r = Qr.get(e);
	if (r !== void 0) return r ? ti : $r;
	if (t.has(e)) return ti;
	t.add(e);
	let i = $r, a = (e) => {
		if (i !== ti && e?._zod) {
			let r = ni(e, t, n);
			r > i && (i = r);
		}
	}, o = (e, r) => {
		let i = $r;
		for (let a of Reflect.ownKeys(e)) {
			let o = Object.getOwnPropertyDescriptor(e, a);
			if (r && !o.enumerable) continue;
			let s = o.get ? ei : o.value?._zod ? ni(o.value, t, n) : $r;
			s > i && (i = s);
		}
		return i;
	}, s = (e) => {
		e > i && (i = e);
	}, c = e._zod.def;
	switch (c.type) {
		case "object": {
			let e = d(c);
			s(e ? o(e, !0) : ei), a(c.catchall);
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
			s(r ? ni(r, t, !1) : ei);
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
	return t.delete(e), ri(e, i);
}
function ri(e, t) {
	return t !== ei && Qr.set(e, t === ti), t;
}
function ii(e, t) {
	let n = e.buckets.get(t);
	return n || (n = /* @__PURE__ */ new WeakMap(), e.buckets.set(t, n)), n;
}
var ai, oi = [], si = {
	alloc(e, t, n) {
		let r = ai;
		if (!r) return n;
		ai = void 0;
		let i = {
			value: n,
			issues: null
		};
		return r.set(t.value, i), oi.push(i), n;
	},
	guard(e) {
		var t;
		(t = e._zod).deferred ?? (t.deferred = []), e._zod.deferred.push(() => {
			let t = e._zod.parse, n = (e, n) => {
				if (n.direction !== "backward" && li(n, e.value)) throw new qr();
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
					let i = ni(e, /* @__PURE__ */ new Set(), !1);
					if (i === $r) return e._zod.parse = t, e._zod.run === o && (e._zod.run = t), t(s, c);
					i === ti || r ? n = !0 : r = !0;
				}
				let l = s.value;
				if (!Xr(l)) return t(s, c);
				let u = c[Jr];
				u || (u = {
					buckets: /* @__PURE__ */ new WeakMap(),
					backEdges: void 0
				}, c[Jr] = u);
				let d;
				i === c ? d = a : (d = ii(u, e), i = c, a = d);
				let f = d.get(l);
				if (f) return s.value = f.value, f.issues ? f.issues.length && s.issues.push(...Zr(f.issues)) : (s.memo = !0, u.backEdges ?? (u.backEdges = /* @__PURE__ */ new WeakSet()), u.backEdges.add(f.value)), s;
				ai = d;
				let p = oi.length, m = t(s, c);
				ai = void 0;
				let h = oi.length > p ? oi.pop() : void 0;
				return m instanceof Promise ? m.then((e) => (h && (h.issues = e.issues.length ? Zr(e.issues) : Yr), e)) : (h && (h.issues = m.issues.length ? Zr(m.issues) : Yr), m);
			};
			e._zod.parse = o, e._zod.run === t && (e._zod.run = o);
		});
	}
};
function ci() {
	return si;
}
function li(e, t) {
	let n = e[Jr]?.backEdges;
	return n !== void 0 && Xr(t) && n.has(t);
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/locales/en.js
var ui = () => {
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
			case "invalid_type": return `Invalid input: expected ${a(e.expected)}, received ${a(pe(e.input), e.input)}`;
			case "invalid_value": return e.values.length === 1 ? `Invalid input: expected ${k(e.values[0])}` : `Invalid option: expected one of ${t(e.values, "|")}`;
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
function di() {
	return { localeError: ui() };
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/registries.js
var fi, pi = class {
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
function mi() {
	return new pi();
}
(fi = globalThis).__zod_globalRegistry ?? (fi.__zod_globalRegistry = mi());
var hi = globalThis.__zod_globalRegistry;
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/api.js
function gi(e) {
	return e.checks &&= [...e.checks], e;
}
// @__NO_SIDE_EFFECTS__
function _i(e, t) {
	return new e(gi({
		type: "string",
		...O(t)
	}));
}
// @__NO_SIDE_EFFECTS__
function vi(e, t) {
	return new e({
		type: "string",
		format: "email",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function yi(e, t) {
	return new e({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function bi(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function xi(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v4",
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Si(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v6",
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ci(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v7",
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function wi(e, t) {
	return new e({
		type: "string",
		format: "url",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ti(e, t) {
	return new e({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ei(e, t) {
	return new e({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Di(e, t) {
	return new e({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Oi(e, t) {
	return new e({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ki(e, t) {
	return new e({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ai(e, t) {
	return new e({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ji(e, t) {
	return new e({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Mi(e, t) {
	return new e({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ni(e, t) {
	return new e({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Pi(e, t) {
	return new e({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Fi(e, t) {
	return new e({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ii(e, t) {
	return new e({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Li(e, t) {
	return new e({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ri(e, t) {
	return new e({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function zi(e, t) {
	return new e({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: !1,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Bi(e, t) {
	return new e({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: !1,
		local: !1,
		precision: null,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Vi(e, t) {
	return new e({
		type: "string",
		format: "date",
		check: "string_format",
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Hi(e, t) {
	return new e({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ui(e, t) {
	return new e({
		type: "string",
		format: "duration",
		check: "string_format",
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Wi(e, t) {
	return new e(gi({
		type: "number",
		checks: [],
		...O(t)
	}));
}
// @__NO_SIDE_EFFECTS__
function Gi(e, t) {
	return new e({
		type: "number",
		check: "number_format",
		abort: !1,
		format: "safeint",
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ki(e, t) {
	return new e({
		type: "boolean",
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function qi(e, t) {
	return new e({
		type: "null",
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ji(e) {
	return new e({ type: "unknown" });
}
// @__NO_SIDE_EFFECTS__
function Yi(e, t) {
	return new e({
		type: "never",
		...O(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Xi(e, t) {
	return new Kt({
		check: "less_than",
		...O(t),
		value: e,
		inclusive: !1
	});
}
// @__NO_SIDE_EFFECTS__
function Zi(e, t) {
	return new Kt({
		check: "less_than",
		...O(t),
		value: e,
		inclusive: !0
	});
}
// @__NO_SIDE_EFFECTS__
function Qi(e, t) {
	return new qt({
		check: "greater_than",
		...O(t),
		value: e,
		inclusive: !1
	});
}
// @__NO_SIDE_EFFECTS__
function $i(e, t) {
	return new qt({
		check: "greater_than",
		...O(t),
		value: e,
		inclusive: !0
	});
}
// @__NO_SIDE_EFFECTS__
function ea(e, t) {
	return new Jt({
		check: "multiple_of",
		...O(t),
		value: e
	});
}
// @__NO_SIDE_EFFECTS__
function ta(e, t) {
	return new Xt({
		check: "max_length",
		...O(t),
		maximum: e
	});
}
// @__NO_SIDE_EFFECTS__
function na(e, t) {
	return new Zt({
		check: "min_length",
		...O(t),
		minimum: e
	});
}
// @__NO_SIDE_EFFECTS__
function ra(e, t) {
	return new Qt({
		check: "length_equals",
		...O(t),
		length: e
	});
}
// @__NO_SIDE_EFFECTS__
function ia(e, t) {
	return new en({
		check: "string_format",
		format: "regex",
		...O(t),
		pattern: e
	});
}
// @__NO_SIDE_EFFECTS__
function aa(e) {
	return new tn({
		check: "string_format",
		format: "lowercase",
		...O(e)
	});
}
// @__NO_SIDE_EFFECTS__
function oa(e) {
	return new nn({
		check: "string_format",
		format: "uppercase",
		...O(e)
	});
}
// @__NO_SIDE_EFFECTS__
function sa(e, t) {
	return new rn({
		check: "string_format",
		format: "includes",
		...O(t),
		includes: e
	});
}
// @__NO_SIDE_EFFECTS__
function ca(e, t) {
	return new an({
		check: "string_format",
		format: "starts_with",
		...O(t),
		prefix: e
	});
}
// @__NO_SIDE_EFFECTS__
function la(e, t) {
	return new on({
		check: "string_format",
		format: "ends_with",
		...O(t),
		suffix: e
	});
}
// @__NO_SIDE_EFFECTS__
function ua(e) {
	return new sn({
		check: "overwrite",
		tx: e
	});
}
// @__NO_SIDE_EFFECTS__
function da(e) {
	return /* @__PURE__ */ ua((t) => t.normalize(e));
}
// @__NO_SIDE_EFFECTS__
function fa() {
	return /* @__PURE__ */ ua((e) => e.trim());
}
// @__NO_SIDE_EFFECTS__
function pa() {
	return /* @__PURE__ */ ua((e) => e.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function ma() {
	return /* @__PURE__ */ ua((e) => e.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function ha() {
	return /* @__PURE__ */ ua((e) => y(e));
}
// @__NO_SIDE_EFFECTS__
function ga(e, t, n) {
	return new e({
		type: "array",
		element: t,
		...O(n)
	});
}
// @__NO_SIDE_EFFECTS__
function _a(e, t, n) {
	return new e({
		type: "custom",
		check: "custom",
		fn: t,
		...O(n)
	});
}
// @__NO_SIDE_EFFECTS__
function va(e, t) {
	let n = /* @__PURE__ */ ya((t) => (t.addIssue = (e) => {
		if (typeof e == "string") t.issues.push(me(e, t.value, n._zod.def));
		else {
			let r = e;
			r.fatal && (r.continue = !1), r.code ??= "custom", "input" in r || (r.input = t.value), r.inst ??= n, r.continue ??= !n._zod.def.abort, t.issues.push(me(r));
		}
	}, e(t.value, t)), t);
	return n;
}
// @__NO_SIDE_EFFECTS__
function ya(e, t) {
	let n = new Ut({
		check: "custom",
		...O(t)
	});
	return n._zod.check = e, n;
}
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core/to-json-schema.js
function ba(e, ...t) {
	for (let n of t) for (let t of Reflect.ownKeys(n)) Object.prototype.propertyIsEnumerable.call(n, t) && u(e, t, n[t]);
	return e;
}
function xa(e) {
	let t = e?.target ?? "draft-2020-12";
	return t === "draft-4" && (t = "draft-04"), t === "draft-7" && (t = "draft-07"), {
		processors: e.processors ?? {},
		metadataRegistry: e?.metadata ?? hi,
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
function Sa(e, t, n, r, i) {
	let a = typeof t.unrepresentable == "function" ? t.unrepresentable({
		zodSchema: e,
		path: r.path,
		message: i
	}) : t.unrepresentable;
	if (a === "any") return !1;
	if (a === void 0 || a === "throw") throw Error(i);
	return Object.assign(n, a), !0;
}
function U(e, t, n = {
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
		a && (o.ref ||= a, U(a, t, r), t.seen.get(a).isParent = !0);
	}
	let c = t.metadataRegistry.get(e);
	return c && ba(o.schema, c), t.io === "input" && Ma(e) && (delete o.schema.examples, delete o.schema.default), t.io === "input" && "_prefault" in o.schema && ((r = o.schema).default ?? (r.default = o.schema._prefault)), delete o.schema._prefault, t.seen.get(e).schema;
}
function Ca(e) {
	return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
function wa(e, t) {
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
				ref: `${i("__shared")}#/${r}/${Ca(a)}`
			};
		}
		let i = `#/${r}/`;
		if (t[1] === n && !t[1].schema.id) return { ref: "#" };
		let a = t[1].schema.id ?? `__schema${e.counter++}`;
		return {
			defId: a,
			ref: i + Ca(a)
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
function Ta(e) {
	let t = e.anyOf;
	if (!Array.isArray(t) || t.length === 0 || e.type !== void 0) return;
	let n = [];
	for (let e of t) {
		if (!e || typeof e != "object") return;
		Ta(e);
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
var Ea = /* @__PURE__ */ new Set([
	"type",
	"properties",
	"required",
	"additionalProperties"
]), Da = ["oneOf", "anyOf"];
function Oa(e) {
	let t = e.additionalProperties;
	return t === void 0 || t === !1 || typeof t != "object" || !t ? null : Object.keys(t).length ? t : null;
}
function ka(e) {
	let t = [];
	for (let n of e) {
		if (typeof n != "object" || n.type !== "object") return null;
		for (let e in n) if (!Ea.has(e)) return null;
		t.push(n);
	}
	let n = {}, r = /* @__PURE__ */ new Set();
	for (let e of t) {
		for (let r in e.properties) {
			if (Object.prototype.hasOwnProperty.call(n, r)) continue;
			let e = [];
			for (let n of t) {
				let t = n.properties?.[r] ?? Oa(n);
				t != null && (e.some((e) => JSON.stringify(e) === JSON.stringify(t)) || e.push(t));
			}
			u(n, r, e.length === 1 ? e[0] : ka(e) ?? { allOf: e });
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
			let t = Oa(n);
			t && !e.some((e) => JSON.stringify(e) === JSON.stringify(t)) && e.push(t);
		}
		e.length === 1 ? i.additionalProperties = e[0] : e.length > 1 && (i.additionalProperties = { allOf: e });
	}
	return i;
}
function Aa(e) {
	let t = e.allOf;
	if (!Array.isArray(t) || t.length < 2) return;
	for (let t of Ea) if (t in e) return;
	let n = t.filter((e) => Da.some((t) => Array.isArray(e[t]))), r = null;
	if (!n.length) r = ka(t);
	else {
		let e = n[0], i = Da.find((t) => Array.isArray(e[t]));
		if (Object.keys(e).length !== 1) return;
		let a = t.filter((t) => t !== e), o = e[i].map((e) => ka([...a, e]));
		if (o.some((e) => !e)) return;
		r = { [i]: o };
	}
	r && (delete e.allOf, ba(e, r));
}
function ja(e, t) {
	let n = e.seen.get(t);
	if (!n) throw Error("Unprocessed schema. This is a bug in Zod.");
	let r = (t) => {
		let n = e.seen.get(t);
		if (n.ref === null) return;
		let i = n.def ?? n.schema, a = { ...i }, o = n.ref;
		if (n.ref = null, o) {
			r(o);
			let n = e.seen.get(o), s = n.schema;
			if (s.$ref && (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0") ? (i.allOf = i.allOf ?? [], i.allOf.push(s)) : ba(i, s), ba(i, a), t._zod.parent === o) for (let e in i) e !== "$ref" && e !== "allOf" && (e in a || delete i[e]);
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
		if (e.target !== "openapi-3.0") for (let t of e.seen.entries()) Ta(t[1].def ?? t[1].schema);
		for (let t of e.deferred) t();
		if (e.intersections.length) {
			let t = /* @__PURE__ */ new Map();
			for (let n of e.seen.values()) for (let e of [n.schema, n.def]) {
				let n = e?.allOf;
				if (!Array.isArray(n)) continue;
				let r = t.get(n);
				r ? r.push(e) : t.set(n, [e]);
			}
			for (let n of e.intersections) for (let e of t.get(n) ?? []) Aa(e);
		}
	}
	let i = {};
	if (e.target === "draft-2020-12" ? i.$schema = "https://json-schema.org/draft/2020-12/schema" : e.target === "draft-07" ? i.$schema = "http://json-schema.org/draft-07/schema#" : e.target === "draft-04" ? i.$schema = "http://json-schema.org/draft-04/schema#" : e.target, e.external?.uri) {
		let n = e.external.registry.get(t)?.id;
		if (!n) throw Error("Schema is missing an `id` property");
		i.$id = e.external.uri(n);
	}
	ba(i, n.defId ? n.schema : n.def ?? n.schema);
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
					input: Pa(t, "input", e.processors),
					output: Pa(t, "output", e.processors)
				}
			},
			enumerable: !1,
			writable: !1
		}), n;
	} catch {
		throw Error("Error converting schema to JSON.");
	}
}
function Ma(e, t) {
	let n = t ?? { seen: /* @__PURE__ */ new Set() };
	if (n.seen.has(e)) return !1;
	n.seen.add(e);
	let r = e._zod.def;
	if (r.type === "transform") return !0;
	if (r.type === "array") return Ma(r.element, n);
	if (r.type === "set") return Ma(r.valueType, n);
	if (r.type === "lazy") return Ma(r.getter(), n);
	if (r.type === "promise" || r.type === "optional" || r.type === "nonoptional" || r.type === "nullable" || r.type === "readonly" || r.type === "default" || r.type === "prefault" || r.type === "catch") return Ma(r.innerType, n);
	if (r.type === "intersection") return Ma(r.left, n) || Ma(r.right, n);
	if (r.type === "record" || r.type === "map") return Ma(r.keyType, n) || Ma(r.valueType, n);
	if (r.type === "pipe") return e._zod.traits.has("$ZodCodec") ? !0 : Ma(r.in, n) || Ma(r.out, n);
	if (r.type === "object") {
		for (let e in r.shape) if (Ma(r.shape[e], n)) return !0;
		return !1;
	}
	if (r.type === "union") {
		for (let e of r.options) if (Ma(e, n)) return !0;
		return !1;
	}
	if (r.type === "tuple") {
		for (let e of r.items) if (Ma(e, n)) return !0;
		return !!(r.rest && Ma(r.rest, n));
	}
	return !1;
}
var Na = (e, t = {}) => (n) => {
	let r = xa({
		...n,
		processors: t
	});
	return U(e, r), wa(r, e), ja(r, e);
}, Pa = (e, t, n = {}) => (r) => {
	let { libraryOptions: i, target: a } = r ?? {}, o = xa({
		...i ?? {},
		target: a,
		io: t,
		processors: n
	});
	return U(e, o), wa(o, e), ja(o, e);
}, Fa = (e, t, n) => {
	(e[t] === void 0 || n > e[t]) && (e[t] = n);
}, Ia = (e, t, n) => {
	(e[t] === void 0 || n < e[t]) && (e[t] = n);
}, La = (e, t) => {
	Fa(e, "minimum", t), Ia(e, "maximum", t);
}, Ra = (e, t) => {
	e.multipleOf ??= [], e.multipleOf.includes(t) || e.multipleOf.push(t);
}, za = (e, t) => {
	e.patterns ??= /* @__PURE__ */ new Set(), e.patterns.add(t);
}, Ba = (e, t) => {
	e.mime = e.mime ? e.mime.filter((e) => t.includes(e)) : [...t];
}, Va = (e, t) => {
	e.format = t, t.includes("int") && (e.isInt = !0);
}, Ha = (e, t) => Fa(e, "minimum", t.minimum), Ua = (e, t) => Ia(e, "maximum", t.maximum), Wa = (e) => (t, n) => {
	Va(t, n.format);
	let [r, i] = e[n.format];
	Fa(t, "minimum", r), Ia(t, "maximum", i);
}, Ga = {
	greater_than: (e, t) => Fa(e, t.inclusive ? "minimum" : "exclusiveMinimum", t.value),
	less_than: (e, t) => Ia(e, t.inclusive ? "maximum" : "exclusiveMaximum", t.value),
	multiple_of: (e, t) => Ra(e, t.value),
	number_format: Wa(j),
	bigint_format: Wa(M),
	min_length: Ha,
	max_length: Ua,
	length_equals: (e, t) => La(e, t.length),
	min_size: Ha,
	max_size: Ua,
	size_equals: (e, t) => La(e, t.size),
	string_format: (e, t) => {
		Va(e, t.format), t.pattern && za(e, t.pattern), (t.format === "base64" || t.format === "base64url") && (e.contentEncoding = t.format), (t.local || t.precision === -1) && (e.laxFormat = !0);
	},
	mime_type: (e, t) => Ba(e, t.mime)
};
function Ka(e) {
	let t = {}, n = e._zod.def, r = e._zod.traits.has("$ZodCheck") ? [e, ...n.checks ?? []] : n.checks ?? [];
	for (let e of r) Ga[e._zod.def.check]?.(t, e._zod.def);
	let i = e._zod.bag;
	i.minimum !== void 0 && Fa(t, "minimum", i.minimum), i.exclusiveMinimum !== void 0 && Fa(t, "exclusiveMinimum", i.exclusiveMinimum), i.maximum !== void 0 && Ia(t, "maximum", i.maximum), i.exclusiveMaximum !== void 0 && Ia(t, "exclusiveMaximum", i.exclusiveMaximum), i.multipleOf !== void 0 && Ra(t, i.multipleOf), i.format !== void 0 && (t.format ??= i.format, i.format.includes("int") && (t.isInt = !0)), i.mime && Ba(t, i.mime);
	for (let e of i.patterns ?? []) za(t, e);
	return t;
}
var qa = {
	guid: "uuid",
	url: "uri",
	datetime: "date-time",
	json_string: "json-string",
	regex: ""
}, Ja = /* @__PURE__ */ new Map([[Wn, Et], [Kn, Dt]]), Ya = (e) => Ja.get(e) ?? e, Xa = (e, t, n, r) => {
	let i = n;
	i.type = "string";
	let { minimum: a, maximum: o, format: s, patterns: c, contentEncoding: l, laxFormat: u } = Ka(e);
	if (typeof a == "number" && (i.minLength = a), typeof o == "number" && (i.maxLength = o), s && (i.format = qa[s] ?? s, i.format === "" && delete i.format, (s === "time" || u) && delete i.format), l && (i.contentEncoding = l), c && c.size > 0) {
		let e = [...c].map(Ya);
		e.length === 1 ? i.pattern = e[0].source : e.length > 1 && (i.allOf = [...e.map((e) => ({
			...t.target === "draft-07" || t.target === "draft-04" || t.target === "openapi-3.0" ? { type: "string" } : {},
			pattern: e.source
		}))]);
	}
}, Za = (e, t, n, r) => {
	let i = n, { minimum: a, maximum: o, multipleOf: s, exclusiveMaximum: c, exclusiveMinimum: l, isInt: u } = Ka(e);
	i.type = u ? "integer" : "number";
	let d = typeof l == "number" && l >= (a ?? -Infinity), f = typeof c == "number" && c <= (o ?? Infinity), p = t.target === "draft-04" || t.target === "openapi-3.0";
	if (d ? p ? (i.minimum = l, i.exclusiveMinimum = !0) : i.exclusiveMinimum = l : typeof a == "number" && (i.minimum = a), f ? p ? (i.maximum = c, i.exclusiveMaximum = !0) : i.exclusiveMaximum = c : typeof o == "number" && (i.maximum = o), s) {
		let n = /* @__PURE__ */ new Set();
		for (let a of s) Number.isFinite(a) && a !== 0 ? n.add(Math.abs(a)) : Sa(e, t, i, r, `A multipleOf divisor of ${a} cannot be represented in JSON Schema`);
		let [a, ...o] = n;
		a !== void 0 && (i.multipleOf = a), o.length && (i.allOf = [...i.allOf ?? [], ...o.map((e) => ({ multipleOf: e }))]);
	}
}, Qa = (e, t, n, r) => {
	n.type = "boolean";
}, $a = (e, t, n, r) => {
	t.target === "openapi-3.0" ? (n.type = "string", n.nullable = !0, n.enum = [null]) : n.type = "null";
}, eo = (e, t, n, r) => {
	n.not = {};
}, to = (t, n, r, i) => {
	let a = t._zod.def, o = e(a.entries);
	o.length === 0 ? r.not = {} : (o.every((e) => typeof e == "number") && (r.type = "number"), o.every((e) => typeof e == "string") && (r.type = "string"), r.enum = o);
}, no = (e, t, n, r) => {
	let i = e._zod.def;
	if (i.values.length === 0) {
		n.not = {};
		return;
	}
	let a = [];
	for (let o of i.values) if (o === void 0) {
		if (Sa(e, t, n, r, "Literal `undefined` cannot be represented in JSON Schema")) return;
	} else if (typeof o == "bigint") {
		if (Sa(e, t, n, r, "BigInt literals cannot be represented in JSON Schema")) return;
		a.push(Number(o));
	} else a.push(o);
	if (a.length !== 0) {
		if (a.length === 1) {
			let e = a[0];
			n.type = e === null ? "null" : typeof e, t.target === "draft-04" || t.target === "openapi-3.0" ? n.enum = [e] : n.const = e;
		} else a.every((e) => typeof e == "number") && (n.type = "number"), a.every((e) => typeof e == "string") && (n.type = "string"), a.every((e) => typeof e == "boolean") && (n.type = "boolean"), a.every((e) => e === null) && (n.type = "null"), n.enum = a;
	}
}, ro = (e, t, n, r) => {
	Sa(e, t, n, r, "Custom types cannot be represented in JSON Schema");
}, io = (e, t, n, r) => {
	Sa(e, t, n, r, "Transforms cannot be represented in JSON Schema");
}, ao = (e, t, n, r) => {
	let i = n, a = e._zod.def, { minimum: o, maximum: s } = Ka(e);
	typeof o == "number" && (i.minItems = o), typeof s == "number" && (i.maxItems = s), i.type = "array", i.items = U(a.element, t, {
		...r,
		path: [...r.path, "items"]
	});
};
function oo(e) {
	let t = e._zod.def;
	return t.type === "pipe" && t.in._zod.traits.has("$ZodTransform") ? oo(t.out) : t.type === "catch" ? oo(t.innerType) : e._zod.optin;
}
var so = (e, t, n, r) => {
	let i = n, a = e._zod.def, o = a.shape;
	if (Object.getOwnPropertySymbols(o).length && Sa(e, t, i, r, "Symbol keys cannot be represented in JSON Schema")) return;
	i.type = "object", i.properties = {};
	for (let e in o) u(i.properties, e, U(o[e], t, {
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
		(t.io === "input" ? oo(n) === void 0 : n._zod.optout === void 0) && s.push(e);
	}
	s.length > 0 && (i.required = s), a.catchall?._zod.def.type === "never" ? i.additionalProperties = !1 : a.catchall ? a.catchall && (i.additionalProperties = U(a.catchall, t, {
		...r,
		path: [...r.path, "additionalProperties"]
	})) : t.io === "output" && (i.additionalProperties = !1);
}, co = (e, t, n, r) => {
	let i = e._zod.def, a = i.inclusive === !1, o = i.options.map((e, n) => U(e, t, {
		...r,
		path: [
			...r.path,
			a ? "oneOf" : "anyOf",
			n
		]
	}));
	a ? n.oneOf = o : n.anyOf = o;
}, lo = (e, t, n, r) => {
	let i = e._zod.def, a = U(i.left, t, {
		...r,
		path: [
			...r.path,
			"allOf",
			0
		]
	}), o = U(i.right, t, {
		...r,
		path: [
			...r.path,
			"allOf",
			1
		]
	}), s = (e) => "allOf" in e && Object.keys(e).length === 1, c = [...s(a) ? a.allOf : [a], ...s(o) ? o.allOf : [o]];
	n.allOf = c, t.intersections.push(c);
}, uo = (e, t, n, r) => {
	let i = n, a = e._zod.def;
	i.type = "array";
	let o = t.target === "draft-2020-12" ? "prefixItems" : "items", s = t.target === "draft-2020-12" || t.target === "openapi-3.0" ? "items" : "additionalItems", c = a.items.map((e, n) => U(e, t, {
		...r,
		path: [
			...r.path,
			o,
			n
		]
	})), l = a.rest ? U(a.rest, t, {
		...r,
		path: [
			...r.path,
			s,
			...t.target === "openapi-3.0" ? [a.items.length] : []
		]
	}) : null, u = a.items.length;
	for (; u > 0;) {
		let e = a.items[u - 1];
		if (!(t.io === "input" ? oo(e) !== void 0 : e._zod.optout === "optional")) break;
		u--;
	}
	let d = a.items.length, f = !a.rest;
	t.target === "draft-2020-12" ? (i.prefixItems = c, f ? i.items = !1 : l && (i.items = l), u > 0 && (i.minItems = u), f && (i.maxItems = d)) : t.target === "openapi-3.0" ? (i.items = { anyOf: c }, l && i.items.anyOf.push(l), u > 0 && (i.minItems = u), f && (i.maxItems = d)) : (i.items = c, f ? i.additionalItems = !1 : l && (i.additionalItems = l), u > 0 && (i.minItems = u), f && (i.maxItems = d));
	let { minimum: p, maximum: m } = Ka(e);
	typeof p == "number" && (i.minItems = p), typeof m == "number" && (i.maxItems = m);
};
function fo(e, t, n) {
	if (t.$ref) {
		if (n.has(t)) return t;
		n.add(t);
		let r = e.get(t)?.def;
		if (!r) return t;
		let i = fo(e, r, n);
		return i === r ? t : i;
	}
	for (let r of ["anyOf", "oneOf"]) {
		let i = t[r];
		if (!Array.isArray(i)) continue;
		let a = i.map((t) => fo(e, t, n));
		a.some((e, t) => e !== i[t]) && (t = {
			...t,
			[r]: a
		});
	}
	let r = Array.isArray(t.type) ? t.type : [t.type], i = !r.includes("string") && r.some((e) => e === "number" || e === "integer"), a = t.enum ?? (t.const === void 0 ? void 0 : [t.const]);
	if (!i && !a?.some((e) => typeof e == "number")) return t;
	let { minimum: o, maximum: s, exclusiveMinimum: c, exclusiveMaximum: l, multipleOf: u, format: d, id: f, ...p } = t;
	return p.enum ? p.enum = p.enum.map((e) => typeof e == "number" ? String(e) : e) : typeof p.const == "number" && (p.const = String(p.const)), i && (p.type = "string", a || (p.pattern = (r.includes("number") ? Rt : Lt).source)), p;
}
var po = /* @__PURE__ */ new WeakMap();
function mo(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e.seen.values()) n.def && !t.has(n.schema) && t.set(n.schema, n);
	let n = /* @__PURE__ */ new Map();
	for (let r of po.get(e) ?? []) {
		let i = e.seen.get(r), a = (i?.def ?? i?.schema)?.propertyNames;
		if (!a || a === !0 || n.has(a)) continue;
		let o = fo(t, a, /* @__PURE__ */ new Set());
		o !== a && n.set(a, o);
	}
	if (n.size) for (let t of e.seen.values()) for (let e of [t.schema, t.def]) {
		let t = e && n.get(e.propertyNames);
		t && (e.propertyNames = t);
	}
}
var ho = (e, t, n, r) => {
	let i = n, a = e._zod.def;
	i.type = "object";
	let o = a.keyType, s = Ka(o).patterns;
	if (a.mode === "loose" && s && s.size > 0) {
		let e = U(a.valueType, t, {
			...r,
			path: [
				...r.path,
				"patternProperties",
				"*"
			]
		});
		i.patternProperties = {};
		for (let t of s) u(i.patternProperties, Ya(t).source, e);
	} else {
		if (t.target === "draft-07" || t.target === "draft-2020-12") {
			i.propertyNames = U(a.keyType, t, {
				...r,
				path: [...r.path, "propertyNames"]
			});
			let n = po.get(t);
			n || (n = [], po.set(t, n), t.deferred.push(() => mo(t))), n.push(e);
		}
		i.additionalProperties = U(a.valueType, t, {
			...r,
			path: [...r.path, "additionalProperties"]
		});
	}
	let c = o._zod.values, l = t.io === "input" && oo(a.valueType) !== void 0;
	if (c && !a.partial && !l) {
		let e = [...c].filter((e) => typeof e == "string" || typeof e == "number");
		e.length > 0 && (i.required = e.map(String));
	}
}, go = (e, t, n, r) => {
	let i = e._zod.def, a = U(i.innerType, t, r), o = t.seen.get(e);
	t.target === "openapi-3.0" ? (o.ref = i.innerType, n.nullable = !0) : n.anyOf = [a, { type: "null" }];
}, _o = (e, t, n, r) => {
	let i = e._zod.def;
	U(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
}, vo = Symbol();
function yo(e, t, n, r, i) {
	let a = !1, o = JSON.stringify(e, (e, t) => typeof t == "bigint" ? (a = !0, null) : t);
	return a ? (Sa(t, n, r, i, "BigInt defaults cannot be represented in JSON Schema"), vo) : JSON.parse(o);
}
var bo = (e, t, n, r) => {
	let i = e._zod.def;
	U(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
	let o = yo(i.defaultValue, e, t, n, r);
	o !== vo && (n.default = o);
}, xo = (e, t, n, r) => {
	let i = e._zod.def;
	U(i.innerType, t, r);
	let a = t.seen.get(e);
	if (a.ref = i.innerType, t.io !== "input") return;
	let o = yo(i.defaultValue, e, t, n, r);
	o !== vo && (n._prefault = o);
}, So = (e, t, n, r) => {
	let i = e._zod.def;
	U(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
	let o;
	try {
		o = i.catchValue(void 0);
	} catch {
		Sa(e, t, n, r, "Dynamic catch values are not supported in JSON Schema");
		return;
	}
	n.default = o;
}, Co = (e, t, n, r) => {
	let i = e._zod.def, a = i.in._zod.traits.has("$ZodTransform"), o = t.io === "input" ? a ? i.out : i.in : i.out;
	U(o, t, r);
	let s = t.seen.get(e);
	s.ref = o;
}, wo = (e, t, n, r) => {
	let i = e._zod.def;
	U(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType, n.readOnly = !0;
}, To = (e, t, n, r) => {
	let i = e._zod.def;
	U(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
}, Eo = (e, t, n, r) => {
	let i = e._zod.innerType;
	U(i, t, r);
	let a = t.seen.get(e);
	a.ref = i;
}, Do = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
function Oo(e, t, n) {
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
var ko = /*@__PURE__*/ B("ZodError", (e, t) => {
	Be.init(e, t), e.name = "ZodError";
	let r = Object.getPrototypeOf(e);
	Do.has(r) || (Do.add(r), Oo(r, "format", (e) => (t) => Ue(e, t)), Oo(r, "flatten", (e) => (t) => He(e, t)), Oo(r, "addIssue", (e) => (t) => {
		e.issues.push(t), e.message = JSON.stringify(e.issues, n, 2);
	}), Oo(r, "addIssues", (e) => (t) => {
		e.issues.push(...t), e.message = JSON.stringify(e.issues, n, 2);
	}), Object.defineProperty(r, "isEmpty", {
		configurable: !0,
		enumerable: !1,
		get() {
			return this.issues.length === 0;
		}
	}));
}, void 0, { Parent: Error }), Ao = /* @__PURE__ */ Ge(ko), jo = /* @__PURE__ */ Ke(ko), Mo = /* @__PURE__ */ qe(ko), No = /* @__PURE__ */ Ye(ko), Po = /* @__PURE__ */ tt(ko), Fo = /* @__PURE__ */ nt(ko), Io = /* @__PURE__ */ rt(ko), Lo = /* @__PURE__ */ it(ko), Ro = /* @__PURE__ */ at(ko), zo = /* @__PURE__ */ ot(ko), Bo = /* @__PURE__ */ st(ko), Vo = /* @__PURE__ */ ct(ko);
//#endregion
//#region ../../node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/classic/schemas.js
function Ho() {
	Ne.localeError || Pe(di());
}
function Uo() {
	Ne.memoizer || Pe({ memoizer: ci() });
}
var W = /*@__PURE__*/ B("ZodType", (e, t) => (Ho(), V.init(e, t), e.def = t, e.type = t.type, e), {
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
		return D(this, e, t);
	},
	brand() {
		return this;
	},
	register(e, t) {
		return e.add(this, t), this;
	},
	refine(e, t) {
		return this.check(uc(e, t));
	},
	superRefine(e, t) {
		return this.check(dc(e, t));
	},
	overwrite(e) {
		return this.check(/* @__PURE__ */ ua(e));
	},
	optional() {
		return Ws(this);
	},
	exactOptional() {
		return Ks(this);
	},
	nullable() {
		return Js(this);
	},
	nullish() {
		return Ws(Js(this));
	},
	nonoptional(e) {
		return ec(this, e);
	},
	array() {
		return J(this);
	},
	or(e) {
		return As([this, e]);
	},
	and(e) {
		return Ps(this, e);
	},
	transform(e) {
		return ic(this, Hs(e));
	},
	default(e) {
		return Xs(this, e);
	},
	prefault(e) {
		return Qs(this, e);
	},
	catch(e) {
		return nc(this, e);
	},
	pipe(e) {
		return ic(this, e);
	},
	readonly() {
		return oc(this);
	},
	describe(e) {
		let t = this.clone();
		return hi.add(t, { description: e }), t;
	},
	meta(...e) {
		if (e.length === 0) return hi.get(this);
		let t = this.clone();
		return hi.add(t, e[0]), t;
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
		return _e(this, "~standard", {
			...fn(this),
			jsonSchema: {
				input: Pa(this, "input"),
				output: Pa(this, "output")
			}
		});
	},
	set "~standard"(e) {
		ge(this, "~standard", e);
	},
	parse: function e(t, n) {
		return Ao(this, t, n, { callee: e });
	},
	parseAsync: async function e(t, n) {
		return await jo(this, t, n, { callee: e });
	},
	safeParse(e, t) {
		return Mo(this, e, t);
	},
	async safeParseAsync(e, t) {
		return No(this, e, t);
	},
	get spa() {
		return this?.safeParseAsync;
	},
	set spa(e) {
		ge(this, "spa", e);
	},
	validate(e, t) {
		return Qe(this, e, t);
	},
	validateAsync(e, t) {
		return et(this, e, t);
	},
	encode: function e(t, n) {
		return Po(this, t, n, { callee: e });
	},
	decode: function e(t, n) {
		return Fo(this, t, n, { callee: e });
	},
	encodeAsync: async function e(t, n) {
		return await Io(this, t, n, { callee: e });
	},
	decodeAsync: async function e(t, n) {
		return await Lo(this, t, n, { callee: e });
	},
	safeEncode(e, t) {
		return Ro(this, e, t);
	},
	safeDecode(e, t) {
		return zo(this, e, t);
	},
	async safeEncodeAsync(e, t) {
		return Bo(this, e, t);
	},
	async safeDecodeAsync(e, t) {
		return Vo(this, e, t);
	},
	toJSONSchema(e) {
		return Na(this, {})(e);
	},
	get description() {
		return hi.get(this)?.description;
	},
	get _def() {
		return this._zod.def;
	}
}), Wo = /*@__PURE__*/ B("_ZodString", (e, t) => {
	pn.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => Xa(e, t, n, r);
}, /*@__PURE__*/ ve({
	format: (e) => Ka(e).format ?? null,
	minLength: (e) => Ka(e).minimum ?? null,
	maxLength: (e) => Ka(e).maximum ?? null
}, {
	regex(...e) {
		return this.check(/* @__PURE__ */ ia(...e));
	},
	includes(...e) {
		return this.check(/* @__PURE__ */ sa(...e));
	},
	startsWith(...e) {
		return this.check(/* @__PURE__ */ ca(...e));
	},
	endsWith(...e) {
		return this.check(/* @__PURE__ */ la(...e));
	},
	min(...e) {
		return this.check(/* @__PURE__ */ na(...e));
	},
	max(...e) {
		return this.check(/* @__PURE__ */ ta(...e));
	},
	length(...e) {
		return this.check(/* @__PURE__ */ ra(...e));
	},
	nonempty(...e) {
		return this.check(/* @__PURE__ */ na(1, ...e));
	},
	lowercase(e) {
		return this.check(/* @__PURE__ */ aa(e));
	},
	uppercase(e) {
		return this.check(/* @__PURE__ */ oa(e));
	},
	trim() {
		return this.check(/* @__PURE__ */ fa());
	},
	normalize(...e) {
		return this.check(/* @__PURE__ */ da(...e));
	},
	toLowerCase() {
		return this.check(/* @__PURE__ */ pa());
	},
	toUpperCase() {
		return this.check(/* @__PURE__ */ ma());
	},
	slugify() {
		return this.check(/* @__PURE__ */ ha());
	}
})), Go = /*@__PURE__*/ B("ZodString", (e, t) => {
	pn.init(e, t), Wo.init(e, t);
}, {
	email(e) {
		return this.check(/* @__PURE__ */ vi(Xo, e));
	},
	url(e) {
		return this.check(/* @__PURE__ */ wi($o, e));
	},
	jwt(e) {
		return this.check(/* @__PURE__ */ zi(ms, e));
	},
	emoji(e) {
		return this.check(/* @__PURE__ */ Ti(es, e));
	},
	guid(e) {
		return this.check(/* @__PURE__ */ yi(Zo, e));
	},
	uuid(e) {
		return this.check(/* @__PURE__ */ bi(Qo, e));
	},
	uuidv4(e) {
		return this.check(/* @__PURE__ */ xi(Qo, e));
	},
	uuidv6(e) {
		return this.check(/* @__PURE__ */ Si(Qo, e));
	},
	uuidv7(e) {
		return this.check(/* @__PURE__ */ Ci(Qo, e));
	},
	nanoid(e) {
		return this.check(/* @__PURE__ */ Ei(ts, e));
	},
	cuid(e) {
		return this.check(/* @__PURE__ */ Di(ns, e));
	},
	cuid2(e) {
		return this.check(/* @__PURE__ */ Oi(rs, e));
	},
	ulid(e) {
		return this.check(/* @__PURE__ */ ki(is, e));
	},
	base64(e) {
		return this.check(/* @__PURE__ */ Ii(ds, e));
	},
	base64url(e) {
		return this.check(/* @__PURE__ */ Li(fs, e));
	},
	xid(e) {
		return this.check(/* @__PURE__ */ Ai(as, e));
	},
	ksuid(e) {
		return this.check(/* @__PURE__ */ ji(os, e));
	},
	ipv4(e) {
		return this.check(/* @__PURE__ */ Mi(ss, e));
	},
	ipv6(e) {
		return this.check(/* @__PURE__ */ Ni(cs, e));
	},
	cidrv4(e) {
		return this.check(/* @__PURE__ */ Pi(ls, e));
	},
	cidrv6(e) {
		return this.check(/* @__PURE__ */ Fi(us, e));
	},
	e164(e) {
		return this.check(/* @__PURE__ */ Ri(ps, e));
	},
	datetime(e) {
		return this.check(/* @__PURE__ */ Bi(Ko, e));
	},
	date(e) {
		return this.check(/* @__PURE__ */ Vi(qo, e));
	},
	time(e) {
		return this.check(/* @__PURE__ */ Hi(Jo, e));
	},
	duration(e) {
		return this.check(/* @__PURE__ */ Ui(Yo, e));
	}
});
function G(e) {
	return /* @__PURE__ */ _i(Go, e);
}
var K = /*@__PURE__*/ B("ZodStringFormat", (e, t) => {
	H.init(e, t), Wo.init(e, t);
}), Ko = /*@__PURE__*/ B("ZodISODateTime", (e, t) => {
	Mn.init(e, t), K.init(e, t);
}), qo = /*@__PURE__*/ B("ZodISODate", (e, t) => {
	Nn.init(e, t), K.init(e, t);
}), Jo = /*@__PURE__*/ B("ZodISOTime", (e, t) => {
	Pn.init(e, t), K.init(e, t);
}), Yo = /*@__PURE__*/ B("ZodISODuration", (e, t) => {
	Fn.init(e, t), K.init(e, t);
}), Xo = /*@__PURE__*/ B("ZodEmail", (e, t) => {
	gn.init(e, t), K.init(e, t);
}), Zo = /*@__PURE__*/ B("ZodGUID", (e, t) => {
	mn.init(e, t), K.init(e, t);
}), Qo = /*@__PURE__*/ B("ZodUUID", (e, t) => {
	hn.init(e, t), K.init(e, t);
}), $o = /*@__PURE__*/ B("ZodURL", (e, t) => {
	wn.init(e, t), K.init(e, t);
}), es = /*@__PURE__*/ B("ZodEmoji", (e, t) => {
	Tn.init(e, t), K.init(e, t);
}), ts = /*@__PURE__*/ B("ZodNanoID", (e, t) => {
	En.init(e, t), K.init(e, t);
}), ns = /*@__PURE__*/ B("ZodCUID", (e, t) => {
	Dn.init(e, t), K.init(e, t);
}), rs = /*@__PURE__*/ B("ZodCUID2", (e, t) => {
	On.init(e, t), K.init(e, t);
}), is = /*@__PURE__*/ B("ZodULID", (e, t) => {
	kn.init(e, t), K.init(e, t);
}), as = /*@__PURE__*/ B("ZodXID", (e, t) => {
	An.init(e, t), K.init(e, t);
}), os = /*@__PURE__*/ B("ZodKSUID", (e, t) => {
	jn.init(e, t), K.init(e, t);
}), ss = /*@__PURE__*/ B("ZodIPv4", (e, t) => {
	In.init(e, t), K.init(e, t);
}), cs = /*@__PURE__*/ B("ZodIPv6", (e, t) => {
	zn.init(e, t), K.init(e, t);
}), ls = /*@__PURE__*/ B("ZodCIDRv4", (e, t) => {
	Bn.init(e, t), K.init(e, t);
}), us = /*@__PURE__*/ B("ZodCIDRv6", (e, t) => {
	Hn.init(e, t), K.init(e, t);
}), ds = /*@__PURE__*/ B("ZodBase64", (e, t) => {
	Gn.init(e, t), K.init(e, t);
}), fs = /*@__PURE__*/ B("ZodBase64URL", (e, t) => {
	Jn.init(e, t), K.init(e, t);
}), ps = /*@__PURE__*/ B("ZodE164", (e, t) => {
	Yn.init(e, t), K.init(e, t);
}), ms = /*@__PURE__*/ B("ZodJWT", (e, t) => {
	Zn.init(e, t), K.init(e, t);
}), hs = /*@__PURE__*/ B("ZodNumber", (e, t) => {
	Qn.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => Za(e, t, n, r), e.isFinite = !0;
}, /*@__PURE__*/ ve({
	minValue: (e) => {
		let { minimum: t, exclusiveMinimum: n } = Ka(e);
		return Math.max(t ?? -Infinity, n ?? -Infinity);
	},
	maxValue: (e) => {
		let { maximum: t, exclusiveMaximum: n } = Ka(e);
		return Math.min(t ?? Infinity, n ?? Infinity);
	},
	isInt: (e) => {
		let { isInt: t, multipleOf: n } = Ka(e);
		return !!t || !!n?.some(Number.isSafeInteger);
	},
	format: (e) => Ka(e).format ?? null
}, {
	gt(e, t) {
		return this.check(/* @__PURE__ */ Qi(e, t));
	},
	gte(e, t) {
		return this.check(/* @__PURE__ */ $i(e, t));
	},
	min(e, t) {
		return this.check(/* @__PURE__ */ $i(e, t));
	},
	lt(e, t) {
		return this.check(/* @__PURE__ */ Xi(e, t));
	},
	lte(e, t) {
		return this.check(/* @__PURE__ */ Zi(e, t));
	},
	max(e, t) {
		return this.check(/* @__PURE__ */ Zi(e, t));
	},
	int(e) {
		return this.check(_s(e));
	},
	safe(e) {
		return this.check(_s(e));
	},
	positive(e) {
		return this.check(/* @__PURE__ */ Qi(0, e));
	},
	nonnegative(e) {
		return this.check(/* @__PURE__ */ $i(0, e));
	},
	negative(e) {
		return this.check(/* @__PURE__ */ Xi(0, e));
	},
	nonpositive(e) {
		return this.check(/* @__PURE__ */ Zi(0, e));
	},
	multipleOf(e, t) {
		return this.check(/* @__PURE__ */ ea(e, t));
	},
	step(e, t) {
		return this.check(/* @__PURE__ */ ea(e, t));
	},
	finite() {
		return this;
	}
}));
function q(e) {
	return /* @__PURE__ */ Wi(hs, e);
}
var gs = /*@__PURE__*/ B("ZodNumberFormat", (e, t) => {
	$n.init(e, t), hs.init(e, t);
});
function _s(e) {
	return /* @__PURE__ */ Gi(gs, e);
}
var vs = /*@__PURE__*/ B("ZodBoolean", (e, t) => {
	er.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => Qa(e, t, n, r);
});
function ys(e) {
	return /* @__PURE__ */ Ki(vs, e);
}
var bs = /*@__PURE__*/ B("ZodNull", (e, t) => {
	tr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => $a(e, t, n, r);
});
function xs(e) {
	return /* @__PURE__ */ qi(bs, e);
}
var Ss = /*@__PURE__*/ B("ZodUnknown", (e, t) => {
	nr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (e, t, n) => void 0;
});
function Cs() {
	return /* @__PURE__ */ Ji(Ss);
}
var ws = /*@__PURE__*/ B("ZodNever", (e, t) => {
	rr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => eo(e, t, n, r);
});
function Ts(e) {
	return /* @__PURE__ */ Yi(ws, e);
}
var Es = /*@__PURE__*/ B("ZodArray", (e, t) => {
	Uo(), sr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => ao(e, t, n, r), e.element = t.element;
}, {
	min(e, t) {
		return this.check(/* @__PURE__ */ na(e, t));
	},
	nonempty(e) {
		return this.check(/* @__PURE__ */ na(1, e));
	},
	max(e, t) {
		return this.check(/* @__PURE__ */ ta(e, t));
	},
	length(e, t) {
		return this.check(/* @__PURE__ */ ra(e, t));
	},
	unwrap() {
		return this.element;
	}
});
function J(e, t) {
	return /* @__PURE__ */ ga(Es, e, t);
}
var Ds = /*@__PURE__*/ B("ZodObject", (e, t) => {
	Uo(), pr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => so(e, t, n, r), we(e, "shape", (e) => e._zod.def.shape, !1);
}, {
	keyof() {
		return X(Object.keys(this._zod.def.shape));
	},
	catchall(e) {
		return this.clone(_(this._zod.def, { catchall: e }));
	},
	passthrough() {
		return this.clone(_(this._zod.def, { catchall: Cs() }));
	},
	loose() {
		return this.clone(_(this._zod.def, { catchall: Cs() }));
	},
	strict() {
		return this.clone(_(this._zod.def, { catchall: Ts() }));
	},
	strip() {
		return this.clone(_(this._zod.def, { catchall: void 0 }));
	},
	extend(e) {
		return ne(this, e);
	},
	safeExtend(e) {
		return ie(this, e);
	},
	merge(e) {
		return P(this, e);
	},
	pick(e) {
		return ee(this, e);
	},
	omit(e) {
		return te(this, e);
	},
	partial(...e) {
		return F(Us, this, e[0]);
	},
	exactPartial(...e) {
		return F(Gs, this, e[0], "exactPartial");
	},
	required(...e) {
		return ae($s, this, e[0]);
	}
});
function Os(e, t) {
	return new Ds({
		type: "object",
		shape: e ?? {},
		...O(t)
	});
}
function Y(e, t) {
	return new Ds({
		type: "object",
		shape: e,
		catchall: Ts(),
		...O(t)
	});
}
var ks = /*@__PURE__*/ B("ZodUnion", (e, t) => {
	hr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => co(e, t, n, r), e.options = t.options;
});
function As(e, t) {
	return new ks({
		type: "union",
		options: e,
		...O(t)
	});
}
var js = /*@__PURE__*/ B("ZodDiscriminatedUnion", (e, t) => {
	ks.init(e, t), _r.init(e, t);
});
function Ms(e, t, n) {
	return new js({
		type: "union",
		options: t,
		discriminator: e,
		...O(n)
	});
}
var Ns = /*@__PURE__*/ B("ZodIntersection", (e, t) => {
	vr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => lo(e, t, n, r);
});
function Ps(e, t) {
	return new Ns({
		type: "intersection",
		left: e,
		right: t
	});
}
var Fs = /*@__PURE__*/ B("ZodTuple", (e, t) => {
	Uo(), xr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => uo(e, t, n, r);
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
			items: e.items.map((e) => new Us({
				type: "optional",
				innerType: e
			}))
		});
	}
});
function Is(e, t, n) {
	let r = t instanceof V;
	return new Fs({
		type: "tuple",
		items: e,
		rest: r ? t : null,
		...O(r ? n : t)
	});
}
var Ls = /*@__PURE__*/ B("ZodRecord", (e, t) => {
	Uo(), Tr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => ho(e, t, n, r), e.keyType = t.keyType, e.valueType = t.valueType;
});
function Rs(e, t, n) {
	return !t || !t._zod ? new Ls({
		type: "record",
		keyType: G(),
		valueType: e,
		...O(t)
	}) : new Ls({
		type: "record",
		keyType: e,
		valueType: t,
		...O(n)
	});
}
var zs = /*@__PURE__*/ B("ZodEnum", (e, t) => {
	Er.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => to(e, t, n, r), e.enum = t.entries, e.options = [...e._zod.values];
	let n = new Set(Object.keys(t.entries));
	e.extract = (e, r) => {
		let i = {};
		for (let r of e) if (n.has(r)) i[r] = t.entries[r];
		else throw Error(`Key ${r} not found in enum`);
		return new zs({
			...t,
			checks: [],
			...O(r),
			entries: i
		});
	}, e.exclude = (e, r) => {
		let i = { ...t.entries };
		for (let t of e) if (n.has(t)) delete i[t];
		else throw Error(`Key ${t} not found in enum`);
		return new zs({
			...t,
			checks: [],
			...O(r),
			entries: i
		});
	};
});
function X(e, t) {
	return new zs({
		type: "enum",
		entries: Array.isArray(e) ? Object.fromEntries(e.map((e) => [e, e])) : e,
		...O(t)
	});
}
var Bs = /*@__PURE__*/ B("ZodLiteral", (e, t) => {
	Dr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => no(e, t, n, r), e.values = new Set(t.values), Object.defineProperty(e, "value", { get() {
		if (t.values.length > 1) throw Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return t.values[0];
	} });
});
function Z(e, t) {
	return new Bs({
		type: "literal",
		values: Array.isArray(e) ? e : [e],
		...O(t)
	});
}
var Vs = /*@__PURE__*/ B("ZodTransform", (e, t) => {
	Uo(), Or.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => io(e, t, n, r), e._zod.parse = (n, r) => {
		if (r.direction === "backward") throw new Me(e.constructor.name);
		n.addIssue = (r) => {
			if (typeof r == "string") n.issues.push(me(r, n.value, t));
			else {
				let t = r;
				t.fatal && (t.continue = !1), t.code ??= "custom", "input" in t || (t.input = n.value), t.inst ??= e, n.issues.push(me(t));
			}
		};
		let i = t.transform(n.value, n);
		return i instanceof Promise ? i.then((e) => (n.value = e, n)) : (n.value = i, n);
	};
});
function Hs(e) {
	return new Vs({
		type: "transform",
		transform: e
	});
}
var Us = /*@__PURE__*/ B("ZodOptional", (e, t) => {
	Ar.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => To(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Ws(e) {
	return new Us({
		type: "optional",
		innerType: e
	});
}
var Gs = /*@__PURE__*/ B("ZodExactOptional", (e, t) => {
	jr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => To(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Ks(e) {
	return new Gs({
		type: "optional",
		innerType: e
	});
}
var qs = /*@__PURE__*/ B("ZodNullable", (e, t) => {
	Mr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => go(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Js(e) {
	return new qs({
		type: "nullable",
		innerType: e
	});
}
var Ys = /*@__PURE__*/ B("ZodDefault", (e, t) => {
	Nr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => bo(e, t, n, r), e.unwrap = () => e._zod.def.innerType, e.removeDefault = e.unwrap;
});
function Xs(e, t) {
	return new Ys({
		type: "default",
		innerType: e,
		get defaultValue() {
			return typeof t == "function" ? t() : w(t);
		}
	});
}
var Zs = /*@__PURE__*/ B("ZodPrefault", (e, t) => {
	Fr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => xo(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Qs(e, t) {
	return new Zs({
		type: "prefault",
		innerType: e,
		get defaultValue() {
			return typeof t == "function" ? t() : w(t);
		}
	});
}
var $s = /*@__PURE__*/ B("ZodNonOptional", (e, t) => {
	Ir.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => _o(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function ec(e, t) {
	return new $s({
		type: "nonoptional",
		innerType: e,
		...O(t)
	});
}
var tc = /*@__PURE__*/ B("ZodCatch", (e, t) => {
	zr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => So(e, t, n, r), e.unwrap = () => e._zod.def.innerType, e.removeCatch = e.unwrap;
});
function nc(e, t) {
	return new tc({
		type: "catch",
		innerType: e,
		catchValue: typeof t == "function" ? t : Ee(t)
	});
}
var rc = /*@__PURE__*/ B("ZodPipe", (e, t) => {
	Br.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => Co(e, t, n, r), e.in = t.in, e.out = t.out;
});
function ic(e, t) {
	return new rc({
		type: "pipe",
		in: e,
		out: t
	});
}
var ac = /*@__PURE__*/ B("ZodReadonly", (e, t) => {
	Hr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => wo(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function oc(e) {
	return new ac({
		type: "readonly",
		innerType: e
	});
}
var sc = /*@__PURE__*/ B("ZodLazy", (e, t) => {
	Wr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => Eo(e, t, n, r), e.unwrap = () => e._zod.def.getter();
});
function cc(e) {
	return new sc({
		type: "lazy",
		getter: e
	});
}
var lc = /*@__PURE__*/ B("ZodCustom", (e, t) => {
	Gr.init(e, t), W.init(e, t), e._zod.processJSONSchema = (t, n, r) => ro(e, t, n, r);
});
function uc(e, t = {}) {
	return /* @__PURE__ */ _a(lc, e, t);
}
function dc(e, t) {
	return /* @__PURE__ */ va(e, t);
}
//#endregion
//#region ../../node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/_u64.js
var fc = (e) => e / 2 ** 32 | 0, pc = (e) => e >>> 0;
function mc(e, t, n, r) {
	let i = fc(n), a = pc(n);
	e.setUint32(t, r ? a : i, r), e.setUint32(t + 4, r ? i : a, r);
}
//#endregion
//#region ../../node_modules/.pnpm/@noble+hashes@2.4.0/node_modules/@noble/hashes/utils.js
function hc(e) {
	return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in e && e.BYTES_PER_ELEMENT === 1;
}
var gc = (e) => e ? `"${e}" ` : "";
function _c(e, t = "") {
	if (typeof e != "number") throw TypeError(gc(t) + "expected number, got " + typeof e);
	if (!Number.isSafeInteger(e) || e < 0) throw RangeError(gc(t) + "expected integer >= 0, got " + e);
	return e;
}
function vc(e, t, n = "") {
	if (hc(e) && (t === void 0 || e.length === t)) return e;
	t !== void 0 && _c(t, "length");
	let r = hc(e), i = t === void 0 ? "" : ` of length ${t}`, a = r ? `length=${e.length}` : `type=${typeof e}`, o = gc(n) + "expected Uint8Array" + i + ", got " + a;
	throw r ? RangeError(o) : TypeError(o);
}
var yc = (e, t) => {
	if (typeof e != "object" || !e || Array.isArray(e)) throw TypeError((t === "object" ? "" : `"${t}" `) + "expected object, got type=" + typeof e);
}, bc = (e, t) => {
	yc(e, t);
	let n = Object.getPrototypeOf(e);
	if (n !== Object.prototype && n !== null) throw TypeError(`"${t}" expected plain object`);
	if (Object.hasOwn(e, "__proto__")) throw TypeError(`"${t}.__proto__" is not allowed`);
};
function xc(e, t = !0) {
	if (e.destroyed) throw Error("hash was destroyed");
	if (t && e.finished) throw Error("digest() was already called");
}
function Sc(e, t) {
	vc(e, void 0, "output");
	let n = t.outputLen;
	if (!(e.length >= n)) throw RangeError("\"output\" expected length >= " + n);
}
function Cc(...e) {
	for (let t = 0; t < e.length; t++) e[t].fill(0);
}
function wc(e) {
	return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Tc(e, t) {
	return e << 32 - t | e >>> t;
}
var Ec = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Dc = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Oc(e) {
	if (vc(e), Ec) return e.toHex();
	let t = "";
	for (let n = 0; n < e.length; n++) t += Dc[e[n]];
	return t;
}
function kc(e, t, n = "opts") {
	return bc(e, "defaults"), t !== void 0 && bc(t, n), Object.assign(Object.create(null), e, t);
}
function Ac(e, t = {}) {
	if (typeof e != "function") throw TypeError("\"hashCons\" expected function, got type=" + typeof e);
	t = kc({}, t, "info");
	let n = (t, n) => e(n).update(t).digest(), r = e(void 0);
	return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.canXOF = r.canXOF, n.create = (t) => e(t), Object.assign(n, t), Object.freeze(n);
}
var jc = (e) => ({ oid: Uint8Array.from([
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
function Mc(e, t, n) {
	return e & t ^ ~e & n;
}
function Nc(e, t, n) {
	return e & t ^ e & n ^ t & n;
}
var Pc = class {
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
		this.blockLen = e, this.outputLen = t, this.padOffset = n, this.isLE = r, this.buffer = new Uint8Array(e), this.view = wc(this.buffer);
	}
	update(e) {
		xc(this), vc(e);
		let { view: t, buffer: n, blockLen: r } = this, i = e.length, a = !1;
		for (let o = 0; o < i;) {
			let s = Math.min(r - this.pos, i - o);
			if (s === r) {
				let t = wc(e);
				for (; r <= i - o; o += r) this.process(t, o);
				a = !0;
			} else n.set(o === 0 && s === i ? e : e.subarray(o, o + s), this.pos), this.pos += s, o += s, this.pos === r && (this.process(t, 0), this.pos = 0, a = !0);
		}
		return this.length += e.length, a && this.roundClean(), this;
	}
	digestInto(e) {
		xc(this), Sc(e, this), this.finished = !0;
		let { buffer: t, view: n, blockLen: r, isLE: i } = this, { pos: a } = this;
		t[a++] = 128, t.fill(0, a), this.padOffset > r - a && (this.process(n, 0), t.fill(0)), mc(n, r - 8, this.length * 8, i), this.process(n, 0), this.roundClean();
		let o = e === t ? n : wc(e), s = this.outputLen, c = s / 4, l = this.get();
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
}, Fc = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]), Ic = /* @__PURE__ */ Uint32Array.from([
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
]), Lc = /* @__PURE__ */ new Uint32Array(64), Rc = class extends Pc {
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
		for (let n = 0; n < 16; n++, t += 4) Lc[n] = e.getUint32(t, !1);
		for (let e = 16; e < 64; e++) {
			let t = Lc[e - 15], n = Lc[e - 2], r = Tc(t, 7) ^ Tc(t, 18) ^ t >>> 3, i = Tc(n, 17) ^ Tc(n, 19) ^ n >>> 10;
			Lc[e] = i + Lc[e - 7] + r + Lc[e - 16] | 0;
		}
		let { A: n, B: r, C: i, D: a, E: o, F: s, G: c, H: l } = this;
		for (let e = 0; e < 64; e++) {
			let t = Tc(o, 6) ^ Tc(o, 11) ^ Tc(o, 25), u = l + t + Mc(o, s, c) + Ic[e] + Lc[e] | 0, d = (Tc(n, 2) ^ Tc(n, 13) ^ Tc(n, 22)) + Nc(n, r, i) | 0;
			l = c, c = s, s = o, o = a + u | 0, a = i, i = r, r = n, n = u + d | 0;
		}
		n = n + this.A | 0, r = r + this.B | 0, i = i + this.C | 0, a = a + this.D | 0, o = o + this.E | 0, s = s + this.F | 0, c = c + this.G | 0, l = l + this.H | 0, this.set(n, r, i, a, o, s, c, l);
	}
	roundClean() {
		Cc(Lc);
	}
	destroy() {
		this.destroyed = !0, this.set(0, 0, 0, 0, 0, 0, 0, 0), Cc(this.buffer);
	}
}, zc = class extends Rc {
	constructor() {
		super(32, Fc);
	}
}, Bc = /* @__PURE__ */ Ac(() => new zc(), /* @__PURE__ */ jc(1)), Vc = 4e6, Hc = Math.ceil(Vc / 3) * 4;
function Uc(e) {
	if (!(e instanceof Uint8Array) || e.byteLength < 1 || e.byteLength > 4e6) throw Error("Recurso vazio ou maior que 4 MB.");
}
//#endregion
//#region ../../packages/edi-motion/src/assets/cmap.ts
var Wc = class extends Error {
	constructor(e = "cmap Unicode fora do perfil verificável (formatos 4/12 e variações 14).") {
		super(e);
	}
};
function Gc(e) {
	return Number.isInteger(e) && e >= 0 && e <= 1114111 && (e < 55296 || e > 57343);
}
function Kc(e, t) {
	let n = 0, r = e.length - 1;
	for (; n <= r;) {
		let i = Math.floor((n + r) / 2), a = e[i];
		if (!a) throw Error("Índice cmap inconsistente.");
		if (t < a.start) r = i - 1;
		else if (t > a.end) n = i + 1;
		else return a;
	}
}
function qc(e, t) {
	if (Uc(e), !Number.isInteger(t) || t < 1 || t > 65535 || e.length < 4) throw Error("Cabeçalho cmap/glifos inválido.");
	let n = new Uint8Array(e), r = new DataView(n.buffer), i = r.getUint16(2), a = 4 + i * 8;
	if (r.getUint16(0) !== 0 || !i || i > 128 || a > n.length) throw Error("Diretório cmap inválido/excessivo.");
	function o(e, t, r) {
		if (e < a || t < r || e + t > n.length) throw Error("Subtabela cmap truncada/fora dos limites.");
	}
	function s(e) {
		o(e, n.length - e, 16);
		let i = r.getUint16(e + 2), a = r.getUint16(e + 6), s = a / 2;
		if (o(e, i, 16), !s || a % 2 || i % 2 || 16 + s * 8 > i || r.getUint16(e + 4) !== 0) throw Error("Segmentos cmap4 inválidos.");
		let c = 2 ** Math.floor(Math.log2(s));
		if (r.getUint16(e + 8) !== c * 2 || r.getUint16(e + 10) !== Math.log2(c) || r.getUint16(e + 12) !== a - c * 2 || r.getUint16(e + 14 + s * 2) !== 0) throw Error("Índice cmap4 inconsistente.");
		let l = [], u = -1;
		for (let n = 0; n < s; n++) {
			let a = r.getUint16(e + 14 + n * 2), o = r.getUint16(e + 16 + s * 2 + n * 2), c = r.getInt16(e + 16 + s * 4 + n * 2), d = e + 16 + s * 6 + n * 2, f = r.getUint16(d), p = f ? d + f : null;
			if (o > a || o <= u || f % 2 || p !== null && (p < e + 16 + s * 8 || p + (a - o) * 2 + 2 > e + i)) throw Error("Intervalo/referência cmap4 inválido.");
			l.push({
				start: o,
				end: a,
				delta: c,
				position: p
			}), u = a;
			for (let e = o; e <= a; e++) {
				let n = p === null ? e : r.getUint16(p + (e - o) * 2);
				if ((p === null || n ? n + c & 65535 : 0) >= t) throw Error("cmap4 referencia glifo inexistente.");
			}
		}
		let d = l.at(-1);
		if (d?.start !== 65535 || d.end !== 65535) throw Error("cmap4 sem segmento terminador.");
		return {
			format: 4,
			ranges: l,
			glyph(e) {
				if (e > 65535) return 0;
				let t = Kc(l, e);
				if (!t) return 0;
				let n = t.position === null ? e : r.getUint16(t.position + (e - t.start) * 2);
				return t.position === null || n ? n + t.delta & 65535 : 0;
			}
		};
	}
	function c(e) {
		o(e, n.length - e, 16);
		let i = r.getUint32(e + 4), a = r.getUint32(e + 12);
		if (o(e, i, 16), r.getUint16(e + 2) !== 0 || r.getUint32(e + 8) !== 0 || a > 1e5 || i !== 16 + a * 12) throw Error("Cabeçalho cmap12 inválido/excessivo.");
		let s = [], c = -1;
		for (let n = 0; n < a; n++) {
			let i = e + 16 + n * 12, a = r.getUint32(i), o = r.getUint32(i + 4), l = r.getUint32(i + 8);
			if (!Gc(a) || !Gc(o) || a > o || a <= c || a <= 57343 && o >= 55296 || l + o - a >= t) throw Error("Intervalo/glifo cmap12 inválido.");
			s.push({
				start: a,
				end: o,
				glyph: l
			}), c = o;
		}
		return {
			format: 12,
			ranges: s,
			glyph(e) {
				let t = Kc(s, e);
				return t ? t.glyph + e - t.start : 0;
			}
		};
	}
	function l(e) {
		o(e, n.length - e, 10);
		let i = r.getUint32(e + 2), a = r.getUint32(e + 6), s = e + i;
		if (o(e, i, 10), a > 256 || 10 + a * 11 > i) throw Error("cmap14 excede seletores/limites.");
		let c = (e) => r.getUint8(e) * 65536 + r.getUint16(e + 1), l = /* @__PURE__ */ new Map(), u = -1, d = 0;
		function f(t, n) {
			let r = e + t;
			if (t < 10 + a * 11 || r + n > s) throw Error("Referência cmap14 fora dos limites.");
			return r;
		}
		for (let n = 0; n < a; n++) {
			let i = e + 10 + n * 11, a = c(i), o = r.getUint32(i + 3), s = r.getUint32(i + 7);
			if (!Gc(a) || a <= u || !/\p{Variation_Selector}/u.test(String.fromCodePoint(a))) throw Error("Seletor cmap14 inválido/repetido.");
			u = a;
			let p = [], m = [];
			if (o) {
				let e = f(o, 4), t = r.getUint32(e);
				if (d += t, d > 1e5) throw Error("cmap14 excede orçamento de mapeamentos.");
				f(o, 4 + t * 4);
				let n = -1;
				for (let i = 0; i < t; i++) {
					let t = c(e + 4 + i * 4), a = t + r.getUint8(e + 7 + i * 4);
					if (!Gc(t) || !Gc(a) || t <= n || t <= 57343 && a >= 55296) throw Error("Intervalo cmap14 inválido.");
					p.push({
						start: t,
						end: a
					}), n = a;
				}
			}
			if (s) {
				let e = f(s, 4), n = r.getUint32(e);
				if (d += n, d > 1e5) throw Error("cmap14 excede orçamento de mapeamentos.");
				f(s, 4 + n * 5);
				let i = -1;
				for (let a = 0; a < n; a++) {
					let n = c(e + 4 + a * 5), o = r.getUint16(e + 7 + a * 5);
					if (!Gc(n) || n <= i || o >= t || Kc(p, n)) throw Error("Glifo cmap14 inválido/ambíguo.");
					m.push({
						start: n,
						end: n,
						glyph: o
					}), i = n;
				}
			}
			l.set(a, {
				defaults: p,
				glyphs: m
			});
		}
		return l;
	}
	let u = /* @__PURE__ */ new Map(), d, f = -1, p = -1, m;
	for (let e = 0; e < i; e++) {
		let t = 4 + e * 8, i = r.getUint16(t), a = r.getUint16(t + 2), h = i * 65536 + a, g = r.getUint32(t + 4), _ = i === 0 || i === 3 && (a === 1 || a === 10);
		if (h < p || h === p && _) throw Error("Registros cmap duplicados/fora de ordem.");
		p = h, o(g, n.length - g, 2);
		let v = r.getUint16(g);
		if (i === 0 && a === 5) {
			if (v !== 14) throw Error("Variações Unicode requerem cmap14.");
			m = l(g);
			continue;
		}
		if (!_) continue;
		if (v !== 4 && v !== 12) throw new Wc();
		if (i === 3 && (a === 1 && v !== 4 || a === 10 && v !== 12) || i === 0 && !(a <= 3 && v === 4 || a === 4 && v === 12)) throw Error("Registro Unicode não corresponde ao formato cmap.");
		let y = u.get(g);
		y || (y = v === 4 ? s(g) : c(g), u.set(g, y));
		let b = (v === 12 ? 100 : 0) + (i === 3 ? 10 : 0);
		b > f && (d = y, f = b);
	}
	if (!d) throw new Wc();
	let h = d, g = 2e6;
	function _(e, t) {
		let n = 1 + Math.ceil(Math.log2(e.ranges.length + 1)) + Math.ceil(Math.log2(t.ranges.length + 1));
		for (let r of e.ranges) for (let i = r.start; i <= r.end; i++) {
			if (g -= n, g < 0) throw new Wc("cmap excede orçamento de compatibilidade entre plataformas.");
			let r = e.glyph(i);
			if (r && r !== t.glyph(i)) throw new Wc("Subtabelas Unicode do mesmo formato têm mapeamentos ambíguos entre plataformas.");
		}
	}
	for (let e of u.values()) e !== h && e.format === h.format && (_(e, h), _(h, e));
	return Object.freeze({
		format: h.format,
		glyph(e, t) {
			if (!Gc(e) || t !== void 0 && !Gc(t)) throw Error("Consulta cmap requer valores escalares Unicode.");
			if (t === void 0) return h.glyph(e);
			let n = m?.get(t);
			return n ? Kc(n.glyphs, e)?.glyph ?? (Kc(n.defaults, e) ? h.glyph(e) : 0) : 0;
		}
	});
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
var Yc = class extends Error {
	constructor(e) {
		super(e), this.name = "UnsupportedLayoutTableError";
	}
};
function Xc(e, t) {
	let n = /* @__PURE__ */ new Map();
	if (!e) return n;
	let r = () => {
		throw new Yc(`Tabela ${t} fora do perfil verificável.`);
	}, i = new DataView(e.buffer, e.byteOffset, e.byteLength), a = (t) => t + 2 <= e.length ? i.getUint16(t) : r(), o = (t) => {
		t + 4 > e.length && r();
		let n = String.fromCharCode(...e.subarray(t, t + 4));
		return /^[\x20-\x7e]{4}$/.test(n) ? n : r();
	};
	(e.length < 10 || a(0) !== 1 || a(2) > 1) && r();
	let s = a(4), c = a(6), l = a(s), u = a(c);
	(!s || !c || l > 512 || u > 4096) && r();
	let d = Array.from({ length: u }, (e, t) => o(c + 2 + t * 6)), f = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map(), m = 262144, h = (e, t) => {
		let n = f.get(e);
		if (!n) {
			let t = a(e + 2), i = a(e + 4);
			m -= i + 1, (i > 4096 || m < 0) && r(), n = [...t === 65535 ? [] : [t], ...Array.from({ length: i }, (t, n) => a(e + 6 + n * 2))].map((e) => d[e] ?? r()), f.set(e, n);
		}
		m -= n.length, m < 0 && r();
		for (let e of n) t.add(e);
	};
	for (let e = 0; e < l; e++) {
		let t = s + 2 + e * 6, i = o(t), c = s + a(t + 4);
		c === s && r();
		let l = p.get(c);
		if (l) {
			n.set(i, l);
			continue;
		}
		let u = a(c), d = a(c + 2), f = /* @__PURE__ */ new Set();
		if (d > 512 && r(), u) h(c + u, f);
		else {
			let e = /* @__PURE__ */ new Set();
			for (let t = 0; t < d; t++) {
				let n = a(c + 4 + t * 6 + 4);
				n || r(), !e.has(n) && (e.add(n), h(c + n, f));
			}
		}
		p.set(c, f), n.set(i, f);
	}
	return n;
}
function Zc(e, t, n, r = !1) {
	let i = 0;
	for (let a = 0; a < n; a += 4) {
		let o = 0;
		for (let i = 0; i < 4; i++) o = o << 8 | (a + i < n && !(r && a + i >= 8 && a + i < 12) ? e[t + a + i] ?? 0 : 0);
		i = i + (o >>> 0) >>> 0;
	}
	return i;
}
function Qc(e) {
	if (Uc(e), e.length < 12) throw Error("Fonte OpenType truncada.");
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
		if (Zc(e, o, u, i === "head") !== d) throw Error(`Checksum inválido na tabela ${i}.`);
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
	if (Zc(e, 0, e.length) !== 2981146554) throw Error("Checksum global OpenType inválido.");
	let f = (e, t) => {
		let n = s.get(e);
		if (!n || n.length < t) throw Error(`Fonte sem tabela ${e} válida.`);
		return n;
	}, p = f("head", 54), m = f("maxp", 6), h = f("OS/2", 64), g = f("hhea", 36), _ = f("cmap", 4), v = f("name", 6);
	if (f("post", 32), t.getUint32(p.offset + 12) !== 1594834165 || t.getUint32(p.offset) !== 65536) throw Error("Cabeçalho OpenType inválido.");
	let y = t.getUint16(p.offset + 18), b = t.getUint16(m.offset + 4), x = t.getUint16(g.offset + 34), S = t.getUint16(h.offset + 8), C = t.getUint16(h.offset + 4), w = t.getUint16(h.offset);
	if (y < 16 || y > 16384 || !b || !x || x > b || C < 1 || C > 1e3 || w > 5) throw Error("Métricas/cabeçalho de fonte inválidos.");
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
	let T = t.getUint16(v.offset + 2), E = t.getUint16(v.offset + 4), D = t.getUint16(v.offset);
	if (T > 1e3 || v.length < 6 + T * 12 || E < 6 + T * 12 || E > v.length || D > 1) throw Error("Diretório de nomes da fonte inválido.");
	let O = /* @__PURE__ */ new Map();
	for (let n = 0; n < T; n++) {
		let r = v.offset + 6 + n * 12, i = t.getUint16(r), a = t.getUint16(r + 2), o = t.getUint16(r + 4), s = t.getUint16(r + 6), c = t.getUint16(r + 8), l = t.getUint16(r + 10);
		if (E + l + c > v.length) throw Error("Nome de fonte fora dos limites.");
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
		let u = new TextDecoder("utf-16be", { fatal: !0 }).decode(e.subarray(v.offset + E + l, v.offset + E + l + c)).trim(), d = (i === 3 ? 2 : 0) + +(o === 1033);
		u && d > (O.get(s)?.priority ?? -1) && O.set(s, {
			text: u,
			priority: d
		});
	}
	let k = O.get(16)?.text ?? O.get(1)?.text;
	if (!k || !Jc(k) || k.length > 120 || [...k].some((e) => e.charCodeAt(0) < 32 || e.charCodeAt(0) === 127)) throw Error("Fonte sem família Unicode válida no perfil.");
	let A = [O.get(0)?.text, O.get(13)?.text].filter(Boolean).join("\n\n");
	if (A.length > 16e3 || !Jc(A)) throw Error("Avisos de fonte inválidos ou excessivos.");
	return {
		info: {
			family: k,
			notice: A,
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
function $c(e) {
	return Qc(e).info;
}
function el(e) {
	let { layout: t } = Qc(e);
	return {
		substitution: Xc(t.GSUB, "GSUB"),
		positioning: Xc(t.GPOS, "GPOS")
	};
}
function tl(e) {
	let { info: t, characterMap: n } = Qc(e);
	return qc(n, t.glyphs);
}
//#endregion
//#region ../../node_modules/.pnpm/fflate@0.8.3/node_modules/fflate/esm/browser.js
var nl = Uint8Array, rl = Uint16Array, il = Int32Array, al = new nl([
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
]), ol = new nl([
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
]), sl = new nl([
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
]), cl = function(e, t) {
	for (var n = new rl(31), r = 0; r < 31; ++r) n[r] = t += 1 << e[r - 1];
	for (var i = new il(n[30]), r = 1; r < 30; ++r) for (var a = n[r]; a < n[r + 1]; ++a) i[a] = a - n[r] << 5 | r;
	return {
		b: n,
		r: i
	};
}, ll = cl(al, 2), ul = ll.b, dl = ll.r;
ul[28] = 258, dl[258] = 28;
var fl = cl(ol, 0), pl = fl.b;
fl.r;
for (var ml = new rl(32768), hl = 0; hl < 32768; ++hl) {
	var gl = (hl & 43690) >> 1 | (hl & 21845) << 1;
	gl = (gl & 52428) >> 2 | (gl & 13107) << 2, gl = (gl & 61680) >> 4 | (gl & 3855) << 4, ml[hl] = ((gl & 65280) >> 8 | (gl & 255) << 8) >> 1;
}
for (var _l = (function(e, t, n) {
	for (var r = e.length, i = 0, a = new rl(t); i < r; ++i) e[i] && ++a[e[i] - 1];
	var o = new rl(t);
	for (i = 1; i < t; ++i) o[i] = o[i - 1] + a[i - 1] << 1;
	var s;
	if (n) {
		s = new rl(1 << t);
		var c = 15 - t;
		for (i = 0; i < r; ++i) if (e[i]) for (var l = i << 4 | e[i], u = t - e[i], d = o[e[i] - 1]++ << u, f = d | (1 << u) - 1; d <= f; ++d) s[ml[d] >> c] = l;
	} else for (s = new rl(r), i = 0; i < r; ++i) e[i] && (s[i] = ml[o[e[i] - 1]++] >> 15 - e[i]);
	return s;
}), vl = new nl(288), hl = 0; hl < 144; ++hl) vl[hl] = 8;
for (var hl = 144; hl < 256; ++hl) vl[hl] = 9;
for (var hl = 256; hl < 280; ++hl) vl[hl] = 7;
for (var hl = 280; hl < 288; ++hl) vl[hl] = 8;
for (var yl = new nl(32), hl = 0; hl < 32; ++hl) yl[hl] = 5;
var bl = /*#__PURE__*/ _l(vl, 9, 1), xl = /*#__PURE__*/ _l(yl, 5, 1), Sl = function(e) {
	for (var t = e[0], n = 1; n < e.length; ++n) e[n] > t && (t = e[n]);
	return t;
}, Cl = function(e, t, n) {
	var r = t / 8 | 0;
	return (e[r] | e[r + 1] << 8) >> (t & 7) & n;
}, wl = function(e, t) {
	var n = t / 8 | 0;
	return (e[n] | e[n + 1] << 8 | e[n + 2] << 16) >> (t & 7);
}, Tl = function(e) {
	return (e + 7) / 8 | 0;
}, El = function(e, t, n) {
	return (t == null || t < 0) && (t = 0), (n == null || n > e.length) && (n = e.length), new nl(e.subarray(t, n));
}, Dl = [
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
], Ol = function(e, t, n) {
	var r = Error(t || Dl[e]);
	if (r.code = e, Error.captureStackTrace && Error.captureStackTrace(r, Ol), !n) throw r;
	return r;
}, kl = function(e, t, n, r) {
	var i = e.length, a = r ? r.length : 0;
	if (!i || t.f && !t.l) return n || new nl(0);
	var o = !n, s = o || t.i != 2, c = t.i;
	o && (n = new nl(i * 3));
	var l = function(e) {
		var t = n.length;
		if (e > t) {
			var r = new nl(Math.max(t * 2, e));
			r.set(n), n = r;
		}
	}, u = t.f || 0, d = t.p || 0, f = t.b || 0, p = t.l, m = t.d, h = t.m, g = t.n, _ = i * 8;
	do {
		if (!p) {
			u = Cl(e, d, 1);
			var v = Cl(e, d + 1, 3);
			if (d += 3, !v) {
				var y = Tl(d) + 4, b = e[y - 4] | e[y - 3] << 8, x = y + b;
				if (x > i) {
					c && Ol(0);
					break;
				}
				s && l(f + b), n.set(e.subarray(y, x), f), t.b = f += b, t.p = d = x * 8, t.f = u;
				continue;
			}
			if (v == 1) p = bl, m = xl, h = 9, g = 5;
			else if (v == 2) {
				var S = Cl(e, d, 31) + 257, C = Cl(e, d + 10, 15) + 4, w = S + Cl(e, d + 5, 31) + 1;
				d += 14;
				for (var T = new nl(w), E = new nl(19), D = 0; D < C; ++D) E[sl[D]] = Cl(e, d + D * 3, 7);
				d += C * 3;
				for (var O = Sl(E), k = (1 << O) - 1, A = _l(E, O, 1), D = 0; D < w;) {
					var j = A[Cl(e, d, k)];
					d += j & 15;
					var y = j >> 4;
					if (y < 16) T[D++] = y;
					else {
						var M = 0, ee = 0;
						for (y == 16 ? (ee = 3 + Cl(e, d, 3), d += 2, M = T[D - 1]) : y == 17 ? (ee = 3 + Cl(e, d, 7), d += 3) : y == 18 && (ee = 11 + Cl(e, d, 127), d += 7); ee--;) T[D++] = M;
					}
				}
				var N = T.subarray(0, S), te = T.subarray(S);
				h = Sl(N), g = Sl(te), p = _l(N, h, 1), m = _l(te, g, 1);
			} else Ol(1);
			if (d > _) {
				c && Ol(0);
				break;
			}
		}
		s && l(f + 131072);
		for (var ne = (1 << h) - 1, re = (1 << g) - 1, ie = d;; ie = d) {
			var M = p[wl(e, d) & ne], P = M >> 4;
			if (d += M & 15, d > _) {
				c && Ol(0);
				break;
			}
			if (M || Ol(2), P < 256) n[f++] = P;
			else if (P == 256) {
				ie = d, p = null;
				break;
			} else {
				var F = P - 254;
				if (P > 264) {
					var D = P - 257, ae = al[D];
					F = Cl(e, d, (1 << ae) - 1) + ul[D], d += ae;
				}
				var I = m[wl(e, d) & re], oe = I >> 4;
				I || Ol(3), d += I & 15;
				var te = pl[oe];
				if (oe > 3) {
					var ae = ol[oe];
					te += wl(e, d) & (1 << ae) - 1, d += ae;
				}
				if (d > _) {
					c && Ol(0);
					break;
				}
				s && l(f + 131072);
				var L = f + F;
				if (f < te) {
					var se = a - te, ce = Math.min(te, L);
					for (se + f < 0 && Ol(3); f < ce; ++f) n[f] = r[se + f];
				}
				for (; f < L; ++f) n[f] = n[f - te];
			}
		}
		t.l = p, t.p = ie, t.b = f, t.f = u, p && (u = 1, t.m = h, t.d = m, t.n = g);
	} while (!u);
	return f != n.length && o ? El(n, 0, f) : n.subarray(0, f);
}, Al = /*#__PURE__*/ new nl(0), jl = function(e, t) {
	return ((e[0] & 15) != 8 || e[0] >> 4 > 7 || (e[0] << 8 | e[1]) % 31) && Ol(6, "invalid zlib data"), (e[1] >> 5 & 1) == +!t && Ol(6, "invalid zlib data: " + (e[1] & 32 ? "need" : "unexpected") + " dictionary"), (e[1] >> 3 & 4) + 2;
}, Ml = /* @__PURE__ */ function() {
	function e(e, t) {
		typeof e == "function" && (t = e, e = {}), this.ondata = t;
		var n = e && e.dictionary && e.dictionary.subarray(-32768);
		this.s = {
			i: 0,
			b: n ? n.length : 0
		}, this.o = new nl(32768), this.p = new nl(0), n && this.o.set(n);
	}
	return e.prototype.e = function(e) {
		if (this.ondata || Ol(5), this.d && Ol(4), !this.p.length) this.p = e;
		else if (e.length) {
			var t = new nl(this.p.length + e.length);
			t.set(this.p), t.set(e, this.p.length), this.p = t;
		}
	}, e.prototype.c = function(e) {
		this.s.i = +(this.d = e || !1);
		var t = this.s.b, n = kl(this.p, this.s, this.o);
		this.ondata(El(n, t, this.s.b), this.d), this.o = El(n, this.s.b - 32768), this.s.b = this.o.length, this.p = El(this.p, this.s.p / 8 | 0), this.s.p &= 7;
	}, e.prototype.push = function(e, t) {
		this.e(e), this.c(t);
	}, e;
}(), Nl = /* @__PURE__ */ function() {
	function e(e, t) {
		Ml.call(this, e, t), this.v = e && e.dictionary ? 2 : 1;
	}
	return e.prototype.push = function(e, t) {
		if (Ml.prototype.e.call(this, e), this.v) {
			if (this.p.length < 6 && !t) return;
			this.p = this.p.subarray(jl(this.p, this.v - 1)), this.v = 0;
		}
		t && (this.p.length < 4 && Ol(6, "invalid zlib data"), this.p = this.p.subarray(0, -4)), Ml.prototype.c.call(this, t);
	}, e;
}(), Pl = typeof TextDecoder < "u" && /*#__PURE__*/ new TextDecoder();
try {
	Pl.decode(Al, { stream: !0 });
} catch {}
//#endregion
//#region ../../packages/edi-motion/src/assets/png.ts
var Fl = Uint32Array.from({ length: 256 }, (e, t) => {
	let n = t;
	for (let e = 0; e < 8; e++) n = n & 1 ? 3988292384 ^ n >>> 1 : n >>> 1;
	return n >>> 0;
});
function Il(e) {
	let t = 4294967295;
	for (let n of e) {
		let e = Fl[(t ^ n) & 255];
		if (e === void 0) throw Error("CRC inválido.");
		t = e ^ t >>> 8;
	}
	return (t ^ 4294967295) >>> 0;
}
function Ll(e, t = !1) {
	if (Uc(e), ![
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
		if (Il(e.subarray(i + 4, _ - 4)) !== n.getUint32(_ - 4)) throw Error("CRC de PNG inválido.");
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
function Rl(e, t) {
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
	let f = new DataView(u.buffer).getUint32(u.length - 4), p = 0, m = 1, h = 0, g = 0, _ = 0, v = 0, y = new Nl((e) => {
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
function zl(e) {
	Uc(e);
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
var Bl = G().regex(/^asset-[0-9a-f]{64}$/), Vl = {
	id: Bl,
	name: G().trim().min(1).max(120),
	byteLength: q().int().min(1).max(Vc),
	data: G().min(4).max(Hc)
}, Hl = Y({
	...Vl,
	kind: Z("image"),
	mime: Z("image/png"),
	width: q().int().min(1).max(16384),
	height: q().int().min(1).max(16384)
}), Ul = Ms("kind", [
	Hl,
	Y({
		...Vl,
		kind: Z("audio"),
		mime: Z("audio/wav"),
		channels: As([Z(1), Z(2)]),
		sampleRate: q().int().min(8e3).max(48e3),
		frames: q().int().min(1).max(144e4)
	}),
	Y({
		...Vl,
		kind: Z("font"),
		mime: X(["font/ttf", "font/otf"]),
		format: X(["truetype", "opentype"]),
		family: G().min(1).max(120),
		unitsPerEm: q().int().min(16).max(16384),
		glyphs: q().int().min(1).max(65535),
		weight: q().int().min(1).max(1e3),
		italic: ys(),
		embedding: q().int().min(0).max(65535),
		rightsConfirmed: Z(!0),
		notice: G().max(16e3).refine(Jc, "Aviso deve ser texto XML válido."),
		licenseNotice: G().max(16e3).refine(Jc, "Aviso deve ser texto XML válido.")
	})
]), Wl = /* @__PURE__ */ new WeakMap();
function Gl(e) {
	let { data: t, name: n, ...r } = e;
	return JSON.stringify(r);
}
function Kl(e) {
	return `asset-${Oc(Bc(e))}`;
}
function ql(e) {
	let t = Xl(e);
	if (t.kind !== "font") throw Error("Cobertura requer recurso de fonte.");
	let n = Wl.get(t);
	if (!n) throw Error("Validação da fonte não disponibilizou sua identidade.");
	if (n.unsupportedCharacterMap) throw n.unsupportedCharacterMap;
	if (!n.characterMap) try {
		n.characterMap = tl(Yl(t.data));
	} catch (e) {
		throw e instanceof Wc && (n.unsupportedCharacterMap = e), e;
	}
	return n.characterMap;
}
function Jl(e) {
	let t = Xl(e);
	if (t.kind !== "font") throw Error("Shaping requer recurso de fonte.");
	let n = Wl.get(t);
	if (!n) throw Error("Validação da fonte não disponibilizou sua identidade.");
	if (n.unsupportedLayout) throw n.unsupportedLayout;
	if (!n.layoutScripts) try {
		n.layoutScripts = el(Yl(t.data));
	} catch (e) {
		throw e instanceof Yc && (n.unsupportedLayout = e), e;
	}
	return n.layoutScripts;
}
function Yl(e) {
	if (e.length > 5333336 || e.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(e)) throw Error("Base64 de recurso inválido/excessivo.");
	let t = atob(e);
	if (!t.length || t.length > 4e6 || btoa(t) !== e) throw Error("Base64 de recurso não canônico ou excessivo.");
	return Uint8Array.from(t, (e) => e.charCodeAt(0));
}
function Xl(e) {
	let t = Ul.parse(e, { jitless: !0 }), n = Gl(t), r = typeof e == "object" && e ? Wl.get(e) : void 0;
	if (r?.data === t.data && r.metadata === n) return Wl.set(t, r), t;
	let i = Yl(t.data);
	if (i.length !== t.byteLength || t.id !== Kl(i)) throw Error("Integridade/tamanho do recurso não corresponde aos bytes.");
	if (t.kind === "image") {
		let e = Ll(i, !0);
		if (Rl(i, e), t.width !== e.width || t.height !== e.height) throw Error("Dimensões do recurso não correspondem à imagem.");
	} else if (t.kind === "audio") {
		let e = zl(i);
		if (t.channels !== e.channels || t.sampleRate !== e.sampleRate || t.frames !== e.frames) throw Error("Metadados do recurso não correspondem ao áudio.");
	} else {
		let e = $c(i);
		if (t.mime !== (e.format === "truetype" ? "font/ttf" : "font/otf") || Object.entries(e).some(([e, n]) => Reflect.get(t, e) !== n)) throw Error("Metadados da fonte não correspondem aos bytes.");
	}
	let a = {
		data: t.data,
		metadata: n
	};
	return typeof e == "object" && e && Wl.set(e, a), Wl.set(t, a), t;
}
function Zl(e) {
	if (!Array.isArray(e) || e.length > 256) throw Error("Catálogo requer até 256 recursos.");
	let t = 0, n = 0;
	for (let r of e) if (typeof r == "object" && r && "kind" in r && (r.kind === "image" && "width" in r && "height" in r && typeof r.width == "number" && Number.isInteger(r.width) && r.width > 0 && typeof r.height == "number" && Number.isInteger(r.height) && r.height > 0 ? t += r.width * r.height : r.kind === "audio" && "frames" in r && "channels" in r && typeof r.frames == "number" && Number.isInteger(r.frames) && r.frames > 0 && (r.channels === 1 || r.channels === 2) && (n += r.frames * r.channels), t > 16e6 || n > 288e4)) throw Error("Catálogo excede orçamento de pixels/amostras antes da decodificação.");
	let r = 0;
	for (let t of e) if (typeof t == "object" && t && "data" in t && typeof t.data == "string" && (r += t.data.length, t.data.length > 5333336 || r > 5333336 + e.length * 4)) throw Error("Catálogo excede orçamento de bytes.");
	let i = [], a = /* @__PURE__ */ new Set(), o = 0, s = 0, c = 0;
	for (let t of e) {
		let e = Xl(t);
		if (a.has(e.id)) throw Error("Recurso duplicado; reutilize sua identidade de conteúdo.");
		if (a.add(e.id), o += e.byteLength, e.kind === "image" ? s += e.width * e.height : e.kind === "audio" && (c += e.frames * e.channels), o > 4e6 || s > 16e6 || c > 288e4) throw Error("Catálogo excede orçamento de bytes/pixels/amostras.");
		i.push(e);
	}
	return i;
}
function Ql(e) {
	return `data:${e.mime};base64,${e.data}`;
}
function $l(e) {
	return `edi-${e.id}`;
}
//#endregion
//#region ../../packages/edi-motion/src/assets/fontStack.ts
var eu = J(Bl).max(7).refine((e) => new Set(e).size === e.length, "Fontes de fallback não podem se repetir.");
function tu(e) {
	let t = e.fontAssetId;
	if (t === void 0) {
		if (e.fontFallbackIds !== void 0) throw Error("Fallback incorporado requer uma fonte principal incorporada.");
		return [];
	}
	Bl.parse(t);
	let n = eu.parse(e.fontFallbackIds ?? []);
	if (n.includes(t)) throw Error("Fonte principal não pode repetir no fallback.");
	return [t, ...n];
}
function nu(e, t) {
	return tu(t).map((t) => {
		let n = e.get(t);
		if (n?.kind !== "font") throw Error("Cadeia de fontes referencia recurso ausente/incompatível.");
		return n;
	});
}
function ru(e) {
	return e.length ? e.map($l).join(", ") : void 0;
}
//#endregion
//#region ../../packages/edi-motion/src/layout/nineSlice.ts
function iu(e, t, n) {
	if ([
		...Object.values(e),
		...Object.values(t),
		...Object.values(n)
	].some((e) => !Number.isFinite(e) || e < 0 || e > 1e5) || e.width <= 0 || e.height <= 0 || n.left + n.right > e.width || n.top + n.bottom > e.height) throw Error("Dimensões/insets de nine-slice inválidos.");
	let r = n.left + n.right === 0 ? 1 : Math.min(1, t.width / (n.left + n.right)), i = n.top + n.bottom === 0 ? 1 : Math.min(1, t.height / (n.top + n.bottom)), a = [
		0,
		n.left,
		e.width - n.right,
		e.width
	], o = [
		0,
		n.top,
		e.height - n.bottom,
		e.height
	], s = [
		0,
		n.left * r,
		t.width - n.right * r,
		t.width
	], c = [
		0,
		n.top * i,
		t.height - n.bottom * i,
		t.height
	], l = [];
	for (let e = 0; e < 3; e++) for (let t = 0; t < 3; t++) {
		let n = a[t], r = a[t + 1], i = o[e], u = o[e + 1], d = s[t], f = s[t + 1], p = c[e], m = c[e + 1];
		if (n === void 0 || r === void 0 || i === void 0 || u === void 0 || d === void 0 || f === void 0 || p === void 0 || m === void 0) throw Error("Índice de nine-slice inválido.");
		l.push({
			source: {
				x: n,
				y: i,
				width: Math.max(0, r - n),
				height: Math.max(0, u - i)
			},
			target: {
				x: d,
				y: p,
				width: Math.max(0, f - d),
				height: Math.max(0, m - p)
			}
		});
	}
	return l;
}
//#endregion
//#region ../../packages/edi-motion/src/affine.ts
var au = () => [
	1,
	0,
	0,
	1,
	0,
	0
];
function ou(e, t) {
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
function su(e) {
	let t = e[0] * e[3] - e[1] * e[2], n = Math.max(Math.abs(e[0]), Math.abs(e[1]), Math.abs(e[2]), Math.abs(e[3]));
	return Number.isFinite(t) && n !== 0 && Math.abs(t) > 2 ** -52 * n * n * 8;
}
function cu(e) {
	let t = e[0] * e[3] - e[1] * e[2];
	if (!su(e)) throw Error("Não é possível editar um espaço singular ou numericamente instável.");
	return [
		e[3] / t,
		-e[1] / t,
		-e[2] / t,
		e[0] / t,
		(e[2] * e[5] - e[3] * e[4]) / t,
		(e[1] * e[4] - e[0] * e[5]) / t
	];
}
function lu(e, t, n) {
	return {
		x: e[0] * t + e[2] * n + e[4],
		y: e[1] * t + e[3] * n + e[5]
	};
}
function uu(e) {
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
function du(e) {
	return e.px || e.py || e.skewX ? `translate(${e.x + (e.px ?? 0)} ${e.y + (e.py ?? 0)}) rotate(${e.rotation}) skewX(${e.skewX ?? 0}) scale(${e.sx} ${e.sy}) translate(${-(e.px ?? 0)} ${-(e.py ?? 0)})` : `translate(${e.x} ${e.y}) rotate(${e.rotation}) scale(${e.sx} ${e.sy})`;
}
function fu(e) {
	if (e.length > 1e4) throw Error("Lista de transformações excessiva.");
	let t = au(), n = 0, r = "[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][-+]?\\d+)?", i = RegExp(`^\\s*${r}(?:(?:\\s+,?\\s*|,\\s*)${r})*\\s*$`);
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
				let t = uu({
					x: 0,
					y: 0,
					rotation: a,
					sx: 1,
					sy: 1
				});
				d = e.length === 1 ? t : ou(ou([
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
		t = ou(t, d), n += r[0].length;
	}
	if (n !== e.length) throw Error("Transformação SVG inválida.");
	return t;
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/svgValidation.ts
var pu = "[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][-+]?\\d+)?", mu = RegExp(`^(${pu})(px|%|em|ex|cm|mm|in|pt|pc)?$`), hu = RegExp(`^\\s*${pu}(?:(?:\\s+,?\\s*|,\\s*)${pu})*\\s*$`), gu = /* @__PURE__ */ new Set([
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
]), _u = /* @__PURE__ */ new Set([
	"width",
	"height",
	"rx",
	"ry",
	"r",
	"stroke-width",
	"font-size"
]), vu = /* @__PURE__ */ new Set([
	"opacity",
	"fill-opacity",
	"stroke-opacity"
]);
function yu(e) {
	if (!Number.isFinite(e) || Math.abs(e) > 1e7) throw Error("Número SVG fora do limite permitido.");
	return e;
}
function bu(e, t) {
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
		if (!hu.test(t)) throw Error("ViewBox SVG inválido.");
		let e = t.trim().split(/[\s,]+/).map(Number);
		if (e.length !== 4 || e.some((e) => !Number.isFinite(e) || Math.abs(e) > 1e5) || (e[2] ?? 0) <= 0 || (e[3] ?? 0) <= 0) throw Error("ViewBox SVG inválido.");
	} else if (e === "preserveAspectRatio") {
		if (!/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/.test(t)) throw Error("Proporção SVG inválida.");
	} else if (e === "overflow") {
		if (t !== "hidden" && t !== "visible") throw Error("Clipping de viewport inválido.");
	} else if (e === "transform") fu(t);
	else if (gu.has(e) || _u.has(e) || vu.has(e)) {
		let n = mu.exec(t.trim());
		if (!n?.[1]) throw Error(`Número SVG inválido: ${e}`);
		let r = yu(Number(n[1]));
		if (_u.has(e) && r < 0) throw Error(`Dimensão SVG negativa: ${e}`);
		if (vu.has(e) && (r < 0 || r > (n[2] === "%" ? 100 : 1) || n[2] && n[2] !== "%")) throw Error(`Opacidade SVG inválida: ${e}`);
	} else if (e === "points" || e === "stroke-dasharray" && t !== "none") {
		if (!hu.test(t)) throw Error(`Lista numérica SVG inválida: ${e}`);
		let n = t.trim().split(/[\s,]+/).map(Number);
		if (n.length > 8e3 || e === "points" && n.length % 2 != 0) throw Error("Lista de coordenadas SVG inválida ou muito grande.");
		if (n.forEach(yu), e === "stroke-dasharray" && n.some((e) => e < 0)) throw Error("Traçado SVG negativo.");
	}
}
//#endregion
//#region ../../packages/edi-motion/src/assets/imageAttributes.ts
var xu = /* @__PURE__ */ new Set([
	"x",
	"y",
	"width",
	"height",
	"transform",
	"opacity",
	"display",
	"visibility",
	"preserveAspectRatio",
	"overflow"
]);
function Su(e) {
	for (let [t, n] of Object.entries(e)) {
		if (!xu.has(t)) throw Error(`Imagem não aceita pintura/geometria vetorial: ${t}.`);
		if (typeof n != "string" || n.length > 500 || /url\s*\(|[<>\\]|(?:javascript|data|https?):/i.test(n)) throw Error(`Atributo de imagem inseguro: ${t}.`);
		if (t === "display" && ![
			"inline",
			"none",
			"inherit",
			"initial",
			"unset"
		].includes(n)) throw Error("Display de imagem inválido.");
		if (t === "visibility" && ![
			"visible",
			"hidden",
			"collapse",
			"inherit",
			"initial",
			"unset"
		].includes(n)) throw Error("Visibilidade de imagem inválida.");
		bu(t, n);
	}
}
//#endregion
//#region ../../packages/edi-motion/src/assets/imagePresentation.ts
var Cu = Y({
	top: q().min(0).max(16384),
	right: q().min(0).max(16384),
	bottom: q().min(0).max(16384),
	left: q().min(0).max(16384)
}), wu = Y({
	source: Y({
		width: q().int().positive().max(16384),
		height: q().int().positive().max(16384)
	}),
	insets: Cu
}).superRefine(({ source: e, insets: t }, n) => {
	(t.left + t.right >= e.width || t.top + t.bottom >= e.height) && n.addIssue({
		code: "custom",
		message: "Nine-slice requer centro com extensão positiva na imagem de origem."
	});
});
function Tu(e, t) {
	if (e === void 0) return t;
	if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?:px)?$/.test(e)) throw Error("Nine-slice requer largura/altura absolutas em px, sem unidades relativas.");
	let n = Number(e.replace(/px$/, ""));
	if (!Number.isFinite(n) || n < 0 || n > 1e5) throw Error("Dimensão de nine-slice fora do orçamento.");
	return n;
}
function Eu(e, t, n) {
	Bl.parse(e.id), Su(t);
	let r = {
		tag: "use",
		attrs: { href: `#edi-${e.id}` },
		children: []
	};
	if (!n) return {
		tag: "svg",
		attrs: {
			...t,
			"data-edi-image": e.id,
			viewBox: `0 0 ${e.width} ${e.height}`
		},
		children: [r]
	};
	let i = wu.parse({
		source: {
			width: e.width,
			height: e.height
		},
		insets: n
	}), a = Tu(t.width, e.width), o = Tu(t.height, e.height), s = iu(i.source, {
		width: a,
		height: o
	}, i.insets);
	return {
		tag: "svg",
		attrs: {
			...t,
			width: String(a),
			height: String(o),
			"data-edi-image": e.id,
			"data-edi-slice": "1",
			viewBox: `0 0 ${Math.max(1, a)} ${Math.max(1, o)}`,
			preserveAspectRatio: "none"
		},
		children: s.map(({ source: e, target: t }) => ({
			tag: "svg",
			attrs: {
				x: String(t.x),
				y: String(t.y),
				width: String(t.width),
				height: String(t.height),
				viewBox: `${e.x} ${e.y} ${e.width === 0 ? 1 : e.width} ${e.height === 0 ? 1 : e.height}`,
				preserveAspectRatio: "none",
				overflow: "hidden"
			},
			children: [{
				...r,
				attrs: { ...r.attrs },
				children: []
			}]
		}))
	};
}
//#endregion
//#region ../../packages/edi-motion/src/audio/model.ts
var Du = G().regex(/^[a-z]+-[\w-]{1,100}$/), Ou = Y({
	id: Du,
	eventId: Du,
	assetId: Bl,
	volume: q().min(0).max(1),
	caption: G().trim().min(1).max(500).refine(Jc)
}), ku = Y({
	version: Z(1),
	bindings: J(Ou).max(256)
});
function Au(e, t, n) {
	let r = ku.parse(e, { jitless: !0 }), i = /* @__PURE__ */ new Set();
	for (let e of r.bindings) {
		if (i.has(e.id)) throw Error("IDs de vínculos de áudio duplicados.");
		if (i.add(e.id), t.get(e.assetId)?.kind !== "audio") throw Error("Vínculo de áudio referencia recurso ausente/incompatível.");
		if (!n.has(e.eventId)) throw Error("Vínculo de áudio referencia evento ausente.");
	}
	return r;
}
//#endregion
//#region ../../packages/edi-motion/src/data/model.ts
var ju = G().regex(/^[a-z]+-[\w-]{1,100}$/), Mu = {
	id: ju,
	name: G().trim().min(1).max(120)
}, Nu = Ms("kind", [
	Y({
		...Mu,
		kind: Z("number"),
		min: q().min(-1e7).max(1e7),
		max: q().min(-1e7).max(1e7)
	}),
	Y({
		...Mu,
		kind: X([
			"string",
			"boolean",
			"color"
		])
	}),
	Y({
		...Mu,
		kind: Z("enum"),
		values: J(G().min(1).max(120)).min(1).max(100)
	}),
	Y({
		...Mu,
		kind: X(["model", "list"]),
		modelId: ju
	})
]), Pu = Y({
	version: Z(1),
	models: J(Y({
		...Mu,
		fields: J(Nu).max(100)
	})).max(100),
	instances: J(Y({
		...Mu,
		modelId: ju,
		value: Cs()
	})).max(100),
	context: Y({
		modelId: ju,
		instanceId: ju
	}).optional(),
	links: J(Y({
		id: ju,
		instanceId: ju.nullable(),
		path: J(ju).min(1).max(16),
		inputId: ju,
		direction: X(["one-way", "two-way"])
	})).max(100)
});
function Fu(e) {
	return typeof e == "object" && !!e && !Array.isArray(e) && [null, Object.prototype].includes(Object.getPrototypeOf(e));
}
var Iu = /* @__PURE__ */ new Set([
	"__proto__",
	"prototype",
	"constructor"
]);
function Lu(e) {
	let t = 0, n = 0, r = /* @__PURE__ */ new Set();
	function i(e, a) {
		if (++t > 1e5 || a > 40) throw Error("Orçamento estrutural de dados excedido.");
		if (typeof e == "string" && (n += e.length), typeof e == "object" && e) {
			if (r.has(e)) throw Error("Dados cíclicos não são persistíveis.");
			if (Array.isArray(e) ? e.length > 2e4 : !Fu(e) || Object.keys(e).length > 1e3) throw Error("Estrutura de dados inválida ou excessiva.");
			r.add(e);
			for (let [t, r] of Object.entries(e)) {
				if (Iu.has(t)) throw Error("Chave de dados reservada.");
				n += t.length, i(r, a + 1);
			}
			r.delete(e);
		}
		if (n > 1e6) throw Error("Orçamento textual de dados excedido.");
	}
	i(e, 0);
}
function Ru(e) {
	Lu(e);
	let t = Pu.parse(e, { jitless: !0 }), n = new Map(t.models.map((e) => [e.id, e])), r = /* @__PURE__ */ new Set(), i = (e) => {
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
	for (let e of t.instances) i(e.id), l.set(e.id, Vu(c, e.modelId, e.value));
	if (t.context) {
		let e = t.instances.find((e) => e.id === t.context?.instanceId);
		if (!n.has(t.context.modelId)) throw Error("Modelo da prancheta ausente; escolha outro no inspetor da prancheta.");
		if (!e) throw Error("Instância da prancheta ausente; escolha outra no inspetor da prancheta.");
		if (e.modelId !== t.context.modelId) throw Error("Instância da prancheta precisa ser do modelo da prancheta.");
	}
	for (let e of t.links) {
		if (i(e.id), e.instanceId === null && Bu(c, t.context?.modelId, e.path)) throw Error("Link da instância da prancheta não atravessa listas.");
		let n = zu(t, e);
		if (!l.has(n)) throw Error("Instância vinculada órfã.");
		let r = Uu(c, l, n, e.path);
		if (r.field.kind === "model" || r.field.kind === "list") throw Error("Input requer campo escalar, não lista/modelo.");
	}
	Hu(c, l);
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
function zu(e, t, n = e.context?.instanceId) {
	let r = t.instanceId ?? n;
	if (!r) throw Error("Link da instância da prancheta requer modelo da prancheta.");
	return r;
}
function Bu(e, t, n) {
	let r = t ? e.models.get(t) : void 0;
	for (let t of n) {
		let n = r?.fields.find((e) => e.id === t);
		if (!n) return !1;
		if (n.kind === "list") return !0;
		r = n.kind === "model" ? e.models.get(n.modelId) : void 0;
	}
	return !1;
}
function Vu(e, t, n) {
	let r = 0, i = 0;
	function a(t, n, o) {
		let s = e.models.get(t);
		if (!s || !Fu(n) || Object.keys(n).length !== s.fields.length || o > 8) throw Error("Instância não corresponde ao modelo.");
		return Object.fromEntries(s.fields.map((e) => {
			if (++r > 2e4 || !Object.hasOwn(n, e.id)) throw Error("Campo ausente ou orçamento de valores excedido.");
			let t = n[e.id], s;
			if (e.kind === "model") s = a(e.modelId, t, o + 1);
			else if (e.kind === "list") {
				if (!Array.isArray(t) || t.length > 1e3) throw Error("Lista requer até 1000 itens.");
				let n = /* @__PURE__ */ new Set();
				if (i += t.length, i > 4e3) throw Error("Orçamento agregado de itens de lista excedido.");
				s = t.map((t) => {
					if (!Fu(t) || typeof t.id != "string" || !ju.safeParse(t.id).success || n.has(t.id) || Object.keys(t).length !== 2 || !Object.hasOwn(t, "value")) throw Error("Item de lista requer identidade única e valor.");
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
function Hu(e, t) {
	if (Lu([...t]), t.size !== e.document.instances.length) throw Error("Instâncias incompletas.");
	let n = /* @__PURE__ */ new Map();
	for (let r of e.document.instances) n.set(r.id, Vu(e, r.modelId, t.get(r.id)));
	for (let t of e.document.links) Uu(e, n, zu(e.document, t), t.path);
	return n;
}
function Uu(e, t, n, r) {
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
			if (!Fu(i)) throw Error("Modelo composto inválido.");
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
function Wu(e, t, n = 0) {
	let r = 0, i = (t, n) => {
		if (++r > 2e4) throw Error("Orçamento de valores padrão excedido.");
		let a = e.models.get(t);
		if (!a || n > 8) throw Error("Modelo inválido/profundo.");
		return Object.fromEntries(a.fields.map((e) => {
			if (++r > 2e4) throw Error("Orçamento de valores padrão excedido.");
			return [e.id, e.kind === "model" ? i(e.modelId, n + 1) : e.kind === "list" ? [] : e.kind === "number" ? Math.max(e.min, Math.min(e.max, 0)) : e.kind === "boolean" ? !1 : e.kind === "color" ? "#000000" : e.kind === "enum" ? e.values[0] ?? "" : ""];
		}));
	};
	return i(t, n);
}
//#endregion
//#region ../../packages/edi-motion/src/model.ts
var Gu = X([
	"x",
	"y",
	"rotation",
	"sx",
	"sy",
	"opacity",
	"px",
	"py",
	"skewX"
]), Ku = {
	x: [-1e4, 1e4],
	y: [-1e4, 1e4],
	rotation: [-1e4, 1e4],
	sx: [-20, 20],
	sy: [-20, 20],
	px: [-1e4, 1e4],
	py: [-1e4, 1e4],
	skewX: [-85, 85],
	opacity: [0, 100]
}, qu = G().regex(/^[a-z]+-[\w-]{1,100}$/), Q = G().regex(/^node-[\w-]{1,100}$/), Ju = X([
	"loop",
	"ping-pong",
	"once"
]), Yu = As([
	X(["linear", "hold"]),
	Y({
		kind: Z("elastic"),
		amplitude: q().min(1).max(10),
		period: q().min(.05).max(2)
	}),
	Y({
		kind: Z("cubic-bezier"),
		points: Is([
			q().min(0).max(1),
			q().min(-10).max(10),
			q().min(0).max(1),
			q().min(-10).max(10)
		])
	})
]), Xu = Y({
	id: qu,
	frame: q().min(0).max(36e4),
	value: q(),
	easing: Yu
}), Zu = Y({
	id: qu,
	targetId: Q,
	property: Gu,
	keys: J(Xu).min(1).max(1e4)
}), Qu = Y({
	id: qu,
	frame: q().int().min(0).max(36e4),
	order: J(Q).min(1).max(2e3)
}), $u = Y({
	id: qu,
	scopeId: Q.nullable(),
	keys: J(Qu).min(1).max(1e3)
}), ed = Y({
	id: qu,
	name: G().trim().min(1).max(120),
	fps: q().int().min(1).max(240),
	frames: q().int().min(1).max(36e4),
	mode: Ju,
	tracks: J(Zu).max(12e3),
	drawOrders: J($u).max(256).optional()
}), td = Y({
	version: As([Z(1), Z(2)]),
	animations: J(ed).max(100)
}), nd = Y({
	x: q().min(-1e4).max(1e4),
	y: q().min(-1e4).max(1e4),
	rotation: q().min(-1e4).max(1e4),
	sx: q().min(-20).max(20),
	sy: q().min(-20).max(20),
	px: q().min(-1e4).max(1e4).optional(),
	py: q().min(-1e4).max(1e4).optional(),
	skewX: q().min(-85).max(85).optional(),
	opacity: q().min(0).max(100)
});
nd.partial();
var rd = () => ({
	x: 0,
	y: 0,
	rotation: 0,
	sx: 1,
	sy: 1,
	opacity: 100
});
function id(e, t) {
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
	let i = td.parse(e, { jitless: !0 });
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
			let a = -1, [o, u] = Ku[r.property];
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
//#region ../../packages/edi-motion/src/evaluator.ts
function ad(e, t) {
	if (!Number.isFinite(e)) throw Error("Tempo de reprodução inválido.");
	let n = Math.max(0, e) * t.fps;
	if (!Number.isFinite(n)) throw Error("Tempo de reprodução excede o limite numérico.");
	if (t.mode === "once") return Math.min(t.frames, n);
	if (t.mode === "ping-pong") {
		let e = n % (2 * t.frames);
		return e <= t.frames ? e : 2 * t.frames - e;
	}
	return n % t.frames;
}
function od(e, t) {
	if (!Number.isFinite(e)) throw Error("Progresso de interpolação inválido.");
	let n = Math.max(0, Math.min(1, e));
	if (n === 0 || n === 1 || t === "linear") return n;
	if (t === "hold") return 0;
	if (t.kind === "elastic") {
		let e = t.period / (2 * Math.PI) * Math.asin(1 / t.amplitude);
		return 1 + t.amplitude * 2 ** (-10 * n) * Math.sin((n - e) * 2 * Math.PI / t.period);
	}
	let [r, i, a, o] = t.points, s = (e, t, n) => 3 * (1 - e) ** 2 * e * t + 3 * (1 - e) * e ** 2 * n + e ** 3, c = 0, l = 1;
	for (let e = 0; e < 40; e++) {
		let e = (c + l) / 2;
		s(e, r, a) < n ? c = e : l = e;
	}
	return s((c + l) / 2, i, o);
}
function sd(e, t) {
	return cd(e.keys, t, Ku[e.property]);
}
function cd(e, t, n, r = !1) {
	if (!Number.isFinite(t)) throw Error("Quadro inválido.");
	let i = e[0], a = e.at(-1);
	if (!i || !a) throw Error("Trilha sem chaves.");
	if (t <= i.frame) return i.value;
	if (t >= a.frame) return a.value;
	let o = 0, s = e.length - 1;
	for (; s - o > 1;) {
		let n = Math.floor((o + s) / 2), r = e[n];
		if (!r) throw Error("Índice de chave inválido.");
		r.frame <= t ? o = n : s = n;
	}
	let c = e[o], l = e[s];
	if (!c || !l) throw Error("Intervalo de chaves inválido.");
	let u = r ? c.value : c.value + (l.value - c.value) * od((t - c.frame) / (l.frame - c.frame), c.easing), [d, f] = n;
	return Math.max(d, Math.min(f, u));
}
function ld(e, t) {
	if (!Number.isFinite(t)) throw Error("Quadro inválido.");
	let n = /* @__PURE__ */ new Map();
	for (let r of e.tracks) {
		let e = n.get(r.targetId);
		e || (e = {}, n.set(r.targetId, e)), e[r.property] = sd(r, t);
	}
	return n;
}
//#endregion
//#region ../../packages/edi-motion/src/driverClocks.ts
function ud(e, t) {
	if (!Number.isFinite(e)) throw Error("Relógio de componente inválido.");
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
	for (let i of t) {
		let t = i.parentId === null ? e : r.get(i.parentId);
		if (t === void 0) throw Error("Relógios precisam estar ordenados por dependência.");
		let a = ad(t * i.speed + i.offsetSeconds, i.animation);
		r.set(i.id, a / i.animation.fps), n.set(i.id, a);
	}
	return n;
}
//#endregion
//#region ../../packages/edi-motion/src/parameters.ts
function dd(e, t, n) {
	return JSON.stringify([
		e,
		t,
		n
	]);
}
function fd(e, t) {
	if (!Number.isFinite(t)) throw Error("Parâmetro calculado fora do intervalo numérico.");
	let n = Math.max(e.bounds[0], Math.min(e.bounds[1], t));
	return e.discrete ? Math.round(n) : n;
}
function pd(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map();
	if (!e) return a;
	function o(t, n, r) {
		for (let i of e?.clips.get(t.id) ?? []) {
			if (i.clockId !== r) continue;
			let t = e?.definitions.get(i.key);
			if (!t) throw Error("Canal de parâmetro órfão.");
			a.set(i.key, cd(i.keys, n, t.bounds, t.discrete));
		}
	}
	t && o(t, n, null);
	let s = ud(r, i);
	for (let e of i) {
		let t = s.get(e.id);
		if (t === void 0) throw Error("Relógio de parâmetro órfão.");
		o(e.animation, t, e.id);
	}
	return a;
}
//#endregion
//#region ../../packages/edi-motion/src/behavior/formulas.ts
var md = G().regex(/^[a-z]+-[\w-]{1,100}$/), hd = cc(() => Ms("op", [
	Y({
		op: Z("number"),
		value: q().min(-1e7).max(1e7)
	}),
	Y({
		op: Z("text"),
		value: G().max(1e3).refine(Jc, "Texto de fórmula inválido.")
	}),
	Y({
		op: Z("boolean"),
		value: ys()
	}),
	Y({
		op: Z("input"),
		inputId: md
	}),
	Y({ op: Z("time") }),
	Y({
		op: X([
			"add",
			"subtract",
			"multiply",
			"divide",
			"modulo"
		]),
		left: hd,
		right: hd
	}),
	Y({
		op: X(["min", "max"]),
		args: J(hd).min(2).max(8)
	}),
	Y({
		op: X([
			"abs",
			"floor",
			"ceil",
			"round",
			"sin",
			"cos",
			"sqrt",
			"negate"
		]),
		arg: hd
	}),
	Y({
		op: Z("clamp"),
		value: hd,
		min: hd,
		max: hd
	}),
	Y({
		op: Z("compare"),
		operator: X([
			"eq",
			"neq",
			"lt",
			"lte",
			"gt",
			"gte"
		]),
		left: hd,
		right: hd
	}),
	Y({
		op: X(["and", "or"]),
		left: hd,
		right: hd
	}),
	Y({
		op: Z("not"),
		arg: hd
	}),
	Y({
		op: Z("if"),
		condition: hd,
		ifTrue: hd,
		ifFalse: hd
	}),
	Y({
		op: Z("concat"),
		args: J(hd).min(1).max(8)
	}),
	Y({
		op: Z("noise"),
		seed: q().int().min(0).max(65535),
		arg: hd
	})
])), gd = Y({
	id: G().regex(/^formula-[\w-]{1,100}$/),
	inputId: md,
	expression: hd
}), _d = {
	formulas: 64,
	nodes: 256,
	depth: 16,
	totalNodes: 4096
};
function vd(e) {
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
function yd(e) {
	let t = 0, n = 0, r = /* @__PURE__ */ new Set(), i = [[e, 1]];
	for (; i.length;) {
		let e = i.pop();
		if (!e) break;
		let [a, o] = e;
		if (++t > _d.nodes || o > _d.depth) throw Error(`Fórmula excede ${_d.nodes} nós ou profundidade ${_d.depth}.`);
		n = Math.max(n, o), a.op === "input" && r.add(a.inputId);
		for (let e of vd(a)) i.push([e, o + 1]);
	}
	return {
		nodes: t,
		depth: n,
		reads: r
	};
}
function bd(e, t) {
	let n = (e, n) => {
		let r = bd(e, t);
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
			let r = bd(e.left, t);
			if (e.operator !== "eq" && e.operator !== "neq" && r !== "number") throw Error("Comparação de ordem requer números.");
			return n(e.right, r), "boolean";
		}
		case "and":
		case "or": return n(e.left, "boolean"), n(e.right, "boolean"), "boolean";
		case "not": return n(e.arg, "boolean"), "boolean";
		case "if": {
			n(e.condition, "boolean");
			let r = bd(e.ifTrue, t);
			return n(e.ifFalse, r), r;
		}
		case "concat":
			for (let n of e.args) bd(n, t);
			return "text";
	}
}
function xd(e, t) {
	let n = (t) => {
		let n = Math.imul(t ^ Math.imul(e + 1, 2654435761), 2246822507);
		return n ^= n >>> 13, n = Math.imul(n, 3266489909), n ^= n >>> 16, (n >>> 0) / 4294967295 * 2 - 1;
	}, r = Math.floor(t), i = t - r, a = i * i * (3 - 2 * i), o = n(r | 0);
	return o + (n(r + 1 | 0) - o) * a;
}
function Sd(e, t, n, r) {
	let i = (e) => {
		let i = Sd(e, t, n, r);
		if (typeof i != "number") throw Error("Fórmula com tipo incompatível.");
		return i;
	}, a = (e) => Number.isNaN(e) ? 0 : Math.max(-Number.MAX_VALUE, Math.min(Number.MAX_VALUE, e));
	switch (e.op) {
		case "number":
		case "text":
		case "boolean": return e.value;
		case "input": return t(e.inputId);
		case "time": return n;
		case "add": return a(i(e.left) + i(e.right));
		case "subtract": return a(i(e.left) - i(e.right));
		case "multiply": return a(i(e.left) * i(e.right));
		case "divide": {
			let t = i(e.right);
			return t === 0 ? 0 : a(i(e.left) / t);
		}
		case "modulo": {
			let t = i(e.right);
			return t === 0 ? 0 : a(i(e.left) % t);
		}
		case "min": return Math.min(...e.args.map(i));
		case "max": return Math.max(...e.args.map(i));
		case "abs": return Math.abs(i(e.arg));
		case "floor": return Math.floor(i(e.arg));
		case "ceil": return Math.ceil(i(e.arg));
		case "round": return Math.round(i(e.arg));
		case "sin": return Math.sin(i(e.arg));
		case "cos": return Math.cos(i(e.arg));
		case "sqrt": {
			let t = i(e.arg);
			return t < 0 ? 0 : Math.sqrt(t);
		}
		case "negate": return -i(e.arg);
		case "clamp": {
			let t = i(e.min), n = i(e.max);
			return Math.min(Math.max(i(e.value), Math.min(t, n)), Math.max(t, n));
		}
		case "compare": {
			let i = Sd(e.left, t, n, r), a = Sd(e.right, t, n, r);
			if (e.operator === "eq") return i === a;
			if (e.operator === "neq") return i !== a;
			if (typeof i != "number" || typeof a != "number") throw Error("Fórmula com tipo incompatível.");
			return e.operator === "lt" ? i < a : e.operator === "lte" ? i <= a : e.operator === "gt" ? i > a : i >= a;
		}
		case "and": return Sd(e.left, t, n, r) === !0 && Sd(e.right, t, n, r) === !0;
		case "or": return Sd(e.left, t, n, r) === !0 || Sd(e.right, t, n, r) === !0;
		case "not": return Sd(e.arg, t, n, r) !== !0;
		case "if": return Sd(Sd(e.condition, t, n, r) === !0 ? e.ifTrue : e.ifFalse, t, n, r);
		case "concat": return e.args.map((e) => r(Sd(e, t, n, r))).join("").slice(0, 1e4);
		case "noise": return xd(e.seed, i(e.arg));
	}
}
function Cd(e) {
	let t = new Map(e.map((e) => [e.inputId, e])), n = [], r = /* @__PURE__ */ new Map(), i = (e) => {
		let a = r.get(e.inputId);
		if (a !== "done") {
			if (a === "visiting") throw Error("Fórmulas formam um ciclo entre inputs.");
			r.set(e.inputId, "visiting");
			for (let n of yd(e.expression).reads) {
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
var $ = G().regex(/^[a-z]+-[\w-]{1,100}$/), wd = G().trim().min(1).max(120), Td = {
	id: $,
	name: wd
}, Ed = Ms("kind", [
	Y({
		...Td,
		kind: Z("number"),
		initial: q().min(-1e7).max(1e7),
		min: q().min(-1e7).max(1e7),
		max: q().min(-1e7).max(1e7)
	}),
	Y({
		...Td,
		kind: Z("boolean"),
		initial: ys()
	}),
	Y({
		...Td,
		kind: Z("string"),
		initial: G().max(1e4)
	}),
	Y({
		...Td,
		kind: Z("color"),
		initial: G().regex(/^#[\da-f]{6}$/i)
	}),
	Y({
		...Td,
		kind: Z("enum"),
		initial: G().max(120),
		values: J(G().min(1).max(120)).min(1).max(100)
	}),
	Y({
		...Td,
		kind: Z("trigger")
	})
]), Dd = Ms("operator", [
	Y({
		inputId: $,
		operator: Z("trigger")
	}),
	Y({
		inputId: $,
		operator: X(["eq", "neq"]),
		value: As([
			q().min(-1e7).max(1e7),
			ys(),
			G().max(1e4)
		])
	}),
	Y({
		inputId: $,
		operator: X([
			"gt",
			"gte",
			"lt",
			"lte"
		]),
		value: q().min(-1e7).max(1e7)
	})
]), Od = {
	id: $,
	name: wd,
	x: q().min(-1e4).max(1e4),
	y: q().min(-1e4).max(1e4),
	speed: q().min(.01).max(20)
}, kd = Ms("kind", [
	Y({
		...Od,
		kind: Z("base")
	}),
	Y({
		...Od,
		kind: Z("animation"),
		animationId: $
	}),
	Y({
		...Od,
		kind: Z("blend1d"),
		inputId: $,
		points: J(Y({
			at: q().min(-1e7).max(1e7),
			animationId: $
		})).min(2).max(32)
	})
]), Ad = Y({
	id: $,
	from: As([$, Z("*")]),
	to: $,
	conditions: J(Dd).max(32),
	priority: q().int().min(-1e4).max(1e4),
	exitAt: q().min(0).max(1e3).nullable(),
	duration: q().min(0).max(60),
	easing: Yu,
	interrupt: X(["never", "immediate"])
}), jd = Y({
	id: $,
	name: wd,
	layers: J(Y({
		id: $,
		name: wd,
		entryStateId: $,
		weight: q().min(0).max(1),
		mode: X(["override", "additive"]),
		targetIds: J(Q).max(2e3),
		properties: J(Gu).min(1).max(9),
		states: J(kd).min(1).max(100),
		transitions: J(Ad).max(1e3)
	})).min(1).max(32)
}), Md = Y({
	id: $,
	animationId: $,
	frame: q().min(0).max(36e4),
	name: wd,
	data: Rs(G().min(1).max(80), As([
		G().max(1e3),
		q().min(-1e7).max(1e7),
		ys(),
		xs()
	])).refine((e) => Object.keys(e).length <= 20)
}), Nd = Ms("kind", [
	Y({
		id: $,
		kind: Z("parameter"),
		inputId: $,
		targetId: G().regex(/^(?:constraint|morph|solo|trim|joystick)-[\w-]{1,100}$/),
		property: X([
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
		scale: q().min(-1e4).max(1e4),
		offset: q().min(-1e4).max(1e4),
		direction: X(["one-way", "two-way"])
	}),
	Y({
		id: $,
		kind: Z("transform"),
		inputId: $,
		targetId: Q,
		property: Gu,
		scale: q().min(-1e4).max(1e4),
		offset: q().min(-1e4).max(1e4),
		direction: X(["one-way", "two-way"])
	}),
	Y({
		id: $,
		kind: Z("text"),
		inputId: $,
		targetId: Q,
		direction: X(["one-way", "two-way"])
	}),
	Y({
		id: $,
		kind: Z("visibility"),
		inputId: $,
		targetId: Q,
		invert: ys(),
		direction: Z("one-way")
	}),
	Y({
		id: $,
		kind: Z("color"),
		inputId: $,
		targetId: Q,
		property: X(["fill", "stroke"]),
		direction: X(["one-way", "two-way"])
	}),
	Y({
		id: $,
		kind: Z("semantics"),
		inputId: $,
		targetId: Q,
		property: X(["label", "description"]),
		template: G().min(1).max(500).refine((e) => e.split("{valor}").length === 2 && Jc(e), "Modelo semântico requer um único {valor} e texto XML válido."),
		direction: Z("one-way")
	})
]);
function Pd(e) {
	return typeof e == "number" ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(e) : typeof e == "boolean" ? e ? "sim" : "não" : e;
}
var Fd = Ms("kind", [
	Y({
		kind: Z("set-input"),
		inputId: $,
		value: As([
			G().max(1e4),
			q().min(-1e7).max(1e7),
			ys()
		])
	}),
	Y({
		kind: Z("trigger"),
		inputId: $
	}),
	Y({
		kind: Z("pointer-coordinate"),
		inputId: $,
		axis: X(["x", "y"]),
		normalized: ys()
	})
]), Id = Y({
	id: $,
	targetId: Q.nullable(),
	event: X([
		"enter",
		"leave",
		"activate",
		"move"
	]),
	actions: J(Fd).min(1).max(16)
}), Ld = Y({
	version: As([Z(1), Z(2)]),
	inputs: J(Ed).max(100),
	machines: J(jd).max(20),
	bindings: J(Nd).max(1e3),
	listeners: J(Id).max(1e3),
	events: J(Md).max(1e4),
	defaultMachineId: $.nullable(),
	data: Pu.optional(),
	formulas: J(gd).max(_d.formulas).optional()
});
function Rd(e, t) {
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
function zd(e, t, n, r) {
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
	let u = Ld.parse(e, { jitless: !0 }), d = new Map(u.inputs.map((e) => [e.id, e])), f = new Map(n.map((e) => [e.id, e])), p = /* @__PURE__ */ new Set(), m = (e) => {
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
		e.kind !== "trigger" && Rd(e, e.initial);
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
					} else if (Rd(t, e.value), !["eq", "neq"].includes(e.operator) && t.kind !== "number") throw Error("Comparação de ordem requer número.");
				}
			}
		}
	}
	if (u.machines.length === 0 != (u.defaultMachineId === null) || u.defaultMachineId !== null && !u.machines.some((e) => e.id === u.defaultMachineId)) throw Error("Máquina inicial inválida.");
	let _ = /* @__PURE__ */ new Set();
	for (let e of u.bindings) {
		if (m(e.id), e.kind === "parameter") {
			let t = r?.definitions.get(dd([], e.targetId, e.property)), n = h(e.inputId);
			if (u.version !== 2 || !t || n.kind !== "number") throw Error("Binding de parâmetro requer lógica v2, destino existente e input numérico.");
			if (e.direction === "two-way" && (e.scale === 0 || t.discrete)) throw Error("Parâmetro bidirecional requer conversão contínua invertível.");
			let i = dd([], e.targetId, e.property);
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
			if (t.kind === "set-input" && Rd(e, t.value), t.kind === "trigger" && e.kind !== "trigger") throw Error("Listener requer input trigger.");
			if (t.kind === "pointer-coordinate" && e.kind !== "number") throw Error("Coordenada requer input numérico.");
		}
	}
	for (let e of u.events) {
		m(e.id);
		let t = f.get(e.animationId);
		if (!t || e.frame > t.frames) throw Error("Evento fora da animação/prancheta.");
	}
	if (u.data) {
		let e = Ru(u.data);
		for (let t of e.document.links) {
			let n = h(t.inputId), r = Uu(e, e.initial, zu(e.document, t), t.path), i = r.field;
			if (i.kind !== n.kind) throw Error("Link requer input e campo do mesmo tipo.");
			if (i.kind === "number" && n.kind === "number" && (i.min < n.min || i.max > n.max || t.direction === "two-way" && (i.min !== n.min || i.max !== n.max))) throw Error("Intervalos incompatíveis no link de dados.");
			if (i.kind === "enum" && n.kind === "enum" && (i.values.some((e) => !n.values.includes(e)) || t.direction === "two-way" && n.values.some((e) => !i.values.includes(e)))) throw Error("Opções incompatíveis no link de dados.");
			if (Rd(n, r.value), t.direction === "one-way" && (u.listeners.some((e) => e.actions.some((e) => e.inputId === n.id)) || u.bindings.some((e) => e.inputId === n.id && e.direction === "two-way"))) throw Error("Input controlado por modelo somente leitura não admite listener de escrita/binding bidirecional.");
		}
	}
	if (u.formulas?.length) {
		let e = /* @__PURE__ */ new Set(), t = new Set(u.data ? Ru(u.data).document.links.map((e) => e.inputId) : []), n = 0, r = (e) => {
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
			if (n += yd(i.expression).nodes, n > _d.totalNodes) throw Error(`Fórmulas excedem ${_d.totalNodes} nós no total.`);
			let s = bd(i.expression, r);
			if (s !== o) throw Error(`Fórmula de ${i.inputId} produz ${s}, mas o input espera ${o}.`);
		}
		if (Cd(u.formulas), u.listeners.some((t) => t.actions.some((t) => e.has(t.inputId))) || u.bindings.some((t) => t.direction === "two-way" && e.has(t.inputId))) throw Error("Input calculado por fórmula é somente leitura para listeners e bindings bidirecionais.");
	}
	return u;
}
//#endregion
//#region ../../packages/edi-motion/src/svgPrimitive.ts
var Bd = q().min(-1e7).max(1e7), Vd = q().min(0).max(1e7), Hd = J(Is([Bd, Bd])).min(2).max(4e3), Ud = Ms("kind", [
	Y({
		kind: Z("circle"),
		cx: Bd,
		cy: Bd,
		r: Vd
	}),
	Y({
		kind: Z("ellipse"),
		cx: Bd,
		cy: Bd,
		rx: Vd,
		ry: Vd
	}),
	Y({
		kind: Z("rect"),
		x: Bd,
		y: Bd,
		width: Vd,
		height: Vd,
		rx: Vd,
		ry: Vd
	}).refine((e) => e.rx <= e.width / 2 && e.ry <= e.height / 2, "Raios de canto devem estar normalizados à dimensão da primitiva."),
	Y({
		kind: Z("line"),
		x1: Bd,
		y1: Bd,
		x2: Bd,
		y2: Bd
	}),
	Y({
		kind: Z("polyline"),
		points: Hd
	}),
	Y({
		kind: Z("polygon"),
		points: Hd
	})
]);
function Wd(e, t) {
	function n(e, n = 0) {
		let r = t[e];
		if (r === void 0) return n;
		if (r.length > 80 || !/^[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?(?:px)?$/i.test(r.trim())) throw Error("Primitiva SVG requer dimensões numéricas/px em userSpaceOnUse.");
		let i = Number(r.trim().replace(/px$/i, ""));
		if (!Number.isFinite(i) || Math.abs(i) > 1e7) throw Error("Coordenada de primitiva SVG fora do limite.");
		return i;
	}
	if (e === "circle") return Ud.parse({
		kind: e,
		cx: n("cx"),
		cy: n("cy"),
		r: n("r")
	});
	if (e === "ellipse") return Ud.parse({
		kind: e,
		cx: n("cx"),
		cy: n("cy"),
		rx: n("rx"),
		ry: n("ry")
	});
	if (e === "rect") {
		let t = n("width"), r = n("height"), i = n("rx", n("ry")), a = n("ry", n("rx"));
		if (i < 0 || a < 0) throw Error("Raio de canto SVG não pode ser negativo.");
		return Ud.parse({
			kind: e,
			x: n("x"),
			y: n("y"),
			width: t,
			height: r,
			rx: Math.min(t / 2, i),
			ry: Math.min(r / 2, a)
		});
	}
	if (e === "line") return Ud.parse({
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
		return Ud.parse({
			kind: e,
			points: a
		});
	}
	throw Error("Tag não é primitiva SVG suportada.");
}
function Gd(e) {
	if (e.kind === "line") return `M${e.x1} ${e.y1}L${e.x2} ${e.y2}`;
	if (e.kind === "polygon" || e.kind === "polyline") return e.points.map(([e, t], n) => `${n ? "L" : "M"}${e} ${t}`).join(" ") + (e.kind === "polygon" ? "Z" : "");
	if (e.kind === "rect") {
		let { x: t, y: n, width: r, height: i, rx: a, ry: o } = e;
		return a && o ? `M${t + a} ${n}H${t + r - a}A${a} ${o} 0 0 1 ${t + r} ${n + o}V${n + i - o}A${a} ${o} 0 0 1 ${t + r - a} ${n + i}H${t + a}A${a} ${o} 0 0 1 ${t} ${n + i - o}V${n + o}A${a} ${o} 0 0 1 ${t + a} ${n}Z` : `M${t} ${n}H${t + r}V${n + i}H${t}Z`;
	}
	let { cx: t, cy: n } = e, r = e.kind === "circle" ? e.r : e.rx, i = e.kind === "circle" ? e.r : e.ry;
	return !r || !i ? `M${t} ${n}` : `M${t + r} ${n}A${r} ${i} 0 0 1 ${t - r} ${n}A${r} ${i} 0 0 1 ${t + r} ${n}Z`;
}
function Kd(e) {
	if (e.kind === "polyline" || e.kind === "polygon") return { points: e.points.map((e) => e.join(" ")).join(" ") };
	let t = {};
	for (let [n, r] of Object.entries(e)) n !== "kind" && (t[n] = String(r));
	return t;
}
//#endregion
//#region ../../packages/edi-motion/src/geometry.ts
var qd = q().min(-1e7).max(1e7), Jd = Y({
	x: qd,
	y: qd
}), Yd = Jd.extend({
	in: Jd.nullable(),
	out: Jd.nullable()
}), Xd = J(Y({
	closed: ys(),
	points: J(Yd).min(1).max(4e3)
})).min(1).max(4e3);
function Zd(e) {
	let t = 0;
	if (Array.isArray(e)) {
		if (e.length > 4e3) throw Error("Geometria excede 4000 contornos.");
		for (let n of e) if (typeof n == "object" && n && Array.isArray(n.points) && (t += n.points.length, t > 4e3)) throw Error("Geometria excede 4000 vértices.");
	}
	return t;
}
function Qd(e) {
	return Zd(e), Xd.parse(e, { jitless: !0 });
}
function $d(e, t) {
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
function ef(e) {
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
function tf(e, t, n, r) {
	if (!Number.isFinite(n) || n < 1e-6 || n > 100) throw Error("Tolerância de caminho inválida.");
	let i = e.points[0];
	if (!i) throw Error("Caminho vazio.");
	let a = [{
		...lu(t, i.x, i.y),
		distance: 0
	}], o = (e, t) => Math.hypot(e.x - t.x, e.y - t.y), s = (e, t) => ({
		x: (e.x + t.x) / 2,
		y: (e.y + t.y) / 2
	});
	function c(e) {
		if (--r.remaining < 0 || a.length >= 16384) throw Error("Caminho excede orçamento de amostragem.");
		let t = a.at(-1);
		if (!t) throw Error("Tabela vazia.");
		let n = o(t, e);
		n > 0 && a.push({
			...e,
			distance: t.distance + n
		});
	}
	function l(e, t, n, i, a, u) {
		if (--r.remaining < 0) throw Error("Caminho excede orçamento de avaliação.");
		if (o(e, t) + o(t, n) + o(n, i) - o(e, i) <= u) {
			c(i);
			return;
		}
		if (a >= 20) throw Error("Caminho não atingiu a tolerância dentro do limite de subdivisão.");
		let d = s(e, t), f = s(t, n), p = s(n, i), m = s(d, f), h = s(f, p), g = s(m, h);
		l(e, d, m, g, a + 1, u / 2), l(g, h, p, i, a + 1, u / 2);
	}
	for (let r = 1; r < e.points.length + +!!e.closed; r++) {
		let i = e.points[r - 1], a = e.points[r % e.points.length];
		if (!i || !a) throw Error("Segmento ausente.");
		let o = (e) => lu(t, e.x, e.y);
		i.out || a.in ? l(o(i), o(i.out ?? i), o(a.in ?? a), o(a), 0, n / Math.max(1, e.points.length - +!e.closed)) : c(o(a));
	}
	if (a.length < 2) throw Error("Seguir caminho requer comprimento positivo.");
	return a;
}
function nf(e, t) {
	if (!Number.isFinite(t) || t < 0 || t > 1) throw Error("Progresso de caminho fora de 0–1.");
	let n = e.at(-1);
	if (!n || e.length < 2) throw Error("Tabela de caminho vazia.");
	let r = n.distance * t, i = 0, a = e.length - 1;
	for (; a - i > 1;) {
		let t = Math.floor((i + a) / 2), n = e[t];
		if (!n) throw Error("Amostra ausente.");
		n.distance <= r ? i = t : a = t;
	}
	let o = e[i], s = e[a];
	if (!o || !s) throw Error("Amostra ausente.");
	let c = (r - o.distance) / (s.distance - o.distance), l = s.x - o.x, u = s.y - o.y;
	return {
		x: o.x + l * c,
		y: o.y + u * c,
		angle: Math.atan2(u, l) * 180 / Math.PI
	};
}
//#endregion
//#region ../../packages/edi-motion/src/affineSchema.ts
var rf = q().min(-1e7).max(1e7), af = Is([
	rf,
	rf,
	rf,
	rf,
	rf,
	rf
]), of = (e, t) => ({
	x: e,
	y: t,
	in: null,
	out: null
}), sf = (e) => ({
	x: e.x,
	y: e.y
}), cf = (e, t, n) => ({
	x: e.x + (t.x - e.x) * n,
	y: e.y + (t.y - e.y) * n
}), lf = (e, t) => ({
	x: 2 * e.x - t.x,
	y: 2 * e.y - t.y
}), uf = (e, t) => Math.hypot(e.x - t.x, e.y - t.y) < 1e-8;
function df(e, t) {
	let n = e[t];
	if (n === void 0 || !Number.isFinite(n)) throw Error("Parâmetros SVG incompletos/inválidos.");
	return n;
}
function ff(e, t) {
	let n = Math.abs(df(t, 0)), r = Math.abs(df(t, 1)), i = df(t, 2), a = df(t, 3), o = df(t, 4), s = df(t, 5), c = df(t, 6);
	if (![0, 1].includes(a) || ![0, 1].includes(o)) throw Error("Flags de arco inválidas.");
	if (uf(e, {
		x: s,
		y: c
	})) return [];
	if (!n || !r) return [{ end: of(s, c) }];
	let l = i * Math.PI / 180, u = Math.cos(l), d = Math.sin(l), f = (e.x - s) / 2, p = (e.y - c) / 2, m = u * f + d * p, h = -d * f + u * p, g = m * m / (n * n) + h * h / (r * r);
	g > 1 && (n *= Math.sqrt(g), r *= Math.sqrt(g));
	let _ = (a === o ? -1 : 1) * Math.sqrt(Math.max(0, (n * n * r * r - n * n * h * h - r * r * m * m) / (n * n * h * h + r * r * m * m))), v = _ * n * h / r, y = -_ * r * m / n, b = u * v - d * y + (e.x + s) / 2, x = d * v + u * y + (e.y + c) / 2, S = (m - v) / n, C = (h - y) / r, w = (-m - v) / n, T = (-h - y) / r, E = Math.atan2(C, S), D = Math.atan2(S * T - C * w, S * w + C * T);
	!o && D > 0 && (D -= 2 * Math.PI), o && D < 0 && (D += 2 * Math.PI);
	let O = Math.ceil(Math.abs(D) / (Math.PI / 2)), k = D / O, A = (e, t) => ({
		x: b + n * u * e - r * d * t,
		y: x + n * d * e + r * u * t
	}), j = [];
	for (let e = 0; e < O; e++) {
		let e = E + k, t = 4 / 3 * Math.tan(k / 4);
		j.push({
			c1: A(Math.cos(E) - t * Math.sin(E), Math.sin(E) + t * Math.cos(E)),
			c2: A(Math.cos(e) + t * Math.sin(e), Math.sin(e) - t * Math.cos(e)),
			end: {
				...of(0, 0),
				...A(Math.cos(e), Math.sin(e))
			}
		}), E = e;
	}
	let M = j.at(-1);
	if (!M) throw Error("Arco SVG numericamente degenerado.");
	return Object.assign(M.end, {
		x: s,
		y: c
	}), j;
}
function pf(e) {
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
	}, r = [], i, a = of(0, 0), o = "", s = "", c = null, l = 0, u = 0, d = () => {
		if (++u > 4e3) throw Error("O caminho excede 4000 vértices.");
	}, f = (e, t = null, n = null) => {
		if (!i) throw Error("O segmento precisa iniciar com M.");
		i.closed && (d(), i = {
			closed: !1,
			points: [of(a.x, a.y)]
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
			i.points.length > 1 && uf(e, t) && (e.in = t.in, i.points.pop()), i.closed = !0, a = e, o = "", s = "Z", c = null;
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
			...of(0, 0),
			...g(e, t)
		}), v = (e) => df(h, e);
		if (u === "M") d(), a = _(v(0), v(1)), i = {
			closed: !1,
			points: [a]
		}, r.push(i), o = p ? "l" : "L";
		else if (u === "L") f(_(v(0), v(1)));
		else if (u === "H") f(of(v(0) + (p ? a.x : 0), a.y));
		else if (u === "V") f(of(a.x, v(0) + (p ? a.y : 0)));
		else if (u === "C") f(_(v(4), v(5)), g(v(0), v(1)), g(v(2), v(3)));
		else if (u === "S") f(_(v(2), v(3)), ["C", "S"].includes(s) && a.in ? lf(a, a.in) : sf(a), g(v(0), v(1)));
		else if (u === "Q" || u === "T") {
			let e = u === "Q" ? g(v(0), v(1)) : ["Q", "T"].includes(s) && c ? lf(a, c) : sf(a), t = u === "Q" ? _(v(2), v(3)) : _(v(0), v(1));
			f(t, cf(a, e, 2 / 3), cf(t, e, 2 / 3)), c = e;
		} else if (u === "A") {
			let e = g(v(5), v(6));
			for (let t of ff(a, [
				...h.slice(0, 5),
				e.x,
				e.y
			])) f(t.end, t.c1 ?? null, t.c2 ?? null);
		}
		["Q", "T"].includes(u) || (c = null), s = u;
	}
	if (!r.length) throw Error("Caminho vazio.");
	return Qd(r);
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/patterns.ts
var mf = q().min(-1e5).max(1e5), hf = q().positive().max(1e5), gf = q().min(0).max(1), _f = G().regex(/^#[\da-f]{6}$/i).transform((e) => e.toLowerCase()), vf = 4e3, yf = 1e5;
function bf(e) {
	return e.shapes.reduce((e, t) => e + pf(t.d).reduce((e, t) => e + t.points.length, 0), 0);
}
var xf = Y({
	d: G().min(1).max(2e5),
	fill: As([Z("none"), _f]),
	fillOpacity: gf,
	fillRule: X(["nonzero", "evenodd"]),
	stroke: As([Z("none"), _f]),
	strokeOpacity: gf,
	strokeWidth: q().min(0).max(1e4),
	strokeLinecap: X([
		"butt",
		"round",
		"square"
	]),
	strokeLinejoin: X([
		"miter",
		"round",
		"bevel"
	]),
	opacity: gf,
	transform: af.optional()
}), Sf = G().regex(/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/), Cf = Y({
	kind: Z("pattern"),
	units: X(["objectBoundingBox", "userSpaceOnUse"]),
	contentUnits: X(["objectBoundingBox", "userSpaceOnUse"]),
	x: mf,
	y: mf,
	width: hf,
	height: hf,
	viewBox: Is([
		mf,
		mf,
		hf,
		hf
	]).optional(),
	preserveAspectRatio: Sf.optional(),
	transform: af.optional(),
	shapes: J(xf).min(1).max(64)
}).superRefine((e, t) => {
	for (let n of [e.transform, ...e.shapes.map((e) => e.transform)]) if (n) try {
		cu(n);
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
			n += pf(r.d).reduce((e, t) => e + t.points.length, 0);
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
		message: `Padrão excede ${vf} vértices por tile.`
	});
});
function wf(e) {
	let t = Cf.parse(e);
	return `edi-pattern-${Oc(Bc(new TextEncoder().encode(JSON.stringify(t))))}`;
}
var Tf = (e) => `matrix(${e.join(" ")})`;
function Ef(e) {
	let t = Cf.parse(e), n = {
		id: wf(t),
		patternUnits: t.units,
		patternContentUnits: t.contentUnits,
		x: String(t.x),
		y: String(t.y),
		width: String(t.width),
		height: String(t.height)
	};
	return t.viewBox && (n.viewBox = t.viewBox.join(" ")), t.preserveAspectRatio && (n.preserveAspectRatio = t.preserveAspectRatio), t.transform && (n.patternTransform = Tf(t.transform)), {
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
				...e.transform ? { transform: Tf(e.transform) } : {}
			},
			children: []
		}))
	};
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/gradients.ts
var Df = q().min(-1e5).max(1e5), Of = {
	units: X(["objectBoundingBox", "userSpaceOnUse"]),
	spread: X([
		"pad",
		"reflect",
		"repeat"
	]),
	transform: af.optional(),
	stops: Cs().refine((e) => Array.isArray(e) && e.length >= 2 && e.length <= 32, {
		error: "Gradiente requer 2–32 paradas.",
		abort: !0
	}).pipe(J(Y({
		offset: q().min(0).max(1),
		color: G().regex(/^#[\da-f]{6}$/i).transform((e) => e.toLowerCase()),
		opacity: q().min(0).max(1)
	})).min(2).max(32))
}, kf = Ms("kind", [Y({
	...Of,
	kind: Z("linear"),
	x1: Df,
	y1: Df,
	x2: Df,
	y2: Df
}), Y({
	...Of,
	kind: Z("radial"),
	cx: Df,
	cy: Df,
	r: q().positive().max(1e5),
	fx: Df,
	fy: Df
})]).superRefine((e, t) => {
	if (e.transform) try {
		cu(e.transform);
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
}), Af = As([kf, Cf]), jf = Y({
	fill: Af.optional(),
	stroke: Af.optional()
}).refine((e) => e.fill || e.stroke, "Informe ao menos um gradiente ou padrão.");
function Mf(e) {
	return e.kind === "pattern" ? wf(e) : Ff(e);
}
function Nf(e) {
	return e.kind === "pattern" ? Ef(e) : If(e);
}
function Pf(e) {
	return e?.fill?.kind === "pattern" || e?.stroke?.kind === "pattern";
}
function Ff(e) {
	let t = kf.parse(e), n = JSON.stringify(t);
	return `edi-gradient-${Oc(Bc(new TextEncoder().encode(n)))}`;
}
function If(e) {
	let t = kf.parse(e), n = {
		id: Ff(t),
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
function Lf(e) {
	let t = /* @__PURE__ */ new Map(), n = 0, r = 0;
	for (let i of e) {
		if (++n > 12e3) throw Error("Orçamento de pinturas inspecionadas excedido.");
		for (let e of [i?.fill, i?.stroke]) if (e) {
			let n = Nf(e), i = n.attrs.id;
			if (!i) throw Error("Identidade de gradiente ausente.");
			if (e.kind === "pattern" && !t.has(i) && (r += bf(e), r > 1e5)) throw Error(`Padrões distintos excedem ${yf} vértices por cena/documento.`);
			if (t.set(i, n), t.size > 256) throw Error("Limite de 256 gradientes/padrões distintos por cena/documento.");
		}
	}
	return [...t.values()];
}
function Rf(e) {
	let t = {};
	return e?.fill && (t.fill = `url(#${Mf(e.fill)})`), e?.stroke && (t.stroke = `url(#${Mf(e.stroke)})`), t;
}
var zf = /* @__PURE__ */ new Set([
	"g",
	"path",
	"rect",
	"circle",
	"ellipse",
	"line",
	"polyline",
	"polygon",
	"text"
]), Bf = [
	"fill",
	"fill-opacity",
	"stroke",
	"stroke-width",
	"stroke-opacity",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-dasharray"
], Vf = {
	"": 1,
	px: 1,
	pt: 4 / 3,
	pc: 16,
	mm: 96 / 25.4,
	cm: 96 / 2.54,
	in: 96
};
function Hf(e) {
	let t = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*([a-z]*)\s*$/i.exec(e ?? "1"), n = t ? Vf[(t[2] ?? "").toLowerCase()] : void 0, r = t && n !== void 0 ? Number(t[1]) * n : NaN;
	if (!Number.isFinite(r) || r < 0 || r > 1e7) throw Error("Contorno de fonte de máscara pintada precisa de largura absoluta (px, pt, mm…), não relativa (em, %).");
	return r;
}
function Uf(e, t) {
	let n = { ...t };
	for (let t of e) {
		for (let e of Bf) {
			let r = t.attrs?.[e];
			r !== void 0 && r !== "inherit" && r !== "unset" && (n[e] = r);
		}
		for (let e of ["fill", "stroke"]) {
			let r = t.gradients?.[e];
			r && (n[e] = `url(#${Mf(r)})`);
		}
	}
	return n;
}
function Wf(e, t, n = {}) {
	let r = /* @__PURE__ */ new Map();
	for (let t of e) r.set(t.id, t);
	let i = [];
	for (let e = r.get(t); e; e = e.parentId ? r.get(e.parentId) : void 0) if (i.unshift(e), i.length > 33) throw Error("Herança da fonte de máscara profunda demais.");
	return Uf(i, n);
}
function Gf(e) {
	return !!e?.mask?.mode && e.mask.mode !== "silhouette";
}
function Kf(e, t, n = {}) {
	let r = new Set([...t.values()].flatMap((e) => Gf(e) && e.mask ? [e.mask.sourceId] : [])), i = /* @__PURE__ */ new Map();
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
		let o = Uf(t, n);
		o.stroke !== void 0 && o.stroke !== "none" && Hf(o["stroke-width"]), i.set(e, o);
	}
	return i;
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/filters.ts
var qf = q().min(-1e4).max(1e4), Jf = Is([q().min(0).max(200), q().min(0).max(200)]), Yf = q().min(0).max(1), Xf = G().regex(/^#[\da-f]{6}$/i).transform((e) => e.toLowerCase()), Zf = As([
	Z("SourceGraphic"),
	Z("SourceAlpha"),
	q().int().min(0).max(15)
]), Qf = Ms("kind", [
	Y({
		kind: Z("blur"),
		in: Zf,
		stdDeviation: Jf,
		edgeMode: X([
			"none",
			"duplicate",
			"wrap"
		])
	}),
	Y({
		kind: Z("offset"),
		in: Zf,
		dx: qf,
		dy: qf
	}),
	Y({
		kind: Z("dropShadow"),
		in: Zf,
		dx: qf,
		dy: qf,
		stdDeviation: Jf,
		color: Xf,
		opacity: Yf
	}),
	Y({
		kind: Z("colorMatrix"),
		in: Zf,
		type: X([
			"matrix",
			"saturate",
			"hueRotate",
			"luminanceToAlpha"
		]),
		values: J(q().min(-36e3).max(36e3)).max(20)
	}),
	Y({
		kind: Z("flood"),
		color: Xf,
		opacity: Yf
	}),
	Y({
		kind: Z("blend"),
		in: Zf,
		in2: Zf,
		mode: X([
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
	Y({
		kind: Z("composite"),
		in: Zf,
		in2: Zf,
		operator: X([
			"over",
			"in",
			"out",
			"atop",
			"xor",
			"lighter",
			"arithmetic"
		]),
		k: Is([
			qf,
			qf,
			qf,
			qf
		]).optional()
	}),
	Y({
		kind: Z("merge"),
		inputs: J(Zf).min(1).max(16)
	})
]), $f = q().min(-1e5).max(1e5), ep = Y({
	units: X(["objectBoundingBox", "userSpaceOnUse"]),
	primitiveUnits: X(["userSpaceOnUse", "objectBoundingBox"]),
	x: $f,
	y: $f,
	width: q().positive().max(1e5),
	height: q().positive().max(1e5),
	colorInterpolation: X(["linearRGB", "sRGB"]),
	primitives: J(Qf).min(1).max(16)
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
function tp(e) {
	let t = ep.parse(e);
	return `edi-filter-${Oc(Bc(new TextEncoder().encode(JSON.stringify(t))))}`;
}
var np = (e) => typeof e == "number" ? `edi-r${e}` : e;
function rp(e) {
	let t = ep.parse(e);
	return {
		tag: "filter",
		attrs: {
			id: tp(t),
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
						in: np(e.in),
						stdDeviation: e.stdDeviation.join(" "),
						edgeMode: e.edgeMode,
						...n
					},
					children: []
				};
				case "offset": return {
					tag: "feOffset",
					attrs: {
						in: np(e.in),
						dx: String(e.dx),
						dy: String(e.dy),
						...n
					},
					children: []
				};
				case "dropShadow": return {
					tag: "feDropShadow",
					attrs: {
						in: np(e.in),
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
						in: np(e.in),
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
						in: np(e.in),
						in2: np(e.in2),
						mode: e.mode,
						...n
					},
					children: []
				};
				case "composite": return {
					tag: "feComposite",
					attrs: {
						in: np(e.in),
						in2: np(e.in2),
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
						attrs: { in: np(e) },
						children: []
					}))
				};
			}
			throw Error(`Primitiva de filtro desconhecida: ${JSON.stringify(e)}`);
		})
	};
}
function ip(e) {
	let t = /* @__PURE__ */ new Map(), n = 0;
	for (let r of e) {
		if (++n > 12e3) throw Error("Orçamento de filtros inspecionados excedido.");
		if (!r) continue;
		let e = rp(r), i = e.attrs.id;
		if (!i) throw Error("Identidade de filtro ausente.");
		if (t.set(i, e), t.size > 64) throw Error("Limite de 64 filtros distintos por cena/documento.");
	}
	return [...t.values()];
}
function ap(e) {
	return e ? { filter: `url(#${tp(e)})` } : {};
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/nativeEffectSources.ts
function op(e, t) {
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
		let r = Wd(t.tag, t.attrs);
		if (o += r.kind === "polygon" || r.kind === "polyline" ? r.points.length : 8, o > 1e5) throw Error("Primitivas de efeitos excedem orçamento agregado de vértices.");
		a.set(e, r);
	}
	return a;
}
var sp = J(Y({
	id: G().regex(/^paint-[\w-]{1,100}$/),
	kind: X(["fill", "stroke"]),
	color: G().regex(/^#[\da-f]{6}$/i).transform((e) => e.toLowerCase()),
	paint: Af.optional(),
	opacity: q().min(0).max(1),
	visible: ys(),
	name: G().trim().min(1).max(120).optional(),
	width: q().min(0).max(1e4).optional(),
	linecap: X([
		"butt",
		"round",
		"square"
	]).optional(),
	linejoin: X([
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
}), cp = /* @__PURE__ */ new Set([
	"path",
	"rect",
	"circle",
	"ellipse",
	"line",
	"polyline",
	"polygon"
]), lp = /* @__PURE__ */ new Set([
	"fill",
	"fill-opacity",
	"stroke",
	"stroke-opacity",
	"stroke-width",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-miterlimit",
	"paint-order",
	"opacity",
	"filter"
]), up = "data-edi-paint-layer";
function dp(e) {
	let t = e.paint ? `url(#${Mf(e.paint)})` : e.color;
	return e.kind === "fill" ? {
		fill: t,
		"fill-opacity": String(e.opacity),
		stroke: "none"
	} : {
		fill: "none",
		stroke: t,
		"stroke-opacity": String(e.opacity),
		"stroke-width": String(e.width ?? 1),
		...e.linecap ? { "stroke-linecap": e.linecap } : {},
		...e.linejoin ? { "stroke-linejoin": e.linejoin } : {}
	};
}
function fp(e) {
	return Object.fromEntries(Object.entries(e).filter(([e]) => !lp.has(e)));
}
function pp(e) {
	return (e ?? []).filter((e) => e.visible);
}
function mp(e) {
	return pp(e).flatMap((e) => e.paint ? [e.paint] : []);
}
function hp(e) {
	let t = [];
	for (let n = e.nextElementSibling; n; n = n.nextElementSibling) n.hasAttribute("data-edi-paint-layer") && t.push(n);
	return t;
}
var gp = (e, t = "") => `${e}#${t}`;
function _p(e, t) {
	let n = e.get(gp(t));
	return (r) => {
		let i = e.get(gp(t, r)) ?? n;
		return i && ef(i);
	};
}
function vp(e, t, n) {
	let r = [[e, t]];
	for (let i of hp(e)) r.push([i, n?.(i.getAttribute("data-edi-paint-layer") ?? "") ?? t]);
	for (let [e, t] of r) t === null ? e.removeAttribute("d") : e.getAttribute("d") !== t && e.setAttribute("d", t);
}
//#endregion
//#region ../../packages/edi-motion/src/rig/kinematics.ts
function yp(e, t, n = { remaining: 2e6 }) {
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
		return ou(n.parentId === null ? au() : l(n.parentId, t + 1), n.basis ?? au());
	}
	function l(e, t = 0) {
		if (--n.remaining < 0 || t > 32) throw Error("Rig excede o orçamento de avaliação/profundidade.");
		let r = i.get(e);
		if (r) return r;
		if (a.has(e)) throw Error("Hierarquia de rig cíclica.");
		a.add(e);
		let l = ou(ou(c(e, t), uu(s(e))), o(e).attributeMatrix ?? au());
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
			return lu(l(e), t, n);
		},
		set(e, t) {
			let n = {
				...s(e),
				...t
			};
			for (let [e, t] of Object.entries(Ku)) {
				let r = Reflect.get(n, e);
				if (r !== void 0 && (typeof r != "number" || !Number.isFinite(r) || r < t[0] || r > t[1])) throw Error("Restrição produz pose fora dos limites.");
			}
			r.set(e, n), i.clear();
		}
	};
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/vectorEffects.ts
var bp = Y({
	sourceId: Q,
	rule: X(["nonzero", "evenodd"])
}), xp = Y({
	clip: bp.optional(),
	mask: bp.extend({
		opacity: q().min(0).max(1),
		mode: X([
			"silhouette",
			"alpha",
			"luminance"
		]).optional()
	}).optional()
}).refine((e) => e.clip !== void 0 || e.mask !== void 0, { error: "Informe um recorte ou máscara." });
function Sp(e) {
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
		let r = xp.parse(n.effects);
		if (n.tag === "svg") throw Error("Aplique o efeito à instância, não ao viewport.");
		for (let n of ["clip", "mask"]) {
			let u = r[n];
			if (!u) continue;
			let d = t.get(u.sourceId);
			if (d?.nativeShape && !s.has(u.sourceId)) {
				let e = Ud.parse(d.nativeShape), n = Qd(pf(Gd(e)));
				if (e.kind !== d.tag || d.geometry && ef(d.geometry) !== ef(n)) throw Error("Primitiva nativa de efeito não corresponde à geometria/tag.");
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
				if (ef(pf(d.pathData)) !== ef(d.geometry)) throw Error("Sintaxe nativa do efeito não corresponde à geometria.");
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
function Cp(e, t, n, r, i) {
	if (!t.size) return Sp(/* @__PURE__ */ new Map());
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
	return Sp(a);
}
function wp(e, t, n = /* @__PURE__ */ new Map(), r, i = { remaining: 2e6 }) {
	if (!e.references.length) return [];
	let a = r ? new Map([...e.objects].map(([e, t]) => {
		let n = r.get(e);
		return [e, n ? {
			...t,
			basis: ou(n, t.basis ?? au())
		} : t];
	})) : e.objects, o = yp(a, t, i), s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = new TextEncoder();
	function u(e, t, n) {
		let r = !n && t === "" ? 1026 : c.get(e);
		if (r === void 0 && (r = 1024 + l.encode(JSON.stringify(n ?? t)).length, c.set(e, r)), i.remaining -= r, i.remaining < 0) throw Error("Efeitos excedem orçamento agregado de expansão/bytes de desenho.");
	}
	return e.references.map((e) => {
		let t = a.get(e.sourceId);
		if (!t) throw Error("Fonte do efeito ausente.");
		if (t.nativeShape && n.has(e.sourceId)) throw Error("Deformação de primitiva nativa não pertence ao perfil de efeitos; converta explicitamente para caminho.");
		let r = n.get(e.sourceId) ?? t.geometry;
		if (!r) throw Error("Geometria da fonte do efeito ausente.");
		let c = ou(o.pre(e.targetId), uu(o.pose(e.targetId)));
		if (!su(c) || r.length === 0) return u(e.sourceId, "", t.nativeShape), {
			targetId: e.targetId,
			kind: e.kind,
			rule: e.rule,
			d: "",
			...t.nativeShape ? { nativeShape: t.nativeShape } : {},
			matrix: au(),
			opacity: 0,
			region: {
				x: 0,
				y: 0,
				width: 1,
				height: 1
			}
		};
		let l = ou(cu(c), o.world(e.sourceId)), d = Infinity, f = Infinity, p = -Infinity, m = -Infinity;
		for (let e of r) for (let t of e.points) for (let e of [
			t,
			t.in,
			t.out
		]) {
			if (!e) continue;
			if (--i.remaining < 0) throw Error("Efeitos excedem o orçamento de avaliação.");
			let t = lu(l, e.x, e.y);
			if (!Number.isFinite(t.x) || !Number.isFinite(t.y) || Math.max(Math.abs(t.x), Math.abs(t.y)) > 0xe8d4a51000) throw Error("Efeito fora do limite numérico.");
			d = Math.min(d, t.x), f = Math.min(f, t.y), p = Math.max(p, t.x), m = Math.max(m, t.y);
		}
		if (!Number.isFinite(d)) throw Error("Fonte do efeito vazia.");
		let h = t.nativeShape ? "" : s.get(e.sourceId);
		h === void 0 && (h = n.has(e.sourceId) ? ef(r) : t?.pathData ?? ef(r), s.set(e.sourceId, h)), u(e.sourceId, h, t.nativeShape);
		let g = e.mode ? t.paint : void 0, _ = g?.stroke !== void 0 && g.stroke !== "none" ? Hf(g["stroke-width"]) * 2 * Math.max(Math.hypot(l[0], l[1]), Math.hypot(l[2], l[3])) : 0;
		if (!Number.isFinite(_)) throw Error("Contorno da máscara fora do limite numérico.");
		let v = Math.max(1, Math.abs(d) * 1e-12, Math.abs(p) * 1e-12, Math.abs(f) * 1e-12, Math.abs(m) * 1e-12) + _;
		return {
			targetId: e.targetId,
			kind: e.kind,
			rule: e.rule,
			d: h,
			...t.nativeShape ? { nativeShape: t.nativeShape } : {},
			matrix: l,
			opacity: e.kind === "mask" ? e.opacity * o.pose(e.sourceId).opacity / 100 : 1,
			region: {
				x: d - v,
				y: f - v,
				width: p - d + 2 * v,
				height: m - f + 2 * v
			},
			...e.mode && g ? {
				mode: e.mode,
				paint: g
			} : {}
		};
	});
}
function Tp(e) {
	return `edi-effect-${Oc(Bc(new TextEncoder().encode(JSON.stringify(e))))}`;
}
function Ep(e, t = Tp(e)) {
	if (!/^edi-effect-[\w-]{1,140}$/.test(t)) throw Error("ID de efeito inválido.");
	return {
		tag: e.kind === "clip" ? "clipPath" : "mask",
		attrs: e.kind === "clip" ? {
			id: t,
			clipPathUnits: "userSpaceOnUse"
		} : {
			id: t,
			maskUnits: "userSpaceOnUse",
			maskContentUnits: "userSpaceOnUse",
			"mask-type": e.mode === "luminance" ? "luminance" : "alpha",
			x: String(e.region.x),
			y: String(e.region.y),
			width: String(e.region.width),
			height: String(e.region.height)
		},
		children: [{
			tag: e.nativeShape?.kind ?? "path",
			attrs: {
				...e.nativeShape ? Kd(e.nativeShape) : { d: e.d },
				transform: `matrix(${e.matrix.join(" ")})`,
				"clip-rule": e.rule,
				"fill-rule": e.rule,
				...e.paint ? e.paint : { fill: "#ffffff" },
				...e.nativeShape && !e.paint ? { stroke: "none" } : {},
				...e.kind === "mask" ? { opacity: String(e.opacity) } : {}
			},
			children: []
		}]
	};
}
function Dp(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		let e = t.get(n.targetId) ?? {};
		e[n.kind === "clip" ? "clip-path" : "mask"] = `url(#${Tp(n)})`, t.set(n.targetId, e);
	}
	return t;
}
//#endregion
//#region ../../packages/edi-motion/src/layout/model.ts
var Op = q().min(0).max(1e5), kp = q().min(-1e5).max(1e5), Ap = Ms("kind", [
	Y({
		kind: Z("fixed"),
		value: Op
	}),
	Y({ kind: Z("hug") }),
	Y({
		kind: Z("fill"),
		weight: q().min(.001).max(1e3)
	}),
	Y({
		kind: Z("percent"),
		value: q().min(0).max(1)
	})
]), jp = Y({
	axis: X([
		"x",
		"y",
		"both"
	]),
	friction: q().min(1).max(30),
	spring: q().min(1).max(1e3),
	damping: q().min(1).max(100),
	bounce: ys()
}), Mp = Y({
	flow: X([
		"row",
		"column",
		"grid"
	]),
	direction: X(["ltr", "rtl"]),
	wrap: ys(),
	padding: Is([
		Op,
		Op,
		Op,
		Op
	]),
	gap: Is([Op, Op]),
	justify: X([
		"start",
		"center",
		"end",
		"space-between",
		"space-around",
		"space-evenly"
	]),
	align: X([
		"start",
		"center",
		"end",
		"stretch"
	]),
	columns: As([Y({
		kind: Z("fixed"),
		count: q().int().min(1).max(24)
	}), Y({
		kind: Z("auto-fit"),
		minWidth: q().min(.1).max(1e5)
	})]).optional(),
	clip: ys(),
	scroll: jp.nullable()
}), Np = Y({
	targetId: Q,
	width: Ap,
	height: Ap,
	minWidth: Op,
	maxWidth: Op,
	minHeight: Op,
	maxHeight: Op,
	margin: Is([
		Op,
		Op,
		Op,
		Op
	]),
	alignSelf: X([
		"auto",
		"start",
		"center",
		"end",
		"stretch"
	]),
	aspectRatio: q().min(1e-4).max(1e4).nullable(),
	position: Ms("kind", [Y({ kind: Z("flow") }), Y({
		kind: Z("absolute"),
		left: kp.nullable(),
		right: kp.nullable(),
		top: kp.nullable(),
		bottom: kp.nullable()
	})])
}), Pp = X([
	"fixed",
	"hug",
	"fill"
]), Fp = Y({
	width: Pp,
	height: Pp
}), Ip = Y({
	version: Z(1),
	root: Mp,
	rootSize: Fp.optional(),
	containers: J(Y({
		targetId: Q,
		config: Mp
	})).max(2e3),
	items: J(Np).max(2e3)
});
function Lp(e) {
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
function Rp(e, t) {
	if (typeof e == "object" && e && ("items" in e && Array.isArray(e.items) && e.items.length > 2e3 || "containers" in e && Array.isArray(e.containers) && e.containers.length > 2e3)) throw Error("Orçamento de layout excedido.");
	if (t.size > 2e3) throw Error("Layout excede o orçamento de objetos.");
	let n = Ip.parse(e, { jitless: !0 }), r = new Map(n.containers.map((e) => [e.targetId, e.config])), i = new Map(n.items.map((e) => [e.targetId, e]));
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
		let t = i.get(e) ?? Lp(e);
		if (t.position.kind !== "absolute" && (a.width === "hug" && ["fill", "percent"].includes(t.width.kind) || a.height === "hug" && ["fill", "percent"].includes(t.height.kind))) throw Error("Hug/fill ou percent cria dependência circular; defina o tamanho da prancheta.");
	}
	for (let [e, n] of r) {
		let r = i.get(e) ?? Lp(e);
		if (n.flow === "grid" && n.columns?.kind === "auto-fit" && r.width.kind === "hug") throw Error("Grade auto-fit com largura hug é circular.");
		for (let [n, a] of t) {
			if (a.parentId !== e) continue;
			let t = i.get(n) ?? Lp(n);
			if (t.position.kind !== "absolute" && (r.width.kind === "hug" && ["fill", "percent"].includes(t.width.kind) || r.height.kind === "hug" && ["fill", "percent"].includes(t.height.kind))) throw Error("Hug/fill ou percent cria dependência circular; defina o tamanho do contêiner.");
		}
	}
	return n;
}
//#endregion
//#region ../../packages/edi-motion/src/geometry/cubic.ts
var zp = (e) => ({
	x: e.x,
	y: e.y
}), Bp = (e, t, n) => ({
	x: e.x + (t.x - e.x) * n,
	y: e.y + (t.y - e.y) * n
});
function Vp(e) {
	if (!Number.isFinite(e) || e < 0 || e > 1) throw Error("Parâmetro de curva fora de 0–1.");
}
function Hp(e, t) {
	let n = e.points[t], r = e.points[(t + 1) % e.points.length];
	if (!Number.isInteger(t) || t < 0 || !n || !r || !e.closed && t >= e.points.length - 1) throw Error("Segmento de curva ausente.");
	return [
		zp(n),
		zp(n.out ?? n),
		zp(r.in ?? r),
		zp(r)
	];
}
function Up(e, t) {
	Vp(t);
	let n = () => [
		zp(e[0]),
		zp(e[1]),
		zp(e[2]),
		zp(e[3])
	];
	if (t === 0) return {
		left: [
			zp(e[0]),
			zp(e[0]),
			zp(e[0]),
			zp(e[0])
		],
		right: n()
	};
	if (t === 1) return {
		left: n(),
		right: [
			zp(e[3]),
			zp(e[3]),
			zp(e[3]),
			zp(e[3])
		]
	};
	let [r, i, a, o] = e, s = Bp(r, i, t), c = Bp(i, a, t), l = Bp(a, o, t), u = Bp(s, c, t), d = Bp(c, l, t), f = Bp(u, d, t);
	return {
		left: [
			zp(r),
			s,
			u,
			zp(f)
		],
		right: [
			f,
			d,
			l,
			zp(o)
		]
	};
}
function Wp(e, t, n) {
	if (Vp(t), Vp(n), t > n) throw Error("Intervalo de curva invertido.");
	if (t === n) {
		let n = Up(e, t).left[3];
		return [
			zp(n),
			zp(n),
			zp(n),
			zp(n)
		];
	}
	let r = Up(e, n).left;
	return t === 0 ? r : Up(r, t / n).right;
}
//#endregion
//#region ../../packages/edi-motion/src/geometry/curveMeasure.ts
function Gp(e) {
	if (!Number.isFinite(e) || e < 1e-14 || e > 100) throw Error("Tolerância de medição fora do perfil numérico.");
}
function Kp(e) {
	if (--e.remaining < 0) throw Error("Medição de curva excede orçamento de trabalho.");
}
var qp = (e, t) => Math.hypot(t.x - e.x, t.y - e.y);
function Jp(e, t, n, r = 16384) {
	if (Gp(t), !Number.isInteger(n.remaining) || n.remaining < 0 || n.remaining > 2e6) throw Error("Orçamento de medição inválido.");
	if (!Number.isInteger(r) || r < 1 || r > 16384) throw Error("Orçamento de folhas de medição inválido.");
	let i = e[0], a = [
		{
			x: 0,
			y: 0
		},
		{
			x: e[1].x - i.x,
			y: e[1].y - i.y
		},
		{
			x: e[2].x - i.x,
			y: e[2].y - i.y
		},
		{
			x: e[3].x - i.x,
			y: e[3].y - i.y
		}
	], o = [], s = [], c = 0, l = 0, u = 0;
	function d(e, t, r, i) {
		Kp(n);
		let a = qp(e[0], e[3]), o = Math.max(a, qp(e[0], e[1]) + qp(e[1], e[2]) + qp(e[2], e[3]));
		if (!Number.isFinite(o)) throw Error("Comprimento de curva não finito.");
		return {
			curve: e,
			t0: t,
			t1: r,
			depth: i,
			lower: a,
			upper: o,
			error: (o - a) / 2
		};
	}
	let f = (e, t) => e.error > t.error || e.error === t.error && e.t0 < t.t0;
	function p(e) {
		if (Kp(n), s.length >= r) throw Error("Medição excede orçamento de folhas.");
		let t = s.length;
		for (s.push(e); t > 0;) {
			Kp(n);
			let r = Math.floor((t - 1) / 2), i = s[r];
			if (!i) throw Error("Fila de medição inconsistente.");
			if (!f(e, i)) break;
			s[t] = i, t = r;
		}
		s[t] = e;
	}
	function m() {
		Kp(n);
		let e = s[0], t = s.pop();
		if (!e || !t) throw Error("Fila de medição vazia.");
		if (s.length) {
			let e = 0;
			for (; e * 2 + 1 < s.length;) {
				Kp(n);
				let r = e * 2 + 1, i = s[r], a = s[r + 1];
				if (!i) throw Error("Fila de medição inconsistente.");
				let o = a && f(a, i) ? a : i;
				if (o === a && r++, !f(o, t)) break;
				s[e] = o, e = r;
			}
			s[e] = t;
		}
		return e;
	}
	let h = d(a, 0, 1, 0);
	p(h);
	let g = h.error;
	for (;;) {
		if (g <= t) {
			g = 0;
			for (let e of s) Kp(n), g += e.error;
			if (g <= t) break;
		}
		let e = m();
		if (e.depth >= 20) throw Error("Curva não atingiu a precisão de comprimento solicitada.");
		let r = Up(e.curve, .5), i = (e.t0 + e.t1) / 2, a = d(r.left, e.t0, i, e.depth + 1), o = d(r.right, i, e.t1, e.depth + 1);
		g += a.error + o.error - e.error, p(a), p(o);
	}
	s.sort((e, t) => (Kp(n), e.t0 - t.t0));
	for (let e of s) {
		Kp(n);
		let t = (e.lower + e.upper) / 2;
		o.push({
			curve: e.curve,
			t0: e.t0,
			t1: e.t1,
			start: c,
			length: t
		}), c += t, l += e.lower, u += e.upper;
	}
	let _ = Math.max(g, (u - l) / 2);
	if (_ > t) throw Error("Precisão acumulada excede a tolerância de medição.");
	return {
		length: c,
		lower: l,
		upper: u,
		error: _,
		leaves: o
	};
}
function Yp(e, t, n, r) {
	if (Gp(n), n < 8e-14) throw Error("Tolerância de inversão insuficiente para medir seus intervalos.");
	if (!Number.isFinite(t) || t < 0 || t > e.length || !(e.length > 0)) throw Error("Distância de curva fora do intervalo medido.");
	if (t === 0) return 0;
	if (t === e.length) return 1;
	let i = 0, a = e.leaves.length - 1;
	for (; i < a;) {
		Kp(r);
		let n = Math.floor((i + a) / 2), o = e.leaves[n];
		if (!o) throw Error("Folha de medição ausente.");
		o.start + o.length < t ? i = n + 1 : a = n;
	}
	let o = e.leaves[i];
	if (!o) throw Error("Folha de medição ausente.");
	let s = Math.max(0, Math.min(o.length, t - o.start)), c = 0, l = 1;
	for (let e = 0; e < 64; e++) {
		Kp(r);
		let e = (c + l) / 2, t = Jp(Wp(o.curve, 0, e), n / 8, r);
		if (Math.abs(t.length - s) + t.error <= n / 2) return o.t0 + (o.t1 - o.t0) * e;
		t.length < s ? c = e : l = e;
	}
	throw Error("Inversão de comprimento não atingiu a precisão solicitada.");
}
//#endregion
//#region ../../packages/edi-motion/src/geometry/trimMeasure.ts
function Xp(e, t, n) {
	Zd(e);
	let r = 0;
	for (let t of e) r += t.points.length - +!t.closed;
	let i = t / 8 / Math.max(1, r), a = [], o = 0, s = 0;
	for (let [t, r] of e.entries()) {
		let e = {
			index: t,
			source: r,
			start: o,
			end: o,
			segments: []
		}, c = r.points.length - +!r.closed;
		for (let t = 0; t < c; t++) {
			if (--n.remaining < 0) throw Error("Trim excede orçamento de medição.");
			if (s >= 16384) throw Error("Trim excede orçamento agregado de folhas.");
			let a = Hp(r, t), c = Jp(a, i, n, 16384 - s), l = r.points[t], u = r.points[(t + 1) % r.points.length];
			if (!l || !u) throw Error("Segmento de trim ausente.");
			s += c.leaves.length, e.segments.push({
				curve: a,
				straight: !l.out && !u.in,
				measured: c,
				start: o,
				end: o + c.length
			}), o += c.length;
		}
		e.end = o, a.push(e);
	}
	return {
		length: o,
		contours: a
	};
}
//#endregion
//#region ../../packages/edi-motion/src/geometry/trimGeometry.ts
function Zp(e, t = 1) {
	if (e.remaining -= t, e.remaining < 0) throw Error("Trim excede orçamento de extração.");
}
var Qp = (e) => ({
	x: e.x,
	y: e.y,
	in: null,
	out: null
});
function $p(e, t, n) {
	Zd(e);
	let { start: r, end: i, offset: a, tolerance: o, mode: s } = t;
	if (![r, i].every((e) => Number.isFinite(e) && e >= 0 && e <= 1) || !Number.isFinite(a) || Math.abs(a) > 36e3 || !Number.isFinite(o) || o < 1e-6 || o > 100 || s !== "parallel" && s !== "sequential") throw Error("Configuração de trim fora do perfil.");
	if (!Number.isInteger(n.remaining) || n.remaining < 0 || n.remaining > 2e6) throw Error("Orçamento de trim inválido.");
	Zp(n);
	let c = Math.min(r, i), l = Math.max(r, i) - c;
	if (l === 1) return { kind: "identity" };
	if (l === 0 || !e.length) return {
		kind: "geometry",
		geometry: []
	};
	let u = Xp(e, o, n);
	if (!u.length) return {
		kind: "geometry",
		geometry: []
	};
	let d = (c + (a % 360 + 360) % 360 / 360) % 1, f = d + l, p = f <= 1 ? [[d, f]] : [[d, 1], [0, f - 1]], m = 0, h = [];
	function g(e, t, r) {
		let i = [];
		for (let a of e) {
			if (Zp(n), a.end <= a.start || r <= a.start || t >= a.end) continue;
			if (t <= a.start && r >= a.end) {
				Zp(n, a.source.points.length * 3), i.push({
					source: a,
					contour: structuredClone(a.source)
				});
				continue;
			}
			let e = {
				closed: !1,
				points: []
			};
			for (let i of a.segments) {
				if (Zp(n), i.end <= i.start || r <= i.start || t >= i.end) continue;
				let a = i.measured.length, s = Math.max(0, t - i.start), c = Math.min(a, r - i.start), l = t <= i.start ? 0 : Yp(i.measured, s, o / 4, n), u = r >= i.end ? 1 : Yp(i.measured, c, o / 4, n), d = Wp(i.curve, l, u);
				Zp(n, 6);
				let f = e.points.at(-1);
				if (f || (f = Qp(d[0]), e.points.push(f)), f.x !== d[0].x || f.y !== d[0].y) throw Error("Extração de trim perdeu continuidade de segmento.");
				f.out = i.straight ? null : { ...d[1] };
				let p = Qp(d[3]);
				if (p.in = i.straight ? null : { ...d[2] }, e.points.push(p), e.points.length > 4004) throw Error("Trim excede orçamento temporário de pontos.");
			}
			e.points.length && i.push({
				source: a,
				contour: e
			});
		}
		return i;
	}
	function _(e) {
		let t = /* @__PURE__ */ new Map(), r = [];
		for (let i of e) {
			Zp(n);
			let e = t.get(i.source.index);
			if (e && i.source.source.closed) {
				let t = e.contour.points.at(-1), n = i.contour.points[0];
				if (!t || !n || t.x !== n.x || t.y !== n.y) throw Error("Wrap de trim perdeu a junção do contorno fechado.");
				t.out = n.out, e.contour.points.push(...i.contour.points.slice(1));
			} else t.set(i.source.index, i), r.push(i);
		}
		for (let e of r) {
			if (Zp(n), m += e.contour.points.length, m > 4e3) throw Error("Trim excede 4000 vértices transitórios.");
			h.push(e.contour);
		}
	}
	if (s === "parallel") for (let e of u.contours) {
		let t = [], n = e.end - e.start;
		for (let [r, i] of p) t.push(...g([e], e.start + r * n, e.start + i * n));
		_(t);
	}
	else {
		let e = [];
		for (let [t, n] of p) e.push(...g(u.contours, t * u.length, n * u.length));
		_(e);
	}
	return Zd(h), {
		kind: "geometry",
		geometry: h
	};
}
//#endregion
//#region ../../packages/edi-motion/src/rig/cost.ts
function em(e) {
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
var tm = (e) => e * 180 / Math.PI, nm = (e, t) => ((t - e) % 360 + 540) % 360 - 180, rm = (e, t) => Math.max(e.minRotation, Math.min(e.maxRotation, t));
function im(e, t) {
	if (t.length < 1 || t.length > 8 || new Set(t.map((e) => e.targetId)).size !== t.length) throw Error("IK requer cadeia única de 1 a 8 ossos.");
	for (let [n, r] of t.entries()) {
		let i = e.object(r.targetId), a = e.pose(r.targetId), o = t[n - 1];
		if (!Number.isFinite(r.length) || r.length <= 0 || r.length > 1e5 || r.minRotation > r.maxRotation || ![r.minRotation, r.maxRotation].every((e) => Number.isFinite(e) && Math.abs(e) <= 1e4)) throw Error("Dimensões/limites do osso inválidos.");
		if (i.tag !== "g" || i.isComponent || a.sx <= 0 || a.sx !== a.sy || a.px || a.py || a.skewX || n > 0 && i.basis?.some((e, t) => e !== au()[t]) || i.attributeMatrix?.some((e, t) => e !== au()[t]) || o && (i.parentId !== o.targetId || a.x !== o.length || a.y !== 0)) throw Error("IK requer ossos contíguos, escala uniforme positiva e pivô/skew/basis neutros; FK mantém os demais perfis.");
	}
}
function am(e, t, n, r, i) {
	let a = e.pose(t.targetId), o = e.pose(n.targetId), s = lu(cu(e.pre(t.targetId)), r.x, r.y), c = s.x - a.x, l = s.y - a.y, u = t.length * a.sx, d = n.length * a.sx * o.sx, f = Math.max(-1, Math.min(1, (c * c + l * l - u * u - d * d) / (2 * u * d))), p = Math.acos(f) * (i === "positive" ? 1 : -1), m = c === 0 && l === 0 ? a.rotation : tm(Math.atan2(l, c) - Math.atan2(d * Math.sin(p), u + d * Math.cos(p)));
	e.set(t.targetId, { rotation: rm(t, a.rotation + nm(a.rotation, m)) }), e.set(n.targetId, { rotation: rm(n, o.rotation + nm(o.rotation, tm(p))) });
}
function om(e, t, n, r) {
	if (![
		n.x,
		n.y,
		r.strength,
		r.tolerance,
		r.iterations
	].every(Number.isFinite) || r.strength < 0 || r.strength > 1 || r.tolerance <= 0 || r.tolerance > 100 || !Number.isInteger(r.iterations) || r.iterations < 1 || r.iterations > 128) throw Error("Parâmetros de IK inválidos.");
	im(e, t);
	let i = t.at(-1);
	if (!i) throw Error("Cadeia IK vazia.");
	let a = t.map((t) => e.pose(t.targetId).rotation), o = () => {
		let t = e.point(i.targetId, i.length, 0);
		return Math.hypot(t.x - n.x, t.y - n.y);
	};
	if (r.strength === 0) return {
		residual: o(),
		solvedResidual: null,
		converged: !1,
		iterations: 0,
		strength: 0
	};
	let s = 0, c = t.at(-2);
	if (c && am(e, c, i, n, r.bend), t.length !== 2 || o() > r.tolerance) for (; s < r.iterations && o() > r.tolerance; s++) for (let r of [...t].reverse()) {
		let t = e.pose(r.targetId), a = cu(e.pre(r.targetId)), o = e.point(i.targetId, i.length, 0), s = lu(a, o.x, o.y), c = lu(a, n.x, n.y), l = s.x - t.x, u = s.y - t.y, d = c.x - t.x, f = c.y - t.y;
		if (l === 0 && u === 0 || d === 0 && f === 0) continue;
		let p = tm(Math.atan2(l * f - u * d, l * d + u * f));
		e.set(r.targetId, { rotation: rm(r, t.rotation + p) });
	}
	let l = o();
	for (let [n, i] of t.entries()) {
		let t = a[n];
		if (t === void 0) throw Error("Pose inicial de IK ausente.");
		e.set(i.targetId, { rotation: t + nm(t, e.pose(i.targetId).rotation) * r.strength });
	}
	return {
		residual: o(),
		solvedResidual: l,
		converged: l <= r.tolerance,
		iterations: s,
		strength: r.strength
	};
}
//#endregion
//#region ../../packages/edi-motion/src/rig/joystick.ts
var sm = q().min(-1).max(1), cm = Y({
	id: G().regex(/^joystick-[\w-]{1,100}$/),
	name: G().trim().min(1).max(120),
	targetId: Q,
	x: sm,
	y: sm,
	rangeX: q().min(1e-6).max(1e4),
	rangeY: q().min(1e-6).max(1e4),
	limit: X(["square", "circle"])
});
function lm(e, t, n) {
	if (![e, t].every((e) => Number.isFinite(e) && e >= -1 && e <= 1)) throw Error("Eixos de joystick devem ficar entre -1 e 1.");
	if (n !== "square" && n !== "circle") throw Error("Limite de joystick inválido.");
	let r = Math.hypot(e, t), i = n === "circle" && r > 1 ? r : 1;
	return {
		x: e / i,
		y: t / i
	};
}
function um(e, t, n) {
	if (!Number.isInteger(n.remaining) || n.remaining < 0 || n.remaining > 2e6) throw Error("Orçamento de joystick inválido.");
	if (n.remaining -= 8, n.remaining < 0) throw Error("Joystick excede orçamento compartilhado.");
	let r = lm(t.x, t.y, e.limit), i = r.x * e.rangeX, a = r.y * e.rangeY;
	if (![i, a].every((e) => Number.isFinite(e) && Math.abs(e) <= 1e4)) throw Error("Deslocamento de joystick fora do perfil numérico.");
	return {
		axes: r,
		offset: {
			x: i,
			y: a
		}
	};
}
function dm(e, t, n, r) {
	for (let i of t) {
		let { offset: t } = um(i, {
			x: r?.get(dd([], i.id, "x")) ?? i.x,
			y: r?.get(dd([], i.id, "y")) ?? i.y
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
var fm = q().min(-1e4).max(1e4), pm = q().min(0).max(1e5), mm = q().min(0).max(1), hm = G().regex(/^constraint-[\w-]{1,100}$/);
function gm(e) {
	return e?.tag === "path" || e?.tag === "image" && e.geometry !== void 0;
}
var _m = Y({
	id: G().regex(/^skin-[\w-]{1,100}$/),
	targetId: Q,
	bindMatrix: af,
	bones: J(Y({
		targetId: Q,
		inverseBindMatrix: af
	})).min(1).max(256),
	weights: J(J(Y({
		boneId: Q,
		weight: q().positive().max(1)
	})).min(1).max(4)).min(1).max(4e3)
}), vm = Y({
	id: G().regex(/^trim-[\w-]{1,100}$/),
	targetId: Q,
	layerId: G().regex(/^paint-[\w-]{1,100}$/).optional(),
	start: mm,
	end: mm,
	offset: q().min(-36e3).max(36e3),
	tolerance: q().min(1e-6).max(100),
	mode: X(["parallel", "sequential"])
}), ym = Y({
	targetId: Q,
	length: q().positive().max(1e4),
	minRotation: fm,
	maxRotation: fm
}), bm = Ms("kind", [
	Y({
		id: hm,
		kind: Z("path"),
		ownerId: Q,
		targetId: Q,
		contour: q().int().min(0).max(3999),
		progress: mm,
		orient: ys(),
		rotationOffset: fm,
		offset: fm,
		tolerance: q().min(1e-6).max(100),
		strength: mm
	}),
	Y({
		id: hm,
		kind: Z("ik"),
		chain: J(Q).min(1).max(8),
		targetId: Q,
		strength: mm,
		bend: X(["positive", "negative"]),
		tolerance: q().min(1e-6).max(100),
		iterations: q().int().min(1).max(128)
	}),
	Y({
		id: hm,
		kind: Z("distance"),
		ownerId: Q,
		targetId: Q,
		min: pm,
		max: pm,
		strength: mm
	}),
	Y({
		id: hm,
		kind: Z("transform"),
		ownerId: Q,
		targetId: Q,
		space: X(["local", "world"]),
		channels: J(X([
			"x",
			"y",
			"rotation",
			"sx",
			"sy",
			"skewX"
		])).min(1).max(6),
		offset: Y({
			x: fm,
			y: fm,
			rotation: fm,
			sx: q().min(-20).max(20),
			sy: q().min(-20).max(20)
		}),
		strength: mm
	})
]), xm = Y({
	id: G().regex(/^track-[\w-]{1,100}$/),
	targetId: G().regex(/^(?:constraint|morph|solo|trim|joystick)-[\w-]{1,100}$/),
	property: X([
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
	keys: J(Xu).min(1).max(1e4)
}), Sm = Y({
	version: As([
		Z(1),
		Z(2),
		Z(3),
		Z(4)
	]),
	bones: J(ym).max(256),
	constraints: J(bm).max(256),
	targets: J(Q).max(256).default([]),
	skins: J(_m).max(256).optional(),
	trims: J(vm).max(256).optional(),
	joysticks: J(cm).max(256).optional(),
	morphs: J(Y({
		id: G().regex(/^morph-[\w-]{1,100}$/),
		name: G().trim().min(1).max(120),
		targetId: Q,
		geometry: Xd,
		weight: mm
	})).max(256).optional(),
	solos: J(Y({
		id: G().regex(/^solo-[\w-]{1,100}$/),
		targetId: Q,
		children: J(Q).min(1).max(2e3),
		activeIndex: q().int().min(-1).max(1999)
	})).max(256).optional(),
	parameterClips: J(Y({
		animationId: G().regex(/^[a-z]+-[\w-]{1,100}$/),
		tracks: J(xm).max(12e3)
	})).max(100).optional()
});
function Cm(e) {
	let t = e.constraints.map((e) => ({
		targetId: e.id,
		property: "strength",
		definition: {
			initial: e.strength,
			bounds: [0, 1],
			discrete: !1,
			ownerIds: Em(e)
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
function wm(e) {
	return new Map(Cm(e).map((e) => [dd([], e.targetId, e.property), e.definition]));
}
function Tm(e, t) {
	for (let n of e.parameterClips ?? []) {
		let e = t.find((e) => e.id === n.animationId);
		if (!e || n.tracks.some((t) => t.keys.some((t) => t.frame > e.frames))) throw Error("Canal de rig requer animação existente e chaves dentro da duração.");
	}
}
function Em(e) {
	return e.kind === "ik" ? e.chain : [e.ownerId];
}
function Dm(e, t) {
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
		for (let n of e.morphs) if (typeof n == "object" && n && "geometry" in n && (t += Zd(n.geometry), t > 1e5)) throw Error("Morphs excedem orçamento de geometria.");
	}
	if (typeof e == "object" && e && "parameterClips" in e && Array.isArray(e.parameterClips)) {
		if (e.parameterClips.length > 100) throw Error("Orçamento de clips de rig excedido.");
		for (let t of e.parameterClips) if (typeof t == "object" && t && Array.isArray(t.tracks)) {
			if (r += t.tracks.length, r > 12e3) throw Error("Orçamento de canais de rig excedido.");
			for (let e of t.tracks) if (typeof e == "object" && e && Array.isArray(e.keys) && (n += e.keys.length, n > 1e5)) throw Error("Orçamento de chaves de rig excedido.");
		}
	}
	let i = Sm.parse(e, { jitless: !0 }), a = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set();
	if (t.size > 2e3) throw Error("Rig excede o orçamento de objetos.");
	let s = em(i);
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
		if (c.has(e.id) || !gm(n) || !n?.geometry) throw Error("Morph requer ID único e geometria de caminho ou malha válida.");
		c.add(e.id), $d(n.geometry, e.geometry);
	}
	for (let e of i.solos ?? []) {
		let n = t.get(e.targetId), r = [...t].filter(([, t]) => t.parentId === e.targetId).map(([e]) => e);
		if (c.has(e.id) || l.has(e.targetId) || n?.tag !== "g" || n.isComponent || e.activeIndex >= e.children.length || JSON.stringify(r) !== JSON.stringify(e.children)) throw Error("Solo requer grupo local, filhos diretos na ordem original e índice válido.");
		c.add(e.id), l.add(e.targetId);
	}
	let d = /* @__PURE__ */ new Set(), f = new Set(i.constraints.flatMap((e) => [...Em(e)])), p = new Set(i.bones.map((e) => e.targetId));
	for (let e of i.joysticks ?? []) {
		let n = t.get(e.targetId);
		if (c.has(e.id) || d.has(e.targetId) || !i.targets.includes(e.targetId) || n?.tag !== "g" || n.parentId !== null || n.isComponent || p.has(e.targetId) || f.has(e.targetId)) throw Error("Joystick requer ID único e um alvo raiz local exclusivo, sem osso/constraint escrevendo sua posição.");
		c.add(e.id), d.add(e.targetId);
	}
	let m = wm(i), h = /* @__PURE__ */ new Set(), g = /* @__PURE__ */ new Set();
	for (let e of i.parameterClips ?? []) {
		if (h.has(e.animationId)) throw Error("Clip de rig duplicado.");
		h.add(e.animationId);
		let t = /* @__PURE__ */ new Set();
		for (let n of e.tracks) {
			let e = dd([], n.targetId, n.property), r = m.get(e);
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
		if (c.has(e.id) || _.has(e.targetId) || !gm(n) || !r || r !== e.weights.length || i.size !== e.bones.length) throw Error("Malha requer caminho único e pesos correspondentes à topologia.");
		c.add(e.id), _.add(e.targetId), cu(e.bindMatrix);
		for (let t of e.bones) {
			if (!a.has(t.targetId)) throw Error("Osso da malha ausente.");
			cu(t.inverseBindMatrix);
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
		let n = Em(e), r = e.kind === "transform" && e.space === "local", i = r ? /* @__PURE__ */ new Set([e.targetId]) : v(e.targetId);
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
		let n = y[e], r = Em(t), a = b[e];
		if (!n || !a) throw Error("Grafo de restrições incompleto.");
		for (let [t, o] of i.constraints.entries()) {
			if (t === e) continue;
			let i = Em(o);
			(i.some((e) => n.has(e)) || t < e && i.some((e) => r.includes(e))) && a.add(t);
		}
	}
	let x = [], S = /* @__PURE__ */ new Set(), C = /* @__PURE__ */ new Set();
	function w(e) {
		if (S.has(e)) return;
		if (C.has(e)) throw Error("Restrições formam dependência circular.");
		C.add(e);
		for (let t of b[e] ?? []) w(t);
		let t = i.constraints[e];
		if (!t) throw Error("Restrição ausente.");
		S.add(e), C.delete(e), x.push(t);
	}
	for (let e of i.constraints.keys()) w(e);
	let T = { remaining: 2e6 }, E = yp(t, /* @__PURE__ */ new Map(), T), D = new Map(i.bones.map((e) => [e.targetId, e]));
	dm(E, i.joysticks ?? [], T);
	for (let e of x) if (e.kind === "ik" && (e.strength > 0 || i.parameterClips?.some((t) => t.tracks.some((t) => t.targetId === e.id && t.keys.some((e) => e.value > 0))))) {
		let t = e.chain.map((e) => {
			let t = D.get(e);
			if (!t) throw Error("Osso IK ausente.");
			return t;
		});
		im(E, t);
		let n = t[0];
		if (!n) throw Error("Cadeia IK vazia.");
		cu(E.pre(n.targetId));
	}
	return {
		...i,
		constraints: x
	};
}
//#endregion
//#region ../../packages/edi-motion/src/rig/deformation.ts
function Om(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	for (let a of e.morphs ?? []) {
		let e = t.get(a.targetId)?.geometry;
		if (!e) throw Error("Base do morph ausente.");
		let o = n?.get(dd([], a.id, "weight")) ?? a.weight;
		if (!Number.isFinite(o) || o < 0 || o > 1) throw Error("Peso do morph fora de 0–1.");
		let s = i.get(a.targetId) ?? structuredClone(e);
		i.set(a.targetId, s);
		let c = (e, t, n) => {
			if (--r.remaining < 0) throw Error("Morph excede orçamento de avaliação.");
			if (e.x += (n.x - t.x) * o, e.y += (n.y - t.y) * o, !Number.isFinite(e.x) || !Number.isFinite(e.y) || Math.abs(e.x) > 1e7 || Math.abs(e.y) > 1e7) throw Error("Morph produz geometria fora dos limites.");
		};
		for (let [t, n] of s.entries()) for (let [r, i] of n.points.entries()) {
			let n = e[t]?.points[r], o = a.geometry[t]?.points[r];
			if (!n || !o) throw Error("Topologia do morph incompatível.");
			c(i, n, o), i.in && n.in && o.in && c(i.in, n.in, o.in), i.out && n.out && o.out && c(i.out, n.out, o.out);
		}
	}
	return i;
}
//#endregion
//#region ../../packages/edi-motion/src/rig/skinning.ts
function km(e, t, n, r) {
	let i = cu(n.world(e.targetId)), a = /* @__PURE__ */ new Map();
	for (let t of e.bones) a.set(t.targetId, ou(i, ou(n.world(t.targetId), ou(t.inverseBindMatrix, e.bindMatrix))));
	let o = 0;
	return t.map((t) => ({
		...t,
		points: t.points.map((t) => {
			let n = e.weights[o++];
			if (!n) throw Error("Peso de vértice ausente.");
			let i = (e) => {
				let t = 0, i = 0;
				for (let o of n) {
					if (--r.remaining < 0) throw Error("Malha excede orçamento de avaliação.");
					let n = a.get(o.boneId);
					if (!n) throw Error("Osso da malha ausente.");
					let s = lu(n, e.x, e.y);
					t += s.x * o.weight, i += s.y * o.weight;
				}
				if (!Number.isFinite(t) || !Number.isFinite(i) || Math.abs(t) > 1e7 || Math.abs(i) > 1e7) throw Error("Malha produz geometria fora dos limites.");
				return {
					x: t,
					y: i
				};
			};
			return {
				...i(t),
				in: t.in ? i(t.in) : null,
				out: t.out ? i(t.out) : null
			};
		})
	}));
}
//#endregion
//#region ../../packages/edi-motion/src/rig/trimming.ts
function Am(e, t, n, r, i) {
	let a = /* @__PURE__ */ new Map();
	for (let r of e.trims ?? []) {
		let e = n.get(r.targetId) ?? t.get(r.targetId)?.geometry;
		if (!e) throw Error("Geometria do trim ausente.");
		a.set(r.targetId, e);
	}
	for (let t of e.trims ?? []) {
		let e = a.get(t.targetId) ?? [], o = (e) => r?.get(dd([], t.id, e)) ?? t[e], s = $p(e, {
			...t,
			start: o("start"),
			end: o("end"),
			offset: o("offset")
		}, i);
		s.kind === "geometry" && (t.layerId ? n.set(gp(t.targetId, t.layerId), s.geometry) : (n.set(t.targetId, s.geometry), n.set(gp(t.targetId), e)));
	}
	if (e.trims?.length) {
		let r = 0;
		for (let [e, a] of t) {
			if (--i.remaining < 0) throw Error("Trim excede orçamento agregado de avaliação.");
			if (r += Zd(n.get(e) ?? a.geometry ?? []), r > 1e5) throw Error("Trim excede orçamento agregado de geometria.");
		}
		for (let t of e.trims) if (t.layerId && (r += Zd(n.get(gp(t.targetId, t.layerId)) ?? []), r > 1e5)) throw Error("Trim excede orçamento agregado de geometria.");
	}
}
//#endregion
//#region ../../packages/edi-motion/src/rig/constraints.ts
function jm(e, t) {
	cu(e);
	let [n, r, i, a, o, s] = e, c = Math.hypot(n, r), l = (n * a - r * i) / c, u = t.px ?? 0, d = t.py ?? 0;
	return {
		...t,
		x: o - u + n * u + i * d,
		y: s - d + r * u + a * d,
		rotation: Math.atan2(r, n) * 180 / Math.PI,
		sx: c,
		sy: l,
		skewX: Math.atan((n * i + r * a) / (c * l)) * 180 / Math.PI
	};
}
function Mm(e, t, n, r) {
	let i = e.point(t), a = lu(cu(e.pre(t)), i.x + (n.x - i.x) * r, i.y + (n.y - i.y) * r), o = lu(cu(e.pre(t)), i.x, i.y), s = e.pose(t);
	e.set(t, {
		x: s.x + a.x - o.x,
		y: s.y + a.y - o.y
	});
}
function Nm(e, t) {
	let n = Dm(e, t);
	return {
		rig: n,
		objects: t,
		bones: new Map(n.bones.map((e) => [e.targetId, e]))
	};
}
function Pm(e, t, n = { remaining: 2e6 }, r, i) {
	let a = r?.size ? new Map([...e.objects].map(([e, t]) => {
		let n = r.get(e);
		return [e, n ? {
			...t,
			basis: ou(n, t.basis ?? [
				1,
				0,
				0,
				1,
				0,
				0
			])
		} : t];
	})) : e.objects, o = yp(a, t, n), s = [], c = /* @__PURE__ */ new Map();
	dm(o, e.rig.joysticks ?? [], n, i);
	let l = Om(e.rig, a, i, n);
	for (let t of e.rig.constraints) {
		let r = i?.get(dd([], t.id, "strength")) ?? t.strength;
		if (!Number.isFinite(r) || r < 0 || r > 1) throw Error("Força de restrição fora dos limites.");
		let c = {
			...t,
			strength: r
		};
		if (c.strength !== 0 || c.kind === "ik") {
			if (c.kind === "ik") {
				let t = c.chain.map((t) => {
					let n = e.bones.get(t);
					if (!n) throw Error("Osso IK ausente.");
					return n;
				});
				if (c.strength === 0) {
					let e = t.at(-1);
					if (!e) throw Error("Cadeia IK vazia.");
					let n = o.point(e.targetId, e.length, 0), r = o.point(c.targetId);
					s.push({
						id: c.id,
						residual: Math.hypot(n.x - r.x, n.y - r.y),
						solvedResidual: null,
						converged: !1,
						iterations: 0,
						strength: 0
					});
				} else s.push({
					id: c.id,
					...om(o, t, o.point(c.targetId), c)
				});
			} else if (c.kind === "distance") {
				let e = o.point(c.ownerId), t = o.point(c.targetId), n = e.x - t.x, r = e.y - t.y, i = Math.hypot(n, r), a = Math.max(c.min, Math.min(c.max, i));
				if (a !== i) {
					let s = o.point(c.ownerId, 1, 0), l = i || Math.hypot(s.x - e.x, s.y - e.y);
					if (l === 0) throw Error("Distância em espaço singular sem direção definida.");
					let u = i ? n : s.x - e.x, d = i ? r : s.y - e.y;
					Mm(o, c.ownerId, {
						x: t.x + u * a / l,
						y: t.y + d * a / l
					}, c.strength);
				}
			} else if (c.kind === "path") {
				let e = (l.get(c.targetId) ?? a.get(c.targetId)?.geometry)?.[c.contour];
				if (!e) throw Error("Geometria de caminho ausente.");
				let t = i?.get(dd([], c.id, "progress")) ?? c.progress, r = nf(tf(e, o.world(c.targetId), c.tolerance, n), t), s = r.angle * Math.PI / 180, u = {
					x: r.x - Math.sin(s) * c.offset,
					y: r.y + Math.cos(s) * c.offset
				};
				if (c.orient) {
					let e = cu(o.pre(c.ownerId)), t = lu(e, Math.cos(s), Math.sin(s)), n = lu(e, 0, 0), r = o.pose(c.ownerId), i = o.object(c.ownerId), a = ou(uu({
						...r,
						rotation: 0
					}), i.attributeMatrix ?? [
						1,
						0,
						0,
						1,
						0,
						0
					]), l = (Math.atan2(t.y - n.y, t.x - n.x) - Math.atan2(a[1], a[0])) * 180 / Math.PI + c.rotationOffset;
					if (Math.hypot(a[0], a[1]) === 0) throw Error("Orientação de caminho requer eixo não singular.");
					o.set(c.ownerId, { rotation: r.rotation + nm(r.rotation, l) * c.strength });
				}
				Mm(o, c.ownerId, u, c.strength);
			} else Fm(o, c);
		}
	}
	for (let t of e.rig.skins ?? []) {
		let e = l.get(t.targetId) ?? a.get(t.targetId)?.geometry;
		if (!e) throw Error("Geometria da malha ausente.");
		l.set(t.targetId, km(t, e, o, n));
	}
	for (let t of e.rig.solos ?? []) {
		let e = i?.get(dd([], t.id, "activeIndex")) ?? t.activeIndex;
		if (!Number.isInteger(e) || e < -1 || e >= t.children.length) throw Error("Índice solo inválido.");
		for (let [n, r] of t.children.entries()) n !== e && c.set(r, !1);
	}
	return Am(e.rig, a, l, i, n), {
		poses: o.poses,
		geometry: l,
		visibility: c,
		diagnostics: s,
		world: new Map([...e.objects.keys()].map((e) => [e, o.world(e)]))
	};
}
function Fm(e, t) {
	let n = t.space === "local" ? e.pose(t.targetId) : jm(e.world(t.targetId), {
		...e.pose(t.targetId),
		px: 0,
		py: 0
	}), r = t.space === "local" ? e.pose(t.ownerId) : jm(e.world(t.ownerId), {
		...e.pose(t.ownerId),
		px: 0,
		py: 0
	}), i = { ...r };
	for (let e of t.channels) {
		let a = r[e] ?? 0, o = n[e] ?? 0, s = e === "sx" || e === "sy" ? o * t.offset[e] : o + (e === "skewX" ? 0 : t.offset[e]);
		i[e] = a + (e === "rotation" ? nm(a, s) : s - a) * t.strength;
	}
	if (t.space === "local") e.set(t.ownerId, i);
	else {
		let n = e.object(t.ownerId), r = ou(ou(cu(e.pre(t.ownerId)), uu(i)), cu(n.attributeMatrix ?? [
			1,
			0,
			0,
			1,
			0,
			0
		]));
		e.set(t.ownerId, jm(r, e.pose(t.ownerId)));
	}
}
//#endregion
//#region ../../packages/edi-motion/src/playback.ts
var Im = J(Y({
	id: Q,
	transform: nd
})).max(2e3), Lm = Y({
	id: Q,
	parentId: Q.nullable().default(null),
	animation: Cs(),
	speed: q().min(.01).max(100),
	offsetSeconds: q().min(-3600).max(3600)
}), Rm = Y({
	version: Z(1),
	motion: Cs(),
	objects: Im
}), zm = Y({
	version: Z(2),
	motion: Cs(),
	objects: Im,
	drivers: J(Lm).max(2e3),
	sources: J(Y({
		id: Q,
		objectId: Q,
		artboardId: G().regex(/^artboard-[\w-]{1,100}$/),
		instancePath: J(Q).max(8)
	})).max(2e3).default([])
}), Bm = zm.extend({
	version: Z(3),
	objects: J(Y({
		id: Q,
		transform: nd,
		tag: G().min(1).max(20),
		parentId: Q.nullable(),
		basis: af.optional(),
		attributeMatrix: af.optional(),
		isComponent: ys().optional(),
		geometry: Xd.optional()
	})).max(2e3),
	rigScopes: J(Y({
		instancePath: J(Q).max(8),
		clockId: Q.nullable(),
		rig: Cs()
	})).max(128)
});
function Vm(e) {
	if (typeof e == "object" && e && "objects" in e && Array.isArray(e.objects)) {
		if (e.objects.length > 2e3) throw Error("Runtime excede o orçamento de objetos.");
		let t = 0;
		for (let n of e.objects) if (typeof n == "object" && n && "geometry" in n && (t += Zd(n.geometry), t > 1e5)) throw Error("Geometria de runtime excede orçamento agregado.");
	}
	let t = Os({ version: q() }).parse(e, { jitless: !0 }), n = t.version === 1 ? Rm.parse(e, { jitless: !0 }) : t.version === 3 ? Bm.parse(e, { jitless: !0 }) : zm.parse(e, { jitless: !0 }), r = new Set(n.objects.map((e) => e.id));
	if (r.size !== n.objects.length) throw Error("ID de objeto duplicado no runtime.");
	let i = id(n.motion, r);
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
		let t = id({
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
	let y = [], b = /* @__PURE__ */ new Set(), x = 0, S = 0, C = 0, w = 0, T = n.objects, E = 0;
	for (let e of T) if (e.geometry) {
		if (e.tag !== "path" && e.tag !== "image") throw Error("Geometria de runtime requer caminho ou malha de imagem.");
		if (e.geometry = Qd(e.geometry), e.tag === "image" && (e.geometry.length !== 1 || e.geometry[0]?.closed || e.geometry[0]?.points.some((e) => e.in || e.out))) throw Error("Malha de imagem requer vértices de grade sem alças.");
		if (E += e.geometry.reduce((e, t) => e + t.points.length, 0), E > 1e5) throw Error("Geometria de runtime excede orçamento agregado.");
	}
	for (let e of "rigScopes" in n ? n.rigScopes : []) {
		let t = JSON.stringify(e.instancePath);
		if (b.has(t) || e.clockId !== null && !l.has(e.clockId)) throw Error("Escopo/relógio de rig inválido.");
		if (e.instancePath.length) {
			let t = e.instancePath.slice(0, -1), n = e.instancePath.at(-1), r = a.find((e) => e.objectId === n && JSON.stringify(e.instancePath) === JSON.stringify(t));
			if (!r || !T.find((e) => e.id === r.id)?.isComponent || e.clockId !== null && e.clockId !== r.id) throw Error("Escopo de rig não corresponde à instância/relógio declarado.");
		} else if (e.clockId !== null) throw Error("Rig raiz utiliza o relógio raiz.");
		b.add(t);
		let n = new Set(a.filter((e) => JSON.stringify(e.instancePath) === t).map((e) => e.id)), r = /* @__PURE__ */ new Map();
		for (let e of T) if (n.has(e.id)) {
			if (!e.tag || e.parentId === void 0) throw Error("Rig requer hierarquia e tags explícitas.");
			r.set(e.id, {
				...e,
				tag: e.tag,
				parentId: e.parentId !== null && n.has(e.parentId) ? e.parentId : null
			});
		}
		let o = Dm(e.rig, r), s = em(o);
		if (E += s.vertices, C += s.controls, w += s.deformers, E > 1e5 || C > 1e5 || w > 256) throw Error("Runtime excede orçamento agregado de deformação/geometria.");
		if (Tm(o, [...i.animations, ...u.map((e) => e.animation)]), d += (o.parameterClips ?? []).reduce((e, t) => e + t.tracks.length, 0), f += (o.parameterClips ?? []).reduce((e, t) => e + t.tracks.reduce((e, t) => e + t.keys.length, 0), 0), d > 12e3 || f > 1e5) throw Error("Orçamento agregado de canais/chaves excedido.");
		if (x += o.bones.length, S += o.constraints.length, x > 1e3 || S > 256) throw Error("Rig expandido excede orçamento agregado.");
		y.push({
			...e,
			rig: o
		});
	}
	return {
		version: n.version === 3 ? 3 : 2,
		motion: i,
		objects: T,
		drivers: m,
		sources: a,
		...n.version === 3 ? { rigScopes: y } : {}
	};
}
function Hm(e, t, n) {
	let r = ld(e, t), i = t / e.fps;
	for (let [e, t] of Um(i, n)) r.set(e, t);
	return r;
}
function Um(e, t) {
	let n = /* @__PURE__ */ new Map(), r = ud(e, t);
	for (let e of t) {
		let t = r.get(e.id);
		if (t === void 0) throw Error("Relógio de componente ausente.");
		for (let [r, i] of ld(e.animation, t)) n.set(r, i);
	}
	return n;
}
//#endregion
//#region ../../packages/edi-motion/src/rig/playbackRig.ts
function Wm(e) {
	return (e.rigScopes ?? []).map((t) => {
		let n = JSON.stringify(t.instancePath), r = new Set(e.sources.filter((e) => JSON.stringify(e.instancePath) === n).map((e) => e.id)), i = /* @__PURE__ */ new Map();
		for (let t of e.objects) if (r.has(t.id)) {
			if (!t.tag || t.parentId === void 0) throw Error("Rig requer metadados de hierarquia.");
			i.set(t.id, {
				...t,
				tag: t.tag,
				parentId: t.parentId !== null && r.has(t.parentId) ? t.parentId : null
			});
		}
		return {
			instancePath: t.instancePath,
			clockId: t.clockId,
			context: Nm(t.rig, i)
		};
	});
}
function Gm(e) {
	return qm(e.map((e) => ({
		rig: e.context.rig,
		clockId: e.clockId,
		instancePath: e.instancePath
	})));
}
function Km(e) {
	return qm(e.rigScopes ?? []);
}
function qm(e) {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map();
	for (let r of e) {
		for (let e of Cm(r.rig)) t.set(dd(r.instancePath, e.targetId, e.property), e.definition);
		for (let e of r.rig.parameterClips ?? []) {
			let t = n.get(e.animationId) ?? [];
			t.push(...e.tracks.map((e) => ({
				key: dd(r.instancePath, e.targetId, e.property),
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
function Jm(e, t, n = { remaining: 2e6 }, r, i) {
	if (!e.length) return {
		poses: t,
		diagnostics: [],
		geometry: /* @__PURE__ */ new Map(),
		visibility: /* @__PURE__ */ new Map()
	};
	let a = new Map(t), o = [], s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map();
	for (let t of e) {
		let e = /* @__PURE__ */ new Map();
		for (let n of Cm(t.context.rig)) {
			let r = i?.get(dd(t.instancePath, n.targetId, n.property));
			r !== void 0 && e.set(dd([], n.targetId, n.property), r);
		}
		let l = Pm(t.context, a, n, r, e);
		for (let [e, t] of l.poses) a.set(e, t);
		for (let [e, t] of l.geometry) s.set(e, t);
		for (let [e, t] of l.visibility) c.set(e, t);
		for (let e of l.diagnostics) o.push({
			...e,
			instancePath: t.instancePath
		});
	}
	if (e.some((e) => e.context.rig.trims?.length)) {
		let t = 0;
		for (let r of e) for (let [e, i] of r.context.objects) {
			if (--n.remaining < 0) throw Error("Trim expandido excede orçamento de avaliação.");
			if (t += Zd(s.get(e) ?? i.geometry ?? []), t > 1e5) throw Error("Trim expandido excede orçamento agregado de geometria.");
		}
	}
	return {
		poses: a,
		diagnostics: o,
		geometry: s,
		visibility: c
	};
}
//#endregion
//#region ../../packages/edi-motion/src/visual/imageMesh.ts
var Ym = Y({
	columns: q().int().min(1).max(16),
	rows: q().int().min(1).max(16)
}), Xm = .5, Zm = 4;
function Qm(e) {
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
var $m = (e) => (e.columns + 1) * (e.rows + 1), eh = (e) => e.columns * e.rows * 2, th = (e) => e ? eh(e) * 4 : 0;
function nh(e, t) {
	let { x: n, y: r, width: i, height: a } = Qm(t), o = [];
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
function rh(e) {
	let t = [], n = (t, n) => n * (e.columns + 1) + t;
	for (let r = 0; r < e.rows; r++) for (let i = 0; i < e.columns; i++) {
		let e = n(i, r), a = n(i + 1, r), o = n(i, r + 1), s = n(i + 1, r + 1);
		t.push([
			e,
			a,
			s
		], [
			e,
			s,
			o
		]);
	}
	return t;
}
function ih(e, t) {
	let n = (n) => ({
		x: n % (e.columns + 1) / e.columns * t.width,
		y: Math.floor(n / (e.columns + 1)) / e.rows * t.height
	});
	return rh(e).map((e) => {
		let t = e.map(n), r = {
			x: t.reduce((e, t) => e + t.x, 0) / 3,
			y: t.reduce((e, t) => e + t.y, 0) / 3
		}, i = (e, t) => {
			let n = Math.hypot(t.x - e.x, t.y - e.y), i = {
				x: (t.y - e.y) / n,
				y: -(t.x - e.x) / n
			}, a = {
				x: (e.x + t.x) / 2,
				y: (e.y + t.y) / 2
			};
			return i.x * (r.x - a.x) + i.y * (r.y - a.y) > 0 ? {
				x: -i.x,
				y: -i.y
			} : i;
		};
		return t.map((e, n) => {
			let r = t[(n + 2) % 3], a = t[(n + 1) % 3];
			if (!r || !a) throw Error("Triângulo de malha incompleto.");
			let o = i(r, e), s = i(e, a), c = Xm / (1 + o.x * s.x + o.y * s.y), l = {
				x: (o.x + s.x) * c,
				y: (o.y + s.y) * c
			}, u = Math.hypot(l.x, l.y), d = u > Xm * Zm ? Xm * Zm / u : 1;
			return [e.x + l.x * d, e.y + l.y * d].map((e) => Number(e.toFixed(4))).join(" ");
		}).join(" ");
	});
}
function ah(e, t, n) {
	if (n.length !== $m(e)) throw Error("Malha de imagem com vértices fora da grade.");
	let r = t.width / e.columns, i = t.height / e.rows;
	return rh(e).map(([t, a, o], s) => {
		let c = n[t], l = n[a], u = n[o];
		if (!c || !l || !u) throw Error("Vértice de malha ausente.");
		let d = t % (e.columns + 1) * r, f = Math.floor(t / (e.columns + 1)) * i, p = s % 2 == 0, m = p ? {
			x: r,
			y: 0
		} : {
			x: r,
			y: i
		}, h = p ? {
			x: r,
			y: i
		} : {
			x: 0,
			y: i
		}, g = {
			x: l.x - c.x,
			y: l.y - c.y
		}, _ = {
			x: u.x - c.x,
			y: u.y - c.y
		}, v = m.x * h.y - h.x * m.y, y = (g.x * h.y - _.x * m.y) / v, b = (_.x * m.x - g.x * h.x) / v, x = (g.y * h.y - _.y * m.y) / v, S = (_.y * m.x - g.y * h.x) / v;
		return [
			y,
			x,
			b,
			S,
			c.x - y * d - b * f,
			c.y - x * d - S * f
		];
	});
}
var oh = (e, t) => `edi-mesh-${e}-${t}`, sh = /* @__PURE__ */ new Set(/* @__PURE__ */ "d.x.y.x1.y1.x2.y2.width.height.rx.ry.cx.cy.r.points.fill.stroke.stroke-width.stroke-linecap.stroke-linejoin.stroke-dasharray.fill-rule.opacity.fill-opacity.stroke-opacity.transform.font-size.font-family.font-weight.font-style.letter-spacing.word-spacing.direction.unicode-bidi.text-anchor.display.visibility.viewBox.preserveAspectRatio.overflow".split("."));
function ch(e, t) {
	if (!sh.has(e) || typeof t != "string" || t.length > 5e5 || !Jc(t) || /url\s*\(|(?:var|env|paint|image|image-set|cross-fade|element|attr)\s*\(|[<>\\]|(?:javascript|data|https?):/i.test(t)) return `Atributo SVG não suportado: ${e}`;
	try {
		bu(e, t), e === "d" && t.trim() && pf(t);
	} catch (e) {
		if (!(e instanceof Error)) throw e;
		return e.message;
	}
	return null;
}
function lh(e) {
	return typeof e == "object" && !!e && !Array.isArray(e) && Object.keys(e).length <= sh.size;
}
var uh = Cs().refine(lh, {
	error: "Atributos SVG inválidos/excessivos.",
	abort: !0
}).pipe(Rs(G().max(80), G().max(5e5))).superRefine((e, t) => {
	let n = 0;
	for (let [r, i] of Object.entries(e)) {
		n += i.length;
		let e = ch(r, i);
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
}), dh = Z("auto"), fh = /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}\p{Script=Mende_Kikakui}\p{Script=Yezidi}\p{Script=Old_Hungarian}\p{Script=Phoenician}\p{Script=Imperial_Aramaic}\p{Script=Nabataean}\p{Script=Palmyrene}\p{Script=Hatran}\p{Script=Kharoshthi}\p{Script=Avestan}\p{Script=Old_South_Arabian}\p{Script=Old_North_Arabian}\p{Script=Old_Turkic}\p{Script=Inscriptional_Parthian}\p{Script=Inscriptional_Pahlavi}\p{Script=Psalter_Pahlavi}\p{Script=Manichaean}\p{Script=Lydian}\p{Script=Cypriot}\p{Script=Meroitic_Cursive}\p{Script=Meroitic_Hieroglyphs}\p{Script=Sogdian}\p{Script=Old_Sogdian}\p{Script=Elymaic}\p{Script=Chorasmian}]/u, ph = /\p{L}/u;
function mh(e) {
	let t = 0;
	for (let n of e) if (n === "⁦" || n === "⁧" || n === "⁨") t++;
	else if (n === "⁩") t = Math.max(0, t - 1);
	else if (t) continue;
	else if (n === "‎") return "ltr";
	else if (n === "‏" || n === "؜") return "rtl";
	else if (ph.test(n)) return fh.test(n) ? "rtl" : "ltr";
	return "ltr";
}
//#endregion
//#region ../../packages/edi-motion/src/visual/textPath.ts
var hh = Y({
	d: G().trim().min(1).max(2e5).superRefine((e, t) => {
		try {
			Zd(pf(e)) > 4e3 && t.addIssue({
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
	startOffset: q().min(0).max(100)
}), gh = (e) => `edi-text-path-${e}`;
function _h(e) {
	return e ? Zd(pf(e.d)) : 0;
}
//#endregion
//#region ../../packages/edi-motion/src/visual/model.ts
var vh = X([
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
]), yh = Y({ lineHeight: q().min(.25).max(10) }), bh = Y({
	attrs: uh.superRefine((e, t) => {
		for (let n of ["transform"]) n in e && t.addIssue({
			code: "custom",
			path: [n],
			message: "Geometria/transformação pertence ao playback espacial."
		});
	}),
	text: G().max(1e4).refine(Jc, "Texto deve conter caracteres XML válidos."),
	visible: ys(),
	textLayout: yh.optional(),
	textDirection: dh.optional(),
	textPath: hh.optional()
}), xh = Y({
	viewBox: Is([
		q().min(-1e5).max(1e5),
		q().min(-1e5).max(1e5),
		q().positive().max(1e5),
		q().positive().max(1e5)
	]),
	preserveAspectRatio: G().regex(/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/),
	globalTransform: nd
}), Sh = {
	label: G().min(1).max(500).refine((e) => !!e.trim() && Jc(e), "Nome acessível inválido."),
	description: G().min(1).max(2e3).refine((e) => !!e.trim() && Jc(e), "Descrição acessível inválida.").optional(),
	live: X(["polite", "assertive"]).optional()
}, Ch = Ms("kind", [
	Y({ kind: Z("decorative") }),
	Y({
		kind: Z("group"),
		...Sh
	}),
	Y({
		kind: Z("image"),
		...Sh
	}),
	Y({
		kind: Z("button"),
		...Sh
	})
]);
function wh(e, t, n) {
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
function Th(e, t) {
	return e ? e.kind === "decorative" ? { "aria-hidden": "true" } : {
		role: e.kind === "image" ? "img" : e.kind === "button" && t ? "button" : "group",
		"aria-label": e.label,
		...t && e.live ? { "aria-live": e.live } : {}
	} : {};
}
//#endregion
//#region ../../packages/edi-motion/src/visual/validation.ts
function Eh(e) {
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
				if (!t || ef(pf(i)) !== ef(t)) throw Error("Caminho nativo não corresponde à geometria espacial.");
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
				if (e.imageMesh && ef(d.get(e.id)?.geometry ?? []) !== ef(nh(e.imageMesh, e.visual.attrs))) throw Error("Malha raster portátil não corresponde à grade da imagem.");
			}
			nu(t, e), n.set(e.id, {
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
	e.version >= 8 && wh(r, i, a);
}
var Dh = Y({
	id: Q,
	parentId: Q.nullable().optional(),
	isComponent: ys().optional(),
	intrinsic: Y({
		x: q().min(-1e5).max(1e5),
		y: q().min(-1e5).max(1e5),
		width: q().positive().max(1e5),
		height: q().positive().max(1e5)
	}).optional(),
	name: G().trim().min(1).max(120),
	assetId: Bl.optional(),
	imageSlice: wu.optional(),
	imageMesh: Ym.optional(),
	gradients: jf.optional(),
	filter: ep.optional(),
	paintLayers: sp.optional(),
	effects: xp.optional(),
	visual: bh.optional(),
	fontAssetId: Bl.optional(),
	fontFallbackIds: eu.optional(),
	semantics: Ch.optional(),
	tag: vh,
	lineHeight: q().min(.25).max(10).optional(),
	textDirection: dh.optional()
}), Oh = Y({
	version: As([
		Z(1),
		Z(2),
		Z(3),
		Z(4),
		Z(5),
		Z(6),
		Z(7),
		Z(8),
		Z(9),
		Z(10),
		Z(11),
		Z(12),
		Z(13),
		Z(14)
	]),
	playback: Cs(),
	behavior: Cs(),
	content: J(Dh).max(2e3),
	layout: Cs().optional(),
	audio: Cs().optional(),
	audioAssets: Cs().optional(),
	assets: Cs().optional(),
	visual: xh.optional(),
	animationId: G().regex(/^[a-z]+-[\w-]{1,100}$/).optional(),
	components: J(Y({
		rootId: Q,
		instanceId: Q,
		instancePath: J(Q).min(1).max(8),
		speed: q().min(.01).max(100).default(1),
		document: Cs()
	})).max(128).optional()
});
function kh(e) {
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
function Ah(e) {
	kh(e);
	let t = /* @__PURE__ */ new Set(), n = [], r = [], i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), s = !1, c, l = 0, u = 0, d = 0, f = 0, p = 0, m = 0, h = 0, g = 0, _ = 0, v = 0, y = 0, b = 0;
	function x(e, S, C = [], w = 1) {
		if (S > 8 || ++l > 128) throw Error("Cena excede o orçamento de componentes interativos.");
		let T = Oh.parse(e, { jitless: !0 }), E = Vm(T.playback), D = new Map(T.content.map((e) => [e.id, e]));
		if (S === 0 && (s = T.version >= 6, c = T.version), T.version >= 6 !== s || s && T.version !== c) throw Error("Contrato visual portátil requer raiz/escopos de mesma versão.");
		if (T.version < 6 && (T.assets !== void 0 || T.visual !== void 0 || T.content.some((e) => e.visual))) throw Error("Conteúdo visual portátil requer blueprint v6.");
		if (T.version >= 6 && (E.version !== 3 || T.audioAssets !== void 0)) throw Error("Blueprint v6 requer playback espacial v3 e catálogo unificado, sem audioAssets duplicado.");
		let O;
		if (T.assets !== void 0 || T.visual !== void 0) {
			if (S !== 0) throw Error("Cena e catálogo portátil pertencem somente à raiz.");
			if (T.assets === void 0 || T.visual === void 0) throw Error("Cena portátil requer metadados e catálogo juntos.");
			O = Zl(T.assets);
			for (let e of O) i.set(e.id, e), a.add(e.id);
		}
		if ((T.audio !== void 0 || T.audioAssets !== void 0) && T.version < 3) throw Error("Áudio interativo requer blueprint v3.");
		let k;
		if (T.audioAssets !== void 0) {
			if (S !== 0) throw Error("Recursos de áudio pertencem somente à raiz.");
			k = [];
			for (let e of Zl(T.audioAssets)) {
				if (e.kind !== "audio") throw Error("Catálogo de áudio contém recurso incompatível.");
				i.set(e.id, e), a.add(e.id), k.push(e);
			}
		}
		for (let e of E.rigScopes ?? []) {
			if (e.rig.version >= 4 && T.version < 11) throw Error("Rig v4 requer blueprint v11.");
			if (e.rig.version >= 3 && T.version < 10) throw Error("Rig v3 requer blueprint v10.");
			for (let t of e.rig.trims ?? []) {
				let e = D.get(t.targetId);
				if (!e?.visual || /[aA]/.test(e.visual.attrs.d ?? "")) throw Error("Trim requer caminho visual sem arcos nativos; converta explicitamente antes.");
				if (t.layerId) {
					if (T.version < 14) throw Error("Trim de camada de pintura requer blueprint v14.");
					if (!e.paintLayers?.some((e) => e.id === t.layerId)) throw Error("Trim de camada de pintura sem a camada no objeto.");
				}
			}
			let t = em(e.rig);
			v += t.vertices, y += t.controls, b += t.deformers, g += e.rig.bones.length, _ += e.rig.constraints.length;
			for (let t of e.rig.parameterClips ?? []) p += t.tracks.length, m += t.tracks.reduce((e, t) => e + t.keys.length, 0);
		}
		if (g > 1e3 || _ > 256) throw Error("Cena interativa excede orçamento agregado de rig.");
		for (let e of E.objects) v += (e.geometry ?? []).reduce((e, t) => e + t.points.length, 0);
		if (v > 1e5 || y > 1e5 || b > 256) throw Error("Cena interativa excede orçamento agregado de deformação/geometria.");
		for (let e of T.content) {
			if (e.filter) {
				if (T.version < 12) throw Error("Filtros requerem blueprint v12.");
				r.push(e.filter);
			}
			if (e.paintLayers) {
				if (T.version < 14) throw Error("Camadas de pintura requerem blueprint v14.");
				if (!cp.has(e.tag)) throw Error("Camadas de pintura valem só para formas e caminhos.");
				if (e.filter) throw Error("Camadas de pintura extras com filtro ficam fora do perfil.");
				n.push(...mp(e.paintLayers).map((e) => ({ fill: e })));
			}
			if (e.effects && T.version < 5) throw Error("Recortes/máscaras requerem blueprint v5.");
			if (f += Number(!!e.effects?.clip) + Number(!!e.effects?.mask), f > 256) throw Error("Cena interativa excede 256 recortes/máscaras.");
			if (e.gradients) {
				if (T.version < 4 || !zf.has(e.tag)) throw Error("Gradiente requer forma/texto e blueprint v4.");
				if (Pf(e.gradients) && T.version < 12) throw Error("Padrões requerem blueprint v12.");
				n.push(e.gradients);
			}
			if (u += 1 + (e.semantics && e.semantics.kind !== "decorative" && e.semantics.description ? 1 : 0) + (e.imageSlice ? 18 : 0) + pp(e.paintLayers).length + th(e.imageMesh) + (e.effects?.clip ? 2 : 0) + (e.effects?.mask ? 2 : 0), u > 2e3) throw Error("Cena excede orçamento agregado de células SVG.");
			if (e.assetId && a.add(e.assetId), e.fontFallbackIds !== void 0 && T.version < 7) throw Error("Fallback de fontes requer blueprint v7.");
			if (e.semantics !== void 0 && T.version < 8) throw Error("Semântica configurável requer blueprint v8.");
			for (let t of tu(e)) a.add(t);
			if (a.size > 256) throw Error("Cena excede orçamento agregado de referências a recursos.");
			if (t.has(e.id)) throw Error("ID compartilhado por dois escopos interativos.");
			if (t.add(e.id), t.size > 2e3) throw Error("Cena interativa excede o orçamento agregado de objetos.");
		}
		for (let e of [...E.motion.animations, ...E.drivers.map((e) => e.animation)]) {
			p += e.tracks.length, m += e.tracks.reduce((e, t) => e + t.keys.length, 0);
			for (let t of e.drawOrders ?? []) for (let e of t.keys) m += 1 + e.order.length;
		}
		if (p > 12e3 || m > 1e5) throw Error("Cena interativa excede o orçamento agregado de animação.");
		if (D.size !== T.content.length || D.size !== E.objects.length || E.objects.some((e) => !D.has(e.id))) throw Error("Conteúdo interativo não corresponde aos objetos.");
		let A = new Map(T.content.flatMap((e) => e.effects ? [[e.id, e.effects]] : [])), j = op(T.content.map((e) => ({
			...e,
			attrs: e.visual?.attrs
		})), A);
		if (j.size && T.version < 9) throw Error("Primitivas nativas como fontes de efeitos requerem blueprint v9.");
		let M = new Set(E.objects.filter((e) => e.geometry).map((e) => e.id));
		for (let [e, t] of j) M.has(e) || (v += Zd(pf(Gd(t))));
		for (let e of T.content) v += _h(e.visual?.textPath);
		if (v > 1e5) throw Error("Cena interativa excede geometria agregada incluindo efeitos nativos.");
		if (T.version < 12 && [...A.values()].some((e) => e.mask?.mode)) throw Error("Modos de máscara requerem blueprint v12.");
		if (T.version < 12 && [...E.motion.animations, ...E.drivers.map((e) => e.animation)].some((e) => e.drawOrders)) throw Error("Ordem de desenho animável requer blueprint v12.");
		if (Cp(E, A, void 0, j, Kf(T.content.map((e) => ({
			...e,
			parentId: e.parentId ?? null,
			attrs: e.visual?.attrs
		})), new Map([...A].filter(([, e]) => Gf(e))))), A.size || s) for (let e of E.objects) {
			let t = D.get(e.id);
			if (!t || t.tag !== e.tag || t.parentId !== e.parentId) throw Error("Hierarquia visual do efeito não corresponde ao playback.");
		}
		for (let e of D.values()) if (e.tag === "image" != (e.assetId !== void 0) || e.assetId && T.version < 3) throw Error("Referência de imagem interativa requer blueprint v3 e assetId tipado.");
		else if (e.fontAssetId && (e.tag !== "text" || T.version < 3)) throw Error("Referência de fonte requer texto e blueprint v3.");
		else if (e.imageSlice && (e.tag !== "image" || T.version < 4)) throw Error("Nine-slice requer imagem e blueprint v4.");
		else if (e.isComponent && (e.tag !== "g" || !e.intrinsic) || !e.isComponent && e.intrinsic) throw Error("Medidas intrínsecas requerem instância de componente válida.");
		else if (e.lineHeight !== void 0 && e.tag !== "text") throw Error("Layout interativo requer texto.");
		else if (e.textDirection && (e.tag !== "text" || T.version < 12)) throw Error("Direção automática requer texto e blueprint v12.");
		else if (e.semantics && e.semantics.kind !== "decorative" && e.semantics.live && T.version < 12) throw Error("Região viva requer blueprint v12.");
		else if (e.visual?.textPath && T.version < 12) throw Error("Texto em caminho requer blueprint v12.");
		else if (e.imageMesh && (e.tag !== "image" || e.imageSlice || T.version < 12)) throw Error("Malha raster requer imagem sem nine-slice e blueprint v12.");
		let ee = new Map(E.sources.filter((e) => e.instancePath.length === 0).flatMap((e) => {
			let t = D.get(e.id);
			return t ? [[e.id, t]] : [];
		}));
		if (ee.size === 0 && E.objects.length > 0) throw Error("Conteúdo interativo requer mapa de identidades de autoria.");
		let N = zd(T.behavior, ee, E.motion.animations, Km(E));
		if (T.version < 12 && N.bindings.some((e) => e.kind === "semantics")) throw Error("Binding semântico requer blueprint v12.");
		if (T.version < 12 && N.formulas?.length) throw Error("Fórmulas requerem blueprint v12.");
		if (T.version < 13 && (N.data?.context || N.data?.links.some((e) => e.instanceId === null))) throw Error("Modelo da prancheta requer blueprint v13.");
		let te = T.audio === void 0 ? void 0 : Au(T.audio, i, new Set(N.events.map((e) => e.id)));
		if (d += te?.bindings.length ?? 0, d > 256) throw Error("Cena excede orçamento agregado de vínculos de áudio.");
		if (h += N.inputs.length + N.bindings.length + N.listeners.length + N.events.length + N.machines.reduce((e, t) => e + t.layers.reduce((e, t) => e + t.states.length + t.transitions.length, 0), 0), h > 2e4) throw Error("Cena interativa excede o orçamento agregado de lógica.");
		if (T.animationId && (!E.motion.animations.some((e) => e.id === T.animationId) || N.machines.length > 0)) throw Error("Clip inicial requer cena sem máquina e animação válida.");
		let ne;
		if (T.layout !== void 0) {
			let e = /* @__PURE__ */ new Map();
			for (let [t, n] of ee) {
				if (n.parentId === void 0) throw Error("Layout requer hierarquia explícita do conteúdo.");
				e.set(t, {
					tag: n.tag,
					parentId: n.parentId,
					isComponent: n.isComponent
				});
			}
			if (ne = Rp(T.layout, e), ne.rootSize && T.version < 13) throw Error("Tamanho da prancheta no layout requer blueprint v13.");
		}
		if (T.version === 1 && T.components?.length) throw Error("Componentes independentes requerem documento interativo v2.");
		let re = /* @__PURE__ */ new Set(), ie = /* @__PURE__ */ new Set(), P = T.components?.map((e) => {
			let t = D.get(e.rootId), n = D.get(e.instanceId), r = E.sources.find((t) => t.id === e.instanceId), i = JSON.stringify(e.instancePath);
			if (t?.tag !== "svg" || t.parentId !== e.instanceId || !n?.isComponent || !r || JSON.stringify([...r.instancePath, r.objectId]) !== i || re.has(e.rootId) || ie.has(i)) throw Error("Raiz/caminho de componente interativo inválido.");
			re.add(e.rootId), ie.add(i);
			let a = [...C, ...e.instancePath], s = JSON.stringify(a), c = w * e.speed;
			if (a.length > 8 || o.has(s) || c > 100) throw Error("Caminho/velocidade agregada de componente inválido.");
			return o.add(s), {
				...e,
				document: x(e.document, S + 1, a, c)
			};
		});
		return {
			version: T.version,
			playback: E,
			behavior: N,
			content: T.content,
			...T.animationId ? { animationId: T.animationId } : {},
			...ne ? { layout: ne } : {},
			...te ? { audio: te } : {},
			...k ? { audioAssets: k } : {},
			...O ? { assets: O } : {},
			...T.visual ? { visual: T.visual } : {},
			...P?.length ? { components: P } : {}
		};
	}
	let S = x(e, 0);
	return Lf(n), ip(r), Eh(S), S;
}
var jh = Y({
	format: Z("edi-animation"),
	version: Z(1),
	title: G().trim().min(1).max(200),
	fit: X([
		"contain",
		"cover",
		"stretch"
	]),
	autoplay: ys(),
	respectReducedMotion: ys(),
	pauseOffscreen: ys(),
	poster: Hl.refine((e) => e.width <= 1024 && e.height <= 1024, "A prévia excede 1024 pixels.").optional(),
	document: Cs()
});
function Mh(e) {
	return {
		inputs: e.document.behavior.inputs.map(({ id: e, name: t, kind: n }) => ({
			id: e,
			name: t,
			kind: n
		})),
		events: [...new Set(e.document.behavior.events.map(({ name: e }) => e))]
	};
}
function Nh(e) {
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
function Ph(e) {
	let t = e;
	if (typeof t == "string") {
		if (t.length > 1e7 || new TextEncoder().encode(t).byteLength > 1e7) throw Error("Animação excede o tamanho permitido.");
		t = JSON.parse(t);
	}
	Nh(t);
	let n = jh.parse(t, { jitless: !0 });
	n.poster && Xl(n.poster);
	let r = Ah(n.document);
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
function Fh(e) {
	let t = Ph(e);
	return JSON.stringify(t);
}
//#endregion
//#region ../../packages/edi-motion/src/assets/browser.ts
async function Ih(e, t) {
	if (t?.throwIfAborted(), Xl(e).kind !== "image") throw Error("Recurso de imagem esperado.");
	let n = new Uint8Array(Yl(e.data)), r = new Blob([n.buffer], { type: e.mime }), i = await createImageBitmap(r);
	try {
		if (t?.throwIfAborted(), i.width !== e.width || i.height !== e.height) throw Error("Imagem decodificada não corresponde às dimensões validadas.");
		return i;
	} catch (e) {
		throw i.close(), e;
	}
}
async function Lh(e, t, n = document.fonts) {
	let r = Zl(e), i = new Map(r.map((e) => [e.id, e])), a = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = new AbortController(), l = () => c.abort(t?.reason);
	t?.addEventListener("abort", l, { once: !0 }), t?.aborted && l();
	let u = 0, d = !1, f = () => {
		if (!d) {
			d = !0, c.abort();
			for (let e of a.values()) e.close();
			a.clear();
			for (let e of s.values()) n.delete(e);
			s.clear(), o.clear(), i.clear();
		}
	};
	try {
		let e = Array.from({ length: Math.min(4, r.length) }, async () => {
			for (; u < r.length;) {
				c.signal.throwIfAborted();
				let e = r[u++];
				if (!e) throw Error("Recurso desapareceu durante a carga.");
				try {
					if (e.kind === "image") a.set(e.id, await Ih(e, c.signal));
					else if (e.kind === "audio") o.set(e.id, e);
					else {
						let t = await Rh(e, c.signal);
						s.set(e.id, t);
					}
				} catch (e) {
					throw c.abort(e), e;
				}
			}
		}), t = (await Promise.allSettled(e)).find((e) => e.status === "rejected");
		if (t?.status === "rejected") throw t.reason;
		c.signal.throwIfAborted();
		for (let e of s.values()) n.add(e);
		return {
			assets: i,
			images: a,
			audio: o,
			fonts: s,
			destroy: f
		};
	} catch (e) {
		throw f(), e;
	} finally {
		t?.removeEventListener("abort", l);
	}
}
async function Rh(e, t) {
	t?.throwIfAborted();
	let n = Xl(e);
	if (n.kind !== "font") throw Error("Recurso de fonte esperado.");
	let r = new FontFace($l(n), new Uint8Array(Yl(n.data)).buffer, {
		weight: String(n.weight),
		style: n.italic ? "italic" : "normal"
	});
	return await r.load(), t?.throwIfAborted(), r;
}
//#endregion
//#region ../../packages/edi-motion/src/assets/shapingScripts.ts
var zh = [
	"init",
	"medi",
	"fina"
], Bh = [
	"akhn",
	"rphf",
	"rkrf",
	"pref",
	"blwf",
	"abvf",
	"half",
	"pstf",
	"vatu",
	"cjct",
	"pres",
	"abvs",
	"blws",
	"psts"
], Vh = [
	{
		name: "árabe",
		pattern: /\p{Script=Arabic}/u,
		tags: ["arab"],
		features: zh
	},
	{
		name: "siríaco",
		pattern: /\p{Script=Syriac}/u,
		tags: ["syrc"],
		features: zh
	},
	{
		name: "n'ko",
		pattern: /\p{Script=Nko}/u,
		tags: ["nko "],
		features: zh
	},
	{
		name: "mongol",
		pattern: /\p{Script=Mongolian}/u,
		tags: ["mong"],
		features: zh
	},
	{
		name: "adlam",
		pattern: /\p{Script=Adlam}/u,
		tags: ["adlm"],
		features: zh
	},
	{
		name: "devanágari",
		pattern: /\p{Script=Devanagari}/u,
		tags: ["dev2", "deva"],
		features: Bh
	},
	{
		name: "bengali",
		pattern: /\p{Script=Bengali}/u,
		tags: ["bng2", "beng"],
		features: Bh
	},
	{
		name: "gurmukhi",
		pattern: /\p{Script=Gurmukhi}/u,
		tags: ["gur2", "guru"],
		features: Bh
	},
	{
		name: "guzerate",
		pattern: /\p{Script=Gujarati}/u,
		tags: ["gjr2", "gujr"],
		features: Bh
	},
	{
		name: "oriá",
		pattern: /\p{Script=Oriya}/u,
		tags: ["ory2", "orya"],
		features: Bh
	},
	{
		name: "tâmil",
		pattern: /\p{Script=Tamil}/u,
		tags: ["tml2", "taml"],
		features: Bh
	},
	{
		name: "télugo",
		pattern: /\p{Script=Telugu}/u,
		tags: ["tel2", "telu"],
		features: Bh
	},
	{
		name: "canarês",
		pattern: /\p{Script=Kannada}/u,
		tags: ["knd2", "knda"],
		features: Bh
	},
	{
		name: "malaiala",
		pattern: /\p{Script=Malayalam}/u,
		tags: ["mlm2", "mlym"],
		features: Bh
	},
	{
		name: "cingalês",
		pattern: /\p{Script=Sinhala}/u,
		tags: ["sinh"],
		features: Bh
	},
	{
		name: "khmer",
		pattern: /\p{Script=Khmer}/u,
		tags: ["khmr"],
		features: [
			"pref",
			"blwf",
			"abvf",
			"pstf",
			"cfar",
			"pres",
			"abvs",
			"blws",
			"psts"
		]
	},
	{
		name: "birmanês",
		pattern: /\p{Script=Myanmar}/u,
		tags: ["mym2", "mymr"],
		features: [
			"rphf",
			"pref",
			"blwf",
			"pstf",
			"pres",
			"abvs",
			"blws",
			"psts"
		]
	},
	{
		name: "tibetano",
		pattern: /\p{Script=Tibetan}/u,
		tags: ["tibt"],
		features: ["abvs", "blws"]
	}
], Hh = /[ﭐ-﷿ﹰ-﻿\u{1EE00}-\u{1EEFF}]/gu;
function Uh(e) {
	let t = e.replace(Hh, "");
	return t ? Vh.find((e) => e.pattern.test(t)) : void 0;
}
function Wh(e, t) {
	let n = [
		...t.tags,
		"DFLT",
		"dflt",
		"latn"
	].find((t) => e.has(t));
	if (!n) return `a fonte não declara o script ${t.name} no GSUB`;
	let r = e.get(n);
	return t.features.some((e) => r?.has(e)) ? null : `o GSUB ('${n}') não aplica as substituições contextuais do script ${t.name} (${t.features.slice(0, 3).join("/")})`;
}
//#endregion
//#region ../../packages/edi-motion/src/assets/fontCoverage.ts
var Gh, Kh = /\p{Variation_Selector}/u, qh = /\p{Default_Ignorable_Code_Point}/u;
function Jh(e, t) {
	if (e.remaining -= t, e.remaining < 0) throw Error("Cobertura de texto excede orçamento de avaliação.");
}
function Yh(e, t, n) {
	let r = [...e];
	for (let e = 0; e < r.length; e++) {
		let i = r[e], a = i?.codePointAt(0), o = r[e + 1];
		if (a === void 0 || i === void 0) throw Error("Cluster Unicode inválido.");
		if (Kh.test(i)) return !1;
		if (!(/^[\t\r\n]$/.test(i) || qh.test(i))) {
			if (Jh(n, 64), o && Kh.test(o)) {
				let n = o.codePointAt(0);
				if (n === void 0 || !t.glyph(a, n)) return !1;
				e++;
			} else if (!t.glyph(a)) return !1;
		}
	}
	return !0;
}
function Xh(e, t, n = { remaining: 2e6 }) {
	if (typeof e != "string" || e.length > 1e4 || !Jc(e)) throw Error("Cobertura requer texto XML válido de até 10000 caracteres.");
	if (!t.length || t.length > 8 || new Set(t.map((e) => e.id)).size !== t.length) throw Error("Cobertura requer de uma a oito fontes distintas.");
	if (!Number.isFinite(n.remaining) || n.remaining < 0) throw Error("Orçamento de cobertura inválido.");
	if (Jh(n, e.length), typeof Intl.Segmenter != "function") throw Error("Este runtime não disponibiliza segmentação Unicode verificável.");
	Gh ??= new Intl.Segmenter("und", { granularity: "grapheme" });
	let r = [], i = [], a = t.flatMap((e) => {
		try {
			return [{
				id: e.id,
				map: ql(e)
			}];
		} catch (t) {
			if (!(t instanceof Wc)) throw t;
			return r.push(e.id), i.push({
				id: e.id,
				reason: t.message
			}), [];
		}
	}), o = [], s = [], c = new Map(t.map((e) => [e.id, e])), l = /* @__PURE__ */ new Map(), u = /* @__PURE__ */ new Set(), d = /* @__PURE__ */ new Set(), f = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Set(), m = (e, t) => {
		let n = `${e}:${t.name}`, r = l.get(n);
		if (r === void 0) {
			let i = c.get(e);
			if (!i) throw Error("Fonte selecionada ausente.");
			try {
				r = Wh(Jl(i).substitution, t);
			} catch (e) {
				if (!(e instanceof Yc)) throw e;
				r = e.message;
			}
			l.set(n, r);
		}
		return r;
	}, h = 0, g = 0, _ = 0, v = !1;
	for (let { segment: t, index: r } of Gh.segment(e)) {
		g++, Jh(n, 1);
		let e = f.get(t);
		if (e === void 0 && (e = a.find(({ map: e }) => Yh(t, e, n))?.id ?? null, f.set(t, e)), e !== null) {
			d.add(e);
			let n = Uh(t), i = n ? m(e, n) : null;
			n && i !== null && (h++, u.has(t) || (u.add(t), s.length < 64 ? s.push({
				text: [...t].slice(0, 32).join(""),
				offset: r,
				script: n.name,
				fontId: e,
				reason: i
			}) : v = !0));
		} else if (_++, !p.has(t)) {
			if (p.add(t), o.length < 64) {
				let e = [...t].slice(0, 32);
				e.join("").length < t.length && (v = !0), o.push({
					text: e.join(""),
					offset: r,
					codePoints: e.map((e) => {
						let t = e.codePointAt(0);
						if (t === void 0) throw Error("Caractere Unicode ausente.");
						return t;
					})
				});
			} else v = !0;
		}
	}
	return {
		covered: !_ && !r.length && !h,
		graphemes: g,
		missingCount: _,
		missing: o,
		truncated: v,
		unsupportedFontIds: r,
		unsupportedFonts: i,
		usedFontIds: [...d],
		unshapedCount: h,
		unshaped: s
	};
}
function Zh(e, t, n) {
	let r = Xh(e, t, n);
	if (r.unsupportedFontIds.length) throw Error(`A cadeia contém fonte com cmap não verificável (${t.filter((e) => r.unsupportedFontIds.includes(e.id)).map((e) => e.name).join(", ")}). ${r.unsupportedFonts[0]?.reason ?? "Perfil Unicode não suportado."} Remova ou substitua essas fontes; adicionar alternativas não comprova a cobertura da fonte desconhecida.`);
	if (r.missingCount) {
		let e = r.missing.slice(0, 6).map((e) => e.codePoints.map((e) => `U+${e.toString(16).toUpperCase().padStart(4, "0")}`).join("+")).join(", ");
		throw Error(`Fontes incorporadas não cobrem ${r.missingCount} grupos de caracteres (${e}). Configure fontes de fallback ou escolha explicitamente uma fonte do sistema.`);
	}
	let i = r.unshaped[0];
	if (i) throw Error(`${r.unshapedCount} grupos de caracteres do script ${i.script} sairiam sem as formas contextuais: ${i.reason} (${t.find((e) => e.id === i.fontId)?.name ?? i.fontId}). Use uma fonte com suporte OpenType ao script, na frente da cadeia.`);
	return r;
}
//#endregion
//#region ../../packages/edi-motion/src/assets/imageDom.ts
function Qh(e, t) {
	let n = wu.parse(t), r = Bl.parse(e.getAttribute("data-edi-image")), i = {
		id: r,
		...n.source
	}, a = [...e.children], o = [
		"x",
		"y",
		"width",
		"height",
		"viewBox",
		"preserveAspectRatio",
		"overflow"
	], s = Eu(i, Object.fromEntries(["width", "height"].map((t) => {
		let n = e.getAttribute(t);
		if (n === null) throw Error("Dimensão de viewport ausente.");
		return [t, n];
	})), n.insets);
	if (e.getAttribute("data-edi-slice") !== "1" || a.length !== 9) throw Error("Nine-slice SVG incompleto.");
	for (let [e, t] of a.entries()) {
		let n = s.children[e];
		if (!n || t.localName !== "svg" || t.children.length !== 1 || t.firstElementChild?.localName !== "use" || t.firstElementChild.getAttribute("href") !== `#edi-${r}` || o.some((e) => t.getAttribute(e) !== n.attrs[e])) throw Error("Nine-slice SVG não corresponde à geometria/recurso declarado.");
	}
	if ([
		"width",
		"height",
		"viewBox",
		"preserveAspectRatio"
	].some((t) => e.getAttribute(t) !== s.attrs[t])) throw Error("Viewport de nine-slice incompatível.");
	let c = [e, ...a].map((e) => ({
		element: e,
		attrs: o.map((t) => [t, e.getAttribute(t)])
	})), l = !1, u = "";
	return {
		prepare(t) {
			if (l) throw Error("Nine-slice encerrado.");
			let r = Eu(i, {
				width: String(t.width),
				height: String(t.height)
			}, n.insets), s = JSON.stringify(r), c = [];
			for (let t of [
				"width",
				"height",
				"viewBox"
			]) {
				let n = r.attrs[t];
				if (n === void 0) throw Error("Geometria de viewport ausente.");
				c.push({
					element: e,
					name: t,
					value: n
				});
			}
			for (let [e, t] of a.entries()) {
				let n = r.children[e];
				if (!n) throw Error("Célula nine-slice ausente.");
				for (let e of o) {
					let r = n.attrs[e];
					if (r === void 0) throw Error("Geometria de célula ausente.");
					c.push({
						element: t,
						name: e,
						value: r
					});
				}
			}
			return () => {
				if (l) throw Error("Nine-slice encerrado.");
				if (s !== u) {
					for (let { element: e, name: t, value: n } of c) e.setAttribute(t, n);
					u = s;
				}
			};
		},
		destroy() {
			if (!l) {
				l = !0;
				for (let { element: e, attrs: t } of c) for (let [n, r] of t) r === null ? e.removeAttribute(n) : e.setAttribute(n, r);
			}
		}
	};
}
//#endregion
//#region ../../packages/edi-motion/src/audio/pcm.ts
function $h(e) {
	let t = Xl(e);
	if (t.kind !== "audio") throw Error("Recurso PCM esperado.");
	let n = Yl(t.data), r = zl(n), i = new DataView(n.buffer, n.byteOffset, n.byteLength), a = Array.from({ length: t.channels }, () => new Float32Array(t.frames));
	for (let e = 0; e < t.channels; e++) {
		let n = a[e];
		if (!n) throw Error("Canal PCM ausente.");
		for (let a = 0; a < t.frames; a++) n[a] = i.getInt16(r.dataOffset + (a * t.channels + e) * 2, !0) / 32768;
	}
	return {
		channels: a,
		sampleRate: t.sampleRate,
		frames: t.frames
	};
}
function eg(e, t = {}) {
	let n = new Map(Zl(e).map((e) => {
		if (e.kind !== "audio") throw Error("Mixer aceita somente recursos PCM.");
		return [e.id, e];
	})), r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Map(), s = t.context, c, l = !1, u = !1, d = 0, f = 0, p = 0, m = 0, h = 1, g, _, v = () => {
		if (u) throw Error("Mixer encerrado.");
	}, y = (e) => {
		let n = e instanceof Error ? e : /* @__PURE__ */ Error("Falha assíncrona de áudio.");
		t.onError ? t.onError(n) : queueMicrotask(() => {
			throw n;
		});
	}, b = (e = s?.currentTime ?? 0) => {
		if (!c || !s) return;
		for (let [t, n] of o) n.end <= e && o.delete(t);
		let t = /* @__PURE__ */ new Map(), n = 0;
		for (let e of o.values()) n += e.volume, t.set(e.end, (t.get(e.end) ?? 0) + e.volume);
		c.gain.cancelScheduledValues(e), c.gain.setValueAtTime(h / Math.max(1, n), e);
		for (let [e, r] of [...t].sort((e, t) => e[0] - t[0])) n = Math.max(0, n - r), c.gain.setValueAtTime(h / Math.max(1, n), e);
	}, x = (e = []) => {
		if (e.length > 8 || e.some((e) => !/^node-[\w-]{1,100}$/.test(e))) throw Error("Escopo de áudio inválido.");
		let t = [];
		for (let n of [...i.values()]) if (e.every((e, t) => n.scope[t] === e)) try {
			n.finish(!0);
		} catch (e) {
			t.push(e);
		}
		if (t.length) throw AggregateError(t, "Falha ao interromper vozes de áudio.");
	}, S = () => ({
		enabled: l,
		activeVoices: i.size,
		buffers: r.size,
		envelopeSegments: o.size,
		stolenVoices: p,
		skippedLate: m,
		masterVolume: h,
		contextState: s?.state ?? "not-created",
		destroyed: u
	}), C = () => {
		if (u) return;
		let e = S(), t = [];
		for (let n of a) try {
			n({ ...e });
		} catch (e) {
			t.push(e);
		}
		if (t.length) throw AggregateError(t, "Falha no observador de áudio.");
	}, w = () => {
		if (!u && s) try {
			(s.state === "closed" || !("startRendering" in s) && s.state !== "running" && l) && (l = !1, x()), C();
		} catch (e) {
			y(e);
		}
	};
	return s && s.addEventListener("statechange", w), {
		async enable() {
			if (v(), l) return;
			if (g) return g;
			let e = d;
			if (!s) {
				let e = t.view ?? window;
				if (!e.AudioContext) throw Error("Web Audio indisponível nesta plataforma.");
				s = new e.AudioContext({ latencyHint: "interactive" }), s.addEventListener("statechange", w);
			}
			let n = s, r = (async () => {
				if (!("startRendering" in n)) {
					let e = t.view ?? window;
					if (n.state !== "running" && e.navigator.userActivation && !e.navigator.userActivation.isActive) throw Error("Ative o áudio a partir de um clique/tecla do usuário.");
					await n.resume();
				}
				if (u || d !== e) throw new DOMException("Ativação de áudio cancelada.", "AbortError");
				if (n.state === "closed") throw Error("Contexto de áudio encerrado pelo host.");
				if (!("startRendering" in n) && n.state !== "running") throw Error("O dispositivo de áudio não está ativo.");
				c || (c = n.createGain(), c.connect(n.destination), b()), l = !0, C();
			})();
			g = r;
			try {
				await r;
			} finally {
				g === r && (g = void 0);
			}
		},
		disable() {
			v(), d++, l = !1, x(), C();
		},
		stop(e) {
			v(), x(e);
		},
		setVolume(e) {
			if (v(), !Number.isFinite(e) || e < 0 || e > 1) throw Error("Volume deve estar entre zero e um.");
			h = e, b(), C();
		},
		play(e, t = 1, a = 0, u = []) {
			v();
			let d = n.get(e);
			if (!d || u.length > 8 || u.some((e) => !/^node-[\w-]{1,100}$/.test(e)) || !Number.isFinite(t) || t < 0 || t > 1 || !Number.isFinite(a) || a < 0) throw Error("Recurso/volume/offset de áudio inválidos.");
			if (!l || t === 0) return null;
			let h = s, g = c;
			if (!h || !g) throw Error("Áudio ativado sem contexto/bus.");
			if (a >= d.frames / d.sampleRate) return m++, C(), null;
			for (let [e, t] of o) t.end <= h.currentTime && o.delete(e);
			if (o.size >= 512) throw Error("Orçamento de envelope de mixagem excedido.");
			let _ = r.get(d.id);
			if (!_) {
				let e = $h(d);
				_ = h.createBuffer(d.channels, d.frames, d.sampleRate);
				for (let [t, n] of e.channels.entries()) _.getChannelData(t).set(n);
				r.set(d.id, _);
			}
			let x = h.createBufferSource(), S = h.createGain(), w = ++f;
			x.buffer = _, S.gain.value = t;
			let T = h.currentTime, E = T + _.duration - a, D = !1, O = !1, k = {
				scope: [...u],
				volume: t,
				source: x,
				gain: S,
				finish(e) {
					if (D) return;
					D = !0, x.onended = null;
					let t = i.delete(w);
					e && o.delete(w);
					let n = [];
					for (let r of [
						() => {
							e && O && x.stop(h.currentTime);
						},
						() => x.disconnect(),
						() => S.disconnect(),
						() => b(),
						() => {
							t && C();
						}
					]) try {
						r();
					} catch (e) {
						n.push(e);
					}
					if (n.length) throw AggregateError(n, "Falha ao liberar voz de áudio.");
				}
			};
			x.onended = () => {
				try {
					k.finish(!1);
				} catch (e) {
					y(e);
				}
			};
			try {
				if (x.connect(S), S.connect(g), i.size >= 32) {
					let e = i.values().next().value;
					e && (e.finish(!0), p++);
				}
				return i.set(w, k), o.set(w, {
					volume: t,
					end: E
				}), b(T), x.start(T, a), O = !0, C(), w;
			} catch (e) {
				try {
					k.finish(!0);
				} catch (t) {
					throw AggregateError([e, t], "Falha ao iniciar/liberar voz de áudio.");
				}
				throw e;
			}
		},
		inspect: S,
		onChange(e) {
			if (v(), a.size >= 1e3) throw Error("Limite de observadores de áudio.");
			return a.add(e), () => {
				a.delete(e);
			};
		},
		destroy() {
			if (_) return _;
			if (u) return Promise.resolve();
			u = !0, a.clear(), d++, l = !1;
			let e = [];
			for (let t of [x, () => c?.disconnect()]) try {
				t();
			} catch (t) {
				e.push(t);
			}
			c = void 0, r.clear(), o.clear(), n.clear();
			let i = s;
			return i?.removeEventListener("statechange", w), s = void 0, _ = (async () => {
				if (i && !t.context && !("startRendering" in i) && i.state !== "closed") try {
					await i.close();
				} catch (t) {
					e.push(t);
				}
				if (e.length) throw AggregateError(e, "Falha ao encerrar recursos de áudio.");
			})(), _;
		}
	};
}
//#endregion
//#region ../../packages/edi-motion/src/data/commands.ts
var tg = G().regex(/^[a-z]+-[\w-]{1,100}$/), ng = {
	instanceId: tg,
	path: J(tg).min(1).max(16)
}, rg = Ms("operation", [
	Y({
		...ng,
		operation: Z("set"),
		value: Cs()
	}),
	Y({
		...ng,
		operation: Z("insert"),
		id: tg,
		index: q().int().min(0).max(1e3),
		value: Cs().optional()
	}),
	Y({
		...ng,
		operation: Z("remove"),
		id: tg
	}),
	Y({
		...ng,
		operation: Z("move"),
		id: tg,
		index: q().int().min(0).max(1e3)
	})
]);
function ig(e, t, n) {
	if (!Array.isArray(n) || n.length < 1 || n.length > 100) throw Error("Requer 1–100 mudanças de dados.");
	let r = J(rg).min(1).max(100).parse(n, { jitless: !0 }), i = structuredClone(new Map(t));
	for (let t of r) {
		let n = Uu(e, i, t.instanceId, t.path);
		if (t.operation === "set") {
			if (!e.document.instances.find((e) => e.id === t.instanceId)) throw Error("Instância ausente.");
			let r = {
				...n.owner,
				[n.field.id]: t.value
			}, i = [...e.models.values()].find((e) => e.fields.some((e) => e.id === n.field.id));
			if (!i) throw Error("Modelo do campo ausente.");
			let a = Vu(e, i.id, r)[n.field.id];
			if (a === void 0) throw Error("Campo ausente.");
			n.owner[n.field.id] = a;
		} else {
			if (n.field.kind !== "list" || !Array.isArray(n.value)) throw Error("Operação requer lista.");
			let r = n.value, i = r.findIndex((e) => e.id === t.id);
			if (t.operation === "insert") {
				if (i >= 0 || t.index > r.length || r.length >= 1e3) throw Error("Inserção de lista inválida.");
				let a = t.value === void 0 ? Wu(e, n.field.modelId) : Vu(e, n.field.modelId, t.value);
				r.splice(t.index, 0, {
					id: t.id,
					value: a
				});
			} else {
				if (i < 0) throw Error("Item de lista ausente.");
				let e = r.splice(i, 1)[0];
				if (!e) throw Error("Item de lista ausente.");
				if (t.operation === "move") {
					if (t.index > r.length) throw Error("Destino da lista inválido.");
					r.splice(t.index, 0, e);
				}
			}
		}
	}
	return Hu(e, i);
}
function ag(e, t) {
	if (!Number.isFinite(t)) throw Error("Quadro inválido.");
	let n = e.keys, r = 0, i = n.length - 1;
	for (; r < i;) {
		let e = Math.ceil((r + i) / 2), a = n[e];
		a && a.frame <= t ? r = e : i = e - 1;
	}
	let a = n[r];
	if (!a) throw Error("Ordem de desenho sem chaves.");
	return a.order;
}
function og(e, t, n = /* @__PURE__ */ new Map()) {
	for (let r of e?.drawOrders ?? []) n.set(r.scopeId ?? "", ag(r, t));
	return n;
}
function sg(e, t, n, r) {
	let i = og(e, t);
	if (!r.some((e) => e.animation.drawOrders?.length)) return i;
	let a = ud(n, r);
	for (let e of r) {
		let t = a.get(e.id);
		if (t === void 0) throw Error("Relógio de componente ausente.");
		og(e.animation, t, i);
	}
	return i;
}
function cg(e) {
	return new Set(e.flatMap((e) => (e.drawOrders ?? []).map((e) => e.scopeId ?? "")));
}
//#endregion
//#region ../../packages/edi-motion/src/behavior/events.ts
function lg(e, t, n, r, i = !1) {
	if (!Number.isFinite(n) || !Number.isFinite(r) || n < 0 || r < n) throw Error("Intervalo de eventos inválido.");
	let a = t.frames / t.fps, o = [], s = t.mode === "ping-pong" ? a * 2 : a, c = t.mode === "once" ? 0 : Math.max(0, Math.floor(n / s)), l = t.mode === "once" ? 0 : Math.floor(r / s);
	if (l - c > 1e4) throw Error("Intervalo excede o orçamento de ciclos de eventos.");
	let u = (e, t, a) => {
		if ((t > n || i && t === n) && t <= r) {
			if (o.length >= 512) throw Error("Orçamento de eventos por avanço excedido; reduza o intervalo.");
			o.push({
				event: e,
				seconds: t,
				direction: a
			});
		}
	};
	for (let n of e) if (n.animationId === t.id) for (let e = c; e <= l; e++) u(n, e * s + n.frame / t.fps, "forward"), t.mode === "ping-pong" && n.frame > 0 && n.frame < t.frames && u(n, (e + 1) * s - n.frame / t.fps, "reverse");
	return o.sort((e, t) => e.seconds - t.seconds || (e.event.id < t.event.id ? -1 : +(e.event.id > t.event.id)));
}
//#endregion
//#region ../../packages/edi-motion/src/behavior/engine.ts
function ug(e, t, n, r = {}) {
	let i = zd(e, r.authoredTargets ?? n, t, r.parameters), a = r.animationId ? t.find((e) => e.id === r.animationId) : void 0;
	if (r.animationId && (!a || i.machines.length > 0)) throw Error("Clip inicial incompatível com a cena.");
	return {
		behavior: i,
		objects: new Map([...n].map(([e, t]) => [e, { ...t.transform }])),
		animations: t.map((e) => ({
			...e,
			tracks: e.tracks.filter((e) => n.has(e.targetId))
		})),
		drivers: r.drivers,
		data: i.data ? Ru(i.data) : void 0,
		animation: a,
		parameters: r.parameters,
		formulas: Cd(i.formulas ?? [])
	};
}
function dg(e, t) {
	if (!e.formulas?.length) return t;
	let n = new Map(t.inputs);
	for (let r of e.formulas) {
		let i = e.behavior.inputs.find((e) => e.id === r.inputId);
		if (!i || i.kind === "trigger") throw Error("Input de fórmula ausente.");
		let a = Sd(r.expression, (e) => {
			let t = n.get(e);
			if (t === void 0) throw Error("Fórmula lê input ausente.");
			return t;
		}, t.seconds, Pd);
		i.kind === "number" && typeof a == "number" && (a = Math.min(i.max, Math.max(i.min, a))), n.set(r.inputId, Rd(i, a));
	}
	return {
		...t,
		inputs: n
	};
}
function fg(e, t) {
	if (t.machineId === null && e.behavior.machines.length === 0) return { layers: [] };
	let n = e.behavior.machines.find((e) => e.id === t.machineId);
	if (!n) throw Error("Máquina não encontrada.");
	return n;
}
function pg(e, t) {
	let n = e.states.find((e) => e.id === t);
	if (!n) throw Error("Estado não encontrado.");
	return n;
}
function mg(e, t) {
	let n = e.animations.find((e) => e.id === t);
	if (!n) throw Error("Animação não encontrada.");
	return n;
}
function hg(e, t) {
	let n = e.inputs.get(t);
	if (typeof n != "number") throw Error("Input numérico ausente.");
	return n;
}
function gg(e, t = e.behavior.defaultMachineId) {
	let n = fg(e, { machineId: t }), r = {
		machineId: t,
		...e.animation ? { animationEntered: !0 } : {},
		seconds: 0,
		triggers: /* @__PURE__ */ new Set(),
		inputs: new Map(e.behavior.inputs.flatMap((e) => e.kind === "trigger" ? [] : [[e.id, e.initial]])),
		layers: new Map(n.layers.map((e) => [e.id, {
			stateId: e.entryStateId,
			seconds: 0,
			entered: !0
		}]))
	}, i = e.data?.document.context?.instanceId;
	return dg(e, e.data ? _g(e, i ? {
		...r,
		dataInstanceId: i
	} : r, new Map(e.data.initial)) : r);
}
function _g(e, t, n) {
	if (!e.data) throw Error("Sessão sem modelos de dados.");
	let r = new Map(t.inputs);
	for (let i of e.data.document.links) {
		let a = e.behavior.inputs.find((e) => e.id === i.inputId);
		if (!a) throw Error("Input vinculado ausente.");
		r.set(i.inputId, Rd(a, Uu(e.data, n, zu(e.data.document, i, t.dataInstanceId), i.path).value));
	}
	return dg(e, {
		...t,
		data: n,
		inputs: r
	});
}
function vg(e, t, n) {
	if (!e.data || !t.data) throw Error("Sessão sem modelos de dados.");
	return _g(e, t, ig(e.data, t.data, n));
}
function yg(e, t, n) {
	let r = e.data?.document;
	if (!r?.context || !t.data) throw Error("Prancheta sem modelo de dados.");
	let i = r.instances.find((e) => e.id === n);
	if (!i || i.modelId !== r.context.modelId) throw Error("Instância precisa ser do modelo da prancheta.");
	return t.dataInstanceId === n ? t : _g(e, {
		...t,
		dataInstanceId: n
	}, t.data);
}
function bg(e, t, n, r) {
	let i = e.behavior.inputs.find((e) => e.id === n);
	if (!i) throw Error("Input não encontrado.");
	if (e.formulas?.some((e) => e.inputId === n)) throw Error("Input calculado por fórmula é somente leitura.");
	let a = Rd(i, r);
	if (t.inputs.get(n) === a) return t;
	let o = e.data?.document, s = o?.links.find((e) => e.inputId === n);
	if (o && s) {
		if (s.direction !== "two-way") throw Error("Input é controlado pelo modelo de dados (somente leitura).");
		return vg(e, t, [{
			operation: "set",
			instanceId: zu(o, s, t.dataInstanceId),
			path: s.path,
			value: a
		}]);
	}
	let c = new Map(t.inputs);
	return c.set(n, a), dg(e, {
		...t,
		inputs: c
	});
}
function xg(e, t, n) {
	if (!e.behavior.inputs.some((e) => e.id === n && e.kind === "trigger")) throw Error("Gatilho não encontrado.");
	return {
		...t,
		triggers: /* @__PURE__ */ new Set([...t.triggers, n])
	};
}
function Sg(e, t) {
	if (t.kind === "base") return 1 / t.speed;
	let n = t.kind === "animation" ? [t.animationId] : t.points.map((e) => e.animationId);
	return Math.max(...n.map((t) => {
		let n = mg(e, t);
		return n.frames / n.fps;
	})) / t.speed;
}
function Cg(e, t) {
	let n = hg(t, e.inputId), r = e.points[0], i = e.points.at(-1);
	if (!r || !i) throw Error("Blend sem pontos.");
	if (n <= r.at) return {
		a: r,
		b: r,
		weight: 0
	};
	if (n >= i.at) return {
		a: i,
		b: i,
		weight: 0
	};
	let a = e.points.findIndex((e) => e.at > n), o = e.points[a - 1], s = e.points[a];
	if (!o || !s) throw Error("Intervalo de blend inválido.");
	return {
		a: o,
		b: s,
		weight: (n - o.at) / (s.at - o.at)
	};
}
function wg(e, t, n) {
	let r = e.objects.get(t);
	if (!r) throw Error("Pose de referência ausente.");
	return r[n] ?? 0;
}
function Tg(e, t, n, r) {
	let i = {
		transforms: /* @__PURE__ */ new Map(),
		parameters: /* @__PURE__ */ new Map(),
		orders: new Map(r < .5 ? t.orders : n.orders)
	};
	for (let a of /* @__PURE__ */ new Set([...t.transforms.keys(), ...n.transforms.keys()])) {
		let o = t.transforms.get(a), s = n.transforms.get(a), c = {};
		for (let t of Gu.options) if (o?.[t] !== void 0 || s?.[t] !== void 0) {
			let n = o?.[t] ?? wg(e, a, t);
			c[t] = jg(t, n + ((s?.[t] ?? wg(e, a, t)) - n) * r);
		}
		i.transforms.set(a, c);
	}
	for (let a of /* @__PURE__ */ new Set([...t.parameters.keys(), ...n.parameters.keys()])) {
		let o = e.parameters?.definitions.get(a);
		if (!o) throw Error("Parâmetro de blend órfão.");
		let s = t.parameters.get(a) ?? o.initial, c = n.parameters.get(a) ?? o.initial;
		i.parameters.set(a, o.discrete ? r < .5 ? s : c : fd(o, s + (c - s) * r));
	}
	return i;
}
function Eg(e, t, n, r) {
	return {
		transforms: t ? Hm(t, n, e.drivers ?? []) : Um(r, e.drivers ?? []),
		parameters: pd(e.parameters, t, n, r, e.drivers ?? []),
		orders: sg(t, n, r, e.drivers ?? [])
	};
}
function Dg(e, t, n, r) {
	if (n.kind === "base") return Eg(e, void 0, 0, r * n.speed);
	let i = r / Sg(e, n), a = (t) => {
		let n = mg(e, t), r = ad(i * n.frames / n.fps, n);
		return Eg(e, n, r, r / n.fps);
	};
	if (n.kind === "animation") return a(n.animationId);
	let o = Cg(n, t);
	return Tg(e, a(o.a.animationId), a(o.b.animationId), o.weight);
}
function Og(e, t, n, r) {
	let i = Dg(e, t, pg(n, r.stateId), r.seconds);
	return r.blend ? Tg(e, "transforms" in r.blend.source ? r.blend.source : Dg(e, t, pg(n, r.blend.source.stateId), r.blend.source.seconds), i, od(r.blend.elapsed / r.blend.duration, r.blend.easing)) : i;
}
function kg(e, t) {
	if (t.operator === "trigger") return e.triggers.has(t.inputId);
	let n = e.inputs.get(t.inputId);
	if (t.operator === "eq") return n === t.value;
	if (t.operator === "neq") return n !== t.value;
	if (typeof n != "number" || typeof t.value != "number") throw Error("Condição numérica incompatível.");
	return t.operator === "gt" ? n > t.value : t.operator === "gte" ? n >= t.value : t.operator === "lt" ? n < t.value : n <= t.value;
}
function Ag(e, t, n) {
	return n.blend?.interrupt === "never" ? [] : t.transitions.filter((t) => (t.from === "*" || t.from === n.stateId) && t.to !== n.stateId && t.conditions.every((t) => kg(e, t))).sort((e, t) => t.priority - e.priority);
}
function jg(e, t) {
	let [n, r] = Ku[e];
	if (!Number.isFinite(t)) throw Error("Pose calculada excedeu o intervalo numérico.");
	return Math.max(n, Math.min(r, t));
}
function Mg(e, t) {
	let n = new Map([...e.objects].map(([e, t]) => [e, { ...t }])), r = fg(e, t), i = /* @__PURE__ */ new Map(), a = new Map([...e.parameters?.definitions ?? []].map(([e, t]) => [e, t.initial]));
	if (r.layers.length === 0) {
		let r = Eg(e, e.animation, e.animation ? ad(t.seconds, e.animation) : 0, t.seconds);
		for (let [e, t] of r.parameters) a.set(e, t);
		for (let [e, t] of r.orders) i.set(e, t);
		for (let [e, t] of r.transforms) {
			let r = n.get(e);
			if (!r) throw Error("Objeto de componente ausente.");
			Object.assign(r, t);
		}
	}
	for (let o of r.layers) {
		if (o.weight === 0) continue;
		let r = t.layers.get(o.id);
		if (!r) throw Error("Relógio de camada ausente.");
		let s = Og(e, t, o, r);
		if (o.weight >= .5) for (let [e, t] of s.orders) (!o.targetIds.length || e !== "" && o.targetIds.includes(e)) && i.set(e, t);
		for (let [t, r] of s.transforms) {
			if (o.targetIds.length && !o.targetIds.includes(t)) continue;
			let i = n.get(t);
			if (!i) throw Error("Objeto de camada ausente.");
			for (let n of o.properties) {
				let a = r[n];
				if (a === void 0) continue;
				let s = wg(e, t, n), c = i[n] ?? s;
				i[n] = jg(n, o.mode === "additive" ? c + (a - s) * o.weight : c + (a - c) * o.weight);
			}
		}
		for (let [t, n] of s.parameters) {
			let r = e.parameters?.definitions.get(t), i = a.get(t);
			if (!r || i === void 0) throw Error("Parâmetro de camada órfão.");
			if (!o.targetIds.length || r.ownerIds.every((e) => o.targetIds.includes(e))) {
				if (r.discrete) {
					if (o.mode === "additive") throw Error("Canais discretos não admitem camada aditiva.");
					o.weight >= .5 && a.set(t, n);
				} else a.set(t, fd(r, o.mode === "additive" ? i + (n - r.initial) * o.weight : i + (n - i) * o.weight));
			}
		}
	}
	let o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map();
	for (let r of e.behavior.bindings) {
		let i = t.inputs.get(r.inputId);
		if (r.kind === "parameter") {
			let t = dd([], r.targetId, r.property), n = e.parameters?.definitions.get(t);
			if (!n || typeof i != "number") throw Error("Binding de parâmetro inválido.");
			a.set(t, fd(n, i * r.scale + r.offset));
		} else if (r.kind === "transform") {
			let e = n.get(r.targetId);
			if (!e || typeof i != "number") throw Error("Binding numérico inválido.");
			e[r.property] = jg(r.property, i * r.scale + r.offset);
		} else if (r.kind === "text") {
			if (typeof i != "string") throw Error("Binding de texto inválido.");
			o.set(r.targetId, i);
		} else if (r.kind === "color") {
			if (typeof i != "string") throw Error("Binding de cor inválido.");
			s.set(r.targetId, {
				...s.get(r.targetId),
				[r.property]: i
			});
		} else if (r.kind === "semantics") {
			if (i === void 0) throw Error("Binding semântico sem valor.");
			l.set(r.targetId, {
				...l.get(r.targetId),
				[r.property]: r.template.replace("{valor}", () => Pd(i))
			});
		} else {
			if (typeof i != "boolean") throw Error("Binding de visibilidade inválido.");
			c.set(r.targetId, r.invert ? !i : i);
		}
	}
	return {
		poses: n,
		parameters: a,
		text: o,
		colors: s,
		visibility: c,
		semantics: l,
		orders: i
	};
}
function Ng(e, t, n) {
	if (!Number.isFinite(n) || n < 0 || n > 10) throw Error("Avanço requer 0–10 segundos.");
	if (!Number.isFinite(t.seconds) || t.seconds < 0 || t.seconds + n > 1e9) throw Error("Relógio de sessão fora do intervalo permitido.");
	let r = {
		...t,
		triggers: new Set(t.triggers),
		layers: new Map([...t.layers].map(([e, t]) => [e, structuredClone(t)]))
	}, i = fg(e, r), a = [], o = n, s = 0;
	for (;;) {
		if (++s > 256) throw Error("Ciclo de transições ou orçamento de passos excedido; sessão preservada.");
		let t = !1;
		for (let n of i.layers) {
			let i = r.layers.get(n.id);
			if (!i) throw Error("Relógio ausente.");
			let a = Sg(e, pg(n, i.stateId)), o = Ag(r, n, i).find((e) => e.exitAt === null || i.seconds >= e.exitAt * a);
			if (!o) continue;
			let s = i.blend ? Og(e, r, n, i) : {
				stateId: i.stateId,
				seconds: i.seconds
			};
			r.layers.set(n.id, {
				stateId: o.to,
				seconds: 0,
				entered: !0,
				...o.duration > 0 ? { blend: {
					source: s,
					elapsed: 0,
					duration: o.duration,
					easing: o.easing,
					transitionId: o.id,
					interrupt: o.interrupt
				} } : {}
			}), t = !0;
		}
		if (r.triggers.clear(), t) continue;
		let n = o;
		for (let t of i.layers) {
			let i = r.layers.get(t.id);
			if (!i) throw Error("Relógio ausente.");
			let a = Sg(e, pg(t, i.stateId));
			for (let e of Ag(r, t, i)) e.exitAt !== null && e.exitAt * a > i.seconds && (n = Math.min(n, e.exitAt * a - i.seconds));
			i.blend && (n = Math.min(n, i.blend.duration - i.blend.elapsed));
		}
		if (e.animation && i.layers.length === 0) {
			for (let t of lg(e.behavior.events, e.animation, r.seconds, r.seconds + n, r.animationEntered ?? !1)) {
				if (a.length >= 512) throw Error("Orçamento agregado de eventos excedido; sessão preservada.");
				a.push({
					layerId: null,
					stateId: null,
					animationId: e.animation.id,
					eventId: t.event.id,
					name: t.event.name,
					data: { ...t.event.data },
					direction: t.direction,
					time: t.seconds
				});
			}
			r.animationEntered = !1;
		}
		for (let t of i.layers) {
			let i = r.layers.get(t.id);
			if (!i) throw Error("Relógio ausente.");
			let o = pg(t, i.stateId), s = Sg(e, o), c = o.kind === "blend1d" ? Cg(o, r) : null;
			if (o.kind !== "base") {
				let l = mg(e, o.kind === "animation" ? o.animationId : c && c.weight >= .5 ? c.b.animationId : c ? c.a.animationId : ""), u = l.frames / l.fps / s;
				for (let o of lg(e.behavior.events, l, i.seconds * u, (i.seconds + n) * u, i.entered)) {
					if (a.length >= 512) throw Error("Orçamento agregado de eventos excedido; sessão preservada.");
					a.push({
						layerId: t.id,
						stateId: i.stateId,
						animationId: l.id,
						eventId: o.event.id,
						name: o.event.name,
						data: { ...o.event.data },
						direction: o.direction,
						time: r.seconds + o.seconds / u - i.seconds
					});
				}
			}
			i.entered = !1, i.seconds += n, i.blend && (i.blend.elapsed += n, "transforms" in i.blend.source || (i.blend.source.seconds += n), i.blend.elapsed >= i.blend.duration && delete i.blend);
		}
		if (r.seconds += n, r.inputs = dg(e, r).inputs, o -= n, n === 0 && o > 0) throw Error("Relógio não avançou; sessão preservada.");
		if (o === 0 && !i.layers.some((t) => {
			let n = r.layers.get(t.id);
			return n && Ag(r, t, n).some((r) => r.exitAt !== null && n.seconds >= r.exitAt * Sg(e, pg(t, n.stateId)));
		})) break;
	}
	let c = (e, t) => e === t ? 0 : e === null ? -1 : t === null ? 1 : e < t ? -1 : 1;
	return a.sort((e, t) => e.time - t.time || c(e.layerId, t.layerId) || c(e.eventId, t.eventId)), {
		session: r,
		events: a,
		frame: Mg(e, r)
	};
}
function Pg(e, t, n, r) {
	let i = e.behavior.bindings.find((e) => e.id === n);
	if (i?.direction !== "two-way") throw Error("Binding não permite escrita reversa.");
	if (i.kind === "transform" || i.kind === "parameter") {
		if (typeof r != "number" || i.scale === 0) throw Error("Conversão reversa inválida.");
		let n = i.kind === "transform" ? Ku[i.property] : e.parameters?.definitions.get(dd([], i.targetId, i.property))?.bounds;
		if (!n) throw Error("Destino reverso ausente.");
		let [a, o] = n;
		if (!Number.isFinite(r) || r < a || r > o) throw Error("Valor de destino inválido.");
		return bg(e, t, i.inputId, (r - i.offset) / i.scale);
	}
	return bg(e, t, i.inputId, r);
}
//#endregion
//#region ../../packages/edi-motion/src/behavior/listeners.ts
function Fg(e, t, n, r, i) {
	let a = t;
	for (let t of e.behavior.listeners) if (t.event === n && t.targetId === r) for (let n of t.actions) if (n.kind === "trigger") a = xg(e, a, n.inputId);
	else if (n.kind === "set-input") a = bg(e, a, n.inputId, n.value);
	else {
		if (!i || !Number.isFinite(i.x) || !Number.isFinite(i.y) || i.viewBox.some((e) => !Number.isFinite(e)) || i.viewBox[2] <= 0 || i.viewBox[3] <= 0) throw Error("Listener de coordenada requer ponto e viewBox válidos.");
		let t = e.behavior.inputs.find((e) => e.id === n.inputId);
		if (t?.kind !== "number") throw Error("Input de coordenada inválido.");
		let r = n.axis === "x" ? 0 : 1, o = n.axis === "x" ? i.viewBox[2] : i.viewBox[3], s = n.axis === "x" ? i.x : i.y, c = n.normalized ? (s - (i.viewBox[r] ?? 0)) / o : s;
		a = bg(e, a, t.id, Math.max(t.min, Math.min(t.max, c)));
	}
	return a;
}
//#endregion
//#region ../../packages/edi-motion/src/drawOrderDom.ts
function Ig(e, t) {
	let n = new Map([...e].map(([e, t]) => [t, e])), r = /* @__PURE__ */ new Map();
	if (t.size) for (let [i, a] of e) {
		let e = a.parentElement, o = e?.getAttribute("data-edi-basis") === i ? e : a, s = o.parentElement;
		if (!s) continue;
		let c = s.parentElement, l = c && c.firstElementChild === s ? n.get(c) ?? "" : "";
		if (!t.has(l)) continue;
		let u = r.get(l);
		u || (u = {
			container: s,
			authored: [],
			members: /* @__PURE__ */ new Map()
		}, r.set(l, u)), u.container === s && u.members.set(i, o);
	}
	for (let e of r.values()) {
		let t = new Set(e.members.values());
		e.authored = [...e.container.children].filter((e) => t.has(e));
	}
	function i(e, t) {
		let n = new Set(t), r = [...e.container.children].filter((e) => n.has(e));
		if (r.length !== t.length || r.every((e, n) => e === t[n])) return;
		let i = r.at(-1)?.nextSibling ?? null;
		for (let n of t) e.container.insertBefore(n, i);
	}
	return {
		paint(e) {
			for (let [t, n] of r) {
				let r = e.get(t);
				if (!r) {
					i(n, n.authored);
					continue;
				}
				let a = [], o = /* @__PURE__ */ new Set();
				for (let e of r) {
					let t = n.members.get(e);
					t && !o.has(t) && (a.push(t), o.add(t));
				}
				i(n, [...a, ...n.authored.filter((e) => !o.has(e))]);
			}
		},
		destroy() {
			for (let e of r.values()) i(e, e.authored);
		}
	};
}
//#endregion
//#region ../../packages/edi-motion/src/frameLoop.ts
function Lg(e) {
	let t = e.ownerDocument.defaultView;
	if (!t) throw Error("O player requer uma janela DOM ativa.");
	return t;
}
function Rg(e, t, n = {}) {
	let r = Lg(e), i = n.autoplay !== !1, a = !0, o = !1, s = !1, c = null, l = 0, u = i, d = !1, f = r.matchMedia("(prefers-reduced-motion:reduce)"), p = {
		respectReducedMotion: n.respectReducedMotion !== !1,
		pauseOffscreen: n.pauseOffscreen !== !1
	}, m = () => p.respectReducedMotion && f.matches, h = null, g = () => !o && !s && (i || t.hasActivity?.()) && (!p.pauseOffscreen || a) && !e.ownerDocument.hidden && !m(), _ = () => {
		u !== i && (u = i, n.onPlaybackChange?.(i));
		let e = i && !!g();
		d !== e && (d = e, n.onActivityChange?.(e));
	}, v = () => {
		c !== null && r.cancelAnimationFrame(c), c = null;
	}, y = (e) => {
		s = !0, i = !1, v(), _();
		let t = e instanceof Error ? e : /* @__PURE__ */ Error("Falha na execução do player.");
		if (n.onError) n.onError(t);
		else throw t;
		return t;
	};
	function b(e) {
		if (c = null, g()) try {
			let n = t.advance(Math.max(0, e - l) / 1e3, i);
			if (o) return;
			i &&= n, l = e, t.paint(m()), _(), g() && c === null && (c = r.requestAnimationFrame(b));
		} catch (e) {
			y(e);
		}
	}
	function x(e = !1) {
		if (!o) {
			g() || v();
			try {
				t.paint(m()), _(), g() && c === null && (l = r.performance.now(), c = r.requestAnimationFrame(b));
			} catch (t) {
				let n = y(t);
				if (e) throw n;
			}
		}
	}
	function S() {
		if (p.pauseOffscreen && !h) {
			let t = new r.IntersectionObserver((e) => {
				h !== t || o || (a = e.some((e) => e.isIntersecting), x());
			});
			h = t, t.observe(e);
		} else !p.pauseOffscreen && h && (h.disconnect(), h = null, a = !0);
	}
	let C = () => {
		if (o) throw Error("O player foi encerrado.");
	}, w = () => {
		o || (o = !0, i = !1, v(), h?.disconnect(), e.ownerDocument.removeEventListener("visibilitychange", T), f?.removeEventListener("change", T), _());
	}, T = () => x();
	e.ownerDocument.addEventListener("visibilitychange", T), f?.addEventListener("change", T);
	try {
		S(), x(!0);
	} catch (e) {
		throw w(), e;
	}
	return {
		get playing() {
			return i;
		},
		get reducedMotion() {
			return m();
		},
		play() {
			C(), s = !1, t.beforePlay?.(), i = !0, x(!0);
		},
		pause() {
			C(), i = !1, x(!0);
		},
		invalidate() {
			C(), x(!0);
		},
		setPolicy(e) {
			if (C(), Object.keys(e).some((e) => !["respectReducedMotion", "pauseOffscreen"].includes(e)) || Object.values(e).some((e) => e !== void 0 && typeof e != "boolean")) throw Error("Política de reprodução inválida.");
			let t = {
				respectReducedMotion: e.respectReducedMotion ?? p.respectReducedMotion,
				pauseOffscreen: e.pauseOffscreen ?? p.pauseOffscreen
			};
			(t.respectReducedMotion !== p.respectReducedMotion || t.pauseOffscreen !== p.pauseOffscreen) && (e.respectReducedMotion !== void 0 && (p.respectReducedMotion = e.respectReducedMotion), e.pauseOffscreen !== void 0 && (p.pauseOffscreen = e.pauseOffscreen), S(), x(!0));
		},
		fail: y,
		destroy: w
	};
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/domElements.ts
function zg(e, t) {
	return e.namespaceURI === "http://www.w3.org/2000/svg" && e.localName === t.tag && e.attributes.length === Object.keys(t.attrs).length && Object.entries(t.attrs).every(([t, n]) => e.getAttribute(t) === n) && e.children.length === t.children.length && t.children.every((t, n) => {
		let r = e.children[n];
		return !!r && zg(r, t);
	});
}
function Bg(e, t) {
	let n = e.createElementNS("http://www.w3.org/2000/svg", t.tag);
	for (let [e, r] of Object.entries(t.attrs)) n.setAttribute(e, r);
	for (let r of t.children) n.append(Bg(e, r));
	return n;
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/gradientDom.ts
function Vg(e, t) {
	let n = [], r = [];
	function i(e) {
		for (let t of e.content) {
			t.gradients && n.push(t.gradients);
			for (let e of mp(t.paintLayers)) n.push({ fill: e });
			t.filter && r.push(t.filter);
		}
		for (let t of e.components ?? []) i(t.document);
	}
	i(t);
	let a = /* @__PURE__ */ new Map();
	for (let t of e.querySelectorAll("[id^=\"edi-gradient-\"],[id^=\"edi-pattern-\"],[id^=\"edi-filter-\"]")) {
		let e = t.getAttribute("id");
		if (!e) throw Error("Gradiente sem identidade.");
		let n = a.get(e) ?? [];
		n.push(t), a.set(e, n);
	}
	for (let e of [...Lf(n), ...ip(r)]) {
		let t = a.get(e.attrs.id ?? ""), n = t?.[0];
		if (!n || t?.length !== 1 || !zg(n, e)) throw Error("Gradiente/padrão/filtro SVG não corresponde à definição tipada.");
	}
}
//#endregion
//#region ../../packages/edi-motion/src/graphics/vectorEffectDom.ts
var Hg = /* @__PURE__ */ new WeakMap();
function Ug(e, t, n) {
	let r = e;
	for (; r.ownerSVGElement;) r = r.ownerSVGElement;
	let i = /* @__PURE__ */ new Map();
	for (let e of r.querySelectorAll("[id^=\"edi-effect-\"]")) {
		let t = e.id, n = i.get(t) ?? [];
		n.push(e), i.set(t, n);
	}
	let a = n.map((e) => {
		let n = Ep(e), r = i.get(Tp(e)), a = t.get(e.targetId), o = e.kind === "clip" ? "clip-path" : "mask";
		if (!a || !r?.[0] || r.length !== 1 || !zg(r[0], n) || a.getAttribute(o) !== `url(#${Tp(e)})`) throw Error("Recorte/máscara SVG não corresponde à definição tipada.");
		return {
			frame: e,
			wrapper: a,
			attribute: o,
			original: a.getAttribute(o)
		};
	}), o = e.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "defs"), s = /* @__PURE__ */ new Map();
	o.setAttribute("data-edi-live-effects", "");
	for (let t of a) {
		let n = Hg.get(e.ownerDocument) ?? 0, r;
		do
			r = `edi-effect-live-${++n}`;
		while (e.ownerDocument.getElementById(r));
		Hg.set(e.ownerDocument, n);
		let i = Bg(e.ownerDocument, Ep(t.frame, r)), a = i.firstElementChild;
		if (!a) throw Error("Definição de efeito incompleta.");
		o.append(i), s.set(`${t.frame.targetId}:${t.frame.kind}`, {
			id: r,
			element: i,
			path: a,
			stamp: "",
			...t
		});
	}
	s.size && e.prepend(o);
	let c = !1;
	return {
		paint(e) {
			if (c) throw Error("Efeitos SVG encerrados.");
			for (let t of e) {
				let e = s.get(`${t.targetId}:${t.kind}`);
				if (!e) throw Error("Destino de efeito não pertence ao binding.");
				let n = JSON.stringify(t);
				if (e.stamp === n) continue;
				let r = Ep(t, e.id), i = r.children[0];
				if (!i) throw Error("Definição de efeito incompleta.");
				for (let [t, n] of Object.entries(r.attrs)) e.element.setAttribute(t, n);
				for (let [t, n] of Object.entries(i.attrs)) e.path.setAttribute(t, n);
				e.wrapper.setAttribute(e.attribute, `url(#${e.id})`), e.stamp = n;
			}
		},
		destroy() {
			if (!c) {
				c = !0;
				for (let e of s.values()) e.original === null ? e.wrapper.removeAttribute(e.attribute) : e.wrapper.setAttribute(e.attribute, e.original);
				o.remove(), s.clear();
			}
		}
	};
}
//#endregion
//#region ../../packages/edi-motion/src/interactiveResources.ts
function Wg(e) {
	return e.assets ? e.assets.filter((e) => e.kind === "audio") : e.audioAssets ?? [];
}
//#endregion
//#region ../../packages/edi-motion/src/layout/scroll.ts
function Gg(...e) {
	if (e.some((e) => !Number.isFinite(e) || Math.abs(e) > 1e7)) throw Error("Estado de scroll fora do intervalo permitido.");
}
function Kg(e, t, n, r) {
	if (n === 0) return { ...e };
	let i = e.position - t, a = e.velocity, o = r.damping / 2, s = o * o - r.spring, c, l;
	if (Math.abs(s) < 1e-9) {
		let e = Math.exp(-o * n), t = a + o * i;
		c = e * (i + t * n), l = e * (a - o * t * n);
	} else if (s < 0) {
		let e = Math.sqrt(-s), t = Math.cos(e * n), u = Math.sin(e * n), d = Math.exp(-o * n);
		c = d * (i * t + (a + o * i) / e * u), l = d * (a * t - (o * a + r.spring * i) / e * u);
	} else {
		let e = Math.sqrt(s), t = -o + e, r = -o - e, u = (a - r * i) / (t - r), d = i - u;
		c = u * Math.exp(t * n) + d * Math.exp(r * n), l = t * u * Math.exp(t * n) + r * d * Math.exp(r * n);
	}
	return (i === 0 ? a : i) * c <= 0 || Math.abs(c) < .01 && Math.abs(l) < .01 ? {
		position: t,
		velocity: 0
	} : {
		position: t + c,
		velocity: l
	};
}
function qg(e, t, n, r, i) {
	if (Gg(e.position, e.velocity, t, n), t > n) throw Error("Limites de scroll invertidos.");
	if (e.position < t || e.position > n) return i.bounce ? Kg(e, Math.max(t, Math.min(n, e.position)), r, i) : {
		position: Math.max(t, Math.min(n, e.position)),
		velocity: 0
	};
	let a = Math.exp(-i.friction * r), o = e.position + e.velocity / i.friction * (1 - a), s = e.velocity * a;
	if (o >= t && o <= n) return Math.abs(s) < .01 ? {
		position: o,
		velocity: 0
	} : {
		position: o,
		velocity: s
	};
	let c = o < t ? t : n;
	if (!i.bounce) return {
		position: c,
		velocity: 0
	};
	let l = 1 - (c - e.position) * i.friction / e.velocity;
	if (l <= 0 || l > 1) throw Error("Cruzamento de scroll numericamente inválido.");
	let u = -Math.log(l) / i.friction;
	return Kg({
		position: c,
		velocity: e.velocity * Math.exp(-i.friction * u)
	}, c, Math.max(0, r - u), i);
}
function Jg(e, t, n, r) {
	if (!Number.isFinite(n) || n < 0 || n > 10) throw Error("Avanço de scroll requer 0–10 segundos.");
	let i = {
		x: r.axis === "y" ? {
			position: 0,
			velocity: 0
		} : qg(e.x, t.minX, t.maxX, n, r),
		y: r.axis === "x" ? {
			position: 0,
			velocity: 0
		} : qg(e.y, t.minY, t.maxY, n, r)
	};
	return Gg(i.x.position, i.x.velocity, i.y.position, i.y.velocity), i;
}
//#endregion
//#region ../../packages/edi-motion/src/layout/dom.ts
var Yg = 0;
function Xg(e, t, n, r, i) {
	let a = Lg(e), o = t.layout;
	if (!o) throw Error("Documento sem layout.");
	if (!e.isConnected) throw Error("Anexe o SVG antes de medir seu layout.");
	let s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map();
	for (let e of t.components ?? []) {
		if (!e.document.layout) continue;
		let t = r.get(e.rootId)?.shape;
		if (!(t instanceof a.SVGSVGElement)) throw Error("Viewport de layout do componente ausente.");
		s.set(e.instanceId, t);
	}
	let u = new Set(t.playback.sources.filter((e) => e.instancePath.length === 0).map((e) => e.id)), d = /* @__PURE__ */ new Map();
	for (let e of t.content) if (u.has(e.id)) {
		if (e.parentId === void 0) throw Error("Layout sem hierarquia.");
		d.set(e.id, {
			tag: e.tag,
			parentId: e.parentId,
			isComponent: e.isComponent
		});
	}
	let f = new Map(o.containers.map((e) => [e.targetId, e.config])), p = /* @__PURE__ */ new Map(), m = /* @__PURE__ */ new Set();
	for (let [e, t] of d) {
		let n = p.get(t.parentId) ?? [];
		n.push(e), p.set(t.parentId, n);
	}
	let h = (e) => {
		for (let t of p.get(e) ?? []) m.add(t), f.has(t) && h(t);
	};
	h(null);
	let g = /* @__PURE__ */ new Map(), _ = /* @__PURE__ */ new Map(), v = /* @__PURE__ */ new Map(), y = new AbortController(), b = [], x = e.getAttribute("viewBox"), S = {
		x: e.viewBox.baseVal.x,
		y: e.viewBox.baseVal.y,
		width: e.viewBox.baseVal.width,
		height: e.viewBox.baseVal.height
	}, C = e.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "defs"), w = /* @__PURE__ */ new Map(), T = !0, E = !1, D = !1, O = null, k = !1, A = "", j = /* @__PURE__ */ new Map(), M = "", ee = () => {
		let t = i.viewport?.() ?? e.parentElement?.getBoundingClientRect();
		return {
			width: t && Number.isFinite(t.width) && t.width >= 0 ? t.width : S.width,
			height: t && Number.isFinite(t.height) && t.height >= 0 ? t.height : S.height
		};
	}, N = () => e.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g"), te = du(rd()), ne = new Map(t.playback.objects.filter((e) => e.geometry && e.tag !== "image").map((e) => [e.id, e.geometry ? ef(e.geometry) : ""])), re = () => {
		let n = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), o = new Map(t.playback.objects.map((e) => [e.id, e.transform])), u = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new Map();
		try {
			for (let t of e.querySelectorAll("[data-edi-rig-overlay]")) t instanceof a.SVGElement && (u.set(t, t.getAttribute("display")), t.setAttribute("display", "none"));
			for (let [e, { wrapper: t, shape: a }] of r) {
				n.set(t, t.getAttribute("transform")), i.set(t, t.getAttribute("display"));
				let r = o.get(e);
				if (!r) throw Error("Pose de referência de layout ausente.");
				t.setAttribute("transform", m.has(e) ? te : du(r)), t.setAttribute("display", "inline");
				let s = ne.get(e);
				if (s !== void 0) {
					if (a.localName !== "path") throw Error("Geometria base de layout não corresponde ao SVG.");
					for (let e of [a, ...hp(a)]) d.set(e, e.getAttribute("d")), e.setAttribute("d", s);
				}
			}
			for (let [e, n] of g) {
				if (f.has(e) || c.has(e) && _.has(e)) continue;
				let i = l.get(e) ?? t.content.find((t) => t.id === e)?.intrinsic ?? n.anchor.getBBox(), a = s.has(e) || n.anchor === r.get(e)?.wrapper ? au() : fu(n.anchor.getAttribute("transform") ?? ""), o = [
					[i.x, i.y],
					[i.x + i.width, i.y],
					[i.x, i.y + i.height],
					[i.x + i.width, i.y + i.height]
				].map(([e, t]) => lu(a, e ?? 0, t ?? 0)), u = Math.min(...o.map((e) => e.x)), d = Math.min(...o.map((e) => e.y));
				_.set(e, {
					x: u,
					y: d,
					width: Math.max(...o.map((e) => e.x)) - u,
					height: Math.max(...o.map((e) => e.y)) - d
				});
			}
		} finally {
			for (let [e, t] of d) t === null ? e.removeAttribute("d") : e.setAttribute("d", t);
			for (let [e, t] of i) t === null ? e.removeAttribute("display") : e.setAttribute("display", t);
			for (let [e, t] of u) t === null ? e.removeAttribute("display") : e.setAttribute("display", t);
			for (let [e, t] of n) t === null ? e.removeAttribute("transform") : e.setAttribute("transform", t);
		}
		T = !1;
	}, ie = (e) => ({
		minX: Math.min(0, e.content.x),
		maxX: Math.max(0, e.content.x + e.content.width - e.width),
		minY: Math.min(0, e.content.y),
		maxY: Math.max(0, e.content.y + e.content.height - e.height)
	}), P = () => {
		for (let [e, t] of v) {
			let n = e === null ? o.root : f.get(e);
			n?.scroll && (k && (t.state = Jg(t.state, t.bounds, 0, {
				...n.scroll,
				bounce: !1
			})), t.group.setAttribute("transform", `translate(${-t.state.x.position} ${-t.state.y.position})`));
		}
	}, F = () => {
		if (!(E || D)) {
			D = !0;
			try {
				let t = ee();
				T && re();
				let a = n.compute(o, t, d, _, x === null ? t : S), l = a.containers.get(null), u = l?.width ?? t.width, p = l?.height ?? t.height, m = /* @__PURE__ */ new Map(), h = [];
				for (let [e, t] of a.boxes) {
					let n = d.get(e);
					if (!n) throw Error("Objeto de layout ausente.");
					let i = t.x + (n.parentId === null ? S.x : 0), a = t.y + (n.parentId === null ? S.y : 0);
					if (f.has(e) || s.has(e)) {
						let t = g.get(e);
						if (!t) throw Error("Contêiner ausente.");
						let n = t.anchor === r.get(e)?.wrapper ? au() : fu(t.anchor.getAttribute("transform") ?? "");
						m.set(e, `translate(${i - n[4]} ${a - n[5]})`);
					} else {
						let n = _.get(e);
						if (!n) throw Error("Medida intrínseca ausente.");
						let o = c.get(e);
						if (o) {
							h.push(o.prepare({
								width: t.width,
								height: t.height
							})), m.set(e, `translate(${i - n.x} ${a - n.y})`);
							continue;
						}
						if (r.get(e)?.shape.localName === "text") {
							m.set(e, `translate(${i - n.x} ${a - n.y})`);
							continue;
						}
						if (n.width === 0 && t.width > 0 || n.height === 0 && t.height > 0) throw Error("Não é possível esticar geometria sem extensão. Defina um tamanho compatível.");
						let s = n.width === 0 ? 1 : t.width / n.width, l = n.height === 0 ? 1 : t.height / n.height;
						m.set(e, `matrix(${s} 0 0 ${l} ${i - n.x * s} ${a - n.y * l})`);
					}
				}
				let y = JSON.stringify([
					u,
					p,
					[...m]
				]);
				y !== M && (j = new Map([...m].map(([e, t]) => [e, fu(t)])), M = y), e.setAttribute("viewBox", `${S.x} ${S.y} ${u} ${p}`);
				for (let [e, t] of m) g.get(e)?.slot.setAttribute("transform", t);
				for (let e of h) e();
				for (let [e, t] of s) {
					let n = a.boxes.get(e);
					if (!n) throw Error("Caixa de componente ausente.");
					t.setAttribute("width", String(n.width)), t.setAttribute("height", String(n.height));
				}
				for (let [e, t] of a.containers) {
					let n = w.get(e);
					n && (n.setAttribute("x", String(e === null ? S.x : 0)), n.setAttribute("y", String(e === null ? S.y : 0)), n.setAttribute("width", String(t.width)), n.setAttribute("height", String(t.height)));
					let r = v.get(e);
					if (r) {
						r.bounds = ie(t);
						let n = e === null ? o.root : f.get(e);
						n?.scroll && (r.state = Jg(r.state, r.bounds, 0, {
							...n.scroll,
							bounce: !1
						}));
					}
				}
				O = a, A = JSON.stringify([t.width, t.height]), P(), i.changed();
			} finally {
				D = !1;
			}
		}
	}, ae = () => {
		if (!E) {
			E = !0, y.abort(), oe.disconnect();
			for (let e of b.reverse()) e();
			for (let e of [...g.values()].reverse()) e.slot.before(e.anchor), e.slot.remove();
			C.remove(), x === null ? e.removeAttribute("viewBox") : e.setAttribute("viewBox", x), g.clear(), _.clear(), v.clear(), w.clear(), c.clear(), l.clear();
		}
	}, I = () => {
		try {
			F();
		} catch (e) {
			i.error(e instanceof Error ? e : /* @__PURE__ */ Error("Falha no layout SVG."));
		}
	}, oe = new a.ResizeObserver(I);
	try {
		for (let t of m) {
			let n = r.get(t)?.wrapper, i = n?.parentElement?.closest("[data-object],[data-edi-object]"), a = i && e.contains(i) ? i.getAttribute("data-object") ?? i.getAttribute("data-edi-object") : null;
			if (!n || a !== d.get(t)?.parentId) throw Error("Hierarquia DOM incompatível com o layout do documento.");
		}
		for (let e of m) {
			let n = r.get(e);
			if (!n) throw Error("SVG de layout incompleto.");
			let i = n.wrapper.parentElement, o = i instanceof a.SVGGraphicsElement && i.getAttribute("data-edi-basis") === e ? i : n.wrapper, u = o.parentElement;
			if (!u) throw Error("Objeto de layout sem pai DOM.");
			let d = N();
			d.setAttribute("data-edi-layout", e), o.before(d), d.append(o), g.set(e, {
				anchor: o,
				parent: u,
				slot: d
			});
			let f = t.content.find((t) => t.id === e)?.imageSlice;
			if (f) {
				let t = fu(n.shape.getAttribute("transform") ?? "");
				if ([t, o === n.wrapper ? au() : fu(o.getAttribute("transform") ?? "")].some((e) => e[0] !== 1 || e[1] !== 0 || e[2] !== 0 || e[3] !== 1)) throw Error("Nine-slice com layout requer espaço SVG/basis sem rotação, skew ou escala; use transformação animável do objeto.");
				if (!(n.shape instanceof a.SVGSVGElement)) throw Error("Nine-slice requer viewport SVG.");
				let r = Qh(n.shape, f);
				c.set(e, r), l.set(e, {
					x: n.shape.x.baseVal.value + t[4],
					y: n.shape.y.baseVal.value + t[5],
					width: n.shape.width.baseVal.value,
					height: n.shape.height.baseVal.value
				}), b.push(() => r.destroy());
			}
			let p = s.get(e);
			if (p) {
				let e = [p.getAttribute("width"), p.getAttribute("height")];
				b.push(() => {
					for (let [t, n] of ["width", "height"].entries()) {
						let r = e[t];
						r == null ? p.removeAttribute(n) : p.setAttribute(n, r);
					}
				});
			}
		}
		e.prepend(C);
		for (let [t, n] of [[null, o.root], ...o.containers.map((e) => [e.targetId, e.config])]) {
			let o = t === null ? (p.get(null) ?? []).flatMap((e) => {
				let t = g.get(e)?.slot;
				return t ? [t] : [];
			}) : [], s = t === null ? e : r.get(t)?.shape;
			if (!(s instanceof a.SVGGraphicsElement)) throw Error("Viewport de layout ausente.");
			let c = t === null ? o[0]?.parentElement : s;
			if (!c) continue;
			let l = N(), u = N();
			if (l.setAttribute("data-edi-layout-content", t ?? "artboard"), l.append(u), t === null) {
				o[0]?.before(l);
				for (let e of o) u.append(e);
			} else {
				for (; c.firstChild;) u.append(c.firstChild);
				c.append(l);
			}
			if (b.push(() => {
				for (let e of [...u.childNodes]) l.before(e);
				l.remove();
			}), n.clip || n.scroll) {
				let n;
				do
					n = `edi-layout-clip-${++Yg}`;
				while (e.ownerDocument.getElementById(n));
				let r = e.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "clipPath"), i = e.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
				r.id = n, r.setAttribute("clipPathUnits", "userSpaceOnUse"), r.append(i), C.append(r), l.setAttribute("clip-path", `url(#${n})`), w.set(t, i);
			}
			if (!n.scroll) continue;
			let d = {
				group: u,
				viewport: s,
				state: {
					x: {
						position: 0,
						velocity: 0
					},
					y: {
						position: 0,
						velocity: 0
					}
				},
				bounds: {
					minX: 0,
					maxX: 0,
					minY: 0,
					maxY: 0
				},
				dragging: !1
			};
			if (v.set(t, d), i.interactive === !1) continue;
			let f = s.getAttribute("tabindex"), m = s.getAttribute("aria-label"), h = s.style.touchAction;
			s.setAttribute("tabindex", "0"), m || s.setAttribute("aria-label", "Área de rolagem"), s.style.touchAction = n.scroll.axis === "x" ? "pan-y" : n.scroll.axis === "y" ? "pan-x" : "none", b.push(() => {
				f === null ? s.removeAttribute("tabindex") : s.setAttribute("tabindex", f), m === null ? s.removeAttribute("aria-label") : s.setAttribute("aria-label", m), s.style.touchAction = h;
			});
			let _ = n.scroll, x = (e, t) => {
				let n = structuredClone(d.state);
				return _.axis !== "y" && (d.state.x = {
					position: Math.max(d.bounds.minX, Math.min(d.bounds.maxX, d.state.x.position + e)),
					velocity: 0
				}), _.axis !== "x" && (d.state.y = {
					position: Math.max(d.bounds.minY, Math.min(d.bounds.maxY, d.state.y.position + t)),
					velocity: 0
				}), P(), i.changed(), n.x.position !== d.state.x.position || n.y.position !== d.state.y.position;
			};
			s.addEventListener("wheel", (e) => {
				let n = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? O?.containers.get(t)?.height ?? 1 : 1;
				x(e.deltaX * n, e.deltaY * n) && (e.preventDefault(), e.stopPropagation());
			}, {
				signal: y.signal,
				passive: !1
			}), s.addEventListener("keydown", (e) => {
				if (e.defaultPrevented || e.target !== s) return;
				let n = e.key === "ArrowLeft" ? [-40, 0] : e.key === "ArrowRight" ? [40, 0] : e.key === "ArrowUp" ? [0, -40] : e.key === "ArrowDown" ? [0, 40] : e.key === "PageDown" ? [0, O?.containers.get(t)?.height ?? 0] : e.key === "PageUp" ? [0, -(O?.containers.get(t)?.height ?? 0)] : null;
				n && x(n[0] ?? 0, n[1] ?? 0) && (e.preventDefault(), e.stopPropagation());
			}, { signal: y.signal });
			let S = null, T = !1, D = () => {
				if (!S) return;
				let e = S.pointerId;
				d.state = S.state, S = null, d.dragging = !1, s.hasPointerCapture(e) && s.releasePointerCapture(e), P(), E || i.changed();
			};
			b.push(D), s.addEventListener("pointerdown", (e) => {
				if (T = !1, S || e.button !== 0 || d.bounds.minX === d.bounds.maxX && d.bounds.minY === d.bounds.maxY) return;
				let t = u.parentElement instanceof a.SVGGraphicsElement ? u.parentElement.getScreenCTM() : s.getScreenCTM();
				if (!t) return;
				let n;
				try {
					n = cu([
						t.a,
						t.b,
						t.c,
						t.d,
						t.e,
						t.f
					]);
				} catch (e) {
					i.error(e instanceof Error ? e : /* @__PURE__ */ Error("Transformação singular no scroll."));
					return;
				}
				let r = lu(n, e.clientX, e.clientY);
				S = {
					pointerId: e.pointerId,
					inverse: n,
					start: r,
					previous: {
						...r,
						time: e.timeStamp
					},
					state: structuredClone(d.state),
					moved: !1
				}, d.dragging = !0, s.setPointerCapture(e.pointerId);
			}, { signal: y.signal }), s.addEventListener("pointermove", (e) => {
				if (!S || S.pointerId !== e.pointerId) return;
				let t = lu(S.inverse, e.clientX, e.clientY), n = (e.timeStamp - S.previous.time) / 1e3;
				S.moved ||= Math.hypot(t.x - S.start.x, t.y - S.start.y) > 3;
				for (let e of ["x", "y"]) {
					if (_.axis !== "both" && _.axis !== e) continue;
					let r = e === "x" ? d.bounds.minX : d.bounds.minY, i = e === "x" ? d.bounds.maxX : d.bounds.maxY, a = S.state[e].position - (t[e] - S.start[e]), o = Math.max(r, Math.min(i, a));
					d.state[e] = {
						position: _.bounce && !k ? o + (a - o) * .25 : o,
						velocity: n > 0 ? Math.max(-2e4, Math.min(2e4, (S.previous[e] - t[e]) / n)) : d.state[e].velocity
					};
				}
				S.previous = {
					...t,
					time: e.timeStamp
				}, P(), i.changed();
			}, { signal: y.signal }), s.addEventListener("pointerup", (e) => {
				S && S.pointerId === e.pointerId && (T = S.moved, S = null, d.dragging = !1, s.hasPointerCapture(e.pointerId) && s.releasePointerCapture(e.pointerId), i.changed());
			}, { signal: y.signal }), s.addEventListener("pointercancel", D, { signal: y.signal }), s.addEventListener("lostpointercapture", D, { signal: y.signal }), s.addEventListener("click", (e) => {
				T && (T = !1, e.preventDefault(), e.stopImmediatePropagation());
			}, {
				signal: y.signal,
				capture: !0
			}), a.addEventListener("blur", D, { signal: y.signal });
		}
		e.parentElement && oe.observe(e.parentElement), oe.observe(e), e.ownerDocument.fonts?.addEventListener("loadingdone", () => {
			T = !0, I();
		}, { signal: y.signal }), F();
	} catch (e) {
		throw ae(), e;
	}
	return {
		transforms() {
			return j;
		},
		hasViewport() {
			let e = O?.containers.get(null);
			return !!e && e.width > 0 && e.height > 0;
		},
		reflow: F,
		invalidateGeometry() {
			T = !0;
		},
		paint(e) {
			k = e;
			let t = ee();
			(T || A !== JSON.stringify([t.width, t.height])) && F(), P();
		},
		advance(e) {
			for (let [t, n] of v) {
				let r = t === null ? o.root : f.get(t);
				r?.scroll && !n.dragging && (n.state = Jg(n.state, n.bounds, e, r.scroll));
			}
		},
		moving() {
			return [...v.values()].some((e) => !e.dragging && (e.state.x.velocity !== 0 || e.state.y.velocity !== 0 || e.state.x.position < e.bounds.minX || e.state.x.position > e.bounds.maxX || e.state.y.position < e.bounds.minY || e.state.y.position > e.bounds.maxY));
		},
		getScroll(e) {
			let t = v.get(e);
			if (!t) throw Error("Área de scroll não encontrada.");
			return structuredClone(t.state);
		},
		resetScroll() {
			for (let e of v.values()) e.state = {
				x: {
					position: 0,
					velocity: 0
				},
				y: {
					position: 0,
					velocity: 0
				}
			};
			P(), i.changed();
		},
		inspect() {
			return O ? structuredClone(O) : null;
		},
		destroy: ae
	};
}
//#endregion
//#region ../../node_modules/.pnpm/yoga-layout@3.2.1/node_modules/yoga-layout/dist/binaries/yoga-wasm-base64-esm.js
var Zg = (() => {
	var e = import.meta.url;
	return (function(t) {
		t ||= {};
		var n;
		n ||= t === void 0 ? {} : t;
		var r, i;
		n.ready = new Promise(function(e, t) {
			r = e, i = t;
		});
		var a = Object.assign({}, n), o = "";
		typeof document < "u" && document.currentScript && (o = document.currentScript.src), e && (o = e), o = o.indexOf("blob:") === 0 ? "" : o.substr(0, o.replace(/[?#].*/, "").lastIndexOf("/") + 1);
		var s = n.print || console.log.bind(console), c = n.printErr || console.warn.bind(console);
		Object.assign(n, a), a = null;
		var l;
		n.wasmBinary && (l = n.wasmBinary), n.noExitRuntime, typeof WebAssembly != "object" && j("no native wasm support detected");
		var u, d = !1;
		function f(e, t, n) {
			n = t + n;
			for (var r = ""; !(t >= n);) {
				var i = e[t++];
				if (!i) break;
				if (i & 128) {
					var a = e[t++] & 63;
					if ((i & 224) == 192) r += String.fromCharCode((i & 31) << 6 | a);
					else {
						var o = e[t++] & 63;
						i = (i & 240) == 224 ? (i & 15) << 12 | a << 6 | o : (i & 7) << 18 | a << 12 | o << 6 | e[t++] & 63, 65536 > i ? r += String.fromCharCode(i) : (i -= 65536, r += String.fromCharCode(55296 | i >> 10, 56320 | i & 1023));
					}
				} else r += String.fromCharCode(i);
			}
			return r;
		}
		var p, m, h, g, _, v, y, b, x;
		function S() {
			var e = u.buffer;
			p = e, n.HEAP8 = m = new Int8Array(e), n.HEAP16 = g = new Int16Array(e), n.HEAP32 = v = new Int32Array(e), n.HEAPU8 = h = new Uint8Array(e), n.HEAPU16 = _ = new Uint16Array(e), n.HEAPU32 = y = new Uint32Array(e), n.HEAPF32 = b = new Float32Array(e), n.HEAPF64 = x = new Float64Array(e);
		}
		var C, w = [], T = [], E = [];
		function D() {
			var e = n.preRun.shift();
			w.unshift(e);
		}
		var O = 0, k = null, A = null;
		function j(e) {
			throw n.onAbort && n.onAbort(e), e = "Aborted(" + e + ")", c(e), d = !0, e = new WebAssembly.RuntimeError(e + ". Build with -sASSERTIONS for more info."), i(e), e;
		}
		function M(e) {
			return e.startsWith("data:application/octet-stream;base64,");
		}
		var ee = "data:application/octet-stream;base64,AGFzbQEAAAABugM3YAF/AGACf38AYAF/AX9gA39/fwBgAn98AGACf38Bf2ADf39/AX9gBH9/f30BfWADf398AGAAAGAEf39/fwBgAX8BfGACf38BfGAFf39/f38Bf2AAAX9gA39/fwF9YAZ/f31/fX8AYAV/f39/fwBgAn9/AX1gBX9/f319AX1gAX8BfWADf35/AX5gB39/f39/f38AYAZ/f39/f38AYAR/f39/AX9gBn9/f319fQF9YAR/f31/AGADf399AX1gBn98f39/fwF/YAR/fHx/AGACf30AYAh/f39/f39/fwBgDX9/f39/f39/f39/f38AYAp/f39/f39/f39/AGAFf39/f38BfGAEfHx/fwF9YA1/fX1/f399fX9/f39/AX9gB39/f319f38AYAJ+fwF/YAN/fX0BfWABfAF8YAN/fHwAYAR/f319AGAHf39/fX19fQF9YA1/fX99f31/fX19fX1/AX9gC39/f39/f399fX19AX9gCH9/f39/f319AGAEf39+fgBgB39/f39/f38Bf2ACfH8BfGAFf398fH8AYAN/f38BfGAEf39/fABgA39/fQBgBn9/fX99fwF/ArUBHgFhAWEAHwFhAWIAAwFhAWMACQFhAWQAFgFhAWUAEQFhAWYAIAFhAWcAAAFhAWgAIQFhAWkAAwFhAWoAAAFhAWsAFwFhAWwACgFhAW0ABQFhAW4AAwFhAW8AAQFhAXAAFwFhAXEABgFhAXIAAAFhAXMAIgFhAXQACgFhAXUADQFhAXYAFgFhAXcAAgFhAXgAAwFhAXkAGAFhAXoAAgFhAUEAAQFhAUIAEQFhAUMAAQFhAUQAAAOiAqACAgMSBwcACRkDAAoRBgYKEwAPDxMBBiMTCgcHGgMUASQFJRQHAwMKCgMmAQYYDxobFAAKBw8KBwMDAgkCAAAFGwACBwIHBgIDAQMIDAABKAkHBQURACkZASoAAAIrLAIALQcHBy4HLwkFCgMCMA0xAgMJAgACAQYKAQIBBQEACQIFAQEABQAODQ0GFQIBHBUGAgkCEAAAAAUyDzMMBQYINAUCAwUODg41AgMCAgIDBgICNgIBDAwMAQsLCwsLCx0CAAIAAAABABABBQICAQMCEgMMCwEBAQEBAQsLAQICAwICAgICAgIDAgIICAEICAgEBAQEBAQEBAQABAQABAQEBAAE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GiABQQA2AvADIAFCADcC6AMgAigC7AMiAyACKALoAyIERwRAIAMgBGsiBEEASA0FIAEgBBAeIgM2AuwDIAEgAzYC6AMgASADIARqNgLwAyACKALoAyIEIAIoAuwDIghHBEADQCADIAQoAgA2AgAgA0EEaiEDIARBBGoiBCAIRw0ACwsgASADNgLsAwsgASACKQL0AzcC9AMgASACKAKEBDYChAQgASACKQL8AzcC/AMgAUEANgLkAwsgBSABNgIAIAEgADYC5AMLIAZBAWohBiAFQQRqIgUgB0cNAAsLDwsQAgALUAACQAJAAkACQAJAIAIOBAQAAQIDCyAAIAEgAUEwahBDDwsgACABIAFBMGogAxBEDwsgACABIAFBMGoQQg8LECQACyAAIAEgAUEwaiADEEULcAIBfwF9IwBBEGsiBCQAIARBCGogACABQQJ0QdwlaigCACACEDZDAADAfyEFAkACQAJAIAQtAAxBAWsOAgABAgsgBCoCCCEFDAELIAQqAgggA5RDCtcjPJQhBQsgBEEQaiQAIAVDAAAAACAFIAVbGwt5AgF/AX0jAEEQayIDJAAgA0EIaiAAIAFBAnRB7CVqKAIAIAIQU0MAAMB/IQQCQAJAAkAgAy0ADEEBaw4CAAECCyADKgIIIQQMAQsgAyoCCEMAAAAAlEMK1yM8lCEECyADQRBqJAAgBEMAAAAAl0MAAAAAIAQgBFsbC1QAAkACQAJAAkACQCACDgQEAAECAwsgACABIAFBwgBqEEMPCyAAIAEgAUHCAGogAxBEDwsgACABIAFBwgBqEEIPCxAkAAsgACABIAFBwgBqIAMQRQsvACAAIAJFQQF0IgIgASADEGAgACACIAEQS5IgACACIAEgAxB/IAAgAiABEFKSkgvOAQIDfwJ9IwBBEGsiAyQAQQEhBCADQQhqIABB/ABqIgUgACABQQF0akH2AGoiAS8BABAfAkACQCADKgIIIgcgAioCACIGXARAIAcgB1sEQCACLQAEIQIMAgsgBiAGXCEECyACLQAEIQIgBEUNACADLQAMIAJB/wFxRg0BCyAFIAEgBiACEDkDQCAALQAAIgFBBHENASAAIAFBBHI6AAAgACgCECIBBEAgACABEQAACyAAQYCAgP4HNgKcASAAKALkAyIADQALCyADQRBqJAALzgECA38CfSMAQRBrIgMk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AWsOAgABAgsgBCoCCCEFDAELIAQqAgggA5RDCtcjPJQhBQsgBEEQaiQAIAVDAAAAACAFIAVbGwscACAAIAFBCCACpyACQiCIpyADpyADQiCIpxAVCwUAEFgACzkAIABFBEBBAA8LAn8gAUGAf3FBgL8DRiABQf8ATXJFBEBB/DtBGTYCAEF/DAELIAAgAToAAEEBCwvEAgACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCABQQlrDhIACgsMCgsCAwQFDAsMDAoLBwgJCyACIAIoAgAiAUEEajYCACAAIAEoAgA2AgAPCwALIAIgAigCACIBQQRqNgIAIAAgATIBADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATMBADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATAAADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATEAADcDAA8LAAsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKwMAOQMADwsgACACIAMRAQALDwsgAiACKAIAIgFBBGo2AgAgACABNAIANwMADwsgAiACKAIAIgFBBGo2AgAgACABNQIANwMADwsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKQMANwMAC84BAgN/An0jAEEQayIDJABBASEEIANBCGogAEH8AGoiBSAAIAFBAXRqQegAaiIBLwEAEB8CQAJAIAMqAggiByACKgIAIgZcBEAgByAHWwRAIAItAAQhAgwCCyAGIAZcIQQLIAItAAQhAiAERQ0AIAMtAAwgAkH/AXFGDQELIAUgASAGIAIQOQNAIAAtAAAiAUEEcQ0BIAAgAUEEcjoAACAAKAIQIgEEQCAAIAERAAALIABBgICA/gc2ApwBIAAoAuQDIgANAAsLIANBEGokAAtdAQR/IAAoAgAhAgNAIAIsAAAiAxBXBEBBfyEEIAAgAkEBaiICNgIAIAFBzJmz5gBNBH9BfyADQTBrIgMgAUEKbCIEaiADIARB/////wdzShsFIAQLIQEMAQsLIAELrhQCEn8BfiMAQdAAayIIJAAgCCABNgJMIAhBN2ohFyAIQThqIRQCQAJAAkACQANAIAEhDSAHIA5B/////wdzSg0BIAcgDmohDgJAAkACQCANIgctAAAiCQRAA0ACQAJAIAlB/wFxIgFFBEAgByEBDAELIAFBJUcNASAH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IQEgAEIANwIEIAAgATYCACABIAA2AgQgAkEQaiQAIAALGwEBfyAABEAgACgCACIBBEAgARAjCyAAECMLC0kBAn9BBBAeIQFBIBAeIgBBADYCHCAAQoCAgICAgIDAPzcCFCAAQgA3AgwgAEEAOgAIIABBAzYCBCAAQQA2AgAgASAANgIAIAELIAAgAkEFR0EAIAIbRQRAQbgwIAMgBBBJDwsgAyAEEHALIgEBfiABIAKtIAOtQiCGhCAEIAARFQAiBUIgiKckASAFpwuoAQEFfyAAKAJUIgMoAgAhBSADKAIEIgQgACgCFCAAKAIcIgdrIgYgBCAGSRsiBgRAIAUgByAGECsaIAMgAygCACAGaiIFNgIAIAMgAygCBCAGayIENgIECyAEIAIgAiAESxsiBARAIAUgASAEECsaIAMgAygCACAEaiIFNgIAIAMgAygCBCAEazYCBAsgBUEAOgAAIAAgACgCLCIBNgIcIAAgATYCFCACCwQAQgALBABBAAuKBQIGfgJ/IAEgASgCAEEHakF4cSIBQRBqNgIAIAAhCSABKQMAIQMgASkDCCEGIwBBIGsiCCQAAkAgBkL///////////8AgyIEQoCAgICAgMCAPH0gBEKAgICAgIDA/8MAfVQEQCAGQgSGIANCPIiEIQQgA0L//////////w+DIgNCgYCAgICAgIAIWgRAIARCgYCAgICAgIDAAHwhAgwCCyAEQoCAgICAgICAQH0hAiADQoCAgICAgICACFINASACIARCAYN8IQIMAQsgA1AgBEKAgICAgIDA//8AVCAEQoCAgICAgMD//wBRG0UEQCAGQgSGIANCPIiEQv////////8Dg0KAgICAgICA/P8AhCECDAELQoCAgICAgID4/wAhAiAEQv///////7//wwBWDQBCACECIARCMIinIgBBkfcASQ0AIAMhAiAGQv///////z+DQoCAgICAgMAAhCIFIQcCQCAAQYH3AGsiAUHAAHEEQCACIAFBQGqthiEHQgAhAgwBCyABRQ0AIAcgAa0iBIYgAkHAACABa62IhCEHIAIgBIYhAgsgCCACNwMQIAggBzcDGAJAQYH4ACAAayIAQcAAcQRAIAUgAEFAaq2IIQNCACEFDAELIABFDQAgBUHAACAAa62GIAMgAK0iAoiEIQMgBSACiCEFCyAIIAM3AwAgCCAF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ASAAKAIAIQAgASACQQFxBH8gASgCACAAaigCAAUgAAsRCwALYQECfyMAQRBrIgIkACABIAAoAgQiA0EBdWohASAAKAIAIQAgAiABIANBAXEEfyABKAIAIABqKAIABSAACxEBAEEQEB4iACACKQMINwMIIAAgAikDADcDACACQRBqJAAgAAtjAQJ/IwBBEGsiAyQAIAEgACgCBCIEQQF1aiEBIAAoAgAhACADIAEgAiAEQQFxBH8gASgCACAAaigCAAUgAAsRAwBBEBAeIgAgAykDCDcDCCAAIAMpAwA3AwAgA0EQaiQAIAALNwEBfyABIAAoAgQiA0EBdWohASAAKAIAIQAgASACIANBAXEEfyABKAIAIABqKAIABSAACxEEAAs5AQF/IAEgACgCBCIEQQF1aiEBIAAoAgAhACABIAIgAyAEQQFxBH8gASgCACAAaigCAAUgAAsRCAALCQAgASAAEQIACwUAQcM7Cw8AIAEgACgCAGogAjYCAAsNACABIAAoAgBqKAIACxgBAX9BEBAeIgBCADcDCCAAQQA2AgAgAAsYAQF/QRAQHiIAQgA3AwAgAEIANwMIIAALDABBMBAeQQBBMBAqCzcBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAIAEgAiADQQFxBH8gASgCACAAaigCAAUgAAsRHgALBQBBvjsLIQAgACABKAIAIAEgASwAC0EASBtBuzsgAigCABAQNgIACyoBAX9BDBAeIgFBADoABCABIAAoAgA2AgggAEEANgIAIAFB2Cc2AgAgAQsFAEG7OwsFAEG4OwshACAAIAEoAgAgASABLAALQQBIG0GkOyACKAIAEBA2AgAL2AEBBH8jAEEgayIDJAAgASgCACIEQfD///8HSQRAAkACQCAEQQtPBEAgBEEPckEBaiIFEB4hBiADIAVBgICAgHhyNgIQIAMgBjYCCCADIAQ2AgwgBCAGaiEFDAELIAMgBDoAEyADQQhqIgYgBGohBSAERQ0BCyAGIAFBBGogBBArGgsgBUEAOgAAIAMgAjYCACADQRhqIANBCGogAyAAEQMAIAMoAhgQHSADKAIYIgAQBiADKAIAEAYgAywAE0EASARAIAMoAggQIwsgA0EgaiQAIAAPCxACAAsqAQF/QQwQHiIBQQA6AAQgASAAKAIANgIIIABBADYCACABQeAmNgIA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AkEIaiAIIAYQHyACIAcgAC8AABAfQQEhAyACKgIIIgogAioCACILXAR/IAogClsNAyALIAtcBSADC0UNAiACLQAMIAItAARHDQILIABBAmohAEEBIQMgBCEGQQEhBCAGRQ0ACyABLwB6IgBBB3FFBEAgBS0AekEHcUUNAgsgCCAAECAiCiAHIAUvAHoQICILWw0BIAogClsNACALIAtcDQELIAFBFGogBUEUakHoABArGiABQfwAaiAFQfwAahCgAQNAIAEtAAAiAEEEcQ0BIAEgAEEEcjoAACABKAIQIgAEQCABIAARAAALIAFBgICA/gc2ApwBIAEoAuQDIgENAAsLIAJBEGokAAvGAwEEfyMAQaAEayICJAAgACgCBCEBIABBADYCBCABBEAgASABKAIAKAIEEQAACyAAKAIIIQEgAEEANgIIIAEEQCABIAEoAgAoAgQRAAALAkAgACgCACIAKALoAyAAKALsA0YEQCAAKALkAw0BIAAgAkEYaiAAKAL0AxBcIgEpAgA3AgAgACABKAIQNgIQIAAgASkCCDcCCCAAQRRqIAFBFGpB6AAQKxogACABKQKMATcCjAEgACABKQKEATcChAEgACABKQJ8NwJ8IAEoApQBIQQgAUEANgKUASAAKAKUASEDIAAgBDYClAEgAwRAIAMQWwsgAEGYAWogAUGYAWpB0AIQKxogACgC6AMiAwRAIAAgAzYC7AMgAxAjCyAAIAEoAugDNgLoAyAAIAEoAuwDNgLsAyAAIAEoAvADNgLwAyABQQA2AvADIAFCADcC6AMgACABKQL8AzcC/AMgACABKQL0AzcC9AMgACABKAKEBDYChAQgASgClAEhACABQQA2ApQBIAAEQCAAEFsLIAJBoARqJAAPCyACQfAcNgIQIABBBUHYJSACQRBqECwQJAALIAJB5hE2AgAgAEEFQdglIAIQLBAkAAsLAEEMEB4gABCiAQsLAEEMEB5BABCiAQsNACAAKAIALQAIQQFxCwoAIAAoAgAoAhQLGQAgAUH/AXEEQBACAAsgACgCACgCEEEBcQsYACAAKAIAIgAgAC0ACEH+AXEgAXI6AAgLJgAgASAAKAIAIgAoAhRHBEAgACABNgIUIAAgACgCDEEBajYCDAsLkgEBAn8jAEEQayICJAAgACgCACEAIAFDAAAAAGAEQCABIAAqAhhcBEAgACABOAIYIAAgACgCDEEBajYCDAsgAkEQaiQADwsgAkGIFDYCACMAQRBrIgMkACADIAI2AgwCQCAARQRAQbgwQdglIAIQSRoMAQsgAEEAQQVB2CUgAiAAKAIEEQ0AGgsgA0EQaiQAECQACz8AIAFB/wFxRQRAIAIgACgCACIAKAIQIgFBAXFHBEAgACABQX5xIAJyNgIQIAAgACgCDEEBajYCDAsPCxACAAsL4CYjAEGACAuBHk9ubHkgbGVhZiBub2RlcyB3aXRoIGN1c3RvbSBtZWFzdXJlIGZ1bmN0aW9ucyBzaG91bGQgbWFudWFsbHkgbWFyayB0aGVtc2VsdmVzIGFzIGRpcnR5AGlzRGlydHkAbWFya0RpcnR5AGRlc3Ryb3kAc2V0RGlzcGxheQBnZXREaXNwbGF5AHNldEZsZXgALSsgICAwWDB4AC0wWCswWCAwWC0weCsweCAweABzZXRGbGV4R3JvdwBnZXRGbGV4R3JvdwBzZXRPdmVyZmxvdwBnZXRPdmVyZmxvdwBoYXNOZXdMYXlvdXQAY2FsY3VsYXRlTGF5b3V0AGdldENvbXB1dGVkTGF5b3V0AHVuc2lnbmVkIHNob3J0AGdldENoaWxkQ291bnQAdW5zaWduZWQgaW50AHNldEp1c3RpZnlDb250ZW50AGdldEp1c3RpZnlDb250ZW50AGF2YWlsYWJsZUhlaWdodCBpcyBpbmRlZmluaXRlIHNvIGhlaWdodFNpemluZ01vZGUgbXVzdCBiZSBTaXppbmdNb2RlOjpNYXhDb250ZW50AGF2YWlsYWJsZVdpZHRoIGlzIGluZGVmaW5pdGUgc28gd2lkdGhTaXppbmdNb2RlIG11c3QgYmUgU2l6aW5nTW9kZTo6TWF4Q29udGVudABzZXRBbGlnbkNvbnRlbnQAZ2V0QWxpZ25Db250ZW50AGdldFBhcmVudABpbXBsZW1lbnQAc2V0TWF4SGVpZ2h0UGVyY2VudABzZXRIZWlnaHRQZXJjZW50AHNldE1pbkhlaWdodFBlcmNlbnQAc2V0RmxleEJhc2lzUGVyY2VudABzZXRHYXBQZXJjZW50AHNldFBvc2l0aW9uUGVyY2VudABzZXRNYXJnaW5QZXJjZW50AHNldE1heFdpZHRoUGVyY2VudABzZXRXaWR0aFBlcmNlbnQAc2V0TWluV2lkdGhQZXJjZW50AHNldFBhZGRpbmdQZXJjZW50AGhhbmRsZS50eXBlKCkgPT0gU3R5bGVWYWx1ZUhhbmRsZTo6VHlwZTo6UG9pbnQgfHwgaGFuZGxlLnR5cGUoKSA9PSBTdHlsZVZhbHVlSGFuZGxlOjpUeXBlOjpQZXJjZW50AGNyZWF0ZURlZmF1bHQAdW5pdAByaWdodABoZWlnaHQAc2V0TWF4SGVpZ2h0AGdldE1heEhlaWdodABzZXRIZWlnaHQAZ2V0SGVpZ2h0AHNldE1pbkhlaWdodABnZXRNaW5IZWlnaHQAZ2V0Q29tcHV0ZWRIZWlnaHQAZ2V0Q29tcHV0ZWRSaWdodABsZWZ0AGdldENvbXB1dGVkTGVmdAByZXNldABfX2Rlc3RydWN0AGZsb2F0AHVpbnQ2NF90AHVzZVdlYkRlZmF1bHRzAHNldFVzZVdlYkRlZmF1bHRzAHNldEFsaWduSXRlbXMAZ2V0QWxpZ25JdGVtcwBzZXRGbGV4QmFzaXMAZ2V0RmxleEJhc2lzAENhbm5vdCBnZXQgbGF5b3V0IHByb3BlcnRpZXMgb2YgbXVsdGktZWRnZSBzaG9ydGhhbmRzAHNldFBvaW50U2NhbGVGYWN0b3IATWVhc3VyZUNhbGxiYWNrV3JhcHBlcgBEaXJ0aWVkQ2FsbGJhY2tXcmFwcGVyAENhbm5vdCByZXNldCBhIG5vZGUgc3RpbGwgYXR0YWNoZWQgdG8gYSBvd25lcgBzZXRCb3JkZXIAZ2V0Qm9yZGVyAGdldENvbXB1dGVkQm9yZGVyAGdldE51bWJlcgBoYW5kbGUudHlwZSgpID09IFN0eWxlVmFsdWVIYW5kbGU6OlR5cGU6Ok51bWJlcgB1bnNpZ25lZCBjaGFyAHRvcABnZXRDb21wdXRlZFRvcABzZXRGbGV4V3JhcABnZXRGbGV4V3JhcABzZXRHYXAAZ2V0R2FwACVwAHNldEhlaWdodEF1dG8Ac2V0RmxleEJhc2lzQXV0bwBzZXRQb3NpdGlvbkF1dG8Ac2V0TWFyZ2luQXV0bwBzZXRXaWR0aEF1dG8AU2NhbGUgZmFjdG9yIHNob3VsZCBub3QgYmUgbGVzcyB0aGFuIHplcm8Ac2V0QXNwZWN0UmF0aW8AZ2V0QXNwZWN0UmF0aW8Ac2V0UG9zaXRpb24AZ2V0UG9zaXRpb24Abm90aWZ5T25EZXN0cnVjdGlvbgBzZXRGbGV4RGlyZWN0aW9uAGdldEZsZXhEaXJlY3Rpb24Ac2V0RGlyZWN0aW9uAGdldERpcmVjdGlvbgBzZXRNYXJnaW4AZ2V0TWFyZ2luAGdldENvbXB1dGVkTWFyZ2luAG1hcmtMYXlvdXRTZWVuAG5hbgBib3R0b20AZ2V0Q29tcHV0ZWRCb3R0b20AYm9vbABlbXNjcmlwdGVuOjp2YWwAc2V0RmxleFNocmluawBnZXRGbGV4U2hyaW5rAHNldEFsd2F5c0Zvcm1zQ29udGFpbmluZ0Jsb2NrAE1lYXN1cmVDYWxsYmFjawBEaXJ0aWVkQ2FsbGJhY2sAZ2V0TGVuZ3RoAHdpZHRoAHNldE1heFdpZHRoAGdldE1heFdpZHRoAHNldFdpZHRoAGdldFdpZHRoAHNldE1pbldpZHRoAGdldE1pbldpZHRoAGdldENvbXB1dGVkV2lkdGgAcHVzaAAvaG9tZS9ydW5uZXIvd29yay95b2dhL3lvZ2EvamF2YXNjcmlwdC8uLi95b2dhL3N0eWxlL1NtYWxsVmFsdWVCdWZmZXIuaAAvaG9tZS9ydW5uZXIvd29yay95b2dhL3lvZ2EvamF2YXNjcmlwdC8uLi95b2dhL3N0eWxlL1N0eWxlVmFsdWVQb29sLmgAdW5zaWduZWQgbG9uZwBzZXRCb3hTaXppbmcAZ2V0Qm94U2l6aW5nAHN0ZDo6d3N0cmluZwBzdGQ6OnN0cmluZwBzdGQ6OnUxNnN0cmluZwBzdGQ6OnUzMnN0cmluZwBzZXRQYWRkaW5nAGdldFBhZGRpbmcAZ2V0Q29tcHV0ZWRQYWRkaW5nAFRyaWVkIHRvIGNvbnN0cnVjdCBZR05vZGUgd2l0aCBudWxsIGNvbmZpZwBBdHRlbXB0aW5nIHRvIGNvbnN0cnVjdCBOb2RlIHdpdGggbnVsbCBjb25maWcAY3JlYXRlV2l0aENvbmZpZwBpbmYAc2V0QWxpZ25TZWxmAGdldEFsaWduU2VsZgBTaXplAHZhbHVlAFZhbHVlAGNyZWF0ZQBtZWFzdXJlAHNldFBvc2l0aW9uVHlwZQBnZXRQb3NpdGlvblR5cGUAaXNSZWZlcmVuY2VCYXNlbGluZQBzZXRJc1JlZmVyZW5jZUJhc2VsaW5lAGNvcHlTdHlsZQBkb3VibGUATm9kZQBleHRlbmQAaW5zZXJ0Q2hpbGQAZ2V0Q2hpbGQAcmVtb3ZlQ2hpbGQAdm9pZABzZXRFeHBlcmltZW50YWxGZWF0dXJlRW5hYmxlZABpc0V4cGVyaW1lbnRhbEZlYXR1cmVFbmFibGVkAGRpcnRpZWQAQ2Fubm90IHJlc2V0IGEgbm9kZSB3aGljaCBzdGlsbCBoYXMgY2hpbGRyZW4gYXR0YWNoZWQAdW5zZXRNZWFzdXJlRnVuYwB1bnNldERpcnRpZWRGdW5jAHNldEVycmF0YQBnZXRFcnJhdGEATWVhc3VyZSBmdW5jdGlvbiByZXR1cm5lZCBhbiBpbnZhbGlkIGRpbWVuc2lvbiB0byBZb2dhOiBbd2lkdGg9JWYsIGhlaWdodD0lZl0ARXhwZWN0IGN1c3RvbSBiYXNlbGluZSBmdW5jdGlvbiB0byBub3QgcmV0dXJuIE5hTgBOQU4ASU5GAGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHNob3J0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBzaG9ydD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBpbnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGZsb2F0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQ4X3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVpbnQxNl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQxNl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50MzJfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MzJfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8Y2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgY2hhcj4Ac3RkOjpiYXNpY19zdHJpbmc8dW5zaWduZWQgY2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8c2lnbmVk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";
		if (!M(ee)) {
			var N = ee;
			ee = n.locateFile ? n.locateFile(N, o) : o + N;
		}
		function te() {
			var e = ee;
			try {
				if (e == ee && l) return new Uint8Array(l);
				if (M(e)) try {
					var t = _t(e.slice(37)), n = new Uint8Array(t.length);
					for (e = 0; e < t.length; ++e) n[e] = t.charCodeAt(e);
					var r = n;
				} catch {
					throw Error("Converting base64 string to bytes failed.");
				}
				else r = void 0;
				var i = r;
				if (i) return i;
				throw "both async and sync fetching of the wasm failed";
			} catch (e) {
				j(e);
			}
		}
		function ne() {
			return l || typeof fetch != "function" ? Promise.resolve().then(function() {
				return te();
			}) : fetch(ee, { credentials: "same-origin" }).then(function(e) {
				if (!e.ok) throw "failed to load wasm binary file at '" + ee + "'";
				return e.arrayBuffer();
			}).catch(function() {
				return te();
			});
		}
		function re(e) {
			for (; 0 < e.length;) e.shift()(n);
		}
		function ie(e) {
			if (e === void 0) return "_unknown";
			e = e.replace(/[^a-zA-Z0-9_]/g, "$");
			var t = e.charCodeAt(0);
			return 48 <= t && 57 >= t ? "_" + e : e;
		}
		function P(e, t) {
			return e = ie(e), function() {
				return t.apply(this, arguments);
			};
		}
		var F = [
			{},
			{ value: void 0 },
			{ value: null },
			{ value: !0 },
			{ value: !1 }
		], ae = [];
		function I(e) {
			var t = Error, n = P(e, function(t) {
				this.name = e, this.message = t, t = Error(t).stack, t !== void 0 && (this.stack = this.toString() + "\n" + t.replace(/^Error(:[^\n]*)?\n/, ""));
			});
			return n.prototype = Object.create(t.prototype), n.prototype.constructor = n, n.prototype.toString = function() {
				return this.message === void 0 ? this.name : this.name + ": " + this.message;
			}, n;
		}
		var oe = void 0;
		function L(e) {
			throw new oe(e);
		}
		var se = (e) => (e || L("Cannot use deleted val. handle = " + e), F[e].value), ce = (e) => {
			switch (e) {
				case void 0: return 1;
				case null: return 2;
				case !0: return 3;
				case !1: return 4;
				default:
					var t = ae.length ? ae.pop() : F.length;
					return F[t] = {
						ga: 1,
						value: e
					}, t;
			}
		}, le = void 0, ue = void 0;
		function de(e) {
			for (var t = ""; h[e];) t += ue[h[e++]];
			return t;
		}
		var R = [];
		function fe() {
			for (; R.length;) {
				var e = R.pop();
				e.M.$ = !1, e.delete();
			}
		}
		var pe = void 0, me = {};
		function he(e, t) {
			for (t === void 0 && L("ptr should not be undefined"); e.R;) t = e.ba(t), e = e.R;
			return t;
		}
		var ge = {};
		function _e(e) {
			e = yt(e);
			var t = de(e);
			return xt(e), t;
		}
		function ve(e, t) {
			var n = ge[e];
			return n === void 0 && L(t + " has unknown type " + _e(e)), n;
		}
		function ye() {}
		var be = !1;
		function xe(e) {
			--e.count.value, e.count.value === 0 && (e.T ? e.U.W(e.T) : e.P.N.W(e.O));
		}
		function Se(e, t, n) {
			return t === n ? e : n.R === void 0 ? null : (e = Se(e, t, n.R), e === null ? null : n.na(e));
		}
		var Ce = {};
		function z(e, t) {
			return t = he(e, t), me[t];
		}
		var we = void 0;
		function Te(e) {
			throw new we(e);
		}
		function Ee(e, t) {
			return t.P && t.O || Te("makeClassHandle requires ptr and ptrType"), !!t.U != !!t.T && Te("Both smartPtrType and smartPtr must be specified"), t.count = { value: 1 }, De(Object.create(e, { M: { value: t } }));
		}
		function De(e) {
			return typeof FinalizationRegistry > "u" ? (De = (e) => e, e) : (be = new FinalizationRegistry((e) => {
				xe(e.M);
			}), De = (e) => {
				var t = e.M;
				return t.T && be.register(e, { M: t }, e), e;
			}, ye = (e) => {
				be.unregister(e);
			}, De(e));
		}
		var Oe = {};
		function ke(e) {
			for (; e.length;) {
				var t = e.pop();
				e.pop()(t);
			}
		}
		function Ae(e) {
			return this.fromWireType(v[e >> 2]);
		}
		var B = {}, je = {};
		function Me(e, t, n) {
			function r(t) {
				t = n(t), t.length !== e.length && Te("Mismatched type converter count");
				for (var r = 0; r < e.length; ++r) Pe(e[r], t[r]);
			}
			e.forEach(function(e) {
				je[e] = t;
			});
			var i = Array(t.length), a = [], o = 0;
			t.forEach((e, t) => {
				ge.hasOwnProperty(e) ? i[t] = ge[e] : (a.push(e), B.hasOwnProperty(e) || (B[e] = []), B[e].push(() => {
					i[t] = ge[e], ++o, o === a.length && r(i);
				}));
			}), a.length === 0 && r(i);
		}
		function Ne(e) {
			switch (e) {
				case 1: return 0;
				case 2: return 1;
				case 4: return 2;
				case 8: return 3;
				default: throw TypeError("Unknown type size: " + e);
			}
		}
		function Pe(e, t, n = {}) {
			if (!("argPackAdvance" in t)) throw TypeError("registerType registeredInstance requires argPackAdvance");
			var r = t.name;
			if (e || L("type \"" + r + "\" must have a positive integer typeid pointer"), ge.hasOwnProperty(e)) {
				if (n.ua) return;
				L("Cannot register type '" + r + "' twice");
			}
			ge[e] = t, delete je[e], B.hasOwnProperty(e) && (t = B[e], delete B[e], t.forEach((e) => e()));
		}
		function Fe(e) {
			L(e.M.P.N.name + " instance already deleted");
		}
		function Ie() {}
		function Le(e, t, n) {
			if (e[t].S === void 0) {
				var r = e[t];
				e[t] = function() {
					return e[t].S.hasOwnProperty(arguments.length) || L("Function '" + n + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + e[t].S + ")!"), e[t].S[arguments.length].apply(this, arguments);
				}, e[t].S = [], e[t].S[r.Z] = r;
			}
		}
		function Re(e, t) {
			n.hasOwnProperty(e) ? (L("Cannot register public name '" + e + "' twice"), Le(n, e, e), n.hasOwnProperty(void 0) && L("Cannot register multiple overloads of a function with the same number of arguments (undefined)!"), n[e].S[void 0] = t) : n[e] = t;
		}
		function ze(e, t, n, r, i, a, o, s) {
			this.name = e, this.constructor = t, this.X = n, this.W = r, this.R = i, this.pa = a, this.ba = o, this.na = s, this.ja = [];
		}
		function Be(e, t, n) {
			for (; t !== n;) t.ba || L("Expected null or instance of " + n.name + ", got an instance of " + t.name), e = t.ba(e), t = t.R;
			return e;
		}
		function Ve(e, t) {
			return t === null ? (this.ea && L("null is not a valid " + this.name), 0) : (t.M || L("Cannot pass \"" + $e(t) + "\" as a " + this.name), t.M.O || L("Cannot pass deleted object as a pointer of type " + this.name), Be(t.M.O, t.M.P.N, this.N));
		}
		function He(e, t) {
			if (t === null) {
				if (this.ea && L("null is not a valid " + this.name), this.da) {
					var n = this.fa();
					return e !== null && e.push(this.W, n), n;
				}
				return 0;
			}
			if (t.M || L("Cannot pass \"" + $e(t) + "\" as a " + this.name), t.M.O || L("Cannot pass deleted object as a pointer of type " + this.name), !this.ca && t.M.P.ca && L("Cannot convert argument of type " + (t.M.U ? t.M.U.name : t.M.P.name) + " to parameter type " + this.name), n = Be(t.M.O, t.M.P.N, this.N), this.da) switch (t.M.T === void 0 && L("Passing raw pointer to smart pointer is illegal"), this.Ba) {
				case 0:
					t.M.U === this ? n = t.M.T : L("Cannot convert argument of type " + (t.M.U ? t.M.U.name : t.M.P.name) + " to parameter type " + this.name);
					break;
				case 1:
					n = t.M.T;
					break;
				case 2:
					if (t.M.U === this) n = t.M.T;
					else {
						var r = t.clone();
						n = this.xa(n, ce(function() {
							r.delete();
						})), e !== null && e.push(this.W, n);
					}
					break;
				default: L("Unsupporting sharing policy");
			}
			return n;
		}
		function Ue(e, t) {
			return t === null ? (this.ea && L("null is not a valid " + this.name), 0) : (t.M || L("Cannot pass \"" + $e(t) + "\" as a " + this.name), t.M.O || L("Cannot pass deleted object as a pointer of type " + this.name), t.M.P.ca && L("Cannot convert argument of type " + t.M.P.name + " to parameter type " + this.name), Be(t.M.O, t.M.P.N, this.N));
		}
		function We(e, t, n, r) {
			this.name = e, this.N = t, this.ea = n, this.ca = r, this.da = !1, this.W = this.xa = this.fa = this.ka = this.Ba = this.wa = void 0, t.R === void 0 ? (this.toWireType = r ? Ve : Ue, this.V = null) : this.toWireType = He;
		}
		function Ge(e, t) {
			n.hasOwnProperty(e) || Te("Replacing nonexistant public symbol"), n[e] = t, n[e].Z = void 0;
		}
		function Ke(e, t) {
			var r = [];
			return function() {
				if (r.length = 0, Object.assign(r, arguments), e.includes("j")) {
					var i = n["dynCall_" + e];
					i = r && r.length ? i.apply(null, [t].concat(r)) : i.call(null, t);
				} else i = C.get(t).apply(null, r);
				return i;
			};
		}
		function qe(e, t) {
			e = de(e);
			var n = e.includes("j") ? Ke(e, t) : C.get(t);
			return typeof n != "function" && L("unknown function pointer with signature " + e + ": " + t), n;
		}
		var Je = void 0;
		function Ye(e, t) {
			function n(e) {
				i[e] || ge[e] || (je[e] ? je[e].forEach(n) : (r.push(e), i[e] = !0));
			}
			var r = [], i = {};
			throw t.forEach(n), new Je(e + ": " + r.map(_e).join([", "]));
		}
		function Xe(e, t, n, r, i) {
			var a = t.length;
			2 > a && L("argTypes array size mismatch! Must at least get return value and 'this' types!");
			var o = t[1] !== null && n !== null, s = !1;
			for (n = 1; n < t.length; ++n) if (t[n] !== null && t[n].V === void 0) {
				s = !0;
				break;
			}
			var c = t[0].name !== "void", l = a - 2, u = Array(l), d = [], f = [];
			return function() {
				if (arguments.length !== l && L("function " + e + " called with " + arguments.length + " arguments, expected " + l + " args!"), f.length = 0, d.length = o ? 2 : 1, d[0] = i, o) {
					var n = t[1].toWireType(f, this);
					d[1] = n;
				}
				for (var a = 0; a < l; ++a) u[a] = t[a + 2].toWireType(f, arguments[a]), d.push(u[a]);
				if (a = r.apply(null, d), s) ke(f);
				else for (var p = o ? 1 : 2; p < t.length; p++) {
					var m = p === 1 ? n : u[p - 2];
					t[p].V !== null && t[p].V(m);
				}
				return n = c ? t[0].fromWireType(a) : void 0, n;
			};
		}
		function Ze(e, t) {
			for (var n = [], r = 0; r < e; r++) n.push(y[t + 4 * r >> 2]);
			return n;
		}
		function Qe(e) {
			4 < e && --F[e].ga === 0 && (F[e] = void 0, ae.push(e));
		}
		function $e(e) {
			if (e === null) return "null";
			var t = typeof e;
			return t === "object" || t === "array" || t === "function" ? e.toString() : "" + e;
		}
		function et(e, t) {
			switch (t) {
				case 2: return function(e) {
					return this.fromWireType(b[e >> 2]);
				};
				case 3: return function(e) {
					return this.fromWireType(x[e >> 3]);
				};
				default: throw TypeError("Unknown float type: " + e);
			}
		}
		function tt(e, t, n) {
			switch (t) {
				case 0: return n ? function(e) {
					return m[e];
				} : function(e) {
					return h[e];
				};
				case 1: return n ? function(e) {
					return g[e >> 1];
				} : function(e) {
					return _[e >> 1];
				};
				case 2: return n ? function(e) {
					return v[e >> 2];
				} : function(e) {
					return y[e >> 2];
				};
				default: throw TypeError("Unknown integer type: " + e);
			}
		}
		function nt(e, t) {
			for (var n = "", r = 0; !(r >= t / 2); ++r) {
				var i = g[e + 2 * r >> 1];
				if (i == 0) break;
				n += String.fromCharCode(i);
			}
			return n;
		}
		function rt(e, t, n) {
			if (n === void 0 && (n = 2147483647), 2 > n) return 0;
			n -= 2;
			var r = t;
			n = n < 2 * e.length ? n / 2 : e.length;
			for (var i = 0; i < n; ++i) g[t >> 1] = e.charCodeAt(i), t += 2;
			return g[t >> 1] = 0, t - r;
		}
		function it(e) {
			return 2 * e.length;
		}
		function at(e, t) {
			for (var n = 0, r = ""; !(n >= t / 4);) {
				var i = v[e + 4 * n >> 2];
				if (i == 0) break;
				++n, 65536 <= i ? (i -= 65536, r += String.fromCharCode(55296 | i >> 10, 56320 | i & 1023)) : r += String.fromCharCode(i);
			}
			return r;
		}
		function ot(e, t, n) {
			if (n === void 0 && (n = 2147483647), 4 > n) return 0;
			var r = t;
			n = r + n - 4;
			for (var i = 0; i < e.length; ++i) {
				var a = e.charCodeAt(i);
				if (55296 <= a && 57343 >= a) {
					var o = e.charCodeAt(++i);
					a = 65536 + ((a & 1023) << 10) | o & 1023;
				}
				if (v[t >> 2] = a, t += 4, t + 4 > n) break;
			}
			return v[t >> 2] = 0, t - r;
		}
		function st(e) {
			for (var t = 0, n = 0; n < e.length; ++n) {
				var r = e.charCodeAt(n);
				55296 <= r && 57343 >= r && ++n, t += 4;
			}
			return t;
		}
		var ct = {};
		function lt(e) {
			var t = ct[e];
			return t === void 0 ? de(e) : t;
		}
		var ut = [];
		function dt(e) {
			var t = ut.length;
			return ut.push(e), t;
		}
		function ft(e, t) {
			for (var n = Array(e), r = 0; r < e; ++r) n[r] = ve(y[t + 4 * r >> 2], "parameter " + r);
			return n;
		}
		var pt = [], mt = [
			null,
			[],
			[]
		];
		oe = n.BindingError = I("BindingError"), n.count_emval_handles = function() {
			for (var e = 0, t = 5; t < F.length; ++t) F[t] !== void 0 && ++e;
			return e;
		}, n.get_first_emval = function() {
			for (var e = 5; e < F.length; ++e) if (F[e] !== void 0) return F[e];
			return null;
		}, le = n.PureVirtualError = I("PureVirtualError");
		for (var ht = Array(256), gt = 0; 256 > gt; ++gt) ht[gt] = String.fromCharCode(gt);
		ue = ht, n.getInheritedInstanceCount = function() {
			return Object.keys(me).length;
		}, n.getLiveInheritedInstances = function() {
			var e = [], t;
			for (t in me) me.hasOwnProperty(t) && e.push(me[t]);
			return e;
		}, n.flushPendingDeletes = fe, n.setDelayFunction = function(e) {
			pe = e, R.length && pe && pe(fe);
		}, we = n.InternalError = I("InternalError"), Ie.prototype.isAliasOf = function(e) {
			if (!(this instanceof Ie && e instanceof Ie)) return !1;
			var t = this.M.P.N, n = this.M.O, r = e.M.P.N;
			for (e = e.M.O; t.R;) n = t.ba(n), t = t.R;
			for (; r.R;) e = r.ba(e), r = r.R;
			return t === r && n === e;
		}, Ie.prototype.clone = function() {
			if (this.M.O || Fe(this), this.M.aa) return this.M.count.value += 1, this;
			var e = De, t = Object, n = t.create, r = Object.getPrototypeOf(this), i = this.M;
			return e = e(n.call(t, r, { M: { value: {
				count: i.count,
				$: i.$,
				aa: i.aa,
				O: i.O,
				P: i.P,
				T: i.T,
				U: i.U
			} } })), e.M.count.value += 1, e.M.$ = !1, e;
		}, Ie.prototype.delete = function() {
			this.M.O || Fe(this), this.M.$ && !this.M.aa && L("Object already scheduled for deletion"), ye(this), xe(this.M), this.M.aa || (this.M.T = void 0, this.M.O = void 0);
		}, Ie.prototype.isDeleted = function() {
			return !this.M.O;
		}, Ie.prototype.deleteLater = function() {
			return this.M.O || Fe(this), this.M.$ && !this.M.aa && L("Object already scheduled for deletion"), R.push(this), R.length === 1 && pe && pe(fe), this.M.$ = !0, this;
		}, We.prototype.qa = function(e) {
			return this.ka && (e = this.ka(e)), e;
		}, We.prototype.ha = function(e) {
			this.W && this.W(e);
		}, We.prototype.argPackAdvance = 8, We.prototype.readValueFromPointer = Ae, We.prototype.deleteObject = function(e) {
			e !== null && e.delete();
		}, We.prototype.fromWireType = function(e) {
			function t() {
				return this.da ? Ee(this.N.X, {
					P: this.wa,
					O: n,
					U: this,
					T: e
				}) : Ee(this.N.X, {
					P: this,
					O: e
				});
			}
			var n = this.qa(e);
			if (!n) return this.ha(e), null;
			var r = z(this.N, n);
			if (r !== void 0) return r.M.count.value === 0 ? (r.M.O = n, r.M.T = e, r.clone()) : (r = r.clone(), this.ha(e), r);
			if (r = this.N.pa(n), r = Ce[r], !r) return t.call(this);
			r = this.ca ? r.la : r.pointerType;
			var i = Se(n, this.N, r.N);
			return i === null ? t.call(this) : this.da ? Ee(r.N.X, {
				P: r,
				O: i,
				U: this,
				T: e
			}) : Ee(r.N.X, {
				P: r,
				O: i
			});
		}, Je = n.UnboundTypeError = I("UnboundTypeError");
		var _t = typeof atob == "function" ? atob : function(e) {
			var t = "", n = 0;
			e = e.replace(/[^A-Za-z0-9\+\/=]/g, "");
			do {
				var r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(e.charAt(n++)), i = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(e.charAt(n++)), a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(e.charAt(n++)), o = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(e.charAt(n++));
				r = r << 2 | i >> 4, i = (i & 15) << 4 | a >> 2;
				var s = (a & 3) << 6 | o;
				t += String.fromCharCode(r), a !== 64 && (t += String.fromCharCode(i)), o !== 64 && (t += String.fromCharCode(s));
			} while (n < e.length);
			return t;
		}, vt = {
			l: function(e, t, n, r) {
				j("Assertion failed: " + (e ? f(h, e) : "") + ", at: " + [
					t ? t ? f(h, t) : "" : "unknown filename",
					n,
					r ? r ? f(h, r) : "" : "unknown function"
				]);
			},
			q: function(e, t, n) {
				e = de(e), t = ve(t, "wrapper"), n = se(n);
				var r = [].slice, i = t.N, a = i.X, o = i.R.X, s = i.R.constructor;
				for (var c in e = P(e, function() {
					i.R.ja.forEach(function(e) {
						if (this[e] === o[e]) throw new le("Pure virtual function " + e + " must be implemented in JavaScript");
					}.bind(this)), Object.defineProperty(this, "__parent", { value: a }), this.__construct.apply(this, r.call(arguments));
				}), a.__construct = function() {
					this === a && L("Pass correct 'this' to __construct");
					var e = s.implement.apply(void 0, [this].concat(r.call(arguments)));
					ye(e);
					var t = e.M;
					e.notifyOnDestruction(), t.aa = !0, Object.defineProperties(this, { M: { value: t } }), De(this), e = t.O, e = he(i, e), me.hasOwnProperty(e) ? L("Tried to register registered instance: " + e) : me[e] = this;
				}, a.__destruct = function() {
					this === a && L("Pass correct 'this' to __destruct"), ye(this);
					var e = this.M.O;
					e = he(i, e), me.hasOwnProperty(e) ? delete me[e] : L("Tried to unregister unregistered instance: " + e);
				}, e.prototype = Object.create(a), n) e.prototype[c] = n[c];
				return ce(e);
			},
			j: function(e) {
				var t = Oe[e];
				delete Oe[e];
				var n = t.fa, r = t.W, i = t.ia, a = i.map((e) => e.ta).concat(i.map((e) => e.za));
				Me([e], a, (e) => {
					var a = {};
					return i.forEach((t, n) => {
						var r = e[n], o = t.ra, s = t.sa, c = e[n + i.length], l = t.ya, u = t.Aa;
						a[t.oa] = {
							read: (e) => r.fromWireType(o(s, e)),
							write: (e, t) => {
								var n = [];
								l(u, e, c.toWireType(n, t)), ke(n);
							}
						};
					}), [{
						name: t.name,
						fromWireType: function(e) {
							var t = {}, n;
							for (n in a) t[n] = a[n].read(e);
							return r(e), t;
						},
						toWireType: function(e, t) {
							for (var i in a) if (!(i in t)) throw TypeError("Missing field:  \"" + i + "\"");
							var o = n();
							for (i in a) a[i].write(o, t[i]);
							return e !== null && e.push(r, o), o;
						},
						argPackAdvance: 8,
						readValueFromPointer: Ae,
						V: r
					}];
				});
			},
			v: function() {},
			B: function(e, t, n, r, i) {
				var a = Ne(n);
				t = de(t), Pe(e, {
					name: t,
					fromWireType: function(e) {
						return !!e;
					},
					toWireType: function(e, t) {
						return t ? r : i;
					},
					argPackAdvance: 8,
					readValueFromPointer: function(e) {
						if (n === 1) var r = m;
						else if (n === 2) r = g;
						else if (n === 4) r = v;
						else throw TypeError("Unknown boolean type size: " + t);
						return this.fromWireType(r[e >> a]);
					},
					V: null
				});
			},
			f: function(e, t, n, r, i, a, o, s, c, l, u, d, f) {
				u = de(u), a = qe(i, a), s &&= qe(o, s), l &&= qe(c, l), f = qe(d, f);
				var p = ie(u);
				Re(p, function() {
					Ye("Cannot construct " + u + " due to unbound types", [r]);
				}), Me([
					e,
					t,
					n
				], r ? [r] : [], function(t) {
					if (t = t[0], r) var n = t.N, i = n.X;
					else i = Ie.prototype;
					t = P(p, function() {
						if (Object.getPrototypeOf(this) !== o) throw new oe("Use 'new' to construct " + u);
						if (c.Y === void 0) throw new oe(u + " has no accessible constructor");
						var e = c.Y[arguments.length];
						if (e === void 0) throw new oe("Tried to invoke ctor of " + u + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(c.Y).toString() + ") parameters instead!");
						return e.apply(this, arguments);
					});
					var o = Object.create(i, { constructor: { value: t } });
					t.prototype = o;
					var c = new ze(u, t, o, f, n, a, s, l);
					n = new We(u, c, !0, !1), i = new We(u + "*", c, !1, !1);
					var d = new We(u + " const*", c, !1, !0);
					return Ce[e] = {
						pointerType: i,
						la: d
					}, Ge(p, t), [
						n,
						i,
						d
					];
				});
			},
			d: function(e, t, n, r, i, a, o) {
				var s = Ze(n, r);
				t = de(t), a = qe(i, a), Me([], [e], function(e) {
					function r() {
						Ye("Cannot call " + i + " due to unbound types", s);
					}
					e = e[0];
					var i = e.name + "." + t;
					t.startsWith("@@") && (t = Symbol[t.substring(2)]);
					var c = e.N.constructor;
					return c[t] === void 0 ? (r.Z = n - 1, c[t] = r) : (Le(c, t, i), c[t].S[n - 1] = r), Me([], s, function(e) {
						return e = Xe(i, [e[0], null].concat(e.slice(1)), null, a, o), c[t].S === void 0 ? (e.Z = n - 1, c[t] = e) : c[t].S[n - 1] = e, [];
					}), [];
				});
			},
			p: function(e, t, n, r, i, a) {
				0 < t || j();
				var o = Ze(t, n);
				i = qe(r, i), Me([], [e], function(e) {
					e = e[0];
					var n = "constructor " + e.name;
					if (e.N.Y === void 0 && (e.N.Y = []), e.N.Y[t - 1] !== void 0) throw new oe("Cannot register multiple constructors with identical number of parameters (" + (t - 1) + ") for class '" + e.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
					return e.N.Y[t - 1] = () => {
						Ye("Cannot construct " + e.name + " due to unbound types", o);
					}, Me([], o, function(r) {
						return r.splice(1, 0, null), e.N.Y[t - 1] = Xe(n, r, null, i, a), [];
					}), [];
				});
			},
			a: function(e, t, n, r, i, a, o, s) {
				var c = Ze(n, r);
				t = de(t), a = qe(i, a), Me([], [e], function(e) {
					function r() {
						Ye("Cannot call " + i + " due to unbound types", c);
					}
					e = e[0];
					var i = e.name + "." + t;
					t.startsWith("@@") && (t = Symbol[t.substring(2)]), s && e.N.ja.push(t);
					var l = e.N.X, u = l[t];
					return u === void 0 || u.S === void 0 && u.className !== e.name && u.Z === n - 2 ? (r.Z = n - 2, r.className = e.name, l[t] = r) : (Le(l, t, i), l[t].S[n - 2] = r), Me([], c, function(r) {
						return r = Xe(i, r, e, a, o), l[t].S === void 0 ? (r.Z = n - 2, l[t] = r) : l[t].S[n - 2] = r, [];
					}), [];
				});
			},
			A: function(e, t) {
				t = de(t), Pe(e, {
					name: t,
					fromWireType: function(e) {
						var t = se(e);
						return Qe(e), t;
					},
					toWireType: function(e, t) {
						return ce(t);
					},
					argPackAdvance: 8,
					readValueFromPointer: Ae,
					V: null
				});
			},
			n: function(e, t, n) {
				n = Ne(n), t = de(t), Pe(e, {
					name: t,
					fromWireType: function(e) {
						return e;
					},
					toWireType: function(e, t) {
						return t;
					},
					argPackAdvance: 8,
					readValueFromPointer: et(t, n),
					V: null
				});
			},
			e: function(e, t, n, r, i) {
				t = de(t), i === -1 && (i = 4294967295), i = Ne(n);
				var a = (e) => e;
				if (r === 0) {
					var o = 32 - 8 * n;
					a = (e) => e << o >>> o;
				}
				n = t.includes("unsigned") ? function(e, t) {
					return t >>> 0;
				} : function(e, t) {
					return t;
				}, Pe(e, {
					name: t,
					fromWireType: a,
					toWireType: n,
					argPackAdvance: 8,
					readValueFromPointer: tt(t, i, r !== 0),
					V: null
				});
			},
			b: function(e, t, n) {
				function r(e) {
					e >>= 2;
					var t = y;
					return new i(p, t[e + 1], t[e]);
				}
				var i = [
					Int8Array,
					Uint8Array,
					Int16Array,
					Uint16Array,
					Int32Array,
					Uint32Array,
					Float32Array,
					Float64Array
				][t];
				n = de(n), Pe(e, {
					name: n,
					fromWireType: r,
					argPackAdvance: 8,
					readValueFromPointer: r
				}, { ua: !0 });
			},
			o: function(e, t) {
				t = de(t);
				var n = t === "std::string";
				Pe(e, {
					name: t,
					fromWireType: function(e) {
						var t = y[e >> 2], r = e + 4;
						if (n) for (var i = r, a = 0; a <= t; ++a) {
							var o = r + a;
							if (a == t || h[o] == 0) {
								if (i = i ? f(h, i, o - i) : "", s === void 0) var s = i;
								else s += "\0", s += i;
								i = o + 1;
							}
						}
						else {
							for (s = Array(t), a = 0; a < t; ++a) s[a] = String.fromCharCode(h[r + a]);
							s = s.join("");
						}
						return xt(e), s;
					},
					toWireType: function(e, t) {
						t instanceof ArrayBuffer && (t = new Uint8Array(t));
						var r, i = typeof t == "string";
						if (i || t instanceof Uint8Array || t instanceof Uint8ClampedArray || t instanceof Int8Array || L("Cannot pass non-string to std::string"), n && i) {
							var a = 0;
							for (r = 0; r < t.length; ++r) {
								var o = t.charCodeAt(r);
								127 >= o ? a++ : 2047 >= o ? a += 2 : 55296 <= o && 57343 >= o ? (a += 4, ++r) : a += 3;
							}
							r = a;
						} else r = t.length;
						if (a = bt(4 + r + 1), o = a + 4, y[a >> 2] = r, n && i) {
							if (i = o, o = r + 1, r = h, 0 < o) {
								o = i + o - 1;
								for (var s = 0; s < t.length; ++s) {
									var c = t.charCodeAt(s);
									if (55296 <= c && 57343 >= c) {
										var l = t.charCodeAt(++s);
										c = 65536 + ((c & 1023) << 10) | l & 1023;
									}
									if (127 >= c) {
										if (i >= o) break;
										r[i++] = c;
									} else {
										if (2047 >= c) {
											if (i + 1 >= o) break;
											r[i++] = 192 | c >> 6;
										} else {
											if (65535 >= c) {
												if (i + 2 >= o) break;
												r[i++] = 224 | c >> 12;
											} else {
												if (i + 3 >= o) break;
												r[i++] = 240 | c >> 18, r[i++] = 128 | c >> 12 & 63;
											}
											r[i++] = 128 | c >> 6 & 63;
										}
										r[i++] = 128 | c & 63;
									}
								}
								r[i] = 0;
							}
						} else if (i) for (i = 0; i < r; ++i) s = t.charCodeAt(i), 255 < s && (xt(o), L("String has UTF-16 code units that do not fit in 8 bits")), h[o + i] = s;
						else for (i = 0; i < r; ++i) h[o + i] = t[i];
						return e !== null && e.push(xt, a), a;
					},
					argPackAdvance: 8,
					readValueFromPointer: Ae,
					V: function(e) {
						xt(e);
					}
				});
			},
			i: function(e, t, n) {
				if (n = de(n), t === 2) var r = nt, i = rt, a = it, o = () => _, s = 1;
				else t === 4 && (r = at, i = ot, a = st, o = () => y, s = 2);
				Pe(e, {
					name: n,
					fromWireType: function(e) {
						for (var n = y[e >> 2], i = o(), a, c = e + 4, l = 0; l <= n; ++l) {
							var u = e + 4 + l * t;
							(l == n || i[u >> s] == 0) && (c = r(c, u - c), a === void 0 ? a = c : (a += "\0", a += c), c = u + t);
						}
						return xt(e), a;
					},
					toWireType: function(e, r) {
						typeof r != "string" && L("Cannot pass non-string to C++ string type " + n);
						var o = a(r), c = bt(4 + o + t);
						return y[c >> 2] = o >> s, i(r, c + 4, o + t), e !== null && e.push(xt, c), c;
					},
					argPackAdvance: 8,
					readValueFromPointer: Ae,
					V: function(e) {
						xt(e);
					}
				});
			},
			k: function(e, t, n, r, i, a) {
				Oe[e] = {
					name: de(t),
					fa: qe(n, r),
					W: qe(i, a),
					ia: []
				};
			},
			h: function(e, t, n, r, i, a, o, s, c, l) {
				Oe[e].ia.push({
					oa: de(t),
					ta: n,
					ra: qe(r, i),
					sa: a,
					za: o,
					ya: qe(s, c),
					Aa: l
				});
			},
			C: function(e, t) {
				t = de(t), Pe(e, {
					va: !0,
					name: t,
					argPackAdvance: 0,
					fromWireType: function() {},
					toWireType: function() {}
				});
			},
			s: function(e, t, n, r, i) {
				e = ut[e], t = se(t), n = lt(n);
				var a = [];
				return y[r >> 2] = ce(a), e(t, n, a, i);
			},
			t: function(e, t, n, r) {
				e = ut[e], t = se(t), n = lt(n), e(t, n, null, r);
			},
			g: Qe,
			m: function(e, t) {
				var n = ft(e, t), r = n[0];
				t = r.name + "_$" + n.slice(1).map(function(e) {
					return e.name;
				}).join("_") + "$";
				var i = pt[t];
				if (i !== void 0) return i;
				var a = Array(e - 1);
				return i = dt((t, i, o, s) => {
					for (var c = 0, l = 0; l < e - 1; ++l) a[l] = n[l + 1].readValueFromPointer(s + c), c += n[l + 1].argPackAdvance;
					for (t = t[i].apply(t, a), l = 0; l < e - 1; ++l) n[l + 1].ma && n[l + 1].ma(a[l]);
					if (!r.va) return r.toWireType(o, t);
				}), pt[t] = i;
			},
			D: function(e) {
				4 < e && (F[e].ga += 1);
			},
			r: function(e) {
				ke(se(e)), Qe(e);
			},
			c: function() {
				j("");
			},
			x: function(e, t, n) {
				h.copyWithin(e, t, t + n);
			},
			w: function(e) {
				var t = h.length;
				if (e >>>= 0, 2147483648 < e) return !1;
				for (var n = 1; 4 >= n; n *= 2) {
					var r = t * (1 + .2 / n);
					r = Math.min(r, e + 100663296);
					var i = Math;
					r = Math.max(e, r), i = i.min.call(i, 2147483648, r + (65536 - r % 65536) % 65536);
					a: {
						try {
							u.grow(i - p.byteLength + 65535 >>> 16), S();
							var a = 1;
							break a;
						} catch {}
						a = void 0;
					}
					if (a) return !0;
				}
				return !1;
			},
			z: function() {
				return 52;
			},
			u: function() {
				return 70;
			},
			y: function(e, t, n, r) {
				for (var i = 0, a = 0; a < n; a++) {
					var o = y[t >> 2], l = y[t + 4 >> 2];
					t += 8;
					for (var u = 0; u < l; u++) {
						var d = h[o + u], p = mt[e];
						d === 0 || d === 10 ? ((e === 1 ? s : c)(f(p, 0)), p.length = 0) : p.push(d);
					}
					i += l;
				}
				return y[r >> 2] = i, 0;
			}
		};
		(function() {
			function e(e) {
				n.asm = e.exports, u = n.asm.E, S(), C = n.asm.J, T.unshift(n.asm.F), O--, n.monitorRunDependencies && n.monitorRunDependencies(O), O == 0 && (k !== null && (clearInterval(k), k = null), A && (e = A, A = null, e()));
			}
			function t(t) {
				e(t.instance);
			}
			function r(e) {
				return ne().then(function(e) {
					return WebAssembly.instantiate(e, a);
				}).then(function(e) {
					return e;
				}).then(e, function(e) {
					c("failed to asynchronously prepare wasm: " + e), j(e);
				});
			}
			var a = { a: vt };
			if (O++, n.monitorRunDependencies && n.monitorRunDependencies(O), n.instantiateWasm) try {
				return n.instantiateWasm(a, e);
			} catch (e) {
				c("Module.instantiateWasm callback failed with error: " + e), i(e);
			}
			return (function() {
				return l || typeof WebAssembly.instantiateStreaming != "function" || M(ee) || typeof fetch != "function" ? r(t) : fetch(ee, { credentials: "same-origin" }).then(function(e) {
					return WebAssembly.instantiateStreaming(e, a).then(t, function(e) {
						return c("wasm streaming compile failed: " + e), c("falling back to ArrayBuffer instantiation"), r(t);
					});
				});
			})().catch(i), {};
		})(), n.___wasm_call_ctors = function() {
			return (n.___wasm_call_ctors = n.asm.F).apply(null, arguments);
		};
		var yt = n.___getTypeName = function() {
			return (yt = n.___getTypeName = n.asm.G).apply(null, arguments);
		};
		n.__embind_initialize_bindings = function() {
			return (n.__embind_initialize_bindings = n.asm.H).apply(null, arguments);
		};
		var bt = n._malloc = function() {
			return (bt = n._malloc = n.asm.I).apply(null, arguments);
		}, xt = n._free = function() {
			return (xt = n._free = n.asm.K).apply(null, arguments);
		};
		n.dynCall_jiji = function() {
			return (n.dynCall_jiji = n.asm.L).apply(null, arguments);
		};
		var St;
		A = function e() {
			St || Ct(), St || (A = e);
		};
		function Ct() {
			function e() {
				if (!St && (St = !0, n.calledRun = !0, !d)) {
					if (re(T), r(n), n.onRuntimeInitialized && n.onRuntimeInitialized(), n.postRun) for (typeof n.postRun == "function" && (n.postRun = [n.postRun]); n.postRun.length;) {
						var e = n.postRun.shift();
						E.unshift(e);
					}
					re(E);
				}
			}
			if (!(0 < O)) {
				if (n.preRun) for (typeof n.preRun == "function" && (n.preRun = [n.preRun]); n.preRun.length;) D();
				re(w), 0 < O || (n.setStatus ? (n.setStatus("Running..."), setTimeout(function() {
					setTimeout(function() {
						n.setStatus("");
					}, 1), e();
				}, 1)) : e());
			}
		}
		if (n.preInit) for (typeof n.preInit == "function" && (n.preInit = [n.preInit]); 0 < n.preInit.length;) n.preInit.pop()();
		return Ct(), t.ready;
	});
})(), Qg = /*#__PURE__*/ function(e) {
	return e[e.Auto = 0] = "Auto", e[e.FlexStart = 1] = "FlexStart", e[e.Center = 2] = "Center", e[e.FlexEnd = 3] = "FlexEnd", e[e.Stretch = 4] = "Stretch", e[e.Baseline = 5] = "Baseline", e[e.SpaceBetween = 6] = "SpaceBetween", e[e.SpaceAround = 7] = "SpaceAround", e[e.SpaceEvenly = 8] = "SpaceEvenly", e;
}({}), $g = /*#__PURE__*/ function(e) {
	return e[e.BorderBox = 0] = "BorderBox", e[e.ContentBox = 1] = "ContentBox", e;
}({}), e_ = /*#__PURE__*/ function(e) {
	return e[e.Width = 0] = "Width", e[e.Height = 1] = "Height", e;
}({}), t_ = /*#__PURE__*/ function(e) {
	return e[e.Inherit = 0] = "Inherit", e[e.LTR = 1] = "LTR", e[e.RTL = 2] = "RTL", e;
}({}), n_ = /*#__PURE__*/ function(e) {
	return e[e.Flex = 0] = "Flex", e[e.None = 1] = "None", e[e.Contents = 2] = "Contents", e;
}({}), r_ = /*#__PURE__*/ function(e) {
	return e[e.Left = 0] = "Left", e[e.Top = 1] = "Top", e[e.Right = 2] = "Right", e[e.Bottom = 3] = "Bottom", e[e.Start = 4] = "Start", e[e.End = 5] = "End", e[e.Horizontal = 6] = "Horizontal", e[e.Vertical = 7] = "Vertical", e[e.All = 8] = "All", e;
}({}), i_ = /*#__PURE__*/ function(e) {
	return e[e.None = 0] = "None", e[e.StretchFlexBasis = 1] = "StretchFlexBasis", e[e.AbsolutePositionWithoutInsetsExcludesPadding = 2] = "AbsolutePositionWithoutInsetsExcludesPadding", e[e.AbsolutePercentAgainstInnerSize = 4] = "AbsolutePercentAgainstInnerSize", e[e.All = 2147483647] = "All", e[e.Classic = 2147483646] = "Classic", e;
}({}), a_ = /*#__PURE__*/ function(e) {
	return e[e.WebFlexBasis = 0] = "WebFlexBasis", e;
}({}), o_ = /*#__PURE__*/ function(e) {
	return e[e.Column = 0] = "Column", e[e.ColumnReverse = 1] = "ColumnReverse", e[e.Row = 2] = "Row", e[e.RowReverse = 3] = "RowReverse", e;
}({}), s_ = /*#__PURE__*/ function(e) {
	return e[e.Column = 0] = "Column", e[e.Row = 1] = "Row", e[e.All = 2] = "All", e;
}({}), c_ = /*#__PURE__*/ function(e) {
	return e[e.FlexStart = 0] = "FlexStart", e[e.Center = 1] = "Center", e[e.FlexEnd = 2] = "FlexEnd", e[e.SpaceBetween = 3] = "SpaceBetween", e[e.SpaceAround = 4] = "SpaceAround", e[e.SpaceEvenly = 5] = "SpaceEvenly", e;
}({}), l_ = /*#__PURE__*/ function(e) {
	return e[e.Error = 0] = "Error", e[e.Warn = 1] = "Warn", e[e.Info = 2] = "Info", e[e.Debug = 3] = "Debug", e[e.Verbose = 4] = "Verbose", e[e.Fatal = 5] = "Fatal", e;
}({}), u_ = /*#__PURE__*/ function(e) {
	return e[e.Undefined = 0] = "Undefined", e[e.Exactly = 1] = "Exactly", e[e.AtMost = 2] = "AtMost", e;
}({}), d_ = /*#__PURE__*/ function(e) {
	return e[e.Default = 0] = "Default", e[e.Text = 1] = "Text", e;
}({}), f_ = /*#__PURE__*/ function(e) {
	return e[e.Visible = 0] = "Visible", e[e.Hidden = 1] = "Hidden", e[e.Scroll = 2] = "Scroll", e;
}({}), p_ = /*#__PURE__*/ function(e) {
	return e[e.Static = 0] = "Static", e[e.Relative = 1] = "Relative", e[e.Absolute = 2] = "Absolute", e;
}({}), m_ = /*#__PURE__*/ function(e) {
	return e[e.Undefined = 0] = "Undefined", e[e.Point = 1] = "Point", e[e.Percent = 2] = "Percent", e[e.Auto = 3] = "Auto", e;
}({}), h_ = /*#__PURE__*/ function(e) {
	return e[e.NoWrap = 0] = "NoWrap", e[e.Wrap = 1] = "Wrap", e[e.WrapReverse = 2] = "WrapReverse", e;
}({}), g_ = {
	ALIGN_AUTO: Qg.Auto,
	ALIGN_FLEX_START: Qg.FlexStart,
	ALIGN_CENTER: Qg.Center,
	ALIGN_FLEX_END: Qg.FlexEnd,
	ALIGN_STRETCH: Qg.Stretch,
	ALIGN_BASELINE: Qg.Baseline,
	ALIGN_SPACE_BETWEEN: Qg.SpaceBetween,
	ALIGN_SPACE_AROUND: Qg.SpaceAround,
	ALIGN_SPACE_EVENLY: Qg.SpaceEvenly,
	BOX_SIZING_BORDER_BOX: $g.BorderBox,
	BOX_SIZING_CONTENT_BOX: $g.ContentBox,
	DIMENSION_WIDTH: e_.Width,
	DIMENSION_HEIGHT: e_.Height,
	DIRECTION_INHERIT: t_.Inherit,
	DIRECTION_LTR: t_.LTR,
	DIRECTION_RTL: t_.RTL,
	DISPLAY_FLEX: n_.Flex,
	DISPLAY_NONE: n_.None,
	DISPLAY_CONTENTS: n_.Contents,
	EDGE_LEFT: r_.Left,
	EDGE_TOP: r_.Top,
	EDGE_RIGHT: r_.Right,
	EDGE_BOTTOM: r_.Bottom,
	EDGE_START: r_.Start,
	EDGE_END: r_.End,
	EDGE_HORIZONTAL: r_.Horizontal,
	EDGE_VERTICAL: r_.Vertical,
	EDGE_ALL: r_.All,
	ERRATA_NONE: i_.None,
	ERRATA_STRETCH_FLEX_BASIS: i_.StretchFlexBasis,
	ERRATA_ABSOLUTE_POSITION_WITHOUT_INSETS_EXCLUDES_PADDING: i_.AbsolutePositionWithoutInsetsExcludesPadding,
	ERRATA_ABSOLUTE_PERCENT_AGAINST_INNER_SIZE: i_.AbsolutePercentAgainstInnerSize,
	ERRATA_ALL: i_.All,
	ERRATA_CLASSIC: i_.Classic,
	EXPERIMENTAL_FEATURE_WEB_FLEX_BASIS: a_.WebFlexBasis,
	FLEX_DIRECTION_COLUMN: o_.Column,
	FLEX_DIRECTION_COLUMN_REVERSE: o_.ColumnReverse,
	FLEX_DIRECTION_ROW: o_.Row,
	FLEX_DIRECTION_ROW_REVERSE: o_.RowReverse,
	GUTTER_COLUMN: s_.Column,
	GUTTER_ROW: s_.Row,
	GUTTER_ALL: s_.All,
	JUSTIFY_FLEX_START: c_.FlexStart,
	JUSTIFY_CENTER: c_.Center,
	JUSTIFY_FLEX_END: c_.FlexEnd,
	JUSTIFY_SPACE_BETWEEN: c_.SpaceBetween,
	JUSTIFY_SPACE_AROUND: c_.SpaceAround,
	JUSTIFY_SPACE_EVENLY: c_.SpaceEvenly,
	LOG_LEVEL_ERROR: l_.Error,
	LOG_LEVEL_WARN: l_.Warn,
	LOG_LEVEL_INFO: l_.Info,
	LOG_LEVEL_DEBUG: l_.Debug,
	LOG_LEVEL_VERBOSE: l_.Verbose,
	LOG_LEVEL_FATAL: l_.Fatal,
	MEASURE_MODE_UNDEFINED: u_.Undefined,
	MEASURE_MODE_EXACTLY: u_.Exactly,
	MEASURE_MODE_AT_MOST: u_.AtMost,
	NODE_TYPE_DEFAULT: d_.Default,
	NODE_TYPE_TEXT: d_.Text,
	OVERFLOW_VISIBLE: f_.Visible,
	OVERFLOW_HIDDEN: f_.Hidden,
	OVERFLOW_SCROLL: f_.Scroll,
	POSITION_TYPE_STATIC: p_.Static,
	POSITION_TYPE_RELATIVE: p_.Relative,
	POSITION_TYPE_ABSOLUTE: p_.Absolute,
	UNIT_UNDEFINED: m_.Undefined,
	UNIT_POINT: m_.Point,
	UNIT_PERCENT: m_.Percent,
	UNIT_AUTO: m_.Auto,
	WRAP_NO_WRAP: h_.NoWrap,
	WRAP_WRAP: h_.Wrap,
	WRAP_WRAP_REVERSE: h_.WrapReverse
};
//#endregion
//#region ../../node_modules/.pnpm/yoga-layout@3.2.1/node_modules/yoga-layout/dist/src/wrapAssembly.js
function __(e) {
	function t(e, t, n) {
		let r = e[t];
		e[t] = function() {
			var e = [...arguments];
			return n.call(this, r, ...e);
		};
	}
	for (let n of [
		"setPosition",
		"setMargin",
		"setFlexBasis",
		"setWidth",
		"setHeight",
		"setMinWidth",
		"setMinHeight",
		"setMaxWidth",
		"setMaxHeight",
		"setPadding",
		"setGap"
	]) {
		let r = {
			[m_.Point]: e.Node.prototype[n],
			[m_.Percent]: e.Node.prototype[`${n}Percent`],
			[m_.Auto]: e.Node.prototype[`${n}Auto`]
		};
		t(e.Node.prototype, n, function(e) {
			var t = [...arguments].slice(1);
			let i = t.pop(), a, o;
			if (i === "auto") a = m_.Auto, o = void 0;
			else if (typeof i == "object") a = i.unit, o = i.valueOf();
			else if (a = typeof i == "string" && i.endsWith("%") ? m_.Percent : m_.Point, o = parseFloat(i), i !== void 0 && !Number.isNaN(i) && Number.isNaN(o)) throw Error(`Invalid value ${i} for ${n}`);
			if (!r[a]) throw Error(`Failed to execute "${n}": Unsupported unit '${i}'`);
			return o === void 0 ? r[a].call(this, ...t) : r[a].call(this, ...t, o);
		});
	}
	function n(t) {
		return e.MeasureCallback.implement({ measure: function() {
			let { width: e, height: n } = t(...arguments);
			return {
				width: e ?? NaN,
				height: n ?? NaN
			};
		} });
	}
	t(e.Node.prototype, "setMeasureFunc", function(e, t) {
		return t ? e.call(this, n(t)) : this.unsetMeasureFunc();
	});
	function r(t) {
		return e.DirtiedCallback.implement({ dirtied: t });
	}
	return t(e.Node.prototype, "setDirtiedFunc", function(e, t) {
		e.call(this, r(t));
	}), t(e.Config.prototype, "free", function() {
		e.Config.destroy(this);
	}), t(e.Node, "create", (t, n) => n ? e.Node.createWithConfig(n) : e.Node.createDefault()), t(e.Node.prototype, "free", function() {
		e.Node.destroy(this);
	}), t(e.Node.prototype, "freeRecursive", function() {
		for (let e = 0, t = this.getChildCount(); e < t; ++e) this.getChild(0).freeRecursive();
		this.free();
	}), t(e.Node.prototype, "calculateLayout", function(e) {
		let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : NaN, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : NaN, r = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : t_.LTR;
		return e.call(this, t, n, r);
	}), {
		Config: e.Config,
		Node: e.Node,
		...g_
	};
}
//#endregion
//#region ../../node_modules/.pnpm/yoga-layout@3.2.1/node_modules/yoga-layout/dist/src/load.js
async function v_() {
	return __(await Zg());
}
//#endregion
//#region ../../packages/edi-motion/src/layout/yoga.ts
var y_;
async function b_() {
	y_ ||= v_().catch((e) => {
		throw y_ = void 0, e;
	});
	let e = await y_, t = {
		start: Qg.FlexStart,
		center: Qg.Center,
		end: Qg.FlexEnd,
		stretch: Qg.Stretch,
		auto: Qg.Auto
	}, n = {
		start: c_.FlexStart,
		center: c_.Center,
		end: c_.FlexEnd,
		"space-between": c_.SpaceBetween,
		"space-around": c_.SpaceAround,
		"space-evenly": c_.SpaceEvenly
	};
	return { compute(r, i, a, o, s = i) {
		if (![
			i.width,
			i.height,
			s.width,
			s.height
		].every((e) => Number.isFinite(e) && e >= 0 && e <= 1e5)) throw Error("Viewport de layout inválido.");
		let c = Rp(r, a), l = e.Config.create(), u = [], d = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), p = /* @__PURE__ */ new Map(), m = [], h = new Map(c.items.map((e) => [e.targetId, e])), g = new Map(c.containers.map((e) => [e.targetId, e.config])), _ = /* @__PURE__ */ new Map();
		for (let [e, t] of a) {
			let n = _.get(t.parentId) ?? [];
			n.push(e), _.set(t.parentId, n);
		}
		l.setUseWebDefaults(!0), l.setPointScaleFactor(0);
		let v = () => {
			if (u.length >= 6001) throw Error("Orçamento de nós Yoga excedido.");
			let t = e.Node.create(l);
			return u.push(t), t;
		}, y = (e, t) => {
			e.insertChild(t, e.getChildCount()), p.set(t, e);
		}, b = (e, r) => {
			e.setFlexDirection(r.flow === "column" ? o_.Column : o_.Row), e.setDirection(r.direction === "rtl" ? t_.RTL : t_.LTR), e.setFlexWrap(r.flow === "grid" || r.wrap ? h_.Wrap : h_.NoWrap), e.setJustifyContent(n[r.justify]), e.setAlignItems(t[r.align]), e.setAlignContent(Qg.FlexStart), e.setGap(s_.Column, r.gap[0]), e.setGap(s_.Row, r.gap[1]), [
				r_.Top,
				r_.Right,
				r_.Bottom,
				r_.Left
			].forEach((t, n) => {
				e.setPadding(t, r.padding[n] ?? 0);
			}), e.setOverflow(r.scroll ? f_.Scroll : r.clip ? f_.Hidden : f_.Visible);
		}, x = (e, t, n, r, i) => {
			let a = (t) => n === "width" ? e.setWidth(t) : e.setHeight(t);
			t.kind === "fixed" ? a(t.value) : t.kind === "percent" ? n === "width" ? e.setWidthPercent(t.value * 100) : e.setHeightPercent(t.value * 100) : t.kind === "hug" || i.kind === "absolute" ? a("auto") : r.flow === "row" && n === "width" || r.flow === "column" && n === "height" ? (a("auto"), e.setFlexBasis(0), e.setFlexGrow(t.weight)) : (a("auto"), e.setAlignSelf(Qg.Stretch));
		}, S = (e, n) => {
			let r = v(), i = h.get(e) ?? Lp(e), a = g.get(e);
			if (d.set(e, r), f.set(r, e), r.setFlexShrink(0), r.setAlignSelf(t[i.alignSelf]), r.setMinWidth(i.minWidth), r.setMaxWidth(i.maxWidth), r.setMinHeight(i.minHeight), r.setMaxHeight(i.maxHeight), [
				r_.Top,
				r_.Right,
				r_.Bottom,
				r_.Left
			].forEach((e, t) => {
				r.setMargin(e, i.margin[t] ?? 0);
			}), x(r, i.width, "width", n, i.position), x(r, i.height, "height", n, i.position), i.aspectRatio !== null && r.setAspectRatio(i.aspectRatio), i.position.kind === "absolute") {
				r.setPositionType(p_.Absolute);
				for (let [e, t] of [
					[r_.Left, i.position.left],
					[r_.Right, i.position.right],
					[r_.Top, i.position.top],
					[r_.Bottom, i.position.bottom]
				]) t !== null && r.setPosition(e, t);
			}
			if (a) b(r, a), C(r, e, a);
			else {
				let t = o.get(e);
				if (!t || Object.values(t).some((e) => !Number.isFinite(e) || Math.abs(e) > 1e7) || t.width < 0 || t.height < 0) throw Error("Medida intrínseca ausente ou inválida.");
				r.setMeasureFunc((e, n, r, i) => ({
					width: n === u_.Exactly ? e : n === u_.AtMost ? Math.min(e, t.width) : t.width,
					height: i === u_.Exactly ? r : i === u_.AtMost ? Math.min(r, t.height) : t.height
				}));
			}
			return r;
		};
		function C(e, t, n) {
			let r = [];
			for (let i of _.get(t) ?? []) if (n.flow === "grid" && h.get(i)?.position.kind !== "absolute") {
				let t = v();
				t.setFlexDirection(o_.Column), t.setFlexShrink(0), t.setAlignItems(Qg.Stretch), t.setWidthPercent(100 / (n.columns?.kind === "fixed" ? n.columns.count : 1));
				let a = {
					...n,
					flow: "column",
					columns: void 0,
					wrap: !1,
					padding: [
						0,
						0,
						0,
						0
					],
					gap: [0, 0]
				};
				y(t, S(i, a)), y(e, t), r.push(t);
			} else y(e, S(i, n));
			n.flow === "grid" && m.push({
				node: e,
				cells: r,
				config: n,
				targetId: t,
				last: ""
			});
		}
		try {
			let e = v();
			f.set(e, null), b(e, c.root);
			let t = c.rootSize ?? {
				width: "fill",
				height: "fill"
			}, n = t.width === "hug" ? void 0 : t.width === "fixed" ? s.width : i.width, r = t.height === "hug" ? void 0 : t.height === "fixed" ? s.height : i.height;
			n === void 0 ? e.setWidthAuto() : e.setWidth(n), r === void 0 ? e.setHeightAuto() : e.setHeight(r), C(e, null, c.root);
			let a = !1;
			for (let i = 0; i < 35; i++) {
				e.calculateLayout(n, r, c.root.direction === "rtl" ? t_.RTL : t_.LTR);
				let i = 0;
				for (let e of m) {
					let n = Math.max(0, e.node.getComputedWidth() - e.config.padding[1] - e.config.padding[3]), r = Math.max(0, e.node.getComputedHeight() - e.config.padding[0] - e.config.padding[2]), a = e.config.columns?.kind === "fixed" ? e.config.columns.count : Math.max(1, Math.min(24, Math.floor((n + e.config.gap[0]) / ((e.config.columns?.minWidth ?? 1) + e.config.gap[0])))), o = Math.max(1, Math.ceil(e.cells.length / a)), s = Math.max(0, ...e.cells.map((e) => {
						let t = e.getChild(0);
						return t.getComputedHeight() + t.getComputedMargin(r_.Top) + t.getComputedMargin(r_.Bottom);
					})), c = Math.max(0, (n - e.config.gap[0] * (a - 1)) / a), l = (e.targetId === null ? t.height !== "hug" : (h.get(e.targetId)?.height.kind ?? "hug") !== "hug") ? Math.max(s, (r - e.config.gap[1] * (o - 1)) / o) : null, u = JSON.stringify([
						a,
						c,
						l
					]);
					if (u !== e.last) {
						e.last = u, i++;
						for (let t of e.cells) t.setWidth(c), l === null ? t.setHeightAuto() : t.setHeight(l);
					}
				}
				if (i === 0) {
					a = !0;
					break;
				}
			}
			if (!a) throw Error("Layout de grade não convergiu; nenhuma alteração aplicada.");
			let o = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map();
			for (let [e, t] of d) {
				let n = t.getComputedLeft(), r = t.getComputedTop(), i = p.get(t);
				for (; i && !f.has(i);) n += i.getComputedLeft(), r += i.getComputedTop(), i = p.get(i);
				let a = {
					x: n,
					y: r,
					width: t.getComputedWidth(),
					height: t.getComputedHeight()
				};
				if (Object.values(a).some((e) => !Number.isFinite(e) || Math.abs(e) > 1e7)) throw Error("Resultado de layout fora dos limites.");
				o.set(e, a);
			}
			for (let [e, t] of f) {
				let n = t === null ? c.root : g.get(t);
				if (!n) continue;
				let r = e.getComputedWidth(), i = e.getComputedHeight(), a = (_.get(t) ?? []).flatMap((e) => {
					let t = o.get(e);
					return t ? [t] : [];
				}), s = Math.min(0, ...a.map((e) => e.x)), u = Math.min(0, ...a.map((e) => e.y)), d = Math.max(r, ...a.map((e) => e.x + e.width + n.padding[1])), f = Math.max(i, ...a.map((e) => e.y + e.height + n.padding[2]));
				l.set(t, {
					width: r,
					height: i,
					content: {
						x: s,
						y: u,
						width: d - s,
						height: f - u
					},
					overflow: s < 0 || u < 0 || d > r + .001 || f > i + .001
				});
			}
			return {
				boxes: o,
				containers: l
			};
		} finally {
			let e = u.filter((e) => !p.has(e));
			for (let t of e) t.freeRecursive();
			l.free();
		}
	} };
}
//#endregion
//#region ../../packages/edi-motion/src/runtimeFonts.ts
function x_(e) {
	let t = /* @__PURE__ */ new Set();
	function n(e) {
		for (let n of e.content) for (let e of tu(n)) t.add(e);
		for (let t of e.components ?? []) n(t.document);
	}
	return n(e), t;
}
function S_(e, t) {
	let n = `edi-${t}`;
	for (let t of e) if (t.family.replace(/^["']|["']$/g, "") === n && t.status === "loaded") return !0;
	return !1;
}
async function C_(e, t, n) {
	let r = e.ownerDocument.fonts;
	for (let e of x_(t)) if (n?.throwIfAborted(), !S_(r, e) && (await r.load(`16px "edi-${e}"`), n?.throwIfAborted(), !S_(r, e))) throw Error("Fonte incorporada não foi carregada; fallback silencioso recusado.");
}
//#endregion
//#region ../../packages/edi-motion/src/sceneClock.ts
function w_() {
	let e = [], t, n = !1, r = !1;
	function i(e, t) {
		return e.length <= t.length && e.every((e, n) => t[n] === e);
	}
	function a(e) {
		if (e.reduce((e, t) => e + t.lines, 0) > 2e3) throw Error("Cena excede o orçamento agregado de linhas de texto.");
		if (e.reduce((e, t) => e + t.vertices, 0) > 1e5) throw Error("Cena excede o orçamento agregado de geometria transitória.");
	}
	function o(t, n, o, s = !1) {
		if (!Number.isFinite(n) || n < 0 || n > 10) throw Error("Avanço da cena deve estar entre 0 e 10 segundos.");
		let c = e.filter((e) => i(t, e.path)), l = c[0];
		if (!l) throw Error("Escopo de avanço inexistente.");
		let u = { remaining: 2e6 }, d = c.map((t) => {
			let r = s || o && e.every((e) => !i(e.path, t.path) || e.active), a = n * t.speed / (s ? l.speed : 1);
			return t.callbacks.prepareAdvance(a, r, u);
		});
		if (d.reduce((e, t) => e + t.events, 0) > 512) throw Error("Cena excede o orçamento agregado de eventos por avanço.");
		if (d.reduce((e, t) => e + (t.audioCues ?? 0), 0) > 128) throw Error("Cena excede orçamento de 128 efeitos de áudio por avanço.");
		let f = e.filter((e) => !i(t, e.path)).map((e) => e.callbacks.prepareAdvance(0, !1));
		a([...d, ...f]);
		let p = d.map((e) => e.commit());
		for (let e of p) {
			if (r) break;
			e();
		}
		return !r && d.some((e) => e.continuing);
	}
	return {
		assertWritable() {
			if (r) throw Error("Relógio da cena encerrado.");
			if (n) throw Error("Não altere a cena durante callbacks de observação.");
		},
		validateFrame(t, n, r) {
			a(e.map((e) => e.path.length === t.length && i(t, e.path) ? {
				lines: n,
				vertices: r
			} : e.callbacks.prepareAdvance(0, !1)));
		},
		notify(e) {
			let t = n;
			n = !0;
			try {
				e();
			} finally {
				n = t;
			}
		},
		register(n, r, i, a) {
			let o = {
				path: n,
				speed: r,
				active: a.autoplay !== !1,
				callbacks: i
			};
			return e.push(o), {
				get playing() {
					return (t?.playing ?? !1) && o.active;
				},
				play() {
					o.active = !0, n.length ? t?.invalidate() : t?.play();
				},
				pause() {
					o.active = !1, n.length ? t?.invalidate() : t?.pause();
				},
				invalidate() {
					t?.invalidate();
				},
				setPolicy(e) {
					t?.setPolicy(e);
				},
				fail(e) {
					if (t) t.fail(e);
					else throw e;
				},
				destroy() {
					o.active = !1;
				}
			};
		},
		start(n, r) {
			if (t) throw Error("Relógio de cena já iniciado.");
			a(e.map((e) => e.callbacks.prepareAdvance(0, !1))), t = Rg(n, {
				paint(t) {
					let n = { remaining: 2e6 };
					for (let r of e) r.callbacks.paint(t, n);
				},
				advance(e, t) {
					return o([], e, t);
				},
				hasActivity() {
					return e.some((e) => e.callbacks.hasActivity());
				}
			}, r);
		},
		advance(e, n) {
			this.assertWritable(), o(e, n, !0, !0), t?.invalidate();
		},
		reset(n) {
			this.assertWritable();
			let o = { remaining: 2e6 }, s = e.filter((e) => i(n, e.path)).map((e) => e.callbacks.prepareReset(o)), c = e.filter((e) => !i(n, e.path)).map((e) => e.callbacks.prepareAdvance(0, !1));
			a([...s, ...c]);
			let l = s.map((e) => e.commit());
			for (let e of l) {
				if (r) break;
				e();
			}
			t?.invalidate();
		},
		invalidate() {
			t?.invalidate();
		},
		destroy() {
			if (r) return;
			r = !0;
			let n = t;
			t = void 0, e.length = 0, n?.destroy();
		}
	};
}
//#endregion
//#region ../../packages/edi-motion/src/assets/styles.ts
function T_(e) {
	let t = Xl(e);
	if (t.kind !== "font") throw Error("Recurso de fonte esperado.");
	return `@font-face{font-family:"${$l(t)}";src:url("${Ql(t)}") format("${t.format}");font-weight:${t.weight};font-style:${t.italic ? "italic" : "normal"};font-display:block;}`;
}
//#endregion
//#region ../../packages/edi-motion/src/visual/imageMeshElement.ts
var E_ = /* @__PURE__ */ new Set([
	"x",
	"y",
	"width",
	"height",
	"preserveAspectRatio",
	"overflow"
]);
function D_(e, t, n, r, i) {
	let a = nh(r, n), o = (i ?? a).flatMap((e) => e.points);
	return {
		tag: "g",
		attrs: {
			...Object.fromEntries(Object.entries(n).filter(([e]) => !E_.has(e))),
			"data-edi-image": t.id,
			"data-edi-mesh": `${r.columns}x${r.rows}`
		},
		children: ah(r, t, o).map((n, r) => ({
			tag: "g",
			attrs: {
				transform: `matrix(${n.join(" ")})`,
				"clip-path": `url(#${oh(e, r)})`
			},
			children: [{
				tag: "use",
				attrs: { href: `#edi-${t.id}` },
				children: []
			}]
		}))
	};
}
function O_(e, t, n) {
	return ih(n, t).map((t, n) => ({
		tag: "clipPath",
		attrs: {
			id: oh(e, n),
			clipPathUnits: "userSpaceOnUse"
		},
		children: [{
			tag: "polygon",
			attrs: { points: t },
			children: []
		}]
	}));
}
//#endregion
//#region ../../packages/edi-motion/src/visual/describe.ts
function k_(e, t, n = {}) {
	let r = new Map(Zl(t).map((e) => [e.id, e])), i = [], a = /* @__PURE__ */ new Set(), o = 0;
	function s(e, t, n) {
		if (n > 32) throw Error("Descrição visual excede a profundidade.");
		for (let r of e) {
			if (o += 1 + (r.semantics && r.semantics.kind !== "decorative" && r.semantics.description ? 1 : 0) + (r.imageSlice ? 18 : 0) + pp(r.paintLayers).length + (r.effects?.clip ? 2 : 0) + (r.effects?.mask ? 2 : 0), o > 2e3 || a.has(r.id)) throw Error("Descrição visual excede orçamento ou contém IDs repetidos.");
			a.add(r.id), i.push({
				node: r,
				parentId: t
			}), s(r.children, r.id, n + 1);
		}
	}
	s(e.nodes, null, 0);
	let c = new Set(i.flatMap(({ node: e }) => e.assetId ? [e.assetId] : [])), l = new Set(i.flatMap(({ node: e }) => tu(e))), u = op(i.map(({ node: e }) => e), new Map(i.flatMap(({ node: e }) => e.effects ? [[e.id, e.effects]] : []))), d = Kf(i.map(({ node: e, parentId: t }) => ({
		...e,
		parentId: t
	})), new Map(i.flatMap(({ node: e }) => e.effects ? [[e.id, e.effects]] : []))), f = i.some(({ node: e }) => e.effects) ? wp(Sp(new Map(i.map(({ node: e, parentId: t }) => [e.id, {
		tag: e.tag,
		parentId: t,
		transform: e.transform,
		basis: e.basis,
		attributeMatrix: fu(e.attrs.transform ?? ""),
		geometry: e.geometry,
		pathData: e.tag === "path" ? e.attrs.d : void 0,
		effects: e.effects,
		nativeShape: u.get(e.id),
		paint: d.get(e.id)
	}]))), /* @__PURE__ */ new Map()) : [], p = Dp(f), m = [
		...Lf([...i.map(({ node: e }) => e.gradients), ...i.flatMap(({ node: e }) => mp(e.paintLayers).map((e) => ({ fill: e })))]),
		...ip(i.map(({ node: e }) => e.filter)),
		...f.map((e) => Ep(e))
	];
	for (let e of c) {
		let t = r.get(e);
		if (t?.kind !== "image") throw Error("Recurso visual de imagem ausente.");
		m.push({
			tag: "image",
			attrs: {
				id: `edi-${e}`,
				width: String(t.width),
				height: String(t.height),
				href: Ql(t)
			},
			children: []
		});
	}
	for (let e of l) {
		let t = r.get(e);
		if (t?.kind !== "font") throw Error("Recurso visual de fonte ausente.");
		n.embeddedFonts !== !1 && m.push({
			tag: "style",
			attrs: {},
			children: [],
			text: T_(t)
		}), m.push({
			tag: "metadata",
			attrs: {},
			children: [],
			text: [
				t.family,
				t.notice,
				t.licenseNotice
			].filter(Boolean).join("\n\n")
		});
	}
	let h = n.mode === "editor" ? "data-object" : n.mode === "runtime" ? "data-edi-object" : void 0, g = { remaining: 2e6 };
	function _(e) {
		let t = n.semantics === !1 || n.mode === "editor" && n.semantics !== !0 ? void 0 : e.semantics, i = {
			...e.attrs,
			...Rf(e.gradients),
			...ap(e.filter),
			...e.tag === "text" && e.textDirection ? { direction: mh(e.text) } : {}
		}, a = e.assetId ? r.get(e.assetId) : void 0;
		if (e.fontAssetId) {
			let t = nu(r, e), a = ru(t);
			if (!a) throw Error("Fonte visual ausente.");
			i["font-family"] = a, n.verifyFonts && Zh(e.text, t, g);
		}
		let o = e.children.map(_);
		if (e.tag === "text" && e.textPath) m.push({
			tag: "path",
			attrs: {
				id: gh(e.id),
				d: e.textPath.d
			},
			children: []
		}), o.push({
			tag: "textPath",
			attrs: {
				href: `#${gh(e.id)}`,
				startOffset: `${e.textPath.startOffset}%`
			},
			text: e.text,
			children: []
		});
		else if (e.tag === "text" && e.textLayout) {
			let t = e.textLayout.lineHeight;
			o.push(...e.text.replace(/\r\n?/g, "\n").split("\n").map((e, n) => ({
				tag: "tspan",
				attrs: {
					x: i.x ?? "0",
					dy: `${n ? t : 0}em`
				},
				text: e || "\xA0",
				children: []
			})));
		}
		let s;
		if (e.tag === "image" && e.imageMesh) {
			if (a?.kind !== "image") throw Error("Imagem visual sem recurso.");
			s = D_(e.id, a, e.attrs, e.imageMesh, e.geometry);
			for (let t of O_(e.id, a, e.imageMesh)) m.push(t);
			e.filter && (s.attrs = {
				...s.attrs,
				...ap(e.filter)
			});
		} else if (e.tag === "image") {
			if (a?.kind !== "image") throw Error("Imagem visual sem recurso.");
			s = Eu(a, e.attrs, e.imageSlice), e.filter && (s.attrs = {
				...s.attrs,
				...ap(e.filter)
			});
		} else s = {
			tag: e.tag,
			attrs: i,
			children: o,
			...e.tag === "text" && (e.textLayout || e.textPath) ? {} : { text: e.text }
		};
		let c = cp.has(e.tag) && e.paintLayers ? pp(e.paintLayers).map((t) => ({
			tag: e.tag,
			attrs: {
				...fp(e.attrs),
				...dp(t),
				[up]: t.id
			},
			children: []
		})) : [], l = {
			tag: "g",
			attrs: {
				...h ? { [h]: e.id } : {},
				...Th(t, n.mode === "runtime"),
				...p.get(e.id),
				transform: du(e.transform),
				opacity: String(e.transform.opacity / 100),
				...e.visible ? {} : { display: "none" }
			},
			children: [
				s,
				...c,
				...t && t.kind !== "decorative" && t.description ? [{
					tag: "desc",
					attrs: {},
					text: t.description,
					children: []
				}] : []
			]
		};
		return e.basis ? {
			tag: "g",
			attrs: {
				...h ? { "data-edi-basis": e.id } : {},
				transform: `matrix(${e.basis.join(" ")})`
			},
			children: [l]
		} : l;
	}
	let v = e.nodes.map(_), y = m.length ? [{
		tag: "defs",
		attrs: {},
		children: m
	}] : [];
	if (n.mode === "editor" || n.mode === "runtime" || n.globalTransform) {
		let t = n.globalTransform, r = n.mode === "static" ? {} : { "data-scene-motion": "" };
		if (t) {
			let [n, i, a, o] = e.viewBox;
			r.transform = `matrix(${uu({
				...t,
				px: n + a / 2 + (t.px ?? 0),
				py: i + o / 2 + (t.py ?? 0)
			}).join(" ")})`, r.opacity = String(t.opacity / 100);
		}
		y.push({
			tag: "g",
			attrs: r,
			children: v,
			...t ? {} : { style: {
				transformBox: "view-box",
				transformOrigin: "50% 50%"
			} }
		});
	} else y.push(...v);
	return {
		tag: "svg",
		attrs: {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: e.viewBox.join(" "),
			...e.preserveAspectRatio ? { preserveAspectRatio: e.preserveAspectRatio } : {}
		},
		children: y
	};
}
//#endregion
//#region ../../packages/edi-motion/src/visual/document.ts
function A_(e) {
	let t = Ah(e);
	if (t.version < 6 || !t.visual || !t.assets) throw Error("Render gráfico portátil requer blueprint v6.");
	function n(e) {
		let t = new Map(e.playback.objects.map((e) => [e.id, e])), r = /* @__PURE__ */ new Map();
		for (let n of e.content) {
			let e = n.visual, i = t.get(n.id);
			if (!e || !i?.tag || i.parentId === void 0) throw Error("Metadados visuais/espaciais ausentes.");
			r.set(n.id, {
				id: n.id,
				tag: n.tag,
				attrs: {
					...e.attrs,
					...n.tag === "path" ? { d: e.attrs.d ?? (i.geometry ? ef(i.geometry) : "") } : {},
					...i.attributeMatrix ? { transform: `matrix(${i.attributeMatrix.join(" ")})` } : {}
				},
				text: e.text,
				visible: e.visible,
				transform: i.transform,
				children: [],
				basis: i.basis,
				geometry: i.geometry,
				assetId: n.assetId,
				fontAssetId: n.fontAssetId,
				fontFallbackIds: n.fontFallbackIds,
				gradients: n.gradients,
				filter: n.filter,
				paintLayers: n.paintLayers,
				imageSlice: n.imageSlice?.insets,
				imageMesh: n.imageMesh,
				effects: n.effects,
				textLayout: e.textLayout,
				textDirection: e.textDirection,
				textPath: e.textPath,
				semantics: n.semantics
			});
		}
		let i = /* @__PURE__ */ new Map();
		for (let t of e.content) {
			let e = r.get(t.id);
			if (!e || t.parentId === void 0) throw Error("Objeto visual ausente.");
			let n = i.get(t.parentId) ?? [];
			n.push(e), i.set(t.parentId, n);
		}
		for (let [e, t] of r) t.children = i.get(e) ?? [];
		for (let t of e.components ?? []) {
			let e = r.get(t.rootId);
			if (e?.tag !== "svg" || e.children.length) throw Error("Viewport visual de componente inválido.");
			e.children = n(t.document);
		}
		return i.get(null) ?? [];
	}
	return {
		document: t,
		scene: {
			viewBox: t.visual.viewBox,
			preserveAspectRatio: t.visual.preserveAspectRatio,
			nodes: n(t)
		},
		assets: t.assets
	};
}
function j_(e, t = {}) {
	let n = A_(e);
	return k_(n.scene, n.assets, {
		mode: "runtime",
		embeddedFonts: !1,
		verifyFonts: n.document.version >= 7,
		...t,
		globalTransform: t.globalTransform ?? n.document.visual?.globalTransform
	});
}
//#endregion
//#region ../../packages/edi-motion/src/visual/dom.ts
function M_(e, t) {
	let n = e.createElementNS("http://www.w3.org/2000/svg", t.tag);
	for (let [e, r] of Object.entries(t.attrs)) n.setAttribute(e, r);
	t.style && (n.style.transformBox = t.style.transformBox, n.style.transformOrigin = t.style.transformOrigin), t.text !== void 0 && (n.textContent = t.text);
	for (let r of t.children) n.append(M_(e, r));
	return n;
}
function N_(e, t) {
	if (t.tag !== "svg") throw Error("Descrição visual requer raiz SVG.");
	let n = Lg(e), r = t.attrs.viewBox;
	if (!r) throw Error("Descrição visual sem viewBox.");
	return () => {
		let i = t.children.map((t) => M_(e.ownerDocument, t)), a = [...e.childNodes], o = e.getAttribute("viewBox"), s = e.getAttribute("preserveAspectRatio"), c = a.filter((e) => e instanceof n.SVGElement && e.localName === "title");
		e.setAttribute("viewBox", r), s === null && t.attrs.preserveAspectRatio && e.setAttribute("preserveAspectRatio", t.attrs.preserveAspectRatio), e.replaceChildren(...c, ...i);
		let l = !1;
		return () => {
			l || (l = !0, e.replaceChildren(...a), o === null ? e.removeAttribute("viewBox") : e.setAttribute("viewBox", o), s === null ? e.removeAttribute("preserveAspectRatio") : e.setAttribute("preserveAspectRatio", s));
		};
	};
}
//#endregion
//#region ../../packages/edi-motion/src/visual/imageMeshDom.ts
function P_(e) {
	let t = /^(\d{1,2})x(\d{1,2})$/.exec(e.getAttribute("data-edi-mesh") ?? "");
	return t ? {
		columns: Number(t[1]),
		rows: Number(t[2])
	} : void 0;
}
function F_(e, t, n, r) {
	let i = [...e.children], a = P_(e);
	if (a?.columns !== t.columns || a.rows !== t.rows || i.length !== eh(t) || r.reduce((e, t) => e + t.points.length, 0) !== $m(t)) throw Error("SVG não corresponde à malha raster tipada.");
	return { paint(e) {
		let a = ah(t, n, (e ?? r).flatMap((e) => e.points));
		for (let [e, t] of a.entries()) {
			let n = `matrix(${t.join(" ")})`, r = i[e];
			r && r.getAttribute("transform") !== n && r.setAttribute("transform", n);
		}
	} };
}
//#endregion
//#region ../../packages/edi-motion/src/interactiveRuntime.ts
function I_(e, t, n, r, i, a, o, s, c) {
	let l = Lg(e), u = /* @__PURE__ */ new Map();
	for (let e of t.audio?.bindings ?? []) {
		let t = u.get(e.eventId) ?? [];
		t.push(e), u.set(e.eventId, t);
	}
	for (let n of x_(t)) if (!S_(e.ownerDocument.fonts, n)) throw Error("Documento requer fonte carregada; use createInteractiveSvgPlayerAsync.");
	if (t.layout && !n.layoutEngine) throw Error("Documento com layout requer layoutEngine ou createInteractiveSvgPlayerAsync.");
	let d = new Map(t.content.map((e) => [e.id, e])), f = new Map(t.playback.objects.map((e) => {
		let t = d.get(e.id);
		if (!t) throw Error("Conteúdo ausente.");
		return [e.id, {
			...e,
			tag: t.tag,
			semantics: t.semantics
		}];
	})), p = new Map(t.playback.sources.filter((e) => e.instancePath.length === 0).flatMap((e) => {
		let t = f.get(e.id);
		return t ? [[e.id, t]] : [];
	})), m = Wm(t.playback), h = Cp(t.playback, new Map(t.content.flatMap((e) => e.effects ? [[e.id, e.effects]] : [])), new Map(t.content.flatMap((e) => e.tag === "path" && e.visual?.attrs.d ? [[e.id, e.visual.attrs.d]] : [])), op(t.content.map((e) => ({
		...e,
		attrs: e.visual?.attrs
	})), new Map(t.content.flatMap((e) => e.effects ? [[e.id, e.effects]] : []))), Kf(t.content.map((e) => ({
		...e,
		parentId: e.parentId ?? null,
		attrs: e.visual?.attrs
	})), new Map(t.content.flatMap((e) => e.effects ? [[e.id, e.effects]] : [])), c)), g = ug(t.behavior, t.playback.motion.animations, f, {
		drivers: t.playback.drivers,
		authoredTargets: p,
		animationId: t.animationId,
		parameters: Gm(m)
	}), _ = new Map(t.version >= 7 ? t.content.filter((e) => e.fontAssetId).map((e) => [e.id, nu(s, e)]) : []), v = /* @__PURE__ */ new Map();
	function y(e, t, n) {
		let r = _.get(e);
		if (r) {
			if (v.get(e) !== t) Zh(t, r, n), v.set(e, t);
			else if (n.remaining -= t.length + 1, n.remaining < 0) throw Error("Texto excede orçamento compartilhado do frame.");
		}
	}
	for (let e of t.content) e.visual && y(e.id, e.visual.text, o);
	let b;
	function x(e, n) {
		let r = n ?? { remaining: 2e6 };
		for (let [t, n] of e.text) y(t, n, r);
		if (b && !b.hasViewport()) return {
			...e,
			rawVisibility: e.visibility,
			rigVisibility: /* @__PURE__ */ new Map(),
			geometry: /* @__PURE__ */ new Map(),
			rigDiagnostics: [],
			effects: [],
			vertices: 0
		};
		let i = Jm(m, e.poses, r, b?.transforms(), e.parameters), a = 0;
		for (let e of t.playback.objects) {
			if (--r.remaining < 0) throw Error("Geometria transitória excede orçamento de avaliação.");
			a += Zd(i.geometry.get(e.id) ?? e.geometry ?? []);
		}
		for (let [e, t] of i.geometry) e.includes("#") && (a += Zd(t));
		return {
			...e,
			poses: i.poses,
			geometry: i.geometry,
			vertices: a,
			visibility: new Map([...e.visibility, ...i.visibility]),
			rawVisibility: e.visibility,
			rigVisibility: i.visibility,
			rigDiagnostics: i.diagnostics,
			effects: wp(h, i.poses, i.geometry, b?.transforms(), r)
		};
	}
	let S = /* @__PURE__ */ new Map();
	function C(e) {
		let t = e;
		for (; t.ownerSVGElement;) t = t.ownerSVGElement;
		return t;
	}
	function w(t, n, r) {
		let i = t.firstElementChild, a = C(e).querySelector(`path[id="${gh(n)}"]`);
		if (t.children.length !== 1 || i?.localName !== "textPath" || i.getAttribute("href") !== `#${gh(n)}` || i.getAttribute("startOffset") !== `${r.startOffset}%` || !a || a.getAttribute("d") !== r.d) throw Error("SVG não corresponde ao texto em caminho tipado.");
		return i;
	}
	let T = /* @__PURE__ */ new Map(), E = /* @__PURE__ */ new Set();
	function D(e) {
		for (let t of e.components ?? []) {
			for (let e of t.document.content) E.add(e.id);
			D(t.document);
		}
	}
	D(t);
	for (let t of e.querySelectorAll("[data-edi-object]")) {
		let e = t.getAttribute("data-edi-object"), n = t.firstElementChild;
		if (e && E.has(e)) continue;
		if (!(t instanceof l.SVGGraphicsElement) || !(n instanceof l.SVGGraphicsElement) || !e || S.has(e) || n.localName !== (d.get(e)?.tag === "image" ? d.get(e)?.imageMesh ? "g" : "svg" : d.get(e)?.tag)) throw Error("SVG incompatível com o conteúdo interativo.");
		let r = d.get(e);
		if (!r) throw Error("Objeto interativo ausente.");
		if (r.fontAssetId && n.getAttribute("font-family") !== ru(tu(r).map((e) => ({ id: e })))) throw Error("SVG não corresponde à referência tipada da fonte.");
		for (let [e, t] of Object.entries(Rf(r.gradients))) if (n.getAttribute(e) !== t) throw Error("Pintura SVG não corresponde ao gradiente tipado.");
		if (n.getAttribute("filter") !== (ap(r.filter).filter ?? null)) throw Error("SVG não corresponde ao filtro tipado.");
		let i = hp(n), a = pp(r.paintLayers);
		if (i.length !== a.length || a.some((e, t) => i[t]?.getAttribute("data-edi-paint-layer") !== e.id || Object.entries(dp(e)).some(([e, n]) => i[t]?.getAttribute(e) !== n))) throw Error("SVG não corresponde às camadas de pintura tipadas.");
		if (r.tag === "image" && (n.getAttribute("data-edi-image") !== r.assetId || !r.imageSlice && !r.imageMesh && (n.children.length !== 1 || n.firstElementChild?.localName !== "use" || n.firstElementChild.getAttribute("href") !== `#edi-${r.assetId}`))) throw Error("SVG não corresponde à referência tipada da imagem.");
		if (r.imageSlice) {
			if (!(n instanceof l.SVGSVGElement)) throw Error("Nine-slice requer viewport SVG.");
			Qh(n, r.imageSlice).destroy();
		}
		if (r.imageMesh) {
			let t = r.assetId ? s.get(r.assetId) : void 0;
			if (t?.kind !== "image" || !r.visual) throw Error("Malha raster requer recurso de imagem e conteúdo visual.");
			T.set(e, F_(n, r.imageMesh, t, nh(r.imageMesh, r.visual.attrs)));
		}
		S.set(e, {
			wrapper: t,
			shape: n,
			baseDisplay: t.getAttribute("display"),
			baseFill: n.getAttribute("fill"),
			baseStroke: n.getAttribute("stroke"),
			baseD: n.localName === "path" ? n.getAttribute("d") : void 0,
			layerIds: a.map((e) => e.id),
			x: n.getAttribute("x") ?? "0",
			lineHeight: r.lineHeight,
			autoDirection: r.textDirection === "auto",
			textTarget: r.visual?.textPath ? w(n, e, r.visual.textPath) : n,
			baseLabel: t.getAttribute("aria-label"),
			description: t.querySelector(":scope > desc"),
			baseDescription: t.querySelector(":scope > desc")?.textContent ?? null
		});
	}
	if (S.size !== f.size) throw Error("SVG interativo incompleto.");
	let O, k = Ig(new Map([...S].map(([e, t]) => [e, t.wrapper])), cg([...t.playback.motion.animations, ...t.playback.drivers.map((e) => e.animation)])), A = gg(g, n.machineId), j = x(Mg(g, A), o), M = !1, ee = !1, N = 0, te = /* @__PURE__ */ new Set(), ne = /* @__PURE__ */ new Set(), re = /* @__PURE__ */ new Set(), ie = /* @__PURE__ */ new Set(), P = /* @__PURE__ */ new Map();
	n.onEvent && te.add(n.onEvent);
	let F = () => {
		if (M) throw Error("O player foi encerrado.");
	}, ae = () => {
		if (F(), r.assertWritable(), ee) throw Error("Não altere inputs/sessão durante um callback; agende a escrita após sua conclusão.");
	};
	function I(e) {
		ee = !0;
		try {
			r.notify(e);
		} finally {
			ee = !1;
		}
	}
	function oe(e) {
		M || I(() => {
			for (let t of e) for (let e of [...te]) {
				if (M) return;
				e(t);
			}
		});
	}
	function L(e) {
		if (ae(), Object.keys(e).length > 100) throw Error("Orçamento de inputs por escrita excedido.");
		let t = A;
		for (let [n, r] of Object.entries(e)) t = bg(g, t, n, r);
		if (t === A) return;
		let n = Ng(g, t, 0);
		le(n.session, x(n.frame)), R.invalidate(), oe(n.events);
	}
	let se = [...S].reduce((e, [t, n]) => e + (n.lineHeight !== void 0 && !g.behavior.bindings.some((e) => e.kind === "text" && e.targetId === t) ? Math.max(1, n.shape.childElementCount) : 0), 0);
	function ce(e) {
		let t = se;
		for (let [n, r] of e.text) {
			let e = S.get(n);
			if (!e) throw Error("Destino textual ausente.");
			if (e.lineHeight !== void 0) {
				let e = r.replace(/\r\n?/g, "\n").split("\n").length;
				if (t += e, e > 200 || t > 2e3) throw Error("Texto dinâmico excede o orçamento de linhas.");
			}
		}
		if (t > 2e3) throw Error("Texto excede o orçamento agregado de linhas.");
		return t;
	}
	function le(e, t = x(Mg(g, e)), a = !1) {
		let o = ce(t);
		a || r.validateFrame(i, o, t.vertices);
		let s = A;
		A = e, j = t;
		let c = s.data !== A.data || s.dataInstanceId !== A.dataInstanceId;
		c && N++;
		let l = () => {
			M || (I(() => {
				if (c) for (let e of [...re]) {
					if (M) return;
					e();
				}
				for (let [e, t] of A.inputs) if (s.inputs.get(e) !== t) for (let n of [...ne]) {
					if (M) return;
					n(e, t);
				}
			}), !M && (s.machineId !== A.machineId || [...A.layers].some(([e, t]) => s.layers.get(e)?.stateId !== t.stateId || s.layers.get(e)?.blend?.transitionId !== t.blend?.transitionId)) && I(() => {
				let e = pe();
				n.onStateChange?.(e);
				for (let t of [...ie]) {
					if (M) return;
					t(e);
				}
			}));
		};
		return a || l(), l;
	}
	let ue = j, de = /* @__PURE__ */ new Map([[A.machineId, ue]]);
	ce(j);
	let R, fe;
	function pe() {
		return {
			machineId: A.machineId,
			time: A.seconds,
			layers: [...A.layers].map(([e, t]) => ({
				id: e,
				stateId: t.stateId,
				time: t.seconds,
				transitionId: t.blend?.transitionId ?? null
			}))
		};
	}
	function me(t, n) {
		let a = b?.transforms();
		if ((m.length || h.references.length) && a !== fe) {
			let e = x(Mg(g, A), n);
			r.validateFrame(i, ce(e), e.vertices), j = e, fe = a, de.clear();
		}
		let o = j;
		if (t) {
			let e = de.get(A.machineId);
			e || (e = x(Mg(g, gg(g, A.machineId)), n), de.set(A.machineId, e)), o = {
				...e,
				text: j.text,
				semantics: j.semantics,
				colors: j.colors,
				visibility: new Map([...j.rawVisibility, ...e.rigVisibility])
			};
		}
		for (let [t, n] of S) {
			let r = o.poses.get(t);
			if (!r) throw Error("Pose interativa ausente.");
			let i = du(r), a = String(r.opacity / 100), s = o.visibility.get(t), c = o.text.get(t), l = o.colors.get(t), u = o.geometry.get(t), d = T.get(t), f = o.semantics.get(t), p = d ? void 0 : u ? ef(u) : n.baseD, m = _p(o.geometry, t), h = p === void 0 ? [] : n.layerIds.map(m), g = JSON.stringify([
				i,
				a,
				s,
				c,
				l,
				p,
				h,
				d ? u && ef(u) : void 0,
				f
			]);
			if (P.get(t) === g) continue;
			d?.paint(u);
			let _ = f?.label ?? n.baseLabel;
			_ !== null && n.wrapper.getAttribute("aria-label") !== _ && n.wrapper.setAttribute("aria-label", _);
			let v = f?.description ?? n.baseDescription;
			if (n.description && v !== null && n.description.textContent !== v && (n.description.textContent = v), n.wrapper.setAttribute("transform", i), n.wrapper.setAttribute("opacity", a), s === void 0 ? n.baseDisplay === null ? n.wrapper.removeAttribute("display") : n.wrapper.setAttribute("display", n.baseDisplay) : n.wrapper.setAttribute("display", s ? "inline" : "none"), p !== void 0) {
				if (n.shape.localName !== "path") throw Error("Deformação requer caminho SVG.");
				vp(n.shape, p, m);
			}
			c !== void 0 && (b?.invalidateGeometry(), n.autoDirection && n.shape.setAttribute("direction", mh(c)), n.lineHeight === void 0 ? n.textTarget.textContent = c : n.shape.replaceChildren(...c.replace(/\r\n?/g, "\n").split("\n").map((t, r) => {
				let i = e.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "tspan");
				return i.setAttribute("x", n.x), i.setAttribute("dy", `${r ? n.lineHeight : 0}em`), i.textContent = t || "\xA0", i;
			})));
			for (let [e, t] of [["fill", l?.fill ?? n.baseFill], ["stroke", l?.stroke ?? n.baseStroke]]) t === null ? n.shape.hasAttribute(e) && n.shape.removeAttribute(e) : n.shape.getAttribute(e) !== t && n.shape.setAttribute(e, t);
			P.set(t, g);
		}
		k.paint(o.orders), b?.paint(t), O?.paint(o.effects);
	}
	t.layout && n.layoutEngine && (b = Xg(e, t, n.layoutEngine, S, {
		changed() {
			R?.invalidate();
		},
		error(e) {
			R?.fail(e);
		},
		...i.length ? { viewport: () => ({
			width: e.width.baseVal.value,
			height: e.height.baseVal.value
		}) } : {}
	}));
	try {
		O = Ug(e, new Map([...S].map(([e, t]) => [e, t.wrapper])), wp(h, /* @__PURE__ */ new Map())), R = r.register(i, a, {
			paint: me,
			prepareAdvance(e, t, n) {
				if (!Number.isFinite(e) || e < 0 || e > 10) throw Error("Avanço efetivo do componente excede 10 segundos.");
				let r = t ? Ng(g, A, e) : void 0, i = r ? x(r.frame, n) : j, a = ce(i), o = t && (g.behavior.machines.length > 0 || !g.animation && !!g.drivers?.length || !!g.animation && (g.animation.mode !== "once" || (r?.session.seconds ?? A.seconds) < g.animation.frames / g.animation.fps));
				return {
					audioCues: r?.events.reduce((e, t) => e + (u.get(t.eventId)?.length ?? 0), 0) ?? 0,
					events: r?.events.length ?? 0,
					lines: a,
					vertices: i.vertices,
					continuing: o,
					commit() {
						let t = r ? le(r.session, i, !0) : () => {};
						return b?.advance(e), () => {
							t(), r && oe(r.events);
						};
					}
				};
			},
			prepareReset(e) {
				let t = gg(g, A.machineId), n = x(Mg(g, t), e);
				return {
					events: 0,
					lines: ce(n),
					vertices: n.vertices,
					continuing: !1,
					commit() {
						let e = le(t, n, !0);
						return b?.resetScroll(), P.clear(), e;
					}
				};
			},
			hasActivity: () => b?.moving() ?? !1
		}, {
			...n,
			autoplay: !0
		});
	} catch (e) {
		throw O?.destroy(), k.destroy(), b?.destroy(), e;
	}
	let he = new AbortController(), ge = [];
	function _e(t, n) {
		let r = e.getScreenCTM();
		if (!r) throw Error("Coordenadas do artboard indisponíveis.");
		let i = n.getBoundingClientRect(), a = t instanceof l.KeyboardEvent, o = new l.DOMPoint(a ? i.x + i.width / 2 : t.clientX, a ? i.y + i.height / 2 : t.clientY).matrixTransform(r.inverse()), s = e.viewBox.baseVal;
		return {
			x: o.x,
			y: o.y,
			viewBox: [
				s.x,
				s.y,
				s.width,
				s.height
			]
		};
	}
	function ve(e, t, n, r, i = _e(n, r)) {
		F();
		let a = Fg(g, A, e, t, i), o = Ng(g, a, 0);
		le(o.session, x(o.frame)), oe(o.events), R.invalidate();
	}
	let ye = new Set(g.behavior.listeners.map((e) => e.targetId));
	for (let t of ye) {
		let n = t === null ? e : S.get(t)?.wrapper;
		if (!n) throw R.destroy(), b?.destroy(), Error("Destino de listener ausente.");
		let r = g.behavior.listeners.filter((e) => e.targetId === t), i = r.some((e) => e.event === "activate"), a = r.some((e) => e.event === "enter" || e.event === "leave"), o = r.some((e) => e.event === "move"), s = new Map([
			"tabindex",
			"role",
			"aria-label"
		].map((e) => [e, n.getAttribute(e)]));
		(i || a || o) && (n.setAttribute("tabindex", "0"), i && n.setAttribute("role", "button"), n.hasAttribute("aria-label") || n.setAttribute("aria-label", t === null ? "Artboard interativo" : d.get(t)?.name ?? "Objeto interativo")), ge.push(() => {
			for (let [e, t] of s) t === null ? n.removeAttribute(e) : n.setAttribute(e, t);
		});
		let c = he.signal;
		if (o) {
			let e;
			n.addEventListener("keydown", (r) => {
				if (r.target !== n || ![
					"ArrowLeft",
					"ArrowRight",
					"ArrowUp",
					"ArrowDown"
				].includes(r.key)) return;
				r.preventDefault();
				let i = e ?? _e(r, n), a = r.shiftKey ? .1 : .01;
				e = {
					...i,
					x: Math.max(i.viewBox[0], Math.min(i.viewBox[0] + i.viewBox[2], i.x + (r.key === "ArrowLeft" ? -1 : +(r.key === "ArrowRight")) * i.viewBox[2] * a)),
					y: Math.max(i.viewBox[1], Math.min(i.viewBox[1] + i.viewBox[3], i.y + (r.key === "ArrowUp" ? -1 : +(r.key === "ArrowDown")) * i.viewBox[3] * a))
				}, ve("move", t, r, n, e);
			}, { signal: c }), n.addEventListener("pointermove", (t) => {
				e = _e(t, n);
			}, { signal: c });
		}
		r.some((e) => e.event === "enter") && (n.addEventListener("pointerenter", (e) => ve("enter", t, e, n), { signal: c }), n.addEventListener("focus", () => {
			let e = new l.KeyboardEvent("keydown");
			ve("enter", t, e, n);
		}, { signal: c })), r.some((e) => e.event === "leave") && (n.addEventListener("pointerleave", (e) => ve("leave", t, e, n), { signal: c }), n.addEventListener("blur", () => {
			let e = new l.KeyboardEvent("keydown");
			ve("leave", t, e, n);
		}, { signal: c })), r.some((e) => e.event === "move") && n.addEventListener("pointermove", (e) => ve("move", t, e, n), { signal: c }), i && (n.addEventListener("click", (e) => ve("activate", t, e, n), { signal: c }), n.addEventListener("keydown", (e) => {
			(e.key === "Enter" || e.key === " ") && !e.repeat && e.target === n && (e.preventDefault(), ve("activate", t, e, n));
		}, { signal: c }));
	}
	return {
		get playing() {
			return R.playing;
		},
		get time() {
			return A.seconds;
		},
		get dataVersion() {
			return F(), N;
		},
		play() {
			F(), R.play();
		},
		pause() {
			F(), R.pause();
		},
		setPolicy(e) {
			F(), R.setPolicy(e);
		},
		getInput(e) {
			if (F(), !A.inputs.has(e)) throw Error("Input não encontrado.");
			return A.inputs.get(e);
		},
		setInput(e, t) {
			L({ [e]: t });
		},
		setInputs(e) {
			L(e);
		},
		getData(e, t) {
			if (F(), !g.data || !A.data) throw Error("Player sem modelos de dados.");
			let n = e ?? A.dataInstanceId;
			if (!n) throw Error("Prancheta sem instância de dados ligada.");
			let r = t ? Uu(g.data, A.data, n, t).value : A.data.get(n);
			if (r === void 0) throw Error("Instância de dados ausente.");
			return structuredClone(r);
		},
		getDataInstance() {
			return F(), A.dataInstanceId ?? null;
		},
		bindDataInstance(e) {
			ae();
			let t = Ng(g, yg(g, A, e), 0);
			le(t.session, x(t.frame)), R.invalidate(), oe(t.events);
		},
		editData(e) {
			ae();
			let t = Ng(g, vg(g, A, e), 0);
			le(t.session, x(t.frame)), R.invalidate(), oe(t.events);
		},
		trigger(e) {
			ae();
			let t = Ng(g, xg(g, A, e), 0);
			le(t.session, x(t.frame)), R.invalidate(), oe(t.events);
		},
		writeBinding(e, t) {
			ae();
			let n = Ng(g, Pg(g, A, e, t), 0);
			le(n.session, x(n.frame)), R.invalidate(), oe(n.events);
		},
		reset() {
			ae(), r.reset(i);
		},
		setMachine(e) {
			ae();
			let t = gg(g, e);
			t.inputs = new Map(A.inputs), A.data && (t.data = A.data), A.dataInstanceId && (t.dataInstanceId = A.dataInstanceId), le(t), P.clear(), R.invalidate();
		},
		inspect() {
			return F(), {
				machineId: A.machineId,
				time: A.seconds,
				layers: [...A.layers].map(([e, t]) => ({
					id: e,
					stateId: t.stateId,
					time: t.seconds,
					transitionId: t.blend?.transitionId ?? null
				}))
			};
		},
		inspectLayout() {
			return F(), b?.inspect() ?? null;
		},
		inspectRig() {
			return F(), structuredClone(j.rigDiagnostics);
		},
		getScroll(e) {
			if (F(), !b) throw Error("Player sem layout.");
			return b.getScroll(e);
		},
		onEvent(e) {
			if (F(), te.size >= 1e3) throw Error("Limite de assinantes de eventos.");
			return te.add(e), () => {
				te.delete(e);
			};
		},
		onInputChange(e) {
			if (F(), ne.size >= 1e3) throw Error("Limite de observadores de inputs.");
			return ne.add(e), () => {
				ne.delete(e);
			};
		},
		onDataChange(e) {
			if (F(), re.size >= 1e3) throw Error("Limite de assinantes de dados.");
			return re.add(e), () => {
				re.delete(e);
			};
		},
		onStateChange(e) {
			if (F(), ie.size >= 1e3) throw Error("Limite de assinantes de estados.");
			return ie.add(e), () => {
				ie.delete(e);
			};
		},
		advance(e) {
			ae(), r.advance(i, e);
		},
		destroy() {
			if (!M) {
				M = !0, R.destroy(), he.abort(), O?.destroy(), k.destroy();
				for (let e of ge) e();
				b?.destroy(), te.clear(), ne.clear(), re.clear(), ie.clear(), P.clear();
			}
		}
	};
}
function L_(e, t, n, r, i) {
	let a = Ah(t), o = w_(), s = Lg(e);
	Vg(e, a);
	let c = eg(Wg(a), {
		onError: n.onError,
		context: n.audioContext,
		view: s
	}), l = /* @__PURE__ */ new Set(), u = /* @__PURE__ */ new Set(), d = c.onChange((e) => {
		n.onAudioStateChange?.({ ...e });
		for (let t of u) t({ ...e });
	}), f = new Map(a.assets?.map((e) => [e.id, e]) ?? []), p = /* @__PURE__ */ new Map(), m = [...r ? [() => r.destroy()] : [], ...i ? [i] : []], h = !1, g, _ = !1, v = { remaining: 2e6 }, y = (e) => {
		let t = e instanceof Error ? e : /* @__PURE__ */ Error("Falha ao encerrar áudio.");
		n.onError ? n.onError(t) : queueMicrotask(() => {
			throw t;
		});
	};
	function b() {
		if (g) return g;
		let e = [], t = {
			...c.inspect(),
			enabled: !1,
			activeVoices: 0,
			destroyed: !0,
			contextState: c.inspect().contextState === "not-created" ? "not-created" : "closing"
		};
		g = c.destroy().then(() => {
			if (e.length) throw AggregateError(e, "Falha ao encerrar cena/áudio.");
		}, (t) => {
			throw AggregateError([...e, t], "Falha ao encerrar cena/áudio.");
		}), d(), l.clear(), o.notify(() => {
			for (let r of [n.onAudioStateChange, ...u]) if (r) try {
				r({ ...t });
			} catch (t) {
				e.push(t);
			}
		}), u.clear();
		for (let t of m.reverse()) try {
			t();
		} catch (t) {
			e.push(t);
		}
		m.length = 0;
		try {
			o.destroy();
		} catch (t) {
			e.push(t);
		}
		return g;
	}
	function x(e, t, r, i, a = {}) {
		h ||= !!t.behavior.machines.length || !!t.playback.drivers.length || !!t.animationId;
		let u = I_(e, t, {
			...n,
			onEvent(e) {
				for (let a of t.audio?.bindings ?? []) if (a.eventId === e.eventId) {
					if (c.inspect().destroyed) return;
					let t = {
						bindingId: a.id,
						eventId: e.eventId,
						assetId: a.assetId,
						caption: a.caption,
						instancePath: [...r]
					};
					c.play(a.assetId, a.volume, Math.max(0, u.time - e.time) / i, r), n.onAudioCue?.({
						...t,
						instancePath: [...r]
					});
					for (let e of l) {
						if (c.inspect().destroyed) return;
						e({
							...t,
							instancePath: [...r]
						});
					}
				}
				c.inspect().destroyed || n.onEvent?.(r.length ? {
					...e,
					instancePath: [...r]
				} : e);
			},
			...r.length ? {
				machineId: void 0,
				onStateChange: void 0,
				onPlaybackChange: void 0
			} : {}
		}, o, r, i, v, f, a);
		p.set(JSON.stringify(r), u), m.push(() => u.destroy());
		for (let n of t.components ?? []) {
			let o = [...e.querySelectorAll("[data-edi-object]")].find((e) => e.getAttribute("data-edi-object") === n.rootId)?.firstElementChild;
			if (!(o instanceof s.SVGSVGElement)) throw Error("Viewport interativo de componente ausente.");
			x(o, n.document, [...r, ...n.instancePath], i * n.speed, Wf(t.content.map((e) => ({
				...e,
				parentId: e.parentId ?? null,
				attrs: e.visual?.attrs
			})), n.rootId, a));
		}
		return u;
	}
	try {
		let t = x(e, a, [], 1);
		return o.start(e, {
			...n,
			autoplay: n.autoplay ?? h,
			onActivityChange(e) {
				!e && !c.inspect().destroyed && c.stop(), n.onActivityChange?.(e);
			}
		}), {
			...t,
			enableAudio() {
				return t.inspect(), c.enable();
			},
			disableAudio() {
				t.inspect(), c.disable();
			},
			setAudioVolume(e) {
				t.inspect(), c.setVolume(e);
			},
			inspectAudio() {
				return t.inspect(), c.inspect();
			},
			onAudioCue(e) {
				if (t.inspect(), l.size >= 1e3) throw Error("Limite de observadores de áudio.");
				return l.add(e), () => {
					l.delete(e);
				};
			},
			onAudioStateChange(e) {
				if (t.inspect(), u.size >= 1e3) throw Error("Limite de observadores de estado de áudio.");
				return u.add(e), () => {
					u.delete(e);
				};
			},
			get playing() {
				return t.playing;
			},
			get time() {
				return t.time;
			},
			get dataVersion() {
				return t.dataVersion;
			},
			getComponent(e) {
				t.inspect();
				let n = p.get(JSON.stringify(e));
				if (!n || !e.length) throw Error("Instância interativa não encontrada.");
				let { destroy: r, ...i } = n, a = [...e];
				return {
					...i,
					pause() {
						c.stop(a), n.pause();
					},
					reset() {
						c.stop(a), n.reset();
					},
					get playing() {
						return n.playing;
					},
					get time() {
						return n.time;
					},
					get dataVersion() {
						return n.dataVersion;
					}
				};
			},
			onEvent(e) {
				let t = [];
				try {
					for (let [n, r] of p) t.push(r.onEvent((t) => e({
						...t,
						instancePath: JSON.parse(n)
					})));
				} catch (e) {
					for (let e of t) e();
					throw e;
				}
				return () => {
					for (let e of t) e();
				};
			},
			reset() {
				c.stop(), t.reset();
			},
			destroy() {
				_ || (_ = !0, b().catch(y));
			},
			destroyAsync() {
				return _ = !0, b();
			}
		};
	} catch (e) {
		throw _ = !0, b().catch(y), e;
	}
}
var R_ = /* @__PURE__ */ new WeakMap();
async function z_(e, t, n = {}, r) {
	if (r?.throwIfAborted(), R_.has(e)) throw Error("SVG já possui uma montagem visual ativa ou pendente.");
	let i = {}, a = () => {
		R_.get(e) === i && R_.delete(e);
	};
	R_.set(e, i);
	try {
		let i = Ah(t), o = N_(e, j_(i));
		return await B_(e, i, n, r, () => {
			let e = o();
			return () => {
				try {
					e();
				} finally {
					a();
				}
			};
		});
	} catch (e) {
		throw a(), e;
	}
}
async function B_(e, t, n, r, i) {
	if (r?.aborted) throw r.reason;
	let a = t.assets ? await Lh(t.assets, r, e.ownerDocument.fonts) : void 0, o;
	try {
		await C_(e, t, r);
		let s = (e) => !!e.layout || !!e.components?.some((e) => s(e.document)), c = s(t) && !n.layoutEngine ? await b_() : n.layoutEngine;
		if (r?.aborted) throw r.reason;
		return o = i?.(), L_(e, t, {
			...n,
			layoutEngine: c
		}, a, o);
	} catch (e) {
		throw o?.(), a?.destroy(), e;
	}
}
//#endregion
//#region ../../packages/edi-motion/src/webPlayerData.ts
function V_(e) {
	return Fh(e);
}
function H_(e) {
	let t = Ph(e), n = t.document.visual?.viewBox;
	if (!n) throw Error("A animação não tem dimensão visual.");
	return {
		title: t.title,
		version: t.version,
		viewBox: [...n],
		fit: t.fit,
		autoplay: t.autoplay,
		respectReducedMotion: t.respectReducedMotion,
		pauseOffscreen: t.pauseOffscreen,
		inputs: Mh(t).inputs.map(({ name: e, kind: t }) => ({
			name: e,
			kind: t
		})),
		machines: t.document.behavior.machines.map(({ name: e }) => e),
		events: Mh(t).events,
		...t.poster ? { poster: {
			dataUri: Ql(t.poster),
			width: t.poster.width,
			height: t.poster.height,
			bytes: t.poster.byteLength
		} } : {}
	};
}
function U_(e) {
	let t = Ph(e).poster;
	return t ? {
		bytes: Yl(t.data),
		width: t.width,
		height: t.height,
		mime: "image/png"
	} : null;
}
//#endregion
//#region ../../packages/edi-motion/src/webPlayer.ts
async function W_(e, t, n = {}) {
	n.signal?.throwIfAborted();
	let r = Ph(t), i = new Map(r.document.behavior.inputs.map((e) => [e.name, e])), a = new Map(r.document.behavior.machines.map((e) => [e.name, e])), o = !0, s;
	function c() {
		if (!o || !s) throw Error("A animação foi encerrada.");
		return s;
	}
	function l(e) {
		let t = i.get(e);
		if (!t) throw Error(`Controle não encontrado na animação: ${e}`);
		return t;
	}
	function u(e) {
		let t = r.document.behavior.machines.find((t) => t.id === e.machineId);
		return {
			machine: t?.name ?? null,
			time: e.time,
			playing: s?.playing ?? !1,
			layers: e.layers.map((e) => {
				let n = t?.layers.find((t) => t.id === e.id);
				return {
					name: n?.name ?? e.id,
					state: n?.states.find((t) => t.id === e.stateId)?.name ?? e.stateId,
					time: e.time
				};
			})
		};
	}
	s = await z_(e, r.document, {
		autoplay: n.autoplay ?? r.autoplay,
		respectReducedMotion: n.respectReducedMotion ?? r.respectReducedMotion,
		pauseOffscreen: n.pauseOffscreen ?? r.pauseOffscreen,
		onEvent: (e) => {
			o && n.onEvent?.({
				name: e.name,
				data: e.data,
				direction: e.direction,
				time: e.time,
				instancePath: e.instancePath ?? []
			});
		},
		onStateChange: (e) => {
			o && s && n.onStateChange?.(u(e));
		},
		onError: (e) => {
			o && n.onError?.(e);
		}
	}, n.signal);
	let d = s;
	e.setAttribute("preserveAspectRatio", r.fit === "stretch" ? "none" : r.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet");
	let f;
	function p() {
		return f ||= (o = !1, n.signal?.removeEventListener("abort", m), d.destroyAsync()), f;
	}
	function m() {
		p().catch((e) => n.onError?.(e));
	}
	return n.signal?.aborted && (await p(), n.signal.throwIfAborted()), n.signal?.addEventListener("abort", m, { once: !0 }), {
		get playing() {
			return c().playing;
		},
		play() {
			c().play();
		},
		pause() {
			c().pause();
		},
		reset() {
			c().reset();
		},
		setInput(e, t) {
			c().setInput(l(e).id, t);
		},
		setInputs(e) {
			c().setInputs(Object.fromEntries(Object.entries(e).map(([e, t]) => [l(e).id, t])));
		},
		getInput(e) {
			return c().getInput(l(e).id);
		},
		trigger(e) {
			c().trigger(l(e).id);
		},
		setMachine(e) {
			let t = a.get(e);
			if (!t) throw Error(`Máquina não encontrada na animação: ${e}`);
			c().setMachine(t.id);
		},
		setPolicy(e) {
			c().setPolicy(e);
		},
		advance(e) {
			c().advance(e);
		},
		inspect() {
			return u(c().inspect());
		},
		destroy: p
	};
}
//#endregion
export { W_ as mountWebAnimation, V_ as normalizeWebAnimation, H_ as readWebAnimation, U_ as webAnimationPoster };
