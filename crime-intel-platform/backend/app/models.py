from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class District(Base):
    __tablename__ = "districts"
    DistrictID = Column(Integer, primary_key=True, index=True)
    DistrictName = Column(String, index=True)
    StateID = Column(Integer)
    Active = Column(Integer)

    units = relationship("Unit", back_populates="district")
    socioeconomic = relationship("DistrictSocioeconomic", back_populates="district", uselist=False)

class Unit(Base):
    __tablename__ = "units"
    UnitID = Column(Integer, primary_key=True, index=True)
    UnitName = Column(String, index=True)
    DistrictID = Column(Integer, ForeignKey("districts.DistrictID"))
    StateID = Column(Integer)
    Active = Column(Integer)

    district = relationship("District", back_populates="units")
    cases = relationship("CaseMaster", back_populates="unit")

class CaseStatusMaster(Base):
    __tablename__ = "case_status_master"
    CaseStatusID = Column(Integer, primary_key=True, index=True)
    CaseStatusName = Column(String, index=True)

    cases = relationship("CaseMaster", back_populates="status_rel")

class CrimeHead(Base):
    __tablename__ = "crime_heads"
    CrimeHeadID = Column(Integer, primary_key=True, index=True)
    CrimeGroupName = Column(String, index=True)
    Active = Column(Integer)

    subheads = relationship("CrimeSubHead", back_populates="crime_head")
    cases = relationship("CaseMaster", back_populates="major_head_rel")

class CrimeSubHead(Base):
    __tablename__ = "crime_sub_heads"
    CrimeSubHeadID = Column(Integer, primary_key=True, index=True)
    CrimeHeadID = Column(Integer, ForeignKey("crime_heads.CrimeHeadID"))
    CrimeHeadName = Column(String, index=True)
    SeqID = Column(Integer)

    crime_head = relationship("CrimeHead", back_populates="subheads")
    cases = relationship("CaseMaster", back_populates="minor_head_rel")

class CaseMaster(Base):
    __tablename__ = "case_master"
    CaseMasterID = Column(Integer, primary_key=True, index=True)
    CrimeNo = Column(String, index=True)
    CaseNo = Column(String, index=True)
    CrimeRegisteredDate = Column(String)
    IncidentFromDate = Column(String)
    PoliceStationID = Column(Integer, ForeignKey("units.UnitID"))
    CaseStatusID = Column(Integer, ForeignKey("case_status_master.CaseStatusID"))
    CrimeMajorHeadID = Column(Integer, ForeignKey("crime_heads.CrimeHeadID"))
    CrimeMinorHeadID = Column(Integer, ForeignKey("crime_sub_heads.CrimeSubHeadID"))
    latitude = Column(Float)
    longitude = Column(Float)
    BriefFacts = Column(String)
    mo_tags = Column(String)

    unit = relationship("Unit", back_populates="cases")
    status_rel = relationship("CaseStatusMaster", back_populates="cases")
    major_head_rel = relationship("CrimeHead", back_populates="cases")
    minor_head_rel = relationship("CrimeSubHead", back_populates="cases")
    accused = relationship("Accused", back_populates="case", cascade="all, delete-orphan")
    victims = relationship("Victim", back_populates="case", cascade="all, delete-orphan")

class Accused(Base):
    __tablename__ = "accused"
    AccusedMasterID = Column(Integer, primary_key=True, index=True)
    CaseMasterID = Column(Integer, ForeignKey("case_master.CaseMasterID", ondelete="CASCADE"))
    AccusedName = Column(String, index=True)
    AgeYear = Column(Integer)
    GenderID = Column(Integer)
    PersonID = Column(String, index=True)
    risk_score = Column(Integer)

    case = relationship("CaseMaster", back_populates="accused")

class Victim(Base):
    __tablename__ = "victims"
    VictimMasterID = Column(Integer, primary_key=True, index=True)
    CaseMasterID = Column(Integer, ForeignKey("case_master.CaseMasterID", ondelete="CASCADE"))
    VictimName = Column(String, index=True)
    AgeYear = Column(Integer)
    GenderID = Column(Integer)

    case = relationship("CaseMaster", back_populates="victims")

class DistrictSocioeconomic(Base):
    __tablename__ = "district_socioeconomic"
    DistrictID = Column(Integer, ForeignKey("districts.DistrictID"), primary_key=True)
    population = Column(Integer)
    unemployment_rate = Column(Float)
    urbanization_index = Column(Float)
    literacy_rate = Column(Float)

    district = relationship("District", back_populates="socioeconomic")
