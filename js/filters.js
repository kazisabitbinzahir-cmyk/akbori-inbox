// ============================================================
// filters.js — filter, sort, and stats functions
// ============================================================

function updateStats(){
  var u=allC.filter(function(c){return c.unread;}).length;
  var a=allC.filter(function(c){return isUnan(c);}).length;
  var h=allC.filter(function(c){return c.human_active;}).length;
  var txt=allC.length+' | '+u+' unread | '+a+' unan | '+h+' H';
  document.getElementById('stats').textContent=txt;
  var sm=document.getElementById('stats_m');if(sm)sm.textContent=txt;
  var bbm=document.getElementById('bbtn_m');
  if(bbm){var cnt=selIDs.size>0?selIDs.size:filtC.length;if(cnt>0){bbm.classList.add('show');bbm.textContent='📢 Bulk ('+cnt+')';}else bbm.classList.remove('show');}
}

function isUnan(c){return c.last_role==='customer';}

function buildFilters(){
  var pages=Object.keys(PC).filter(function(p){return p!=='Unknown';});
  var pf=document.getElementById('pfrow');
  var ap=(pf.querySelector('.active')||{}).textContent||'All';
  pf.innerHTML='<button class="fbtn active" onclick="setPF(\'all\',this)">All</button>';
  pages.forEach(function(p){var b=document.createElement('button');b.className='fbtn'+(p===ap?' active':'');b.textContent=p;b.style.borderColor=PC[p]||'#ddd';b.onclick=function(){setPF(p,b);};pf.appendChild(b);});
  var tf=document.getElementById('tfrow');
  tf.innerHTML='<button class="fbtn active" onclick="setTF(\'all\',this)">All Tags</button>';
  var grouped={};var nocat=[];
  globalTags.forEach(function(gt){
    if(gt.category){if(!grouped[gt.category])grouped[gt.category]=[];grouped[gt.category].push(gt);}
    else{nocat.push(gt);}
  });
  tagCategories.forEach(function(cat){
    if(!grouped[cat.name]||!grouped[cat.name].length)return;
    var row=document.createElement('div');
    row.style.cssText='width:100%;display:flex;flex-wrap:wrap;align-items:center;gap:3px;margin-top:2px;';
    var lbl=document.createElement('span');
    lbl.style.cssText='font-size:10px;font-weight:600;color:'+cat.color+';min-width:fit-content;';
    lbl.textContent=cat.name;
    row.appendChild(lbl);
    grouped[cat.name].forEach(function(gt){
      var b=document.createElement('button');
      b.className='fbtn'+(aTF.has(gt.tag)?' active':'');
      b.textContent=gt.tag;
      b.style.borderColor=cat.color;
      b.onclick=function(){setTF(gt.tag,b);};
      row.appendChild(b);
    });
    tf.appendChild(row);
  });
  if(nocat.length){
    var row2=document.createElement('div');
    row2.style.cssText='width:100%;display:flex;flex-wrap:wrap;align-items:center;gap:3px;margin-top:2px;';
    if(tagCategories.length){
      var lbl2=document.createElement('span');
      lbl2.style.cssText='font-size:10px;font-weight:600;color:#aaa;min-width:fit-content;';
      lbl2.textContent='Other';
      row2.appendChild(lbl2);
    }
    nocat.forEach(function(gt){
      var b=document.createElement('button');
      b.className='fbtn'+(aTF.has(gt.tag)?' active':'');
      b.textContent=gt.tag;
      b.onclick=function(){setTF(gt.tag,b);};
      row2.appendChild(b);
    });
    tf.appendChild(row2);
  }
  buildOSFilter();
}

function setPF(v,btn){aPF=v;document.getElementById('pfrow').querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');applyFilters();triggerServerFilter();}
function setTF(v,btn){
  if(v==='all'){aTF.clear();document.getElementById('tfrow').querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');}
  else{var ab=document.getElementById('tfrow').querySelector('.fbtn');ab.classList.remove('active');if(aTF.has(v)){aTF.delete(v);btn.classList.remove('active');if(aTF.size===0)ab.classList.add('active');}else{aTF.add(v);btn.classList.add('active');}}
  applyFilters();triggerServerFilter();
}
function setSF(v,btn){
  if(v==='all'){aSF.clear();document.querySelectorAll('.sfbtn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');}
  else{var ab=document.querySelector('.sfbtn');ab.classList.remove('active');if(aSF.has(v)){aSF.delete(v);btn.classList.remove('active');if(aSF.size===0)ab.classList.add('active');}else{aSF.add(v);btn.classList.add('active');}}
  applyFilters();triggerServerFilter();
}
function setSort(o,btn){sortOrd=o;document.getElementById('sasc').classList.toggle('active',o==='asc');document.getElementById('sdesc').classList.toggle('active',o==='desc');applyFilters();triggerServerFilter();}

function applyFilters(){
  var raw=document.getElementById('sinput').value.trim();
  var hasSearch=raw.length>0;
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
        if(s==='hascontact'){var hc=c.contact&&Object.values(c.contact).some(function(v){return v&&v.trim();});if(!hc)ok=false;}
      });
      if(!ok)return false;
    }
    // Search: server handles full message search — skip local text filter when search active
    // Local filter only for non-search cases (sender_id, tags, contact name quick match)
    // Search active = server already filtered, skip local text filter
    if(!hasSearch&&terms.length>0){
      var found=terms.some(function(t){
        return (c.sender_id||'').includes(t)||(c.last_message||'').toLowerCase().includes(t)||(c.messages||[]).some(function(m){return (m.text||'').toLowerCase().includes(t);})||(c.tags||[]).some(function(tg){return tg.toLowerCase().includes(t);})||((c.contact&&c.contact.name)||'').toLowerCase().includes(t);
      });
      if(!found)return false;
    }
    if(df&&c.last_time<df)return false;
    if(dt&&c.last_time>dt+'T23:59:59')return false;
    return true;
  });
  filtC.sort(function(a,b){var ta=new Date(a.last_time||0).getTime(),tb=new Date(b.last_time||0).getTime();return sortOrd==='asc'?ta-tb:tb-ta;});
  if(aOSF!==null)filtC=filtC.filter(function(c){return c.order_status===aOSF;});
  renderList(); updateBulkBtn();
}

function onSearchInput(){applyFilters();triggerServerFilter();}

function updateBulkBtn(){
  var raw=document.getElementById('sinput').value.trim();
  var btn=document.getElementById('bbtn');
  // When search active, show filtC count (server-filtered, no local text filter applied)
  var cnt=selIDs.size>0?selIDs.size:filtC.length;
  if(cnt>0){btn.classList.add('show');btn.textContent='Bulk ('+cnt+')';}else btn.classList.remove('show');
}

var _serverFilterTimer=null;
function triggerServerFilter(){
  clearTimeout(_serverFilterTimer);
  _serverFilterTimer=setTimeout(function(){
    convOffset=0;convTotal=null;
    var lm=document.getElementById('loadmorebtn');if(lm)lm.style.display='';
    loadInbox(true);
  },400);
}

function ts(iso){if(!iso)return '';var d=Math.floor((Date.now()-new Date(iso))/60000);if(d<1)return 'Now';if(d<60)return d+'m';if(d<1440)return Math.floor(d/60)+'h';return Math.floor(d/1440)+'d';}

function buildOSFilter(){
  var osrow=document.getElementById('osrow');
  if(!osrow)return;
  osrow.innerHTML='<button class="fbtn'+(aOSF===null?' active':'')+'" onclick="setOSF(null,this)">All Status</button>';
  orderStatuses.forEach(function(os){
    var b=document.createElement('button');
    b.className='fbtn'+(aOSF===os.name?' active':'');
    b.textContent=os.name;
    b.style.borderColor=os.color;
    if(aOSF===os.name){b.style.background=os.color;b.style.color='#fff';}
    b.onclick=function(){setOSF(os.name,b);};
    osrow.appendChild(b);
  });
}

function setOSF(v,btn){
  aOSF=v;
  document.getElementById('osrow').querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('active');b.style.background='';b.style.color='';});
  btn.classList.add('active');
  if(v!==null){var os=orderStatuses.find(function(o){return o.name===v;});if(os){btn.style.background=os.color;btn.style.color='#fff';}}
  applyFilters();triggerServerFilter();
}
