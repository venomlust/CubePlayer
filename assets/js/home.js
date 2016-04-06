//Copyright 2016 Lucas Bertollo

// IDEA: Split functions into another javascript files
// IDEA: angular.js for the library

var fs = require('fs');
var ipcRenderer = require('electron')
  .ipcRenderer;
var Path = require('path');
var mm = require('musicmetadata');
var remote = require('remote');
var uuidGen = require('uuid');
var debug = true;

Array.prototype.extend = function(other_array) {
  if (other_array.constructor !== Array) return;
  other_array.forEach(function(v) {
    this.push(v);
  }, this);
};

var enumTypeUpdate = {
  NEW_ARTIST: 0,
  NEW_ALBUM: 1,
  NEW_MUSIC: 2
};

var enumMusicState = {
  PLAYING: 0,
  PAUSED: 1,
  STOPPED: 2
};

var enumWorkerMessage = {
  RUN: 0,
  PAUSE: 1,
  START: 2,
  SEEK: 3
};

var data = [];
var worker = new Worker("../../assets/js/music-worker.js");

var playing = {
  music: null,
  element: null,
  state: enumMusicState.STOPPED,
  volume: 1,
  duration: null,
  time: null,
  title: null
};

var conf = remote.getGlobal('sharedObj').conf;

$('#volume-slider').slider({
  range: "min",
  animate: true,
  min: 0,
  max: 10,
  value: 10,
  slide: function(event, ui) {
    if (playing.music !== null)
      playing.music.volume(ui.value * (ui.value / 100));
  }
});

$('#music-slider').slider({
  range: "min",
  animate: true,
  min: 0,
  max: 0,
  value: 0,
  stop: function(event, ui) {
    if (playing.music !== null) {
      playing.music.seek(ui.value);
      worker.postMessage({
        type: enumWorkerMessage.SEEK,
        time: ui.value
      });
    }
  }
});


$('#music-timeline').css('width', '100%');
$('#music-volume').css('width', '100%');

$('#library').height($(window).height() - $('#header').height());
var test = document.getElementById('#library');


$(window).resize(function() {
  $('#library').height($(window).height() - $('#header').height());
  if (Modernizr.mq('only screen and (max-width: 644px)')) {
    console.log('modernizer');
    $('#basic-controls').removeClass('col-xs-4');
    $('#basic-controls').addClass('col-xs-12');

    $('#realtime-info').removeClass('col-xs-8');
    $('#realtime-info').addClass('col-xs-12');

    $('#music-volume').css('width', '50%');
  }
  if (Modernizr.mq('only screen and (min-width: 644px)')) {
    console.log('modernizer');

    $('#basic-controls').removeClass('col-xs-12');
    $('#basic-controls').addClass('col-xs-4');

    $('#realtime-info').removeClass('col-xs-12');
    $('#realtime-info').addClass('col-xs-8');
    $('#music-volume').css('width', '100%');
  }

});

$('#library').on('dragover', function(event) {
  event.stopPropagation();
  event.preventDefault();
});

$('#header').on('dragover', function(event) {
  event.stopPropagation();
  event.preventDefault();
});

$('#library').on('drop', function(event) {
  event.stopPropagation();
  event.preventDefault();
  var dt = event.dataTransfer || (event.originalEvent && event.originalEvent.dataTransfer);
  var files = event.target.files || (dt && dt.files);

  console.log('Dropped files: ' + files.length);
  var pack = [];

  for (var i = 0; i < files.length; i++) {
    console.log(files[i].path);
    var checkedFiles = checkFile(files[i].path);
    if (checkedFiles !== null) pack.extend(checkedFiles);
  }
  console.log('Pack length: ' + pack.length);

  for (var j = 0; j < pack.length; j++) {
    organizeMediaFiles(pack[j]);
  }
});

$('#play-btn').on('click', function(event) {
  playMusic(null, null);
});
$('#pause-btn').on('click', function(event) {
  pauseMusic();
});
$('#stop-btn').on('click', function(event) {
  stopMusic();
});

function checkFile(path) {
  var pack = [];
  if (debug) console.log('Checking file at path: ' + path);

  var stat = fs.statSync(path);

  if (stat.isDirectory()) {
    if (debug) console.log('Path is a directory');
    var mediaFilePack = getMediaFiles(path);
    if (mediaFilePack !== null) pack = mediaFilePack;
  } else if (stat.isFile()) {
    if (debug) console.log('Path is a file');
    if (checkMediaFile(path)) pack.push(path);
  }

  if (debug) console.log('Returning: ' + pack.length);
  return (pack.length !== 0) ? pack : null;
}

function getMediaFiles(path) {
  var pack = [];

  if (debug) console.log('Getting media files');

  var files = fs.readdirSync(path);

  if (debug) console.log('Reading dir');

  for (var i = 0; i < files.length; i++) {
    var subPath = path + '/' + files[i];
    if (debug) console.log('Checking: ' + subPath);
    if (checkMediaFile(subPath)) pack.push(subPath);
  }

  if (debug) console.log('Returning: ' + pack.length);
  return (pack.length !== 0) ? pack : null;
}

function checkMediaFile(path) {
  var check = false;
  var stat = fs.statSync(path);

  check = (stat.isFile() && checkMediaFileExtension(path)) ? true : false;

  console.log(check);
  return check;
}

function checkMediaFileExtension(path) {
  return (Path.extname(Path.basename(path)) == ".mp3") ? true : false;
}

function organizeMediaFiles(filePath) {
  var parser = mm(fs.createReadStream(filePath), {
    duration: true
  }, function(err, metadata) {
    if (err) throw err;
    console.log(metadata);
    addToLibrary(metadata, filePath);
  });
}

function addToLibrary(metadata, path) {

  var holder = null;

  console.log(data);
  var i, j, k;
  for (i = 0; i < data.length; i++) {
    if (data[i].artist === metadata.artist[0]) {
      for (j = 0; j < data[i].album.length; j++) {
        console.log(data[i].album.length);
        console.log(j);
        console.log('Stored album name: ' + data[i].album[j].name + ' Delivered: ' + metadata.album);
        if (data[i].album[j].name === metadata.album) {
          for (k = 0; k < data[i].album[j].music.length; k++) {
            if (data[i].album[j].music[k].title === metadata.title) {
              return;
            }
          }
          console.log('new music');
          holder = {
            uuid: 'music_' + uuidGen.v1(),
            path: path,
            title: metadata.title,
            track: metadata.track.no,
            duration: ((metadata.duration | 0) + 2)
          };
          data[i].album[j].music.push(holder);
          console.log(data[i].album[j].uuid);
          displayToLibrary(enumTypeUpdate.NEW_MUSIC, holder, data[i].album[j].uuid, false);
          return;
        }
      }
      console.log('new album');
      holder = {
        uuid: 'album_' + uuidGen.v1(),
        name: metadata.album,
        picture: {
          format: metadata.picture[0].format,
          data: metadata.picture[0].data
        },
        music: [{
          uuid: 'music_' + uuidGen.v1(),
          path: path,
          title: metadata.title,
          track: metadata.track.no,
          duration: ((metadata.duration | 0) + 2)
        }]
      };
      data[i].album.push(holder);
      displayToLibrary(enumTypeUpdate.NEW_ALBUM, holder, data[i].uuid, false);
      return;
    }
  }
  console.log('new artist');
  holder = {
    uuid: 'band_' + uuidGen.v1(),
    artist: metadata.artist[0],
    album: [{
      uuid: 'album_' + uuidGen.v1(),
      name: metadata.album,
      picture: {
        format: metadata.picture[0].format,
        data: metadata.picture[0].data
      },
      music: [{
        uuid: 'music_' + uuidGen.v1(),
        path: path,
        title: metadata.title,
        track: metadata.track.no,
        duration: ((metadata.duration | 0) + 2)
      }]
    }]
  };
  data.push(holder);
  displayToLibrary(enumTypeUpdate.NEW_ARTIST, holder, null, false);
  return;
}

function displayToLibrary(type, obj, info, flag) {
  var library = document.getElementById('library');
  var artist,
    row,
    colFour,
    canvas,
    colEight,
    table,
    tr,
    tdTrack,
    tdTitle,
    line,
    albumNameHolder,
    albumName, att;

  switch (type) {
    case enumTypeUpdate.NEW_ARTIST:
      artist = document.createElement('div');
      artist.id = obj.uuid;

      var artistNameHolder = document.createElement('div');

      var artistName = document.createElement('h4');
      artistName.innerHTML = obj.artist;
      artistNameHolder.appendChild(artistName);

      line = document.createElement('hr');
      artistNameHolder.appendChild(line);

      artist.appendChild(artistNameHolder);

      if (!flag) {
        row = document.createElement('div');
        row.className = 'row';
        row.id = obj.album[0].uuid;

        albumNameHolder = document.createElement('div');
        albumNameHolder.className = 'col-xs-12';

        albumName = document.createElement('h5');
        albumName.innerHTML = obj.album[0].name;

        albumNameHolder.appendChild(albumName);

        row.appendChild(albumNameHolder);

        colFour = document.createElement('div');
        colFour.className = 'col-xs-4';

        canvas = document.createElement('canvas');
        canvas.width = '100';
        canvas.height = '100';
        if (!((obj.album[0].picture.data.data !== null) || (typeof obj.album[0].picture.data.data != "undefined")) &&
          ((obj.album[0].picture.data !== null) || (typeof obj.album[0].picture.data != "undefined"))) {
          if (typeof obj.album[0].picture.data.data == "undefined")
            setImage(obj.album[0].picture.data, obj.album[0].picture.format, canvas);
          else
            setImage(obj.album[0].picture.data.data, obj.album[0].picture.format, canvas);
        }
        colEight = document.createElement('div');
        colEight.className = 'col-xs-8';

        table = document.createElement('table');
        table.className = 'table';

        tr = table.insertRow();
        tr.id = obj.album[0].music[0].uuid;

        att = document.createAttribute("data-track");
        att.value = obj.album[0].music[0].track;
        tr.setAttributeNode(att);

        tr.addEventListener('dblclick', play, false);

        tdTrack = tr.insertCell(0);
        tdTrack.innerHTML = obj.album[0].music[0].track;

        tdTitle = tr.insertCell(1);
        tdTitle.innerHTML = obj.album[0].music[0].title;

        artist.appendChild(row);
        row.appendChild(colFour);
        colFour.appendChild(canvas);
        row.appendChild(colEight);
        colEight.appendChild(table);
        library.appendChild(artist);
      } else {
        library.appendChild(artist);
      }
      break;
    case enumTypeUpdate.NEW_ALBUM:
      artist = document.getElementById(info);

      row = document.createElement('div');
      row.className = 'row';
      console.log(obj);
      row.id = obj.uuid;

      albumNameHolder = document.createElement('div');
      albumNameHolder.className = 'col-xs-12';

      albumName = document.createElement('h5');
      albumName.innerHTML = obj.name;

      albumNameHolder.appendChild(albumName);

      row.appendChild(albumNameHolder);

      colFour = document.createElement('div');
      colFour.className = 'col-xs-4';

      canvas = document.createElement('canvas');
      canvas.width = '100';
      canvas.height = '100';

      if (((obj.picture.data.data !== null) || (typeof obj.picture.data.data != "undefined")) &&
        ((obj.picture.data !== null) || (typeof obj.picture.data != "undefined"))) {
        if (typeof obj.picture.data.data == "undefined")
          setImage(obj.picture.data, obj.picture.format, canvas);
        else
          setImage(obj.picture.data.data, obj.picture.format, canvas);
      }
      colEight = document.createElement('div');
      colEight.className = 'col-xs-8';

      table = document.createElement('table');
      table.className = 'table';

      if (!flag) {
        tr = table.insertRow();
        tr.id = obj.music[0].uuid;

        att = document.createAttribute("data-track");
        att.value = obj.music[0].track;
        tr.setAttributeNode(att);

        tr.addEventListener('dblclick', play, false);

        tdTrack = tr.insertCell(0);
        tdTrack.innerHTML = obj.music[0].track;

        tdTitle = tr.insertCell(1);
        tdTitle.innerHTML = obj.music[0].title;
      }

      row.appendChild(colFour);
      colFour.appendChild(canvas);
      row.appendChild(colEight);
      colEight.appendChild(table);
      artist.appendChild(row);

      break;
    case enumTypeUpdate.NEW_MUSIC:
      table = document.getElementById(info).getElementsByClassName('col-xs-8')[0].getElementsByTagName('table')[0];

      tr = table.insertRow();
      tr.id = obj.uuid;

      att = document.createAttribute("data-track");
      att.value = obj.track;
      tr.setAttributeNode(att);

      tr.addEventListener('dblclick', play, false);

      tdTrack = tr.insertCell(0);
      tdTrack.innerHTML = obj.track;

      tdTitle = tr.insertCell(1);
      tdTitle.innerHTML = obj.title;
      break;
  }
}

function displayToLibrarySaved(obj) {
  console.log(obj.length);
  for (var i = 0; i < obj.length; i++) {
    displayToLibrary(enumTypeUpdate.NEW_ARTIST, obj[i], null, true);
    for (var j = 0; j < obj[i].album.length; j++) {
      displayToLibrary(enumTypeUpdate.NEW_ALBUM, obj[i].album[j], obj[i].uuid, true);
      for (var l = 0; l < obj[i].album[j].music.length; l++) {
        displayToLibrary(enumTypeUpdate.NEW_MUSIC, obj[i].album[j].music[l], obj[i].album[j].uuid, true);
      }
    }
  }
}

//working here
function organizeTrack(table, tr) {
  var length = table.rows.length;
  if (length == 1) {
    if (parseInt(table.item(0).getAttribute('data-track')) < parseInt(tr.getAttribute('data-track'))) {

    }
  }
  for (var i = 0; i < length; i++) {
    //if(parseInt(table.item(i).getAttribute('data-track')) < )
  }
}

function setImage(unitArray, format, canvas) {
  var u8 = new Uint8Array(unitArray);
  var b64encoded = btoa(Uint8ToString(u8));

  var ctx = canvas.getContext("2d");

  var image = new Image();

  image.onload = function() {
    ctx.drawImage(image, 0, 0, 100, 100);
  };
  image.src = 'data:image/' + format + ';base64,' + b64encoded;
}

function Uint8ToString(u8a) {
  var CHUNK_SZ = 0x10000;
  var c = [];
  for (var i = 0; i < u8a.length; i += CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)));
  }
  return c.join("");
}

function play() {
  console.log('play active' + this.id);
  var music = getObjects(data, 'uuid', this.id);
  playing.duration = music[0].duration | 0;
  document.getElementById('music-name').innerHTML = music[0].title;
  document.getElementById('music-time').innerHTML = '0:00 / ' + toMinutes(playing.duration);
  $("#music-slider").slider("option", "max", playing.duration);
  playMusic(music[0].path, this);
}

function playMusic(path, element) {
  if (playing.music === null && path !== null && element !== null) {
    console.log('setuping music');
    playing.music = setUpMusic(path);
    selectMusic(element);
    playing.music.play();
    newWorker();
    worker.postMessage({
      type: enumWorkerMessage.RUN,
      duration: playing.duration
    });
  } else if (playing.music !== null && playing.state == enumMusicState.PAUSED) {
    console.log('returning music');
    playing.music.play();
    worker.postMessage({
      type: enumWorkerMessage.START,
      time: Math.round(playing.music.seek())
    });
  } else if (playing.music !== null && path !== null && element !== null) {
    stopMusic();
    playing.music = setUpMusic(path);
    unselectMusic();
    selectMusic(element);
    playing.music.play();
    newWorker();
    worker.postMessage({
      type: enumWorkerMessage.RUN,
      duration: playing.duration
    });
  }
}

function pauseMusic() {
  if (playing.music !== null && playing.state == enumMusicState.PLAYING) {
    playing.music.pause();
    worker.postMessage({
      type: enumWorkerMessage.PAUSE
    });
  }
}

function stopMusic() {
  if (playing.music !== null) {
    playing.music.stop();
    playing.music = null;
    document.getElementById('music-name').innerHTML = '';
    document.getElementById('music-time').innerHTML = '0:00 / 0:00';
    playing.state = enumMusicState.STOPPED;
    stopWorker();
  }
}

function selectMusic(element) {
  playing.element = element;
  console.log(element);
  element.style.backgroundColor = '#34495E';
  element.style.color = 'white';
  console.log(element);
}

function unselectMusic() {
  console.log('unselectMusic');
  if (playing.element !== null) {
    playing.element.removeAttribute("style");
    playing.element = null;
  }
}

function setUpMusic(path) {
  console.log('creating object');
  console.log(path);

  var music = new Howl({
    src: [path],
    volume: playing.volume,
    onend: function() {
      playing.state = enumMusicState.STOPPED;
      playing.music = null;
      console.log('end');
      stopWorker();
      unselectMusic();
      $("#music-name").text('');
      $("#music-time").text('0:00 / 0:00');
      $("#music-slider").slider("option", "max", 0);
    },
    onpause: function() {
      playing.state = enumMusicState.PAUSED;
    },
    onstop: function() {

    },
    onplay: function() {
      playing.state = enumMusicState.PLAYING;
    }
  });
  console.log('returning obj');
  return music;
}

function getObjects(obj, key, val) {
  var objects = [];
  for (var i in obj) {
    if (!obj.hasOwnProperty(i)) continue;
    if (typeof obj[i] == 'object') {
      objects = objects.concat(getObjects(obj[i], key, val));
    } else if (i == key && obj[key] == val) {
      objects.push(obj);
    }
  }
  return objects;
}

function setTimer(fixed, seconds) {
  var time = document.getElementById('music-time');
  if (fixed) {
    time.innerHTML = time.innerHTML.slice(-5).concat(" ", toMinutes(seconds));
  } else {
    time.innerHTML = toMinutes(seconds) + " " + time.innerHTML.slice(-5);
  }
}

function toMinutes(seconds) {
  return (Math.round((seconds / 60) * 100) / 100).toString().replace('.', ':');
}

function stopWorker() {
  worker.terminate();
  worker = null;
}

function newWorker() {
  worker = new Worker("../../assets/js/music-worker.js");
  worker.onmessage = function(event) {
    $("#music-slider").slider("option", "value", event.data);
    setTimer(false, event.data);
  };
}

ipcRenderer.on('message-data', function(event, _data) {
  if (_data !== null) {
    console.log(_data);
    data = _data;
    displayToLibrarySaved(data);
  }
});

window.onbeforeunload = function(e) {
  //conf.set('data', data);
  //console.log('set');
  //ipcRenderer.send('message-close-window', data);
};
