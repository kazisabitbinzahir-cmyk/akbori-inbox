// ============================================================
// state.js — shared application state
// All global variables live here
// ============================================================

var allC = [], filtC = [], selC = null, rmode = 'text', selFile = null, selFiles = [];
var aPF = 'all', aTF = new Set(), aSF = new Set(), selIDs = new Set(), allTags = new Set();
var sortOrd = 'asc', globalAI = true, globalID = false, globalAuto = true;
var snd = null, lastCnt = 0;
var convOffset = 0, convTotal = null, convLimit = 0;
var suggestions = [], editSID = null;
var savedMessages = [], editSMID = null;
var contactFields = [];
var showArchived = false;
var tagCategories = [], allTagCategories = [];
var editTCID = null;
var globalTags = [];
var orderStatuses = [];
var aOSF = null;

var replyToMsg = null;

// Audio recording state
var mediaRecorder = null, audioChunks = [], audioBlob = null, isRecording = false;
