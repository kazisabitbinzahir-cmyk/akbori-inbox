// api.js — API calls
// post() goes to n8n, sb*() go directly to Supabase
// Future: replace all n8n calls with direct SB or VPS API

function post(data) {
  return fetch(NB + '/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

function sbHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Prefer': 'return=minimal'
  };
}

function sbGet(table, params) {
  return fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + params, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  }).then(function(r) { return r.json(); });
}

function sbPatch(table, match, data) {
  var params = Object.keys(match).map(function(k) { return k + '=eq.' + match[k]; }).join('&');
  return fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + params, {
    method: 'PATCH',
    headers: sbHeaders(),
    body: JSON.stringify(data)
  });
}

function sbPost(table, data) {
  return fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: Object.assign({}, sbHeaders(), { 'Prefer': 'return=representation' }),
    body: JSON.stringify(data)
  }).then(function(r) { return r.json(); });
}

function sbDelete(table, match) {
  var params = Object.keys(match).map(function(k) { return k + '=eq.' + match[k]; }).join('&');
  return fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + params, {
    method: 'DELETE',
    headers: sbHeaders()
  });
}
