import React, { useMemo } from "react";
import GameBoard from "./components/GameBoard";
import BotPlayer from "./components/BotPlayer";

function App() {
  const randomRoomName = useMemo(
    () => Math.random().toString(36).substring(2, 10),
    []
  );
  console.log("random room named gen", randomRoomName);

  return (
    <div className="App">
      <BotPlayer roomName={randomRoomName} nthPlayer={2} />
      <BotPlayer roomName={randomRoomName} nthPlayer={3} />
      <BotPlayer roomName={randomRoomName} nthPlayer={4} />
      <GameBoard roomName={randomRoomName} />
    </div>
  );
}

export default App;
