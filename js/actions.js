// actions.js — user actions


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
  renderMsgs(conv.messages||[]);renderChatTags();renderSB(conv);renderSavedBar();renderList();initMsgScroll(conv);
  var _ossel=document.getElementById('convos_select');if(_ossel){_ossel.innerHTML='<option value="">No status</option>';orderStatuses.forEach(function(os){_ossel.innerHTML+='<option value="'+os.name+'"'+(conv.order_status===os.name?' selected':'')+'>'+os.name+'</option>';});}
  if(window.innerWidth<=700){
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('chatarea').classList.add('active');
    document.getElementById('topbar').style.display='none';
    history.pushState({chatOpen:true},'');
  }

}

function onIDToggle(){}

function openLB(url){document.getElementById('limg').src=url;document.getElementById('lbox').classList.add('open');}

function closeLB(){document.getElementById('lbox').classList.remove('open');}

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
  var files=Array.from(e.target.files);if(!files.length)return;
  selFile=files[0];selFiles=files;
  var prev=document.getElementById('iprev');
  if(files.length===1){
    var r=new FileReader();r.onload=function(ev){prev.src=ev.target.result;prev.style.display='block';};r.readAsDataURL(files[0]);
    prev.title='';
  } else {
    prev.src='';prev.style.display='block';
    prev.alt=files.length+' images selected';
    prev.style.cssText='display:block;background:#e3f2fd;color:#1565c0;padding:8px;border-radius:6px;font-size:11px;text-align:center;';
    prev.outerHTML='<div id="iprev" style="display:block;background:#e3f2fd;color:#1565c0;padding:8px;border-radius:6px;font-size:11px;text-align:center;">'+files.length+' images selected</div>';
  }
}
var ia=document.getElementById('imgarea');
ia.addEventListener('dragover',function(e){e.preventDefault();ia.classList.add('dov');});
ia.addEventListener('dragleave',function(){ia.classList.remove('dov');});
ia.addEventListener('drop',function(e){e.preventDefault();ia.classList.remove('dov');var f=e.dataTransfer.files[0];if(f){selFile=f;var r=new FileReader();r.onload=function(ev){var p=document.getElementById('iprev');p.src=ev.target.result;p.style.display='block';};r.readAsDataURL(f);}});

function f2b64(f){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result.split(',')[1]);};r.onerror=rej;r.readAsDataURL(f);});}

function setReplyTo(mid){
  var msg=selC&&(selC.messages||[]).find(function(m){return m.mid===mid||String(m.id)===String(mid);});
  if(!msg)return;
  replyToMsg=msg;
  var bar=document.getElementById('replybar');
  if(!bar)return;
  var preview=msg.has_image?'📷 Image':msg.has_audio?'🎵 Audio':(msg.text||'').slice(0,60);
  bar.innerHTML='<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:#f0f7ff;border-left:3px solid #1877f2;border-radius:6px;font-size:11px;color:#555;flex:1">↩ <span>'+preview+'</span></div><button onclick="clearReplyTo()" style="background:none;border:none;cursor:pointer;font-size:14px;color:#aaa;padding:2px 6px;">×</button>';
  bar.style.display='flex';
}

function clearReplyTo(){
  replyToMsg=null;
  var bar=document.getElementById('replybar');
  if(bar)bar.style.display='none';
}

async function sendReply(){
  if(!selC)return;
  var sendConv=selC;
  var sendConvId=selC.userId;
  var showID=document.getElementById('idtog').checked;
  var payload={action:'reply',sender_id:sendConv.sender_id,page_id:sendConv.page_id};
  if(rmode==='text'){
    var txt=document.getElementById('rinput').value.trim();if(!txt)return;
    if(showID)txt=txt+'\n\nID: '+sendConv.sender_id;
    payload.type='text';payload.message=txt;if(replyToMsg&&replyToMsg.mid)payload.reply_to_mid=replyToMsg.mid;
  }else{
    if(!selFile)return;
    if(selFiles.length>1){
      var totalFiles=selFiles.length;
      var filesToSend=selFiles.slice();
      // Add local preview for each image
      var now2=new Date();
      filesToSend.forEach(function(f2){
        var me2={role:'agent',text:'(image)',image_url:'',has_image:true,time:now2.toISOString(),tag:'Human',sending:true,_f:f2};
        sendConv.messages=sendConv.messages||[];sendConv.messages.push(me2);
        sendConv.last_message='(image)';sendConv.last_time=now2.toISOString();
        var reader=new FileReader();
        reader.onload=function(ev){me2.image_url=ev.target.result;if(selC&&selC.userId===sendConvId){renderMsgs(sendConv.messages||[]);initMsgScroll(sendConv);}};
        reader.readAsDataURL(f2);
      });
      var ci2=allC.findIndex(function(c){return c.userId===sendConvId;});
      if(ci2>=0){allC[ci2]=sendConv;if(ci2>0){var upd2=allC.splice(ci2,1)[0];allC.unshift(upd2);}}
      if(selC&&selC.userId===sendConvId){renderMsgs(sendConv.messages||[]);initMsgScroll(sendConv);}
      selFile=null;selFiles=[];
      var ip2=document.getElementById('iprev');if(ip2)ip2.style.display='none';
      var fi2e=document.getElementById('fiinput');if(fi2e)fi2e.value='';
      setMode('text');renderList();updateStats();
      showToast(totalFiles+' images sending...','info');
      // Send each image
      (async function(){
        for(var idx2=0;idx2<filesToSend.length;idx2++){
          (function(f2){
            f2b64(f2).then(function(b64m){
              var pm={action:'reply',sender_id:sendConv.sender_id,page_id:sendConv.page_id,type:'image',image_data:b64m,image_name:f2.name,image_type:f2.type};
              fetch(NB+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pm)})
                .then(function(r){return r.json();})
                .then(function(d){
                  var m2=sendConv.messages.find(function(m){return m._f===f2;});
                  if(m2){m2.sending=false;if(d.image_url)m2.image_url=d.image_url;if(d.mid)m2.mid=d.mid;}
                  var msgEl2=document.getElementById('msg-'+(m2&&(m2._localId||m2.mid||m2.id)||''));
                  if(msgEl2){var meta2=msgEl2.querySelector('.mmeta');if(meta2){var spans=meta2.getElementsByTagName('span');for(var si=spans.length-1;si>=0;si--){if(spans[si].textContent.indexOf('Sending')>=0)spans[si].parentNode.removeChild(spans[si]);}}}
                });
            });
          })(filesToSend[idx2]);
        }
      })();
      return;
    }
    var b64=await f2b64(selFile);payload.type='image';payload.image_data=b64;payload.image_name=selFile.name;payload.image_type=selFile.type;if(replyToMsg&&replyToMsg.mid)payload.reply_to_mid=replyToMsg.mid;
  }
  var now=new Date();
  var _localId='local-'+Date.now();
  var me={role:'agent',text:payload.message||'(image)',image_url:rmode==='image'&&selFile?URL.createObjectURL(selFile):'',has_image:rmode==='image',time:now.toISOString(),tag:'Human',sending:true,reply_to_mid:replyToMsg?replyToMsg.mid:null,_localId:_localId};
  sendConv.messages=sendConv.messages||[];sendConv.messages.push(me);
  sendConv.last_message=me.text;sendConv.last_time=now.toISOString();
  var ci=allC.findIndex(function(c){return c.userId===sendConvId;});
  if(ci>=0){allC[ci]=sendConv;if(ci>0){var upd=allC.splice(ci,1)[0];allC.unshift(upd);}}
  if(selC&&selC.userId===sendConvId){appendMsg(me,sendConv.messages);initMsgScroll(sendConv);}
  var ri=document.getElementById('rinput');if(ri)ri.value='';clearReplyTo();
  if(selC)initMsgScroll(selC);
  selFile=null;selFiles=[];
  var ip=document.getElementById('iprev');if(ip)ip.style.display='none';
  var fi=document.getElementById('fiinput');if(fi)fi.value='';
  setMode('text');
  renderList();updateStats();
  fetch(NB+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    .then(function(res){return res.json();})
    .then(function(data){
      me.sending=false;
      if(data.image_url)me.image_url=data.image_url;
      if(data.mid)me.mid=data.mid;
      // Update sending indicator in DOM directly — no full re-render
      var msgEl=document.getElementById('msg-'+_localId);
      if(msgEl){var meta=msgEl.querySelector('.mmeta');if(meta){var spans=meta.getElementsByTagName('span');for(var si=spans.length-1;si>=0;si--){if(spans[si].textContent.indexOf('Sending')>=0)spans[si].parentNode.removeChild(spans[si]);}}}
    })
    .catch(function(e){
      me.failed=true;
      if(selC&&selC.userId===sendConvId){renderMsgs(sendConv.messages||[]);initMsgScroll(sendConv);}
      showToast('Send failed','error');
    });
}

async function openBulk(){
  document.getElementById('bulkmodal').classList.add('open');
  if(selIDs.size>0){
    var tgts=allC.filter(function(c){return selIDs.has(c.userId);});
    document.getElementById('binfo').textContent=tgts.length+' recipients';
  } else {
    document.getElementById('binfo').textContent='Fetching count...';
    var sv=document.getElementById('sinput').value.trim();
    var dfv=document.getElementById('dfrom').value,dtv=document.getElementById('dto').value;
    var filterBody={action:'get_filtered_user_ids'};
    if(aPF&&aPF!=='all')filterBody.page=aPF;
    if(aOSF!==null&&aOSF!==undefined)filterBody.order_status=aOSF;
    if(aSF.has('unread'))filterBody.unread='true';
    if(aSF.has('unanswered'))filterBody.unanswered='true';
    if(dfv)filterBody.date_from=dfv;
    if(dtv)filterBody.date_to=dtv;
    if(sv)filterBody.search=sv;
    if(aTF.size===1)filterBody.tag=[...aTF][0];
    var res=await post(filterBody);
    document.getElementById('binfo').textContent=(res&&res.count||0)+' recipients';
  }
}

function closeBulk(){document.getElementById('bulkmodal').classList.remove('open');}

async function sendBulk(){
  var txt=document.getElementById('bta').value.trim();if(!txt)return;
  var btn=document.querySelector('.bsend');btn.disabled=true;btn.textContent='Fetching...';
  var tgts;
  if(selIDs.size>0){
    tgts=allC.filter(function(c){return selIDs.has(c.userId);});
  } else {
    var sv=document.getElementById('sinput').value.trim();
    var dfv=document.getElementById('dfrom').value,dtv=document.getElementById('dto').value;
    var filterBody={action:'get_filtered_user_ids'};
    if(aPF&&aPF!=='all')filterBody.page=aPF;
    if(aOSF!==null&&aOSF!==undefined)filterBody.order_status=aOSF;
    if(aSF.has('unread'))filterBody.unread='true';
    if(aSF.has('unanswered'))filterBody.unanswered='true';
    if(dfv)filterBody.date_from=dfv;
    if(dtv)filterBody.date_to=dtv;
    if(sv)filterBody.search=sv;
    if(aTF.size===1)filterBody.tag=[...aTF][0];
    var res=await post(filterBody);
    tgts=res&&res.convs?res.convs.map(function(c){return{sender_id:c.sender_id,page_id:c.page_id,userId:c.user_id};}):filtC;
  }
  btn.textContent='Sending...';
  var sent=0;
  for(var i=0;i<tgts.length;i++){try{await post({action:'reply',sender_id:tgts[i].sender_id,page_id:tgts[i].page_id,type:'text',message:txt});sent++;}catch(e){}await new Promise(function(r){setTimeout(r,300);});}
  btn.disabled=false;btn.textContent='Send All';closeBulk();document.getElementById('bta').value='';
  showToast(sent+'/'+tgts.length+' sent','success');
}

// TAG CATEGORY MANAGER

async function setConvOrderStatus(val){
  if(!selC)return;
  selC.order_status=val||null;
  var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC[i].order_status=val||null;
  await post({action:'set_order_status',sender_id:selC.sender_id,page_id:selC.page_id,user_ids:[selC.userId],order_status:val||null});
  renderList();showToast('Status updated','success');
}

function openBulkOS(){
  var tgts=selIDs.size>0?allC.filter(function(c){return selIDs.has(c.userId);}):filtC;
  var label=selIDs.size===0?' (loaded only)':'';
  document.getElementById('bosinfo').textContent=tgts.length+' conversations'+label;
  var sel=document.getElementById('bosselect');
  sel.innerHTML='<option value="">No status</option>';
  orderStatuses.forEach(function(os){sel.innerHTML+='<option value="'+os.name+'">'+os.name+'</option>';});
  document.getElementById('bulkosmodal').classList.add('open');
}

function closeBulkOS(){document.getElementById('bulkosmodal').classList.remove('open');}

async function applyBulkOS(){
  var val=document.getElementById('bosselect').value;
  var uids,tgts;
  if(selIDs.size>0){
    tgts=allC.filter(function(c){return selIDs.has(c.userId);});
    uids=tgts.map(function(c){return c.userId;});
  } else {
    var sv=document.getElementById('sinput').value.trim();
    var dfv=document.getElementById('dfrom').value,dtv=document.getElementById('dto').value;
    var filterBody={action:'get_filtered_user_ids'};
    if(aPF&&aPF!=='all')filterBody.page=aPF;
    if(aOSF!==null&&aOSF!==undefined)filterBody.order_status=aOSF;
    if(aSF.has('unread'))filterBody.unread='true';
    if(aSF.has('unanswered'))filterBody.unanswered='true';
    if(dfv)filterBody.date_from=dfv;
    if(dtv)filterBody.date_to=dtv;
    if(sv)filterBody.search=sv;
    if(aTF.size===1)filterBody.tag=[...aTF][0];
    var res=await post(filterBody);
    uids=res&&res.user_ids?res.user_ids:filtC.map(function(c){return c.userId;});
    tgts=filtC;
  }
  tgts.forEach(function(c){c.order_status=val||null;var i=allC.findIndex(function(a){return a.userId===c.userId;});if(i>=0)allC[i].order_status=val||null;});
  await post({action:'set_order_status',sender_id:'bulk',page_id:'bulk',user_ids:uids,order_status:val||null});
  closeBulkOS();renderList();showToast(uids.length+' updated','success');
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

document.getElementById('idtog').addEventListener('change',function(){
  document.getElementById('idtbg').style.background=this.checked?'#1877f2':'#ccc';
  document.getElementById('idtknob').style.transform=this.checked?'translateX(14px)':'translateX(0)';
  if(selC){selC.id_tag=this.checked;var i=allC.findIndex(function(c){return c.userId===selC.userId;});if(i>=0)allC[i].id_tag=this.checked;post({action:'save_id_tag',sender_id:selC.sender_id,page_id:selC.page_id,id_tag:this.checked});renderMsgs(selC.messages||[]);}
});
