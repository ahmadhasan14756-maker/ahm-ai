// The small file every cloud-database project gets: js/ahm-db.js → window.AHM.db.
// It saves the app's data online through AHM AI (/api/appdata), so all devices share it.
// Works in the AHM AI preview, on a published link, and in the downloaded ZIP.
export const DB_FILE = "js/ahm-db.js";

export function dbFile(site, api) {
  return `// ☁️ AHM AI cloud database — do not edit. Your app's data is saved online (the same on every phone and computer).
// Use: await AHM.db.list("patients"), await AHM.db.save("patients", {name: "…"}), await AHM.db.remove("patients", id),
//      await AHM.db.login(password) → true / false, AHM.db.logout()
(function () {
  var SITE = ${JSON.stringify(site)}, API = ${JSON.stringify(api)}, K = "ahm-db-key-" + SITE;
  function key() { try { return localStorage.getItem(K) || ""; } catch (e) { return ""; } }
  function call(a, b) {
    var body = { a: a, site: SITE, key: key() };
    for (var k in b) body[k] = b[k];
    return fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || "db_error"); e.code = j.error; if (j.error === "login_needed" && window.AHM.db.onLoginNeeded) window.AHM.db.onLoginNeeded(); throw e; }
        return j;
      }); });
  }
  window.AHM = window.AHM || {};
  window.AHM.db = {
    list: function (col) { return call("list", { col: col }).then(function (j) { return j.rows || []; }); },
    get: function (col, id) { return call("get", { col: col, id: String(id) }).then(function (j) { return j.row || null; }); },
    save: function (col, obj) {
      obj = obj || {};
      return call("save", { col: col, id: obj.id != null && obj.id !== "" ? String(obj.id) : undefined, data: obj }).then(function (j) { obj.id = j.id; return obj; });
    },
    remove: function (col, id) { return call("remove", { col: col, id: String(id) }).then(function () { return true; }); },
    login: function (password) {
      return call("login", { password: String(password || "") }).then(function (j) { try { localStorage.setItem(K, j.key || ""); } catch (e) {} return !!j.ok; })
        .catch(function () { return false; });
    },
    logout: function () { try { localStorage.removeItem(K); } catch (e) {} },
    onLoginNeeded: null
  };
})();
`;
}
