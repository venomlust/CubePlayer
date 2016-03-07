var Configstore = require('configstore');
var pkg = require('./package.json');
var DenseApp = require('app');
var BrowserWindow = require('browser-window');

var conf = new Configstore(pkg.name, {
  email: null
});



DenseApp.on('ready', function() {
  var homeWindow = new BrowserWindow({
    width: 800,
    height: 600,
    maxWidth: 800,
    maxHeight: 600,
    title: "Dense Player",
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
