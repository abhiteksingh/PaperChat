from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from config import settings
from models import Base
import logging

logger = logging.getLogger(__name__)

# Create the async engine
engine = create_async_engine(settings.database_url, future=True, echo=False)

# Session factory for generating async sessions
async_session = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession
)

async def init_db() -> None:
    """Creates the database schema if tables do not exist."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.critical(f"Failed to initialize database: {e}")
        raise e

async def get_db():
    """Dependency provider yielding async database sessions."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
