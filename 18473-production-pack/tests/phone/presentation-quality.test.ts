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

function declarations(css: string): CssDeclaration[] {
  return [...css.matchAll(/(?:^|[;{\n])\s*([\w-]+)\s*:\s*([^;{}]+);/g)]
    .map((match) => ({ property: match[1]!, value: match[2]!.trim() }));
}

function selectorsWithProperty(css: string, property: string): string[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)}/g)].flatMap((match) => {
    const selector = match[1]!.trim();
    const body = match[2]!;
    if (selector.startsWith('@') || !new RegExp(`(?:^|\\n)\\s*${property}\\s*:`).test(body)) {
      return [];
    }
    return selector.split(',').map((part) => part.trim()).filter(Boolean);
  });
}

function keyframeBodies(css: string): Map<string, string> {
  return new Map([...css.matchAll(/@keyframes\s+([\w-]+)\s*{([\s\S]*?)\n}/g)]
    .map((match) => [match[1]!, match[2]!] as const));
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
    const tokenDeclarations = declarations(tokensCss);
    const consumerDeclarations = declarations(`${globalsCss}\n${phoneCss}`);
    const rawColor = /#[0-9a-f]{3,8}\b|\b(?:oklch|rgba?|hsla?)\s*\(|\b(?:black|white|red|blue|green|purple|magenta|cyan|yellow|gray|grey)\b/i;
    const colorProperties = /^(?:color|background|background-color|border|border-color|border-(?:block|inline)(?:-(?:start|end))?|border-(?:top|right|bottom|left)|outline|outline-color|box-shadow|text-shadow|accent-color|caret-color|fill|stroke)$/;
    const rootTokenBlock = tokensCss.match(/:root\s*{([\s\S]*)}\s*$/);

    expect(rootTokenBlock).not.toBeNull();
    expect(declarations(rootTokenBlock![1]!)).toEqual(tokenDeclarations);
    expect(tokenDeclarations.filter(({ property }) => property.startsWith('--color-')).length)
      .toBeGreaterThan(0);
    expect(tokenDeclarations.filter(({ property }) => property.startsWith('--font-')).length)
      .toBeGreaterThan(0);
    for (const declaration of tokenDeclarations.filter(({ value }) => rawColor.test(value))) {
      expect(declaration.property).toMatch(/^--color-/);
    }
    for (const declaration of consumerDeclarations) {
      expect(declaration.property).not.toMatch(/^--(?:color|font)-/);
      expect(declaration.value, declaration.property).not.toMatch(rawColor);
      if (declaration.property === 'font-family') {
        expect(declaration.value).toMatch(/^var\(--font-/);
      }
      if (declaration.property === 'font' && declaration.value !== 'inherit') {
        expect(declaration.value).toContain('var(--font-');
      }
      if (colorProperties.test(declaration.property)
        && !/^(?:0|none|inherit|transparent)$/.test(declaration.value)
        && declaration.value !== '0.125rem solid transparent') {
        expect(declaration.value, declaration.property).toContain('var(--color-');
      }
    }

    expect(phoneCss).not.toMatch(/transition(?:-property)?:\s*all\b/i);
    expect(phoneCss).not.toMatch(/background-clip:\s*text|linear-gradient|radial-gradient|text-shadow/i);
  });

  it('limits every authored transition and keyframe to opacity or transform', () => {
    const reducedMotionStart = phoneCss.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(reducedMotionStart).toBeGreaterThan(0);
    const authoredCss = phoneCss.slice(0, reducedMotionStart);
    const transitions = declarations(authoredCss)
      .filter(({ property }) => property === 'transition')
      .map(({ value }) => value);
    expect(transitions.length).toBeGreaterThan(0);
    for (const transition of transitions) {
      const properties = transition.split(',').map((part) => part.trim().split(/\s+/)[0]);
      expect(properties.every((property) => property === 'opacity' || property === 'transform'))
        .toBe(true);
    }

    const keyframes = keyframeBodies(phoneCss);
    expect(keyframes.size).toBeGreaterThan(0);
    for (const body of keyframes.values()) {
      const animatedProperties = declarations(body).map(({ property }) => property);
      expect(animatedProperties.length).toBeGreaterThan(0);
      expect(animatedProperties.every((property) => property === 'opacity' || property === 'transform'))
        .toBe(true);
    }
  });

  it('maps every authored motion selector to a reduced-motion collapse', () => {
    const reducedMotionStart = phoneCss.indexOf('@media (prefers-reduced-motion: reduce)');
    const authoredCss = phoneCss.slice(0, reducedMotionStart);
    const reducedCss = phoneCss.slice(reducedMotionStart);
    const transitioningSelectors = selectorsWithProperty(authoredCss, 'transition');
    const animatedSelectors = selectorsWithProperty(authoredCss, 'animation');

    expect(transitioningSelectors.length).toBeGreaterThan(0);
    expect(animatedSelectors.length).toBeGreaterThan(0);
    for (const selector of [...transitioningSelectors, ...animatedSelectors]) {
      expect(reducedCss, selector).toContain(selector);
    }
    expect(reducedCss).toContain('transition-duration: var(--dur-micro)');
    expect(reducedCss).toContain('animation-duration: var(--dur-micro)');
    expect(reducedCss).toContain('animation-name: presentation-crossfade');
    expect(globalsCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(globalsCss).toContain('transition-duration: var(--dur-micro) !important');
    expect(globalsCss).toContain('animation-duration: var(--dur-micro) !important');

    const microDuration = tokensCss.match(/--dur-micro:\s*(\d+)ms/);
    expect(microDuration).not.toBeNull();
    expect(Number(microDuration![1])).toBeLessThanOrEqual(150);

    const keyframes = keyframeBodies(phoneCss);
    const animationDeclarations = declarations(`${authoredCss}\n${reducedCss}`)
      .filter(({ property }) => property === 'animation' || property === 'animation-name')
      .map(({ value }) => ({
        value,
        names: [...keyframes.keys()].filter((name) => value.includes(name)),
      }));
    for (const animation of animationDeclarations) {
      expect(animation.names, animation.value).toHaveLength(1);
    }
    const animationNames = animationDeclarations.flatMap(({ names }) => names);
    expect(new Set(animationNames)).toEqual(new Set(keyframes.keys()));
  });

  it('keeps clickable labels single-line and minimum targets tokenized', () => {
    expect(phoneCss).not.toMatch(/\.messageWindowControl \.secondaryButton\s*{[^}]*white-space:\s*normal/s);
    expect(tokensCss).toMatch(/--target-min:\s*2\.75rem/);
    expect(phoneCss).toMatch(/\.timelineSelect\s*{[^}]*min-height:\s*var\(--target-min\)/s);
    expect(phoneCss).toMatch(/\.timelineSelect:focus-visible\s*{/);
    expect(phoneCss).toMatch(/\.timelineSelect:disabled\s*{/);
  });
});
