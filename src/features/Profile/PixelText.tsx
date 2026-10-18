import React from 'react';
import styles from './index.module.css';

export default function PixelText({
  children,
  delay = 0,
}: {
  children: string;
  delay?: number;
}) {
  let index = 0;
  return (
    <span data-pixel-text>
      <span className={styles.sr}>{children}</span>
      <span aria-hidden="true">
        {children.split(/(\s+)/).map((word, wordIndex) =>
          /^\s+$/.test(word) ? (
            word
          ) : (
            <span className={styles.pixelWord} key={wordIndex}>
              {Array.from(word).map((letter) => {
                const order = index++;
                return (
                  <span
                    className={styles.pixelLetter}
                    key={order}
                    style={{
                      animationDelay: `${delay + Math.min(order * 36, 540)}ms`,
                    }}
                  >
                    {letter}
                  </span>
                );
              })}
            </span>
          )
        )}
      </span>
    </span>
  );
}
