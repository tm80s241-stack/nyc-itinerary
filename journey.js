(function(){
  "use strict";

  var DAY_INFO={
    day1:{date:'2026-11-18',label:'Day 1 · Arrival',color:'#0039A6'},
    day2:{date:'2026-11-19',label:'Day 2 · Midtown Icons',color:'#EE352E'},
    day3:{date:'2026-11-20',label:'Day 3 · Downtown',color:'#FCCC0A'},
    day4:{date:'2026-11-21',label:'Day 4 · Choose Your Line',color:'#00933C'},
    day5:{date:'2026-11-22',label:'Day 5 · Home',color:'#B933AD'}
  };
  var els={
    play:document.getElementById('journeyPlay'),
    timeline:document.getElementById('journeyEvents'),
    player:document.getElementById('journeyPlayer'),
    track:document.getElementById('jpTrack'),
    title:document.getElementById('jpTitle'),
    image:document.getElementById('jpImage'),
    caption:document.getElementById('jpCaption'),
    date:document.getElementById('jpDate'),
    count:document.getElementById('jpCount'),
    next:document.getElementById('jpNext'),
    close:document.getElementById('jpClose'),
    prev:document.getElementById('jpPrev'),
    pause:document.getElementById('jpPlayPause'),
    fullscreen:document.getElementById('jpFullscreen'),
    nextStop:document.getElementById('jpNextStop')
  };
  var events=[];
  var currentEvent=0,currentPhoto=0,timer=null,playing=false,previousOverflow='';

  function node(tag,cls,text){
    var n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined&&text!==null)n.textContent=text;
    return n;
  }
  function photoTime(photo){return String(photo.captured_at||photo.created_at||'');}
  function minutes(photo){
    var time=photoTime(photo);
    var match=time.match(/T(\d{2}):(\d{2})/);
    return match?parseInt(match[1],10)*60+parseInt(match[2],10):null;
  }
  function timeLabel(photo){
    var time=photoTime(photo);
    return time.indexOf('T')>=0?time.slice(11,16):'--:--';
  }
  function dateFor(photo){
    if(photo.day_id&&DAY_INFO[photo.day_id])return DAY_INFO[photo.day_id].date;
    var time=photoTime(photo);
    return time?time.slice(0,10):'Undated';
  }
  function dayFor(photo){
    if(photo.day_id&&DAY_INFO[photo.day_id])return photo.day_id;
    var date=dateFor(photo);
    return Object.keys(DAY_INFO).find(function(id){return DAY_INFO[id].date===date;})||null;
  }
  function distanceKm(a,b){
    var rad=Math.PI/180,lat1=a.lat*rad,lat2=b.lat*rad;
    var dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
    var h=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
  }
  function landmark(photo){
    if(typeof photo.latitude!=='number'||typeof photo.longitude!=='number')return null;
    var point={lat:photo.latitude,lon:photo.longitude},best=null;
    (window.NYC_LANDMARKS||[]).forEach(function(spot){
      var distance=distanceKm(point,spot);
      if(distance<=spot.radius/1000&&(!best||distance<best.distance))best={name:spot.name,distance:distance};
    });
    return best;
  }
  var GENERIC_STAGE_TITLES={
    '5th Avenue · Shops & Landmarks':true,
    'Coffee & Breakfast · Midtown':true,
    'Lunch · Central Park & Midtown':true,
    'Everyone · Free Afternoon':true,
    'Back to Romer · Shower & Change':true,
    'Back to Romer · Rest & Change':true
  };
  function locationFor(photo){
    if(window.NYC_PHOTO_OVERRIDES&&window.NYC_PHOTO_OVERRIDES[photo.original_name])return {title:window.NYC_PHOTO_OVERRIDES[photo.original_name],kind:'landmark'};
    var spot=landmark(photo);
    if(spot&&photo.stage_title&&GENERIC_STAGE_TITLES[photo.stage_title])return {title:spot.name,kind:'landmark'};
    if(photo.stage_id&&photo.stage_title)return {title:photo.stage_title,kind:'stage'};
    if(spot)return {title:spot.name,kind:'landmark'};
    return {title:photo.location_name||'Additional Crew Photos',kind:'additional'};
  }
  function buildEvents(photos){
    var sorted=photos.slice().sort(function(a,b){return photoTime(a).localeCompare(photoTime(b));});
    var result=[],current=null;
    sorted.forEach(function(photo){
      var location=locationFor(photo),time=minutes(photo);
      if(current&&current.title===location.title&&(time===null||current.lastTime===null||Math.abs(time-current.lastTime)<=45)){
        current.photos.push(photo);
        if(time!==null)current.lastTime=time;
      }else{
        current={
          id:'event-'+result.length,
          title:location.title,
          kind:location.kind,
          dayId:dayFor(photo),
          date:dateFor(photo),
          start:photoTime(photo),
          lastTime:time,
          photos:[photo]
        };
        result.push(current);
      }
    });
    return result;
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
  function renderTimeline(){
    els.timeline.innerHTML='';
    if(!events.length){
      els.timeline.appendChild(node('div','photo-empty','No photo-mined events yet · upload originals to generate your actual journey'));
      return;
    }
    var groups={};
    events.forEach(function(event){
      var key=event.dayId||'extra';
      if(!groups[key])groups[key]={dayId:event.dayId,date:event.date,events:[]};
      groups[key].events.push(event);
    });
    Object.keys(groups).sort(function(a,b){
      var order=['day1','day2','day3','day4','day5','extra'];
      return order.indexOf(a)-order.indexOf(b);
    }).forEach(function(key){
      var group=groups[key];
      var section=node('section','journey-day');
      var head=node('div','journey-day-head');
      head.appendChild(node('h3','',group.dayId?DAY_INFO[group.dayId].label:group.date));
      var count=group.events.reduce(function(sum,event){return sum+event.photos.length;},0);
      head.appendChild(node('span','',count+' photo'+(count===1?'':'s')));
      section.appendChild(head);
      group.events.forEach(function(event){
        var card=node('article','event-card');
        card.style.setProperty('--c',group.dayId?DAY_INFO[group.dayId].color:'#0039A6');
        var top=node('div','event-head');
        top.appendChild(node('span','event-time',timeLabel({captured_at:event.start})));
        var title=node('div','event-title');
        title.appendChild(node('h4','',event.title));
        title.appendChild(node('div','event-location',event.kind==='stage'?'Itinerary stage':event.kind==='landmark'?'Nearby landmark':'Ad hoc stop'));
        top.appendChild(title);
        top.appendChild(node('span','event-count',event.photos.length+' photo'+(event.photos.length===1?'':'s')));
        card.appendChild(top);
        card.appendChild(photoGrid(event.photos));
        section.appendChild(card);
      });
      els.timeline.appendChild(section);
    });
  }
  function renderTrack(){
    els.track.innerHTML='';
    events.forEach(function(event,index){
      var stop=node('span','jp-stop'+(index===currentEvent?' current':''));
      stop.style.setProperty('--c',event.dayId?DAY_INFO[event.dayId].color:'#0039A6');
      stop.appendChild(node('span','jp-node'));
      stop.title=event.title;
      els.track.appendChild(stop);
    });
  }
  function showEvent(index,photoIndex){
    if(!events.length)return;
    currentEvent=Math.max(0,Math.min(index,events.length-1));
    var event=events[currentEvent];
    currentPhoto=Math.max(0,Math.min(photoIndex===undefined?0:photoIndex,event.photos.length-1));
    var photo=event.photos[currentPhoto];
    els.title.textContent=event.title;
    els.date.textContent=event.date+' · '+timeLabel({captured_at:event.start});
    els.count.textContent='Stop '+(currentEvent+1)+' of '+events.length+' · Photo '+(currentPhoto+1)+' of '+event.photos.length;
    els.next.textContent=currentEvent<events.length-1?'Next stop · '+events[currentEvent+1].title:'End of line · '+event.title;
    els.caption.textContent=photo.original_name||event.title;
    els.image.classList.add('changing');
    els.image.src=photo.public_url;
    els.image.alt=photo.original_name||event.title;
    renderTrack();
  }
  function play(){
    if(playing)return;
    playing=true;
    els.pause.textContent='Pause';
    timer=setInterval(advance,5000);
  }
  function pause(){
    playing=false;
    els.pause.textContent='Play';
    if(timer){clearInterval(timer);timer=null;}
  }
  function advance(){
    if(!events.length)return;
    var event=events[currentEvent];
    if(currentPhoto<event.photos.length-1){
      showEvent(currentEvent,currentPhoto+1);
    }else if(currentEvent<events.length-1){
      showEvent(currentEvent+1,0);
    }else{
      pause();
      els.next.textContent='End of line · journey complete';
    }
  }
  function openPlayer(index){
    if(!events.length)return;
    try{
      els.play.textContent='Opening journey…';
      previousOverflow=document.body.style.overflow;
      document.body.style.overflow='hidden';
      els.player.hidden=false;
      showEvent(index===undefined?0:index,0);
      play();
      els.play.textContent='▶ Playing journey';
    }catch(error){
      els.play.textContent='Playback error: '+(error&&error.message?error.message:'unknown error');
    }
  }
  function closePlayer(){
    pause();
    document.body.style.overflow=previousOverflow;
    els.player.hidden=true;
    if(document.fullscreenElement&&document.exitFullscreen){
      try{document.exitFullscreen().catch(function(){});}catch(e){}
    }
  }

  els.play.addEventListener('click',function(){openPlayer(0);});
  els.close.addEventListener('click',closePlayer);
  els.pause.addEventListener('click',function(){if(playing)pause();else play();});
  els.fullscreen.addEventListener('click',function(){
    if(els.player.requestFullscreen){
      try{els.player.requestFullscreen().catch(function(){});}catch(e){}
    }
  });
  els.nextStop.addEventListener('click',function(){if(currentEvent<events.length-1)showEvent(currentEvent+1,0);else pause();});
  els.prev.addEventListener('click',function(){
    if(currentPhoto>0)showEvent(currentEvent,currentPhoto-1);
    else if(currentEvent>0)showEvent(currentEvent-1,events[currentEvent-1].photos.length-1);
  });
  document.addEventListener('keydown',function(event){
    if(els.player.hidden)return;
    if(event.key==='Escape')closePlayer();
    else if(event.key==='ArrowRight')advance();
    else if(event.key==='ArrowLeft')els.prev.click();
    else if(event.key===' '){event.preventDefault();els.pause.click();}
  });
  els.image.addEventListener('load',function(){els.image.classList.remove('changing');});
  els.image.addEventListener('error',function(){
    els.image.classList.remove('changing');
    els.image.removeAttribute('src');
    els.caption.textContent='Photo unavailable · choose next image';
  });

  window.NYCJourneyRefresh=function(){
    var data=window.NYCPhotoData;
    events=buildEvents(data&&data.photos?data.photos:[]);
    els.play.disabled=events.length===0;
    renderTimeline();
    if(!els.player.hidden){
      showEvent(Math.min(currentEvent,Math.max(0,events.length-1),0));
      if(!events.length)closePlayer();
    }
  };

  var archive=document.getElementById('plannedArchive');
  [].slice.call(document.querySelectorAll('.tbn,.maprow')).forEach(function(link){
    link.addEventListener('click',function(){if(archive)archive.open=true;});
  });
  window.NYCJourneyRefresh();
})();
