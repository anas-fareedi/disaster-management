from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import math
from database import get_db
from crud import get_crud
from utils.filters import is_spam_request, is_duplicate_request
from schemas import (
    DisasterRequestCreate, 
    DisasterRequestUpdate, 
    DisasterRequestResponse, 
    RequestsListResponse,
    RequestFilters,
    APIResponse
)

router = APIRouter()
@router.post("/requests", response_model=DisasterRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(
    request_data: DisasterRequestCreate,
    db: Session = Depends(get_db)
):
    """Create a new disaster relief request"""
    #  DEBUG
    print(f" DEBUG - Received data:")
    print(f"   request_type: {request_data.request_type}")
    print(f"   urgency_level: {request_data.urgency_level}")
    print(f"   title: {request_data.title}")
    
    crud = get_crud(db)

    # Ensure enum values are properly formatted
    if isinstance(request_data.request_type, str):
        request_data.request_type = request_data.request_type.upper()
    if isinstance(request_data.urgency_level, str):
        request_data.urgency_level = request_data.urgency_level.upper()

    # Check for spam (basic validation)
    if is_spam_request(request_data):
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request appears to be spam or invalid"
        )

    if is_duplicate_request(db, request_data):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A similar request already exists for this location"
        )

    try:
        new_request = crud.create_request(request_data)
        return new_request
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating request: {str(e)}"
        )


@router.get("/requests", response_model=RequestsListResponse)
async def get_requests(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=1000, description="Number of requests per page"),
    request_type: Optional[str] = Query(None, description="Filter by request type"),
    urgency_level: Optional[str] = Query(None, description="Filter by urgency level"),
    status: Optional[str] = Query(None, description="Filter by status"),
    is_verified: Optional[bool] = Query(None, description="Filter by verification status"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db)
):
    """
    Get disaster relief requests with filtering, pagination, and sorting

    Returns a paginated list of disaster relief requests with various filtering options.
    """
    # Normalize filter values to uppercase
    if request_type:
        request_type = request_type.upper()
    if status:
        status = status.upper()  
    if urgency_level:
        urgency_level = urgency_level.upper()
        
    crud = get_crud(db)

    filters = RequestFilters(
        request_type=request_type,
        urgency_level=urgency_level,
        status=status,
        is_verified=is_verified,
        is_active=is_active
    )

    # Calculate skip value for pagination
    skip = (page - 1) * size

    # Get requests and total count
    requests = crud.get_requests(filters=filters, skip=skip, limit=size, sort_by=sort_by, sort_order=sort_order)
    total = crud.count_requests(filters=filters)
    total_pages = math.ceil(total / size)

    return RequestsListResponse(
        requests=requests,
        total=total,
        page=page,
        size=size,
        total_pages=total_pages
    )


@router.get("/requests/{request_id}", response_model=DisasterRequestResponse)
async def get_request(
    request_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific disaster relief request by ID
    """
    crud = get_crud(db)
    request = crud.get_request_by_id(request_id)

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request with ID {request_id} not found"
        )
    return request


@router.put("/requests/{request_id}", response_model=DisasterRequestResponse)
async def update_request(
    request_id: int,
    update_data: DisasterRequestUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing disaster relief request
    Allows updating of request details, status, assignment, and other fields.
    """
    crud = get_crud(db)
    updated_request = crud.update_request(request_id, update_data)

    if not updated_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request with ID {request_id} not found"
        )
    return updated_request


@router.delete("/requests/{request_id}", response_model=APIResponse)
async def delete_request(
    request_id: int,
    db: Session = Depends(get_db)
):
    """
    Soft delete a disaster relief request (marks as inactive)
    """
    crud = get_crud(db)
    success = crud.delete_request(request_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request with ID {request_id} not found"
        )

    return APIResponse(
        success=True,
        message=f"Request {request_id} has been deleted successfully"
    )


@router.get("/requests/nearby/search", response_model=List[DisasterRequestResponse])
async def get_nearby_requests(
    lat: float = Query(..., ge=-90, le=90, description="Latitude of search center"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude of search center"),
    radius: float = Query(10, gt=0, le=1000, description="Search radius in kilometers"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db)
):
    """
    Find disaster relief requests near a specific location
    Uses the Haversine formula to calculate distances and return requests within the specified radius.
    """
    crud = get_crud(db)
    nearby_requests = crud.get_requests_by_location(lat, lng, radius, limit)
    return nearby_requests


@router.get("/requests/urgent/list", response_model=List[DisasterRequestResponse])
async def get_urgent_requests(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of urgent requests to return"),
    db: Session = Depends(get_db)
):
    """
    Get the most urgent active disaster relief requests
    Returns requests marked as HIGH or CRITICAL urgency that are still pending.
    """
    crud = get_crud(db)
    urgent_requests = crud.get_urgent_requests(limit)
    return urgent_requests


@router.get("/requests/recent/list", response_model=List[DisasterRequestResponse])
async def get_recent_requests(
    hours: int = Query(24, ge=1, le=168, description="Number of hours to look back (max 7 days)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of recent requests to return"),
    db: Session = Depends(get_db)
):
    """
    Get disaster relief requests created in the last N hours
    """
    crud = get_crud(db)
    recent_requests = crud.get_recent_requests(hours, limit)
    return recent_requests


@router.post("/requests/{request_id}/assign", response_model=DisasterRequestResponse)
async def assign_request(
    request_id: int,
    assignee_name: str = Query(..., min_length=2, max_length=100, description="Name of volunteer/NGO"),
    assignee_contact: str = Query(..., min_length=10, max_length=20, description="Contact number"),
    db: Session = Depends(get_db)
):
    """
    Assign a disaster relief request to a volunteer or NGO
    Changes the status to IN_PROGRESS and records the assignee details.
    """
    crud = get_crud(db)
    assigned_request = crud.assign_request(request_id, assignee_name, assignee_contact)

    if not assigned_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request with ID {request_id} not found"
        )

    return assigned_request


@router.post("/requests/{request_id}/complete", response_model=DisasterRequestResponse)
async def mark_request_completed(
    request_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark a disaster relief request as completed
    """
    crud = get_crud(db)
    completed_request = crud.mark_completed(request_id)

    if not completed_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request with ID {request_id} not found"
        )

    return completed_request


@router.get("/statistics", response_model=dict)
async def get_statistics(db: Session = Depends(get_db)):
    """
    Get statistics about disaster relief requests
    Returns counts, completion rates, and type distribution of requests.
    """
    crud = get_crud(db)
    stats = crud.get_statistics()
    return {
        "success": True,
        "message": "Statistics retrieved successfully",
        "data": stats
    }

