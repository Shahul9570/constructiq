from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Date
from sqlalchemy.sql import func
from datetime import datetime

from app.core.database import Base

class SiteDiary(Base):
    __tablename__ = "site_diaries"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    
    weather_condition = Column(String(50), nullable=False, default="sunny")  # sunny, cloudy, rain, heavy_rain, high_wind, extreme_heat
    temperature_c = Column(Float, default=28.0)
    rainfall_mm = Column(Float, default=0.0)
    
    work_impact = Column(String(50), nullable=False, default="none")  # none, minor_delay, partial_stoppage, full_stoppage
    crane_stoppage_hours = Column(Float, default=0.0)
    lost_man_hours = Column(Float, default=0.0)
    impacted_activities = Column(Text, nullable=True)  # e.g. "Roof waterproofing, Crane tower lifting"
    
    delay_description = Column(Text, nullable=True)
    shift_type = Column(String(20), default="day")  # day, night
    
    logged_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SiteDiary project={self.project_id} date={self.date} weather={self.weather_condition} impact={self.work_impact}>"
