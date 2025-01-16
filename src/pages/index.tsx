import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Profile from '../components/Profile';
import FeatureBlogs from '../components/FeatureBlogs';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description={siteConfig.tagline}
    >
      <Profile />
      <FeatureBlogs />
    </Layout>
  );
}
