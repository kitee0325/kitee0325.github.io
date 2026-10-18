import React from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';
import { translate } from '@docusaurus/Translate';

interface BlogInfo {
  id: string;
  title: string;
  description: string;
  tags: string[];
  note: string;
  link: string;
}

const featuredBlogs: BlogInfo[] = [
  {
    id: 'datavis',
    title: translate({
      id: 'blog.feature.datavis.title',
      message: 'Data Visualization',
    }),
    link: '/blog/stanford-cs448b-01-purpose',
    description: translate({
      id: 'blog.feature.datavis.description',
      message:
        'Exploring visual encodings, layout algorithms, and the stories hidden in data.',
    }),
    tags: [
      translate({
        id: 'blog.feature.datavis.tag.encoding',
        message: 'Visual encoding',
      }),
      translate({
        id: 'blog.feature.datavis.tag.course',
        message: 'Course notes',
      }),
    ],
    note: translate({
      id: 'blog.feature.datavis.note',
      message: 'Stanford CS448B · The purpose of visualization',
    }),
  },
  {
    id: 'ai',
    title: translate({
      id: 'blog.feature.ai.title',
      message: 'AI',
    }),
    link: '/blog/AI-review',
    description: translate({
      id: 'blog.feature.ai.description',
      message:
        'Tracing ideas behind intelligent systems, from early concepts to the models we use today.',
    }),
    tags: [
      translate({
        id: 'blog.feature.ai.tag.models',
        message: 'Model foundations',
      }),
      translate({
        id: 'blog.feature.ai.tag.review',
        message: 'Learning review',
      }),
    ],
    note: translate({
      id: 'blog.feature.ai.note',
      message: 'A review of artificial intelligence',
    }),
  },
  {
    id: 'math',
    title: translate({
      id: 'blog.feature.math.title',
      message: 'Mathematics',
    }),
    link: '/blog/paradox-of-probability-theory',
    description: translate({
      id: 'blog.feature.math.description',
      message:
        'Untangling probability and the surprising puzzles that challenge our intuition.',
    }),
    tags: [
      translate({
        id: 'blog.feature.math.tag.probability',
        message: 'Probability',
      }),
      translate({
        id: 'blog.feature.math.tag.intuition',
        message: 'Beyond intuition',
      }),
    ],
    note: translate({
      id: 'blog.feature.math.note',
      message: 'Paradoxes of probability theory',
    }),
  },
  {
    id: 'design',
    title: translate({
      id: 'blog.feature.design.title',
      message: 'Design',
    }),
    link: '/blog/color-space',
    description: translate({
      id: 'blog.feature.design.description',
      message:
        'Learning how color, composition, and visual choices make an idea clearer.',
    }),
    tags: [
      translate({
        id: 'blog.feature.design.tag.color',
        message: 'Color spaces',
      }),
      translate({
        id: 'blog.feature.design.tag.visual',
        message: 'Visual expression',
      }),
    ],
    note: translate({
      id: 'blog.feature.design.note',
      message: 'Exploring color spaces',
    }),
  },
];

function BlogCard({
  id,
  title,
  description,
  tags,
  note,
  link,
  index,
}: BlogInfo & { index: number }) {
  const image = useBaseUrl(`/img/learning/${id}.webp`);
  return (
    <Link
      to={link}
      className={styles['blog-card']}
      data-subject={id}
      aria-label={`${title}: ${note}`}
    >
      <div className={styles['blog-card-img']} aria-hidden="true">
        <span className={styles.number}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <img
          src={image}
          alt=""
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className={styles['blog-card-content']}>
        <h3>{title}</h3>
        <p>{description}</p>
        <ul className={styles.tags}>
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
      <div className={styles.note}>
        <span>
          <small>
            {translate({
              id: 'blog.feature.noteLabel',
              message: 'From my notes',
            })}
          </small>
          <strong>{note}</strong>
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 4h3v3h3v3h3v4h-3v3h-3v3h-3v-6H2v-4h11z" />
        </svg>
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
    <section
      className={styles['feature-blogs']}
      aria-labelledby="learning-title"
      data-learning
    >
      <header className={styles.header}>
        <h2 id="learning-title">{sectionTitle}</h2>
        <p>
          {translate({
            id: 'blog.feature.section.description',
            message:
              'Following curiosity through charts, experiments, and visual ideas.',
          })}
        </p>
      </header>
      <div className={styles['blog-cards']}>
        {featuredBlogs.map((blog, index) => (
          <BlogCard key={blog.id} {...blog} index={index} />
        ))}
      </div>
    </section>
  );
};

export default FeatureBlogs;
