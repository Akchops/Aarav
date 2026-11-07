/** Shared shapes between the films and their renderers (type-only: no runtime code). */
export interface Rect { x: number; y: number; w: number; h: number }

export interface CellState {
  /** Cell rect in stage CSS px (top-left), before rotation about its centre. */
  x: number; y: number; w: number; h: number;
  /** Radians. */
  rot: number;
  alpha: number;
  /** 0 = name cell, 1 = role-line cell. */
  mix: number;
  /** Source rects in texture px: the name cell and the role-line cell. */
  a: Rect;
  b: Rect;
}

export interface RevealScene {
  W: number;
  H: number;
  tex: HTMLCanvasElement;
  /** The assembled name box on the stage (CSS px) and in the texture (px). */
  nameRect: Rect;
  nameTex: Rect;
}

export interface RevealFrame {
  cells: CellState[];
  grain: number;
  lens: { x: number; y: number; presence: number; radius: number };
}

export interface RevealRenderer {
  readonly kind: 1 | 2;
  readonly canvas: HTMLCanvasElement;
  dpr: number;
  setup(scene: RevealScene): void;
  render(f: RevealFrame, time: number): void;
  setDpr(dpr: number): void;
  destroy(): void;
}

export interface LensState { x: number; y: number; presence: number }

export interface LensRenderer {
  readonly kind: 1 | 2;
  readonly canvas: HTMLCanvasElement;
  dpr: number;
  setup(source: HTMLImageElement, w: number, h: number): void;
  render(s: LensState): void;
  setDpr(dpr: number): void;
  destroy(): void;
}
