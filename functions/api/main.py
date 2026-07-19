"""
Catalyst Advanced I/O entry point.
Wraps the FastAPI application using a2wsgi so Catalyst can invoke it
via its standard Flask-based handler(request) interface.
"""
import logging
import json
import os
import sys

# Add the function directory to path so app module is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Request, make_response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the FastAPI app
from app.main import app as fastapi_app
from app.database import engine
from app.models import Base

# Ensure tables exist
Base.metadata.create_all(bind=engine)

# Use a2wsgi to convert ASGI (FastAPI) to WSGI (Flask-compatible)
try:
    from a2wsgi import ASGIMiddleware
    wsgi_app = ASGIMiddleware(fastapi_app)
except ImportError:
    wsgi_app = None
    logger.warning("a2wsgi not installed, falling back to direct Flask routing")


def handler(request: Request):
    """
    Catalyst Advanced I/O handler function.
    Routes incoming Catalyst requests to the FastAPI backend.
    """
    try:
        if wsgi_app is not None:
            # Use the ASGI-to-WSGI adapter to forward requests
            environ = request.environ.copy()
            response_data = []
            response_status = [None]
            response_headers = [None]

            def start_response(status, headers, exc_info=None):
                response_status[0] = status
                response_headers[0] = headers

            body = wsgi_app(environ, start_response)
            response_body = b"".join(body)

            resp = make_response(response_body)
            if response_status[0]:
                status_code = int(response_status[0].split(" ")[0])
                resp.status_code = status_code
            if response_headers[0]:
                for header_name, header_value in response_headers[0]:
                    resp.headers[header_name] = header_value
            return resp
        else:
            # Fallback: simple JSON response
            return make_response(
                json.dumps({
                    "status": "online",
                    "message": "Crime Intelligence API - a2wsgi adapter not available"
                }),
                200,
                {"Content-Type": "application/json"}
            )
    except Exception as e:
        logger.error(f"Handler error: {e}", exc_info=True)
        return make_response(
            json.dumps({"error": str(e)}),
            500,
            {"Content-Type": "application/json"}
        )
