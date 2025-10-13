# filePath: lambdas/src/utils/logger.py
import logging
import json
from typing import Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def log_with_context(level: str, message: str, request_id: str = "", **kwargs: Any) -> None:
    """Log message with request_id and optional extra fields."""
    log_data: dict[str, Any] = {"message": message, "request_id": request_id, **kwargs}
    log_message = json.dumps(log_data)
    
    if level == "INFO":
        logger.info(log_message)
    elif level == "ERROR":
        logger.error(log_message)
    elif level == "DEBUG":
        logger.debug(log_message)
    elif level == "WARNING":
        logger.warning(log_message)
