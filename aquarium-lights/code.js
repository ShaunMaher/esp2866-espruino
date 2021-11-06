var serialSetupComplete = 0;

// Current state of the relay
var relayState = 0;

// Sane defaults if we can't fetch real sunset/sunrise times.
var sunsetTime = "18:00";
var sunriseTime = "06:00";

// Zero will trigger an attempt to update the sunset/sunrise times immediately on startup
var today = 0;

const apiUrl = "https://api.sunrise-sunset.org/json";
const apiParams = {
  "lat": "-31.8142176",
  "lng": "144.9631608",
  "formatted": "0"
};

var eventLog = [];
var httpServer = {};

// Overload the console.log() function so we can create an internal event log array
var realConsole = console;
var console = {};
console.log = function(object) {
  realConsole.log(object);
  
  //TODO: shift() objects out of the array if it gets too big;
  eventLog.push({ "time": getTime(), "event": object });
};

const htmlHeader = "<html><head><meta content=\"text/html;charset=utf-8\" http-equiv=\"Content-Type\"><meta content=\"utf-8\" http-equiv=\"encoding\">";


const indexPage = "<title>Aquarium thingo</title></head><body><a href=\"/eventLog\">Event Log (JSON)</a><br/><a href=\"/relayForceOn\">Force Lights On</a><br/><a href=\"/relayForceOff\">Force Lights Off</a><br/><a href=\"/relayForceOff\">Set lights to automatic</a><br/></body></html>";

const relayActionOkPage = "<title>Aquarium thingo</title></head><body onload=\"window.location.href = '/';\">Ok</body></html>";

function relayClose() {
  if (!serialSetupComplete) {
    Serial1.setup(9600);
    serialSetupComplete = 1;
  }
  Serial1.write('\xa0\x01\x01\xa2');
  relayState = 1;
}

function relayOpen() {
  if (!serialSetupComplete) {
    Serial1.setup(9600);
    serialSetupComplete = 1;
  }
  Serial1.write('\xa0\x01\x00\xa1');
  relayState = 0;
}

function getDaylightHours() {
  let date = new Date();
  let now = date.getFullYear() + "-" + date.getMonth() + '-' + date.getDate();
  if (now != today) {
    console.log("Fetching updated sunrise/sunset data");
    let http = require("http");
    let queryString = "?";
    for (const paramName in apiParams) {
      queryString = queryString + paramName + '=' + encodeURIComponent(apiParams[paramName]) + '&';
    }
    queryString = queryString + "date=" + encodeURIComponent(now);
    console.log(apiUrl + queryString);
    http.get(apiUrl + queryString, function(res) {
      let allData = '';
      res.on('data', function(data) {
        allData = allData + data;
      });
      res.on('close', function() {
        console.log(allData);
        let parsedData = {};
        try {
          parsedData = JSON.parse(allData);
        }
        catch(err) {
          console.log("failed to parse received data as JSON");
        }
        
        console.log(parsedData);
      });
    }).on('error', function(e) {
      console.log("Failed to fetch updated sunrise/sunset data.", e);
    });
  }
}

function onPageRequest(req, res) {
  var a = url.parse(req.url, true);
  console.log(a);
  if (a.path == "/") {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(htmlHeader + indexPage);
    res.end('');
  }
  else if (a.path == "/relayForceOn") {
    relayClose();
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(htmlHeader + relayActionOkPage);
  }
  else if (a.path == "/relayForceOff") {
    relayOpen();
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(htmlHeader + relayActionOkPage);
  }
  else if (a.path == "/eventLog") {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify(eventLog));
    res.end('');
  }
  else {
    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end('');
  }
}

function onInit() {
  console.log("onInit()");
  console.log(httpServer);
  relayOpen();
  try {
    httpServer = require("http").createServer(onPageRequest).listen(82);
    console.log(httpServer);
  }
  catch(err) {
    console.log(err);
  }
  getDaylightHours();
}

onInit();