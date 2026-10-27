import os
import shutil
import tempfile

from api_errors import ApiError

ALLOWED_EXTENSIONS = (".pdf", ".txt")


def read_upload(upload, max_bytes, missing_message, too_large_message):
    if upload is None or not upload.filename:
        raise ApiError("missing_input", missing_message, 400)

    upload.stream.seek(0, os.SEEK_END)
    size = upload.stream.tell()
    upload.stream.seek(0)

    if size > max_bytes:
        raise ApiError("file_too_large", too_large_message, 413)

    descriptor, temp_path = tempfile.mkstemp(prefix="dss-")
    try:
        with os.fdopen(descriptor, "wb") as temp_file:
            shutil.copyfileobj(upload.stream, temp_file)
        with open(temp_path, "rb") as temp_file:
            data = temp_file.read()
    finally:
        try:
            os.unlink(temp_path)
        except FileNotFoundError:
            pass

    return data


def read_document(upload, max_bytes):
    document_bytes = read_upload(
        upload,
        max_bytes,
        "A Document is required.",
        "The Document exceeds the size limit.",
    )

    filename = os.path.basename(upload.filename or "")
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ApiError(
            "unsupported_type",
            "Only PDF and TXT Documents are supported.",
            415,
        )

    if extension == ".pdf" and not document_bytes.startswith(b"%PDF-"):
        raise ApiError(
            "unsupported_type",
            "The uploaded PDF is not a valid PDF file.",
            415,
        )

    return document_bytes, filename
