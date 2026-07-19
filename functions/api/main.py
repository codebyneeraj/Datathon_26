"""
Catalyst Advanced I/O entry point.
Routes all incoming requests to the FastAPI application via ASGI-to-WSGI bridge.
"""
import logging
import json
import os
import sys

from flask import Request, make_response

# Ensure the function directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import and initialize FastAPI app
from app.main import app as fastapi_app
from app.database import engine
from app.models import Base

# Convert FastAPI ASGI app to WSGI using a2wsgi
from a2wsgi import ASGIMiddleware
wsgi_app = ASGIMiddleware(fastapi_app)


def handler(request: Request):
    """
    Catalyst Advanced I/O handler with CORS preflight and path normalization.
    Bridges Flask request -> FastAPI ASGI app via WSGI adapter.
    """
    # 1. Handle OPTIONS CORS Preflight Requests immediately
    if request.method == "OPTIONS":
        resp = make_response("", 204)
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "*"
        resp.headers["Access-Control-Max-Age"] = "86400"
        return resp

    try:
        environ = request.environ.copy()

        # Robust path normalization for Catalyst serverless routing
        raw_path = environ.get('PATH_INFO', '')
        clean_path = raw_path

        if clean_path.startswith('/server/api'):
            clean_path = clean_path[len('/server/api'):]
        elif clean_path.startswith('/server'):
            clean_path = clean_path[len('/server'):]

        if not clean_path.startswith('/api') and clean_path != '/' and clean_path != '':
            clean_path = '/api' + clean_path

        if not clean_path:
            clean_path = '/'

        environ['SCRIPT_NAME'] = ''
        environ['PATH_INFO'] = clean_path

        captured_status = [None]
        captured_headers = [None]

        def start_response(status, headers, exc_info=None):
            captured_status[0] = status
            captured_headers[0] = headers

        result = wsgi_app(environ, start_response)
        body = b"".join(result)

        resp = make_response(body)

        if captured_status[0]:
            code = int(captured_status[0].split(" ")[0])
            resp.status_code = code

        if captured_headers[0]:
            for name, value in captured_headers[0]:
                if name.lower() != "content-length":
                    resp.headers[name] = value

        # Explicitly set CORS headers on all responses
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "*"

        return resp

    except Exception as e:
        logger.error(f"Handler error: {e}", exc_info=True)
        err_resp = make_response(
            json.dumps({"error": str(e)}),
            500,
            {"Content-Type": "application/json"}
        )
        err_resp.headers["Access-Control-Allow-Origin"] = "*"
        return err_resp
