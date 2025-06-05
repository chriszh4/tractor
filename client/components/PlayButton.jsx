// components/PlayButton.jsx
import React from "react";
import Button from "./Button";
import { isPlayableFirst } from "./cardUtils";

export default function PlayButton({
  selectedCards,
  playSelected,
  bottomPileDone,
}) {
  return (
    <Button
      onClick={playSelected}
      disabled={selectedCards.length === 0 || !bottomPileDone}
    >
      Play Selected Cards
    </Button>
  );
}
