"""Configuração da aplicação, carregada de variáveis de ambiente / arquivo .env.

Sem segredos: a aplicação só consome dados públicos anonimizados. As variáveis aqui
controlam apenas caminhos de arquivo e política de CORS.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CIV_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "development"
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"]
    )
    data_dir: Path = Path("app/data")
    source_dir: Path = Path("../../Bases de dados/dadoscreche-main")
    # URL do banco. Default: SQLite local (arquivo, sem credenciais). Sobrescreva com
    # CIV_DB_URL para apontar a um Postgres etc. em produção.
    db_url: str = ""

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def data_path(self) -> Path:
        path = self.data_dir
        return path if path.is_absolute() else (BACKEND_ROOT / path).resolve()

    @property
    def source_path(self) -> Path:
        path = self.source_dir
        return path if path.is_absolute() else (BACKEND_ROOT / path).resolve()

    @property
    def database_url(self) -> str:
        if self.db_url:
            return self.db_url
        return f"sqlite:///{(self.data_path / 'inscricoes.db').as_posix()}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
