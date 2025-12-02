"""
Global Application State
------------------------
Shared state across the application.
"""

from typing import Optional


class AppState:
    """Global application state container."""
    
    def __init__(self):
        # User state
        self.current_user: dict = {"email": None, "logged_in": False}
        
        # Scan state
        self.scan_results: list = []
        self.scan_status: dict = {
            "progress": 0,
            "message": "Ready",
            "done": False,
            "error": None
        }
        
        # Mark read state
        self.mark_read_status: dict = {
            "progress": 0,
            "message": "Ready",
            "done": False,
            "error": None,
            "marked_count": 0
        }
        
        # Delete state
        self.delete_scan_results: list = []
        self.delete_scan_status: dict = {
            "progress": 0,
            "message": "Ready",
            "done": False,
            "error": None
        }
        
        # Download emails state
        self.download_status: dict = {
            "progress": 0,
            "message": "Ready",
            "done": False,
            "error": None,
            "total_emails": 0,
            "fetched_count": 0,
            "csv_data": None
        }
        
        # Auth state
        self.pending_auth_url: dict = {"url": None}
        self.pending_auth_code: dict = {"code": None}
    
    def reset_scan(self):
        """Reset scan state."""
        self.scan_results = []
        self.scan_status = {
            "progress": 0,
            "message": "Ready",
            "done": False,
            "error": None
        }
    
    def reset_delete_scan(self):
        """Reset delete scan state."""
        self.delete_scan_results = []
        self.delete_scan_status = {
            "progress": 0,
            "message": "Ready",
            "done": False,
            "error": None
        }
    
    def reset_mark_read(self):
        """Reset mark read state."""
        self.mark_read_status = {
            "progress": 0,
            "message": "Ready",
            "done": False,
            "error": None,
            "marked_count": 0
        }
    
    def reset_download(self):
        """Reset download state."""
        self.download_status = {
            "progress": 0,
            "message": "Ready",
            "done": False,
            "error": None,
            "total_emails": 0,
            "fetched_count": 0,
            "csv_data": None
        }


# Global state instance
state = AppState()
