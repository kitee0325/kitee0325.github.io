import React, { useState, useEffect } from 'react';
import styles from './FloatingPanel.module.css';

const DESKTOP_BREAKPOINT = 1024;

export interface FloatingPanelProps {
  width: number;
  height: number;
  content: React.ReactNode;
}

export function FloatingPanel({ width, height, content }: FloatingPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(
        typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT
      );
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  if (!isDesktop) {
    return null;
  }

  if (collapsed) {
    return (
      <div className={styles.root} style={{ right: 24 }}>
        <button
          type="button"
          className={styles.expandTab}
          onClick={() => setCollapsed(false)}
          aria-expanded={false}
          aria-label="展开浮窗"
        >
          展开
        </button>
      </div>
    );
  }

  return (
    <div className={styles.root} style={{ right: 24 }}>
      <div
        className={styles.panelWrapper}
        style={{ width: width + 16, height: height + 16 }}
      >
        <div
          className={styles.panel}
          style={{
            width: width + 16,
            height: height + 16,
          }}
        >
          <div
            className={styles.contentWrap}
            style={{
              width,
              height,
              margin: 8,
              overflow: 'auto',
            }}
          >
            {content}
          </div>
        </div>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={() => setCollapsed(true)}
          aria-expanded={true}
          aria-label="收起浮窗"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default FloatingPanel;
