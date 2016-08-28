angular.module("appModule", ['angular.filter']).controller("cubePlayerCtrl", function($scope, $timeout) {
    var fs = require('fs');
    var ipcRenderer = require('electron')
        .ipcRenderer;
    var Path = require('path');
    var mm = require('musicmetadata');
    var uuidGen = require('uuid');
    var debug = true;
    var Howler = require('howler');

    var db = new loki(require('path').resolve(__dirname, '../../cubeplayer.db'));

    var storage = null;

    db.loadDatabase({}, function(result) {
        if (db.getCollection('Storage') == null) {
            db.addCollection('Storage', {
                unique: ['title']
            });
            storage = db.getCollection('Storage');
        } else
            storage = db.getCollection('Storage');
        loadLibrary();
    });


    $scope.musics = [];

    $scope.musicHolder = {
        startVolume: 1,
        title: null,
        duration: null,
        time: null,
        music: null
    };

    $('#volume-slider').slider({
        range: "min",
        animate: true,
        min: 0,
        max: 10,
        value: 10,
        slide: function(event, ui) {
            if ($scope.musicHolder.music !== null) {
                $scope.musicHolder.music.volume(ui.value * (ui.value / 100));
                $scope.musicHolder.volume = ui.value * (ui.value / 100);
            }
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

    //btns
    $('#play-btn').on('click', function(event) {
        if ($scope.musicHolder.music !== null) $scope.musicHolder.music.play();
    });
    $('#pause-btn').on('click', function(event) {
        if ($scope.musicHolder.music !== null) $scope.musicHolder.music.pause();
    });
    $('#stop-btn').on('click', function(event) {
        if ($scope.musicHolder.music !== null) $scope.musicHolder.music.stop();
    });
    //manually calls fsStat and add path atribute to callback
    function fsStatPath(path, callback) {
        fs.stat(path, function(err, stat) {
            if (err) callback(err);
            stat.path = path;
            callback(null, stat);
        });
    };

    /* On DropFiles */
    $('#library').on('drop', function(event) {
        event.stopPropagation();
        event.preventDefault();
        var dt = event.dataTransfer || (event.originalEvent && event.originalEvent.dataTransfer);
        var files = event.target.files || (dt && dt.files);

        if (debug) console.log('Dropped files: ' + files.length);
        var pack = [];

        for (var i = 0; i < files.length; i++) {
            pack.push(files[i].path);
        }

        async.map(pack, fsStatPath, function(err, results) {
            for (var i = 0; i < results.length; i++) {
                if (results[i].isDirectory()) {
                    if (debug) console.log('Path is a directory');
                    var files = fs.readdirSync(results[i].path);
                    for (var j = 0; j < files.length; j++) files[j] = (results[i].path + '/' + files[j]);
                    async.map(files, fsStatPath, function(err, statFiles) {
                        for (var k = 0; k < statFiles.length; k++) {
                            if ((Path.extname(Path.basename(statFiles[k].path)) == ".mp3") ? true : false) {
                                var tmpPath = statFiles[k].path;
                                mm(fs.createReadStream(tmpPath), {
                                    duration: true
                                }, function(err, metadata) {
                                    if (err) throw err;
                                    try {
                                        var holder = {
                                            _id: uuidGen.v1(),
                                            path: tmpPath,
                                            title: metadata.title,
                                            trackno: metadata.track.no,
                                            duration: metadata.duration,
                                            album: metadata.album,
                                            artist: metadata.artist[0],
                                            format: metadata.picture[0].format
                                        };
                                        storage.insert(holder);
                                        $scope.musics.push(holder);
                                        db.saveDatabase();
                                        $scope.$apply();
                                    } catch (e) {
                                        throw e;
                                    }
                                });
                            }
                        }
                    });
                } else if (results[i].isFile()) {
                    if (debug) console.log('Path is a file');
                    if ((Path.extname(Path.basename(results[i].path)) == ".mp3") ? true : false) {
                        var tmpPath = results[i].path;
                        mm(fs.createReadStream(results[i].path), {
                            duration: true
                        }, function(err, metadata) {
                            if (err) throw err;
                            try {
                                var holder = {
                                    _id: uuidGen.v1(),
                                    path: tmpPath,
                                    title: metadata.title,
                                    trackno: metadata.track.no,
                                    duration: metadata.duration,
                                    album: metadata.album,
                                    artist: metadata.artist[0],
                                    format: metadata.picture[0].format
                                };
                                storage.insert(holder);
                                $scope.musics.push(holder);
                                db.saveDatabase();
                                $scope.$apply();
                            } catch (e) {
                                throw e;
                            }
                        });
                    }
                }
            }
        });
    });

    $scope.playMusic = function(music) {
        var musicTitle = music.title;
        if ($scope.musicHolder.music !== null) {
            $scope.musicHolder.music.stop();
            $scope.musicHolder.music == null;
        }
        $scope.musicHolder.music = new Howl({
            src: [music.path],
            volume: $scope.musicHolder.volume,
            html5: true,
            onplay: function() {
                $scope.musicHolder.title = musicTitle;
                $scope.musicHolder.duration = formatTime(Math.round(this.duration()));
                $("#music-slider").slider("option", "max", Math.round(this.duration()));
                step();
                $scope.$apply();
            },
            onstop: function() {
                $scope.musicHolder.time = null;
                $("#music-slider").slider("option", "value", 0);
                $scope.$digest();
            },
            onend: function() {
                $("#music-slider").slider("option", "max", 0);
                $("#music-slider").slider("option", "value", 0);
                $scope.musicHolder.title = null;
                $scope.musicHolder.time = null;
                $scope.musicHolder.duration = null;
            }
        });
        $scope.musicHolder.music.play();
    };

    function step() {
        var interval = setInterval(function() {
            if (!$scope.musicHolder.music.playing()) {
                clearInterval(interval);
                return;
            }
            $scope.musicHolder.time = formatTime(Math.round($scope.musicHolder.music.seek()));
            $("#music-slider").slider("option", "value", Math.round($scope.musicHolder.music.seek()));
            $scope.$digest();
        }, 1000);
    };

    function loadLibrary() {
        console.log(storage.find());
        $scope.musics = storage.find();

        $scope.$apply();
    };

    function formatTime(secs) {
        var minutes = Math.floor(secs / 60) || 0;
        var seconds = (secs - minutes * 60) || 0;

        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    };

});
