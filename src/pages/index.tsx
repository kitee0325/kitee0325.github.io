import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Profile from '../features/Profile';
import FeatureBlogs from '../features/FeatureBlogs';
import ProjectGallery from '../features/ProjectGallery';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description={siteConfig.tagline}
    >
      <Profile />
      <FeatureBlogs />
      <ProjectGallery />
    </Layout>
  );
}
