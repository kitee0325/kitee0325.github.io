import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Profile from '../features/Profile';
import FeatureBlogs from '../features/FeatureBlogs';
import ProjectGallery from '../features/ProjectGallery';
import FluidBackground from '../features/Background';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description={siteConfig.tagline}
    >
      <FluidBackground />
      <Profile />
      <FeatureBlogs />
      <ProjectGallery />
    </Layout>
  );
}
