import { useState, useEffect, useRef } from "react";
import "./CharacterSelector.css";

export type CharacterType = "ninja" | "monkey";

interface CharacterSelectorProps {
  onSelect: (character: CharacterType) => void;
}

export default function CharacterSelector({ onSelect }: CharacterSelectorProps) {
  const [selected, setSelected] = useState<CharacterType | null>(null);
  const [hovering, setHovering] = useState<CharacterType | null>(null);
  const [monkeySprite, setMonkeySprite] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Remove green screen from monkey sprite
    const img = new Image();
    img.src = "/assets/player.png";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Remove green pixels
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (g > 100 && g > r * 1.5 && g > b * 1.5) {
          data[i + 3] = 0; // Make transparent
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      setMonkeySprite(canvas.toDataURL());
    };
  }, []);

  const characters = [
    {
      id: "ninja" as CharacterType,
      name: "Ninja",
      description: "Fast warrior with deadly dash",
      sprite: "/assets/tiles.png",
      color: "#ff9500",
    },
    {
      id: "monkey" as CharacterType,
      name: "Monkey",
      description: "Agile explorer, swift moves",
      sprite: monkeySprite || "/assets/player.png",
      color: "#ff9500",
    },
  ];

  const handleSelect = (char: CharacterType) => {
    setSelected(char);
    setTimeout(() => {
      onSelect(char);
    }, 300);
  };

  return (
    <div className="character-selector-overlay">
      <div className="character-selector-container">
        <h1 className="selector-title">Choose Your Character</h1>
        <div className="characters-grid">
          {characters.map((char) => (
            <div
              key={char.id}
              className={`character-card ${
                selected === char.id ? "selected" : ""
              } ${hovering === char.id ? "hovering" : ""}`}
              onClick={() => handleSelect(char.id)}
              onMouseEnter={() => setHovering(char.id)}
              onMouseLeave={() => setHovering(null)}
              style={{ "--card-color": char.color } as any}
            >
              <div className="character-sprite-container">
                <img
                  src={char.sprite}
                  alt={char.name}
                  className="character-sprite"
                  style={{
                    imageRendering: "pixelated",
                    width: char.id === "ninja" ? "128px" : "64px",
                    height: char.id === "ninja" ? "80px" : "128px",
                  }}
                />
              </div>
              <div className="character-info">
                <h2 className="character-name">{char.name}</h2>
                <p className="character-description">{char.description}</p>
              </div>
              <div className="select-indicator">
                {selected === char.id ? "✓ SELECTED" : "SELECT"}
              </div>
            </div>
          ))}
        </div>
        <div className="selector-footer">
          <p>Click to select your character</p>
        </div>
      </div>
    </div>
  );
}

