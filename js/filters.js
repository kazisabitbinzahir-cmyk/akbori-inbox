function isUnan(c){var m=c.messages||[];if(!m.length)return false;return m[m.length-1].role==='customer';}

function buildFilters(){
  var pages=Array.from(new Set(allC.map(function(c){return c.page_name;}).filter(Boolean)));
  var pf=document.getElementById('pfrow');
  var ap=(pf.querySelector('.active')||{}).textContent||'সব';
  pf.innerHTML='<button class="fbtn active" onclick="setPF(\'all\',this)">সব</button>';
  pages.forEach(function(p){var b=document.createElement('button');b.className='fbtn'+(p===ap?' active':'');b.textContent=p;b.style.borderColor=PC[p]||'#ddd';b.onclick=function(){setPF(p,b);};pf.appendChild(b);});
  var tf=document.getElementById('tfrow');
  tf.innerHTML='<button class="fbtn active" onclick="setTF(\'all\',this)">সব Tag</button>';
  Array.from(allTags).forEach(function(t){var b=document.createElement('button');b.className='fbtn'+(aTF.has(t)?' active':'');b.textContent=t;b.onclick=function(){setTF(t,b);};tf.appendChild(b);});
}

function setPF(v,btn){aPF=v;document.getElementById('pfrow').querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');applyFilters();}
function setTF(v,btn){
  if(v==='all'){aTF.clear();document.getElementById('tfrow').querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');}
  else{var ab=document.getElementById('tfrow').querySelector('.fbtn');ab.classList.remove('active');if(aTF.has(v)){aTF.delete(v);btn.classList.remove('active');if(aTF.size===0)ab.classList.add('active');}else{aTF.add(v);btn.classList.add('active');}}
  applyFilters();
}
function setSF(v,btn){
  if(v==='all'){aSF.clear();document.querySelectorAll('.sfbtn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');}
  else{var ab=document.querySelector('.sfbtn');ab.classList.remove('active');if(aSF.has(v)){aSF.delete(v);btn.classList.remove('active');if(aSF.size===0)ab.classList.add('active');}else{aSF.add(v);btn.classList.add('active');}}
  applyFilters();
}
function setSort(o,btn){sortOrd=o;document.getElementById('sasc').classList.toggle('active',o==='asc');document.getElementById('sdesc').classList.toggle('active',o==='desc');applyFilters();}

function applyFilters(){
  var raw=document.getElementById('sinput').value.trim();
  var terms=raw.toLowerCase().split(',').join(' ').split(' ').filter(function(s){return s.length>0;});
  var df=document.getElementById('dfrom').value, dt=document.getElementById('dto').value;
  filtC=allC.filter(function(c){
    if(aPF!=='all'&&c.page_name!==aPF)return false;
    if(aTF.size>0){var ct=c.tags||[];var allMatch=true;aTF.forEach(function(t){if(!ct.includes(t))allMatch=false;});if(!allMatch)return false;}
    if(aSF.size>0){
      var ok=true;
      aSF.forEach(function(s){
        if(s==='unread'&&!c.unread)ok=false;
        if(s==='unanswered'&&!isUnan(c))ok=false;
        if(s==='read'&&(c.unread||isUnan(c)))ok=false;
        if(s==='noted'&&!(c.notes&&c.notes.trim()))ok=false;
        if(s==='noimage'){var hasImg=c.has_image||(c.messages||[]).some(function(m){return m.has_image;});if(hasImg)ok=false;}
      });
      if(!ok)return false;
    }
    if(terms.length>0){
      var found=terms.some(function(t){
        return (c.sender_id||'').includes(t)||(c.last_message||'').toLowerCase().includes(t)||(c.messages||[]).some(function(m){return (m.text||'').toLowerCase().includes(t);})||(c.tags||[]).some(function(tg){return tg.toLowerCase().includes(t);});
      });
      if(!found)return false;
    }
    if(df&&c.last_time<df)return false;
    if(dt&&c.last_time>dt+'T23:59:59')return false;
    return true;
  });
  filtC.sort(function(a,b){var ta=new Date(a.last_time||0).getTime(),tb=new Date(b.last_time||0).getTime();return sortOrd==='asc'?ta-tb:tb-ta;});
  renderList(); updateBulkBtn();
}