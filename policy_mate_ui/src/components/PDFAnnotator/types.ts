// components/PDFAnnotator/types.ts
export type AnnotationAction = 'comment' | 'bookmark';
export type BookmarkType = 'review-later' | 'verify' | 'important' | 'question';
export type HighlightStyle =
  | 'classic'
  | 'gradient'
  | 'neon'
  | 'glass'
  | 'academic';

export interface AnnotationComment {
  id: string;
  text: string;
  timestamp: number;
}

export interface SimpleAnnotation {
  session_id: string;
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
  action?: AnnotationAction;
  bookmarkType?: BookmarkType;
  bookmarkNote?: string;
  resolved?: boolean;
  comment_session_id?: string;
  highlightedText?: string;
}

export interface Comment {
  id: string;
  text: string;
  timestamp: string;
}

export interface DragRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnnotationOverlayProps {
  annotations: SimpleAnnotation[];
  currentPage: number;
  scale: number;
  isLoading: boolean;

  // selection/open states
  openCreationForId?: string;
  openCommentForId?: string;
  openBookmarkForId?: string;
  expandedChipForId?: string;

  // setters
  setOpenCreationForId: (id?: string) => void;
  setOpenCommentForId: (id?: string) => void;
  setOpenBookmarkForId: (id?: string) => void;
  setExpandedChipForId: (id?: string) => void;

  // data ops
  addAnnotation: (a: NewAnnotationInput) => Promise<string>;
  updateAnnotation: (id: string, patch: Partial<SimpleAnnotation>) => void;
  removeAnnotation: (id: string) => void;

  // drawing
  selectedColor: string;
  strokeWidth: number;
  highlightStyle: HighlightStyle;

  // refs
  pageRef: React.RefObject<HTMLDivElement>;
}

export interface CommentPannelProps {
  ann: SimpleAnnotation;
  onClose: () => void;
  updateAnnotation: (
    id: string,
    patch: Partial<SimpleAnnotation>
  ) => Promise<void>;
}

export interface BookmarkTypeDef {
  key: BookmarkType | string;
  icon: string;
  label: string;
  description: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  selectedClasses: string; // Tailwind classes when selected (avoid dynamic constructions)
}

export interface BookmarkPopoverProps {
  ann: SimpleAnnotation;
  onClose: () => void;
  updateAnnotation: (
    id: string,
    patch: Partial<SimpleAnnotation>
  ) => Promise<void>;
  hasCommentPanelOpen?: boolean;
  // Optional enhanced hooks
  onBookmarkTypeChange?: (id: string, type: BookmarkType | string) => void;
  onNoteCommit?: (id: string, note: string) => void;
}

export type Role = 'user' | 'assistant' | 'system';

export interface TranscriptResponse {
  status: 'success' | 'error';
  session_id?: string;
  messages?: Array<{
    id: string;
    text: string;
    role?: 'user' | 'assistant' | 'system';
    timestamp: string;
  }>;
  total?: number;
  limit?: number;
  offset?: number;
}

export interface ChatResponse {
  status: 'success' | 'error';
  session_id?: string;
  assistant_reply?: string;
  messages: Array<{
    id: string;
    text: string;
    role?: Role;
    timestamp: string;
  }>;
}

export interface AnnotationOutDTO {
  id: string;
  session_id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: string; // ISO
  bookmark_type?: BookmarkType | null;
  bookmark_note?: string | null;
  resolved: boolean;
  comment_session_id?: string | null;
  highlighted_text?: string | null;
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface AddAnnotationResponse {
  status: 'success' | 'error';
  annotation?: AnnotationOutDTO;
  description?: string;
}

export type NewAnnotationInput = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  resolved: boolean;
  highlightedText?: string;
  bookmarkType?: BookmarkType | null;
  bookmarkNote?: string | null;
};
