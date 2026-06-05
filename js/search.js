// ============================================================
// search.js — image search via Vecstore
// Future: server-side filter search will also live here
// ============================================================


// IMAGE SEARCH
async function doImgSearch(imageUrl, btnId) {
  var btn = typeof btnId === 'string' ? document.getElementById(btnId) : btnId;
  if(btn) { btn.textContent='Searching...'; btn.disabled=true; }
  try {
    var res = await fetch(NB+'/action', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'image_search', image_url: imageUrl, sender_id:'search', page_id:'search'})
    });
    var data = await res.json();
    if(data.search_url && data.count > 0) {
      window.open(data.search_url, '_blank');
      if(btn) { btn.textContent='🔍 Results ('+data.count+')'; btn.disabled=false; }
    } else {
      if(btn) { btn.textContent='No results'; btn.disabled=false; }
    }
  } catch(e) {
    if(btn) { btn.textContent='Failed'; btn.disabled=false; }
  }
}
