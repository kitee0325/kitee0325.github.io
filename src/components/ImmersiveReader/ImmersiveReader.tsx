import React, { useEffect, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import './ImmersiveReader.css';

const ImmersiveReader: React.FC = () => {
  const location = useLocation();
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // 检测是否在博客文章页面
  const isBlogPost = () => {
    const path = location.pathname;

    // 必须包含 /blog/
    if (!path.includes('/blog/')) {
      return false;
    }

    // 排除博客列表页 /blog 或 /blog/
    if (path.match(/\/blog\/?$/)) {
      return false;
    }

    // 排除特殊页面：tags、archive 等
    if (path.includes('/blog/tags') || path.includes('/blog/archive')) {
      return false;
    }

    // 其他包含 /blog/ 的路径都认为是博客文章页面
    return true;
  };

  const isOnBlogPost = isBlogPost();

  // 检测是否为PC端设备
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    // 初始检测
    setIsDesktop(mediaQuery.matches);

    // 监听屏幕宽度变化
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    // 如果不在博客文章页面或不是PC端，清理沉浸式模式样式并退出
    if (!isOnBlogPost || !isDesktop) {
      document.body.classList.remove('immersive-mode');
      return;
    }

    // 从 localStorage 读取沉浸式模式状态
    const savedState = localStorage.getItem('immersive-reading-mode');
    const shouldBeImmersive = savedState === 'true';
    setIsImmersiveMode(shouldBeImmersive);

    // 应用或移除沉浸式模式样式
    if (shouldBeImmersive) {
      document.body.classList.add('immersive-mode');
    } else {
      document.body.classList.remove('immersive-mode');
    }
  }, [isOnBlogPost, isDesktop]);

  // 如果不在博客文章页面或不是PC端，不渲染组件
  if (!isOnBlogPost || !isDesktop) {
    return null;
  }

  const toggleImmersiveMode = () => {
    const newMode = !isImmersiveMode;
    setIsImmersiveMode(newMode);

    // 保存状态到 localStorage
    localStorage.setItem('immersive-reading-mode', newMode.toString());

    // 应用或移除沉浸式模式样式
    if (newMode) {
      document.body.classList.add('immersive-mode');
    } else {
      document.body.classList.remove('immersive-mode');
    }
  };

  return (
    <div
      className={`immersive-reader-toggle ${
        isImmersiveMode ? 'immersive' : ''
      }`}
    >
      <button
        onClick={toggleImmersiveMode}
        className="immersive-button"
        title={isImmersiveMode ? '退出沉浸式阅读' : '进入沉浸式阅读'}
        aria-label={
          isImmersiveMode ? '退出沉浸式阅读模式' : '进入沉浸式阅读模式'
        }
      >
        {isImmersiveMode ? (
          // 退出沉浸式模式图标（眼睛睁开）
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          // 进入沉浸式模式图标（眼睛眯起/专注模式）
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <path d="M9 9h6" />
            <path d="M8 15h8" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default ImmersiveReader;
