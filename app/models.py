from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, Enum
from sqlalchemy.sql import func
from database import Base
import enum


class RequestTypeEnum(enum.Enum):
    """Types of disaster relief requests"""
    RESCUE = "rescue"
    MEDICAL = "medical"
    FOOD = "food"
    WATER = "water"
    SHELTER = "shelter"
    CLOTHING = "clothing"
    TRANSPORTATION = "transportation"
    OTHER = "other"


class UrgencyLevelEnum(enum.Enum):
    """Urgency levels for requests"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RequestStatusEnum(enum.Enum):
    """Status of disaster relief requests"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DisasterRequest(Base):
    """Main table for storing disaster relief requests"""
    __tablename__ = "disaster_requests"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Request details
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    request_type = Column(Enum(RequestTypeEnum), nullable=False, index=True)
    urgency_level = Column(Enum(UrgencyLevelEnum), nullable=False, default=UrgencyLevelEnum.MEDIUM, index=True)

    # Contact information
    contact_name = Column(String(100), nullable=False)
    contact_phone = Column(String(20), nullable=False)
    contact_email = Column(String(100), nullable=True)

    # Location information (for mapping)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    address = Column(Text, nullable=False)
    landmark = Column(String(200), nullable=True)

    # Request management
    status = Column(Enum(RequestStatusEnum), nullable=False, default=RequestStatusEnum.PENDING, index=True)
    people_affected = Column(Integer, nullable=False, default=1)
    estimated_cost = Column(Float, nullable=True)

    # Volunteer/NGO assignment
    assigned_to = Column(String(100), nullable=True)
    assigned_contact = Column(String(20), nullable=True)

    # Additional information
    additional_notes = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # For future expansion - disaster event tracking
    disaster_event_id = Column(String(50), nullable=True, index=True)

    def __repr__(self):
        return f"<DisasterRequest(id={self.id}, type={self.request_type}, urgency={self.urgency_level}, status={self.status})>"

    @property
    def location_display(self):
        """Human-readable location string"""
        if self.landmark:
            return f"{self.address}, Near {self.landmark}"
        return self.address

    @property
    def is_urgent(self):
        """Check if request is urgent or critical"""
        return self.urgency_level in [UrgencyLevelEnum.HIGH, UrgencyLevelEnum.CRITICAL]

    def to_dict(self):
        """Convert model to dictionary for API responses"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "request_type": self.request_type.value if self.request_type else None,
            "urgency_level": self.urgency_level.value if self.urgency_level else None,
            "contact_name": self.contact_name,
            "contact_phone": self.contact_phone,
            "contact_email": self.contact_email,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "address": self.address,
            "landmark": self.landmark,
            "status": self.status.value if self.status else None,
            "people_affected": self.people_affected,
            "estimated_cost": self.estimated_cost,
            "assigned_to": self.assigned_to,
            "assigned_contact": self.assigned_contact,
            "additional_notes": self.additional_notes,
            "is_verified": self.is_verified,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "disaster_event_id": self.disaster_event_id,
            "location_display": self.location_display,
            "is_urgent": self.is_urgent
        }
