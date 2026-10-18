import { expect, type Locator } from '@playwright/test';

// Design tokens measured on dev on 2026-10-18 (Topup-UITestCases.md, "Design tokens"). Values are the computed
// `rgb()` strings so they can go straight into toHaveCSS. When the design changes, update here and in the md.
export const RGB = {
    ink: 'rgb(14, 27, 44)',          // #0E1B2C
    body: 'rgb(45, 59, 79)',         // #2D3B4F
    muted: 'rgb(91, 107, 130)',      // #5B6B82
    faint: 'rgb(135, 148, 168)',     // #8794A8
    border: 'rgb(228, 232, 239)',    // #E4E8EF
    surface: 'rgb(238, 241, 246)',   // #EEF1F6
    primary: 'rgb(23, 95, 236)',     // #175FEC
    selectedTint: 'rgb(232, 241, 254)', // #E8F1FE
    error: 'rgb(200, 30, 30)',       // #C81E1E
    white: 'rgb(255, 255, 255)',
    transparent: 'rgba(0, 0, 0, 0)',
} as const;

/** Reads computed style values of one element, for annotations of "record on first run" (Capture) cases. */
export async function readStyle(loc: Locator): Promise<Record<string, string>> {
    return loc.first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
            color: cs.color, background: cs.backgroundColor, border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
            outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`, boxShadow: cs.boxShadow, opacity: cs.opacity, cursor: cs.cursor,
        };
    });
}

/** WCAG contrast ratio between two `rgb(r, g, b)` strings. */
export function contrastRatio(a: string, b: string): number {
    const lum = (rgb: string) => {
        const [r, g, bl] = (rgb.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).slice(0, 3).map(Number).map(v => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
    };
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
}

/** Asserts the rendered size within 1px: computed widths are fractional (for example 43.9062px) so toHaveCSS('width', '44px') is brittle. */
export async function expectSize(loc: Locator, size: { w?: number; h?: number }): Promise<void> {
    const box = await loc.first().boundingBox();
    if (!box) throw new Error('element has no bounding box (not visible?)');
    if (size.w !== undefined) expect(Math.abs(box.width - size.w), `width ${box.width}px, expected about ${size.w}px`).toBeLessThanOrEqual(1);
    if (size.h !== undefined) expect(Math.abs(box.height - size.h), `height ${box.height}px, expected about ${size.h}px`).toBeLessThanOrEqual(1);
}
