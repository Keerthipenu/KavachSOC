import pytest
from fastapi.testclient import TestClient

from sentinel_x.api import app
from sentinel_x.database import Base, SessionLocal, engine
from sentinel_x.service import reset_demo


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        reset_demo(db)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

