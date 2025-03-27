import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Profile from '../features/Profile';
import FeatureBlogs from '../features/FeatureBlogs';
import ProjectGallery from '../features/ProjectGallery';
import HexGrid from '../features/Background';
import styles from './index.module.css';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description={siteConfig.tagline}
    >
      <div className={styles.container}>
        <HexGrid />
        <div className={styles.content}>
          <Profile />
          <FeatureBlogs />
          <ProjectGallery />
        </div>
      </div>
    </Layout>
  );
}
