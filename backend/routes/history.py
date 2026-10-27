from flask import Blueprint, current_app, jsonify, request

from api_errors import ApiError, error_response
from database import dashboard_stats, delete_operations, list_operations

history_bp = Blueprint("history", __name__)

OPERATIONS = {"sign", "verify"}
RESULTS = {"success", "failure"}


@history_bp.get("/api/history")
def get_history():
    try:
        operation = request.args.get("operation")
        result = request.args.get("result")

        if operation and operation not in OPERATIONS:
            raise ApiError(
                "invalid_filter", "Unknown operation filter.", 400
            )
        if result and result not in RESULTS:
            raise ApiError("invalid_filter", "Unknown result filter.", 400)

        records = list_operations(
            current_app, operation or None, result or None
        )
        return jsonify(records=records)
    except ApiError as error:
        return error_response(error.code, error.message, error.status)
    except Exception:
        return error_response(
            "internal_error",
            "Could not load the activity history.",
            500,
        )


@history_bp.delete("/api/history")
def clear_history():
    try:
        deleted = delete_operations(current_app)
        return jsonify(deleted=deleted)
    except Exception:
        return error_response(
            "internal_error",
            "Could not clear the activity history.",
            500,
        )


@history_bp.get("/api/dashboard/stats")
def get_dashboard_stats():
    try:
        return jsonify(dashboard_stats(current_app))
    except Exception:
        return error_response(
            "internal_error",
            "Could not load dashboard statistics.",
            500,
        )
