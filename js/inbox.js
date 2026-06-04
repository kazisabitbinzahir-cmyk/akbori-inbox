var NB = window.location.origin + '/webhook';
var PC = {'A1':'#1877f2','A2':'#0d8a6f','4.0':'#7c3aed','Bag Xpress':'#ea580c','5.0':'#d97706','6.0':'#db2777','8.0':'#64748b','Unknown':'#888'};
var allC=[], filtC=[], selC=null, rmode='text', selFile=null;
var aPF='all', aTF=new Set(), aSF=new Set(), selIDs=new Set(), allTags=new Set();
var sortOrd='asc', globalAI=true, globalID=false, globalAuto=true;
var snd=null, lastCnt=0;
var convOffset=0, convTotal=null, convLimit=0;
var suggestions=[], editSID=null;
var savedMessages=[], editSMID=null;
var contactFields=[];
var showArchived=false;
var tagCategories=[], allTagCategories=[];
var editTCID=null;
var globalTags=[];

document.addEventListener('click', function(){
  try{ var ctx=new(window.AudioContext||window.webkitAudioContext)(); snd=function(){var o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.setValueAtTime(0.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}; }catch(e){}
}, {once:true});

function post(data){ return fetch(NB+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); }

async function loadInbox(silent){
  try{
    var res=await fetch(NB+'/inbox-data'+(convOffset>0?'?offset='+convOffset:''));
    var data=await res.json();
    if(data.conversations){
      data.conversations=data.conversations.map(function(c){ c.userId=c.user_id; return c; });
    }
    var nc=data.conversations||[];
    if(lastCnt>0&&nc.length>0){
      nc.forEach(function(n){
        var o=allC.find(function(c){return c.userId===n.userId;});
        var prevLen=o?(o.messages||[]).length:0;
        var newLen=(n.messages||[]).length;
        if(newLen>prevLen){
          var newMsgs=(n.messages||[]).slice(prevLen);
          var hasRealCustomerMsg=newMsgs.some(function(m){ return m.role==='customer'&&m.tag!=='reaction'; });
          if(hasRealCustomerMsg&&snd)snd();
          if(globalAuto){ newMsgs.forEach(function(m){ if(m.role==='customer'&&m.tag!=='reaction') checkAndAutoSend(n,m); }); }
        }
      });
    }
    lastCnt=nc.length;
    nc.forEach(function(n){
      var ex=allC.find(function(c){return c.userId===n.userId;});
      if(ex){n.human_active=ex.human_active;n.notes=ex.notes!==undefined?ex.notes:n.notes;if(ex.id_tag!==undefined)n.id_tag=ex.id_tag;}
    });
    if(convOffset===0){allC=nc;}else{nc.forEach(function(n){if(!allC.find(function(c){return c.userId===n.userId;}))allC.push(n);});if(nc.length<convLimit)convTotal=allC.length;}
    if(data.suggestions)suggestions=data.suggestions;
    if(data.tag_categories){
      tagCategories=data.tag_categories;
      allTagCategories=data.tag_categories;
    }
    if(data.global_tags){
      globalTags=data.global_tags;
      allTags=new Set(globalTags.map(function(t){return t.tag;}));
    }
    if(data.saved_messages)savedMessages=data.saved_messages;
    if(data.contact_fields)contactFields=data.contact_fields;
    if(data.order_statuses)orderStatuses=data.order_statuses;
    if(data.limit)convLimit=data.limit;
    if(data.global_ai!==undefined){ globalAI=data.global_ai; document.getElementById('gai').checked=globalAI; document.getElementById('gaibg').style.background=globalAI?'#4caf50':'#e53935'; document.getElementById('gaiknob').style.transform=globalAI?'translateX(0)':'translateX(14px)'; document.getElementById('gailbl').textContent=globalAI?'ON':'OFF'; var gailbl_m=document.getElementById('gailbl_m');if(gailbl_m)gailbl_m.textContent=globalAI?'ON':'OFF'; }
    if(data.global_id!==undefined){ globalID=data.global_id; document.getElementById('gid').checked=globalID; document.getElementById('gidbg').style.background=globalID?'#1877f2':'#ccc'; document.getElementById('gidknob').style.transform=globalID?'translateX(14px)':'translateX(0)'; document.getElementById('gidlbl').textContent=globalID?'ON':'OFF'; var gidlbl_m=document.getElementById('gidlbl_m');if(gidlbl_m)gidlbl_m.textContent=globalID?'ON':'OFF'; }
    if(data.global_auto!==undefined){ globalAuto=data.global_auto; document.getElementById('gauto').checked=globalAuto; document.getElementById('gautobg').style.background=globalAuto?'#4caf50':'#ccc'; document.getElementById('gautoknob').style.transform=globalAuto?'translateX(14px)':'translateX(0)'; document.getElementById('gautolbl').textContent=globalAuto?'ON':'OFF'; var gautolbl_m=document.getElementById('gautolbl_m');if(gautolbl_m)gautolbl_m.textContent=globalAuto?'ON':'OFF'; }
    allC.forEach(function(c){(c.tags||[]).forEach(function(t){allTags.add(t);});});
    buildFilters(); applyFilters(); updateStats();
    if(!silent){document.getElementById('rfbtn').textContent='Fetched';setTimeout(function(){document.getElementById('rfbtn').textContent='Refresh';},2000);}
  }catch(e){
    if(!silent){document.getElementById('rfbtn').textContent='Failed';setTimeout(function(){document.getElementById('rfbtn').textContent='Refresh';},2000);}
  }
}

function manualRefresh(){convOffset=0;convTotal=null;document.getElementById('rfbtn').textContent='...';loadInbox(false);}
async function loadMore(){
  convOffset+=convLimit;
  var btn=document.getElementById('loadmorebtn');if(btn)btn.textContent='Loading...';
  await loadInbox(true);
  if(btn)btn.textContent='Load More';
}

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
  var pages=Array.from(new Set(allC.map(function(c){return c.page_name;}).filter(Boolean)));
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
        if(s==='hascontact'){var hc=c.contact&&Object.values(c.contact).some(function(v){return v&&v.trim();});if(!hc)ok=false;}
      });
      if(!ok)return false;
    }
    if(terms.length>0){
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

function updateBulkBtn(){var btn=document.getElementById('bbtn');var cnt=selIDs.size>0?selIDs.size:filtC.length;if(cnt>0){btn.classList.add('show');btn.textContent='Bulk ('+cnt+')';}else btn.classList.remove('show');}

function ts(iso){if(!iso)return '';var d=Math.floor((Date.now()-new Date(iso))/60000);if(d<1)return 'Now';if(d<60)return d+'m';if(d<1440)return Math.floor(d/60)+'h';return Math.floor(d/1440)+'d';}

function renderList(){
  var list=document.getElementById('clist');
  if(!filtC.length){list.innerHTML='<div class="noconv">No conversations</div>';return;}
  list.innerHTML='';
  filtC.forEach(function(conv){
    var col=PC[conv.page_name]||'#888';
    var init=(conv.sender_id||'').slice(-4);
    var bc=conv.unread?'bunread':isUnan(conv)?'bunan':'bread';
    var tags=conv.tags||[];
    var div=document.createElement('div');
    div.className='citem'+(selC&&selC.userId===conv.userId?' active':'')+(selIDs.has(conv.userId)?' selected':'');
    var th='';
    tags.forEach(function(t){
      var cat=allTagCategories.find(function(c){return c.tags&&c.tags.includes(t);});
      var catColor=cat?cat.color:'#e3f2fd';
      var catTextColor=cat?'#fff':'#1565c0';
      th+='<span class="ctag" data-uid="'+conv.userId+'" data-tag="'+t+'" style="background:'+catColor+';color:'+catTextColor+'">'+t+' <span class="tdel" style="cursor:pointer;font-weight:bold;opacity:0.7">x</span></span>';
    });
    var hi=conv.human_active?'<span class="hind">H</span>':'';
    var ni=conv.notes?'<span class="nind">N</span>':'';
    var ci=conv.contact&&Object.values(conv.contact).some(function(v){return v&&v.trim();})?'<span class="nind" style="background:#e8f5e9;color:#2e7d32">C</span>':'';
    var osObj=conv.order_status?orderStatuses.find(function(o){return o.name===conv.order_status;}):null;
    var osBdg=osObj?'<span style="font-size:9px;padding:1px 6px;border-radius:8px;color:#fff;background:'+osObj.color+';margin-left:3px">'+conv.order_status+'</span>':'';
    div.innerHTML='<input type="checkbox" class="cchk"'+(selIDs.has(conv.userId)?' checked':'')+' onclick="toggleSel(event,\''+conv.userId+'\')">'
      +'<div class="av" style="background:'+col+'">'+init+'<div class="avbdg '+bc+'"></div></div>'
      +'<div class="cinfo"><div class="ctop"><span class="cname'+(conv.unread?' bold':'')+'">'+((conv.contact&&conv.contact.name)||conv.sender_id||'?')+hi+ni+ci+'</span><span class="ctime">'+ts(conv.last_time)+'</span></div>'
      +'<div><span class="cpbdg" style="background:'+col+'">'+(conv.page_name||'?')+'</span>'+osBdg+'</div>'
      +'<div class="cprev">'+(conv.has_image?'📷 ':'')+( conv.last_message||'')+'</div>'
      +'<div class="ctags">'+th+'</div></div>';
    div.addEventListener('click',function(e){if(e.target.type!=='checkbox')selectConv(conv);});
    list.appendChild(div);
  });
  var old_lm=document.getElementById('loadmorebtn');if(old_lm)old_lm.remove();
  if(convTotal===null){
    var lmbtn=document.createElement('button');
    lmbtn.id='loadmorebtn';
    lmbtn.textContent='Load More';
    lmbtn.style.cssText='width:100%;padding:8px;margin:4px 0;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;font-size:12px;cursor:pointer;color:#555;';
    lmbtn.onclick=function(){loadMore();};
    list.appendChild(lmbtn);
  }
}

function toggleSel(e,uid){e.stopPropagation();if(selIDs.has(uid))selIDs.delete(uid);else selIDs.add(uid);updateBulkBtn();applyFilters();}

document.getElementById('clist').addEventListener('click',function(e){
  if(e.target.classList.contains('tdel')){
    e.stopPropagation();var sp=e.target.closest('.ctag');if(!sp)return;
    var uid=sp.dataset.uid,tag=sp.dataset.tag;var conv=allC.find(function(c){return c.userId===uid;});if(!conv)return;
    conv.tags=(conv.tags||[]).filter(function(t){return t!==tag;});
    if(selC&&selC.userId===uid)selC.tags=conv.tags;
    post({action:'remove_tag',sender_id:conv.sender_id,page_id:conv.page_id,tag:tag});
    buildFilters();applyFilters();
  }
});

function renderChatTags(){
  if(!selC)return;
  var box=document.getElementById('chattagbar');
  box.innerHTML='';
  (selC.tags||[]).forEach(function(t){
    var sp=document.createElement('span');
    sp.style.cssText='font-size:10px;background:#e3f2fd;color:#1565c0;padding:2px 7px;border-radius:10px;display:inline-flex;align-items:center;gap:3px;margin:1px';
    sp.innerHTML=t+' <span style="cursor:pointer;font-weight:bold;opacity:0.7" onclick="rmCTag(\''+t+'\')">x</span>';
    box.appendChild(sp);
  });
}

function selectConv(conv){
  selC=conv;
  if(conv.unread){conv.unread=false;var i=allC.findIndex(function(c){return c.userId===conv.userId;});if(i>=0)allC[i].unread=false;post({action:'mark_read',sender_id:conv.sender_id,page_id:conv.page_id});}
  document.getElementById('estate').style.display='none';
  var cv=document.getElementById('chatview');cv.style.display='flex';
  var col=PC[conv.page_name]||'#888';
  document.getElementById('chav').style.background=col;
  document.getElementById('chav').textContent=(conv.sender_id||'').slice(-4);
  document.getElementById('chname').textContent=(conv.contact&&conv.contact.name)||conv.sender_id||'?';
  var nm=conv.notes&&conv.notes.trim()?' | Note':'';
  document.getElementById('chmeta').textContent='Page: '+(conv.page_name||'?')+' | ID: '+(conv.page_id||'')+' | '+ts(conv.last_time)+' ago'+nm;
  var ht=document.getElementById('htog');ht.checked=conv.human_active||false;
  document.getElementById('htbg').style.background=conv.human_active?'#e53935':'#ccc';
  document.getElementById('htknob').style.transform=conv.human_active?'translateX(14px)':'translateX(0)';
  var indID=conv.id_tag!==undefined?conv.id_tag:globalID;
  document.getElementById('idtog').checked=indID;
  document.getElementById('idtbg').style.background=indID?'#1877f2':'#ccc';
  document.getElementById('idtknob').style.transform=indID?'translateX(14px)':'translateX(0)';
  document.getElementById('nota').value=conv.notes||'';
  var cp=document.getElementById('chatpanel');if(cp)cp.style.display='none';
  document.getElementById('rinput').value='';
  selFile=null;
  document.getElementById('iprev').style.display='none';
  document.getElementById('fiinput').value='';
  setMode('text');
  renderMsgs(conv.messages||[]);renderChatTags();renderSB(conv);renderSavedBar();renderList();
  var _ossel=document.getElementById('convos_select');if(_ossel){_ossel.innerHTML='<option value="">No status</option>';orderStatuses.forEach(function(os){_ossel.innerHTML+='<option value="'+os.name+'"'+(conv.order_status===os.name?' selected':'')+'>'+os.name+'</option>';});}
  if(window.innerWidth<=700){
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('chatarea').classList.add('active');
    document.getElementById('topbar').style.display='none';
    history.pushState({chatOpen:true},'');
  }
  if(!conv._msgsLoaded){conv._msgsLoaded=true;fetch(SUPABASE_URL+'/rest/v1/messages?user_id=eq.'+conv.user_id+'&order=time.asc',{headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}}).then(function(r){return r.json();}).then(function(msgs){conv.messages=msgs;var i=allC.findIndex(function(c){return c.userId===conv.userId;});if(i>=0)allC[i].messages=msgs;if(selC&&selC.userId===conv.userId){renderMsgs(msgs);renderSB(conv);}}).catch(function(){conv._msgsLoaded=false;});}
}

function safeText(t){return (t||'').split('<').join('&lt;').split('>').join('&gt;');}
function nl2br(t){return (t||'').split('\n').join('<br>');}

function renderMsgs(msgs){
  var area=document.getElementById('msgarea');
  var showID=document.getElementById('idtog').checked;
  area.innerHTML='';
  msgs.forEach(function(m){
    var div=document.createElement('div');
    div.className='msg '+(m.role==='customer'?'customer':'agent');
    var content='';

    if(m.reply_to_mid){
      var quoted=msgs.find(function(q){return q.mid===m.reply_to_mid;});
      if(quoted){
        var qcontent='';
        if(quoted.has_image&&quoted.image_url){
          qcontent='<img src="'+quoted.image_url+'" style="max-height:40px;border-radius:4px;display:block;margin-bottom:2px">'+(quoted.text&&quoted.text!=='(image)'?'<span>'+safeText(quoted.text)+'</span>':'');
        } else if(quoted.has_audio){ qcontent='🎵 (audio)';
        } else if(quoted.has_video){ qcontent='🎬 (video)';
        } else if(quoted.is_like){ qcontent='❤️';
        } else if(quoted.is_sticker){ qcontent='<img src="'+quoted.sticker_url+'" style="max-height:30px">';
        } else { qcontent=safeText(quoted.text||''); }
        content+='<div style="background:rgba(0,0,0,0.08);border-left:3px solid #1877f2;padding:4px 8px;border-radius:6px;margin-bottom:4px;font-size:11px;color:#555;max-width:100%">'+qcontent+'</div>';
      }
    }

    if(m.has_image&&m.image_url){
      content+='<img src="'+m.image_url+'" class="mimg" loading="lazy" onclick="openLB(this.src)" alt="img">';
      if(m.role==='customer')content+='<div style="margin-top:4px"><a href="https://akbori.xyz/?s='+encodeURIComponent(m.image_url)+'" target="_blank" style="font-size:10px;background:#e3f2fd;color:#1565c0;padding:2px 7px;border-radius:8px;text-decoration:none">🔍 Search</a></div>';
      if(m.text&&m.text!=='(image)')content+='<div style="margin-top:4px">'+nl2br(safeText(m.text))+'</div>';
    } else if(m.has_audio&&m.audio_url){
      content+='<audio controls style="max-width:200px;margin:4px 0"><source src="'+m.audio_url+'"></audio>';
    } else if(m.has_video&&m.video_url){
      content+='<video controls style="max-width:200px;border-radius:8px;margin:4px 0"><source src="'+m.video_url+'"></video>';
    } else if(m.is_sticker&&m.sticker_url){
      content+='<img src="'+m.sticker_url+'" style="max-width:80px;border-radius:4px" alt="sticker">';
    } else if(m.is_like){
      content+='<span style="font-size:28px">❤️</span>';
    } else if(m.share_url){
      content+='<a href="'+m.share_url+'" target="_blank" style="display:block;background:#f0f7ff;border:1px solid #90caf9;border-radius:8px;padding:8px;color:#1565c0;font-size:12px;text-decoration:none;max-width:200px">'+(m.share_title||m.share_url)+'<div style="font-size:10px;color:#888;margin-top:2px;overflow:hidden;text-overflow:ellipsis">'+m.share_url+'</div></a>';
    } else if(m.location_lat){
      content+='<a href="https://maps.google.com/?q='+m.location_lat+','+m.location_lng+'" target="_blank" style="display:block;background:#f0f7ff;border:1px solid #90caf9;border-radius:8px;padding:8px;color:#1565c0;font-size:12px;text-decoration:none">📍 Location<div style="font-size:10px;color:#888">Tap to open maps</div></a>';
    } else {
      content+=nl2br(safeText(m.text||''));
    }

    var tb=m.tag==='AI'?'<span class="aitag">AI</span>':m.tag==='Human'?'<span class="hutag">Human</span>':m.tag==='reaction'?'<span style="font-size:9px;background:#fff3e0;color:#e65100;padding:1px 5px;border-radius:6px">reaction</span>':'';
    var tstr=m.time?new Date(m.time).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):'';
    var statusTxt=m.failed?'<span style="color:#e53935;font-size:9px">Failed</span>':m.sending?'<span style="color:#aaa;font-size:9px">Sending...</span>':'';
    var ids=showID&&m.role==='agent'&&selC?'<div class="mid">ID: '+selC.sender_id+'</div>':'';
    div.innerHTML='<div class="mbubble">'+content+'</div><div class="mmeta">'+tstr+' '+tb+' '+statusTxt+'</div>'+ids;
    area.appendChild(div);
  });
  setTimeout(function(){area.scrollTop=area.scrollHeight;},50);
}

document.getElementById('idtog').addEventListener('change',function(){
  document.getElementById('idtbg').style.background=this.checked?'#1877f2':'#ccc';
  document.getElementById('idtknob').style.transform=this.checked?'translateX(14px)':'translateX(0)';
  if(selC){selC.id_tag=this.checked;var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC[i].id_tag=this.checked;post({action:'save_id_tag',sender_id:selC.sender_id,page_id:selC.page_id,id_tag:this.checked});renderMsgs(selC.messages||[]);}
});
function onIDToggle(){}

function openLB(url){document.getElementById('limg').src=url;document.getElementById('lbox').classList.add('open');}
function closeLB(){document.getElementById('lbox').classList.remove('open');}

function openNote(){if(selC)document.getElementById('nota').value=selC.notes||'';document.getElementById('notemodal').classList.add('open');}
function closeNote(){document.getElementById('notemodal').classList.remove('open');}
async function saveNote(){
  if(!selC)return;
  selC.notes=document.getElementById('nota').value;
  var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC[i].notes=selC.notes;
  await post({action:'save_note',sender_id:selC.sender_id,page_id:selC.page_id,note:selC.notes});
  closeNote();
  var nm=selC.notes&&selC.notes.trim()?' | Note':'';
  var cm=document.getElementById('chmeta').textContent.split(' | Note').join('');
  document.getElementById('chmeta').textContent=cm+nm;
  showToast('Note saved','success');applyFilters();
}

// CONTACT MODAL
function openContact(){
  if(!selC)return;
  var box=document.getElementById('contactfields');
  box.innerHTML='';
  contactFields.forEach(function(f){
    var val=(selC.contact&&selC.contact[f.field_key])||'';
    var inp=f.field_type==='textarea'?'<textarea id="cf_'+f.field_key+'" style="width:100%;border:1px solid #ddd;border-radius:6px;padding:6px;font-size:12px;resize:none;height:50px;font-family:inherit">'+safeText(val)+'</textarea>':'<input type="text" id="cf_'+f.field_key+'" value="'+safeText(val)+'" style="width:100%;border:1px solid #ddd;border-radius:6px;padding:6px;font-size:12px">';
    box.innerHTML+='<div style="margin-bottom:8px"><label style="font-size:11px;color:#666;display:block;margin-bottom:3px">'+f.field_label+'</label>'+inp+'</div>';
  });
  document.getElementById('contactmodal').classList.add('open');
}
function closeContact(){document.getElementById('contactmodal').classList.remove('open');}
async function saveContact(){
  if(!selC)return;
  var fields={};
  contactFields.forEach(function(f){
    var el=document.getElementById('cf_'+f.field_key);
    if(el)fields[f.field_key]=el.value.trim();
  });
  selC.contact=fields;
  var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC[i].contact=fields;
  await post({action:'save_contact',sender_id:selC.sender_id,page_id:selC.page_id,fields:fields});
  var name=fields.name||selC.sender_id||'?';
  document.getElementById('chname').textContent=name;
  closeContact();
  showToast('Contact saved','success');
  applyFilters();
}

// CONTACT FIELDS MANAGER
function openCFMgr(){renderCFMgr();document.getElementById('cfmgrmodal').classList.add('open');}
function closeCFMgr(){document.getElementById('cfmgrmodal').classList.remove('open');}
function renderCFMgr(){
  var list=document.getElementById('cfmgrlist');
  list.innerHTML='';
  contactFields.forEach(function(f){
    var div=document.createElement('div');div.className='tmgritem';
    div.innerHTML='<div class="tmgrname"><span style="background:#e8f5e9;color:#2e7d32;padding:1px 7px;border-radius:8px;font-size:11px">'+f.field_label+'</span><span class="tmgrcnt">'+f.field_type+'</span></div><button class="tmgrdel" onclick="delCF('+f.id+')">x</button>';
    list.appendChild(div);
  });
}
async function addCF(){
  var key=document.getElementById('cfkey').value.trim().replace(/\s+/g,'_').toLowerCase();
  var label=document.getElementById('cflabel').value.trim();
  var type=document.getElementById('cftype').value;
  if(!key||!label){showToast('Fill all fields','error');return;}
  await post({action:'add_contact_field',field_key:key,field_label:label,field_type:type,sort_order:contactFields.length+1});
  document.getElementById('cfkey').value='';document.getElementById('cflabel').value='';
  showToast('Field added','success');
  loadInbox(true);
}
async function delCF(id){
  if(!confirm('Delete this field?'))return;
  await post({action:'delete_contact_field',id:id});
  contactFields=contactFields.filter(function(f){return f.id!==id;});
  renderCFMgr();showToast('Deleted','info');
}

function showTS(){
  var v=document.getElementById('tinput').value.toLowerCase();
  var box=document.getElementById('tsugg');
  if(!v){box.style.display='none';return;}
  var m=globalTags.map(function(t){return t.tag;}).filter(function(t){return t.toLowerCase().includes(v);});
  if(!m.length){box.style.display='none';return;}
  box.innerHTML='';
  m.forEach(function(t){var d=document.createElement('div');d.className='tsuggitem';d.textContent=t;d.onclick=function(){document.getElementById('tinput').value=t;box.style.display='none';addTag();};box.appendChild(d);});
  box.style.display='block';
}
function tagKD(e){if(e.key==='Enter'){e.preventDefault();addTag();}if(e.key==='Escape')document.getElementById('tsugg').style.display='none';}

async function addTag(){
  if(!selC)return;
  var inp=document.getElementById('tinput');var tag=inp.value.trim();if(!tag)return;
  selC.tags=selC.tags||[];
  if(!selC.tags.includes(tag)){selC.tags.push(tag);allTags.add(tag);var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC[i].tags=selC.tags;await post({action:'add_tag',sender_id:selC.sender_id,page_id:selC.page_id,tag:tag});}
  inp.value='';document.getElementById('tsugg').style.display='none';renderChatTags();buildFilters();applyFilters();showToast('Tag: '+tag,'success');
}
async function rmCTag(tag){
  if(!selC)return;selC.tags=(selC.tags||[]).filter(function(t){return t!==tag;});var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC[i].tags=selC.tags;
  await post({action:'remove_tag',sender_id:selC.sender_id,page_id:selC.page_id,tag:tag});
  renderChatTags();buildFilters();applyFilters();
}

async function toggleHuman(){
  if(!selC)return;
  var on=document.getElementById('htog').checked;selC.human_active=on;var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC[i].human_active=on;
  document.getElementById('htbg').style.background=on?'#e53935':'#ccc';
  document.getElementById('htknob').style.transform=on?'translateX(14px)':'translateX(0)';
  await post({action:'toggle_human',sender_id:selC.sender_id,page_id:selC.page_id,human_active:on});
  showToast(on?'Human ON':'AI ON',on?'error':'success');applyFilters();
}

async function archiveConv(){
  if(!selC)return;
  if(!confirm('Archive this conversation?'))return;
  await post({action:'archive_conversation',sender_id:selC.sender_id,page_id:selC.page_id});
  var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC.splice(i,1);
  selC=null;
  document.getElementById('estate').style.display='flex';
  document.getElementById('chatview').style.display='none';
  applyFilters();showToast('Archived','info');
}

async function deleteConv(){
  if(!selC)return;
  if(!confirm('Delete this conversation permanently? This cannot be undone.'))return;
  await post({action:'delete_conversation',sender_id:selC.sender_id,page_id:selC.page_id});
  var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC.splice(i,1);
  selC=null;
  document.getElementById('estate').style.display='flex';
  document.getElementById('chatview').style.display='none';
  applyFilters();showToast('Deleted','info');
}

async function toggleGAI(checked){
  globalAI=checked;
  document.getElementById('gaibg').style.background=checked?'#4caf50':'#e53935';
  document.getElementById('gaiknob').style.transform=checked?'translateX(0)':'translateX(14px)';
  document.getElementById('gailbl').textContent=checked?'ON':'OFF'; var gailbl_m=document.getElementById('gailbl_m');if(gailbl_m)gailbl_m.textContent=checked?'ON':'OFF'; var gaibg_m=document.getElementById('gaibg_m');if(gaibg_m)gaibg_m.style.background=checked?'#4caf50':'#e53935'; var gaiknob_m=document.getElementById('gaiknob_m');if(gaiknob_m)gaiknob_m.style.transform=checked?'translateX(0)':'translateX(14px)';  await post({action:'save_global_ai',global_ai:checked});
  var isHuman=!checked;
  for(var i=0;i<allC.length;i++){allC[i].human_active=isHuman;await post({action:'toggle_human',sender_id:allC[i].sender_id,page_id:allC[i].page_id,human_active:isHuman});}
  applyFilters();showToast(isHuman?'All AI OFF':'All AI ON',isHuman?'error':'success');
}

function toggleGAuto(checked){
  globalAuto=checked;
  document.getElementById('gautobg').style.background=checked?'#4caf50':'#ccc';
  document.getElementById('gautoknob').style.transform=checked?'translateX(14px)':'translateX(0)';
  document.getElementById('gautolbl').textContent=checked?'ON':'OFF'; var gautolbl_m=document.getElementById('gautolbl_m');if(gautolbl_m)gautolbl_m.textContent=checked?'ON':'OFF'; var gautobg_m=document.getElementById('gautobg_m');if(gautobg_m)gautobg_m.style.background=checked?'#4caf50':'#ccc'; var gautoknob_m=document.getElementById('gautoknob_m');if(gautoknob_m)gautoknob_m.style.transform=checked?'translateX(14px)':'translateX(0)';
  post({action:'save_global_auto',global_auto:checked});
}

async function checkAndAutoSend(conv,msg){
  if(!globalAuto)return;
  var ltxt=(msg.text||'').toLowerCase();
  var hasImg=msg.has_image||false;
  var match=suggestions.find(function(s){
    if(!s.auto_send)return false;
    if(s.condition==='has_image'&&!hasImg)return false;
    if(s.condition==='no_image'&&hasImg)return false;
    if(s.keywords){
      var kws=s.keywords.toLowerCase().split(',').map(function(k){return k.trim();}).filter(function(k){return k.length>0;});
      if(kws.length>0&&!kws.some(function(k){return ltxt.includes(k);}))return false;
    }
    return true;
  });
  if(!match)return;
  try{ await post({action:'reply',sender_id:conv.sender_id,page_id:conv.page_id,type:'text',message:match.text}); showToast('Auto reply sent','info'); }catch(e){}
}

function toggleGID(checked){
  globalID=checked;
  document.getElementById('gidbg').style.background=checked?'#1877f2':'#ccc';
  document.getElementById('gidknob').style.transform=checked?'translateX(14px)':'translateX(0)';
  document.getElementById('gidlbl').textContent=checked?'ON':'OFF'; var gidlbl_m=document.getElementById('gidlbl_m');if(gidlbl_m)gidlbl_m.textContent=checked?'ON':'OFF'; var gidbg_m=document.getElementById('gidbg_m');if(gidbg_m)gidbg_m.style.background=checked?'#1877f2':'#ccc'; var gidknob_m=document.getElementById('gidknob_m');if(gidknob_m)gidknob_m.style.transform=checked?'translateX(14px)':'translateX(0)';
  post({action:'save_global_id',global_id:checked});
}

function setMode(m){
  rmode=m;
  document.getElementById('ttab').classList.toggle('active',m==='text');
  document.getElementById('itab').classList.toggle('active',m==='image');
  if(document.getElementById('atab'))document.getElementById('atab').classList.toggle('active',m==='audio');
  document.getElementById('rinput').style.display=m==='text'?'block':'none';
  var ia=document.getElementById('imgarea');
  var aa=document.getElementById('audioarea');
  if(m==='image'){ia.classList.add('amode');document.getElementById('fiinput').click();}else ia.classList.remove('amode');
  if(aa)aa.style.display=m==='audio'?'flex':'none';
  if(m!=='audio')stopRecordingCleanup();
}

function handleFile(e){
  var f=e.target.files[0];if(!f)return;selFile=f;
  var r=new FileReader();r.onload=function(ev){var p=document.getElementById('iprev');p.src=ev.target.result;p.style.display='block';};r.readAsDataURL(f);
}
var ia=document.getElementById('imgarea');
ia.addEventListener('dragover',function(e){e.preventDefault();ia.classList.add('dov');});
ia.addEventListener('dragleave',function(){ia.classList.remove('dov');});
ia.addEventListener('drop',function(e){e.preventDefault();ia.classList.remove('dov');var f=e.dataTransfer.files[0];if(f){selFile=f;var r=new FileReader();r.onload=function(ev){var p=document.getElementById('iprev');p.src=ev.target.result;p.style.display='block';};r.readAsDataURL(f);}});

function f2b64(f){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result.split(',')[1]);};r.onerror=rej;r.readAsDataURL(f);});}

async function sendReply(){
  if(!selC)return;
  var sendConv=selC;
  var sendConvId=selC.userId;
  var showID=document.getElementById('idtog').checked;
  var payload={action:'reply',sender_id:sendConv.sender_id,page_id:sendConv.page_id};
  if(rmode==='text'){
    var txt=document.getElementById('rinput').value.trim();if(!txt)return;
    if(showID)txt=txt+'\n\nID: '+sendConv.sender_id;
    payload.type='text';payload.message=txt;
  }else{
    if(!selFile)return;
    var b64=await f2b64(selFile);payload.type='image';payload.image_data=b64;payload.image_name=selFile.name;payload.image_type=selFile.type;
  }
  var now=new Date();
  var me={role:'agent',text:payload.message||'(image)',image_url:'',has_image:rmode==='image',time:now.toISOString(),tag:'Human',sending:true};
  sendConv.messages=sendConv.messages||[];sendConv.messages.push(me);
  sendConv.last_message=me.text;sendConv.last_time=now.toISOString();
  var ci=allC.findIndex(function(c){return c.userId===sendConvId;});
  if(ci>=0){allC[ci]=sendConv;if(ci>0){var upd=allC.splice(ci,1)[0];allC.unshift(upd);}}
  if(selC&&selC.userId===sendConvId)renderMsgs(sendConv.messages||[]);
  var ri=document.getElementById('rinput');if(ri)ri.value='';
  selFile=null;
  var ip=document.getElementById('iprev');if(ip)ip.style.display='none';
  var fi=document.getElementById('fiinput');if(fi)fi.value='';
  setMode('text');
  renderList();updateStats();
  fetch(NB+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    .then(function(res){return res.json();})
    .then(function(data){
      me.sending=false;
      if(rmode==='image'&&data.image_url)me.image_url=data.image_url;
      if(selC&&selC.userId===sendConvId)renderMsgs(sendConv.messages||[]);
    })
    .catch(function(e){
      me.failed=true;
      if(selC&&selC.userId===sendConvId)renderMsgs(sendConv.messages||[]);
      showToast('Send failed','error');
    });
}

function openBulk(){var tgts=selIDs.size>0?allC.filter(function(c){return selIDs.has(c.userId);}):filtC;document.getElementById('binfo').textContent=tgts.length+' recipients';document.getElementById('bulkmodal').classList.add('open');}
function closeBulk(){document.getElementById('bulkmodal').classList.remove('open');}
async function sendBulk(){
  var txt=document.getElementById('bta').value.trim();if(!txt)return;
  var tgts=selIDs.size>0?allC.filter(function(c){return selIDs.has(c.userId);}):filtC;
  var btn=document.querySelector('.bsend');btn.disabled=true;btn.textContent='Sending...';
  var sent=0;
  for(var i=0;i<tgts.length;i++){try{await post({action:'reply',sender_id:tgts[i].sender_id,page_id:tgts[i].page_id,type:'text',message:txt});sent++;}catch(e){}await new Promise(function(r){setTimeout(r,300);});}
  btn.disabled=false;btn.textContent='Send All';closeBulk();document.getElementById('bta').value='';
  showToast(sent+'/'+tgts.length+' sent','success');
}

// TAG CATEGORY MANAGER
function openTCMgr(){renderTCMgr();document.getElementById('tcmgrmodal').classList.add('open');}
function closeTCMgr(){document.getElementById('tcmgrmodal').classList.remove('open');}
function renderTCMgr(){
  var list=document.getElementById('tcmgrlist');
  list.innerHTML='';
  tagCategories.forEach(function(cat){
    var div=document.createElement('div');div.className='tmgritem';
    div.innerHTML='<div class="tmgrname"><span style="background:'+cat.color+';color:#fff;padding:1px 7px;border-radius:8px;font-size:11px">'+cat.name+'</span></div><button class="tmgrdel" onclick="delTC('+cat.id+')">x</button>';
    list.appendChild(div);
  });
}
async function addTC(){
  var name=document.getElementById('tcname').value.trim();
  var color=document.getElementById('tccolor').value;
  if(!name)return;
  var res=await post({action:'add_tag_category',name:name,color:color});
  document.getElementById('tcname').value='';
  showToast('Category added','success');
  loadInbox(true);
}
async function delTC(id){
  if(!confirm('Delete this category?'))return;
  await post({action:'delete_tag_category',id:id});
  tagCategories=tagCategories.filter(function(c){return c.id!==id;});
  renderTCMgr();showToast('Deleted','info');
}

// ARCHIVED CONVERSATIONS
function openArchived(){document.getElementById('archivedmodal').classList.add('open');renderArchivedList();}
function closeArchived(){document.getElementById('archivedmodal').classList.remove('open');}
function renderArchivedList(){
  var list=document.getElementById('archivedlist');
  var archived=allC.filter(function(c){return c.archived;});
  if(!archived.length){list.innerHTML='<div style="text-align:center;color:#aaa;padding:16px;font-size:12px">No archived conversations</div>';return;}
  list.innerHTML='';
  archived.forEach(function(conv){
    var col=PC[conv.page_name]||'#888';
    var div=document.createElement('div');div.className='tmgritem';
    var unBtn=document.createElement('button');
    unBtn.style.cssText='padding:3px 8px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;font-size:10px;cursor:pointer;color:#2e7d32';
    unBtn.textContent='Unarchive';
    unBtn.onclick=(function(c){return function(){unarchiveConv(c.userId,c.sender_id,c.page_id);};})(conv);
    div.innerHTML='<div style="flex:1"><div style="font-size:12px;font-weight:500">'+(conv.contact&&conv.contact.name?conv.contact.name:conv.sender_id||'?')+'</div><div style="font-size:10px;color:#888">'+(conv.page_name||'')+'</div></div>';
    div.appendChild(unBtn);
    list.appendChild(div);
  });
}
async function unarchiveConv(userId, senderId, pageId){
  await post({action:'unarchive_conversation',sender_id:senderId,page_id:pageId});
  var i=allC.findIndex(function(c){return c.userId===userId;});
  if(i>=0)allC[i].archived=false;
  renderArchivedList();
  showToast('Unarchived','success');
}

function openTMgr(){
  // Populate category dropdown
  var sel=document.getElementById('tmgrcat');
  if(sel){
    sel.innerHTML='<option value="">No category</option>';
    tagCategories.forEach(function(cat){
      sel.innerHTML+='<option value="'+cat.name+'">'+cat.name+'</option>';
    });
  }
  renderTMgr();
  document.getElementById('tmgrmodal').classList.add('open');
}
function closeTMgr(){document.getElementById('tmgrmodal').classList.remove('open');}
function renderTMgr(){
  var df=document.getElementById('dfrom').value,dt=document.getElementById('dto').value;
  var tgt=allC;
  if(df||dt){tgt=allC.filter(function(c){if(df&&c.last_time<df)return false;if(dt&&c.last_time>dt+'T23:59:59')return false;return true;});}
  document.getElementById('tnote').textContent=tgt.length+' conversations'+(df||dt?' (filtered)':'');
  var cnt={};tgt.forEach(function(c){(c.tags||[]).forEach(function(t){cnt[t]=(cnt[t]||0)+1;});});
  var list=document.getElementById('tmgrlist');
  if(!globalTags.length){list.innerHTML='<div style="text-align:center;color:#aaa;padding:12px;font-size:12px">No tags</div>';return;}
  list.innerHTML='';

  function renderTagRow(gt){
    var t=gt.tag;
    var currentCat=tagCategories.find(function(c){return c.name===gt.category;});
    var catColor=currentCat?currentCat.color:'#e3f2fd';
    var catTextColor=currentCat?'#fff':'#1565c0';
    var catOpts='<option value="">No category</option>';
    tagCategories.forEach(function(cat){
      catOpts+='<option value="'+cat.name+'"'+(gt.category===cat.name?' selected':'')+'>'+cat.name+'</option>';
    });
    var div=document.createElement('div');div.className='tmgritem';
    var sel=document.createElement('select');
    sel.style.cssText='font-size:10px;padding:2px 5px;border:1px solid #ddd;border-radius:6px;margin:0 4px';
    sel.innerHTML=catOpts;
    sel.onchange=(function(tag){return function(){assignTagCategory(tag,this.value);};})(t);
    div.innerHTML='<div class="tmgrname"><span style="background:'+catColor+';color:'+catTextColor+';padding:1px 7px;border-radius:8px;font-size:11px">'+t+'</span><span class="tmgrcnt">'+(cnt[t]||0)+' convs</span></div>';
    div.appendChild(sel);
    var delBtn=document.createElement('button');delBtn.className='tmgrdel';delBtn.textContent='x';
    delBtn.onclick=(function(tag){return function(){delGTag(tag);};})(t);
    div.appendChild(delBtn);
    list.appendChild(div);
  }

  var grouped={};var nocat=[];
  globalTags.forEach(function(gt){
    if(gt.category){if(!grouped[gt.category])grouped[gt.category]=[];grouped[gt.category].push(gt);}
    else{nocat.push(gt);}
  });

  tagCategories.forEach(function(cat){
    if(!grouped[cat.name]||!grouped[cat.name].length)return;
    var header=document.createElement('div');
    header.style.cssText='padding:4px 8px;font-size:10px;font-weight:700;color:#fff;background:'+cat.color+';border-radius:6px;margin:6px 0 3px';
    header.textContent=cat.name;
    list.appendChild(header);
    grouped[cat.name].forEach(renderTagRow);
  });

  if(nocat.length){
    var header=document.createElement('div');
    header.style.cssText='padding:4px 8px;font-size:10px;font-weight:700;color:#888;border-radius:6px;margin:6px 0 3px';
    header.textContent='Uncategorized';
    list.appendChild(header);
    nocat.forEach(renderTagRow);
  }
}
async function addGTag(){
  var v=document.getElementById('tmgrin').value.trim();
  if(!v)return;
  var catEl=document.getElementById('tmgrcat');
  var cat=catEl?catEl.value:'';
  await post({action:'add_global_tag',tag:v,category:cat||null});
  globalTags.push({tag:v,category:cat||null});
  allTags.add(v);
  // Update local tagCategories if category selected
  if(cat){
    var catObj=tagCategories.find(function(c){return c.name===cat;});
    if(catObj){catObj.tags=catObj.tags||[];if(!catObj.tags.includes(v))catObj.tags.push(v);}
  }
  document.getElementById('tmgrin').value='';
  if(catEl)catEl.value='';
  renderTMgr();buildFilters();showToast('Tag: '+v,'success');
}

async function assignTagCategory(tag, categoryName){
  await post({action:'assign_tag_category',tag:tag,category:categoryName||null});
  // Update local globalTags
  var gt=globalTags.find(function(t){return t.tag===tag;});
  if(gt)gt.category=categoryName||null;
  // Update local tagCategories
  tagCategories.forEach(function(cat){
    if(cat.tags)cat.tags=cat.tags.filter(function(t){return t!==tag;});
  });
  if(categoryName){
    var cat=tagCategories.find(function(c){return c.name===categoryName;});
    if(cat){cat.tags=cat.tags||[];if(!cat.tags.includes(tag))cat.tags.push(tag);}
  }
  allTagCategories=tagCategories;
  renderTMgr();
  applyFilters();
  showToast('Category assigned','success');
}


async function delGTag(tag){
  if(!confirm('"'+tag+'" delete from all conversations?'))return;
  allC.forEach(function(c){if((c.tags||[]).includes(tag))c.tags=c.tags.filter(function(t){return t!==tag;});});
  allTags.delete(tag);
  globalTags=globalTags.filter(function(t){return t.tag!==tag;});
  await post({action:'delete_global_tag',tag:tag});
  if(selC){selC.tags=(selC.tags||[]).filter(function(t){return t!==tag;});renderChatTags();}
  renderTMgr();buildFilters();applyFilters();showToast('Deleted: '+tag,'info');
}

// SAVED MESSAGES
function openSavedMgr(){renderSavedMgr();document.getElementById('savedmgrmodal').classList.add('open');}
function closeSavedMgr(){editSMID=null;document.getElementById('savedmgradd').textContent='+ Add';document.getElementById('savedmgrmodal').classList.remove('open');}
function renderSavedMgr(){
  var list=document.getElementById('savedmgrlist');
  if(!savedMessages.length){list.innerHTML='<div style="text-align:center;color:#aaa;padding:12px;font-size:12px">No saved messages</div>';return;}
  list.innerHTML='';
  savedMessages.forEach(function(s){
    var div=document.createElement('div');div.className='smgritem';
    div.innerHTML='<div class="smgritop"><span class="smgricond">'+safeText(s.title||'Untitled')+'</span><div class="smgribtns"><button class="smgriedit" onclick="editSaved('+s.id+')">edit</button><button class="smgridel" onclick="delSaved('+s.id+')">x</button></div></div><div class="smgritext">'+safeText(s.text).split('\n').join('<br>')+'</div>';
    list.appendChild(div);
  });
}
function editSaved(id){
  var s=savedMessages.find(function(s){return s.id===id;});if(!s)return;
  editSMID=id;
  document.getElementById('savedtitle').value=s.title||'';
  document.getElementById('savedtext').value=s.text||'';
  document.getElementById('savedmgradd').textContent='Update';
  document.getElementById('savedtitle').focus();
}
async function addSaved(){
  var title=document.getElementById('savedtitle').value.trim();
  var txt=document.getElementById('savedtext').value.trim();
  if(!txt){showToast('Enter message text','error');return;}
  if(editSMID!==null){
    var idx=savedMessages.findIndex(function(s){return s.id===editSMID;});
    if(idx>=0){savedMessages[idx]={id:editSMID,title:title,text:txt};await post({action:'update_saved_message',id:editSMID,title:title,text:txt});}
    editSMID=null;document.getElementById('savedmgradd').textContent='+ Add';showToast('Updated','success');
  }else{
    var ns={id:Date.now(),title:title,text:txt};savedMessages.push(ns);
    await post({action:'add_saved_message',title:title,text:txt});showToast('Saved','success');
  }
  document.getElementById('savedtitle').value='';document.getElementById('savedtext').value='';renderSavedMgr();
}
async function delSaved(id){
  savedMessages=savedMessages.filter(function(s){return s.id!==id;});
  await post({action:'delete_saved_message',id:id});renderSavedMgr();showToast('Deleted','info');
}

function renderSavedBar(){
  var bar=document.getElementById('savedbar');
  if(!savedMessages.length){bar.querySelectorAll('.schip').forEach(function(c){c.remove();});bar.style.display='none';return;}
  bar.querySelectorAll('.schip').forEach(function(c){c.remove();});
  savedMessages.forEach(function(s){
    var btn=document.createElement('button');btn.className='schip';
    btn.textContent=s.title||(s.text.length>30?s.text.slice(0,30)+'...':s.text);
    btn.title=s.text;
    btn.onclick=function(){setMode('text');document.getElementById('rinput').value=s.text;document.getElementById('rinput').focus();};
    bar.appendChild(btn);
  });
}

function openSMgr(){renderSMgr();document.getElementById('smgrmodal').classList.add('open');}
function closeSMgr(){editSID=null;document.getElementById('smgradd').textContent='+ Add';document.getElementById('smgrmodal').classList.remove('open');}
function renderSMgr(){
  var list=document.getElementById('smgrlist');
  if(!suggestions.length){list.innerHTML='<div style="text-align:center;color:#aaa;padding:12px;font-size:12px">No suggestions</div>';return;}
  list.innerHTML='';
  suggestions.forEach(function(s){
    var div=document.createElement('div');div.className='smgritem';
    var autoTag=s.auto_send?'<span style="font-size:9px;background:#e8f5e9;color:#2e7d32;padding:1px 5px;border-radius:6px;margin-left:3px">Auto</span>':'';
    var cond=s.keywords?(s.keywords+' · '+s.condition):s.condition;
    var txt=s.text.split('\n').join('<br>');
    div.innerHTML='<div class="smgritop"><span class="smgricond">'+cond+autoTag+'</span><div class="smgribtns"><button class="smgriedit" onclick="editSugg('+s.id+')">edit</button><button class="smgridel" onclick="delSugg('+s.id+')">x</button></div></div><div class="smgritext">'+txt+'</div>';
    list.appendChild(div);
  });
}
function editSugg(id){
  var s=suggestions.find(function(s){return s.id===id;});if(!s)return;
  editSID=id;
  document.getElementById('smgrkw').value=s.keywords||'';
  var kwl=document.getElementById('smgrkwlogic');if(kwl)kwl.value=s.kw_logic||'or';
  document.getElementById('smgrcond').value=s.condition||'any';
  document.getElementById('smgrtext').value=s.text||'';
  document.getElementById('smgrauto').checked=s.auto_send||false;
  document.getElementById('smgradd').textContent='Update';
  document.getElementById('smgrkw').focus();
}
async function addSugg(){
  var kw=document.getElementById('smgrkw').value.trim();
  var cond=document.getElementById('smgrcond').value;
  if(!cond)cond='any';
  var txt=document.getElementById('smgrtext').value.trim();
  if(!txt){showToast('Enter text','error');return;}
  var autoSend=document.getElementById('smgrauto').checked;
  var kwl=document.getElementById('smgrkwlogic');
  var kwLogic=kwl?kwl.value:'or';
  if(editSID!==null){
    var idx=suggestions.findIndex(function(s){return s.id===editSID;});
    if(idx>=0){suggestions[idx]={id:editSID,keywords:kw,kw_logic:kwLogic,condition:cond,text:txt,auto_send:autoSend};await post({action:'update_suggestion',suggestion:suggestions[idx]});}
    editSID=null;document.getElementById('smgradd').textContent='+ Add';showToast('Updated','success');
  }else{
    var ns={id:Date.now(),keywords:kw,kw_logic:kwLogic,condition:cond,text:txt,auto_send:autoSend};suggestions.push(ns);
    await post({action:'add_suggestion',suggestion:ns});showToast('Saved','success');
  }
  document.getElementById('smgrkw').value='';document.getElementById('smgrtext').value='';renderSMgr();
}
async function delSugg(id){
  suggestions=suggestions.filter(function(s){return s.id!==id;});
  await post({action:'delete_suggestion',id:id});renderSMgr();showToast('Deleted','info');
}

function renderSB(conv){
  var bar=document.getElementById('suggbar');
  var lm=(conv.messages||[]).filter(function(m){return m.role==='customer';}).slice(-1)[0];
  if(!lm){bar.classList.remove('vis');bar.innerHTML='';return;}
  var ltxt=(lm.text||'').toLowerCase(),hasImg=lm.has_image||false;
  var matches=suggestions.filter(function(s){
    if(s.condition==='has_image'&&!hasImg)return false;
    if(s.condition==='no_image'&&hasImg)return false;
    if(s.keywords&&s.keywords.trim()){
      var kws=s.keywords.toLowerCase().split(',').map(function(k){return k.trim();}).filter(function(k){return k.length>0;});
      if(kws.length>0){
        var kwMatch=s.kw_logic==='and'?kws.every(function(k){return ltxt.includes(k);}):kws.some(function(k){return ltxt.includes(k);});
        if(!kwMatch)return false;
      }
    }
    return true;
  });
  if(!matches.length){bar.classList.remove('vis');bar.innerHTML='';return;}
  bar.innerHTML='';
  matches.forEach(function(s){
    var btn=document.createElement('button');btn.className='schip';
    btn.textContent=s.text.length>60?s.text.slice(0,60)+'...':s.text;
    btn.onclick=function(){setMode('text');document.getElementById('rinput').value=s.text;document.getElementById('rinput').focus();};
    bar.appendChild(btn);
  });
  bar.classList.add('vis');
}

function toggleChatPanel(){
  var panel=document.getElementById('chatpanel');
  if(!panel)return;
  var isOpen=panel.style.display==='flex';
  panel.style.display=isOpen?'none':'flex';
}

function goBack(){
  document.getElementById('chatarea').classList.remove('active');
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('topbar').style.display='';
  selC=null;
  document.getElementById('estate').style.display='flex';
  document.getElementById('chatview').style.display='none';
}
function toggleFP(){var p=document.getElementById('fpanel'),i=document.getElementById('fticon');var col=p.classList.contains('collapsed');p.classList.toggle('collapsed',!col);i.textContent=col?'▲':'▼';}
function initMobile(){if(window.innerWidth<=700){document.getElementById('fpanel').classList.add('collapsed');document.getElementById('ftbar').style.display='flex';}}
function showToast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast '+type;t.style.display='block';setTimeout(function(){t.style.display='none';},3000);}

document.getElementById('rinput').addEventListener('keydown',function(e){
  if(e.key==='Enter'&&!e.shiftKey){
    if(window.innerWidth>700){e.preventDefault();sendReply();}
  }
});
document.addEventListener('click',function(e){if(!e.target.closest('.twrap'))document.getElementById('tsugg').style.display='none';if(!e.target.closest('#savedbar')&&!e.target.closest('#savedtab')){var sb=document.getElementById('savedbar');if(sb){sb.style.display='none';sb.classList.remove('vis');}}});
window.addEventListener('popstate',function(){if(selC)goBack();});

// Supabase Realtime
var SUPABASE_URL='https://bkdbqpjourrnjbfrqedi.supabase.co';
var SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGJxcGpvdXJybmpiZnJxZWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDI1MTQsImV4cCI6MjA5NTk3ODUxNH0.QRs2c-69GX1XbStIIJSCpBGD-C98gVfnd8pJws3m4fQ';

// Mobile controls toggle
function toggleMobileControls(){
  var panel=document.getElementById('mobilecontrols');
  if(!panel)return;
  var isOpen=panel.style.display==='flex';
  panel.style.display=isOpen?'none':'flex';
}

document.addEventListener('click',function(e){
  var panel=document.getElementById('mobilecontrols');
  if(!panel)return;
  if(!e.target.closest('.mobile-ctrl-btn')&&!e.target.closest('#mobilecontrols')){
    panel.style.display='none';
  }
});

initMobile();loadInbox(true);

function handleNewMessage(payload){
  var msg=payload.new;
  if(!msg||!msg.user_id)return;
  if(msg.role==='agent')return;
  var conv=allC.find(function(c){return c.user_id===msg.user_id;});
  if(!conv)return;
  conv.messages=conv.messages||[];
  var exists=conv.messages.some(function(m){return m.id===msg.id;});
  if(exists)return;
  conv.messages.push(msg);
  conv.last_message=msg.text||conv.last_message;
  conv.last_time=msg.time||conv.last_time;
  if(msg.role==='customer'&&msg.tag!=='reaction'){
    conv.unread=true;
    if(snd)snd();
    if(globalAuto)checkAndAutoSend(conv,msg);
  }
  applyFilters();updateStats();
  if(selC&&selC.user_id===msg.user_id){selC=conv;renderMsgs(conv.messages);renderSB(conv);}
}

if(window.supabase){
  var sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  sb.channel('inbox-changes')
    .on('postgres_changes',{event:'*',schema:'public',table:'conversations'},function(payload){handleConvChange(payload);})
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},handleNewMessage)
    .subscribe();
}else{
  setInterval(function(){loadInbox(true);},10000);
}

// ORDER STATUS
var orderStatuses=[];
var aOSF=null;

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
  applyFilters();
}

async function setConvOrderStatus(val){
  if(!selC)return;
  selC.order_status=val||null;
  var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC[i].order_status=val||null;
  await post({action:'set_order_status',sender_id:selC.sender_id,page_id:selC.page_id,user_ids:[selC.userId],order_status:val||null});
  renderList();showToast('Status updated','success');
}

function openOSMgr(){renderOSMgr();document.getElementById('osmgrmodal').classList.add('open');}
function closeOSMgr(){document.getElementById('osmgrmodal').classList.remove('open');}
function renderOSMgr(){
  var list=document.getElementById('osmgrlist');
  if(!orderStatuses.length){list.innerHTML='<div style="text-align:center;color:#aaa;padding:12px;font-size:12px">No statuses</div>';return;}
  list.innerHTML='';
  orderStatuses.forEach(function(os){
    var div=document.createElement('div');div.className='tmgritem';
    div.innerHTML='<div class="tmgrname"><span style="background:'+os.color+';color:#fff;padding:1px 7px;border-radius:8px;font-size:11px">'+os.name+'</span></div><button class="tmgrdel" onclick="delOS('+os.id+')">x</button>';
    list.appendChild(div);
  });
}
async function addOS(){
  var name=document.getElementById('osname').value.trim();
  var color=document.getElementById('oscolor').value;
  if(!name)return;
  await post({action:'add_order_status',name:name,color:color});
  orderStatuses.push({id:Date.now(),name:name,color:color});
  document.getElementById('osname').value='';
  buildOSFilter();renderOSMgr();showToast('Status added','success');
  loadInbox(true);
}
async function delOS(id){
  if(!confirm('Delete this status?'))return;
  await post({action:'delete_order_status',id:id});
  orderStatuses=orderStatuses.filter(function(o){return o.id!==id;});
  buildOSFilter();renderOSMgr();showToast('Deleted','info');
}

function openBulkOS(){
  var tgts=selIDs.size>0?allC.filter(function(c){return selIDs.has(c.userId);}):filtC;
  document.getElementById('bosinfo').textContent=tgts.length+' conversations';
  var sel=document.getElementById('bosselect');
  sel.innerHTML='<option value="">No status</option>';
  orderStatuses.forEach(function(os){sel.innerHTML+='<option value="'+os.name+'">'+os.name+'</option>';});
  document.getElementById('bulkosmodal').classList.add('open');
}
function closeBulkOS(){document.getElementById('bulkosmodal').classList.remove('open');}
async function applyBulkOS(){
  var val=document.getElementById('bosselect').value;
  var tgts=selIDs.size>0?allC.filter(function(c){return selIDs.has(c.userId);}):filtC;
  var uids=tgts.map(function(c){return c.userId;});
  tgts.forEach(function(c){c.order_status=val||null;var i=allC.findIndex(function(a){return a.userId===c.userId;});if(i>=0)allC[i].order_status=val||null;});
  await post({action:'set_order_status',sender_id:'bulk',page_id:'bulk',user_ids:uids,order_status:val||null});
  closeBulkOS();renderList();showToast(tgts.length+' updated','success');
}

function toggleSavedBar(){
  var bar=document.getElementById('savedbar');
  var isOpen=bar.classList.contains('vis');
  if(isOpen){bar.classList.remove('vis');bar.style.display='none';return;}
  var search=document.getElementById('savedsearch');if(search)search.value='';
  filterSavedBar();
  bar.classList.add('vis');
  bar.style.display='flex';
}

function filterSavedBar(){
  var bar=document.getElementById('savedbar');
  var search=document.getElementById('savedsearch');
  var v=search?search.value.toLowerCase():'';
  var filtered=savedMessages.filter(function(s){return !v||(s.title||'').toLowerCase().includes(v)||(s.text||'').toLowerCase().includes(v);});
  var chips=bar.querySelectorAll('.schip');
  chips.forEach(function(c){c.remove();});
  filtered.forEach(function(s){
    var btn=document.createElement('button');btn.className='schip';
    btn.textContent=s.title||(s.text.length>30?s.text.slice(0,30)+'...':s.text);
    btn.title=s.text;
    btn.onclick=function(){setMode('text');document.getElementById('rinput').value=s.text;document.getElementById('rinput').focus();bar.style.display='none';};
    bar.appendChild(btn);
  });
}

function handleConvChange(payload){
  var updated=payload.new;
  if(!updated||!updated.user_id)return;
  var i=allC.findIndex(function(c){return c.user_id===updated.user_id;});
  if(i>=0){
    var existing=allC[i];
    updated.userId=updated.user_id;
    updated.messages=existing.messages||[];
    updated.tags=existing.tags||[];
    updated.contact=existing.contact||{};
    updated._msgsLoaded=existing._msgsLoaded||false;
    allC[i]=updated;
    if(selC&&selC.userId===updated.user_id)selC=updated;
  }else{
    updated.userId=updated.user_id;
    updated.messages=[];
    updated.tags=[];
    updated.contact={};
    allC.unshift(updated);
  }
  applyFilters();updateStats();
}

// AUDIO RECORDING
var mediaRecorder=null, audioChunks=[], audioBlob=null, isRecording=false;

function stopRecordingCleanup(){
  if(mediaRecorder&&mediaRecorder.state!=='inactive'){
    mediaRecorder.stop();
  }
  isRecording=false;
  audioBlob=null;
  audioChunks=[];
  var recbtn=document.getElementById('recbtn');
  var recstatus=document.getElementById('recstatus');
  var audioprev=document.getElementById('audioprev');
  if(recbtn){recbtn.style.background='#e53935';recbtn.textContent='🎤';}
  if(recstatus)recstatus.textContent='Tap to record';
  if(audioprev)audioprev.style.display='none';
}

async function toggleRecording(){
  if(isRecording){
    mediaRecorder.stop();
    isRecording=false;
    document.getElementById('recbtn').style.background='#e53935';
    document.getElementById('recbtn').textContent='🎤';
    document.getElementById('recstatus').textContent='Processing...';
  } else {
    try{
      var stream=await navigator.mediaDevices.getUserMedia({audio:true});
      audioChunks=[];
      mediaRecorder=new MediaRecorder(stream);
      mediaRecorder.ondataavailable=function(e){if(e.data.size>0)audioChunks.push(e.data);};
      mediaRecorder.onstop=function(){
        audioBlob=new Blob(audioChunks,{type:'audio/ogg; codecs=opus'});
        var url=URL.createObjectURL(audioBlob);
        var ap=document.getElementById('audioplayback');
        ap.src=url;
        document.getElementById('audioprev').style.display='flex';
        document.getElementById('recstatus').textContent='Ready to send';
        stream.getTracks().forEach(function(t){t.stop();});
      };
      mediaRecorder.start();
      isRecording=true;
      document.getElementById('recbtn').style.background='#888';
      document.getElementById('recbtn').textContent='⏹';
      document.getElementById('recstatus').textContent='Recording...';
      document.getElementById('audioprev').style.display='none';
    }catch(e){
      showToast('Microphone access denied','error');
    }
  }
}

function discardAudio(){
  stopRecordingCleanup();
}

async function sendAudio(){
  if(!audioBlob||!selC)return;
  var sendConv=selC;
  var sendConvId=selC.userId;
  var btn=document.querySelector('#audioarea button:last-child');
  if(btn)btn.textContent='Sending...';
  try{
    var arrayBuffer=await audioBlob.arrayBuffer();
    var uint8=new Uint8Array(arrayBuffer);
    var binary='';
    for(var i=0;i<uint8.length;i++)binary+=String.fromCharCode(uint8[i]);
    var base64=btoa(binary);
    var res=await fetch(NB+'/action',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        action:'reply',
        sender_id:sendConv.sender_id,
        page_id:sendConv.page_id,
        type:'audio',
        audio_data:base64,
        audio_type:'audio/ogg'
      })
    });
    var data=await res.json();
    if(data.success){
      var now=new Date();
      var me={role:'agent',text:'(voice message)',has_audio:true,audio_url:'',time:now.toISOString(),tag:'Human',sending:false};
      sendConv.messages=sendConv.messages||[];sendConv.messages.push(me);
      sendConv.last_message='(voice message)';sendConv.last_time=now.toISOString();
      if(selC&&selC.userId===sendConvId)renderMsgs(sendConv.messages||[]);
      setMode('text');
      showToast('Voice sent','success');
    } else {
      showToast('Send failed','error');
      if(btn)btn.textContent='Send ✓';
    }
  }catch(e){
    showToast('Send failed','error');
    if(btn)btn.textContent='Send ✓';
  }
}
