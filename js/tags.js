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