// components/Card.jsx
import React from "react";

export default function Card({ card, selected, onClick }) {
  return (
    <img
      src={`/cards/${card.code}.svg`}
      alt={card.code}
      onClick={onClick}
      style={{
        transform: selected ? "scale(1.20)" : "scale(1)",
        transition:
          "transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease",
        width: "90px",
        height: "auto",
        cursor: "pointer",
        margin: "2px",
      }}
    />
  );
}
