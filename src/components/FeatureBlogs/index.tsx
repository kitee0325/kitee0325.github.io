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
    title: 'test1asdad啊都是法师打发斯蒂芬萨法三大发啥打法撒打发手打发撒',
    link: '/blog/2021-08-26-welcome',
    description: '撒旦法人啊发生的发生大萨达asdasdasdasdasd',
  },
  {
    title: 'test2',
    link: '/blog/2019-05-28-first-blog-post',
    description: '撒旦法人啊发生的发生大萨达',
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
      <h2>Some Of My Focus</h2>
      <div className={styles['blog-cards']}>
        {featuredBlogs.map((blog) => (
          <BlogCard key={blog.title} {...blog} />
        ))}
      </div>
    </section>
  );
};

export default FeatureBlogs;
