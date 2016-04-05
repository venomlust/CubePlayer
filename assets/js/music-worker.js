/* jshint ignore:start */
var enumStatus = {
  RUNNING:0,
  PAUSED:1
};

var enumWorkerMessage = {
  RUN:0,
  PAUSE:1,
  START:2,
  SEEK:3
};

var status = enumStatus.PAUSED;
var duration = 0;
var time = 0;


self.addEventListener("message", function(e) {
  if(e.data.type === enumWorkerMessage.START){
    console.log("worker started");
    time = e.data.time;
    status = enumStatus.RUNNING;
  }else if(e.data.type === enumWorkerMessage.PAUSE){
    status = enumStatus.PAUSED;
  }else if(e.data.type === enumWorkerMessage.RUN){
    duration = e.data.duration;
    time = 0;
    status = enumStatus.RUNNING;
    countTime();
  }else if(e.data.type === enumWorkerMessage.SEEK){
    time = e.data.time;
  }

}, false);


function countTime(){
  if(status === enumStatus.RUNNING){
    setTimeout("countTime()" , 1000);
    console.log(time);
    time += 1;
    postMessage(time);
  }else{
    console.log('waiting');
    setTimeout("countTime()" , 100);
  }
}
