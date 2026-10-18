import React, { useEffect, useRef } from 'react';
import { toys, ToyId, data } from './aquarium/data';
import { columnX, chartTop, chartBottom } from './aquarium/beeswarm';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { copy } from './aquarium/copy';
import { useAquarium } from './aquarium/useAquarium';
import styles from './index.module.css';
import PixelText from './PixelText';

export default function Aquarium({ debug = false }: { debug?: boolean }) {
  const base = useBaseUrl('/img/hero/'),
    { siteConfig } = useDocusaurusContext(),
    text = copy();
  const {
    root,
    canvas,
    intro,
    flying,
    scene,
    redraw,
    mode,
    paused,
    setPaused,
    role,
    dropped,
    reduced,
    ready,
    water,
    selected,
    setSelected,
    scale,
    failed,
    selectedRef,
    hovered,
    focused,
    cancelDemo,
    drop,
    changeMode,
  } = useAquarium(base, text, debug);
  function toy(id: ToyId) {
    const def = toys.find((t) => t.id === id)!;
    return (
      <button
        className={styles.toy}
        data-toy={id}
        data-phase="pinned"
        aria-label={`${text.toys[id] ?? def.label}: ${dropped.includes(id) ? text.dropped : paused ? text.resumeDrop : text.drop}`}
        aria-disabled={!ready || paused || dropped.includes(id)}
        disabled={!ready || failed}
        onPointerEnter={cancelDemo}
        onClick={() => {
          cancelDemo();
          drop(id);
        }}
        style={{
          width: Math.max(44, 32 * scale),
          height: Math.max(44, 28 * scale),
        }}
      >
        <span className={styles.pin} />
        <img
          src={`${base}${id}.png`}
          alt=""
          style={{ width: 40 * scale, height: 40 * scale }}
        />
      </button>
    );
  }
  const pointerStart = useRef<{ x: number; y: number; moved: boolean } | null>(
    null
  );
  const selectedFish = data.find((f) => f.id === selected);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest('[data-fish-selection]')
      )
        setSelected(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return (
    <section
      ref={root}
      className={styles.hero}
      data-aquarium-p0={debug || undefined}
      data-aquarium
      data-ready={ready}
      onPointerDownCapture={cancelDemo}
      onFocusCapture={cancelDemo}
      onWheel={cancelDemo}
      onTouchStart={cancelDemo}
      onKeyDown={(e) => {
        cancelDemo();
        if (e.key === 'Escape') setSelected(null);
      }}
    >
      <div ref={intro} className={styles.intro}>
        <h1>
          <PixelText>{text.hi}</PixelText>
          {toy('wave')}
          <PixelText delay={90}>{text.name}</PixelText>{' '}
          <span className={styles.name}>
            <PixelText delay={220}>{siteConfig.title}</PixelText>
            {toy('intp')}
          </span>
        </h1>
        <div
          className={styles.roles}
          onPointerEnter={() => {
            hovered.current = true;
            cancelDemo();
          }}
          onPointerLeave={() => (hovered.current = false)}
          onFocus={() => (focused.current = true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              focused.current = false;
          }}
        >
          <span className={styles.sr}>{text.roles}</span>
          <div
            data-role
            data-active={role === 0}
            aria-hidden={role !== 0}
            className={styles.role}
          >
            {toy('gpt')}
            <span className={styles.phrase}>
              <PixelText delay={280}>{`${text.an} ${text.agent}`}</PixelText>
            </span>
            {toy('claude')}
          </div>
          <div
            data-role
            data-active={role === 1}
            aria-hidden={role !== 1}
            className={styles.role}
          >
            {!reduced && toy('chart')} <PixelText>{text.visual}</PixelText>
          </div>
          <div
            data-role
            data-active={role === 2}
            aria-hidden={role !== 2}
            className={styles.role}
          >
            {!reduced && toy('palette')} <PixelText>{text.design}</PixelText>
          </div>
        </div>
        {reduced && (
          <p>
            <span className={styles.phrase}>
              {toy('chart')} {text.visual}
            </span>{' '}
            ·{' '}
            <span className={styles.phrase}>
              {toy('palette')} {text.design}
            </span>
          </p>
        )}
        <p className={styles.stack}>
          {text.stack}
          <span>React {toy('react')}</span>
          <span>Vue {toy('vue')}</span>
          <span>Node.js {toy('node')}</span>
          <span>TS {toy('ts')}</span>
        </p>
        <p className={styles.life}>
          {text.life}
          <span className={styles.phrase}>
            {text.math} {toy('math')}
          </span>
          {text.and}
          <span className={styles.phrase}>
            {text.games} {toy('controller')}
          </span>
          {text.comma}
          <br />
          {text.enjoy}
          <span className={styles.phrase}>
            {text.demos} {toy('geometry')}
          </span>
          {text.comma}
          <br />
          {text.try}
          <span className={styles.phrase}>
            {text.game} {toy('godot')}
          </span>
          {text.period}
        </p>
      </div>
      <figure className={styles.figure}>
        <div className={styles.toolbar}>
          <button
            title={text.school}
            aria-label={text.school}
            disabled={!ready || failed}
            aria-pressed={mode === 'school'}
            onClick={() => changeMode('school')}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 9h3V6h9v3h3v6h-3v3H8v-3H5l-4 3V6z" />
              <path className={styles.eye} d="M15 10h2v2h-2z" />
            </svg>
          </button>
          <button
            title={text.beeswarm}
            aria-label={text.beeswarm}
            disabled={!ready || failed}
            aria-pressed={mode === 'beeswarm'}
            onClick={() => changeMode('beeswarm')}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path
                transform="rotate(90 12 12)"
                d="M3 4h5v3H3zm10 0h7v3h-7zM6 10h6v3H6zm9 0h6v3h-6zM2 16h7v3H2zm10 0h5v3h-5z"
              />
            </svg>
          </button>
        </div>
        <div className={styles.tank}>
          {(!ready || failed) && (
            <>
              <picture className={styles.poster}>
                <source
                  media="(max-width:767px)"
                  srcSet={base + 'poster-mobile.png'}
                />
                <img src={base + 'poster.png'} alt={text.posterAlt} />
              </picture>
              <picture className={`${styles.poster} ${styles.posterDark}`}>
                <source
                  media="(max-width:767px)"
                  srcSet={base + 'poster-mobile-dark.png'}
                />
                <img src={base + 'poster-dark.png'} alt={text.posterAlt} />
              </picture>
            </>
          )}
          <canvas
            ref={canvas}
            data-fish-selection
            style={{ visibility: ready && !failed ? 'visible' : 'hidden' }}
            width={512}
            height={288}
            tabIndex={ready && !failed ? 0 : -1}
            role="img"
            aria-label={text.canvasKeys}
            aria-keyshortcuts="Space ArrowLeft ArrowRight"
            onKeyDown={(e) => {
              if (e.code === 'Space') {
                e.preventDefault();
                if (!e.repeat && scene.current) {
                  scene.current.movePointer();
                  scene.current.paused = !scene.current.paused;
                  setPaused(scene.current.paused);
                  redraw.current();
                }
              }
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const index = data.findIndex((f) => f.id === selected),
                  direction = e.key === 'ArrowRight' ? 1 : -1;
                const next =
                  index < 0
                    ? direction > 0
                      ? 0
                      : data.length - 1
                    : (index + direction + data.length) % data.length;
                setSelected(data[next].id);
                redraw.current();
              }
            }}
            onPointerDown={(e) => {
              if (e.button === 0 && e.isPrimary)
                pointerStart.current = {
                  x: e.clientX,
                  y: e.clientY,
                  moved: false,
                };
            }}
            onPointerMove={(e) => {
              const start = pointerStart.current;
              if (
                start &&
                Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8
              )
                start.moved = true;
              if (e.pointerType === 'touch') return;
              const s = scene.current,
                r = e.currentTarget.getBoundingClientRect();
              if (s) {
                const p = {
                  x: ((e.clientX - r.x) * s.width) / r.width,
                  y: ((e.clientY - r.y) * 288) / r.height,
                };
                if (p.y >= 32 && p.y <= 260) cancelDemo();
                s.movePointer(
                  p.y >= 32 && p.y <= 260 ? p : undefined,
                  e.timeStamp
                );
              }
            }}
            onPointerLeave={() => {
              pointerStart.current = null;
              scene.current?.movePointer();
            }}
            onPointerCancel={() => {
              pointerStart.current = null;
              scene.current?.movePointer();
            }}
            onPointerUp={(e) => {
              const start = pointerStart.current;
              pointerStart.current = null;
              if (
                !start ||
                start.moved ||
                e.button !== 0 ||
                !e.isPrimary ||
                Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8
              )
                return;
              const s = scene.current,
                r = e.currentTarget.getBoundingClientRect();
              if (!s) return;
              const p = {
                x: ((e.clientX - r.x) * s.width) / r.width,
                y: ((e.clientY - r.y) * 288) / r.height,
              };
              const f = s.fish.find(
                (f) => Math.hypot(f.x - p.x, f.y - p.y) < 12
              );
              setSelected(f?.id ?? null);
              if (!f && p.y >= 32 && p.y <= 260) s.tap(p);
              redraw.current();
            }}
          />
          {mode === 'beeswarm' && (
            <div data-chart-labels className={styles.chartLabels}>
              {text.series.map((label, i) => (
                <span
                  key={label}
                  style={{
                    left: `${(columnX(scene.current?.width ?? 512, i) / (scene.current?.width ?? 512)) * 100}%`,
                  }}
                >
                  {label}
                </span>
              ))}
              <div
                className={styles.axis}
                style={{
                  width: `${(26 / (scene.current?.width ?? 512)) * 100}%`,
                  top: `${(chartTop / 288) * 100}%`,
                  height: `${((chartBottom - chartTop) / 288) * 100}%`,
                }}
              >
                {[100, 50, 0].map((value, i) => (
                  <span key={value} style={{ top: `${i * 50}%` }}>
                    {value}
                  </span>
                ))}
              </div>
            </div>
          )}
          {selectedFish && (
            <div
              ref={selectedRef}
              data-id={selected}
              role="status"
              className={styles.tooltip}
            >
              {selected} · {text.seriesLabel} {selectedFish.series + 1} ·{' '}
              {text.value} {selectedFish.value}
            </div>
          )}
        </div>
        <figcaption className={styles.sr}>
          {text.caption}
          {mode === 'beeswarm' ? text.chartCaption : ''}
        </figcaption>
        <p
          role="status"
          className={
            failed || water === text.fallback ? styles.fallback : styles.sr
          }
        >
          {failed || water === text.fallback ? water : paused ? text.pause : ''}
        </p>
      </figure>
      <div ref={flying} className={styles.flying} aria-hidden="true" />
    </section>
  );
}
