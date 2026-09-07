import React, { useEffect, useRef } from 'react';
import { getFrequencyEnergy } from '../../services/musicUtils';

const COLORS = ['64, 214, 255', '91, 141, 239', '148, 112, 239', '102, 222, 194'];

function seededValue(index, salt) {
  const value = Math.sin(index * 91.7 + salt * 23.3) * 43758.5453;
  return value - Math.floor(value);
}

function perimeterPoint(progress, width, height, inset) {
  const innerWidth = Math.max(1, width - inset * 2);
  const innerHeight = Math.max(1, height - inset * 2);
  const perimeter = 2 * (innerWidth + innerHeight);
  let distance = progress * perimeter;
  if (distance < innerWidth) return { x: inset + distance, y: inset };
  distance -= innerWidth;
  if (distance < innerHeight) return { x: width - inset, y: inset + distance };
  distance -= innerHeight;
  if (distance < innerWidth) return { x: width - inset - distance, y: height - inset };
  return { x: inset, y: height - inset - (distance - innerWidth) };
}

export function AudioVisualizer({ analyser, isPlaying, compact = false }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    let lastFrame = 0;
    let smoothedLow = 0;
    let smoothedMid = 0;
    const frequencyData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (timestamp) => {
      frameRef.current = requestAnimationFrame(draw);
      if (document.hidden || timestamp - lastFrame < (isPlaying ? 16 : 45)) return;
      lastFrame = timestamp;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      let low = 0.06;
      let mid = 0.04;
      if (analyser && frequencyData && isPlaying) {
        analyser.getByteFrequencyData(frequencyData);
        low = getFrequencyEnergy(frequencyData, analyser, 20, 200);
        mid = getFrequencyEnergy(frequencyData, analyser, 200, 3200);
      }
      smoothedLow += (low - smoothedLow) * (isPlaying ? 0.18 : 0.04);
      smoothedMid += (mid - smoothedMid) * (isPlaying ? 0.14 : 0.035);

      const count = compact ? 30 : 68;
      const time = timestamp * 0.00018;
      const outward = 3 + smoothedLow * (compact ? 12 : 24);
      for (let index = 0; index < count; index += 1) {
        const drift = Math.sin(time * (0.7 + seededValue(index, 2)) + index) * 0.006;
        const point = perimeterPoint((index / count + drift + 1) % 1, width, height, compact ? 17 : 25);
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        const length = Math.hypot(dx, dy) || 1;
        const irregularity = seededValue(index, 4) * 9 + Math.sin(time * 5 + index * 1.7) * (1 + smoothedMid * 5);
        const x = point.x + (dx / length) * (outward + irregularity);
        const y = point.y + (dy / length) * (outward + irregularity);
        const radius = 0.8 + seededValue(index, 8) * 1.7 + smoothedMid * 1.7;
        const alpha = (isPlaying ? 0.34 : 0.16) + smoothedLow * 0.5 + seededValue(index, 6) * 0.18;
        const color = COLORS[index % COLORS.length];
        context.beginPath();
        context.fillStyle = `rgba(${color}, ${Math.min(0.92, alpha)})`;
        context.shadowColor = `rgba(${color}, ${Math.min(0.75, alpha)})`;
        context.shadowBlur = 7 + smoothedLow * 15;
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.shadowBlur = 0;
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [analyser, compact, isPlaying]);

  return <canvas ref={canvasRef} className="music-particle-canvas" aria-hidden="true" />;
}
