// Handles form submissions and main page interactions

class DisasterReliefApp {
    constructor() {
        this.initializeApp();
        this.bindEvents();
        this.currentLocation = null;
    }

    initializeApp() {
        console.log(' Disaster Relief Hub initialized');

        this.initializeCharacterCounters();

        this.initializeFormValidation();

        this.loadSavedFormData();
    }

    bindEvents() {
        
        const form = document.getElementById('requestForm');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmission.bind(this));
        }
        
        const getCurrentLocationBtn = document.getElementById('getCurrentLocation');
        if (getCurrentLocationBtn) {
            getCurrentLocationBtn.addEventListener('click', this.getCurrentLocation.bind(this));
        }

        const showOnMapBtn = document.getElementById('showOnMap');
        if (showOnMapBtn) {
            showOnMapBtn.addEventListener('click', this.showLocationOnMap.bind(this));
        }

        const form_reset = document.querySelector('button[type="reset"]');
        if (form_reset) {
            form_reset.addEventListener('click', this.handleFormReset.bind(this));
        }

        this.bindAutoSaveEvents();
    }

    initializeCharacterCounters() {
        const textareas = document.querySelectorAll('textarea[maxlength]');
        textareas.forEach(textarea => {
            const maxLength = textarea.getAttribute('maxlength');
            const counter = textarea.parentElement.querySelector('.char-count');

            if (counter) {
                const updateCounter = () => {
                    const currentLength = textarea.value.length;
                    counter.textContent = `${currentLength} / ${maxLength} characters`;

                    if (currentLength > maxLength * 0.9) {
                        counter.style.color = 'var(--danger-color)';
                    } else if (currentLength > maxLength * 0.7) {
                        counter.style.color = 'var(--warning-color)';
                    } else {
                        counter.style.color = 'var(--gray-color)';
                    }
                };

                textarea.addEventListener('input', updateCounter);
                updateCounter(); 
            }
        });
    }

    initializeFormValidation() {
        const form = document.getElementById('requestForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', this.clearFieldError.bind(this));
        });

        const phoneInput = document.getElementById('contact_phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', this.formatPhoneNumber.bind(this));
        }

        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');

        if (latInput && lngInput) {
            latInput.addEventListener('input', this.validateCoordinates.bind(this));
            lngInput.addEventListener('input', this.validateCoordinates.bind(this));
        }
    }

    validateField(event) {
        const field = event.target;
        const value = field.value.trim();

        this.clearFieldError(event);

        // Validation rules
        switch (field.name) {
            case 'title':
                if (value.length < 5) {
                    this.showFieldError(field, 'Title must be at least 5 characters long');
                }
                break;

            case 'description':
                if (value.length < 10) {
                    this.showFieldError(field, 'Description must be at least 10 characters long');
                }
                break;

            case 'contact_phone':
                if (!this.isValidPhoneNumber(value)) {
                    this.showFieldError(field, 'Please enter a valid phone number');
                }
                break;

            case 'contact_email':
                if (value && !this.isValidEmail(value)) {
                    this.showFieldError(field, 'Please enter a valid email address');
                }
                break;

            case 'latitude':
                if (!this.isValidLatitude(parseFloat(value))) {
                    this.showFieldError(field, 'Latitude must be between -90 and 90');
                }
                break;

            case 'longitude':
                if (!this.isValidLongitude(parseFloat(value))) {
                    this.showFieldError(field, 'Longitude must be between -180 and 180');
                }
                break;
        }
    }

    showFieldError(field, message) {
        field.style.borderColor = 'var(--danger-color)';

        // Remove existing error message
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.color = 'var(--danger-color)';
        errorElement.style.fontSize = '0.9rem';
        errorElement.style.marginTop = '0.25rem';
        errorElement.textContent = message;
        field.parentElement.appendChild(errorElement);
    }

    clearFieldError(event) {
        const field = event.target;
        field.style.borderColor = '#ddd';

        const errorElement = field.parentElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    formatPhoneNumber(event) {
        const input = event.target;
        let value = input.value.replace(/[^0-9+()-\s]/g, '');

        if (value.match(/^[0-9]{10}$/)) {
            value = '+91-' + value;
        }
        input.value = value;
    }

    validateCoordinates() {
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');

        if (latInput && lngInput) {
            const lat = parseFloat(latInput.value);
            const lng = parseFloat(lngInput.value);

            if (!isNaN(lat) && !isNaN(lng)) {
                this.currentLocation = { lat, lng };

                // Enable show on map button
                const showOnMapBtn = document.getElementById('showOnMap');
                if (showOnMapBtn) {
                    showOnMapBtn.disabled = false;
                }
            }
        }
    }

    async handleFormSubmission(event) {
        event.preventDefault();

        const form = event.target;
        const submitBtn = document.getElementById('submitBtn');
        const formData = new FormData(form);

        const requestData = {};
        for (let [key, value] of formData.entries()) {
            if (value.trim()) {
                if (['latitude', 'longitude', 'people_affected', 'estimated_cost'].includes(key)) {
                    requestData[key] = parseFloat(value) || (key === 'people_affected' ? 1 : null);
                } else {
                    requestData[key] = value.trim();
                }
            }
        }

        const validationErrors = this.validateRequestData(requestData);
        if (validationErrors.length > 0) {
            this.showErrorMessage('Please fix the following errors:\n' + validationErrors.join('\n'));
            return;
        }

        this.showModal('loadingModal');
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            this.hideModal('loadingModal');

            if (response.ok) {
                document.getElementById('successMessage').textContent = 
                    `Your request has been submitted successfully! Request ID: ${result.id}`;
                this.showModal('successModal');
              
                form.reset();
                this.clearSavedFormData();
            
                this.initializeCharacterCounters();

            } else {
                this.showErrorModal(result.detail || 'Failed to submit request. Please try again.');
            }

        } catch (error) {
            console.error('Submission error:', error);
            this.hideModal('loadingModal');
            this.showErrorModal('Network error. Please check your connection and try again.');
        } finally {
            submitBtn.disabled = false;
        }
    }

    validateRequestData(data) {
        const errors = [];

        if (!data.title || data.title.length < 5) {
            errors.push('Title must be at least 5 characters long');
        }

        if (!data.description || data.description.length < 10) {
            errors.push('Description must be at least 10 characters long');
        }

        if (!data.request_type) {
            errors.push('Request type is required');
        }

        if (!data.contact_name || data.contact_name.length < 2) {
            errors.push('Contact name is required');
        }

        if (!data.contact_phone || !this.isValidPhoneNumber(data.contact_phone)) {
            errors.push('Valid phone number is required');
        }

        if (data.contact_email && !this.isValidEmail(data.contact_email)) {
            errors.push('Email address is invalid');
        }

        if (!data.address || data.address.length < 10) {
            errors.push('Detailed address is required');
        }

        if (!data.latitude || !this.isValidLatitude(data.latitude)) {
            errors.push('Valid latitude is required');
        }

        if (!data.longitude || !this.isValidLongitude(data.longitude)) {
            errors.push('Valid longitude is required');
        }

        return errors;
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showErrorMessage('Geolocation is not supported by this browser');
            return;
        }

        const button = document.getElementById('getCurrentLocation');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
        button.disabled = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);

                document.getElementById('latitude').value = lat;
                document.getElementById('longitude').value = lng;

                this.currentLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };

                // Try to get address from coordinates
                this.reverseGeocode(lat, lng);

                button.innerHTML = '<i class="fas fa-check"></i> Location Found!';
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);

                this.showSuccessMessage('Current location captured successfully!');
            },
            (error) => {
                console.error('Geolocation error:', error);
                button.innerHTML = originalText;
                button.disabled = false;

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        this.showErrorMessage('Location access denied. Please allow location access and try again.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        this.showErrorMessage('Location information unavailable.');
                        break;
                    case error.TIMEOUT:
                        this.showErrorMessage('Location request timed out.');
                        break;
                    default:
                        this.showErrorMessage('An unknown error occurred while retrieving location.');
                        break;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    }

    async reverseGeocode(lat, lng) {
        try {
            // Using a simple reverse geocoding approach
            // In production, you might want to use a proper service like Google Maps or OpenStreetMap
            const addressField = document.getElementById('address');
            if (!addressField.value.trim()) {
                addressField.placeholder = `Location: ${lat}, ${lng}`;
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
    }
    showLocationOnMap() {
        const lat = document.getElementById('latitude').value;
        const lng = document.getElementById('longitude').value;

        if (!lat || !lng || !this.isValidLatitude(parseFloat(lat)) || !this.isValidLongitude(parseFloat(lng))) {
            this.showErrorMessage('Please enter valid coordinates first');
            return;
        }

        // Open map page with coordinates
        const mapUrl = `/map?lat=${lat}&lng=${lng}&zoom=15`;
        window.open(mapUrl, '_blank');
    }

    handleFormReset() {
        if (confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
            this.clearSavedFormData();
            this.currentLocation = null;

            setTimeout(() => {
                this.initializeCharacterCounters();
            }, 100);

            this.showSuccessMessage('Form has been reset');
        }
    }

    // Auto-save functionality
    bindAutoSaveEvents() {
        const form = document.getElementById('requestForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', this.autoSaveFormData.bind(this));
        });
    }

    autoSaveFormData() {
        const form = document.getElementById('requestForm');
        if (!form) return;

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (value.trim()) {
                data[key] = value.trim();
            }
        }

        localStorage.setItem('disaster_relief_form_data', JSON.stringify(data));
    }

    loadSavedFormData() {
        const savedData = localStorage.getItem('disaster_relief_form_data');
        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);
            
            for (let [key, value] of Object.entries(data)) {
                const field = document.querySelector(`[name="${key}"]`);
                if (field) {
                    field.value = value;
                }
            }

            this.showInfoMessage('Form data restored from previous session');

        } catch (error) {
            console.error('Error loading saved form data:', error);
            localStorage.removeItem('disaster_relief_form_data');
        }
    }

    clearSavedFormData() {
        localStorage.removeItem('disaster_relief_form_data');
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhoneNumber(phone) {
        const phoneRegex = /^[+]?[0-9-\s()]{10,20}$/;
        return phoneRegex.test(phone);
    }

    isValidLatitude(lat) {
        return !isNaN(lat) && lat >= -90 && lat <= 90;
    }

    isValidLongitude(lng) {
        return !isNaN(lng) && lng >= -180 && lng <= 180;
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

    showSuccessModal(message) {
        document.getElementById('successMessage').textContent = message;
        this.showModal('successModal');
    }

    showErrorModal(message) {
        document.getElementById('errorMessage').textContent = message;
        this.showModal('errorModal');
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showInfoMessage(message) {
        this.showMessage(message, 'info');
    }

    showMessage(message, type = 'info') {
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

document.addEventListener('DOMContentLoaded', function() {
    window.disasterReliefApp = new DisasterReliefApp();
});
Directions