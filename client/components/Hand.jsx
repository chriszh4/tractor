// components/Hand.jsx
import React from "react";
import Card from "./Card";
import { sortHand } from "./cardUtils";

export default function Hand({
  cards,
  selectedCards,
  toggleCard,
  stackMargin,
  trumpRank = "9",
}) {
  const sortedCards = sortHand(cards, trumpRank);

  return (
    <div
      style={{
        display: "flex",
        gap: "0px",
        padding: "10px",
        position: "relative",
      }}
    >
      {sortedCards.map((card, index) => (
        <div
          key={card.id}
          style={{
            marginLeft: index === 0 ? "0px" : stackMargin,
            zIndex: index,
            position: "relative",
          }}
        >
          <Card
            card={card}
            selected={selectedCards.some(
              (selectedCard) => selectedCard.id === card.id
            )}
            onClick={() => toggleCard(card)}
          />
        </div>
      ))}
    </div>
  );
}
