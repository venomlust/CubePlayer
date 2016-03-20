var Configstore = require('configstore');
var pkg = require('./package.json');
var DenseApp = require('app');
var BrowserWindow = require('browser-window');

var conf = new Configstore(pkg.name, {
  data: [],
  lastWindowSize: null,
  settings: null
});

conf.set('data', []);

global.sharedObj = {
  'conf': conf
};

DenseApp.on('ready', function() {
  var homeWindow = new BrowserWindow({
    width: 770,
    height: 600,
    maxWidth: 770,
    minWidth: 350,
    title: "IceBlock Player",
    resizable: true,
    center: true,
    type: 'desktop',
    webPreferences: [{
      'overlayScrollbars': true
    }]
  });
  homeWindow.loadURL('file://' + __dirname + '/assets/html/home.html');
  homeWindow.setMenu(null);
  homeWindow.openDevTools();
});

DenseApp.on('window-all-closed', function() {
  DenseApp.quit();
});
