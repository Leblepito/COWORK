"""
COWORK.ARMY v7.0 — Cargo API Routes
"""
from fastapi import APIRouter, UploadFile, File, Form
from ..database import get_db
from ..cargo.agent import process_cargo, delegate_task
from ..cargo.file_extractor import extract_text
from ..cargo.consult import consult_and_route

router = APIRouter(prefix="/api/cargo", tags=["cargo"])


@router.post("/upload")
async def upload_and_route(
    file: UploadFile | None = File(None),
    description: str = Form(""),
    content: str = Form(""),
):
    """Upload a file or text content, analyze it, and route to the right agent.
    Supports: .txt, .csv, .xlsx, .xls, .pdf, .docx, .json, .py, .ts, images, and any binary.
    """
    filename = ""
    file_content = content
    file_size = len(content.encode("utf-8"))
    file_type = ""

    if file:
        filename = file.filename or ""
        raw = await file.read()
        # Use smart extractor — handles all formats, never raises
        file_content = extract_text(raw, filename, file.content_type or "")
        file_size = len(raw)
        file_type = file.content_type or ""

    result = await process_cargo(
        filename=filename,
        content=file_content,
        description=description,
        file_size=file_size,
        file_type=file_type,
    )
    return result


@router.post("/delegate")
async def manual_delegate(
    title: str = Form(...),
    description: str = Form(""),
    target_department_id: str = Form(""),
    target_agent_id: str = Form(""),
):
    """Manually delegate a task — auto-routes if no target specified."""
    return await delegate_task(
        title=title,
        description=description,
        target_department_id=target_department_id or None,
        target_agent_id=target_agent_id or None,
    )


@router.post("/consult")
async def ceo_cargo_consult(
    file: UploadFile | None = File(None),
    title: str = Form(...),
    description: str = Form(""),
    content: str = Form(""),
):
    """CEO+Cargo istişaresi: görevi analiz et, formatı dönüştür ve doğru agent'a ilet."""
    filename = ""
    file_content = content
    file_size = len(content.encode("utf-8"))
    file_type = ""

    if file:
        filename = file.filename or ""
        raw = await file.read()
        file_content = extract_text(raw, filename, file.content_type or "")
        file_size = len(raw)
        file_type = file.content_type or ""

    return await consult_and_route(
        title=title,
        description=description,
        content=file_content,
        filename=filename,
        file_type=file_type,
        file_size=file_size,
    )


@router.get("/logs")
async def get_cargo_logs(limit: int = 50):
    db = get_db()
    return await db.get_cargo_logs(limit=limit)
