import { useRef, useEffect } from "react";
import Phaser from "phaser";
import GameScene from "./GameScene";

export default function Game() {
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
        arcade: { debug: true },
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

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={containerRef} className="game-container" />;
}
