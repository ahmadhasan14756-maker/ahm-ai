// Chats are kept on the phone in IndexedDB: it holds hundreds of MB. localStorage holds only about 5 MB on
// iPhone; once many projects were saved it silently stopped saving, so after closing the app an old copy
// came back (a finished build showed "file 2 of 13" again). localStorage is used only if IndexedDB is missing.
const DB = "ahm-ai", ST = "kv";
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no idb"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(ST)) r.result.createObjectStore(ST); };
    r.onsuccess = () => { const db = r.result; db.onversionchange = () => { db.close(); dbp = null; }; resolve(db); };
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("blocked"));
  }).catch((e) => { dbp = null; throw e; });
  return dbp;
}

const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(ST, mode);
    const req = fn(t.objectStore(ST));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
};

export async function getItem(key) {
  try { const v = await tx("readonly", (s) => s.get(key)); if (v !== undefined) return v; } catch {}
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; }
}

// → true when saved
export async function setItem(key, value) {
  try {
    await tx("readwrite", (s) => s.put(value, key));
    try { localStorage.removeItem(key); } catch {} // the old copy only takes space (and could come back later)
    return true;
  } catch {}
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
