// Connect to WebSocket server
const socket = new WebSocket('ws://localhost:3000');

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Display dynamic time updates
const app = document.getElementById('app');
setInterval(async () => {
  const response = await fetch('/api/data');
  const json = await response.json();
  app.innerHTML = `<h1>${json.message}</h1>`;
}, 2000);
