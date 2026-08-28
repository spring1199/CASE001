import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const phoneCss = readFileSync(
  path.join(process.cwd(), 'src/phone/phone.module.css'),
  'utf8',
);
const tokensCss = readFileSync(path.join(process.cwd(), 'tokens.css'), 'utf8');

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

  it('uses token colors and fonts without gradient, glow, or transition-all shortcuts', () => {
    expect(tokensCss).toMatch(/--font-body:/);
    expect(tokensCss).toMatch(/--font-mono:/);
    expect(tokensCss).toMatch(/--color-canvas:\s*oklch\(/);
    expect(tokensCss).toMatch(/--color-accent:\s*oklch\(/);
    expect(phoneCss).not.toMatch(/transition(?:-property)?:\s*all\b/i);
    expect(phoneCss).not.toMatch(/background-clip:\s*text|linear-gradient|radial-gradient|text-shadow/i);
    expect(phoneCss).not.toMatch(
      /(?:^|\s)(?:color|background|border-color|outline-color):\s*#[0-9a-f]{3,8}\b/im,
    );
  });

  it('limits authored motion to opacity and transform with reduced-motion coverage', () => {
    const transitions = [...phoneCss.matchAll(/transition:\s*([^;]+);/g)]
      .map((match) => match[1]);
    expect(transitions.length).toBeGreaterThan(0);
    for (const transition of transitions) {
      expect(transition).not.toMatch(/\b(?:width|height|top|left|margin|padding)\b/);
    }

    const keyframeBlocks = [...phoneCss.matchAll(/@keyframes\s+[\w-]+\s*{([\s\S]*?)\n}/g)]
      .map((match) => match[1]);
    expect(keyframeBlocks.length).toBeGreaterThan(0);
    for (const keyframes of keyframeBlocks) {
      expect(keyframes).not.toMatch(/\b(?:width|height|top|left|margin|padding)\s*:/);
    }
    expect(phoneCss).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps clickable labels single-line and minimum targets tokenized', () => {
    expect(phoneCss).not.toMatch(/\.messageWindowControl \.secondaryButton\s*{[^}]*white-space:\s*normal/s);
    expect(tokensCss).toMatch(/--target-min:\s*2\.75rem/);
    expect(phoneCss).toMatch(/\.timelineSelect\s*{[^}]*min-height:\s*var\(--target-min\)/s);
    expect(phoneCss).toMatch(/\.timelineSelect:focus-visible\s*{/);
    expect(phoneCss).toMatch(/\.timelineSelect:disabled\s*{/);
  });
});
