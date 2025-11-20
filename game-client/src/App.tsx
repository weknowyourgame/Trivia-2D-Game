import { useState } from "react";
import Game from "./Game";
import CharacterSelector, { CharacterType } from "./CharacterSelector";

export default function App() {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterType | null>(null);

  if (!selectedCharacter) {
    return <CharacterSelector onSelect={setSelectedCharacter} />;
  }

  return <Game character={selectedCharacter} />;
}
