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
    if(m.has_image&&m.image_url){
      content='<img src="'+m.image_url+'" class="mimg" loading="lazy" onclick="openLB(\''+m.image_url+'\')" alt="img">';
      if(m.text&&m.text!=='(ছবি)')content+='<div style="margin-top:4px">'+nl2br(safeText(m.text))+'</div>';
    }else{content=nl2br(safeText(m.text||''));}
    var tb=m.tag==='AI'?'<span class="aitag">AI</span>':m.tag==='Human'?'<span class="hutag">Human</span>':'';
    var tstr=m.time?new Date(m.time).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'}):'';
    var statusTxt=m.failed?'<span style="color:#e53935;font-size:9px">❌ Failed</span>':m.sending?'<span style="color:#aaa;font-size:9px">Sending...</span>':'';
    var ids=showID&&m.role==='agent'&&selC?'<div class="mid">ID: '+selC.sender_id+'</div>':'';
    div.innerHTML='<div class="mbubble">'+content+'</div><div class="mmeta">'+tstr+' '+tb+' '+statusTxt+'</div>'+ids;
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