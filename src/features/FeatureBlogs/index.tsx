import React from 'react';
import Link from '@docusaurus/Link';
import styles from './index.module.css';
import { translate } from '@docusaurus/Translate';

interface BlogInfo {
  title: string;
  description?: string;
  img?: string;
  link: string;
}

const featuredBlogs: BlogInfo[] = [
  {
    title: translate({
      id: 'blog.feature.datavis.title',
      message: 'Data Visualization',
    }),
    link: '/blog/stanford-cs448b-01-purpose',
    description: translate({
      id: 'blog.feature.datavis.description',
      message:
        'I enjoy data visualization related algorithms, design, and courses',
    }),
    img: 'https://kitee-1301346990.cos.ap-nanjing.myqcloud.com/Obsidian/202501161833157.png?imageSlim',
  },
  {
    title: translate({
      id: 'blog.feature.ai.title',
      message: 'AI',
    }),
    link: '/blog/AI-review',
    description: translate({
      id: 'blog.feature.ai.description',
      message: 'Yeah, as we all know, this is the era of AI',
    }),
    img: 'https://kitee-1301346990.cos.ap-nanjing.myqcloud.com/Obsidian/202501161833280.png?imageSlim',
  },
  {
    title: translate({
      id: 'blog.feature.math.title',
      message: 'Mathematics',
    }),
    link: '/blog/paradox-of-probability-theory',
    description: translate({
      id: 'blog.feature.math.description',
      message:
        'Complex mathematics gives me headaches, but I am still happy to understand them',
    }),
    img: 'https://kitee-1301346990.cos.ap-nanjing.myqcloud.com/Obsidian/202501161833533.png?imageSlim',
  },
  {
    title: translate({
      id: 'blog.feature.design.title',
      message: 'Design',
    }),
    link: '/blog/color-space',
    description: translate({
      id: 'blog.feature.design.description',
      message: 'Beautiful visual expressions captivate me',
    }),
    img: 'https://kitee-1301346990.cos.ap-nanjing.myqcloud.com/Obsidian/202501161834235.png?imageSlim',
  },
];

function BlogCard({ title, description, img, link }: BlogInfo) {
  return (
    <Link to={link} className={styles['blog-card']}>
      <div className={styles['blog-card-img']}>
        <img
          src={img || '/img/default-blog-cover.png'}
          alt={`${title}-cover-img`}
        />
      </div>
      <div className={styles['blog-card-content']}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </Link>
  );
}

const FeatureBlogs: React.FC = () => {
  const sectionTitle = translate({
    id: 'blog.feature.section.title',
    message: "What I'm Learning",
  });

  return (
    <section className={styles['feature-blogs']}>
      <h2>{sectionTitle}</h2>
      <div className={styles['blog-cards']}>
        {featuredBlogs.map((blog) => (
          <BlogCard key={blog.title} {...blog} />
        ))}
      </div>
    </section>
  );
};

export default FeatureBlogs;
