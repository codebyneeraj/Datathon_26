import os
import shutil
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# Locate crime_db.db in source folder
base_dir = os.path.dirname(os.path.abspath(__file__))
db_source = os.path.abspath(os.path.join(base_dir, "..", "crime_db.db"))

if not os.path.exists(db_source):
    db_source = os.path.abspath(os.path.join(base_dir, "crime_db.db"))

# Handle serverless read-only filesystem by copying database to /tmp if available
tmp_db = "/tmp/crime_db.db"
if os.path.exists("/tmp") and os.access("/tmp", os.W_OK):
    if not os.path.exists(tmp_db) and os.path.exists(db_source):
        try:
            shutil.copy2(db_source, tmp_db)
        except Exception:
            pass
    if os.path.exists(tmp_db):
        db_path = tmp_db
    else:
        db_path = db_source
else:
    db_path = db_source

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
