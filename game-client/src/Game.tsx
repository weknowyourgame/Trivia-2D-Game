import { useRef, useEffect } from "react";
import Phaser from "phaser";
import GameScene from "./GameScene";
import { CharacterType } from "./CharacterSelector";

interface GameProps {
  character: CharacterType;
}

export default function Game({ character }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: containerRef.current as HTMLElement,
      scene: GameScene,
      physics: {
        default: "arcade",
        arcade: { debug: false },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true,
      },
    };

    const game = new Phaser.Game(config);
    
    // Pass character to scene
    game.scene.start("GameScene", { character });

    return () => {
      game.destroy(true);
    };
  }, [character]);

  return <div ref={containerRef} className="game-container" />;
}
