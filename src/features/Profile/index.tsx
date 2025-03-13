import styles from './index.module.css';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import React, { useState, useEffect } from 'react';

interface TextWithStyle {
  text: string;
  style?: React.CSSProperties;
}

const TypingEffect: React.FC<{ texts: TextWithStyle[] }> = ({ texts }) => {
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const handleTyping = () => {
      const currentText = texts[textIndex].text;
      if (isDeleting) {
        if (charIndex > 0) {
          setDisplayText(currentText.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
          setShowCursor(true);
        } else {
          setIsDeleting(false);
          setTextIndex((textIndex + 1) % texts.length);
          setShowCursor(true);
        }
      } else {
        if (charIndex < currentText.length) {
          setDisplayText(currentText.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
          setShowCursor(true);
        } else {
          setShowCursor(false);
          setTimeout(() => setIsDeleting(true), 1500);
        }
      }
    };

    const typingSpeed = isDeleting ? 75 : 150;
    const typingTimeout = setTimeout(handleTyping, typingSpeed);

    return () => clearTimeout(typingTimeout);
  }, [charIndex, isDeleting, textIndex, texts]);

  return (
    <span
      style={texts[textIndex].style}
      className={styles['profile-text-emphasis']}
    >
      {displayText}
      {showCursor ? '|' : ''}
    </span>
  );
};

function HomepageProfile() {
  const { siteConfig } = useDocusaurusContext();
  const { title: name } = siteConfig;
  const roles: TextWithStyle[] = [
    {
      text: 'Visualization Engineer.',
      style: {
        backgroundImage: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
      },
    },
    {
      text: 'Full Stack Developer.',
      style: {
        backgroundImage: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
      },
    },
    {
      text: 'Noob Designer.',
      style: {
        backgroundImage: 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)',
      },
    },
  ];
  return (
    <section className={styles.profile}>
      <div className={styles['profile-text']}>
        <h1>Hi👋! There is {name}.</h1>
        <h1>
          A <TypingEffect texts={roles} />
        </h1>
      </div>
      <div className={`${styles['profile-img']} ${styles.glitch}`}>
        <img src="/img/profile.png" alt={name} />
      </div>
    </section>
  );
}

export default HomepageProfile;
