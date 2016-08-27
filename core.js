//Copyright 2016 Lucas Bertollo
var Configstore = require('configstore');
var pkg = require('./package.json');
var ipcMain = require('electron').ipcMain;
var DenseApp = require('app');
var BrowserWindow = require('browser-window');

DenseApp.on('ready', function() {
  var homeWindow = new BrowserWindow({
    width: 770,
    height: 600,
    maxWidth: 770,
    minWidth: 350,
    title: "Cube Player",
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
