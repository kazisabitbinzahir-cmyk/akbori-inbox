// ============================================================
// search.js — image search via Vecstore
// ============================================================

window._imgSearchCache = window._imgSearchCache || {};

async function doImgSearch(imageUrl, btnId) {
  var container = typeof btnId === 'string' ? document.getElementById(btnId) : btnId;
  if(!container) return;

  // If cached result exists, open it
  var cached = window._imgSearchCache[imageUrl];
  if(cached && cached.url) {
    window.open(cached.url, '_blank');
    return;
  }

  var btn = container.querySelector('button');
  if(btn) { btn.textContent='🔍 Searching...'; btn.disabled=true; }

  try {
    var res = await fetch(NB+'/action', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'image_search', image_url: imageUrl, sender_id:'search', page_id:'search'})
    });
    var data = await res.json();
    if(data.search_url && data.count > 0) {
      window._imgSearchCache[imageUrl] = { url: data.search_url, count: data.count };
      window.open(data.search_url, '_blank');
      if(btn) { btn.textContent='🔍 Search'; btn.disabled=false; }
      var resultDiv = container.querySelector('.srch-result');
      if(!resultDiv){ resultDiv=document.createElement('div'); resultDiv.className='srch-result'; resultDiv.style.cssText='font-size:10px;color:#1565c0;margin-top:2px;cursor:pointer;'; container.appendChild(resultDiv); }
      resultDiv.textContent='✅ '+data.count+' results found';
      resultDiv.onclick=function(){window.open(data.search_url,'_blank');};
    } else {
      if(btn) { btn.textContent='🔍 Search'; btn.disabled=false; }
      var resultDiv = container.querySelector('.srch-result');
      if(!resultDiv){ resultDiv=document.createElement('div'); resultDiv.className='srch-result'; resultDiv.style.cssText='font-size:10px;color:#aaa;margin-top:2px;'; container.appendChild(resultDiv); }
      resultDiv.textContent='No results';
      resultDiv.onclick=null;
    }
  } catch(e) {
    if(btn) { btn.textContent='🔍 Search'; btn.disabled=false; }
    var resultDiv = container.querySelector('.srch-result');
    if(!resultDiv){ resultDiv=document.createElement('div'); resultDiv.className='srch-result'; resultDiv.style.cssText='font-size:10px;color:#e53935;margin-top:2px;'; container.appendChild(resultDiv); }
    resultDiv.textContent='Failed';
    resultDiv.onclick=null;
  }
}
