import structlog
import logging


def configure_logging(level: str = "INFO", service_name: str = "drk-service") -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
    )
    # COMPLIANCE: Kein Logging von Prompt-Inhalten — nur strukturierte Metadaten


def get_logger(name: str) -> structlog.BoundLogger:
    return structlog.get_logger(name)
