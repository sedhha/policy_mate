from pathlib import Path
from typing import Literal, Any
import fitz
from uuid6 import uuid7
from pydantic import BaseModel


class SimpleAnnotation(BaseModel):
    file_id: str
    analysis_id: str
    annotation_id: str
    resolved: bool
    page_number: int
    x: int
    y: int
    height: int
    width: int
    review_comments: str
    bookmark_type: Literal["verify", "review", "info", "action_required"] | None = None
    conversation_id: str | None = None

    def model_dump(self, **kwargs: Any) -> dict[str, Any]:
        """Override model_dump to exclude None values by default."""
        kwargs.setdefault("exclude_none", True)
        return super().model_dump(**kwargs)


class PDFAnnotationGenerator:
    """Generates SimpleAnnotation objects for PDF files based on text search."""

    def __init__(self, scale: float = 1.0) -> None:
        """
        Initialize the PDF annotation generator.

        Args:
            scale: Scale factor for coordinates (default: 1.0)
        """
        self.scale = scale

    def generate_annotations(
        self, pdf_path: str | Path, text_list: list[str]
    ) -> list[SimpleAnnotation]:
        """
        Generate SimpleAnnotation objects for the given text in the PDF.

        Args:
            pdf_path: Path to the PDF file
            text_list: List of text strings to find and annotate

        Returns:
            List of SimpleAnnotation objects for found text

        Raises:
            FileNotFoundError: If the PDF file doesn't exist
            ValueError: If the PDF file is invalid
        """
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        annotations: list[SimpleAnnotation] = []

        try:
            # Open the PDF document
            doc = fitz.open(pdf_path)

            # Track found text to ensure we only pick the first occurrence
            found_texts: set[str] = set()

            # Iterate through each page
            for page_num in range(len(doc)):
                page = doc[page_num]

                # Search for each text string
                for text in text_list:
                    # Skip if we've already found this text
                    if text in found_texts:
                        continue

                    # Search for the text on this page
                    text_instances = page.search_for(text)  # type: ignore

                    if text_instances:
                        # Take the first occurrence
                        rect = text_instances[0]  # type: ignore
                        found_texts.add(text)

                        # Create annotation with scaled coordinates
                        annotation = self._create_annotation(
                            page_num=page_num + 1,  # Pages are 1-indexed for users
                            rect=rect,  # type: ignore
                            highlighted_text=text,
                        )
                        annotations.append(annotation)

            doc.close()

        except Exception as e:
            raise ValueError(f"Error processing PDF: {e}") from e

        return annotations

    def _create_annotation(
        self, page_num: int, rect: fitz.Rect, highlighted_text: str
    ) -> SimpleAnnotation:
        """
        Create a SimpleAnnotation object from coordinates and text.

        Args:
            page_num: Page number (1-indexed)
            rect: PyMuPDF rectangle containing the text
            highlighted_text: The text that was found

        Returns:
            SimpleAnnotation object
        """
        HORIZONTAL_OFFSET = 4
        VERTICAL_OFFSET = 4

        return SimpleAnnotation(
            file_id="",
            analysis_id="",
            annotation_id=str(uuid7()),
            resolved=False,
            page_number=page_num,
            x=floor(rect.x0 * self.scale) - HORIZONTAL_OFFSET,
            y=floor(rect.y0 * self.scale) - VERTICAL_OFFSET,
            width=floor((rect.x1 - rect.x0) * self.scale) + (HORIZONTAL_OFFSET * 4),
            height=floor((rect.y1 - rect.y0) * self.scale) + (VERTICAL_OFFSET * 2),
            bookmarkType="verify",
            review_comments="Marked by AI",
        )


def generate_pdf_annotations(
    pdf_path: str | Path, text_list: list[str], scale: float = 1.0
) -> list[SimpleAnnotation]:
    """
    Convenience function to generate PDF annotations.

    Args:
        pdf_path: Path to the PDF file
        text_list: List of text strings to find and annotate
        scale: Scale factor for coordinates (default: 1.0)

    Returns:
        List of SimpleAnnotation objects for found text

    Example:
        >>> annotations = generate_pdf_annotations(
        ...     "document.pdf",
        ...     ["important clause", "review section"],
        ...     scale=1.5
        ... )
    """
    generator = PDFAnnotationGenerator(scale=scale)
    return generator.generate_annotations(pdf_path, text_list)