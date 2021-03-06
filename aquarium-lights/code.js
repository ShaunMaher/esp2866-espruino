var serialSetupComplete = 0;

// Current state of the relay
var relayState = 0;

var automaticLights = 1;
var automaticLightsInterval = '';

var bootTime = getTime();

// Sane defaults if we can't fetch real sunset/sunrise times.
var sunsetTime = "18:00";
var sunriseTime = "06:00";

// Timezone name
var tzName = 'Australia/Melbourne';
var tzOffsetHours = 11;

var storage = require("Storage");
var FILESIZE = 2048;
var file = {
  name : "settings",
  offset : FILESIZE, // force a new file to be generated at first
};

// External Stylesheet URL
//  https://gitcdn.link/
var externalCssUrl = "https://gitcdn.link/repo/ShaunMaher/esp2866-espruino/main/aquarium-lights/http_resources/style.css";

//var externalScriptsUrl = "https://gitcdn.link/repo/ShaunMaher/esp2866-espruino/main/aquarium-lights/http_resources/scripts.js";
var externalScriptsUrl = "https://gitcdn.link/repo/ShaunMaher/esp2866-espruino/d45ba79855786692e19421244e34ac42549b0ac0/aquarium-lights/http_resources/scripts.js";

// We can get some details about the selected timezone here:
// http://worldtimeapi.org/api/timezone/Australia/Melbourne

// Zero will trigger an attempt to update the sunset/sunrise times immediately on startup
var today = 0;

const apiUrl = "https://api.sunrise-sunset.org/json";
const apiParams = {
  "lat": "-37.8142176",  // Melbourne Australia
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
  
  // shift() objects out of the array if it gets too big
  while (eventLog.length >= 10) eventLog.shift();
  
  eventLog.push({ "time": getTime(), "event": object });
};

const htmlHeader = "<html><head><meta content=\"text/html;charset=utf-8\" http-equiv=\"Content-Type\"><meta content=\"utf-8\" http-equiv=\"encoding\"><link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin><link href=\"https://fonts.googleapis.com/css2?family=Roboto:wght@300&display=swap\" rel=\"stylesheet\"><link href=\"" + externalCssUrl + "\" rel=\"stylesheet\"><script src=\"" + externalScriptsUrl + "\"></script> ";

const htmlFooter = "</body></html>";

const indexPage = "<title>Aquarium thingo</title></head><body onload=\"onLoad()\"><div id=\"eventLogButton\"><a href=\"/eventLog\">Event Log (JSON)</a></div><div id=\"relayForceOnButton\"><a href=\"/relayForceOn\">Force Lights On</a></div><div id=\"relayForceOffButton\"><a href=\"/relayForceOff\">Force Lights Off</a></div><div id=\"relayForceOnButton\"><a href=\"/automaticOn\">Set lights to automatic</a></div><div id=\"relayForceOnButton\"><a href=\"/automaticOff\">Disable automatic</a></div>";

const relayActionOkPage = "<title>Aquarium thingo</title></head><body onload=\"window.location.href = '/';\">Ok";

// This never gets called as there is no way to change any settings
//  other than modifying them in code.
function saveSettings() {
  var settings = {
    "automaticLights": 1,
    "sunsetTime": sunsetTime,
    "sunriseTime": sunriseTime,
    "apiParams.lat": apiParams.lat,
    "apiParams.lng": apiParams.lng,
    "tzName": tzName,
    "tzOffsetHours": tzOffsetHours
  };
  var settingsJson = JSON.stringify(settings);
  var l = settingsJSON.length;
  storage.write("settings",settingsJSON,0,FILESIZE);
}

function loadSettings() {
  
}

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
  let date = new Date(((getTime() - (tzOffsetHours * 3600)) * 1000));
  let now = date.getFullYear() + "-" + (date.getMonth() + 1) + '-' + date.getDate().toString().padStart(2, "0");
  console.log("Current date (UTC): " + now);
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
        //console.log(allData);
        let parsedData = {};
        try {
          parsedData = JSON.parse(allData);
        }
        catch(err) {
          console.log("failed to parse received data as JSON");
          return;
        }
        
        //console.log(parsedData);
        let newSunsetTime = new Date(parsedData.results.sunset);
        sunsetTime = newSunsetTime.getHours().toString().padStart(2, "0") + ":" + newSunsetTime.getMinutes().toString().padStart(2, "0");
        console.log("New Sunset Time: " + sunsetTime);
        
        let newSunriseTime = new Date(parsedData.results.sunrise);
        sunriseTime = newSunriseTime.getHours().toString().padStart(2, "0") + ":" + newSunriseTime.getMinutes().toString().padStart(2, "0");
        console.log("New Sunrise Time: " + sunriseTime);
      });
    }).on('error', function(e) {
      console.log("Failed to fetch updated sunrise/sunset data.", e);
    });
  }
}

function onPageRequest(req, res) {
  var a = url.parse(req.url, true);
  console.log("HTTP Request: " + JSON.stringify(a));
  if (a.path == "/") {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(htmlHeader + indexPage + htmlFooter);
    res.end('');
  }
  else if (a.path == "/relayForceOn") {
    automaticLights = 0;
    relayClose();
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(htmlHeader + relayActionOkPage + htmlFooter);
  }
  else if (a.path == "/relayForceOff") {
    automaticLights = 0;
    relayOpen();
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(htmlHeader + relayActionOkPage + htmlFooter);
  }
  else if (a.path == "/eventLog") {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify(eventLog));
    res.end('');
  }
  else if (a.path == "/status") {
    let result = {
      "automaticLights": 1,
      "relayState": relayState,
      "uptime": 0,
      "sunsetTime": sunsetTime,
      "sunriseTime": sunriseTime,
      "apiParams.lat": apiParams.lat,
      "apiParams.lng": apiParams.lng
    };
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(result));
  }
  else {
    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end('');
  }
}

function automaticLightsTimer() {
  //console.log("automaticLightsTimer()");
  if (automaticLights != 1) {
    //console.log("automatic lights are disabled.");
    return;
  }
  
  let nowTime = new Date();
  let today = nowTime.getFullYear() + '-' + (nowTime.getMonth() + 1).toString().padStart(2, "0") + "-" + nowTime.getDate().toString().padStart(2, "0");
  let onTime = new Date(today + "T" + sunriseTime + ":00");  // Today's date with sunriseTime as the time component
  let offTime = new Date(today + "T" + sunsetTime + ":00");  // Today's date with sunsetTime as the time component
  
  if ((nowTime.getTime() > onTime.getTime()) && (nowTime.getTime() < offTime.getTime())) {
    if (relayState == 0) {
      console.log("It's Sunrise! Turning on the lights");
    }
    relayClose();
  }
  else {
    if (relayState == 1) {
      console.log("It's Sunset. Turning off the lights");
    }
    relayOpen();
  }
}

function onInit() {
  console.log("onInit()");
  
  loadSettings();
  E.setTimeZone(tzOffsetHours);
  
  relayOpen();
  try {
    httpServer = require("http").createServer(onPageRequest).listen(82);
  }
  catch(err) {
    console.log(err);
  }
  getDaylightHours();
  
  automaticLightsInterval = setInterval(automaticLightsTimer, 1000);
}

onInit();