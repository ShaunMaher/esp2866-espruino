function onLoad() {
  setInterval(function() {
    getStatus();
  }, 10000);
}

function getStatus() {
  let fetchStatus = new Request('/status');
  fetch(fetchStatus)
  .then(function(response) {
    if (!response.ok) {
      console.log($response.status)
    }
    console.log(response.blob);
    updateStatus(JSON.parse(response.blob));
  });
}

function updateStatus(status) {
  console.log("updateStatus(" + JSON.stringify(status) + ")");
}
