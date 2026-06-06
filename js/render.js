// render.js — all rendering functions

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

function safeText(t){return (t||'').split('<').join('&lt;').split('>').join('&gt;');}

function nl2br(t){return (t||'').split('\n').join('<br>');}

function renderMsgs(msgs,preserveScroll){
  window._preserveScroll=!!preserveScroll;
  var area=document.getElementById('msgarea');
  var showID=document.getElementById('idtog').checked;
  area.innerHTML='';
  msgs.forEach(function(m){
    var div=document.createElement('div');
    div.className='msg '+(m.role==='customer'?'customer':'agent')+(m.sending?' sending':'');
    div.id='msg-'+(m._localId||m.mid||m.id||'');
    var content='';

    if(m.reply_to_mid){
      var quoted=msgs.find(function(q){return q.mid===m.reply_to_mid;});
      if(!quoted&&replyToMsg&&replyToMsg.mid===m.reply_to_mid)quoted=replyToMsg;
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

    var srchBtn='';
    if(m.has_image&&m.image_url){
      content+='<img src="'+m.image_url+'" class="mimg" loading="lazy" onclick="openLB(this.src)" alt="img" onload="this.onload=null;if(!window._preserveScroll){var a=document.getElementById(\'msgarea\');a.scrollTop=a.scrollHeight;}">';
      var srchId='srch_'+(m.id||Math.random().toString(36).slice(2));
      var _sc=window._imgSearchCache&&window._imgSearchCache[m.image_url];
      var _resultTxt=_sc&&_sc.url?'<div class="srch-result" style="font-size:10px;color:#1565c0;margin-top:2px;cursor:pointer;" onclick="window.open(\''+_sc.url+'\',\'_blank\')">✅ '+_sc.count+' results found</div>':'';
      var srchBtn='<button onclick="doImgSearch(\''+m.image_url+'\',\'srch_'+String(m.id||'')+'\')" id="srch_'+String(m.id||'')+'" style="font-size:18px;background:none;border:none;cursor:pointer;color:#1565c0;padding:2px 4px;line-height:1;" title="Search">🔍</button>';
      if(m.text&&m.text!=='(image)'&&m.text!=='(message)')content+='<div style="margin-top:4px">'+nl2br(safeText(m.text))+'</div>';
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
    var _rmid=m.mid||String(m.id||'');
    var hasMid=!!(m.mid);
    var replyBtn=hasMid?'<button onclick="setReplyTo(\''+_rmid+'\')" style="font-size:18px;background:none;border:none;cursor:pointer;color:#bbb;padding:2px 4px;line-height:1;" title="Reply">↩</button>':'';
    var hasSrch=!!(m.has_image&&m.image_url);
    var sideBtns='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;flex-shrink:0;">'+(hasSrch?srchBtn:'')+replyBtn+'</div>';
    var bubble='<div style="flex:1"><div class="mbubble">'+content+'</div><div class="mmeta">'+tstr+' '+tb+' '+statusTxt+'</div>'+ids+'</div>';
    var isAgent=m.role==='agent';
    div.innerHTML='<div style="display:flex;align-items:center;gap:2px">'+(isAgent?sideBtns+bubble:bubble+sideBtns)+'</div>';
    area.appendChild(div);
  });
  if(!preserveScroll){setTimeout(function(){area.scrollTop=area.scrollHeight;},50);setTimeout(function(){area.scrollTop=area.scrollHeight;},300);}
}

// Messages — load previous button
function initMsgScroll(conv){
  var area=document.getElementById('msgarea');
  if(!area)return;
  area.onscroll=null;
  // Add "Load previous" button at top
  var existing=document.getElementById('loadprevbtn');
  if(existing)existing.remove();
  var btn=document.createElement('button');
  btn.id='loadprevbtn';
  btn.textContent='Load previous messages';
  btn.style.cssText='display:block;width:100%;padding:6px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;font-size:11px;cursor:pointer;color:#555;margin-bottom:8px;';
  btn.onclick=function(){loadPrevMsgs(conv);};
  area.insertBefore(btn,area.firstChild);
}

function loadPrevMsgs(conv){
  var area=document.getElementById('msgarea');
  var btn=document.getElementById('loadprevbtn');
  if(btn)btn.textContent='Loading...';
  var oldest=conv.messages&&conv.messages[0];
  if(!oldest){if(btn)btn.remove();return;}
  var oldScrollHeight=area.scrollHeight;
  fetch(SUPABASE_URL+'/rest/v1/messages?user_id=eq.'+conv.user_id+'&time=lt.'+encodeURIComponent(oldest.time)+'&order=time.desc&limit=10',{
    headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}
  }).then(function(r){return r.json();}).then(function(older){
    if(!older||older.length===0){
      if(btn){btn.textContent='No older messages';btn.disabled=true;btn.style.color='#aaa';}
      return;
    }
    older.reverse();
    conv.messages=older.concat(conv.messages);
    var i=allC.findIndex(function(c){return c.userId===conv.userId;});
    if(i>=0)allC[i].messages=conv.messages;
    var savedScroll=area.scrollHeight;
    renderMsgs(conv.messages,true);
    setTimeout(function(){area.scrollTop=area.scrollHeight-savedScroll;},50);
    if(older.length<5){
      var b=document.getElementById('loadprevbtn');
      if(b){b.textContent='No older messages';b.disabled=true;b.style.color='#aaa';}
    } else {
      initMsgScroll(conv);
    }
  }).catch(function(){
    if(btn)btn.textContent='Load previous messages';
  });
}

function appendMsg(m,msgs){
  var area=document.getElementById('msgarea');
  if(!area)return;
  var showID=document.getElementById('idtog').checked;
  var div=document.createElement('div');
  div.className='msg '+(m.role==='customer'?'customer':'agent')+(m.sending?' sending':'');
  div.id='msg-'+(m._localId||m.mid||m.id||'');
  var content='';
  if(m.reply_to_mid){
    var allMsgs=msgs||[];
    var quoted=allMsgs.find(function(q){return q.mid===m.reply_to_mid;});
    if(quoted){
      var qcontent='';
      if(quoted.has_image&&quoted.image_url){qcontent='<img src="'+quoted.image_url+'" style="max-height:40px;border-radius:4px;display:block;margin-bottom:2px">';}
      else if(quoted.has_audio){qcontent='\uD83C\uDFB5 (audio)';}
      else if(quoted.is_like){qcontent='\u2764\uFE0F';}
      else{qcontent=safeText(quoted.text||'');}
      content+='<div style="background:rgba(0,0,0,0.08);border-left:3px solid #1877f2;padding:4px 8px;border-radius:6px;margin-bottom:4px;font-size:11px;color:#555;max-width:100%">'+qcontent+'</div>';
    }
  }
  var srchBtn='';
  if(m.has_image&&m.image_url){
    content+='<img src="'+m.image_url+'" class="mimg" loading="lazy" onclick="openLB(this.src)" alt="img" onload="this.onload=null;var a=document.getElementById(\'msgarea\');if(a)a.scrollTop=a.scrollHeight;">';
    var srchId='srch_'+String(m.id||'');
    srchBtn='<button onclick="doImgSearch(\''+m.image_url+'\',\''+srchId+'\')" id="'+srchId+'" style="font-size:18px;background:none;border:none;cursor:pointer;color:#1565c0;padding:2px 4px;line-height:1;" title="Search">\uD83D\uDD0D</button>';
    if(m.text&&m.text!=='(image)'&&m.text!=='(message)')content+='<div style="margin-top:4px">'+nl2br(safeText(m.text))+'</div>';
  } else if(m.has_audio&&m.audio_url){
    content+='<audio controls style="max-width:200px;margin:4px 0"><source src="'+m.audio_url+'"></audio>';
  } else if(m.is_sticker&&m.sticker_url){
    content+='<img src="'+m.sticker_url+'" style="max-width:80px;border-radius:4px" alt="sticker">';
  } else if(m.is_like){
    content+='<span style="font-size:28px">\u2764\uFE0F</span>';
  } else if(m.share_url){
    content+='<a href="'+m.share_url+'" target="_blank" style="display:block;background:#f0f7ff;border:1px solid #90caf9;border-radius:8px;padding:8px;color:#1565c0;font-size:12px;text-decoration:none;max-width:200px">'+(m.share_title||m.share_url)+'</a>';
  } else if(m.location_lat){
    content+='<a href="https://maps.google.com/?q='+m.location_lat+','+m.location_lng+'" target="_blank" style="display:block;background:#f0f7ff;border:1px solid #90caf9;border-radius:8px;padding:8px;color:#1565c0;font-size:12px;text-decoration:none">\uD83D\uDCCD Location</a>';
  } else {
    content+=nl2br(safeText(m.text||''));
  }
  var tb=m.tag==='AI'?'<span class="aitag">AI</span>':m.tag==='Human'?'<span class="hutag">Human</span>':m.tag==='reaction'?'<span style="font-size:9px;background:#fff3e0;color:#e65100;padding:1px 5px;border-radius:6px">reaction</span>':'';
  var tstr=m.time?new Date(m.time).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}):'';
  var statusTxt=m.failed?'<span style="color:#e53935;font-size:9px">Failed</span>':m.sending?'<span style="color:#aaa;font-size:9px">Sending...</span>':'';
  var ids=showID&&m.role==='agent'&&selC?'<div class="mid">ID: '+selC.sender_id+'</div>':'';
  var _rmid=m.mid||String(m.id||'');
  var hasMid=!!(m.mid);
  var replyBtn=hasMid?'<button onclick="setReplyTo(\''+_rmid+'\')" style="font-size:18px;background:none;border:none;cursor:pointer;color:#bbb;padding:2px 4px;line-height:1;" title="Reply">\u21A9</button>':'';
  var hasSrch=!!(m.has_image&&m.image_url);
  var sideBtns='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;flex-shrink:0;">'+(hasSrch?srchBtn:'')+replyBtn+'</div>';
  var bubble='<div style="flex:1"><div class="mbubble">'+content+'</div><div class="mmeta">'+tstr+' '+tb+' '+statusTxt+'</div>'+ids+'</div>';
  var isAgent=m.role==='agent';
  div.innerHTML='<div style="display:flex;align-items:center;gap:2px">'+(isAgent?sideBtns+bubble:bubble+sideBtns)+'</div>';
  area.appendChild(div);
  setTimeout(function(){area.scrollTop=area.scrollHeight;},50);
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

function renderCFMgr(){
  var list=document.getElementById('cfmgrlist');
  list.innerHTML='';
  contactFields.forEach(function(f){
    var div=document.createElement('div');div.className='tmgritem';
    div.innerHTML='<div class="tmgrname"><span style="background:#e8f5e9;color:#2e7d32;padding:1px 7px;border-radius:8px;font-size:11px">'+f.field_label+'</span><span class="tmgrcnt">'+f.field_type+'</span></div><button class="tmgrdel" onclick="delCF('+f.id+')">x</button>';
    list.appendChild(div);
  });
}

function renderTCMgr(){
  var list=document.getElementById('tcmgrlist');
  list.innerHTML='';
  tagCategories.forEach(function(cat){
    var div=document.createElement('div');div.className='tmgritem';
    div.innerHTML='<div class="tmgrname"><span style="background:'+cat.color+';color:#fff;padding:1px 7px;border-radius:8px;font-size:11px">'+cat.name+'</span></div><button class="tmgrdel" onclick="delTC('+cat.id+')">x</button>';
    list.appendChild(div);
  });
}

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
