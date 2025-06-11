const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const GameEngine = require("./game/GameEngine");

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

let SECONDS_TO_WAIT_FOR_BID = 5;
let MS_IN_BETWEEN_CARDS = 300;
let MS_IN_BETWEEN_DISPLAY_BOTTOM_PILE = 1000;

const DEBUG = false;
if (DEBUG) {
  SECONDS_TO_WAIT_FOR_BID = 1;
  MS_IN_BETWEEN_CARDS = 30;
  MS_IN_BETWEEN_DISPLAY_BOTTOM_PILE = 50;
}

const ranks = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

const rooms = {}; // roomName → { engine: GameEngine, players: [], teams:[] }

const playerJoinOrder = {};

io.on("connection", (socket) => {
  socket.on("leave_room", ({ roomName, name }) => {
    if (!rooms[roomName]) {
      return;
    }
    // Remove entire room
    console.log(`Deleting room: ${roomName}`);
    socket.leave(roomName);
    delete rooms[roomName];
    delete playerJoinOrder[roomName];
  });

  socket.on("create_room", ({ roomName, name }) => {
    console.log(`Player ${name} (${socket.id}) creating room: ${roomName}`);
    if (!rooms[roomName]) {
      rooms[roomName] = {
        players: [],
        engine: null,
        teams: null,
      };
      playerJoinOrder[roomName] = {};
    } else {
      console.log(`Room ${roomName} already exists!`);
      socket.emit("error", "Room already exists, try again!");
      return;
    }

    const room = rooms[roomName];

    // Add new player
    if (!room.players.includes(name)) {
      room.players.push(name);
      playerJoinOrder[roomName][name] = room.players.length;
    }

    socket.join(roomName);

    socket.emit("accept_join_room", { playerName: name, roomCode: roomName });
    if (room.teams) {
      setTimeout(() => {
        socket.emit("update_team", {
          updatedTeams: room.teams,
        });
      }, 300);
    }
  });

  socket.on("join_room", ({ roomName, name }) => {
    console.log(`Player ${name} (${socket.id}) joining room: ${roomName}`);
    if (!rooms[roomName]) {
      console.log(`Room ${roomName} does not exist!`);
      socket.emit("error", "Room does not exist!");
      return;
    }

    const room = rooms[roomName];

    // If room full, do not add
    if (room.players.length >= 4) {
      console.log(`Room ${roomName} is full!`);
      socket.emit("error", "Room is full!");
      return;
    }

    // Check if player name exists
    if (room.players.includes(name)) {
      socket.emit("error", "Please choose another name!");
      return;
    }

    // Add new player
    if (!room.players.includes(name)) {
      room.players.push(name);
      playerJoinOrder[roomName][name] = room.players.length;
    }

    socket.join(roomName);

    socket.emit("accept_join_room", { playerName: name, roomCode: roomName });
    if (room.teams) {
      setTimeout(() => {
        socket.emit("update_team", {
          updatedTeams: room.teams,
        });
      }, 300);
    }
  });

  socket.on("update_team", ({ roomCode, updatedTeams }) => {
    const room = rooms[roomCode];

    room.teams = updatedTeams;

    io.to(roomCode).emit("update_team", {
      updatedTeams,
    });
  });

  socket.on("bot_join_room", ({ roomName }) => {
    socket.join(roomName);
    console.log(`Bot joining room: ${roomName}`);
  });

  socket.on("request_start_game", ({ roomName, playerName, teams }) => {
    io.to(roomName).emit("confirm_start_game", { teams });

    const room = rooms[roomName];
    room.players = [
      room.teams.team1[0].name,
      room.teams.team2[0].name,
      room.teams.team1[1].name,
      room.teams.team2[1].name,
    ];

    room.engine = new GameEngine(roomName, io, room.players);
    io.to(roomName).emit("ready_game", {
      throneName: room.engine.throneName,
      throneTeammateName: room.engine.throneTeammateName,
      teamRank: room.engine.teamRank,
    });
  });

  // this is the sorta start game event
  socket.on("deal_cards", ({ roomName, playerName }) => {
    console.log(`Dealing cards for room: ${roomName}`);

    const room = rooms[roomName];

    //if (room.players.some((p) => p.name === playerName)) {
    if (room.players.includes(playerName)) {
      setTimeout(() => {
        dealCards(roomName);
      }, 300);
    } else {
      socket.emit("error", "You are not a player in this room.");
    }
  });

  socket.on("bid_cards", ({ roomName, playerName, bid }) => {
    // Assume client checked that this bid is valid (and overturns any previous bids)
    const engine = rooms[roomName]?.engine;
    if (!engine) {
      socket.emit("error", "Game not started yet.");
      return;
    }
    console.log(
      `Player ${playerName} bidding: ${bid.map((c) => c.id).join(", ")}`
    );
    engine.bidCards(playerName, bid);
    sendGameState(roomName);
  });

  socket.on("bottom_pile_done", ({ roomName, playerName, bottomPile }) => {
    const room = rooms[roomName];
    if (!room || !room.engine) return;

    console.log(
      `Player ${playerName} selected bottom pile: ${bottomPile.map(
        (c) => c.id
      )}`
    );

    const engine = room.engine;
    if (engine.throneName !== playerName) {
      socket.emit("error", "Not your turn to play bottom pile!");
      return;
    }

    // Check if selectedCards are valid
    if (bottomPile.length !== 8) {
      socket.emit("error", "You must select exactly 8 cards.");
      return;
    }

    // Add selected cards to the throne's hand
    engine.hands[playerName] = [
      ...engine.hands[playerName],
      ...engine.bottomPile,
    ];
    engine.bottomPile = bottomPile;
    // remove selected cards from the throne's hand
    engine.hands[playerName] = engine.hands[playerName].filter(
      (card) => !bottomPile.some((b) => b.id === card.id)
    );

    io.to(roomName).emit("bottom_pile_done");
    sendGameState(roomName);
  });

  socket.on("play_cards", ({ roomName, playerName, selectedCards }) => {
    const room = rooms[roomName];
    if (!room || !room.engine) return;

    const engine = room.engine;
    if (!engine.readyToPlay) {
      return;
    }
    const currentPlayer = engine.playerOrder[engine.turnIndex];

    if (playerName !== currentPlayer) {
      console.log(
        `Player ${playerName} tried to play cards, but it's ${currentPlayer}'s turn.`
      );
      socket.emit("error", "Not your turn!");
      return;
    }

    try {
      const gameOver = engine.playCards(playerName, selectedCards);
      if (gameOver) {
        io.to(roomName).emit("end_round", {
          gameEndInfo: engine.gameEndInfo,
          gameOver: engine.gameOver,
        });
      }
    } catch (error) {
      socket.emit("error", error.message);
      return;
    }

    sendGameState(roomName);
  });

  function sendGameState(roomName) {
    const room = rooms[roomName];
    if (room === undefined) {
      return;
    }
    const engine = room.engine;
    if (!engine) return;

    io.to(roomName).emit("update_game", engine.getPublicState());
  }

  function dealCards(roomName) {
    //console.log(`Dealing cards for room: ${roomName}`);
    const room = rooms[roomName];
    if (!room || !room.engine) return;

    const engine = room.engine;

    if (!engine.firstRound) {
      // Reset previous states
      engine.resetRound();
    }

    io.to(roomName).emit("start_game", {
      trumpRank: engine.trumpRank,
      playerNames: engine.playerNames,
    });

    const deck = [...engine.deck];
    const playerNames = engine.playerNames;
    playerNames.forEach((name) => (engine.hands[name] = []));

    let i = 0;
    const dealInterval = setInterval(() => {
      if (i >= deck.length) {
        clearInterval(dealInterval);

        // Wait "countdown" seconds and emit bid_ends countdown each second
        let countdown = SECONDS_TO_WAIT_FOR_BID;
        const bidCountdownInterval = setInterval(() => {
          io.to(roomName).emit("bid_ends", { secondsLeft: countdown });
          countdown--;

          if (countdown < 0) {
            clearInterval(bidCountdownInterval);

            // After countdown ends, setup round
            if (engine.firstRound) {
              engine.setThronePlayer(engine.activeBidder || playerNames[0]);
              engine.throneIndex = playerNames.indexOf(engine.throneName);
              engine.trickStarter = engine.throneName;
              engine.turnIndex = engine.throneIndex;
              if (engine.throneIndex === -1) engine.throneIndex = 0;
              engine.firstRound = false;
            }

            const finishBidPhase = () => {
              io.to(roomName).emit("dealt_cards");

              engine.trickStarter = engine.throneName;

              // Place all bids back where they belong
              for (const playerName of Object.keys(engine.hands)) {
                if (playerName === engine.throneName && !engine.activeBidder)
                  continue;
                engine.hands[playerName] = [
                  ...engine.hands[playerName],
                  ...(engine.playZones[playerName] || []),
                ];
                engine.playZones[playerName] = [];
              }
              // Reamining cards in throne's playzone is revealed bottom pile
              engine.bottomPile = [
                ...engine.bottomPile,
                ...(engine.playZones[engine.throneName] || []),
              ];
              engine.playZones[engine.throneName] = [];

              Object.keys(engine.hands).forEach((name) => {
                engine.hands[name] = engine.hands[name].map((card) =>
                  engine.reparseCard(card)
                );
              });

              engine.bottomPile = engine.bottomPile.map((card) =>
                engine.reparseCard(card)
              );

              sendGameState(roomName);

              io.to(roomName).emit(
                "bottom_pile",
                engine.bottomPile,
                engine.throneName,
                engine.hands[engine.throneName]
              );

              engine.readyToPlay = true;
            };

            if (!engine.activeBidder) {
              // Reveal each card in the bottom pile one by one
              let curTrumpSuit = null;
              let curHighestRankOrder = null;

              const revealInterval = setInterval(() => {
                if (engine.bottomPile.length === 0) {
                  clearInterval(revealInterval);
                  engine.trumpSuit = curTrumpSuit;
                  finishBidPhase();
                  return;
                }

                const cardToReveal = engine.bottomPile[0];
                engine.playZones[engine.throneName].push(cardToReveal);
                engine.bottomPile.shift();
                sendGameState(roomName);

                if (!cardToReveal.code.startsWith("JOKER")) {
                  if (cardToReveal.code.startsWith(engine.trumpRank)) {
                    engine.trumpSuit = cardToReveal.code.slice(-1);
                    clearInterval(revealInterval);
                    finishBidPhase();
                    return;
                  }
                  const cardRank = cardToReveal.code.slice(0, -1);
                  const cardRankOrder = ranks.indexOf(cardRank);
                  if (
                    curHighestRankOrder === null ||
                    cardRankOrder > curHighestRankOrder
                  ) {
                    curHighestRankOrder = cardRankOrder;
                    curTrumpSuit = cardToReveal.code.slice(-1);
                  }
                }
              }, MS_IN_BETWEEN_DISPLAY_BOTTOM_PILE);
            } else {
              // If there is an active bidder, just finish the bid phase
              finishBidPhase();
            }
          }
        }, 1000);

        return;
      }

      const card = deck[i];
      const playerName =
        playerNames[(engine.throneIndex + i) % playerNames.length];
      engine.hands[playerName].push(card);
      sendGameState(roomName);
      i++;
    }, MS_IN_BETWEEN_CARDS);
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
