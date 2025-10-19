from file_confirmation_handler import get_pdf_page_count


if __name__ == "__main__":
    pages = get_pdf_page_count("custom-docs/0199ae2a-eff6-773b-8a46-c05bc01735f7/b4d8b4d8-1031-705e-a4a8-849522fb20b1/6550cbb1-91eb-4cff-ae56-d8ca3e8927af/mitsubishi_corporation.pdf")
    print(f"Page count: {pages}")