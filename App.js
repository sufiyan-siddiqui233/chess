const express = require("express");
const socketIO = require("socket.io");
const http = require("http");
const path = require("path");

const { Chess } = require("chess.js");

const app = express();

const server = http.createServer(app);
const io = socketIO(server);

let chess = new Chess();
let players = {};
let spectators = [];

// Set up view engine and static files
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", function (req, res) {
  res.render("index");
});

// Socket.io events
io.on("connection", function (socket) {
  console.log(`Socket ${socket.id} connected`);

  // Emit popup message to all clients
  socket.on("showPopup", (message) => {
    io.emit("showPopup", message);
  });

  // Handle player and spectator roles
  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
  } else {
    spectators.push(socket.id);
    socket.emit("spectatorRole");
  }

  // Handle disconnect
  socket.on("disconnect", function () {
    console.log(`Socket ${socket.id} disconnected`);

    if (socket.id === players.white) {
      io.emit("showPopup", "White player has disconnected");
      io.emit("gameOver", { result: "disconnection", winner: "Black" });
      resetGame();
    } else if (socket.id === players.black) {
      io.emit("showPopup", "Black player has disconnected");
      io.emit("gameOver", { result: "disconnection", winner: "White" });
      resetGame();
    } else {
      spectators = spectators.filter((id) => id !== socket.id);
    }
  });

  // Handle move
  socket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && socket.id !== players.white) return;
      if (chess.turn() === "b" && socket.id !== players.black) return;

      const result = chess.move(move);

      if (result) {
        io.emit("move", move);
        io.emit("boardState", chess.fen());

        // Check for game-ending conditions
        if (chess.isCheckmate()) {
          const winner = chess.turn() === "w" ? "Black" : "White";

          // io.emit("showPopup", `${winner} wins by checkmate!`);
          io.emit("gameOver", { result: "checkmate", winner: winner });
          resetGame();
        } else if (chess.isStalemate()) {
          // io.emit("showPopup", "Stalemate! It's a draw.");
          io.emit("gameOver", { result: "stalemate" });
          resetGame();
        } else if (chess.in_draw()) {
          // io.emit("showPopup", "Draw!");
          io.emit("gameOver", { result: "Draw" });
          resetGame();
        }
      } else {
        console.log("Invalid Move", move);
        socket.emit("InvalidMove", move);
      }
    } catch (error) {
      console.error("Error during move:", error);
      socket.emit("InvalidMove", move);
    }
  });

  function resetGame() {
    chess = new Chess();
    io.emit("reset", chess.fen());
    // Reset players and spectators if needed
    players = {
      white: null,
      black: null,
    };
    spectators = [];
  }

  // Handle initial board state
  socket.emit("boardState", chess.fen());
});

// Start server
const port = 3000;
server.listen(port, function () {
  console.log(`Server running on http://localhost:${port}`);
});
