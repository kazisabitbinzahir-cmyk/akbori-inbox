// Configuration
var NB = window.location.origin + '/webhook';
var PC = {'A1':'#1877f2','A2':'#0d8a6f','4.0':'#7c3aed','Bag Xpress':'#ea580c','5.0':'#d97706','6.0':'#db2777','8.0':'#64748b','Unknown':'#888'};
var allC=[], filtC=[], selC=null, rmode='text', selFile=null;
var aPF='all', aTF=new Set(), aSF=new Set(), selIDs=new Set(), allTags=new Set();
var sortOrd='asc', globalAI=true, globalID=false, globalAuto=true;
var snd=null, lastCnt=0;
var suggestions=[], editSID=null;
