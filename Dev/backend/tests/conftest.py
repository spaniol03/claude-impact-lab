import os
import tempfile

# Banco de teste isolado (arquivo temporário) — precisa ser definido ANTES de importar a app.
_TMP_DB = os.path.join(tempfile.gettempdir(), "creche_test_inscricoes.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["CIV_DB_URL"] = f"sqlite:///{_TMP_DB}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.services.repository import get_repository  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _db() -> None:
    init_db()


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="session")
def agregados_disponiveis() -> bool:
    return get_repository().disponivel
