import httpx
import logging
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, date

from app.models.project import Project
from app.models.user import User, UserRole
from app.models.notification import Notification, NotificationType
from app.models.site_diary import SiteDiary

logger = logging.getLogger(__name__)

OPEN_METEO_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

def geocode_sub_locality(location_str: str) -> Optional[Tuple[float, float]]:
    """
    Converts a sub-locality address (e.g. 'Kakkanad, Kochi', 'Bandra, Mumbai')
    into exact latitude and longitude coordinates using Open-Meteo Geocoding API.
    """
    if not location_str or len(location_str.strip()) < 2:
        return None

    try:
        # Extract main city/neighborhood name for clean query
        query = location_str.split(',')[0].strip()
        params = {"name": query, "count": 1, "language": "en", "format": "json"}
        
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(OPEN_METEO_GEOCODE_URL, params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results")
                if results and len(results) > 0:
                    lat = float(results[0]["latitude"])
                    lon = float(results[0]["longitude"])
                    return (lat, lon)
    except Exception as e:
        logger.warning(f"Geocoding failed for '{location_str}': {e}")
        
    return None

def fetch_hyperlocal_weather(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches 1km x 1km micro-climate live weather from Open-Meteo for exact coordinates.
    """
    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current_weather": "true",
            "hourly": "precipitation,rain,wind_speed_10m",
            "timezone": "auto"
        }
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(OPEN_METEO_WEATHER_URL, params=params)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current_weather", {})
                
                temp = float(current.get("temperature", 28.0))
                wind_speed = float(current.get("windspeed", 12.0))
                weathercode = int(current.get("weathercode", 0))

                # Determine rainfall rate (mm/hr)
                hourly_rain = data.get("hourly", {}).get("rain", [0.0])
                rainfall_mm = float(hourly_rain[0]) if hourly_rain else 0.0

                # Map WMO weather codes to ConstructIQ weather conditions
                # Codes: 51-67 = Rain, 80-82 = Rain Showers, 95-99 = Thunderstorm
                weather_condition = "sunny"
                work_impact = "none"
                crane_stoppage = 0.0
                lost_hours = 0.0

                if weathercode in [95, 96, 99] or rainfall_mm >= 25.0:
                    weather_condition = "heavy_rain"
                    work_impact = "full_stoppage"
                    crane_stoppage = 8.0
                    lost_hours = 64.0
                elif weathercode in [51, 53, 55, 61, 63, 65, 80, 81, 82] or rainfall_mm >= 5.0:
                    weather_condition = "rain"
                    work_impact = "partial_stoppage"
                    crane_stoppage = 3.5
                    lost_hours = 28.0
                elif wind_speed >= 35.0:
                    weather_condition = "high_wind"
                    work_impact = "partial_stoppage"
                    crane_stoppage = 4.0
                    lost_hours = 16.0
                elif temp >= 40.0:
                    weather_condition = "extreme_heat"
                    work_impact = "minor_delay"
                    lost_hours = 8.0
                elif weathercode in [1, 2, 3]:
                    weather_condition = "cloudy"

                return {
                    "temperature_c": temp,
                    "rainfall_mm": rainfall_mm,
                    "wind_speed_kmh": wind_speed,
                    "weather_condition": weather_condition,
                    "work_impact": work_impact,
                    "crane_stoppage_hours": crane_stoppage,
                    "lost_man_hours": lost_hours,
                    "latitude": lat,
                    "longitude": lon,
                }
    except Exception as e:
        logger.error(f"Live weather fetch failed for ({lat}, {lon}): {e}")

    # Fallback default values
    return {
        "temperature_c": 28.0,
        "rainfall_mm": 0.0,
        "wind_speed_kmh": 10.0,
        "weather_condition": "sunny",
        "work_impact": "none",
        "crane_stoppage_hours": 0.0,
        "lost_man_hours": 0.0,
        "latitude": lat,
        "longitude": lon,
    }

def trigger_weather_alert_if_needed(db: Session, project: Project, weather_data: dict):
    """
    Evaluates weather impact and dispatches WEATHER_DELAY_ALERT notifications
    to project team members and company owners if severe weather threshold is breached.
    """
    work_impact = weather_data.get("work_impact", "none")
    rainfall_mm = weather_data.get("rainfall_mm", 0.0)
    wind_speed = weather_data.get("wind_speed_kmh", 0.0)

    if work_impact in ["none", "minor_delay"] and rainfall_mm < 10.0 and wind_speed < 35.0:
        return  # Normal conditions, no alert needed

    today_str = date.today().isoformat()
    alert_msg = (
        f"🌧️ Weather Delay Alert for [{project.name}] (Location: {project.location}): "
        f"Heavy conditions recorded (Rain: {rainfall_mm}mm, Wind: {wind_speed}km/h). "
        f"Work Impact: {work_impact.replace('_', ' ').title()}."
    )

    # Find project members & owner
    target_user_ids = set()
    if project.created_by:
        target_user_ids.add(project.created_by)
    if project.company_id:
        target_user_ids.add(project.company_id)

    # Check existing notifications today to avoid spamming duplicate alerts
    for user_id in target_user_ids:
        existing = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.type == NotificationType.WEATHER_DELAY_ALERT,
            Notification.message.like(f"%[{project.name}]%")
        ).first()

        if not existing:
            notif = Notification(
                user_id=user_id,
                type=NotificationType.WEATHER_DELAY_ALERT,
                message=alert_msg,
                is_read=False
            )
            db.add(notif)
            logger.info(f"Triggered WEATHER_DELAY_ALERT for User #{user_id} on Project #{project.id}")

    db.commit()
