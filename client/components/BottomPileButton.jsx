// components/BottomPileButton.jsx
import React from "react";
import Button from "./Button";

export default function BottomPileButton({
  throneName,
  myName,
  selectedCards,
  selectBottomPile,
}) {
  return (
    <Button
      onClick={() => selectBottomPile(selectedCards)}
      disabled={throneName !== myName || selectedCards.length !== 8}
    >
      {throneName === myName ? "Select Bottom Pile" : "Waiting for Throne.."}
    </Button>
  );
}
