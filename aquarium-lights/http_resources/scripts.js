function onLoad() {
  setInterval(function() {
    getStatus();
  }, 10000);
}

function getStatus() {
  const request = new Request('/status', {
    method: 'GET'
  });

  request.json().then(function(data) {
    console.log(data)
    updateStatus();
  });
}

function updateStatus() {
  console.log("updateStatus()");
}
