function doPost(e){
  try{
    var SHEET_ID = 'PUT_YOUR_SHEET_ID_HERE';
    var TAB = (e && e.parameter && e.parameter.tab) || 'SentLog';
    var body = JSON.parse(e.postData.contents || '{}');
    var rows = body.rows || [];
    if (!rows.length) return ContentService.createTextOutput(JSON.stringify({ok:true, inserted:0}));
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName(TAB) || ss.insertSheet(TAB);

    var headers = ['timestamp','url','address','city','state','zip','price','beds','baths','sqft','frbo_detected','detection_reason','source','status','last_action_at','notes','owner_name','hash'];
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);

    var values = rows.map(function(r){
      return [r.timestamp,r.url,r.address||'',r.city||'',r.state||'',r.zip||'',r.price||'',r.beds||'',r.baths||'',r.sqft||'', r.frbo_detected||'',r.detection_reason||'',r.source||'extension',r.status||'sent',r.last_action_at||'',r.notes||'',r.owner_name||'',r.hash||''];
    });
    sh.getRange(sh.getLastRow()+1,1,values.length,headers.length).setValues(values);
    return ContentService.createTextOutput(JSON.stringify({ok:true, inserted: values.length})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}


