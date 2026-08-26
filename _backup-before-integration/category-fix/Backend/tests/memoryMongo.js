/* eslint-disable */
/**
 * DEV-ONLY in-memory stand-in for MongoDB.
 *
 * This file exists purely so the test suite can run on a machine with no
 * mongod available. It patches the Mongoose Model statics with an
 * in-memory store while keeping the real schemas, real validation, real
 * documents and real middleware. It is never loaded by the server.
 */
const mongoose = require('mongoose');

const stores = new Map(); // modelName -> Map<idString, plainDoc>

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function getStore(name) {
  if (!stores.has(name)) stores.set(name, new Map());
  return stores.get(name);
}

// ── tiny query engine ─────────────────────────────────────
function getPath(obj, pathStr) {
  return pathStr.split('.').reduce((acc, k) => (acc === undefined || acc === null ? acc : acc[k]), obj);
}

function toComparable(v) {
  if (v instanceof Date) return v.getTime();
  if (v && typeof v === 'object' && v._bsontype === 'ObjectId') return String(v);
  if (v && typeof v === 'object' && v.toHexString) return v.toHexString();
  return v;
}

function eq(a, b) {
  const ca = toComparable(a);
  const cb = toComparable(b);
  if (ca instanceof Object || cb instanceof Object) return JSON.stringify(ca) === JSON.stringify(cb);
  return String(ca) === String(cb);
}

function matchValue(value, cond) {
  if (cond instanceof RegExp) return cond.test(String(value ?? ''));

  if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
    const ops = Object.keys(cond);
    if (ops.some((k) => k.startsWith('$'))) {
      return ops.every((op) => {
        const target = cond[op];
        switch (op) {
          case '$in':
            return target.some((t) => eq(value, t));
          case '$nin':
            return !target.some((t) => eq(value, t));
          case '$ne':
            return !eq(value, target);
          case '$gte':
            return toComparable(value) >= toComparable(target);
          case '$gt':
            return toComparable(value) > toComparable(target);
          case '$lte':
            return toComparable(value) <= toComparable(target);
          case '$lt':
            return toComparable(value) < toComparable(target);
          case '$exists':
            return (value !== undefined && value !== null) === Boolean(target);
          case '$type':
            return target === 'string' ? typeof value === 'string' : true;
          case '$regex': {
            const rx = target instanceof RegExp ? target : new RegExp(target, cond.$options || '');
            return rx.test(String(value ?? ''));
          }
          case '$options':
            return true;
          default:
            return false;
        }
      });
    }
  }
  return eq(value, cond);
}

function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some((sub) => matches(doc, sub));
    if (key === '$and') return cond.every((sub) => matches(doc, sub));
    if (key === '$nor') return !cond.some((sub) => matches(doc, sub));
    return matchValue(getPath(doc, key), cond);
  });
}

function applySort(docs, sort) {
  if (!sort) return docs;
  const keys = Object.entries(sort);
  return [...docs].sort((a, b) => {
    for (const [key, dir] of keys) {
      const av = toComparable(getPath(a, key));
      const bv = toComparable(getPath(b, key));
      if (av === bv) continue;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      return (av < bv ? -1 : 1) * (dir === -1 || dir === 'desc' ? -1 : 1);
    }
    return 0;
  });
}

function applyUpdate(doc, update) {
  const out = { ...doc };
  for (const [op, payload] of Object.entries(update)) {
    if (op === '$set') Object.assign(out, payload);
    else if (op === '$setOnInsert') {
      /* handled by caller */
    } else if (op === '$inc') {
      for (const [k, delta] of Object.entries(payload)) out[k] = (Number(out[k]) || 0) + delta;
    } else if (!op.startsWith('$')) out[op] = payload;
  }
  return out;
}

// ── thenable query wrapper ────────────────────────────────
class Q {
  constructor(runner) {
    this._runner = runner;
    this._sort = null;
    this._skip = 0;
    this._limit = 0;
    this._select = null;
  }
  sort(s) { this._sort = s; return this; }
  skip(n) { this._skip = n; return this; }
  limit(n) { this._limit = n; return this; }
  select() { return this; }
  lean() { this._lean = true; return this; }
  populate() { return this; }
  exec() { return this._runner(this); }
  then(res, rej) { return this.exec().then(res, rej); }
  catch(rej) { return this.exec().catch(rej); }
}

function uniqueKeysOf(Model) {
  const keys = [];
  Model.schema.eachPath((p, type) => {
    if (type.options?.unique) keys.push({ fields: [p], partial: null });
  });
  for (const idx of Model.schema.indexes()) {
    const [fields, opts] = idx;
    if (opts?.unique) keys.push({ fields: Object.keys(fields), partial: opts.partialFilterExpression || null });
  }
  return keys;
}

async function assertUnique(Model, store, plain, selfId) {
  for (const { fields, partial } of uniqueKeysOf(Model)) {
    if (fields.some((f) => getPath(plain, f) === undefined || getPath(plain, f) === null)) continue;
    if (partial && !matches(plain, partial)) continue;

    for (const [id, other] of store) {
      if (id === String(selfId)) continue;
      if (fields.every((f) => eq(getPath(other, f), getPath(plain, f)))) {
        const err = new Error('E11000 duplicate key error');
        err.code = 11000;
        err.keyValue = Object.fromEntries(fields.map((f) => [f, getPath(plain, f)]));
        throw err;
      }
    }
  }
}

function install() {
  const originalModel = mongoose.model.bind(mongoose);

  const patch = (Model) => {
    if (Model.__memPatched) return Model;
    Model.__memPatched = true;
    const store = getStore(Model.modelName);

    const hydrate = (plain) => {
      const doc = Model.hydrate(clone(plain));
      doc.$__.saveOptions = {};
      doc.save = async function save() {
        const obj = this.toObject({ depopulate: true, flattenObjectIds: false });
        await this.validate();
        obj.updatedAt = new Date();
        if (!obj.createdAt) obj.createdAt = new Date();
        await assertUnique(Model, store, JSON.parse(JSON.stringify(obj)), this._id);
        store.set(String(this._id), JSON.parse(JSON.stringify(obj)));
        return this;
      };
      doc.deleteOne = async function deleteOne() {
        store.delete(String(this._id));
        return { deletedCount: 1 };
      };
      return doc;
    };

    Model.find = (filter = {}) =>
      new Q(async (q) => {
        let docs = [...store.values()].filter((d) => matches(d, filter));
        docs = applySort(docs, q._sort);
        if (q._skip) docs = docs.slice(q._skip);
        if (q._limit) docs = docs.slice(0, q._limit);
        return docs.map(hydrate);
      });

    Model.findOne = (filter = {}) =>
      new Q(async (q) => {
        let docs = [...store.values()].filter((d) => matches(d, filter));
        docs = applySort(docs, q._sort);
        return docs.length ? hydrate(docs[0]) : null;
      });

    Model.findById = (id) => Model.findOne({ _id: String(id) });

    Model.countDocuments = (filter = {}) =>
      new Q(async () => [...store.values()].filter((d) => matches(d, filter)).length);

    Model.create = async function create(payload) {
      if (Array.isArray(payload)) return Promise.all(payload.map((p) => Model.create(p)));
      const doc = new Model(payload);
      await doc.validate();
      const obj = doc.toObject({ depopulate: true });
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
      const plain = JSON.parse(JSON.stringify(obj));
      await assertUnique(Model, store, plain, doc._id);
      store.set(String(doc._id), plain);
      return hydrate(plain);
    };

    Model.findOneAndUpdate = (filter, update, options = {}) =>
      new Q(async () => {
        const found = [...store.values()].find((d) => matches(d, filter));
        if (!found) {
          if (!options.upsert) return null;
          const seed = { ...(update.$setOnInsert || {}) };
          for (const [k, v] of Object.entries(filter)) {
            if (typeof v !== 'object') seed[k] = v;
          }
          const base = new Model(seed).toObject({ depopulate: true });
          const created = applyUpdate(JSON.parse(JSON.stringify(base)), update);
          created.createdAt = new Date();
          created.updatedAt = new Date();
          await assertUnique(Model, store, created, created._id);
          store.set(String(created._id), created);
          return hydrate(created);
        }
        const updated = applyUpdate(found, update);
        updated.updatedAt = new Date();
        store.set(String(found._id), updated);
        return hydrate(options.new === false ? found : updated);
      });

    Model.findByIdAndDelete = (id) =>
      new Q(async () => {
        const found = store.get(String(id));
        store.delete(String(id));
        return found ? hydrate(found) : null;
      });

    Model.deleteMany = (filter = {}) =>
      new Q(async () => {
        let n = 0;
        for (const [id, d] of [...store]) {
          if (matches(d, filter)) {
            store.delete(id);
            n += 1;
          }
        }
        return { deletedCount: n };
      });

    Model.bulkWrite = async function bulkWrite(ops) {
      let upsertedCount = 0;
      let modifiedCount = 0;
      for (const op of ops) {
        const spec = op.updateOne || op.updateMany;
        if (!spec) continue;
        const found = [...store.values()].find((d) => matches(d, spec.filter));
        if (found) {
          const updated = applyUpdate(found, spec.update);
          updated.updatedAt = new Date();
          store.set(String(found._id), updated);
          modifiedCount += 1;
        } else if (spec.upsert) {
          const seed = { ...(spec.update.$setOnInsert || {}) };
          for (const [k, v] of Object.entries(spec.filter)) {
            if (typeof v !== 'object') seed[k] = v;
          }
          const base = new Model(seed).toObject({ depopulate: true });
          const created = applyUpdate(JSON.parse(JSON.stringify(base)), spec.update);
          created.createdAt = new Date();
          created.updatedAt = new Date();
          store.set(String(created._id), created);
          upsertedCount += 1;
        }
      }
      return { upsertedCount, modifiedCount, ok: 1 };
    };

    // Minimal aggregation: enough for the $group/$sort/$cond pipelines
    // this codebase actually uses.
    Model.aggregate = (pipeline) =>
      new Q(async () => {
        const evalExpr = (expr, doc) => {
          if (expr === null || expr === undefined) return expr;
          if (typeof expr === 'string') return expr.startsWith('$') ? getPath(doc, expr.slice(1)) : expr;
          if (typeof expr !== 'object') return expr;
          if (Array.isArray(expr)) return expr.map((e) => evalExpr(e, doc));

          const [op] = Object.keys(expr);
          const arg = expr[op];
          switch (op) {
            case '$cond': {
              const [c, a, b] = Array.isArray(arg) ? arg : [arg.if, arg.then, arg.else];
              return evalExpr(c, doc) ? evalExpr(a, doc) : evalExpr(b, doc);
            }
            case '$and': return arg.every((e) => Boolean(evalExpr(e, doc)));
            case '$or': return arg.some((e) => Boolean(evalExpr(e, doc)));
            case '$not': return !evalExpr(arg, doc);
            case '$eq': return toComparable(evalExpr(arg[0], doc)) === toComparable(evalExpr(arg[1], doc));
            case '$ne': return toComparable(evalExpr(arg[0], doc)) !== toComparable(evalExpr(arg[1], doc));
            case '$gt': return toComparable(evalExpr(arg[0], doc)) > toComparable(evalExpr(arg[1], doc));
            case '$gte': return toComparable(evalExpr(arg[0], doc)) >= toComparable(evalExpr(arg[1], doc));
            case '$lt': return toComparable(evalExpr(arg[0], doc)) < toComparable(evalExpr(arg[1], doc));
            case '$lte': return toComparable(evalExpr(arg[0], doc)) <= toComparable(evalExpr(arg[1], doc));
            default: return undefined;
          }
        };

        let docs = [...store.values()];

        for (const stage of pipeline) {
          if (stage.$match) {
            docs = docs.filter((d) => matches(d, stage.$match));
          } else if (stage.$group) {
            const spec = stage.$group;
            const groups = new Map();

            for (const d of docs) {
              const key = JSON.stringify(evalExpr(spec._id, d) ?? null);
              if (!groups.has(key)) groups.set(key, { _id: evalExpr(spec._id, d) ?? null, __rows: [] });
              groups.get(key).__rows.push(d);
            }
            // A $group with a constant _id still produces one row over an
            // empty collection only if there were documents; match Mongo.
            const out = [];
            for (const g of groups.values()) {
              const row = { _id: g._id };
              for (const [field, acc] of Object.entries(spec)) {
                if (field === '_id') continue;
                const [aop] = Object.keys(acc);
                const aexpr = acc[aop];
                switch (aop) {
                  case '$sum':
                    row[field] = g.__rows.reduce(
                      (t, d) => t + (Number(evalExpr(aexpr, d)) || 0),
                      0
                    );
                    break;
                  case '$avg': {
                    const vals = g.__rows.map((d) => Number(evalExpr(aexpr, d))).filter(Number.isFinite);
                    row[field] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                    break;
                  }
                  case '$first': row[field] = evalExpr(aexpr, g.__rows[0]); break;
                  case '$last': row[field] = evalExpr(aexpr, g.__rows[g.__rows.length - 1]); break;
                  case '$min':
                    row[field] = g.__rows.reduce((m, d) => {
                      const v = evalExpr(aexpr, d);
                      return m === undefined || toComparable(v) < toComparable(m) ? v : m;
                    }, undefined);
                    break;
                  case '$max':
                    row[field] = g.__rows.reduce((m, d) => {
                      const v = evalExpr(aexpr, d);
                      return m === undefined || toComparable(v) > toComparable(m) ? v : m;
                    }, undefined);
                    break;
                  case '$push': row[field] = g.__rows.map((d) => evalExpr(aexpr, d)); break;
                  case '$addToSet': row[field] = [...new Set(g.__rows.map((d) => evalExpr(aexpr, d)))]; break;
                  default: row[field] = undefined;
                }
              }
              out.push(row);
            }
            docs = out;
          } else if (stage.$sort) {
            docs = applySort(docs, stage.$sort);
          } else if (stage.$limit) {
            docs = docs.slice(0, stage.$limit);
          } else if (stage.$skip) {
            docs = docs.slice(stage.$skip);
          } else if (stage.$project) {
            docs = docs.map((d) => {
              const row = {};
              for (const [field, expr] of Object.entries(stage.$project)) {
                if (expr === 1 || expr === true) row[field] = getPath(d, field);
                else if (expr !== 0 && expr !== false) row[field] = evalExpr(expr, d);
              }
              return row;
            });
          }
        }
        return docs;
      });

    Model.syncIndexes = async () => [];
    Model.createIndexes = async () => [];
    Model.init = async () => Model;

    return Model;
  };

  mongoose.model = function model(...args) {
    const M = originalModel(...args);
    return patch(M);
  };

  // Patch anything already compiled
  for (const name of mongoose.modelNames()) patch(originalModel(name));

  // Neutralise the real connection. readyState is deliberately left at 0
  // so Model.compile never tries to touch a real driver collection.
  mongoose.connect = async () => mongoose.connection;
  mongoose.disconnect = async () => undefined;
}

function reset() {
  stores.clear();
}

module.exports = { install, reset, getStore };
