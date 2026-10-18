import { translate } from '@docusaurus/Translate';
export function copy() {
  const text = {
    loading: translate({
      id: 'hero.loading',
      message: 'Preparing the aquarium',
    }),
    poster: translate({
      id: 'hero.poster',
      message: 'Static aquarium · Animation is unavailable',
    }),
    posterAlt: translate({
      id: 'hero.posterAlt',
      message: 'A pixel aquarium with 40 fish in four series',
    }),
    flow: translate({
      id: 'hero.flow',
      message: 'Flow: still → slow → medium → strong (relative simulation)',
    }),
    fallback: translate({
      id: 'hero.fallback',
      message: 'Simplified water · Flow shading unavailable',
    }),
    hi: translate({ id: 'hero.hi', message: 'Hi' }),
    name: translate({ id: 'hero.name', message: '! I’m' }),
    roles: translate({
      id: 'hero.roles',
      message: 'Agent Engineer, Visualization Engineer, Design Beginner',
    }),
    an: translate({ id: 'hero.an', message: 'An' }),
    agent: translate({ id: 'hero.agent', message: 'Agent Engineer' }),
    visual: translate({
      id: 'hero.visual',
      message: 'A Visualization Engineer',
    }),
    design: translate({ id: 'hero.design', message: 'A Design Beginner' }),
    stack: translate({ id: 'hero.stack', message: 'My stack:' }),
    life: translate({
      id: 'hero.life',
      message: 'Outside work, I’m a bit of a geek. I like ',
    }),
    math: translate({ id: 'hero.math', message: 'math' }),
    and: translate({ id: 'hero.and', message: ' and ' }),
    games: translate({ id: 'hero.games', message: 'video games' }),
    comma: translate({ id: 'hero.comma', message: ',' }),
    enjoy: translate({ id: 'hero.enjoy', message: 'I enjoy making ' }),
    demos: translate({
      id: 'hero.demos',
      message: 'creative visualization demos',
    }),
    try: translate({
      id: 'hero.try',
      message: 'and occasionally try creating my own ',
    }),
    game: translate({ id: 'hero.game', message: 'games' }),
    period: translate({ id: 'hero.period', message: '.' }),
    dropped: translate({
      id: 'hero.dropped',
      message: 'already dropped',
    }),
    resumeDrop: translate({
      id: 'hero.resumeDrop',
      message: 'Resume to drop icons',
    }),
    drop: translate({ id: 'hero.drop', message: 'drop into the water' }),
    school: translate({ id: 'hero.school', message: 'Free swimming' }),
    beeswarm: translate({ id: 'hero.beeswarm', message: 'Beeswarm chart' }),
    value: translate({ id: 'hero.value', message: 'Example value' }),
    seriesLabel: translate({ id: 'hero.seriesLabel', message: 'Series' }),
    caption: translate({
      id: 'hero.caption',
      message: 'Demo data · Shape and color identify each series',
    }),
    chartCaption: translate({
      id: 'hero.chartCaption',
      message: ' · Vertical position shows the example value',
    }),
    pause: translate({ id: 'hero.pause', message: 'Pause' }),
    canvasKeys: translate({
      id: 'hero.canvasKeys',
      message:
        'Aquarium. Left and right arrow keys select fish; Space pauses or resumes motion.',
    }),
    round: translate({ id: 'hero.round', message: 'Round' }),
    long: translate({ id: 'hero.long', message: 'Long tail' }),
    diamond: translate({ id: 'hero.diamond', message: 'Diamond' }),
    short: translate({ id: 'hero.short', message: 'Short fin' }),
    wave: translate({ id: 'hero.wave', message: 'Waving hand' }),
    controller: translate({
      id: 'hero.controller',
      message: 'Game controller',
    }),
    geometry: translate({ id: 'hero.geometry', message: 'Visualization' }),
    chart: translate({ id: 'hero.chart', message: 'Data chart' }),
    palette: translate({ id: 'hero.palette', message: 'Paint palette' }),
  };
  return {
    ...text,
    series: [text.round, text.long, text.diamond, text.short],
    toys: {
      wave: text.wave,
      math: text.math,
      controller: text.controller,
      geometry: text.geometry,
      chart: text.chart,
      palette: text.palette,
    },
  };
}
