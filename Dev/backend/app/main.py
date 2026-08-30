"""Ponto de entrada da API FastAPI.

Rode com:  uvicorn app.main:app --reload   (a partir da pasta backend/)
Docs interativas:  http://localhost:8000/docs
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.routes import router
from app.config import get_settings
from app.db import init_db
from app.services.repository import get_repository

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("creche-impact-lab")

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    logger.info("Banco pronto: %s", settings.database_url)
    repo = get_repository()
    if repo.disponivel:
        meta = repo.meta
        logger.info(
            "Agregados carregados: %s inscrições, %s unidades, anos %s (gerado %s)",
            meta["inscricoes"],
            meta["unidades"],
            meta["anos"],
            meta["gerado_em"],
        )
    else:
        logger.warning(
            "Agregados AUSENTES em %s. A API sobe, mas as rotas de dados retornarão 503. "
            "Rode: python -m app.etl.build_aggregates",
            settings.data_path,
        )
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Otimizador de Distribuição de Vagas em Creches — API",
    version=__version__,
    description=(
        "Camada de apoio à decisão entre inscrição e convocação na Inscrição Creche "
        "da SME-Rio. Duas frentes: aviso de concorrência para a família (Frente 1) e "
        "motor de cruzamento classificação × preferência para o servidor (Frente 2). "
        "Todos os dados são agregados anonimizados."
    ),
    contact={"name": "Claude Impact Lab"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    repo = get_repository()
    return {
        "status": "ok",
        "versao": __version__,
        "ambiente": settings.env,
        "agregados_disponiveis": repo.disponivel,
    }
