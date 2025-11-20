import Phaser from "phaser";

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

void main(void) {
    vec4 color = texture2D(uMainSampler, outTexCoord);
    
    // Remove green background (chroma key)
    // Check if the color is close to green
    float greenThreshold = 0.5;
    if (color.g > greenThreshold && color.r < 0.5 && color.b < 0.5) {
        color.a = 0.0; // Make it transparent
    }
    
    gl_FragColor = color;
}
`;

export default class ChromaKeyPipeline extends Phaser.Renderer.WebGL.Pipelines
  .MultiPipeline {
  constructor(game: Phaser.Game) {
    super({
      game: game,
      fragShader: fragShader,
    });
  }
}
