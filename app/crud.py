
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import math
from models import DisasterRequest, RequestStatusEnum, UrgencyLevelEnum, RequestTypeEnum
from schemas import DisasterRequestCreate, DisasterRequestUpdate, RequestFilters


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in kilometers
    """
   
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371  # Radius of earth in kilometers
    return c * r

class DisasterRequestCRUD:
    """CRUD operations for disaster relief requests"""

    def __init__(self, db: Session):
        self.db = db

    def create_request(self, request_data: DisasterRequestCreate) -> DisasterRequest:
        """Create a new disaster relief request"""
        db_request = DisasterRequest(**request_data.dict())
        self.db.add(db_request)
        self.db.commit()
        self.db.refresh(db_request)
        return db_request

    def get_request_by_id(self, request_id: int) -> Optional[DisasterRequest]:
        """Get a specific request by ID"""
        return self.db.query(DisasterRequest).filter(DisasterRequest.id == request_id).first()

    def get_requests(
        self, 
        filters: Optional[RequestFilters] = None,
        skip: int = 0, 
        limit: int = 100,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> List[DisasterRequest]:
        """Get requests with optional filtering, pagination and sorting"""

        query = self.db.query(DisasterRequest)

        if filters.status:
            query = query.filter(DisasterRequest.status == filters.status)
    
        if filters.request_type:
            query = query.filter(DisasterRequest.request_type == filters.request_type)
        
        if filters.urgency_level:
            urgency_value = filters.urgency_level.upper() if isinstance(filters.urgency_level, str) else filters.urgency_level
            query = query.filter(DisasterRequest.urgency_level == urgency_value)
        
        if filters.is_verified is not None:
            query = query.filter(DisasterRequest.is_verified == filters.is_verified)
        
        if filters.is_active is not None:
            query = query.filter(DisasterRequest.is_active == filters.is_active)
    
        if sort_order == "desc":
            query = query.order_by(getattr(DisasterRequest, sort_by).desc())
        else:
            query = query.order_by(getattr(DisasterRequest, sort_by))
        
        return query.offset(skip).limit(limit).all()
    

    def count_requests(self, filters: Optional[RequestFilters] = None) -> int:
        """Count total requests with optional filtering"""
        query = self.db.query(DisasterRequest)

        if filters.request_type:
            request_type_value = filters.request_type.upper() if isinstance(filters.request_type, str) else filters.request_type
            query = query.filter(DisasterRequest.request_type == request_type_value)
    
        if filters.urgency_level:
            urgency_value = filters.urgency_level.upper() if isinstance(filters.urgency_level, str) else filters.urgency_level
            query = query.filter(DisasterRequest.urgency_level == urgency_value)
        
        if filters.status:
            # query = query.filter(DisasterRequest.status == filters.status.upper())
            query = query.filter(DisasterRequest.status == filters.status)
        
        if filters.is_verified is not None:
            query = query.filter(DisasterRequest.is_verified == filters.is_verified)
        
        if filters.is_active is not None:
            query = query.filter(DisasterRequest.is_active == filters.is_active)
        

        return query.count()

    def update_request(self, request_id: int, update_data: DisasterRequestUpdate) -> Optional[DisasterRequest]:
        """Update an existing disaster relief request"""
        db_request = self.get_request_by_id(request_id)

        if not db_request:
            return None

        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(db_request, field, value)

        db_request.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(db_request)
        return db_request

    def delete_request(self, request_id: int) -> bool:
        """Soft delete a disaster relief request"""
        db_request = self.get_request_by_id(request_id)

        if not db_request:
            return False

        db_request.is_active = False
        self.db.commit()
        return True

    def get_requests_by_location(
        self, 
        center_lat: float, 
        center_lng: float, 
        radius_km: float,
        limit: int = 50
    ) -> List[DisasterRequest]:
        """Get requests within a radius of a location"""
        # Using PostgreSQL's built-in distance calculation
        # Note: This requires PostGIS extension for better performance
        # For now, using basic lat/lng filtering as approximation

        # Rough conversion: 1 degree ≈ 111km
        lat_delta = radius_km / 111
        lng_delta = radius_km / (111 * math.cos(math.radians(center_lat)))

        query = self.db.query(DisasterRequest).filter(
            and_(
                DisasterRequest.latitude >= center_lat - lat_delta,
                DisasterRequest.latitude <= center_lat + lat_delta,
                DisasterRequest.longitude >= center_lng - lng_delta,
                DisasterRequest.longitude <= center_lng + lng_delta,
                DisasterRequest.is_active == True
            )
        )

        requests = query.limit(limit).all()

        nearby_requests = []
        for req in requests:
            distance = haversine_distance(center_lat, center_lng, req.latitude, req.longitude)
            if distance <= radius_km:
                nearby_requests.append(req)

        return nearby_requests

    def get_urgent_requests(self, limit: int = 20) -> List[DisasterRequest]:
        """Get most urgent active requests"""
        return self.db.query(DisasterRequest).filter(
            and_(
                DisasterRequest.urgency_level.in_([UrgencyLevelEnum.HIGH, UrgencyLevelEnum.CRITICAL]),
                DisasterRequest.status == RequestStatusEnum.PENDING,
                DisasterRequest.is_active == True
            )
        ).order_by(
            DisasterRequest.urgency_level.desc(),
            DisasterRequest.created_at.asc()
        ).limit(limit).all()

    def get_recent_requests(self, hours: int = 24, limit: int = 50) -> List[DisasterRequest]:
        """Get requests created in the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        return self.db.query(DisasterRequest).filter(
            and_(
                DisasterRequest.created_at >= cutoff_time,
                DisasterRequest.is_active == True
            )
        ).order_by(DisasterRequest.created_at.desc()).limit(limit).all()

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about disaster relief requests"""
        total_requests = self.db.query(DisasterRequest).filter(DisasterRequest.is_active == True).count()

        pending_requests = self.db.query(DisasterRequest).filter(
            and_(
                DisasterRequest.status == RequestStatusEnum.PENDING,
                DisasterRequest.is_active == True
            )
        ).count()

        completed_requests = self.db.query(DisasterRequest).filter(
            and_(
                DisasterRequest.status == RequestStatusEnum.COMPLETED,
                DisasterRequest.is_active == True
            )
        ).count()

        urgent_requests = self.db.query(DisasterRequest).filter(
            and_(
                DisasterRequest.urgency_level.in_([UrgencyLevelEnum.HIGH, UrgencyLevelEnum.CRITICAL]),
                DisasterRequest.status == RequestStatusEnum.PENDING,
                DisasterRequest.is_active == True
            )
        ).count()

        # Get request type distribution
        type_stats = self.db.query(
            DisasterRequest.request_type, 
            func.count(DisasterRequest.id).label('count')
        ).filter(
            DisasterRequest.is_active == True
        ).group_by(DisasterRequest.request_type).all()

        return {
            "total_requests": total_requests,
            "pending_requests": pending_requests,
            "completed_requests": completed_requests,
            "urgent_requests": urgent_requests,
            "completion_rate": (completed_requests / total_requests * 100) if total_requests > 0 else 0,
            "type_distribution": {str(stat[0]).split('.')[-1]: stat[1] for stat in type_stats}
        }

    def assign_request(self, request_id: int, assignee_name: str, assignee_contact: str) -> Optional[DisasterRequest]:
        """Assign a request to a volunteer/NGO"""
        db_request = self.get_request_by_id(request_id)

        if not db_request:
            return None

        db_request.assigned_to = assignee_name
        db_request.assigned_contact = assignee_contact
        db_request.status = RequestStatusEnum.IN_PROGRESS
        db_request.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(db_request)
        return db_request

    def mark_completed(self, request_id: int) -> Optional[DisasterRequest]:
        """Mark a request as completed"""
        db_request = self.get_request_by_id(request_id)

        if not db_request:
            return None

        db_request.status = RequestStatusEnum.COMPLETED
        db_request.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(db_request)
        return db_request

    def _apply_filters(self, query, filters: RequestFilters):
        """Apply filters to query"""
        if filters.request_type:
            query = query.filter(DisasterRequest.request_type == filters.request_type)

        if filters.urgency_level:
            query = query.filter(DisasterRequest.urgency_level == filters.urgency_level)

        if filters.status:
            query = query.filter(DisasterRequest.status == filters.status)

        if filters.is_verified is not None:
            query = query.filter(DisasterRequest.is_verified == filters.is_verified)

        if filters.is_active is not None:
            query = query.filter(DisasterRequest.is_active == filters.is_active)

        if filters.disaster_event_id:
            query = query.filter(DisasterRequest.disaster_event_id == filters.disaster_event_id)

        # Location-based filters
        if filters.lat_min is not None:
            query = query.filter(DisasterRequest.latitude >= filters.lat_min)
        if filters.lat_max is not None:
            query = query.filter(DisasterRequest.latitude <= filters.lat_max)
        if filters.lng_min is not None:
            query = query.filter(DisasterRequest.longitude >= filters.lng_min)
        if filters.lng_max is not None:
            query = query.filter(DisasterRequest.longitude <= filters.lng_max)

        return query


# Convenience functions for FastAPI routes
def get_crud(db: Session) -> DisasterRequestCRUD:
    """Get CRUD instance"""
    return DisasterRequestCRUD(db)