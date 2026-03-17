from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles


BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
STATIC_INDEX_FILE = STATIC_DIR / "index.html"
FRONTEND_DIST_DIR = BASE_DIR / "frontend" / "dist"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"

app = FastAPI(title="OshiNoGo Hiragana Muscle Trainer")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR, check_dir=False), name="assets")


def has_frontend_dist() -> bool:
    return FRONTEND_INDEX_FILE.is_file() and FRONTEND_ASSETS_DIR.is_dir()


def get_index_file() -> Path | None:
    if has_frontend_dist():
        return FRONTEND_INDEX_FILE
    if STATIC_INDEX_FILE.is_file():
        return STATIC_INDEX_FILE
    return None


def get_frontend_file(full_path: str) -> Path | None:
    if not has_frontend_dist():
        return None

    requested_file = (FRONTEND_DIST_DIR / full_path).resolve()
    try:
        requested_file.relative_to(FRONTEND_DIST_DIR.resolve())
    except ValueError:
        return None

    if requested_file.is_file():
        return requested_file

    return None


def build_index_response() -> Response:
    index_file = get_index_file()
    if index_file is None:
        return JSONResponse(
            {
                "ok": False,
                "detail": "No index.html available.",
                "frontend_dist_ready": has_frontend_dist(),
                "static_fallback_ready": STATIC_INDEX_FILE.is_file(),
            },
            status_code=503,
        )

    return FileResponse(index_file)


@app.get("/healthz")
async def healthz() -> JSONResponse:
    index_file = get_index_file()
    serving_from = None
    if index_file == FRONTEND_INDEX_FILE:
        serving_from = "frontend-dist"
    elif index_file == STATIC_INDEX_FILE:
        serving_from = "static"

    ok = index_file is not None
    return JSONResponse(
        {
            "ok": ok,
            "serving_from": serving_from,
            "frontend_dist_ready": has_frontend_dist(),
            "frontend_assets_ready": FRONTEND_ASSETS_DIR.is_dir(),
            "static_fallback_ready": STATIC_INDEX_FILE.is_file(),
            "index_file": str(index_file.relative_to(BASE_DIR)) if index_file else None,
        },
        status_code=200 if ok else 503,
    )


@app.get("/")
async def index() -> Response:
    return build_index_response()


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str) -> Response:
    if full_path.startswith(("assets/", "static/")):
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    frontend_file = get_frontend_file(full_path)
    if frontend_file is not None:
        return FileResponse(frontend_file)

    return build_index_response()


def run() -> None:
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )


if __name__ == "__main__":
    run()
