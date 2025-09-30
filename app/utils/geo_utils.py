import math
import requests
from typing import Dict, List, Tuple, Optional
import json


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on the earth

    Args:
        lat1, lon1: Latitude and longitude of first point in decimal degrees
        lat2, lon2: Latitude and longitude of second point in decimal degrees

    Returns:
        Distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371  # Radius of earth in kilometers
    return c * r


def get_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the bearing between two points

    Args:
        lat1, lon1: Latitude and longitude of first point in decimal degrees
        lat2, lon2: Latitude and longitude of second point in decimal degrees

    Returns:
        Bearing in degrees (0-360)
    """
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    dlon = lon2 - lon1

    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)

    bearing = math.atan2(y, x)
    bearing = math.degrees(bearing)
    bearing = (bearing + 360) % 360

    return bearing


def point_in_radius(center_lat: float, center_lon: float, point_lat: float, point_lon: float, radius_km: float) -> bool:
    """
    Check if a point is within a specified radius of a center point

    Args:
        center_lat, center_lon: Center point coordinates
        point_lat, point_lon: Point to check coordinates
        radius_km: Radius in kilometers

    Returns:
        True if point is within radius, False otherwise
    """
    distance = haversine_distance(center_lat, center_lon, point_lat, point_lon)
    return distance <= radius_km


def get_bounding_box(center_lat: float, center_lon: float, radius_km: float) -> Dict[str, float]:
    """
    Calculate bounding box coordinates for a given center and radius

    Args:
        center_lat, center_lon: Center point coordinates
        radius_km: Radius in kilometers

    Returns:
        Dictionary with min/max latitude and longitude
    """
    # Rough conversion: 1 degree ≈ 111km
    lat_delta = radius_km / 111
    lon_delta = radius_km / (111 * math.cos(math.radians(center_lat)))

    return {
        "min_lat": center_lat - lat_delta,
        "max_lat": center_lat + lat_delta,
        "min_lon": center_lon - lon_delta,
        "max_lon": center_lon + lon_delta
    }


def validate_coordinates(lat: float, lon: float) -> bool:
    """
    Validate if coordinates are within valid ranges

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        True if coordinates are valid, False otherwise
    """
    return -90 <= lat <= 90 and -180 <= lon <= 180


def get_coordinate_precision(lat: float, lon: float) -> str:
    """
    Determine the precision level of coordinates

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        Precision level description
    """
    lat_str = str(lat)
    lon_str = str(lon)

    lat_decimals = len(lat_str.split('.')[-1]) if '.' in lat_str else 0
    lon_decimals = len(lon_str.split('.')[-1]) if '.' in lon_str else 0

    min_decimals = min(lat_decimals, lon_decimals)

    if min_decimals >= 6:
        return "Very High (sub-meter accuracy)"
    elif min_decimals >= 4:
        return "High (10-meter accuracy)"
    elif min_decimals >= 3:
        return "Medium (100-meter accuracy)"
    elif min_decimals >= 1:
        return "Low (kilometer accuracy)"
    else:
        return "Very Low (rough location only)"


def cluster_nearby_requests(requests: List[Dict], max_distance_km: float = 0.5) -> List[List[Dict]]:
    """
    Cluster nearby disaster requests for better map visualization

    Args:
        requests: List of request dictionaries with latitude/longitude
        max_distance_km: Maximum distance for clustering

    Returns:
        List of clusters, where each cluster is a list of requests
    """
    if not requests:
        return []

    clusters = []
    unclustered = requests.copy()

    while unclustered:
        # Start a new cluster with the first unclustered request
        current_cluster = [unclustered.pop(0)]

        # Find all nearby requests to add to this cluster
        i = 0
        while i < len(unclustered):
            request = unclustered[i]

            # Check if this request is close to any request in the current cluster
            is_nearby = False
            for cluster_request in current_cluster:
                distance = haversine_distance(
                    request['latitude'], request['longitude'],
                    cluster_request['latitude'], cluster_request['longitude']
                )
                if distance <= max_distance_km:
                    is_nearby = True
                    break

            if is_nearby:
                current_cluster.append(unclustered.pop(i))
            else:
                i += 1

        clusters.append(current_cluster)

    return clusters


def get_cluster_center(cluster: List[Dict]) -> Tuple[float, float]:
    """
    Calculate the geographic center of a cluster of requests

    Args:
        cluster: List of request dictionaries with latitude/longitude

    Returns:
        Tuple of (center_latitude, center_longitude)
    """
    if not cluster:
        return 0.0, 0.0

    total_lat = sum(req['latitude'] for req in cluster)
    total_lon = sum(req['longitude'] for req in cluster)

    center_lat = total_lat / len(cluster)
    center_lon = total_lon / len(cluster)

    return center_lat, center_lon


def format_distance(distance_km: float) -> str:
    """
    Format distance for human-readable display

    Args:
        distance_km: Distance in kilometers

    Returns:
        Formatted distance string
    """
    if distance_km < 1:
        return f"{int(distance_km * 1000)}m"
    elif distance_km < 10:
        return f"{distance_km:.1f}km"
    else:
        return f"{int(distance_km)}km"


def get_direction_text(bearing: float) -> str:
    """
    Convert bearing to human-readable direction

    Args:
        bearing: Bearing in degrees (0-360)

    Returns:
        Direction text (e.g., "North", "Northeast", etc.)
    """
    directions = [
        "North", "Northeast", "East", "Southeast",
        "South", "Southwest", "West", "Northwest"
    ]

    # Each direction covers 45 degrees, starting from North (337.5-22.5)
    index = round(bearing / 45) % 8
    return directions[index]


# India-specific utilities
INDIA_BOUNDS = {
    "min_lat": 6.4,
    "max_lat": 37.6,
    "min_lon": 68.1,
    "max_lon": 97.4
}


def is_in_india(lat: float, lon: float) -> bool:
    """
    Check if coordinates are within India's boundaries (approximate)

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        True if coordinates are within India, False otherwise
    """
    return (INDIA_BOUNDS["min_lat"] <= lat <= INDIA_BOUNDS["max_lat"] and
            INDIA_BOUNDS["min_lon"] <= lon <= INDIA_BOUNDS["max_lon"])


def get_state_from_coordinates(lat: float, lon: float) -> Optional[str]:
    """
    Get approximate Indian state from coordinates (very basic implementation)

    Note: This is a simplified implementation. For production use,
    consider using a proper geocoding service or GIS database.

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        State name if identifiable, None otherwise
    """
    # This is a very basic implementation
    # In production, you would use a proper geocoding service

    if not is_in_india(lat, lon):
        return None

    # Very rough state boundaries (for demonstration)
    if 28.0 <= lat <= 30.5 and 76.0 <= lon <= 78.5:
        return "Delhi"
    elif 18.0 <= lat <= 20.0 and 72.5 <= lon <= 73.5:
        return "Maharashtra"
    elif 12.5 <= lat <= 13.5 and 77.0 <= lon <= 78.0:
        return "Karnataka"
    elif 22.0 <= lat <= 24.5 and 87.0 <= lon <= 89.0:
        return "West Bengal"
    # Add more states as needed

    return "Unknown"


def generate_map_bounds(requests: List[Dict], padding_percent: float = 10) -> Dict[str, float]:
    """
    Generate map bounds that encompass all requests with padding

    Args:
        requests: List of request dictionaries with latitude/longitude
        padding_percent: Percentage of padding to add to bounds

    Returns:
        Dictionary with map bounds
    """
    if not requests:
        # Default to India bounds
        return INDIA_BOUNDS

    latitudes = [req['latitude'] for req in requests]
    longitudes = [req['longitude'] for req in requests]

    min_lat, max_lat = min(latitudes), max(latitudes)
    min_lon, max_lon = min(longitudes), max(longitudes)

    # Add padding
    lat_padding = (max_lat - min_lat) * (padding_percent / 100)
    lon_padding = (max_lon - min_lon) * (padding_percent / 100)

    return {
        "min_lat": min_lat - lat_padding,
        "max_lat": max_lat + lat_padding,
        "min_lon": min_lon - lon_padding,
        "max_lon": max_lon + lon_padding
    }
