
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RequestTypeEnum(str, Enum):
    """Request types for validation"""
    rescue = "rescue"
    medical = "medical"
    food = "food"
    water = "water"
    shelter = "shelter"
    clothing = "clothing"
    transportation = "transportation"
    other = "other"


class UrgencyLevelEnum(str, Enum):
    """Urgency levels for validation"""
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RequestStatusEnum(str, Enum):
    """Request status for validation"""
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class DisasterRequestBase(BaseModel):
    """Base schema for disaster relief requests"""
    title: str = Field(..., min_length=5, max_length=200, description="Brief title describing the request")
    description: str = Field(..., min_length=10, max_length=2000, description="Detailed description of the situation")
    request_type: RequestTypeEnum = Field(..., description="Type of assistance needed")
    urgency_level: UrgencyLevelEnum = Field(default=UrgencyLevelEnum.medium, description="How urgent is this request")

    # Contact information
    contact_name: str = Field(..., min_length=2, max_length=100, description="Name of person making the request")
    contact_phone: str = Field(..., min_length=10, max_length=20, description="Phone number for contact")
    contact_email: Optional[str] = Field(None, description="Email address (optional)")

    # Location information
    latitude: float = Field(..., ge=-90, le=90, description="GPS latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="GPS longitude coordinate")
    address: str = Field(..., min_length=10, max_length=500, description="Full address of the location")
    landmark: Optional[str] = Field(None, max_length=200, description="Nearby landmark for easier identification")

    # Additional details
    people_affected: int = Field(default=1, ge=1, le=1000, description="Number of people affected")
    estimated_cost: Optional[float] = Field(None, ge=0, description="Estimated cost for assistance (if known)")
    additional_notes: Optional[str] = Field(None, max_length=1000, description="Any additional information")
    disaster_event_id: Optional[str] = Field(None, max_length=50, description="ID of the disaster event (if applicable)")

    @validator('contact_phone')
    def validate_phone(cls, v):
        """Validate phone number format"""
        # Remove all non-digit characters
        digits_only = ''.join(filter(str.isdigit, v))
        if len(digits_only) < 10:
            raise ValueError('Phone number must have at least 10 digits')
        return v

    @validator('contact_email')
    def validate_email(cls, v):
        """Validate email format if provided"""
        if v is not None and v.strip():
            # Basic email validation
            if '@' not in v or '.' not in v:
                raise ValueError('Invalid email format')
        return v

    class Config:
        """Pydantic configuration"""
        use_enum_values = True
        schema_extra = {
            "example": {
                "title": "Medical Emergency - Elderly Person Needs Help",
                "description": "An elderly person is trapped in their house after flooding and needs immediate medical attention",
                "request_type": "medical",
                "urgency_level": "high",
                "contact_name": "John Smith",
                "contact_phone": "+91-9876543210",
                "contact_email": "john@example.com",
                "latitude": 28.6139,
                "longitude": 77.2090,
                "address": "123 Main Street, New Delhi, Delhi 110001",
                "landmark": "Near Red Cross Hospital",
                "people_affected": 1,
                "estimated_cost": 5000,
                "additional_notes": "Patient has diabetes and hypertension",
                "disaster_event_id": "FLOOD_DEL_2025_001"
            }
        }


# class DisasterRequestCreate(DisasterRequestBase):
#     """Schema for creating new disaster relief requests"""
#     pass

class DisasterRequestCreate(BaseModel):
    title: str
    request_type: str = "MEDICAL"  # Default value
    urgency_level: str = "HIGH"   # Default value
    description: str = "Test description"
    contact_name: str = "Test User"
    contact_phone: str = "+91-1234567890"
    latitude: float = 28.6139
    longitude: float = 77.2090
    address: str = "Test Address"
    
    class Config:
        extra = "allow"  # Allow extra fields


class DisasterRequestUpdate(BaseModel):
    """Schema for updating existing disaster relief requests"""
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    urgency_level: Optional[UrgencyLevelEnum] = None
    status: Optional[RequestStatusEnum] = None

    # Update contact info
    contact_name: Optional[str] = Field(None, min_length=2, max_length=100)
    contact_phone: Optional[str] = Field(None, min_length=10, max_length=20)
    contact_email: Optional[str] = None

    # Update location
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = Field(None, min_length=10, max_length=500)
    landmark: Optional[str] = Field(None, max_length=200)

    # Assignment fields
    assigned_to: Optional[str] = Field(None, max_length=100, description="Name of volunteer/NGO assigned")
    assigned_contact: Optional[str] = Field(None, max_length=20, description="Contact of assigned person")

    # Other fields
    people_affected: Optional[int] = Field(None, ge=1, le=1000)
    estimated_cost: Optional[float] = Field(None, ge=0)
    additional_notes: Optional[str] = Field(None, max_length=1000)
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None

    class Config:
        use_enum_values = True


class DisasterRequestResponse(DisasterRequestBase):
    """Schema for disaster relief request responses"""
    id: int
    status: RequestStatusEnum = RequestStatusEnum.pending
    assigned_to: Optional[str] = None
    assigned_contact: Optional[str] = None
    is_verified: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    # Computed fields
    location_display: str
    is_urgent: bool

    class Config:
        from_attributes = True
        use_enum_values = True


class RequestsListResponse(BaseModel):
    """Schema for paginated requests list"""
    requests: List[DisasterRequestResponse]
    total: int
    page: int
    size: int
    total_pages: int

    class Config:
        from_attributes = True


class RequestFilters(BaseModel):
    """Schema for filtering requests"""
    request_type: Optional[RequestTypeEnum] = None
    urgency_level: Optional[UrgencyLevelEnum] = None
    status: Optional[RequestStatusEnum] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = True
    disaster_event_id: Optional[str] = None

    # Location-based filters
    lat_min: Optional[float] = Field(None, ge=-90, le=90)
    lat_max: Optional[float] = Field(None, ge=-90, le=90)
    lng_min: Optional[float] = Field(None, ge=-180, le=180)
    lng_max: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: Optional[float] = Field(None, gt=0, le=1000, description="Search radius in kilometers")
    center_lat: Optional[float] = Field(None, ge=-90, le=90, description="Center latitude for radius search")
    center_lng: Optional[float] = Field(None, ge=-180, le=180, description="Center longitude for radius search")

    class Config:
        use_enum_values = True


class APIResponse(BaseModel):
    """Generic API response schema"""
    success: bool
    message: str
    data: Optional[dict] = None

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Request processed successfully",
                "data": {"id": 123, "status": "pending"}
            }
        }
