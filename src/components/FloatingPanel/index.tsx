import React, { useState, useEffect } from 'react';
import styles from './FloatingPanel.module.css';

const DESKTOP_BREAKPOINT = 1024;

function toCssSize(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value;
}

export interface FloatingPanelProps {
  width: number | string;
  height: number | string;
  content: React.ReactNode;
}

export function FloatingPanel({ width, height, content }: FloatingPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const size = { width: toCssSize(width), height: toCssSize(height) };

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
      <div className={styles.panelWrapper} style={size}>
        <div className={styles.panel} style={size}>
          <div
            className={styles.contentWrap}
            style={{
              width: 'calc(100% - 16px)',
              height: 'calc(100% - 16px)',
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
