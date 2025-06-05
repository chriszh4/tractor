// components/PlayZone.jsx
import React from "react";
import Card from "./Card";
import { sortHand } from "./cardUtils";

export default function PlayZone({ cards, winsTrick }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0px",
        padding: "1px",
        position: "relative",
        border: winsTrick ? "3px solid limegreen" : "3px solid transparent",
        borderRadius: "4px",
        transition: "border 0.3s ease",
      }}
    >
      {sortHand(cards).map((card, index) => (
        <div
          key={`${card.id}-${index}`}
          style={{
            marginLeft: index === 0 ? "0px" : "-70px",
            zIndex: index,
            position: "relative",
          }}
        >
          <Card card={card} selected={false} onClick={() => {}} />
        </div>
      ))}
    </div>
  );
}
