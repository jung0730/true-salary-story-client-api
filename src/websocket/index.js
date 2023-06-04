const WebSocketServer = require('ws').Server;

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    data = data.toString();
    console.log(data);

    // ws.send(data);

    let clients = wss.clients;
    clients.forEach((client) => {
      client.send(data);
    });
  });

  ws.on('close', () => {
    console.log('Close connected');
  });
});
