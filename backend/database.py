from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    JSON,
    Index,
)
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv("env/.env")



import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv("env/.env")

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL = (
    f"mysql+pymysql://"
    f"{DB_USER}:{quote_plus(DB_PASSWORD)}@"
    f"{DB_HOST}/"
    f"{DB_NAME}"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)

    user_id = Column(Integer, nullable=True)

    action = Column(String(100), nullable=False)
    module = Column(String(100), nullable=False)

    resource = Column(String(100), nullable=True)
    resource_id = Column(String(100), nullable=True)

    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)

    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    status = Column(String(20), nullable=False, default="SUCCESS")
    error_message = Column(Text, nullable=True)

    timestamp = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )


Index("idx_audit_logs_user_id", AuditLog.user_id)
Index("idx_audit_logs_action", AuditLog.action)
Index("idx_audit_logs_module", AuditLog.module)
Index("idx_audit_logs_timestamp", AuditLog.timestamp)


# Create missing tables, including audit_logs.
Base.metadata.create_all(bind=engine)