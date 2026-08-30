"""Camada de persistência.

Por padrão usa **SQLite** — um arquivo (`app/data/inscricoes.db`), sem servidor e sem
credenciais. Em produção, aponte `CIV_DB_URL` para um Postgres/MySQL gerido pela TI.

As inscrições enviadas (dados cadastrais + situação social) ficam guardadas aqui, com o
protocolo como chave. Este arquivo NÃO é versionado (.gitignore) porque contém dados
pessoais de teste.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Iterator

from sqlalchemy import String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.config import get_settings

_settings = get_settings()
_is_sqlite = _settings.database_url.startswith("sqlite")

engine = create_engine(
    _settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)
SessionFactory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class InscricaoRegistro(Base):
    """Uma inscrição de creche efetivamente enviada."""

    __tablename__ = "inscricoes"

    protocolo: Mapped[str] = mapped_column(String(16), primary_key=True)
    criado_em: Mapped[dt.datetime] = mapped_column(default=lambda: dt.datetime.now(dt.UTC))
    ano_processo: Mapped[int]
    situacao: Mapped[str] = mapped_column(String(32), default="registrada")
    grupamento_sugerido: Mapped[str | None] = mapped_column(String(32), default=None)
    candidato_nome: Mapped[str] = mapped_column(String(200))
    responsavel_nome: Mapped[str] = mapped_column(String(200))
    n_opcoes: Mapped[int] = mapped_column(default=0)
    n_criterios_sim: Mapped[int] = mapped_column(default=0)
    # JSON completo — dados cadastrais + situação social + opções + comprovante
    dados_json: Mapped[str] = mapped_column()
    comprovante_json: Mapped[str] = mapped_column()


def init_db() -> None:
    if _is_sqlite:
        (_settings.data_path).mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with SessionFactory() as session:
        yield session
