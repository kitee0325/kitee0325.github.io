import React from 'react';
import InfoCard from '@site/src/components/InfoCard';
import styles from './index.module.css';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import { translate } from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';

// Define the type for project items
interface ProjectItem {
  width: number;
  height: number;
  url: string;
  name: string;
}

// Array of project items based on videos in the public/video folder
const getProjectItems = (): ProjectItem[] => [
  {
    width: 2494,
    height: 1302,
    url: '/video/Dynamic Beeswarm.mp4',
    name: translate({
      id: 'project.dynamic_beeswarm',
      message: 'Dynamic Beeswarm',
    }),
  },
  {
    width: 1370,
    height: 1200,
    url: '/video/Dynamic Wordcloud.mp4',
    name: translate({
      id: 'project.dynamic_wordcloud',
      message: 'Dynamic Wordcloud',
    }),
  },
  {
    width: 510,
    height: 716,
    url: '/video/Dynamic Bubble.mp4',
    name: translate({
      id: 'project.dynamic_bubble',
      message: 'Dynamic Bubble',
    }),
  },
  {
    width: 2482,
    height: 1286,
    url: '/video/Industry Chain.mp4',
    name: translate({
      id: 'project.industry_chain',
      message: 'Industry Chain',
    }),
  },
];

const ProjectGallery: React.FC = () => {
  // Responsive column counts for different screen sizes
  const columnsCountBreakPoints = { 0: 1, 768: 2, 1024: 3 };

  // Fixed gutter size to ensure consistent spacing
  const gutterSize = '20px';

  const sectionTitle = translate({
    id: 'project.section.title',
    message: 'What Have I Done (Desensitized Part)',
  });

  // Get project items and apply useBaseUrl to video URLs
  const projectItems = getProjectItems().map((item) => ({
    ...item,
    url: useBaseUrl(item.url),
  }));

  return (
    <section className={styles['project-gallery']}>
      <h2>{sectionTitle}</h2>
      <div className={styles['masonry-wrapper']}>
        <ResponsiveMasonry columnsCountBreakPoints={columnsCountBreakPoints}>
          <Masonry gutter={gutterSize}>
            {projectItems.map((project, index) => (
              <div key={index} className={styles['masonry-item']}>
                <InfoCard
                  url={project.url}
                  width={project.width}
                  height={project.height}
                  title={project.name}
                />
              </div>
            ))}
          </Masonry>
        </ResponsiveMasonry>
      </div>
    </section>
  );
};

export default ProjectGallery;
