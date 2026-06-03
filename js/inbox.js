var NB = window.location.origin + '/webhook';
var PC = {'A1':'#1877f2','A2':'#0d8a6f','4.0':'#7c3aed','Bag Xpress':'#ea580c','5.0':'#d97706','6.0':'#db2777','8.0':'#64748b','Unknown':'#888'};
var allC=[], filtC=[], selC=null, rmode='text', selFile=null;
var aPF='all', aTF=new Set(), aSF=new Set(), selIDs=new Set(), allTags=new Set();
var sortOrd='asc', globalAI=true, globalID=false, globalAuto=true;
var snd=null, lastCnt=0;
var suggestions=[], editSID=null;

document.addEventListener('click', function(){ 
  try{ var ctx=new(window.AudioContext||window.webkitAudioContext)(); snd=function(){var o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.setValueAtTime(0.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}; }catch(e){}
}, {once:true});

function post(data){ return fetch(NB+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); }

async function loadInbox(silent){
  try{
    var res=await fetch(NB+'/inbox-data');
    var data=await res.json();
    // Map Supabase user_id to userId for compatibility
    if(data.conversations){
      data.conversations=data.conversations.map(function(c){
        c.userId=c.user_id;
        return c;
      });
    }
    var nc=data.conversations||[];
    if(lastCnt>0&&nc.length>0){
      nc.forEach(function(n){
        var o=allC.find(function(c){return c.userId===n.userId;});
        var prevLen=o?(o.messages||[]).length:0;
        var newLen=(n.messages||[]).length;
        if(newLen>prevLen){
          var newMsgs=(n.messages||[]).slice(prevLen);
          // Sound only for real customer messages (not echo, reaction, system)
          var hasRealCustomerMsg=newMsgs.some(function(m){
            return m.role==='customer' && m.tag!=='reaction';
          });
          if(hasRealCustomerMsg&&snd)snd();
          // Auto send check
          if(globalAuto){
            newMsgs.forEach(function(m){
              if(m.role==='customer'&&m.tag!=='reaction'){
                checkAndAutoSend(n,m);
              }
            });
          }
        }
      });
    }
    lastCnt=nc.length;
    nc.forEach(function(n){
      var ex=allC.find(function(c){return c.userId===n.userId;});
      if(ex){n.human_active=ex.human_active;n.notes=ex.notes!==undefined?ex.notes:n.notes;if(ex.id_tag!==undefined)n.id_tag=ex.id_tag;}
    });
    allC=nc;
    if(data.suggestions)suggestions=data.suggestions;
    if(data.global_ai!==undefined){
      globalAI=data.global_ai;
      document.getElementById('gai').checked=globalAI;
      document.getElementById('gaibg').style.background=globalAI?'#4caf50':'#e53935';
      document.getElementById('gaiknob').style.transform=globalAI?'translateX(0)':'translateX(14px)';
      document.getElementById('gailbl').textContent=globalAI?'ON':'OFF';
    }
    if(data.global_id!==undefined){
      globalID=data.global_id;
      document.getElementById('gid').checked=globalID;
      document.getElementById('gidbg').style.background=globalID?'#1877f2':'#ccc';
      document.getElementById('gidknob').style.transform=globalID?'translateX(14px)':'translateX(0)';
      document.getElementById('gidlbl').textContent=globalID?'ON':'OFF';
    }
    if(data.global_auto!==undefined){
      globalAuto=data.global_auto;
      document.getElementById('gauto').checked=globalAuto;
      document.getElementById('gautobg').style.background=globalAuto?'#4caf50':'#ccc';
      document.getElementById('gautoknob').style.transform=globalAuto?'translateX(14px)':'translateX(0)';
      document.getElementById('gautolbl').textContent=globalAuto?'ON':'OFF';
    }
    allC.forEach(function(c){(c.tags||[]).forEach(function(t){allTags.add(t);});});
    buildFilters(); applyFilters(); updateStats();
    if(!silent){document.getElementById('rfbtn').textContent='✅ Fetched';setTimeout(function(){document.getElementById('rfbtn').textContent='🔄 Refresh';},2000);}
    if(selC){
      var upd=allC.find(function(c){return c.userId===selC.userId;});
      if(upd){var pl=(selC.messages||[]).length;selC=upd;if((upd.messages||[]).length>pl){renderMsgs(upd.messages||[]);renderSB(upd);}}
    }
  }catch(e){
    if(!silent){document.getElementById('rfbtn').textContent='❌ Failed';setTimeout(function(){document.getElementById('rfbtn').textContent='🔄 Refresh';},2000);}
  }
}

function manualRefresh(){document.getElementById('rfbtn').textContent='⏳...';loadInbox(false);}

function updateStats(){
  var u=allC.filter(function(c){return c.unread;}).length;
  var a=allC.filter(function(c){return isUnan(c);}).length;
  var h=allC.filter(function(c){return c.human_active;}).length;
  document.getElementById('stats').textContent=allC.length+' | '+u+' unread | '+a+' unan | '+h+' H';
}

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

function updateBulkBtn(){var btn=document.getElementById('bbtn');var cnt=selIDs.size>0?selIDs.size:filtC.length;if(cnt>0){btn.classList.add('show');btn.textContent='📢 Bulk ('+cnt+')';}else btn.classList.remove('show');}

function ts(iso){if(!iso)return '';var d=Math.floor((Date.now()-new Date(iso))/60000);if(d<1)return 'এখনই';if(d<60)return d+'মি';if(d<1440)return Math.floor(d/60)+'ঘ';return Math.floor(d/1440)+'দি';}

function renderList(){
  var list=document.getElementById('clist');
  if(!filtC.length){list.innerHTML='<div class="noconv">কোনো conversation নেই</div>';return;}
  list.innerHTML='';
  filtC.forEach(function(conv){
    var col=PC[conv.page_name]||'#888';
    var init=(conv.sender_id||'').slice(-4);
    var bc=conv.unread?'bunread':isUnan(conv)?'bunan':'bread';
    var tags=conv.tags||[];
    var div=document.createElement('div');
    div.className='citem'+(selC&&selC.userId===conv.userId?' active':'')+(selIDs.has(conv.userId)?' selected':'');
    var th='';
    tags.forEach(function(t){th+='<span class="ctag" data-uid="'+conv.userId+'" data-tag="'+t+'">'+t+' <span class="tdel" style="cursor:pointer;font-weight:bold;opacity:0.7">x</span></span>';});
    var hi=conv.human_active?'<span class="hind">H</span>':'';
    var ni=conv.notes?'<span class="nind">📝</span>':'';
    div.innerHTML='<input type="checkbox" class="cchk"'+(selIDs.has(conv.userId)?' checked':'')+' onclick="toggleSel(event,\''+conv.userId+'\')">'
      +'<div class="av" style="background:'+col+'">'+init+'<div class="avbdg '+bc+'"></div></div>'
      +'<div class="cinfo"><div class="ctop"><span class="cname'+(conv.unread?' bold':'')+'">'+(conv.sender_id||'?')+hi+ni+'</span><span class="ctime">'+ts(conv.last_time)+'</span></div>'
      +'<div><span class="cpbdg" style="background:'+col+'">'+(conv.page_name||'?')+'</span></div>'
      +'<div class="cprev">'+(conv.has_image?'📷 ':'')+( conv.last_message||'')+'</div>'
      +'<div class="ctags">'+th+'</div></div>';
    div.addEventListener('click',function(e){if(e.target.type!=='checkbox')selectConv(conv);});
    list.appendChild(div);
  });
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
  document.getElementById('chname').textContent=conv.sender_id||'?';
  var nm=conv.notes&&conv.notes.trim()?' | 📝 Note':'';
  document.getElementById('chmeta').textContent='Page: '+(conv.page_name||'?')+' | ID: '+(conv.page_id||'')+' | '+ts(conv.last_time)+' ago'+nm;
  var ht=document.getElementById('htog');ht.checked=conv.human_active||false;
  document.getElementById('htbg').style.background=conv.human_active?'#e53935':'#ccc';
  document.getElementById('htknob').style.transform=conv.human_active?'translateX(14px)':'translateX(0)';
  var indID=conv.id_tag!==undefined?conv.id_tag:globalID;
  document.getElementById('idtog').checked=indID;
  document.getElementById('idtbg').style.background=indID?'#1877f2':'#ccc';
  document.getElementById('idtknob').style.transform=indID?'translateX(14px)':'translateX(0)';
  document.getElementById('nota').value=conv.notes||'';
  // Clear reply box
  document.getElementById('rinput').value='';
  selFile=null;
  document.getElementById('iprev').style.display='none';
  document.getElementById('fiinput').value='';
  setMode('text');
  renderMsgs(conv.messages||[]);renderChatTags();renderSB(conv);applyFilters();
  if(window.innerWidth<=700){document.getElementById('sidebar').classList.add('hidden');document.getElementById('chatarea').classList.add('active');history.pushState({chatOpen:true},'');}
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

    // Quote reply
    if(m.reply_to_mid){
      var quoted=msgs.find(function(q){return q.mid===m.reply_to_mid;});
      if(quoted){
        var qcontent='';
        if(quoted.has_image&&quoted.image_url){
          qcontent='<img src="'+quoted.image_url+'" style="max-height:40px;border-radius:4px;display:block;margin-bottom:2px">'+(quoted.text&&quoted.text!=='(image)'?'<span>'+safeText(quoted.text)+'</span>':'');
        } else if(quoted.has_audio){
          qcontent='🎵 (audio)';
        } else if(quoted.has_video){
          qcontent='🎬 (video)';
        } else if(quoted.is_like){
          qcontent='❤️';
        } else if(quoted.is_sticker){
          qcontent='<img src="'+quoted.sticker_url+'" style="max-height:30px">';
        } else {
          qcontent=safeText(quoted.text||'');
        }
        content+='<div style="background:rgba(0,0,0,0.08);border-left:3px solid #1877f2;padding:4px 8px;border-radius:6px;margin-bottom:4px;font-size:11px;color:#555;max-width:100%">'+qcontent+'</div>';
      }
    }

    // Image
    if(m.has_image&&m.image_url){
      content+='<img src="'+m.image_url+'" class="mimg" loading="lazy" onclick="openLB(this.src)" alt="img">';
      if(m.text&&m.text!=='(image)')content+='<div style="margin-top:4px">'+nl2br(safeText(m.text))+'</div>';
    }
    // Audio
    else if(m.has_audio&&m.audio_url){
      content+='<audio controls style="max-width:200px;margin:4px 0"><source src="'+m.audio_url+'"></audio>';
    }
    // Video
    else if(m.has_video&&m.video_url){
      content+='<video controls style="max-width:200px;border-radius:8px;margin:4px 0"><source src="'+m.video_url+'"></video>';
    }
    // Sticker
    else if(m.is_sticker&&m.sticker_url){
      content+='<img src="'+m.sticker_url+'" style="max-width:80px;border-radius:4px" alt="sticker">';
    }
    // Like
    else if(m.is_like){
      content+='<span style="font-size:28px">❤️</span>';
    }
    // Share/Link
    else if(m.share_url){
      content+='<a href="'+m.share_url+'" target="_blank" style="display:block;background:#f0f7ff;border:1px solid #90caf9;border-radius:8px;padding:8px;color:#1565c0;font-size:12px;text-decoration:none;max-width:200px">'+(m.share_title||m.share_url)+'<div style="font-size:10px;color:#888;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+m.share_url+'</div></a>';
    }
    // Location
    else if(m.location_lat){
      content+='<a href="https://maps.google.com/?q='+m.location_lat+','+m.location_lng+'" target="_blank" style="display:block;background:#f0f7ff;border:1px solid #90caf9;border-radius:8px;padding:8px;color:#1565c0;font-size:12px;text-decoration:none">📍 Location<div style="font-size:10px;color:#888">Tap to open maps</div></a>';
    }
    // Text
    else{
      content+=nl2br(safeText(m.text||''));
    }

    var tb=m.tag==='AI'?'<span class="aitag">AI</span>':m.tag==='Human'?'<span class="hutag">Human</span>':m.tag==='reaction'?'<span style="font-size:9px;background:#fff3e0;color:#e65100;padding:1px 5px;border-radius:6px">reaction</span>':'';
    var tstr=m.time?new Date(m.time).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):'';
    var statusTxt=m.failed?'<span style="color:#e53935;font-size:9px">Failed</span>':m.sending?'<span style="color:#aaa;font-size:9px">Sending...</span>':'';

    var ids=showID&&m.role==='agent'&&selC?'<div class="mid">ID: '+selC.sender_id+'</div>':'';

    var quoteBtn='';

    div.innerHTML='<div class="mbubble">'+content+'</div><div class="mmeta">'+tstr+' '+tb+' '+statusTxt+quoteBtn+'</div>'+ids;
    area.appendChild(div);
  });
  area.scrollTop=area.scrollHeight;
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
  var nm=selC.notes&&selC.notes.trim()?' | 📝 Note':'';
  var cm=document.getElementById('chmeta').textContent.split(' | 📝 Note').join('');
  document.getElementById('chmeta').textContent=cm+nm;
  showToast('📝 Note saved','success');applyFilters();
}

function showTS(){
  var v=document.getElementById('tinput').value.toLowerCase();
  var box=document.getElementById('tsugg');
  if(!v){box.style.display='none';return;}
  var m=Array.from(allTags).filter(function(t){return t.toLowerCase().includes(v);});
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
  inp.value='';document.getElementById('tsugg').style.display='none';renderChatTags();buildFilters();applyFilters();showToast('✓ Tag: '+tag,'success');
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
  showToast(on?'🔴 Human ON':'🤖 AI ON',on?'error':'success');applyFilters();
}

async function toggleGAI(checked){
  globalAI=checked;
  document.getElementById('gaibg').style.background=checked?'#4caf50':'#e53935';
  document.getElementById('gaiknob').style.transform=checked?'translateX(0)':'translateX(14px)';
  document.getElementById('gailbl').textContent=checked?'ON':'OFF';
  await post({action:'save_global_ai',global_ai:checked});
  var isHuman=!checked;
  for(var i=0;i<allC.length;i++){allC[i].human_active=isHuman;await post({action:'toggle_human',sender_id:allC[i].sender_id,page_id:allC[i].page_id,human_active:isHuman});}
  applyFilters();showToast(isHuman?'🔴 সব AI বন্ধ':'🤖 সব AI চালু',isHuman?'error':'success');
}

function toggleGAuto(checked){
  globalAuto=checked;
  document.getElementById('gautobg').style.background=checked?'#4caf50':'#ccc';
  document.getElementById('gautoknob').style.transform=checked?'translateX(14px)':'translateX(0)';
  document.getElementById('gautolbl').textContent=checked?'ON':'OFF';
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
  // Send auto reply
  try{
    await post({action:'reply',sender_id:conv.sender_id,page_id:conv.page_id,type:'text',message:match.text});
    showToast('🤖 Auto reply sent','info');
  }catch(e){}
}

function toggleGID(checked){
  globalID=checked;
  document.getElementById('gidbg').style.background=checked?'#1877f2':'#ccc';
  document.getElementById('gidknob').style.transform=checked?'translateX(14px)':'translateX(0)';
  document.getElementById('gidlbl').textContent=checked?'ON':'OFF';
  post({action:'save_global_id',global_id:checked});
}

function setMode(m){
  rmode=m;
  document.getElementById('ttab').classList.toggle('active',m==='text');
  document.getElementById('itab').classList.toggle('active',m==='image');
  document.getElementById('rinput').style.display=m==='text'?'block':'none';
  var ia=document.getElementById('imgarea');
  if(m==='image'){ia.classList.add('amode');document.getElementById('fiinput').click();}else ia.classList.remove('amode');
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
  var me={role:'agent',text:payload.message||'(ছবি)',image_url:'',has_image:rmode==='image',time:now.toISOString(),tag:'Human',sending:true};
  // Local update immediately
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
  applyFilters();
  // Send to server in background
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
      showToast('❌ Send failed','error');
    });
}

function openBulk(){var tgts=selIDs.size>0?allC.filter(function(c){return selIDs.has(c.userId);}):filtC;document.getElementById('binfo').textContent=tgts.length+' জন কে message যাবে';document.getElementById('bulkmodal').classList.add('open');}
function closeBulk(){document.getElementById('bulkmodal').classList.remove('open');}
async function sendBulk(){
  var txt=document.getElementById('bta').value.trim();if(!txt)return;
  var tgts=selIDs.size>0?allC.filter(function(c){return selIDs.has(c.userId);}):filtC;
  var btn=document.querySelector('.bsend');btn.disabled=true;btn.textContent='Sending...';
  var sent=0;
  for(var i=0;i<tgts.length;i++){try{await post({action:'reply',sender_id:tgts[i].sender_id,page_id:tgts[i].page_id,type:'text',message:txt});sent++;}catch(e){}await new Promise(function(r){setTimeout(r,300);});}
  btn.disabled=false;btn.textContent='Send All';closeBulk();document.getElementById('bta').value='';
  showToast('✓ '+sent+'/'+tgts.length+' sent','success');
}

function openTMgr(){renderTMgr();document.getElementById('tmgrmodal').classList.add('open');}
function closeTMgr(){document.getElementById('tmgrmodal').classList.remove('open');}
function renderTMgr(){
  var df=document.getElementById('dfrom').value,dt=document.getElementById('dto').value;
  var tgt=allC;
  if(df||dt){tgt=allC.filter(function(c){if(df&&c.last_time<df)return false;if(dt&&c.last_time>dt+'T23:59:59')return false;return true;});}
  document.getElementById('tnote').textContent=tgt.length+' conversations'+(df||dt?' (date filtered)':'');
  var cnt={};tgt.forEach(function(c){(c.tags||[]).forEach(function(t){cnt[t]=(cnt[t]||0)+1;});});
  var all=Array.from(allTags).sort();
  var list=document.getElementById('tmgrlist');
  if(!all.length){list.innerHTML='<div style="text-align:center;color:#aaa;padding:12px;font-size:12px">কোনো tag নেই</div>';return;}
  list.innerHTML='';
  all.forEach(function(t){
    var div=document.createElement('div');div.className='tmgritem';
    div.innerHTML='<div class="tmgrname"><span style="background:#e3f2fd;color:#1565c0;padding:1px 7px;border-radius:8px;font-size:11px">'+t+'</span><span class="tmgrcnt">'+(cnt[t]||0)+' convs</span></div><button class="tmgrdel" onclick="delGTag(\''+t+'\')">×</button>';
    list.appendChild(div);
  });
}
function addGTag(){var v=document.getElementById('tmgrin').value.trim();if(!v)return;allTags.add(v);document.getElementById('tmgrin').value='';renderTMgr();buildFilters();showToast('✓ Tag: '+v,'success');}
async function delGTag(tag){
  if(!confirm('"'+tag+'" সব conversation থেকে delete করবে?'))return;
  allC.forEach(function(c){if((c.tags||[]).includes(tag))c.tags=c.tags.filter(function(t){return t!==tag;});});
  allTags.delete(tag);
  await post({action:'delete_global_tag',tag:tag});
  if(selC){selC.tags=(selC.tags||[]).filter(function(t){return t!==tag;});renderChatTags();}
  renderTMgr();buildFilters();applyFilters();showToast('🗑️ Deleted: '+tag,'info');
}

function openSMgr(){renderSMgr();document.getElementById('smgrmodal').classList.add('open');}
function closeSMgr(){editSID=null;document.getElementById('smgradd').textContent='+ Add';document.getElementById('smgrmodal').classList.remove('open');}
function renderSMgr(){
  var list=document.getElementById('smgrlist');
  if(!suggestions.length){list.innerHTML='<div style="text-align:center;color:#aaa;padding:12px;font-size:12px">কোনো suggestion নেই</div>';return;}
  list.innerHTML='';
  suggestions.forEach(function(s){
    var div=document.createElement('div');div.className='smgritem';
    var autoTag=s.auto_send?'<span style="font-size:9px;background:#e8f5e9;color:#2e7d32;padding:1px 5px;border-radius:6px;margin-left:3px">Auto</span>':'';
    var cond=s.keywords?(s.keywords+' · '+s.condition):s.condition;
    var txt=s.text.split('\n').join('<br>');
    div.innerHTML='<div class="smgritop"><span class="smgricond">'+cond+autoTag+'</span><div class="smgribtns"><button class="smgriedit" onclick="editSugg('+s.id+')">✏️</button><button class="smgridel" onclick="delSugg('+s.id+')">×</button></div></div><div class="smgritext">'+txt+'</div>';
    list.appendChild(div);
  });
}
function editSugg(id){
  var s=suggestions.find(function(s){return s.id===id;});if(!s)return;
  editSID=id;
  document.getElementById('smgrkw').value=s.keywords||'';
  document.getElementById('smgrcond').value=s.condition||'any';
  document.getElementById('smgrtext').value=s.text||'';
  document.getElementById('smgrauto').checked=s.auto_send||false;
  document.getElementById('smgradd').textContent='💾 Update';
  document.getElementById('smgrkw').focus();
}
async function addSugg(){
  var kw=document.getElementById('smgrkw').value.trim();
  var cond=document.getElementById('smgrcond').value;
  var txt=document.getElementById('smgrtext').value.trim();
  if(!txt){showToast('❌ Text লিখুন','error');return;}
  var autoSend=document.getElementById('smgrauto').checked;
  if(editSID!==null){
    var idx=suggestions.findIndex(function(s){return s.id===editSID;});
    if(idx>=0){suggestions[idx]={id:editSID,keywords:kw,condition:cond,text:txt,auto_send:autoSend};await post({action:'update_suggestion',suggestion:suggestions[idx]});}
    editSID=null;document.getElementById('smgradd').textContent='+ Add';showToast('✓ Updated','success');
  }else{
    var ns={id:Date.now(),keywords:kw,condition:cond,text:txt,auto_send:autoSend};suggestions.push(ns);
    await post({action:'add_suggestion',suggestion:ns});showToast('✓ Saved','success');
  }
  document.getElementById('smgrkw').value='';document.getElementById('smgrtext').value='';renderSMgr();
}
async function delSugg(id){
  suggestions=suggestions.filter(function(s){return s.id!==id;});
  await post({action:'delete_suggestion',id:id});renderSMgr();showToast('🗑️ Deleted','info');
}

function renderSB(conv){
  var bar=document.getElementById('suggbar');
  var lm=(conv.messages||[]).filter(function(m){return m.role==='customer';}).slice(-1)[0];
  if(!lm){bar.classList.remove('vis');bar.innerHTML='';return;}
  var ltxt=(lm.text||'').toLowerCase(),hasImg=lm.has_image||false;
  var matches=suggestions.filter(function(s){
    if(s.condition==='has_image'&&!hasImg)return false;
    if(s.condition==='no_image'&&hasImg)return false;
    if(s.keywords){var kws=s.keywords.toLowerCase().split(',').map(function(k){return k.trim();}).filter(function(k){return k.length>0;});if(kws.length>0&&!kws.some(function(k){return ltxt.includes(k);}))return false;}
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

function goBack(){document.getElementById('chatarea').classList.remove('active');document.getElementById('sidebar').classList.remove('hidden');selC=null;document.getElementById('estate').style.display='flex';document.getElementById('chatview').style.display='none';}
function toggleFP(){var p=document.getElementById('fpanel'),i=document.getElementById('fticon');var col=p.classList.contains('collapsed');p.classList.toggle('collapsed',!col);i.textContent=col?'▲':'▼';}
function initMobile(){if(window.innerWidth<=700){document.getElementById('fpanel').classList.add('collapsed');document.getElementById('ftbar').style.display='flex';}}
function showToast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast '+type;t.style.display='block';setTimeout(function(){t.style.display='none';},3000);}

document.getElementById('rinput').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendReply();}});
document.addEventListener('click',function(e){if(!e.target.closest('.twrap'))document.getElementById('tsugg').style.display='none';});
window.addEventListener('popstate',function(){if(selC)goBack();});

initMobile();loadInbox(true);setInterval(function(){loadInbox(true);},10000);
