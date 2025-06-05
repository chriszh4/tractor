import GameBoard from "./components/GameBoard";
import BotPlayer from "./components/BotPlayer";

function App() {
  return (
    <div className="App">
      <GameBoard />
      <BotPlayer nthPlayer={2} />
      <BotPlayer nthPlayer={3} />
      <BotPlayer nthPlayer={4} />
    </div>
  );
}

export default App;
