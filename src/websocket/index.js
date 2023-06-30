const WebSocketServer = require('ws').Server;
const Consult = require('models/Consult');

let wss;
const connections = new Map();

const init = (server) => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (data) => {
      const message = JSON.parse(data);

      if (message.type === 'userId') {
        const { userId } = message;

        ws.userId = userId;

        if (connections.has(userId)) {
          console.log(
            `User ${userId} is already connected. Rejecting new connection.`,
          );
          return;
        }

        connections.set(userId, ws);
        console.log(`User ${userId} connected.`);
      } else if (message.type === 'chat') {
        const { consultId, content, receiverId } = message;
        const senderId = ws.userId;
        console.log(
          `Received message from ${senderId} to ${receiverId}: ${content}`,
        );

        const receiverSocket = connections.get(receiverId);
        const senderSocket = connections.get(senderId);

        const payload = {
          type: 'chat',
          consultId,
          content,
          senderId,
          createDate: Date.now(),
        };

        const res = await Consult.findByIdAndUpdate(
          {
            _id: consultId,
          },
          {
            $push: {
              messages: {
                sender: senderId,
                content,
                createDate: Date.now(),
              },
            },
          },
          { new: true },
        );

        const addedItem = res.messages[res.messages.length - 1];
        console.log(addedItem);

        const data = await Consult.find({ _id: consultId });
        const isSender = data[0].sender.toString() === senderId;
        const isReceiver = data[0].receiver.toString() === senderId;

        if (isSender) {
          await Consult.findByIdAndUpdate(
            {
              _id: consultId,
            },
            {
              isSenderRead: true,
              isReceiverRead: false,
            },
            { new: true },
          );
        }
        if (isReceiver) {
          await Consult.findByIdAndUpdate(
            {
              _id: consultId,
            },
            {
              isSenderRead: false,
              isReceiverRead: true,
            },
            { new: true },
          );
        }

        senderSocket.send(JSON.stringify(payload));

        if (receiverSocket) {
          receiverSocket.send(JSON.stringify(payload));
        } else {
          console.log(`Receiver ${receiverId} is not connected.`);
        }
      } else if (message.type === 'create') {
        const { receiverId } = message;

        const receiverSocket = connections.get(receiverId);

        const findRule = {
          $or: [{ sender: receiverId }, { receiver: receiverId }],
        };
        const data = await Consult.find(findRule)
          .populate({
            path: 'activePost',
            select: 'title companyName',
          })
          .sort({ updateDate: -1 })
          .select('sender receiver messages activePost updateDate');

        const payload = {
          type: 'create',
          data,
        };

        if (receiverSocket) {
          receiverSocket.send(JSON.stringify(payload));
        }
        console.log(
          `Received new message, retrieve data..., total ${data.length}.`,
        );
      } else if (message.type === 'read') {
        const { consultId, readerId } = message;

        const data = await Consult.find({ _id: consultId });
        const isSender = data[0].sender.toString() === readerId;
        const isReceiver = data[0].receiver.toString() === readerId;

        if (isSender) {
          await Consult.findByIdAndUpdate(
            {
              _id: consultId,
            },
            {
              isSenderRead: true,
            },
            { new: true },
          );
        }
        if (isReceiver) {
          await Consult.findByIdAndUpdate(
            {
              _id: consultId,
            },
            {
              isReceiverRead: true,
            },
            { new: true },
          );
        }
        console.log(`${consultId} user ${readerId} have read`);
      }

      console.log('ws userId: -----', ws.userId);
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
};

module.exports = { init };
