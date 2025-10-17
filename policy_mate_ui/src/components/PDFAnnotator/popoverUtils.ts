// components/PDFAnnotator/popoverUtils.ts
import type { SimpleAnnotation } from '@/components/PDFAnnotator/types';

export const POPOVER_W = 260;
export const POPOVER_MARGIN = 8;
export const PANEL_HEIGHT_GUESS = 220;

const choosePopoverSide = (
  ann: SimpleAnnotation,
  pageEl: HTMLDivElement | null,
  scale: number
) => {
  if (!pageEl) return 'right' as const;
  const containerW = pageEl.clientWidth;
  const rightEdge = (ann.x + ann.width) * scale;
  const roomRight = containerW - rightEdge;
  return roomRight >= POPOVER_W + POPOVER_MARGIN ? 'right' : 'left';
};

export const getPopoverPlacement = (
  ann: SimpleAnnotation,
  pageRef: React.RefObject<HTMLDivElement>,
  scale: number
) => {
  const pageEl = pageRef.current;
  const side = choosePopoverSide(ann, pageEl, scale);
  let translateY = 0;
  if (pageEl) {
    const containerH = pageEl.clientHeight;
    const anchorTop = ann.y * scale;
    const overflow = anchorTop + PANEL_HEIGHT_GUESS - containerH;
    if (overflow > 0) translateY = -overflow - 4;
  }
  return { side, translateY };
};
