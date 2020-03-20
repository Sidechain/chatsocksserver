const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server, {
  pingInterval: 10000,
  pingTimeout: 250
});

const connectedUsers = [];

const gracefulShutdown = () => {
  console.log("Closing server...");
  server.close(() => console.log("Express closed"));
  io.close(() => console.log("Socket.io closed"));
};

io.on("connection", socket => {
  socket.on("disconnecting", reason => {
    const errorMessage = `You were logged out due to ${reason}`;
    io.to(socket.id).emit("error", errorMessage);
    console.log("DISCONNECTING", reason);
  });

  const { id } = socket.client;
  console.log(`User connected with id: ${id}`);

  socket.on("register nickname", sentNickname => {
    console.log("server received this", sentNickname);

    if (!sentNickname) {
      const errorMessage = `Nickname can't be empty!`;
      console.log("User submitted empty nickname");
      io.to(socket.id).emit("error", errorMessage);
    } else if (connectedUsers.includes(sentNickname)) {
      const errorMessage = "Nickname already taken!";
      console.log(`name ${sentNickname} already taken`);
      io.to(socket.id).emit("error", errorMessage);
    } else {
      const nickname = "SYSTEM";
      const msg = `${sentNickname} just joined the chat!`;

      console.log(`name ${sentNickname} available!`);
      socket.client.nickname = sentNickname;
      connectedUsers.push(sentNickname);

      io.emit("chat message", { nickname, msg });
      io.emit("accept nickname");
    }
    // console.log(`and finally, the full array ${connectedUsers}`);
  });

  socket.on("chat message", ({ nickname, msg }) => {
    const errorMessage = `Can't send empty messages`;

    if (!msg) io.to(socket.id).emit("error", errorMessage);
    else io.emit("chat message", { nickname, msg });
  });

  socket.on("disconnect", reason => {
    const nickname = "SYSTEM";
    const msg = `${socket.client.nickname} left the chat due to ${reason}`;
    const indexToRemove = connectedUsers.indexOf(socket.client.nickname);

    connectedUsers.splice(indexToRemove, 1);
    console.log(`${socket.client.nickname} disconnected because of ${reason}`);
    io.emit("chat message", { nickname, msg });
    console.log("these are the connected users now", connectedUsers);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listen on *: ${PORT}`));

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
