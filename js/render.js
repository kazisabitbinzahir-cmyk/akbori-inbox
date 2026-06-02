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