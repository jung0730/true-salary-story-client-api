const WebSocketServer = require('ws').Server;

const wss = new WebSocketServer({ port: 8080 });
const connections = new Map();

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    const message = JSON.parse(data);

    if (message.type === 'userId') {
      const { userId } = message;

      if (connections.has(userId)) {
        console.log(
          `User ${userId} is already connected. Rejecting new connection.`,
        );
        return;
      }

      ws.userId = userId;
      connections.set(userId, ws);
      console.log(`User ${userId} connected.`);
    } else if (message.type === 'chat') {
      const { content, receiverId } = message;
      const senderId = ws.userId;
      console.log(
        `Received message from ${senderId} to ${receiverId}: ${content}`,
      );

      const receiverSocket = connections.get(receiverId);
      const senderSocket = connections.get(senderId);

      if (receiverSocket) {
        const message = {
          type: 'chat',
          content,
          senderId,
        };

        receiverSocket.send(JSON.stringify(message));
        senderSocket.send(JSON.stringify(message));
      } else {
        console.log(`Receiver ${receiverId} is not connected.`);
      }
    }

    console.log('ws: -----', ws.userId);
  });

  ws.on('close', () => {
    console.log('Close connected');

    const userId = ws.userId;

    if (userId) {
      connections.delete(userId);
      console.log(`User ${userId} disconnected.`);
    }
  });
});
