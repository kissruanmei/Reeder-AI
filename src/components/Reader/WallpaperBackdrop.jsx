import React from 'react';
import './wallpaper.css';

export const WallpaperBackdrop = ({ imageUrl, opacity }) => {
  if (!imageUrl) return null;

  return (
    <div className="app-wallpaper-backdrop" aria-hidden="true">
      <img
        src={imageUrl}
        alt=""
        className="app-wallpaper-image"
        style={{ opacity: Math.max(0, Math.min(100, opacity)) / 100 }}
      />
    </div>
  );
};
