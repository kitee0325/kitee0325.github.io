import React from 'react';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

interface BlogInfo {
  title: string;
  description?: string;
  img?: string;
  link: string;
}

const featuredBlogs: BlogInfo[] = [
  {
    title: 'Data Visualization',
    link: '/blog/stanford-cs448b-01-purpose',
    description:
      'I enjoy data visualization related algorithms, design, and courses',
    img: 'https://kitee-1301346990.cos.ap-nanjing.myqcloud.com/Obsidian/202501161833157.png?imageSlim',
  },
  {
    title: 'AI',
    link: '/blog/AI-review',
    description: 'Yeah, as we all know, this is the era of AI',
    img: 'https://kitee-1301346990.cos.ap-nanjing.myqcloud.com/Obsidian/202501161833280.png?imageSlim',
  },
  {
    title: 'Mathematics',
    link: '/blog/paradox-of-probability-theory',
    description:
      'Complex mathematics gives me headaches, but I am still happy to understand them',
    img: 'https://kitee-1301346990.cos.ap-nanjing.myqcloud.com/Obsidian/202501161833533.png?imageSlim',
  },
  {
    title: 'Design',
    link: '/blog/color-space',
    description: 'Beautiful visual expressions captivate me',
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
  return (
    <section className={styles['feature-blogs']}>
      <h2>What I'm Learning</h2>
      <div className={styles['blog-cards']}>
        {featuredBlogs.map((blog) => (
          <BlogCard key={blog.title} {...blog} />
        ))}
      </div>
    </section>
  );
};

export default FeatureBlogs;
