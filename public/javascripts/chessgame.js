const socket = io();

const chess = new Chess();

const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null; // Start with null to ensure it's set correctly
let spectator = null;

const renderboard = () => {
  const board = chess.board();

  boardElement.innerHTML = "";

  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowIndex;
      squareElement.dataset.col = squareIndex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );

        // Get the piece unicode and set as innerText
        const pieceUnicode = getPieceUnicode(square);
        console.log("Piece Unicode: ", pieceUnicode); // Add logging to check the value
        pieceElement.innerText = pieceUnicode;

        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowIndex, col: squareIndex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", (e) => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", function (e) {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", function (e) {
        e.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };
          handleMove(sourceSquare, targetSource);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });

  // Flip the board if playerRole is 'b'
  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }

  console.log("Player Role: ", playerRole); // Debugging statement
};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };

  const result = chess.move(move);

  if (result === null) {
    showPopup("Invalid move");
    return;
  }

  socket.emit("move", move);

  // Show whose turn it is
  const currentTurn = chess.turn() === "w" ? "White" : "Black";
  showPopup(`It's ${currentTurn}'s turn`);

  // Check for game-ending conditions
  if (chess.in_checkmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    createCelebrationRain();
    showPopup(`Hooray 🥳🥳!! ${winner} wins by checkmate!`);
  } else if (chess.in_stalemate()) {
    showPopup("Stalemate! It's a draw.");
  } else if (chess.in_draw()) {
    showPopup("Draw!");
  }
};

socket.on("playerRole", function (role) {
  playerRole = role;
  console.log("Received player role: ", playerRole); // Debugging statement
  renderboard();
});

socket.on("spectatorRole", function () {
  playerRole = null;
  console.log("Received spectator role"); // Debugging statement
  renderboard();
  showPopup(`${socket.id} is watching this match`);
});

socket.on("boardState", function (fen) {
  chess.load(fen);
  renderboard();
});

socket.on("move", function (move) {
  chess.move(move);
  renderboard();
});

const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♙",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };
  return unicodePieces[piece.type] || "";
};

socket.on("showPopup", (message) => {
  displayPopup(message);
});

const showPopup = (message) => {
  // Emit the popup message to the server
  socket.emit("showPopup", message);

  // Display the popup message locally
  displayPopup(message);
};

const displayPopup = (message) => {
  const popup = document.getElementById("popup");
  popup.innerText = message;
  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 3000); // Hide after 2 seconds
};

const createCelebrationRain = () => {
  const celebrationContainer = document.createElement("div");
  celebrationContainer.classList.add("celebration-container");
  document.body.appendChild(celebrationContainer);

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement("div");
    confetti.classList.add("confetti");
    celebrationContainer.appendChild(confetti);

    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.animationDelay = `${Math.random() * 2}s`;
    confetti.style.animationDuration = `${Math.random() * 2 + 3}s`;
  }

  setTimeout(() => {
    celebrationContainer.remove();
  }, 15000); // Remove after 7 seconds
};

renderboard();
