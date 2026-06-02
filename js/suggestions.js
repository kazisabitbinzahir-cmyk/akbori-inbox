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