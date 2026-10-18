import { useEffect, useRef, useState } from 'react';
import { Scene, FixedClock } from './scene';
import { config, toys, ToyId, ViewMode } from './data';
import { createRenderer } from './render';
import { Demo } from './demo';
import type { copy } from './copy';
import { createFluid, Fluid } from '../../Background/engine';

export function useAquarium(
  base: string,
  text: ReturnType<typeof copy>,
  debug: boolean
) {
  const demo = useRef<Demo>(),
    cancelDemo = () => {
      demo.current?.cancel();
      root.current?.removeAttribute('data-demo');
    };
  const root = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    intro = useRef<HTMLDivElement>(null),
    flying = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene>(),
    redraw = useRef(() => {}),
    resetFluid = useRef(() => {});
  const [mode, setMode] = useState<ViewMode>('school'),
    [paused, setPaused] = useState(false),
    [role, setRole] = useState(0),
    [dropped, setDropped] = useState<ToyId[]>([]),
    [reduced, setReduced] = useState(false),
    [ready, setReady] = useState(false),
    [water, setWater] = useState(text.loading),
    [selected, setSelected] = useState<string | null>(null),
    [scale, setScale] = useState(1),
    [failed, setFailed] = useState(false);
  const selectedRef = useRef<HTMLDivElement>(null),
    hovered = useRef(false),
    focused = useRef(false),
    stats = useRef({
      frames: 0,
      intervals: [] as number[],
      drawMs: [] as number[],
      steps: 0,
      quality: 96,
    });
  useEffect(() => {
    const el = root.current!,
      cv = canvas.current!,
      ctx = cv.getContext('2d');
    if (!ctx) {
      setWater(text.poster);
      setFailed(true);
      return;
    }
    let initializationFailed = false,
      disposed = false,
      raf = 0,
      last = 0,
      lastDraw = 0,
      dirty = true,
      visible = true,
      introVisible = true,
      dark = document.documentElement.dataset.theme === 'dark',
      fluid: Fluid | null = null;
    let s: Scene;
    try {
      s = new Scene(window.innerWidth < 768 ? 384 : 512);
    } catch (error) {
      setFailed(true);
      setWater(text.poster);
      console.warn('Aquarium initialization:', error);
      return;
    }
    demo.current = new Demo();
    scene.current = s;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    s.reduced = motion.matches;
    setReduced(s.reduced);
    const clock = new FixedClock(),
      sprites = Object.fromEntries(
        toys.map((t) => [t.id, `${base}${t.id}.png`])
      );
    let drawScene: ReturnType<typeof createRenderer> | undefined;
    const light = new Image(),
      night = new Image();
    const loaded = () => {
      if (
        disposed ||
        !light.complete ||
        !night.complete ||
        !light.naturalWidth ||
        !night.naturalWidth
      )
        return;
      drawScene = createRenderer(light, night);
      initFluid();
      setReady(true);
      dirty = true;
      wake();
    };
    light.onload = night.onload = loaded;
    light.onerror = night.onerror = () => {
      if (!disposed) {
        initializationFailed = true;
        cancelAnimationFrame(raf);
        raf = 0;
        setFailed(true);
        setWater(text.poster);
        demo.current?.cancel();
      }
    };
    light.src = base + 'sprites-fine.png';
    night.src = base + 'sprites-fine.png';
    function initFluid() {
      fluid?.dispose();
      fluid = null;
      try {
        fluid = createFluid(s.width, stats.current.quality);
        const owned = fluid;
        fluid.canvas.addEventListener(
          'webglcontextlost',
          () => {
            if (!disposed && fluid === owned) {
              setWater(text.fallback);
              dirty = true;
              wake();
            }
          },
          { once: true }
        );
        setWater(text.flow);
      } catch (error) {
        setWater(text.fallback);
        console.warn('Aquarium GPU fallback:', error);
      }
      dirty = true;
    }
    resetFluid.current = () => fluid?.reset();
    function measure() {
      const width = window.innerWidth < 768 ? 384 : 512;
      if (width !== s.width) {
        s.resize(width);
        cv.width = width;
        if (drawScene) initFluid();
      }
      cv.width = s.width * 3;
      cv.height = 288 * 3;
      setScale(cv.getBoundingClientRect().width / s.width);
      dirty = true;
      wake();
    }
    function project() {
      el.querySelectorAll<HTMLElement>('[data-role]').forEach((node, i) => {
        const active = s.role === i;
        node.inert = !active;
        node.dataset.active = String(active);
        if (active) {
          const opacity =
            s.reduced || s.paused
              ? 1
              : Math.max(
                  0,
                  Math.min(
                    1,
                    s.roleElapsed / 0.12,
                    ([6, 3, 3][s.role] + 0.24 - s.roleElapsed) / 0.12
                  )
                );
          node.style.setProperty('--role-progress', String(opacity));
          node.style.setProperty(
            '--role-offset',
            `${(s.roleElapsed < 0.12 ? 6 : -6) * (1 - opacity)}px`
          );
        }
      });
      const labels = el.querySelector<HTMLElement>('[data-chart-labels]');
      if (labels) labels.style.opacity = String(s.chartOpacity);

      const rr = el.getBoundingClientRect(),
        cr = cv.getBoundingClientRect(),
        scale = cr.width / s.width;
      for (const t of s.physics.toys) {
        let image = flying.current?.querySelector<HTMLImageElement>(
          `[data-flying="${t.id}"]`
        );
        if (t.phase === 'loosening' || t.canvas) {
          image?.remove();
          continue;
        }
        if (!image) {
          image = document.createElement('img');
          image.src = sprites[t.id];
          image.dataset.flying = t.id;
          image.alt = '';
          flying.current?.append(image);
        }
        image.style.width = `${40 * scale}px`;
        image.style.height = `${40 * scale}px`;
        image.style.transform = `translate(${cr.left - rr.left + t.body.position.x * scale - 20 * scale}px,${cr.top - rr.top + t.body.position.y * scale - 20 * scale}px) rotate(${t.body.angle}rad)`;
      }
      el.querySelectorAll<HTMLButtonElement>('[data-toy]').forEach((button) => {
        const toy = s.physics.toys.find((t) => t.id === button.dataset.toy);
        button.dataset.phase = toy?.phase ?? 'pinned';
      });
      if (selectedRef.current) {
        const id = selectedRef.current.dataset.id,
          f = s.fish.find((f) => f.id === id);
        if (f) {
          const half = selectedRef.current.offsetWidth / 2 + 4;
          selectedRef.current.style.left = `${Math.max(half, Math.min(cr.width - half, (f.x / s.width) * cr.width))}px`;
          selectedRef.current.style.top = `${(f.y / 288) * 100}%`;
        }
      }
    }
    function render() {
      const start = performance.now();
      if (!drawScene) return;
      drawScene(ctx!, s, fluid, dark);
      project();
      stats.current.drawMs.push(performance.now() - start);
      if (stats.current.drawMs.length > 3600) stats.current.drawMs.shift();
      dirty = false;
    }
    function tick(now: number) {
      raf = 0;
      if (disposed) return;
      const elapsed = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const hasFlight = s.physics.toys.some((toy) => !toy.canvas);
      const sceneVisible = visible || (introVisible && hasFlight);
      const source = el
          .querySelector<HTMLElement>('[data-toy="controller"]')
          ?.getBoundingClientRect(),
        tank = cv.getBoundingClientRect();
      const canDemo =
        !!drawScene &&
        !!source &&
        source.top >= 0 &&
        source.bottom <= innerHeight &&
        tank.top + (40 * tank.width) / s.width <= innerHeight &&
        tank.bottom > 0 &&
        !s.paused &&
        !s.reduced;
      const action = demo.current?.step(elapsed, canDemo);
      if (!canDemo) el.removeAttribute('data-demo');
      if (action === 'wiggle') el.dataset.demo = 'controller';
      if (action === 'drop') {
        el.removeAttribute('data-demo');
        drop('controller');
      }
      if (!s.paused && !s.reduced && drawScene) {
        if (visible) {
          stats.current.frames++;
          if (elapsed > 0) stats.current.intervals.push(elapsed * 1000);
          if (stats.current.intervals.length > 3600)
            stats.current.intervals.shift();
        }
        stats.current.steps += clock.advance(elapsed, () => {
          if (introVisible) {
            const old = s.role;
            s.stepIdentity(
              config.dt,
              hovered.current ||
                focused.current ||
                s.physics.toys.some(
                  (t) =>
                    ['gpt', 'claude', 'chart', 'palette'].includes(t.id) &&
                    t.phase === 'loosening'
                )
            );
            if (old !== s.role) setRole(s.role);
          }
          if (sceneVisible) {
            const events = s.step(config.dt);
            if (fluid?.lost) {
              fluid.dispose();
              fluid = null;
              setWater(text.fallback);
            }
            fluid?.step(config.dt, events);
          }
        });
        const recent = stats.current.intervals.slice(-180);
        if (
          stats.current.quality === 96 &&
          recent.length === 180 &&
          recent.reduce((a, b) => a + b, 0) / 180 > 24
        ) {
          stats.current.quality = 64;
          initFluid();
        }
      }
      if (introVisible && !sceneVisible) project();
      if (
        dirty ||
        (sceneVisible &&
          !s.paused &&
          !s.reduced &&
          (stats.current.quality === 96 || now - lastDraw >= 1000 / 30))
      ) {
        render();
        lastDraw = now;
      }
      if (
        !document.hidden &&
        (visible || introVisible) &&
        !s.paused &&
        !s.reduced
      )
        raf = requestAnimationFrame(tick);
    }
    function wake() {
      if (disposed || initializationFailed || document.hidden) return;
      if (!raf) {
        last = 0;
        clock.accumulator = 0;
        raf = requestAnimationFrame(tick);
      }
    }
    redraw.current = () => {
      dirty = true;
      wake();
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === cv) visible = e.isIntersecting;
        else introVisible = e.isIntersecting;
      });
      if (!visible && !introVisible) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        clock.accumulator = 0;
      } else wake();
    });
    observer.observe(cv);
    observer.observe(intro.current!);
    const resize = new ResizeObserver(measure);
    resize.observe(cv);
    function visibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        clock.accumulator = 0;
      } else wake();
    }
    function onMotion() {
      s.reduced = motion.matches;
      cancelDemo();
      setReduced(s.reduced);
      s.physics.setReduced(s.reduced);
      if (s.reduced) {
        s.role = 0;
        setRole(0);
        flying.current?.replaceChildren();
        if (s.mode === 'beeswarm') {
          s.fish.forEach((f) => Object.assign(f, s.targets.get(f.id)));
          s.transition = null;
        }
      }
      dirty = true;
      wake();
    }
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', onMotion);
    window.addEventListener('resize', measure);
    const theme = new MutationObserver(() => {
      dark = document.documentElement.dataset.theme === 'dark';
      dirty = true;
      wake();
    });
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    // P0-only diagnostics are attached to this preview element, never to the production window.
    if (debug)
      Object.assign(el, {
        aquariumP0: {
          snapshot: () => s.snapshot(),
          stats: () => stats.current,
          loseContext: () =>
            fluid?.canvas
              .getContext('webgl2')
              ?.getExtension('WEBGL_lose_context')
              ?.loseContext(),
          drop: (id: ToyId) => drop(id),
          reset: () => reset(),
          fluidCanvas: () => fluid?.canvas,
        },
      });
    measure();
    wake();
    return () => {
      disposed = true;
      light.onload = night.onload = light.onerror = night.onerror = null;
      cancelAnimationFrame(raf);
      resize.disconnect();
      observer.disconnect();
      theme.disconnect();
      motion.removeEventListener('change', onMotion);
      window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', visibility);
      fluid?.dispose();
      s.dispose();
      flying.current?.replaceChildren();
      delete (el as HTMLElement & { aquariumP0?: unknown }).aquariumP0;
      scene.current = undefined;
      redraw.current = () => {};
    };
  }, []);
  function drop(id: ToyId) {
    const s = scene.current,
      button = root.current?.querySelector<HTMLButtonElement>(
        `[data-toy="${id}"]`
      ),
      cv = canvas.current;
    if (!s || !button || !cv || s.paused || failed) return;
    const r = button.getBoundingClientRect(),
      c = cv.getBoundingClientRect(),
      scale = c.width / s.width;
    if (
      s.drop(id, {
        x: (r.x + r.width / 2 - c.x) / scale,
        y: (r.y + r.height / 2 - c.y) / scale,
      })
    ) {
      setDropped(s.physics.toys.map((t) => t.id));
      redraw.current();
    }
  }
  function reset() {
    scene.current?.reset();
    flying.current?.replaceChildren();
    setDropped([]);
    setRole(0);
    setMode('school');
    setSelected(null);
    resetFluid.current();
    redraw.current();
  }
  function changeMode(m: ViewMode) {
    scene.current?.setMode(m);
    setMode(m);
    redraw.current();
  }
  return {
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
    reset,
    changeMode,
  };
}
