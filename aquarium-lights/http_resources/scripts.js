var refreshStatus = '';

function onLoad() {
  refreshStatus = setInterval(function() {
    getStatus();
  }, 10000);
}

function getStatus() {
  let fetchStatus = new Request('/status');
  fetch(fetchStatus)
  .then(response => {
    if (!response.ok) {
      console.log(response.status)
    }
    return response.text();
  })
  .then(response => {
    console.log(response);
    updateStatus(JSON.parse(response));
  });
}

function updateStatus(status) {
  console.log("updateStatus(" + JSON.stringify(status) + ")");
}
