/**
 * Gmail Unsubscribe - Delete Emails Module
 */

window.GmailCleaner = window.GmailCleaner || {};

GmailCleaner.Delete = {
    async startScan() {
        if (GmailCleaner.deleteScanning) return;
        
        const authResponse = await fetch('/api/auth-status');
        const authStatus = await authResponse.json();
        
        if (!authStatus.logged_in) {
            GmailCleaner.Auth.signIn();
            return;
        }
        
        GmailCleaner.deleteScanning = true;
        
        const scanBtn = document.getElementById('deleteScanBtn');
        const progressCard = document.getElementById('deleteProgressCard');
        
        scanBtn.disabled = true;
        scanBtn.innerHTML = `
            <svg class="spinner" viewBox="0 0 24 24" width="18" height="18">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="60" stroke-linecap="round"/>
            </svg>
            Scanning...
        `;
        progressCard.classList.remove('hidden');
        
        const limit = document.getElementById('deleteScanLimit').value;
        const filters = GmailCleaner.Filters.get();
        
        try {
            const response = await fetch('/api/delete-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    limit: parseInt(limit),
                    filters: filters
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.detail || `Request failed with status ${response.status}`;
                throw new Error(errorMsg);
            }
            
            this.pollProgress();
        } catch (error) {
            alert('Error: ' + error.message);
            this.resetScan();
        }
    },

    async pollProgress() {
        try {
            const response = await fetch('/api/delete-scan-status');
            const status = await response.json();
            
            const progressBar = document.getElementById('deleteProgressBar');
            const progressText = document.getElementById('deleteProgressText');
            
            progressBar.style.width = status.progress + '%';
            progressText.textContent = status.message;
            
            if (status.done) {
                if (!status.error) {
                    const resultsResponse = await fetch('/api/delete-scan-results');
                    GmailCleaner.deleteResults = await resultsResponse.json();
                    this.displayResults();
                } else {
                    alert('Error: ' + status.error);
                }
                this.resetScan();
            } else {
                setTimeout(() => this.pollProgress(), 300);
            }
        } catch (error) {
            setTimeout(() => this.pollProgress(), 500);
        }
    },

    resetScan() {
        GmailCleaner.deleteScanning = false;
        const scanBtn = document.getElementById('deleteScanBtn');
        scanBtn.disabled = false;
        scanBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            Scan Senders
        `;
    },

    displayResults() {
        const resultsList = document.getElementById('deleteResultsList');
        const resultsSection = document.getElementById('deleteResultsSection');
        const noResults = document.getElementById('deleteNoResults');
        const badge = document.getElementById('deleteSendersBadge');
        
        resultsList.innerHTML = '';
        badge.textContent = GmailCleaner.deleteResults.length;
        
        if (GmailCleaner.deleteResults.length === 0) {
            resultsSection.classList.add('hidden');
            noResults.classList.remove('hidden');
            return;
        }
        
        resultsSection.classList.remove('hidden');
        noResults.classList.add('hidden');
        
        GmailCleaner.deleteResults.forEach((r, i) => {
            const item = document.createElement('div');
            item.className = 'result-item';
            
            // Format size if available
            const sizeText = r.total_size ? ` (${GmailCleaner.UI.formatSize(r.total_size)})` : '';
            
            item.innerHTML = `
                <label class="checkbox-wrapper result-checkbox">
                    <input type="checkbox" class="delete-cb" data-index="${i}" data-email="${GmailCleaner.UI.escapeHtml(r.email)}">
                    <span class="checkmark"></span>
                </label>
                <div class="result-content">
                    <div class="result-sender">${GmailCleaner.UI.escapeHtml(r.email)}</div>
                    <div class="result-subject">${GmailCleaner.UI.escapeHtml(r.subjects[0] || 'No subject')}</div>
                    <span class="result-count">${r.count} emails${sizeText}</span>
                </div>
                <div class="result-actions">
                    <button class="unsub-btn delete-btn" id="delete-${i}" onclick="GmailCleaner.Delete.deleteSenderEmails(${i})">
                        Delete ${r.count}
                    </button>
                </div>
            `;
            resultsList.appendChild(item);
        });
    },

    toggleSelectAll() {
        const selectAll = document.getElementById('deleteSelectAll');
        document.querySelectorAll('.delete-cb').forEach(cb => {
            cb.checked = selectAll.checked;
        });
    },

    async deleteSenderEmails(index) {
        const r = GmailCleaner.deleteResults[index];
        const btn = document.getElementById('delete-' + index);
        
        if (!confirm(`Delete ALL ${r.count} emails from ${r.email}?\n\nThis will move them to Trash.`)) {
            return;
        }
        
        btn.disabled = true;
        btn.textContent = 'Deleting...';
        
        try {
            const response = await fetch('/api/delete-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender: r.email })
            });
            const result = await response.json();
            
            if (result.success) {
                btn.textContent = '✓ Deleted!';
                btn.classList.add('success');
                
                // Show toast notification with size info
                const sizeStr = result.size_freed ? ` - freed ${GmailCleaner.UI.formatSize(result.size_freed)}` : '';
                GmailCleaner.UI.showSuccessToast(
                    `Successfully deleted ${result.deleted.toLocaleString()} emails from ${r.email}${sizeStr}`,
                    'Tip: Deleted emails stay in Trash for 30 days before permanent removal'
                );
                
                setTimeout(() => {
                    GmailCleaner.deleteResults = GmailCleaner.deleteResults.filter((_, i) => i !== index);
                    this.displayResults();
                }, 1000);
            } else {
                btn.textContent = 'Error';
                GmailCleaner.UI.showErrorToast('Error: ' + result.message);
                btn.disabled = false;
                btn.textContent = `Delete ${r.count}`;
            }
        } catch (error) {
            GmailCleaner.UI.showErrorToast('Error: ' + error.message);
            btn.disabled = false;
            btn.textContent = `Delete ${r.count}`;
        }
    },

    async deleteSelected() {
        const checkboxes = document.querySelectorAll('.delete-cb:checked');
        if (checkboxes.length === 0) {
            alert('Please select at least one sender to delete emails from.');
            return;
        }
        
        let totalEmails = 0;
        const senderEmails = [];
        checkboxes.forEach(cb => {
            const index = parseInt(cb.dataset.index);
            const r = GmailCleaner.deleteResults[index];
            totalEmails += r.count;
            senderEmails.push(r.email);
        });
        
        if (!confirm(`Delete ${totalEmails} emails from ${checkboxes.length} senders?\n\nThis will move them to Trash.`)) {
            return;
        }
        
        checkboxes.forEach(cb => {
            const index = parseInt(cb.dataset.index);
            const btn = document.getElementById('delete-' + index);
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Deleting...';
            }
        });
        
        try {
            const response = await fetch('/api/delete-emails-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senders: senderEmails })
            });
            const result = await response.json();
            
            if (result.success) {
                // Show toast notification with size info
                const sizeStr = result.size_freed ? ` - freed ${GmailCleaner.UI.formatSize(result.size_freed)}` : '';
                GmailCleaner.UI.showSuccessToast(
                    `Successfully deleted ${result.deleted.toLocaleString()} emails from ${checkboxes.length} senders${sizeStr}`,
                    'Tip: Deleted emails stay in Trash for 30 days before permanent removal'
                );
                
                checkboxes.forEach(cb => {
                    const index = parseInt(cb.dataset.index);
                    const btn = document.getElementById('delete-' + index);
                    if (btn) {
                        btn.textContent = '✓ Deleted!';
                        btn.classList.add('success');
                    }
                });
                
                setTimeout(async () => {
                    const resultsResponse = await fetch('/api/delete-scan-results');
                    GmailCleaner.deleteResults = await resultsResponse.json();
                    this.displayResults();
                    document.getElementById('deleteSelectAll').checked = false;
                }, 800);
            } else {
                GmailCleaner.UI.showErrorToast('Error: ' + result.message);
                checkboxes.forEach(cb => {
                    const index = parseInt(cb.dataset.index);
                    const r = GmailCleaner.deleteResults[index];
                    const btn = document.getElementById('delete-' + index);
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = `Delete ${r.count}`;
                    }
                });
            }
        } catch (error) {
            GmailCleaner.UI.showErrorToast('Error: ' + error.message);
            // Reset buttons after network error
            document.querySelectorAll('.delete-cb:checked').forEach(cb => {
                const index = parseInt(cb.dataset.index);
                const r = GmailCleaner.deleteResults[index];
                const btn = document.getElementById('delete-' + index);
                if (btn && r) {
                    btn.disabled = false;
                    btn.textContent = `Delete ${r.count}`;
                }
            });
        }
    },

    // Download emails functionality
    async downloadSelected() {
        const checkboxes = document.querySelectorAll('.delete-cb:checked');
        if (checkboxes.length === 0) {
            GmailCleaner.UI.showInfoToast('Please select at least one sender to download emails from.');
            return;
        }
        
        let totalEmails = 0;
        const senderEmails = [];
        checkboxes.forEach(cb => {
            const index = parseInt(cb.dataset.index);
            const r = GmailCleaner.deleteResults[index];
            totalEmails += r.count;
            senderEmails.push(r.email);
        });
        
        // Show download overlay
        this.showDownloadOverlay(checkboxes.length, totalEmails);
        
        try {
            // Start background download
            await fetch('/api/download-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senders: senderEmails })
            });
            
            // Poll for progress
            this.pollDownloadProgress();
        } catch (error) {
            this.hideDownloadOverlay();
            GmailCleaner.UI.showErrorToast('Error: ' + error.message);
        }
    },

    async pollDownloadProgress() {
        try {
            const response = await fetch('/api/download-status');
            const status = await response.json();
            
            this.updateDownloadOverlay(status);
            
            if (status.done) {
                if (!status.error) {
                    // Trigger CSV download
                    window.location.href = '/api/download-csv';
                    setTimeout(() => {
                        this.hideDownloadOverlay();
                        GmailCleaner.UI.showSuccessToast(
                            `Successfully exported ${status.fetched_count.toLocaleString()} emails to CSV file. Check your downloads folder.`,
                            'Tip: You can open the CSV in Excel or Google Sheets for easy viewing'
                        );
                    }, 500);
                } else {
                    this.hideDownloadOverlay();
                    GmailCleaner.UI.showErrorToast('Error: ' + status.error);
                }
            } else {
                setTimeout(() => this.pollDownloadProgress(), 300);
            }
        } catch (error) {
            setTimeout(() => this.pollDownloadProgress(), 500);
        }
    },

    showDownloadOverlay(senderCount, emailCount) {
        this.hideDownloadOverlay();
        
        const overlay = document.createElement('div');
        overlay.id = 'downloadOverlay';
        overlay.className = 'download-overlay';
        overlay.innerHTML = `
            <div class="download-overlay-content">
                <svg class="download-overlay-spinner spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="60" stroke-linecap="round"/>
                </svg>
                <h3>Downloading Email Data...</h3>
                <div class="download-progress-container">
                    <div class="download-progress-bar" id="downloadProgressBar"></div>
                </div>
                <p id="downloadProgressText">Starting download...</p>
                <p class="download-stats" id="downloadStats">0/${emailCount} emails from ${senderCount} senders</p>
                <p class="download-note">This may take a moment for large mailboxes</p>
            </div>
        `;
        overlay.dataset.totalEmails = emailCount;
        document.body.appendChild(overlay);
    },

    updateDownloadOverlay(status) {
        const overlay = document.getElementById('downloadOverlay');
        if (!overlay) return;
        
        const progressBar = document.getElementById('downloadProgressBar');
        const progressText = document.getElementById('downloadProgressText');
        const stats = document.getElementById('downloadStats');
        
        if (progressBar) {
            progressBar.style.width = status.progress + '%';
        }
        if (progressText) {
            progressText.textContent = status.message;
        }
        if (stats) {
            const totalEmails = overlay.dataset.totalEmails || status.total_emails;
            stats.textContent = `${status.fetched_count || 0}/${totalEmails} emails fetched`;
        }
    },

    hideDownloadOverlay() {
        const overlay = document.getElementById('downloadOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
};

// Global shortcuts
function startDeleteScan() { GmailCleaner.Delete.startScan(); }
function toggleDeleteSelectAll() { GmailCleaner.Delete.toggleSelectAll(); }
function deleteSelectedSenders() { GmailCleaner.Delete.deleteSelected(); }
function downloadSelectedEmails() { GmailCleaner.Delete.downloadSelected(); }
