import React, { type ReactNode } from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import { useWindowSize } from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import BlogSidebar from '@theme/BlogSidebar';
import type { Props } from '@theme/BlogLayout';

export default function BlogLayout({
  sidebar,
  toc,
  children,
  ...layoutProps
}: Props): ReactNode {
  const hasSidebar = sidebar && sidebar.items.length > 0;
  const windowSize = useWindowSize({ desktopBreakpoint: 1279 });

  return (
    <Layout {...layoutProps}>
      <div className="container margin-vert--lg blog-layout">
        <div className="row">
          <BlogSidebar sidebar={sidebar} />
          <main className={clsx('col', hasSidebar ? 'col--7' : 'col--9')}>
            {toc && windowSize !== 'desktop' && (
              <details className="blog-toc-compact">
                <summary>
                  <Translate id="theme.TOCCollapsible.toggleButtonLabel">
                    On this page
                  </Translate>
                </summary>
                {toc}
              </details>
            )}
            {children}
          </main>
          {toc && windowSize !== 'mobile' && (
            <div className="col col--2 blog-toc-desktop">{toc}</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
