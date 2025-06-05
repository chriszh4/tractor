// components/BidButton.jsx
import React from "react";
import Button from "./Button";
import { canBid } from "./cardUtils";

export default function BidButton({
  playerName,
  selectedCards,
  bidSelected,
  trumpRank,
  activeBid,
  activeBidder,
  bidSecondsLeft,
}) {
  return (
    <Button
      onClick={bidSelected}
      disabled={
        selectedCards.length === 0 ||
        !canBid(
          playerName,
          selectedCards,
          trumpRank,
          activeBid,
          activeBidder
        ) ||
        bidSecondsLeft === 0
      }
    >
      Bid Selected Cards
    </Button>
  );
}
