(() => {
  'use strict';

  const KEY = 'parlayTracker.savedTickets.v1';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId() {
    return globalThis.crypto?.randomUUID?.() || `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function parse(raw) {
    try {
      const value = JSON.parse(raw || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function load() {
    const records = parse(localStorage.getItem(KEY));
    let changed = false;
    const seen = new Set();
    for (const record of records) {
      if (!record || typeof record !== 'object') continue;
      let id = String(record.id || '').trim();
      if (!id || seen.has(id)) {
        id = makeId();
        record.id = id;
        changed = true;
      }
      seen.add(id);
    }
    if (changed) localStorage.setItem(KEY, JSON.stringify(records));
    return records;
  }

  function save(records) {
    if (!Array.isArray(records)) throw new TypeError('Ticket storage requires an array.');
    localStorage.setItem(KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('parlay:storage-changed', { detail: { key: KEY } }));
  }

  function update(id, updater) {
    const records = load();
    const index = records.findIndex(record => String(record?.id || '') === String(id));
    if (index < 0) return null;
    const current = clone(records[index]);
    const next = updater(current) || current;
    next.id = records[index].id;
    records[index] = next;
    save(records);
    return clone(next);
  }

  function remove(ids) {
    const wanted = new Set([...ids].map(String));
    const records = load();
    const remaining = records.filter(record => !wanted.has(String(record?.id || '')));
    if (remaining.length !== records.length) save(remaining);
    return records.length - remaining.length;
  }

  window.ParlayStorage = Object.freeze({ KEY, load, save, update, remove, makeId, clone });
})();
