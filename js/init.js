function goBack(){document.getElementById('chatarea').classList.remove('active');document.getElementById('sidebar').classList.remove('hidden');selC=null;document.getElementById('estate').style.display='flex';document.getElementById('chatview').style.display='none';}
function toggleFP(){var p=document.getElementById('fpanel'),i=document.getElementById('fticon');var col=p.classList.contains('collapsed');p.classList.toggle('collapsed',!col);i.textContent=col?'▲':'▼';}
function initMobile(){if(window.innerWidth<=700){document.getElementById('fpanel').classList.add('collapsed');document.getElementById('ftbar').style.display='flex';}}
function showToast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast '+type;t.style.display='block';setTimeout(function(){t.style.display='none';},3000);}

document.getElementById('rinput').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendReply();}});
document.addEventListener('click',function(e){if(!e.target.closest('.twrap'))document.getElementById('tsugg').style.display='none';});
window.addEventListener('popstate',function(){if(selC)goBack();});

initMobile();loadInbox(true);setInterval(function(){loadInbox(true);},10000);