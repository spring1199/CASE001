import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const phoneCss = readFileSync(
  path.join(process.cwd(), 'src/phone/phone.module.css'),
  'utf8',
);
const globalsCss = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
const tokensCss = readFileSync(path.join(process.cwd(), 'tokens.css'), 'utf8');

type CssDeclaration = Readonly<{ property: string; value: string }>;
type CssBlock = Readonly<{
  prelude: string;
  body: string;
  depth: number;
  open: number;
  close: number;
}>;

function stripComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, '').trim();
}

function parseCssBlocks(css: string): CssBlock[] {
  const blocks: Array<{ prelude: string; body: string; depth: number; open: number; close: number }> = [];
  const stack: Array<{ index: number; bodyStart: number }> = [];
  const segmentStarts = [0];
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let comment = false;

  for (let index = 0; index < css.length; index += 1) {
    const character = css[index]!;
    const next = css[index + 1];
    if (comment) {
      if (character === '*' && next === '/') {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== null) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '/' && next === '*') {
      comment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ';') {
      segmentStarts[depth] = index + 1;
      continue;
    }
    if (character === '{') {
      const prelude = stripComments(css.slice(segmentStarts[depth] ?? 0, index));
      const blockIndex = blocks.push({ prelude, body: '', depth, open: index, close: -1 }) - 1;
      stack.push({ index: blockIndex, bodyStart: index + 1 });
      depth += 1;
      segmentStarts[depth] = index + 1;
      continue;
    }
    if (character === '}') {
      const frame = stack.pop();
      if (frame === undefined) throw new Error(`Unexpected CSS closing brace at ${index}.`);
      depth -= 1;
      blocks[frame.index]!.body = css.slice(frame.bodyStart, index);
      blocks[frame.index]!.close = index;
      segmentStarts[depth] = index + 1;
    }
  }
  if (stack.length > 0) throw new Error('Unclosed CSS block.');
  return blocks;
}

function directDeclarations(body: string): CssDeclaration[] {
  const result: CssDeclaration[] = [];
  let segmentStart = 0;
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let comment = false;

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index]!;
    const next = body[index + 1];
    if (comment) {
      if (character === '*' && next === '/') {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== null) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '/' && next === '*') {
      comment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{') {
      depth += 1;
      continue;
    }
    if (character === '}') {
      depth -= 1;
      if (depth === 0) segmentStart = index + 1;
      continue;
    }
    if (character !== ';' || depth !== 0) continue;
    const declaration = stripComments(body.slice(segmentStart, index));
    segmentStart = index + 1;
    const match = declaration.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
    if (match !== null) result.push({ property: match[1]!, value: match[2]!.trim() });
  }
  const trailingDeclaration = stripComments(body.slice(segmentStart));
  const trailingMatch = trailingDeclaration.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
  if (trailingMatch !== null) {
    result.push({ property: trailingMatch[1]!, value: trailingMatch[2]!.trim() });
  }
  return result;
}

function isInside(block: CssBlock, parent: CssBlock): boolean {
  return block.open > parent.open && block.close < parent.close;
}

const rawColor = /#[0-9a-f]{3,8}\b|\b(?:oklch|rgba?|hsla?)\s*\(|\b(?:black|white|red|blue|green|purple|magenta|cyan|yellow|gray|grey)\b/i;
const colorProperties = /^(?:color|background|background-color|border|border-color|border-(?:block|inline)(?:-(?:start|end))?|border-(?:top|right|bottom|left)|outline|outline-color|box-shadow|text-shadow|accent-color|caret-color|fill|stroke)$/;

function tokenContractViolations(tokenSource: string, consumerSource: string): string[] {
  const violations: string[] = [];
  const tokenBlocks = parseCssBlocks(tokenSource);
  const roots = tokenBlocks.filter(({ depth, prelude }) => depth === 0 && prelude === ':root');
  if (roots.length !== 1) return [`expected one top-level :root block, received ${roots.length}`];
  const root = roots[0]!;
  const rootDeclarations = directDeclarations(root.body);
  if (!rootDeclarations.some(({ property }) => property.startsWith('--color-'))) {
    violations.push('root block has no color tokens');
  }
  if (!rootDeclarations.some(({ property }) => property.startsWith('--font-'))) {
    violations.push('root block has no font tokens');
  }
  for (const declaration of rootDeclarations.filter(({ value }) => rawColor.test(value))) {
    if (!declaration.property.startsWith('--color-')) {
      violations.push(`raw color is assigned to non-color token ${declaration.property}`);
    }
  }
  for (const block of tokenBlocks.filter((candidate) => candidate !== root)) {
    for (const declaration of directDeclarations(block.body)) {
      if (/^--(?:color|font)-/.test(declaration.property)) {
        violations.push(`${declaration.property} is defined outside the top-level :root block`);
      }
      if (rawColor.test(declaration.value)) {
        violations.push(`raw color ${declaration.value} appears outside the top-level :root block`);
      }
      if ((declaration.property === 'font-family' || declaration.property === 'font')
        && declaration.value !== 'inherit'
        && !declaration.value.includes('var(--font-')) {
        violations.push(`${declaration.property} bypasses a root font token: ${declaration.value}`);
      }
    }
  }
  for (const block of parseCssBlocks(consumerSource)) {
    for (const declaration of directDeclarations(block.body)) {
      if (/^--(?:color|font)-/.test(declaration.property)) {
        violations.push(`consumer defines ${declaration.property}`);
      }
      if (rawColor.test(declaration.value)) {
        violations.push(`consumer ${declaration.property} contains raw color ${declaration.value}`);
      }
      if (declaration.property === 'font-family' && !/^var\(--font-/.test(declaration.value)) {
        violations.push(`font-family bypasses a font token: ${declaration.value}`);
      }
      if (declaration.property === 'font'
        && declaration.value !== 'inherit'
        && !declaration.value.includes('var(--font-')) {
        violations.push(`font shorthand bypasses a font token: ${declaration.value}`);
      }
      if (colorProperties.test(declaration.property)
        && !/^(?:0|none|inherit|transparent)$/.test(declaration.value)
        && declaration.value !== '0.125rem solid transparent'
        && !declaration.value.includes('var(--color-')) {
        violations.push(`${declaration.property} bypasses a color token: ${declaration.value}`);
      }
    }
  }
  return violations;
}

function splitSelectors(prelude: string): string[] {
  return prelude.split(',').map((selector) => selector.trim()).filter(Boolean);
}

function transitionProperties(
  declarations: readonly CssDeclaration[],
  inferImplicitAll = true,
): string[] {
  const properties = declarations.flatMap(({ property, value }) => {
    if (property === 'transition-property') return value.split(',').map((part) => part.trim());
    if (property !== 'transition') return [];
    return value.split(',').map((part) => part.trim().split(/\s+/)[0] ?? 'all');
  });
  const hasDurationLonghand = declarations.some(({ property }) => property === 'transition-duration');
  const hasPropertyOrShorthand = declarations.some(({ property }) =>
    property === 'transition-property' || property === 'transition');
  return inferImplicitAll && hasDurationLonghand && !hasPropertyOrShorthand
    ? [...properties, 'all']
    : properties;
}

function motionContractViolations(
  phoneSource: string,
  globalSource: string,
  tokenSource: string,
): string[] {
  const violations: string[] = [];
  const blocks = parseCssBlocks(phoneSource);
  const keyframes = blocks.filter(({ prelude }) => /^@keyframes\s+[\w-]+$/.test(prelude));
  const keyframeNames = new Set(keyframes.map(({ prelude }) => prelude.split(/\s+/)[1]!));
  const reducedMedia = blocks.filter(({ prelude }) =>
    /^@media\s*\(prefers-reduced-motion:\s*reduce\)$/.test(prelude));
  const insideKeyframes = (block: CssBlock) => keyframes.some((parent) => isInside(block, parent));
  const insideReduced = (block: CssBlock) => reducedMedia.some((parent) => isInside(block, parent));
  const rules = blocks.filter(({ prelude }) => !prelude.startsWith('@'))
    .filter((block) => !insideKeyframes(block));
  const baseRules = rules.filter((block) => !insideReduced(block));
  const reducedRules = rules.filter(insideReduced);
  const reducedSelectors = new Set(reducedRules.flatMap(({ prelude }) => splitSelectors(prelude)));
  const usedKeyframes = new Set<string>();

  for (const keyframe of keyframes) {
    const steps = blocks.filter((block) => block.depth === keyframe.depth + 1 && isInside(block, keyframe));
    if (steps.length === 0) violations.push(`${keyframe.prelude} has no parsed steps`);
    for (const step of steps) {
      for (const declaration of directDeclarations(step.body)) {
        if (declaration.property !== 'opacity' && declaration.property !== 'transform') {
          violations.push(`${keyframe.prelude} animates ${declaration.property}`);
        }
      }
    }
  }

  for (const rule of rules) {
    const declarations = directDeclarations(rule.body);
    for (const property of transitionProperties(declarations, !insideReduced(rule))) {
      if (property !== 'none' && property !== 'opacity' && property !== 'transform') {
        violations.push(`${rule.prelude} transitions ${property}`);
      }
    }
    for (const declaration of declarations) {
      if (declaration.property !== 'animation' && declaration.property !== 'animation-name') continue;
      for (const part of declaration.value.split(',')) {
        if (part.trim() === 'none') continue;
        const names = [...keyframeNames].filter((name) => part.includes(name));
        if (names.length !== 1) violations.push(`${rule.prelude} has unresolved animation ${part.trim()}`);
        names.forEach((name) => usedKeyframes.add(name));
      }
    }
  }

  for (const rule of baseRules) {
    const declarations = directDeclarations(rule.body);
    const hasTransition = transitionProperties(declarations).some((property) => property !== 'none');
    const hasAnimation = declarations.some(({ property, value }) =>
      (property === 'animation' || property === 'animation-name') && value !== 'none');
    if (!hasTransition && !hasAnimation) continue;
    for (const selector of splitSelectors(rule.prelude)) {
      if (!reducedSelectors.has(selector)) violations.push(`${selector} has no reduced-motion rule`);
    }
  }

  for (const name of keyframeNames) {
    if (!usedKeyframes.has(name)) violations.push(`unused or unaudited keyframe ${name}`);
  }
  if (!globalSource.includes('@media (prefers-reduced-motion: reduce)')
    || !globalSource.includes('transition-duration: var(--dur-micro) !important')
    || !globalSource.includes('animation-duration: var(--dur-micro) !important')) {
    violations.push('global reduced-motion collapse is incomplete');
  }
  const tokenRoot = parseCssBlocks(tokenSource)
    .find(({ depth, prelude }) => depth === 0 && prelude === ':root');
  const microDuration = tokenRoot === undefined
    ? undefined
    : directDeclarations(tokenRoot.body).find(({ property }) => property === '--dur-micro')?.value;
  const milliseconds = microDuration?.match(/^(\d+)ms$/)?.[1];
  if (milliseconds === undefined || Number(milliseconds) > 150) {
    violations.push(`reduced-motion duration exceeds 150ms: ${microDuration ?? 'missing'}`);
  }
  return violations;
}

describe('Phase 05 Hallmark presentation contract', () => {
  it('keeps the Workbench/Halo stamp and pre-emit scores at three or higher', () => {
    const stamp = phoneCss.split(/\r?\n/).slice(0, 8).join('\n');
    expect(stamp).toContain('macrostructure: Workbench');
    expect(stamp).toContain('theme: Halo');
    expect(stamp).toContain('genre: atmospheric');
    expect(stamp).toContain('mobile: pass (36, 59, 61–69)');

    const critique = stamp.match(/pre-emit critique: P(\d) H(\d) E(\d) S(\d) R(\d) V(\d)/);
    expect(critique).not.toBeNull();
    expect(critique!.slice(1).map(Number).every((score) => score >= 3)).toBe(true);
  });

  it('defines raw colors and font stacks only in the root token block', () => {
    expect(tokenContractViolations(tokensCss, `${globalsCss}\n${phoneCss}`)).toEqual([]);

    expect(phoneCss).not.toMatch(/transition(?:-property)?:\s*all\b/i);
    expect(phoneCss).not.toMatch(/background-clip:\s*text|linear-gradient|radial-gradient|text-shadow/i);
  });

  it('audits every transition, animation, keyframe, and reduced-motion mapping', () => {
    expect(motionContractViolations(phoneCss, globalsCss, tokensCss)).toEqual([]);
  });

  it('keeps clickable labels single-line and minimum targets tokenized', () => {
    expect(phoneCss).not.toMatch(/\.messageWindowControl \.secondaryButton\s*{[^}]*white-space:\s*normal/s);
    expect(tokensCss).toMatch(/--target-min:\s*2\.75rem/);
    expect(phoneCss).toMatch(/\.timelineSelect\s*{[^}]*min-height:\s*var\(--target-min\)/s);
    expect(phoneCss).toMatch(/\.timelineSelect:focus-visible\s*{/);
    expect(phoneCss).toMatch(/\.timelineSelect:disabled\s*{/);
  });
});

describe('Phase 05 CSS contract parser resilience', () => {
  const fixtureTokens = ':root { --color-accent: oklch(0.7 0.1 70); --font-body: sans-serif; --dur-micro: 100ms; }';
  const fixtureGlobals = '@media (prefers-reduced-motion: reduce) { * { transition-duration: var(--dur-micro) !important; animation-duration: var(--dur-micro) !important; } }';

  it('rejects raw color or token definitions in a later theme override', () => {
    const violations = tokenContractViolations(
      `${fixtureTokens}\n.dark { --color-accent: #fff; }`,
      '.panel { color: var(--color-accent); font-family: var(--font-body); }',
    );
    expect(violations).toEqual(expect.arrayContaining([
      expect.stringContaining('--color-accent is defined outside'),
      expect.stringContaining('raw color #fff appears outside'),
    ]));
  });

  it('rejects a layout transition hidden in transition-property longhand', () => {
    const source = '.panel { transition-property: width; transition-duration: 1s; }\n@media (prefers-reduced-motion: reduce) { .panel { transition-duration: var(--dur-micro); } }';
    expect(motionContractViolations(source, fixtureGlobals, fixtureTokens))
      .toContain('.panel transitions width');
  });

  it('rejects transition-duration longhand with its implicit all-property default', () => {
    const source = '.panel { transition-duration: 1s }\n@media (prefers-reduced-motion: reduce) { .panel { transition-duration: var(--dur-micro) } }';
    expect(motionContractViolations(source, fixtureGlobals, fixtureTokens))
      .toContain('.panel transitions all');
  });

  it.each([
    '@keyframes slide { from { width: 0; } to { width: 1rem; } }',
    '  @keyframes slide {\n    from { width: 0; }\n    to { width: 1rem; }\n  }',
  ])('rejects compact or indented keyframes that animate layout', (keyframes) => {
    const source = `.panel { animation: slide 1s linear; }\n@media (prefers-reduced-motion: reduce) { .panel { animation-duration: var(--dur-micro); animation-name: slide; } }\n${keyframes}`;
    expect(motionContractViolations(source, fixtureGlobals, fixtureTokens))
      .toEqual(expect.arrayContaining([expect.stringContaining('@keyframes slide animates width')]));
  });

  it('accepts opacity/transform motion with an explicit reduced-motion mapping', () => {
    const source = '.panel { transition-property: opacity, transform; transition-duration: 200ms; animation: enter 200ms linear; }\n@media (prefers-reduced-motion: reduce) { .panel { transition-duration: var(--dur-micro); animation-duration: var(--dur-micro); animation-name: crossfade; } }\n@keyframes enter { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }\n  @keyframes crossfade {\n    from { opacity: 0; }\n    to { opacity: 1; }\n  }';
    expect(motionContractViolations(source, fixtureGlobals, fixtureTokens)).toEqual([]);
  });
});
