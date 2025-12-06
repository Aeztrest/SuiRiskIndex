import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "sui")
DB_PASSWORD = os.getenv("DB_PASSWORD", "suipass")
DB_NAME = os.getenv("DB_NAME", "sui_db")

SQLALCHEMY_DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
)


class Base(DeclarativeBase):
    """Tüm modellerin miras alacağı Base class."""
    pass


engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=True,      # SQL loglarını görmek istemezsen False yap
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ping_db():
    """Basit bir SELECT 1 ile bağlantıyı test etmek için."""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return result.scalar() == 1
