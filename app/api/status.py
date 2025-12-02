"""
Status API Routes
-----------------
GET endpoints for checking status of various operations.
"""

from fastapi import APIRouter

from app.services import (
    get_scan_status,
    get_scan_results,
    check_login_status,
    get_web_auth_status,
    get_unread_count,
    get_mark_read_status,
    get_delete_scan_status,
    get_delete_scan_results,
    get_download_status,
    get_download_csv,
)

router = APIRouter(prefix="/api", tags=["Status"])


@router.get("/status")
async def api_status():
    """Get email scan status."""
    return get_scan_status()


@router.get("/results")
async def api_results():
    """Get email scan results."""
    return get_scan_results()


@router.get("/auth-status")
async def api_auth_status():
    """Get authentication status."""
    return check_login_status()


@router.get("/web-auth-status")
async def api_web_auth_status():
    """Get web auth status for Docker/headless mode."""
    return get_web_auth_status()


@router.get("/unread-count")
async def api_unread_count():
    """Get unread email count."""
    return get_unread_count()


@router.get("/mark-read-status")
async def api_mark_read_status():
    """Get mark-as-read operation status."""
    return get_mark_read_status()


@router.get("/delete-scan-status")
async def api_delete_scan_status():
    """Get delete scan status."""
    return get_delete_scan_status()


@router.get("/delete-scan-results")
async def api_delete_scan_results():
    """Get delete scan results (senders grouped by count)."""
    return get_delete_scan_results()


@router.get("/download-status")
async def api_download_status():
    """Get download operation status."""
    return get_download_status()


@router.get("/download-csv")
async def api_download_csv():
    """Get the generated CSV file."""
    from fastapi.responses import Response
    
    csv_data = get_download_csv()
    if not csv_data:
        return {"error": "No CSV data available"}
    
    from datetime import datetime
    filename = f"emails-backup-{datetime.now().strftime('%Y-%m-%d-%H%M%S')}.csv"
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
