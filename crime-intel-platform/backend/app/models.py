from sqlalchemy import Column, Integer, String, Float, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    crime_type = Column(String, index=True)
    date = Column(Date, index=True)
    time = Column(Time)
    lat = Column(Float)
    long = Column(Float)
    district = Column(String, index=True)
    station = Column(String, index=True)
    mo_tags = Column(String)  # Comma-separated tags
    status = Column(String)

    victims = relationship("Victim", back_populates="incident", cascade="all, delete-orphan")

class Accused(Base):
    __tablename__ = "accused"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    past_incident_ids = Column(String)  # Comma-separated list of incident IDs
    risk_score = Column(Integer)

class Victim(Base):
    __tablename__ = "victims"

    id = Column(Integer, primary_key=True, index=True)
    age = Column(Integer)
    gender = Column(String)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"))

    incident = relationship("Incident", back_populates="victims")

class DistrictSocioeconomic(Base):
    __tablename__ = "district_socioeconomic"

    district = Column(String, primary_key=True, index=True)
    population = Column(Integer)
    unemployment_rate = Column(Float)
    urbanization_index = Column(Float)
    literacy_rate = Column(Float)
