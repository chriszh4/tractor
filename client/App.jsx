import React, { useMemo, useState, useRef, use } from "react";
import io from "socket.io-client";
import GameBoard from "./components/GameBoard";
import BotPlayer from "./components/BotPlayer";
import GameLobby from "./components/GameLobby";
import RoomLobby from "./components/RoomLobby";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001");
// Initialize multiple bot sockets for different bots

function App() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [inGameLobby, setInGameLobby] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const playerList = useRef([]);
  const botSocketsRef = useRef([
    io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"),
    io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"),
    io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"),
    io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"),
  ]);
  const isHost = useRef(false);

  if (inGameLobby) {
    return (
      <div className="App">
        <GameLobby
          socket={socket}
          setInGameLobby={setInGameLobby}
          onSetPlayerName={setPlayerName}
          onSetRoomCode={setRoomCode}
          isHost={isHost}
        />
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="App">
        <RoomLobby
          socket={socket}
          playerName={playerName}
          roomCode={roomCode}
          setGameStarted={setGameStarted}
          playerList={playerList}
        />
      </div>
    );
  }

  return (
    <div className="App">
      <GameBoard socket={socket} playerName={playerName} roomName={roomCode} />
      {isHost.current &&
        playerList.current
          .filter((player) => player.type === "bot")
          .map((botPlayer, index) => (
            <BotPlayer
              key={index} // "could" Prefer unique bot name, fallback to index
              socket={botSocketsRef.current[index]}
              roomName={roomCode}
              botName={botPlayer.name}
            />
          ))}
    </div>
  );
}

export default App;
