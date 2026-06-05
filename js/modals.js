// modals.js — modal functions


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

function openTCMgr(){renderTCMgr();document.getElementById('tcmgrmodal').classList.add('open');}

function closeTCMgr(){document.getElementById('tcmgrmodal').classList.remove('open');}

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

function openSMgr(){renderSMgr();document.getElementById('smgrmodal').classList.add('open');}

function closeSMgr(){editSID=null;document.getElementById('smgradd').textContent='+ Add';document.getElementById('smgrmodal').classList.remove('open');}

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

function openOSMgr(){renderOSMgr();document.getElementById('osmgrmodal').classList.add('open');}

function closeOSMgr(){document.getElementById('osmgrmodal').classList.remove('open');}

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
