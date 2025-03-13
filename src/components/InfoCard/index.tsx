import React from 'react';
import styles from './index.module.css';

interface InfoCardProps {
  url: string;
  type?: 'image' | 'video';
  width: number;
  height: number;
  title: string;
}

const InfoCard: React.FC<InfoCardProps> = ({
  url,
  type = 'video',
  width: imageWidth,
  height: imageHeight,
  title,
}) => {
  const aspectRatio = imageHeight / imageWidth;

  if (!url) {
    console.warn('URL is required for InfoCard');
  }

  return (
    <div className={styles['info-card']}>
      <div
        className={styles['image-container']}
        style={{ paddingBottom: `${aspectRatio * 100}%` }}
      >
        {type === 'image' && (
          <img
            src={url}
            alt={title}
            loading="lazy"
            className={styles['card-image']}
          />
        )}
        {type === 'video' && (
          <video
            src={url}
            muted
            autoPlay
            loop
            className={styles['card-image']}
            title={title}
          />
        )}
      </div>
      <h3>{title}</h3>
    </div>
  );
};

export default InfoCard;
