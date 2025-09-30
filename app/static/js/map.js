// Disaster Relief Hub - Map JavaScript
// Handles map functionality and request visualization

class DisasterReliefMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.markerCluster = null;
        this.currentFilters = {};
        this.allRequests = [];
        this.filteredRequests = [];

        this.initializeMap();
        this.bindEvents();
        this.loadRequests();
    }

    initializeMap() {
        // Initialize Leaflet map
        this.map = L.map('map').setView([20.5937, 78.9629], 5); // Center of India

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            minZoom: 3
        }).addTo(this.map);

        // Initialize marker cluster group
        this.markerCluster = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 80,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });

        this.map.addLayer(this.markerCluster);

        // Check URL parameters for specific location
        this.checkURLParameters();
    }

    bindEvents() {
        // Filter controls
        document.getElementById('applyFilters').addEventListener('click', this.applyFilters.bind(this));
        document.getElementById('clearFilters').addEventListener('click', this.clearFilters.bind(this));

        // Location search
        document.getElementById('searchLocation').addEventListener('click', this.searchLocation.bind(this));
        document.getElementById('getCurrentLocationBtn').addEventListener('click', this.getCurrentLocation.bind(this));

        // Enter key for search
        document.getElementById('locationSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchLocation();
            }
        });

        // Map events
        this.map.on('click', this.onMapClick.bind(this));
        this.map.on('zoomend', this.onZoomChange.bind(this));
    }

    checkURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');
        const zoom = urlParams.get('zoom');

        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            const zoomLevel = zoom ? parseInt(zoom) : 13;

            if (!isNaN(latitude) && !isNaN(longitude)) {
                this.map.setView([latitude, longitude], zoomLevel);

                // Add a temporary marker for the specified location
                const marker = L.marker([latitude, longitude], {
                    icon: this.createCustomIcon('location', '#ff6b6b')
                }).addTo(this.map);

                marker.bindPopup(`
                    <div class="location-popup">
                        <h4>📍 Specified Location</h4>
                        <p><strong>Coordinates:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
                        <button onclick="window.disasterMap.removeLocationMarker()" class="btn-secondary">Remove</button>
                    </div>
                `).openPopup();

                this.locationMarker = marker;
            }
        }
    }

    removeLocationMarker() {
        if (this.locationMarker) {
            this.map.removeLayer(this.locationMarker);
            this.locationMarker = null;
        }
    }

    async loadRequests() {
        this.showLoadingOverlay(true);

        try {
            const response = await fetch('/api/requests?size=1000');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.allRequests = data.requests || [];
            this.filteredRequests = [...this.allRequests];

            this.updateMapMarkers();
            this.updateStatistics();
            this.updateMapBounds();

        } catch (error) {
            console.error('Error loading requests:', error);
            this.showMessage('Failed to load disaster relief requests. Please refresh the page.', 'error');
        } finally {
            this.showLoadingOverlay(false);
        }
    }

    updateMapMarkers() {
        // Clear existing markers
        this.markerCluster.clearLayers();
        this.markers = [];

        // Add markers for filtered requests
        this.filteredRequests.forEach(request => {
            const marker = this.createRequestMarker(request);
            this.markers.push(marker);
            this.markerCluster.addLayer(marker);
        });

        // Update visible requests count
        document.getElementById('visibleRequests').textContent = this.filteredRequests.length;
    }

    createRequestMarker(request) {
        const icon = this.createCustomIcon(request.request_type, this.getUrgencyColor(request.urgency_level));

        const marker = L.marker([request.latitude, request.longitude], { icon });

        // Create popup content
        const popupContent = this.createPopupContent(request);
        marker.bindPopup(popupContent, {
            maxWidth: 400,
            className: 'request-popup'
        });

        // Store request data with marker
        marker.requestData = request;

        return marker;
    }

    createCustomIcon(type, color) {
        const iconMap = {
            rescue: '🚑',
            medical: '🏥',
            food: '🍽️',
            water: '💧',
            shelter: '🏠',
            clothing: '👕',
            transportation: '🚗',
            other: '❓'
        };

        const iconHtml = `
            <div class="custom-marker" style="
                background-color: ${color};
                border: 3px solid white;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                color: white;
            ">
                ${iconMap[type] || '❓'}
            </div>
        `;

        return L.divIcon({
            html: iconHtml,
            className: 'custom-marker-container',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    }

    getUrgencyColor(urgency) {
        const colors = {
            critical: '#c0392b',
            high: '#ff6b6b',
            medium: '#f39c12',
            low: '#3498db'
        };
        return colors[urgency] || colors.medium;
    }

    createPopupContent(request) {
        const statusClass = request.status.replace('_', '-');
        const urgencyClass = request.urgency_level;

        return `
            <div class="request-popup-content">
                <div class="popup-header">
                    <h4>${request.title}</h4>
                    <div class="popup-tags">
                        <span class="request-tag ${request.request_type}">${request.request_type.toUpperCase()}</span>
                        <span class="urgency-tag ${urgencyClass}">${request.urgency_level.toUpperCase()}</span>
                        <span class="status-tag ${statusClass}">${request.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                </div>

                <div class="popup-content">
                    <p><strong>Description:</strong> ${request.description.substring(0, 100)}${request.description.length > 100 ? '...' : ''}</p>

                    <div class="popup-info">
                        <div class="info-item">
                            <i class="fas fa-user"></i>
                            <span>${request.contact_name}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-phone"></i>
                            <a href="tel:${request.contact_phone}">${request.contact_phone}</a>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${request.address.substring(0, 50)}${request.address.length > 50 ? '...' : ''}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <span>${request.people_affected} people affected</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <span>${this.formatDate(request.created_at)}</span>
                        </div>
                    </div>

                    ${request.assigned_to ? `
                        <div class="assigned-info">
                            <p><strong>Assigned to:</strong> ${request.assigned_to}</p>
                            <p><strong>Contact:</strong> ${request.assigned_contact}</p>
                        </div>
                    ` : ''}
                </div>

                <div class="popup-actions">
                    <button onclick="window.disasterMap.showRequestDetails(${request.id})" class="btn-primary">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                    ${request.status === 'pending' ? `
                        <button onclick="window.disasterMap.showAssignmentForm(${request.id})" class="btn-success">
                            <i class="fas fa-user-plus"></i> Assign
                        </button>
                    ` : ''}
                    <button onclick="window.disasterMap.getDirections(${request.latitude}, ${request.longitude})" class="btn-secondary">
                        <i class="fas fa-route"></i> Directions
                    </button>
                </div>
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            return 'Less than an hour ago';
        }
    }

    applyFilters() {
        const filters = {
            request_type: document.getElementById('typeFilter').value,
            urgency_level: document.getElementById('urgencyFilter').value,
            status: document.getElementById('statusFilter').value
        };

        this.currentFilters = filters;
        this.filteredRequests = this.allRequests.filter(request => {
            return (!filters.request_type || request.request_type === filters.request_type) &&
                   (!filters.urgency_level || request.urgency_level === filters.urgency_level) &&
                   (!filters.status || request.status === filters.status);
        });

        this.updateMapMarkers();
        this.updateStatistics();
        this.showMessage(`Filters applied. Showing ${this.filteredRequests.length} requests.`, 'info');
    }

    clearFilters() {
        document.getElementById('typeFilter').value = '';
        document.getElementById('urgencyFilter').value = '';
        document.getElementById('statusFilter').value = '';

        this.currentFilters = {};
        this.filteredRequests = [...this.allRequests];

        this.updateMapMarkers();
        this.updateStatistics();
        this.showMessage('Filters cleared. Showing all requests.', 'info');
    }

    updateStatistics() {
        const total = this.allRequests.length;
        const visible = this.filteredRequests.length;
        const urgent = this.filteredRequests.filter(req => 
            req.urgency_level === 'critical' || req.urgency_level === 'high'
        ).length;

        document.getElementById('totalRequests').textContent = total;
        document.getElementById('visibleRequests').textContent = visible;
        document.getElementById('urgentRequests').textContent = urgent;
    }

    updateMapBounds() {
        if (this.filteredRequests.length === 0) return;

        const group = new L.featureGroup(this.markers);
        this.map.fitBounds(group.getBounds().pad(0.1));
    }

    searchLocation() {
        const query = document.getElementById('locationSearch').value.trim();
        if (!query) {
            this.showMessage('Please enter a location to search', 'error');
            return;
        }

        // Simple location search using Nominatim
        this.performLocationSearch(query);
    }

    async performLocationSearch(query) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const results = await response.json();

            if (results.length === 0) {
                this.showMessage('Location not found. Please try a different search term.', 'error');
                return;
            }

            const result = results[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);

            this.map.setView([lat, lon], 13);

            // Add search result marker
            if (this.searchMarker) {
                this.map.removeLayer(this.searchMarker);
            }

            this.searchMarker = L.marker([lat, lon], {
                icon: this.createCustomIcon('location', '#3498db')
            }).addTo(this.map);

            this.searchMarker.bindPopup(`
                <div class="search-popup">
                    <h4>📍 ${result.display_name}</h4>
                    <button onclick="window.disasterMap.removeSearchMarker()" class="btn-secondary">Remove</button>
                </div>
            `).openPopup();

            this.showMessage(`Found: ${result.display_name}`, 'success');

        } catch (error) {
            console.error('Location search error:', error);
            this.showMessage('Error searching for location. Please try again.', 'error');
        }
    }

    removeSearchMarker() {
        if (this.searchMarker) {
            this.map.removeLayer(this.searchMarker);
            this.searchMarker = null;
        }
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showMessage('Geolocation is not supported by this browser', 'error');
            return;
        }

        const button = document.getElementById('getCurrentLocationBtn');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
        button.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                this.map.setView([lat, lng], 15);

                // Add current location marker
                if (this.currentLocationMarker) {
                    this.map.removeLayer(this.currentLocationMarker);
                }

                this.currentLocationMarker = L.marker([lat, lng], {
                    icon: this.createCustomIcon('location', '#27ae60')
                }).addTo(this.map);

                this.currentLocationMarker.bindPopup(`
                    <div class="location-popup">
                        <h4>📍 Your Current Location</h4>
                        <p><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                        <button onclick="window.disasterMap.removeCurrentLocationMarker()" class="btn-secondary">Remove</button>
                    </div>
                `).openPopup();

                button.innerHTML = '<i class="fas fa-check"></i> Location Found!';
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);

                this.showMessage('Current location found!', 'success');
            },
            (error) => {
                button.innerHTML = originalText;
                button.disabled = false;
                this.showMessage('Unable to get current location', 'error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }

    removeCurrentLocationMarker() {
        if (this.currentLocationMarker) {
            this.map.removeLayer(this.currentLocationMarker);
            this.currentLocationMarker = null;
        }
    }

    onMapClick(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);

        // Show coordinates in a popup
        L.popup()
            .setLatLng(e.latlng)
            .setContent(`
                <div class="click-popup">
                    <h4>📍 Map Coordinates</h4>
                    <p><strong>Latitude:</strong> ${lat}</p>
                    <p><strong>Longitude:</strong> ${lng}</p>
                    <button onclick="window.open('/?' + new URLSearchParams({lat: '${lat}', lng: '${lng}'}), '_blank')" class="btn-primary">
                        Submit Request Here
                    </button>
                </div>
            `)
            .openOn(this.map);
    }

    onZoomChange() {
        // Adjust marker cluster radius based on zoom level
        const zoom = this.map.getZoom();
        const radius = zoom > 10 ? 40 : 80;

        this.markerCluster.options.maxClusterRadius = radius;
        this.markerCluster.refreshClusters();
    }

    showRequestDetails(requestId) {
        const request = this.allRequests.find(r => r.id === requestId);
        if (!request) return;

        // Create detailed modal content
        const modalContent = `
            <h3><i class="fas fa-info-circle"></i> Request Details</h3>
            <div class="request-detail-content">
                <div class="detail-header">
                    <h4>${request.title}</h4>
                    <div class="detail-tags">
                        <span class="request-tag ${request.request_type}">${request.request_type.toUpperCase()}</span>
                        <span class="urgency-tag ${request.urgency_level}">${request.urgency_level.toUpperCase()}</span>
                        <span class="status-tag ${request.status.replace('_', '-')}">${request.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h5>Description</h5>
                    <p>${request.description}</p>
                </div>

                <div class="detail-section">
                    <h5>Contact Information</h5>
                    <p><strong>Name:</strong> ${request.contact_name}</p>
                    <p><strong>Phone:</strong> <a href="tel:${request.contact_phone}">${request.contact_phone}</a></p>
                    ${request.contact_email ? `<p><strong>Email:</strong> <a href="mailto:${request.contact_email}">${request.contact_email}</a></p>` : ''}
                </div>

                <div class="detail-section">
                    <h5>Location</h5>
                    <p>${request.address}</p>
                    ${request.landmark ? `<p><strong>Landmark:</strong> ${request.landmark}</p>` : ''}
                    <p><strong>Coordinates:</strong> ${request.latitude}, ${request.longitude}</p>
                </div>

                <div class="detail-section">
                    <h5>Additional Information</h5>
                    <p><strong>People Affected:</strong> ${request.people_affected}</p>
                    ${request.estimated_cost ? `<p><strong>Estimated Cost:</strong> ₹${request.estimated_cost}</p>` : ''}
                    <p><strong>Created:</strong> ${new Date(request.created_at).toLocaleString()}</p>
                    <p><strong>Last Updated:</strong> ${new Date(request.updated_at).toLocaleString()}</p>
                </div>

                ${request.additional_notes ? `
                    <div class="detail-section">
                        <h5>Additional Notes</h5>
                        <p>${request.additional_notes}</p>
                    </div>
                ` : ''}

                ${request.assigned_to ? `
                    <div class="detail-section assignment-info">
                        <h5>Assignment Information</h5>
                        <p><strong>Assigned to:</strong> ${request.assigned_to}</p>
                        <p><strong>Contact:</strong> ${request.assigned_contact}</p>
                    </div>
                ` : ''}

                <div class="detail-actions">
                    <button onclick="window.disasterMap.getDirections(${request.latitude}, ${request.longitude})" class="btn-primary">
                        <i class="fas fa-route"></i> Get Directions
                    </button>
                    ${request.status === 'pending' ? `
                        <button onclick="window.disasterMap.showAssignmentForm(${request.id})" class="btn-success">
                            <i class="fas fa-user-plus"></i> Assign to Volunteer
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.getElementById('requestDetails').innerHTML = modalContent;
        this.showModal('requestModal');
    }

    showAssignmentForm(requestId) {
        // This would typically integrate with the dashboard functionality
        // For now, redirect to dashboard with the request ID
        window.open(`/dashboard?assign=${requestId}`, '_blank');
    }

    getDirections(lat, lng) {
        // Open directions in Google Maps
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    }

    showLoadingOverlay(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showMessage(message, type = 'info') {
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: inherit; cursor: pointer; font-size: 1.2rem;">
                    ×
                </button>
            </div>
        `;

        // Add to message container
        let container = document.getElementById('messageContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'messageContainer';
            container.className = 'message-container';
            document.body.appendChild(container);
        }

        container.appendChild(messageElement);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentElement) {
                messageElement.remove();
            }
        }, 5000);
    }
}

// Global modal close function
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.disasterMap = new DisasterReliefMap();
});