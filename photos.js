(function(){
  "use strict";

  var app=document.getElementById('photoApp');
  if(!app)return;

  var config=window.NYC_SUPABASE||{};
  var EXIF_URL='https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.esm.js';
  var MAX_BYTES=12*1024*1024;
  var DAY_INFO={
    day1:{date:'2026-11-18',label:'Day 1 · Arrival'},
    day2:{date:'2026-11-19',label:'Day 2 · Midtown Icons'},
    day3:{date:'2026-11-20',label:'Day 3 · Downtown'},
    day4:{date:'2026-11-21',label:'Day 4 · Choose Your Line'},
    day5:{date:'2026-11-22',label:'Day 5 · Home'}
  };
  var STAGE_LOCATIONS={
    'VS9 · LHR T3 → JFK T4':[{lat:51.4700,lon:-0.4543,radius:2500},{lat:40.6413,lon:-73.7781,radius:2500}],
    'Land JFK T4 · Immigration & Bags':[{lat:40.6413,lon:-73.7781,radius:2500}],
    'Yellow Cab · JFK → Manhattan':[{lat:40.6413,lon:-73.7781,radius:2500},{lat:40.7624,lon:-73.9872,radius:400}],
    "Romer Hell's Kitchen · Check-in":[{lat:40.7624,lon:-73.9872,radius:400}],
    '9th Ave Drinks Crawl · W 44th–52nd':[{lat:40.7606,lon:-73.9918,radius:700}],
    'Coffee & Breakfast · Midtown':[{lat:40.7624,lon:-73.9872,radius:600}],
    '5th Avenue · Shops & Landmarks':[{lat:40.7625,lon:-73.9745,radius:600}],
    "St Patrick's Cathedral":[{lat:40.7586,lon:-73.9755,radius:350}],
    'Central Park · South End':[{lat:40.7669,lon:-73.9753,radius:900}],
    'Horse & Carriage Ride':[{lat:40.7669,lon:-73.9753,radius:1000}],
    'Lunch · Central Park & Midtown':[{lat:40.7681,lon:-73.9819,radius:1000}],
    'Rockefeller Center':[{lat:40.7587,lon:-73.9787,radius:450}],
    'Steak Dinner · Strip House Midtown':[{lat:40.7549,lon:-73.9806,radius:350}],
    'Blue Bottle Coffee · 150 Greenwich St':[{lat:40.7106,lon:-74.0120,radius:350}],
    'Collect Sightseeing Cruise Tickets':[{lat:40.7036,lon:-74.0152,radius:1200}],
    '9/11 Memorial & Museum':[{lat:40.7115,lon:-74.0133,radius:550}],
    'World Trade Center & The Oculus':[{lat:40.7127,lon:-74.0119,radius:450}],
    'Statue of Liberty Sightseeing Cruise':[{lat:40.7036,lon:-74.0152,radius:1200}],
    "Lunch · Seaport or Katz's Delicatessen": [{lat:40.7065,lon:-74.0039,radius:700},{lat:40.7146,lon:-73.9874,radius:500}],
    'Chinatown Walk':[{lat:40.7158,lon:-73.9970,radius:650}],
    'Little Italy · Coffee & Cannoli':[{lat:40.7191,lon:-73.9973,radius:450}],
    'Phoenix Palace · Chinatown':[{lat:40.7168,lon:-73.9939,radius:350}],
    'Leeds United vs Chelsea':[{lat:40.7486,lon:-73.9855,radius:450}],
    'Bryant Park Winter Village':[{lat:40.7536,lon:-73.9832,radius:550}],
    'Everyone · Free Afternoon':[{lat:40.7624,lon:-73.9872,radius:1000}],
    'Knicks vs Portland Trail Blazers':[{lat:40.7505,lon:-73.9934,radius:550}],
    'Girls → Chicago (Evening Show)':[{lat:40.7612,lon:-73.9853,radius:450}],
    "Coffee · Hell's Kitchen":[{lat:40.7624,lon:-73.9872,radius:550}],
    'SoHo Shopping Run':[{lat:40.7233,lon:-74.0000,radius:750}],
    "Macy's · 5th Ave Windows · Winter Village":[{lat:40.7500,lon:-73.9880,radius:1000}],
    'Back to Romer · Rest & Change':[{lat:40.7624,lon:-73.9872,radius:450}],
    "Group Dinner · Hell's Kitchen":[{lat:40.7624,lon:-73.9918,radius:700}],
    "Slow Breakfast · Hell's Kitchen":[{lat:40.7624,lon:-73.9918,radius:700}],
    'Check-out · Bags at the Desk':[{lat:40.7624,lon:-73.9872,radius:400}],
    'Final Wander · High Line (planned)':[{lat:40.7520,lon:-74.0040,radius:1500}],
    'Toy Store · FAO Schwarz':[{lat:40.7586,lon:-73.9787,radius:450}],
    'Cab to JFK T4':[{lat:40.7624,lon:-73.9872,radius:450},{lat:40.6413,lon:-73.7781,radius:2500}],
    'VS10 · JFK T4 → LHR':[{lat:40.6413,lon:-73.7781,radius:2500},{lat:51.4700,lon:-0.4543,radius:2500}]
  };
  var els={
    input:document.getElementById('photoFiles'),
    drop:document.getElementById('photoDrop'),
    queue:document.getElementById('photoQueue'),
    upload:document.getElementById('uploadPhotos'),
    clear:document.getElementById('clearPhotos'),
    status:document.getElementById('photoStatus'),
    config:document.getElementById('photoConfigNotice'),
    wall:document.getElementById('photoWall')
  };
  var state={items:[],photos:[],stages:[],exifr:null,busy:false};

  function configured(){
    return typeof config.url==='string'&&typeof config.anonKey==='string'&&
      config.url.indexOf('https://')===0&&config.url.indexOf('YOUR_')===-1&&
      config.anonKey.indexOf('YOUR_')===-1&&config.anonKey.length>20;
  }
  function baseUrl(){return config.url.replace(/\/+$/,'');}
  function authHeaders(){
    var headers={apikey:config.anonKey};
    if(config.anonKey.indexOf('eyJ')===0)headers.Authorization='Bearer '+config.anonKey;
    return headers;
  }
  function node(tag,cls,text){
    var n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined&&text!==null)n.textContent=text;
    return n;
  }
  function slug(text){
    return text.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
  function timeMinutes(text){
    var m=String(text||'').match(/([01]?\d|2[0-3]):([0-5]\d)/);
    return m?parseInt(m[1],10)*60+parseInt(m[2],10):null;
  }
  function displayTime(minutes){
    if(minutes===null||minutes===undefined)return '--:--';
    return ('0'+Math.floor(minutes/60)).slice(-2)+':'+('0'+minutes%60).slice(-2);
  }
  function dayForDate(date){
    var ids=Object.keys(DAY_INFO);
    for(var i=0;i<ids.length;i++)if(DAY_INFO[ids[i]].date===date)return ids[i];
    return null;
  }

  function buildStages(){
    var stages=[];
    [].slice.call(document.querySelectorAll('section.day[id^="day"]')).forEach(function(day){
      var info=DAY_INFO[day.id];
      if(!info)return;
      [].slice.call(day.querySelectorAll('.stop:not(.photo-extra)')).forEach(function(stop){
        var titleEl=stop.querySelector('.card-head h3');
        var timeEl=stop.querySelector('.card-head .t');
        if(!titleEl||!timeEl)return;
        var title=titleEl.textContent.trim();
        var start=timeMinutes(timeEl.textContent);
        if(start===null)return;
        var id=day.id+'-'+slug(title);
        if(stages.some(function(s){return s.id===id;}))return;
        stages.push({id:id,dayId:day.id,date:info.date,title:title,start:start,startLabel:displayTime(start),locations:STAGE_LOCATIONS[title]||[]});
      });
    });
    stages.sort(function(a,b){return a.date===b.date?a.start-b.start:a.date<b.date?-1:1;});
    state.stages=stages;
  }

  function dateFromExif(exif){
    var value=exif&&(exif.DateTimeOriginal||exif[36867]||exif.CreateDate||exif.DateTimeDigitized||exif[36868]||exif.DateTime||exif[306]);
    if(!value)return null;
    if(value instanceof Date&&!isNaN(value.getTime())){
      var y=value.getFullYear(),m=value.getMonth()+1,d=value.getDate();
      var hh=value.getHours(),mm=value.getMinutes(),ss=value.getSeconds();
      return y+'-'+('0'+m).slice(-2)+'-'+('0'+d).slice(-2)+'T'+
        ('0'+hh).slice(-2)+':'+('0'+mm).slice(-2)+':'+('0'+ss).slice(-2);
    }
    var match=String(value).match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if(!match)return null;
    return match[1]+'-'+match[2]+'-'+match[3]+'T'+match[4]+':'+match[5]+':'+(match[6]||'00');
  }

  function matchCaptured(captured){
    var dayId=captured?dayForDate(captured.slice(0,10)):null;
    if(!dayId)return {dayId:null,stage:null};
    var minutes=timeMinutes(captured.slice(11,16));
    var candidates=state.stages.filter(function(s){return s.dayId===dayId;});
    var stage=null;
    candidates.forEach(function(s){if(s.start<=minutes)stage=s;});
    if(!stage&&candidates.length)stage=candidates[0];
    return {dayId:dayId,stage:stage};
  }

  function gpsFromExif(exif){
    if(!exif)return null;
    var lat=exif.latitude,lon=exif.longitude;
    if(typeof lat!=='number'||typeof lon!=='number')return null;
    if(!isFinite(lat)||!isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
    return {lat:lat,lon:lon};
  }

  function distanceKm(a,b){
    var rad=Math.PI/180,lat1=a.lat*rad,lat2=b.lat*rad;
    var dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
    var h=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }

  function matchGps(gps,dayId){
    if(!gps)return null;
    var best=null;
    state.stages.forEach(function(stage){
      if(dayId&&stage.dayId!==dayId)return;
      stage.locations.forEach(function(location){
        var distance=distanceKm(gps,location);
        if(distance<=location.radius/1000&&(!best||distance<best.distance))best={stage:stage,distance:distance};
      });
    });
    return best;
  }

  var lastGeocode=0;
  async function reverseLocation(gps){
    var wait=Math.max(0,1100-(Date.now()-lastGeocode));
    if(wait)await new Promise(function(resolve){setTimeout(resolve,wait);});
    var query=encodeURIComponent(gps.lat)+'&lon='+encodeURIComponent(gps.lon);
    var response=await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='+query+'&zoom=16',{
      headers:{Accept:'application/json','Accept-Language':'en'}
    });
    lastGeocode=Date.now();
    if(!response.ok)throw new Error('Location lookup failed');
    var data=await response.json();
    var address=data.address||{};
    return (data.namedetails&&data.namedetails.name)||data.name||address.tourism||address.attraction||
      address.amenity||address.building||address.shop||address.leisure||address.historic||
      address.neighbourhood||address.suburb||address.city_district||address.city||address.town||
      address.village||data.display_name||null;
  }

  function gpsLabel(gps){
    return 'GPS '+gps.lat.toFixed(4)+','+gps.lon.toFixed(4);
  }

  function metadata(exif,captured){
    return {
      make:exif.Make||null,
      model:exif.Model||null,
      captured_at:captured,
      has_gps:typeof exif.latitude==='number'&&typeof exif.longitude==='number',
      orientation:exif.Orientation||null
    };
  }

  async function exifParser(){
    if(!state.exifr){
      var module=await import(EXIF_URL);
      state.exifr=module.default;
    }
    return state.exifr;
  }

  function formatError(file,message){
    return {file:file,id:'photo-'+Date.now()+'-'+Math.random().toString(36).slice(2),status:'error',error:message,preview:null};
  }

  async function prepare(file){
    var ext=(file.name.toLowerCase().match(/\.(heic|heif|jpe?g)$/)||[])[1];
    if(!ext)return formatError(file,'Only iPhone HEIC/HEIF and Samsung/iPhone JPEG files are accepted.');
    if(file.size>MAX_BYTES)return formatError(file,'File is larger than 12 MB. Choose a smaller original.');
    var item={file:file,id:'photo-'+Date.now()+'-'+Math.random().toString(36).slice(2),status:'checking',error:'',preview:null,capturedAt:null,dayId:null,stage:null,exif:null,gps:null,locationName:null,locationSource:null};
    if(/jpe?g/.test(ext)&&window.URL&&URL.createObjectURL)item.preview=URL.createObjectURL(file);
    state.items.push(item);
    renderQueue();
    try{
      var parser=await exifParser();
      var exif=await parser.parse(file);
      if(!exif||Object.keys(exif).length===0)throw new Error('No EXIF metadata found. Choose the original photo with EXIF data.');
      item.exif=exif;
      item.capturedAt=dateFromExif(exif);
      item.gps=gpsFromExif(exif);
      var match=matchCaptured(item.capturedAt);
      item.dayId=match.dayId;
      item.stage=match.stage;
      var geoMatch=matchGps(item.gps,item.dayId);
      if(geoMatch){
        item.stage=geoMatch.stage;
        item.dayId=geoMatch.stage.dayId;
      }
      item.locationSource=geoMatch?'exif-gps':item.stage?'exif-datetime':item.gps?'exif-gps-unmatched':'exif-datetime-unmatched';
      if(item.stage){
        item.locationName=item.stage.title;
      }else if(item.gps){
        try{item.locationName=await reverseLocation(item.gps)||gpsLabel(item.gps);}
        catch(e){item.locationName=gpsLabel(item.gps);}
      }
      item.status='ready';
    }catch(error){
      item.status='error';
      item.error=error&&error.message?error.message:'Could not read EXIF metadata from this file.';
      if(item.preview){URL.revokeObjectURL(item.preview);item.preview=null;}
    }
    renderQueue();
  }

  async function prepareFiles(files){
    var list=[].slice.call(files||[]);
    if(!list.length)return;
    setStatus('Checking '+list.length+' photo'+(list.length===1?'':'s')+' for format and EXIF metadata…');
    for(var i=0;i<list.length;i++)await prepare(list[i]);
    var ready=state.items.filter(function(i){return i.status==='ready';}).length;
    var errors=state.items.filter(function(i){return i.status==='error';}).length;
    setStatus(ready+' ready'+(errors?' · '+errors+' not accepted':''));
  }

  function stageSelect(item){
    var select=node('select','qmatch');
    select.setAttribute('aria-label','Itinerary stage for '+item.file.name);
    var extra=node('option','', 'Additional photo · no matching stage');
    extra.value='';
    select.appendChild(extra);
    state.stages.filter(function(s){return s.dayId===item.dayId;}).forEach(function(stage){
      var option=node('option','',stage.startLabel+' · '+stage.title);
      option.value=stage.id;
      select.appendChild(option);
    });
    select.value=item.stage?item.stage.id:'';
    select.addEventListener('change',function(){
      item.stage=state.stages.find(function(s){return s.id===select.value;})||null;
      item.locationSource=item.stage?'manual-stage':item.locationSource;
      item.locationName=item.stage?item.stage.title:item.locationName;
      renderQueue();
    });
    return select;
  }

  function renderQueue(){
    els.queue.innerHTML='';
    state.items.forEach(function(item){
      var row=node('div','qrow '+(item.status==='error'?'error':item.status==='ready'?'ready':''));
      if(item.preview){
        var img=node('img','qthumb');
        img.src=item.preview;
        img.alt='';
        row.appendChild(img);
      }else{
        row.appendChild(node('span','qthumb',item.file.name.toLowerCase().match(/\.heif?$/)?'HEIC':'PHOTO'));
      }
      var info=node('div','qinfo');
      info.appendChild(node('div','qname',item.file.name));
      var text=item.status==='checking'?'Checking EXIF…':
        item.status==='uploading'?'Uploading to Supabase…':
        item.status==='done'?'Uploaded and added to the wall':
        item.status==='error'?item.error:
        item.stage?'Matched: '+item.stage.title:item.locationName?'New location: '+item.locationName:'Additional photo · a new itinerary entry will be created';
      info.appendChild(node('div','qstate',text));
      if(item.status==='ready')info.appendChild(stageSelect(item));
      row.appendChild(info);
      els.queue.appendChild(row);
    });
    updateActions();
  }

  function updateActions(){
    var ready=state.items.some(function(i){return i.status==='ready';});
    els.upload.disabled=!configured()||state.busy||!ready;
    els.clear.disabled=state.busy||state.items.length===0;
  }
  function setStatus(text){els.status.textContent=text;}

  function clearSelection(){
    state.items.forEach(function(item){if(item.preview)URL.revokeObjectURL(item.preview);});
    state.items=[];
    els.input.value='';
    renderQueue();
    setStatus('Selection cleared.');
  }

  function pathFor(file){
    var ext=(file.name.toLowerCase().match(/\.(heic|heif|jpe?g)$/)||['','jpg'])[1].replace('jpeg','jpg');
    var id=window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
    return id+'.'+ext;
  }

  async function responseError(response){
    var text=await response.text();
    try{
      var data=JSON.parse(text);
      return data.message||data.error||text;
    }catch(e){return text||('Request failed ('+response.status+')');}
  }

  async function uploadOne(item){
    item.status='uploading';
    renderQueue();
    var path=pathFor(item.file);
    var mime=item.file.type||(/jpe?g$/i.test(item.file.name)?'image/jpeg':'image/heic');
    var upload=await fetch(baseUrl()+'/storage/v1/object/'+config.bucket+'/'+path,{
      method:'POST',
      headers:Object.assign(authHeaders(),{'Content-Type':mime,'x-upsert':'false'}),
      body:item.file
    });
    if(!upload.ok)throw new Error('Storage upload failed: '+await responseError(upload));
    var record={
      file_path:path,
      public_url:baseUrl()+'/storage/v1/object/public/'+config.bucket+'/'+path,
      original_name:item.file.name,
      mime_type:mime,
      size_bytes:item.file.size,
      captured_at:item.capturedAt,
      day_id:item.stage?item.stage.dayId:item.dayId,
      stage_id:item.stage?item.stage.id:null,
      stage_title:item.stage?item.stage.title:null,
      latitude:item.gps?item.gps.lat:null,
      longitude:item.gps?item.gps.lon:null,
      location_name:item.locationName,
      location_source:item.locationSource,
      exif:metadata(item.exif,item.capturedAt)
    };
    var insert=await fetch(baseUrl()+'/rest/v1/'+config.table,{
      method:'POST',
      headers:Object.assign(authHeaders(),{'Content-Type':'application/json',Prefer:'return=representation'}),
      body:JSON.stringify(record)
    });
    if(!insert.ok)throw new Error('Metadata save failed: '+await responseError(insert));
    var saved=await insert.json();
    item.record=Array.isArray(saved)?saved[0]:saved;
    item.status='done';
    state.photos.push(item.record||record);
    renderQueue();
  }

  async function uploadSelected(){
    if(!configured()||state.busy)return;
    var ready=state.items.filter(function(i){return i.status==='ready';});
    if(!ready.length)return;
    state.busy=true;
    updateActions();
    var completed=0,failed=0;
    for(var i=0;i<ready.length;i++){
      try{
        await uploadOne(ready[i]);
        completed++;
      }catch(error){
        ready[i].status='error';
        ready[i].error=error&&error.message?error.message:'Upload failed.';
        failed++;
        renderQueue();
      }
      setStatus('Uploaded '+completed+' of '+ready.length+(failed?' · '+failed+' failed':''));
    }
    state.items=state.items.filter(function(i){return i.status!=='done';});
    state.busy=false;
    renderAll();
    setStatus(completed+' photo'+(completed===1?'':'s')+' uploaded'+(failed?' · '+failed+' failed':' · photo wall updated'));
  }

  function photoDay(photo){
    if(photo.day_id&&DAY_INFO[photo.day_id])return photo.day_id;
    return photo.captured_at?dayForDate(String(photo.captured_at).slice(0,10)):null;
  }

  function photoGrid(photos){
    var grid=node('div','photo-grid');
    photos.forEach(function(photo){
      var link=node('a','photo-shot');
      link.href=photo.public_url;
      link.target='_blank';
      link.rel='noopener';
      link.setAttribute('aria-label','Open '+(photo.original_name||'crew photo')+' in a new tab');
      var img=node('img');
      img.src=photo.public_url;
      img.alt=photo.original_name||'Crew photo';
      img.loading='lazy';
      img.addEventListener('error',function(){
        img.remove();
        link.appendChild(node('span','photo-fallback','Open original photo ↗'));
      });
      link.appendChild(img);
      grid.appendChild(link);
    });
    return grid;
  }

  function stageFor(photo){
    return photo.stage_id?state.stages.find(function(s){return s.id===photo.stage_id;}):null;
  }

  function groupByDay(photos){
    var groups={};
    photos.forEach(function(photo){
      var dayId=photoDay(photo);
      var key=dayId||'extra';
      if(!groups[key])groups[key]={dayId:dayId,photos:[],stages:{}};
      groups[key].photos.push(photo);
      var stageKey=photo.stage_id||photo.location_name||'additional';
      if(!groups[key].stages[stageKey])groups[key].stages[stageKey]=[];
      groups[key].stages[stageKey].push(photo);
    });
    return groups;
  }

  function renderWall(){
    els.wall.innerHTML='';
    if(!state.photos.length){
      els.wall.appendChild(node('div','photo-empty',configured()?'No crew photos yet · upload the first originals to start the wall':'Connect Supabase to load and share the crew photo wall'));
      return;
    }
    var groups=groupByDay(state.photos);
    var keys=Object.keys(groups).sort(function(a,b){
      var order=['day1','day2','day3','day4','day5','extra'];
      return order.indexOf(a)-order.indexOf(b);
    });
    keys.forEach(function(key){
      var group=groups[key];
      var day=node('section','wall-day');
      var head=node('div','wall-dayhead');
      head.appendChild(node('h3','',group.dayId?DAY_INFO[group.dayId].label:'More Crew Photos'));
      head.appendChild(node('span','',group.photos.length+' photo'+(group.photos.length===1?'':'s')));
      day.appendChild(head);
      Object.keys(group.stages).forEach(function(stageKey){
        var photos=group.stages[stageKey];
        var stage=stageFor(photos[0]);
        var card=node('article','wall-stage');
        var title=node('div','wall-stagetitle');
        title.appendChild(node('h4','',stage?stage.title:photos[0].location_name||'Additional Crew Photos'));
        title.appendChild(node('span','',stage?stage.startLabel+' · '+photos.length+' photo'+(photos.length===1?'':'s'):'New itinerary entry'));
        card.appendChild(title);
        card.appendChild(photoGrid(photos));
        day.appendChild(card);
      });
      els.wall.appendChild(day);
    });
  }

  function wireCard(head){
    function toggle(){
      var stop=head.closest('.stop');
      var open=stop.classList.toggle('open');
      head.setAttribute('aria-expanded',open?'true':'false');
    }
    head.addEventListener('click',toggle);
    head.addEventListener('keydown',function(event){
      if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}
    });
  }

  function extraStop(photos,undated){
    var sorted=photos.slice().sort(function(a,b){return String(a.captured_at||'').localeCompare(String(b.captured_at||''));});
    var first=sorted[0];
    var time=first.captured_at?String(first.captured_at).slice(11,16):'--:--';
    var stop=node('li','stop rv in photo-extra');
    stop.appendChild(node('span','chip','EXIF · Additional'));
    stop.appendChild(node('span','node'));
    var card=node('div','card');
    var head=node('div','card-head');
    head.setAttribute('role','button');
    head.tabIndex=0;
    head.setAttribute('aria-expanded','false');
    head.appendChild(node('span','t',time));
    head.appendChild(node('h3','',first.location_name||(undated&&first.captured_at?'Crew Photos · '+String(first.captured_at).slice(0,10):undated?'Undated Crew Photos':'Additional Crew Photos')));
    head.appendChild(node('span','chev','▾'));
    card.appendChild(head);
    var sign=node('div','ntsign');
    sign.appendChild(node('span','lit'));
    sign.appendChild(document.createTextNode(photos.length+' photo'+(photos.length===1?'':'s')+' · no existing itinerary stage matched'));
    card.appendChild(sign);
    var detail=node('div','detail');
    var inner=node('div');
    var body=node('div','dbody');
    var note=node('div','note');
    note.appendChild(node('b','EXIF Photo Entry'));
    note.appendChild(document.createTextNode('Added automatically from original crew uploads. Select a different stage before uploading to place future photos elsewhere.'));
    body.appendChild(note);
    body.appendChild(photoGrid(sorted));
    inner.appendChild(body);
    detail.appendChild(inner);
    card.appendChild(detail);
    stop.appendChild(card);
    wireCard(head);
    return stop;
  }

  function injectExtras(){
    [].slice.call(document.querySelectorAll('.photo-extra')).forEach(function(n){n.remove();});
    [].slice.call(document.querySelectorAll('.photo-extra-day')).forEach(function(n){n.remove();});
    var unmatched=state.photos.filter(function(p){return !p.stage_id;});
    var groups={};
    unmatched.forEach(function(photo){
      var dayId=photoDay(photo);
      var key=dayId||'extra';
      if(!groups[key])groups[key]=[];
      groups[key].push(photo);
    });
    Object.keys(groups).forEach(function(key){
      var photos=groups[key];
      if(key!=='extra'){
        var day=document.getElementById(key);
        if(day){
          [].slice.call(day.querySelectorAll('ol.line')).forEach(function(line){line.appendChild(extraStop(photos,false));});
          return;
        }
      }
      var section=node('section','day photo-extra-day');
      section.id='photoExtras';
      section.style.setProperty('--c','var(--blue)');
      section.setAttribute('aria-label','Additional crew photos');
      var secHead=node('div','sec-head rv in');
      secHead.appendChild(node('h2','','Photo Extras'));
      secHead.appendChild(node('span','k','EXIF · Additional'));
      section.appendChild(secHead);
      section.appendChild(node('div','rule rv in'));
      var dayHead=node('div','day-head rv in');
      dayHead.appendChild(node('h2','','Additional Photos'));
      dayHead.appendChild(node('span','date','Unmatched'));
      section.appendChild(dayHead);
      var sub=node('p','day-sub rv in','New itinerary entries for photos outside the existing stages');
      section.appendChild(sub);
      var line=node('ol','line');
      line.appendChild(extraStop(photos,true));
      section.appendChild(line);
      var main=document.querySelector('main.wrap');
      main.appendChild(section);
    });
  }

  function renderAll(){
    renderQueue();
    renderWall();
    injectExtras();
  }

  async function loadPhotos(){
    if(!configured()){renderAll();return;}
    try{
      var response=await fetch(baseUrl()+'/rest/v1/'+config.table+'?select=*&order=captured_at.asc,created_at.asc',{
        headers:authHeaders()
      });
      if(!response.ok)throw new Error(await responseError(response));
      state.photos=await response.json();
      renderAll();
    }catch(error){
      setStatus('Could not load photos: '+(error&&error.message?error.message:'Supabase request failed'));
      renderQueue();
    }
  }

  els.input.addEventListener('change',function(){prepareFiles(els.input.files);});
  ['dragenter','dragover'].forEach(function(type){
    els.drop.addEventListener(type,function(event){event.preventDefault();els.drop.classList.add('drag');});
  });
  ['dragleave','drop'].forEach(function(type){
    els.drop.addEventListener(type,function(event){event.preventDefault();els.drop.classList.remove('drag');});
  });
  els.drop.addEventListener('drop',function(event){prepareFiles(event.dataTransfer.files);});
  els.clear.addEventListener('click',clearSelection);
  els.upload.addEventListener('click',uploadSelected);

  els.config.style.display=configured()?'none':'flex';
  buildStages();
  updateActions();
  renderWall();
  loadPhotos();
})();
