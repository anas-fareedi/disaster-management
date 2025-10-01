// Handles volunteer/NGO dashboard functionality
// Directions
class DisasterReliefDashboard {
    constructor() {
        this.requests = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.currentFilters = {};
        this.sortBy = 'created_at';
        this.sortOrder = 'desc';
 
        this.initializeDashboard();
        this.bindEvents();
        this.loadRequests();
    }

    initializeDashboard() {
        console.log('🚀 Dashboard initialized');
    }

    bindEvents() {
        // Filter controls
        const applyBtn = document.getElementById('applyDashboardFilters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyFilters());
        }

        const refreshBtn = document.getElementById('refreshData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Pagination buttons
        const prevBtn = document.getElementById('prevPage');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousPage());
        }

        const nextBtn = document.getElementById('nextPage');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPage());
        }
    }

    async loadRequests() {
        try {
            console.log('📋 Loading requests...');
            
            const params = new URLSearchParams({
                page: this.currentPage,
                size: this.pageSize,
                sort_by: this.sortBy,
                sort_order: this.sortOrder,
                ...this.currentFilters
            });

            const response = await fetch(`/api/requests?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.requests = data.requests || [];
            this.totalPages = data.total_pages || 1;

            this.renderRequestsList();
            this.updatePaginationInfo(data);
            this.calculateStatistics();

            console.log(`✅ Loaded ${this.requests.length} requests`);

        } catch (error) {
            console.error('❌ Error loading requests:', error);
            this.showMessage('Failed to load requests. Please try again.', 'error');
            this.renderErrorState();
        }
    }

    renderRequestsList() {
        const container = document.getElementById('requestsList');
        if (!container) {
            console.warn('⚠️ requestsList container not found');
            return;
        }

        if (this.requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 2rem; color: #7f8c8d;">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>No requests found</h3>
                    <p>There are no disaster relief requests at the moment.</p>
                </div>
            `;
            return;
        }
        const requestsHTML = this.requests.map(request => this.createRequestCard(request)).join('');
        container.innerHTML = requestsHTML;
    }

    createRequestCard(request) {
        const timeAgo = this.formatTimeAgo(request.created_at);
        
        return `
            <div class="request-card" style="
                background: white; 
                border: 1px solid #ddd; 
                border-radius: 8px; 
                padding: 1.5rem; 
                margin-bottom: 1rem; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: transform 0.2s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                
                <div class="request-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h4 style="margin: 0; color: #2c3e50; font-size: 1.1rem;">${request.title}</h4>
                    <div style="display: flex; gap: 0.5rem;">
                        <span style="
                            background: ${this.getTypeColor(request.request_type)}; 
                            color: white; 
                            padding: 0.25rem 0.5rem; 
                            border-radius: 12px; 
                            font-size: 0.8rem;
                            font-weight: 600;
                            text-transform: uppercase;
                        ">${request.request_type}</span>
                        <span style="
                            background: ${this.getUrgencyColor(request.urgency_level)}; 
                            color: white; 
                            padding: 0.25rem 0.5rem; 
                            border-radius: 12px; 
                            font-size: 0.8rem;
                            font-weight: 600;
                            text-transform: uppercase;
                        ">${request.urgency_level}</span>
                        <span style="
                            background: ${this.getStatusColor(request.status)}; 
                            color: white; 
                            padding: 0.25rem 0.5rem; 
                            border-radius: 12px; 
                            font-size: 0.8rem;
                            font-weight: 600;
                            text-transform: uppercase;
                        ">${request.status.replace('_', ' ')}</span>
                    </div>
                </div>

                <div style="color: #7f8c8d; margin-bottom: 1rem; line-height: 1.5;">
                    ${request.description.length > 150 ? request.description.substring(0, 150) + '...' : request.description}
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.9rem; color: #34495e; margin-bottom: 1rem;">
                    <div><i class="fas fa-user"></i> <strong>Contact:</strong> ${request.contact_name}</div>
                    <div><i class="fas fa-phone"></i> <strong>Phone:</strong> <a href="tel:${request.contact_phone}" style="color: #3498db;">${request.contact_phone}</a></div>
                    <div><i class="fas fa-map-marker-alt"></i> <strong>Location:</strong> ${request.address.substring(0, 40)}${request.address.length > 40 ? '...' : ''}</div>
                    <div><i class="fas fa-users"></i> <strong>People Affected:</strong> ${request.people_affected}</div>
                    <div><i class="fas fa-clock"></i> <strong>Created:</strong> ${timeAgo}</div>
                    ${request.estimated_cost ? `<div><i class="fas fa-rupee-sign"></i> <strong>Est. Cost:</strong> ₹${request.estimated_cost.toLocaleString()}</div>` : '<div></div>'}
                </div>

                ${request.assigned_to ? `
                    <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.9rem;">
                        <i class="fas fa-user-check" style="color: #155724;"></i> 
                        <strong>Assigned to:</strong> ${request.assigned_to} (${request.assigned_contact})
                    </div>
                ` : ''}

                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button onclick="window.dashboard.viewRequestDetails(${request.id})" style="
                        background: #3498db; 
                        color: white; 
                        border: none; 
                        padding: 0.5rem 1rem; 
                        border-radius: 4px; 
                        cursor: pointer;
                        font-size: 0.9rem;
                    ">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    
                    ${request.status.toLowerCase() === 'pending' ? `
                        <button onclick="window.dashboard.assignRequest(${request.id})" style="   
                            background: #27ae60; 
                            color: white; 
                            border: none; 
                            padding: 0.5rem 1rem; 
                            border-radius: 4px; 
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">
                            <i class="fas fa-user-plus"></i> Assign
                        </button>
                    ` : ''}
                    
                    ${request.status.toLowerCase() === 'in_progress' ? `
                        <button onclick="window.dashboard.completeRequest(${request.id})" style="
                            background: #f39c12; 
                            color: white; 
                            border: none; 
                            padding: 0.5rem 1rem; 
                            border-radius: 4px; 
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">
                            <i class="fas fa-check"></i> Mark Complete
                        </button>
                    ` : ''}
                    
                    <button onclick="window.dashboard.getDirections(${request.latitude}, ${request.longitude})" style="
                        background: #e74c3c; 
                        color: white; 
                        border: none; 
                        padding: 0.5rem 1rem; 
                        border-radius: 4px; 
                        cursor: pointer;
                        font-size: 0.9rem;
                    ">
                        <i class="fas fa-route"></i> Directions
                    </button>
                </div>
            </div>
        `;
    }

    getTypeColor(type) {
        const colors = {
            'RESCUE': '#e74c3c',
            'MEDICAL': '#c0392b', 
            'FOOD': '#27ae60',
            'WATER': '#3498db',
            'SHELTER': '#9b59b6',
            'CLOTHING': '#f39c12',
            'TRANSPORTATION': '#34495e',
            'OTHER': '#95a5a6'
        };
        return colors[type] || '#7f8c8d';
    }

    getUrgencyColor(urgency) {
        const colors = {
            'LOW': '#27ae60',
            'MEDIUM': '#f39c12',
            'HIGH': '#e67e22', 
            'CRITICAL': '#c0392b'
        };
        return colors[urgency] || '#7f8c8d';
    }

    getStatusColor(status) {
        const colors = {
            'pending': '#f39c12',
            'in_progress': '#3498db',
            'completed': '#27ae60'
        };
        return colors[status] || '#7f8c8d';
    }

    calculateStatistics() {
        const pending = this.requests.filter(r => r.status === 'pending').length;
        const urgent = this.requests.filter(r => r.urgency_level === 'CRITICAL' || r.urgency_level === 'HIGH').length;
        const inProgress = this.requests.filter(r => r.status === 'in_progress').length;
        const completed = this.requests.filter(r => r.status === 'completed').length;

        this.updateStatDisplay('pendingCount', pending);
        this.updateStatDisplay('urgentCount', urgent);
        this.updateStatDisplay('progressCount', inProgress);
        this.updateStatDisplay('completedCount', completed);
    }

    updateStatDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    updatePaginationInfo(data) {
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${this.requests.length} of ${data.total || 0} requests`;
        }

        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        }

        // Update pagination buttons
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
    }

    applyFilters() {
        const filters = {};
        
        const typeFilter = document.getElementById('dashboardTypeFilter');
        if (typeFilter && typeFilter.value) {
            filters.request_type = typeFilter.value;
        }

        const urgencyFilter = document.getElementById('dashboardUrgencyFilter');
        if (urgencyFilter && urgencyFilter.value) {
            filters.urgency_level = urgencyFilter.value;
        }

        const statusFilter = document.getElementById('dashboardStatusFilter');
        if (statusFilter && statusFilter.value) {
            filters.status = statusFilter.value;
        }

        this.currentFilters = filters;
        this.currentPage = 1;
        this.loadRequests();
        
        this.showMessage('Filters applied', 'info');
    }

    clearFilters() {
        const typeFilter = document.getElementById('dashboardTypeFilter');
        const urgencyFilter = document.getElementById('dashboardUrgencyFilter');
        const statusFilter = document.getElementById('dashboardStatusFilter');

        if (typeFilter) typeFilter.value = '';
        if (urgencyFilter) urgencyFilter.value = '';
        if (statusFilter) statusFilter.value = '';

        this.currentFilters = {};
        this.currentPage = 1;
        this.loadRequests();
        
        this.showMessage('Filters cleared', 'info');
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadRequests();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadRequests();
        }
    }

    refreshData() {
        this.showMessage('Refreshing data...', 'info');
        this.loadRequests();
    }

    viewRequestDetails(requestId) {
        const request = this.requests.find(r => r.id === requestId);
        if (!request) return;

        const details = `

REQUEST DETAILS
===============

Title: ${request.title}
Type: ${request.request_type}
Urgency: ${request.urgency_level}
Status: ${request.status}

Description: ${request.description}

Contact Information:
- Name: ${request.contact_name}
- Phone: ${request.contact_phone}
${request.contact_email ? `- Email: ${request.contact_email}` : ''}

Location: ${request.address}
${request.landmark ? `Landmark: ${request.landmark}` : ''}
Coordinates: ${request.latitude}, ${request.longitude}

People Affected: ${request.people_affected}
${request.estimated_cost ? `Estimated Cost: ₹${request.estimated_cost.toLocaleString()}` : ''}

Created: ${new Date(request.created_at).toLocaleString()}
${request.additional_notes ? `\nNotes: ${request.additional_notes}` : ''}
${request.assigned_to ? `\nAssigned to: ${request.assigned_to} (${request.assigned_contact})` : ''}
        `;

        alert(details);
    }

    async assignRequest(requestId) {
        const volunteerName = prompt('Enter volunteer/NGO name:');
        if (!volunteerName) return;

        const volunteerContact = prompt('Enter volunteer contact number:');
        if (!volunteerContact) return;

        try {
            const response = await fetch(`/api/requests/${requestId}/assign?assignee_name=${encodeURIComponent(volunteerName)}&assignee_contact=${encodeURIComponent(volunteerContact)}`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Assignment failed');
            }

            this.showMessage(`Request assigned to ${volunteerName}`, 'success');
            this.loadRequests(); 

        } catch (error) {
            console.error('Assignment error:', error);
            this.showMessage('Failed to assign request', 'error');
        }
    }

    async completeRequest(requestId) {
        if (!confirm('Mark this request as completed?')) return;

        try {
            const response = await fetch(`/api/requests/${requestId}/complete`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to complete request');
            }

            this.showMessage('Request marked as completed', 'success');
            this.loadRequests(); 
 
        } catch (error) {
            console.error('Completion error:', error);
            this.showMessage('Failed to complete request', 'error');
        }
    }

    getDirections(lat, lng) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    }

    renderErrorState() {
        const container = document.getElementById('requestsList');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>Error Loading Requests</h3>
                <p>There was an error loading the disaster relief requests.</p>
                <button onclick="window.dashboard.loadRequests()" style="
                    background: #e74c3c; 
                    color: white; 
                    border: none; 
                    padding: 0.75rem 1.5rem; 
                    border-radius: 4px; 
                    cursor: pointer;
                    margin-top: 1rem;
                ">Try Again</button>
            </div>
        `;
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes > 0 ? `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago` : 'Just now';
        }
    }

    showMessage(message, type = 'info') {
        const existingMessages = document.querySelectorAll('.dashboard-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'dashboard-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        `;

        messageDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none; 
                    border: none; 
                    color: white; 
                    cursor: pointer; 
                    font-size: 1.2rem;
                    margin-left: 1rem;
                ">×</button>
            </div>
        `;
        document.body.appendChild(messageDiv);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 4000);
    }
}
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Disaster Relief Dashboard');
    window.dashboard = new DisasterReliefDashboard();
}); 
window.DisasterReliefDashboard = DisasterReliefDashboard;