// components/DealButton.jsx
import React from "react";
import Button from "./Button";

export default function DealButton({ onDeal }) {
  return <Button onClick={onDeal}> Deal Cards</Button>;
}
