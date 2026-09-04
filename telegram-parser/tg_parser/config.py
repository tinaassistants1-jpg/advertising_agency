"""Конфигурация: читается из окружения и файла .env."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_ENV_FILE = ".env"


def load_env_file(path: str | os.PathLike[str] = DEFAULT_ENV_FILE) -> None:
    """Подгружает KEY=VALUE из .env, не перетирая уже заданные переменные."""
    env_path = Path(path)
    if not env_path.is_file():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'\"")
        os.environ.setdefault(key, value)


class ConfigError(RuntimeError):
    """Не хватает обязательных настроек."""


@dataclass(frozen=True)
class Settings:
    api_id: int
    api_hash: str
    session: str = "tg_parser"
    phone: str | None = None
    # Пауза между «тяжёлыми» запросами, чтобы не ловить FloodWait.
    request_delay: float = 0.7
    # Telethon сам спит при FloodWait короче этого порога (секунды).
    flood_sleep_threshold: int = 60
    # Сколько раз повторять сбор после длинного FloodWait.
    max_retries: int = 3
    proxy_url: str | None = None

    @classmethod
    def from_env(cls, env_file: str | os.PathLike[str] = DEFAULT_ENV_FILE) -> "Settings":
        load_env_file(env_file)
        api_id = os.environ.get("TG_API_ID", "").strip()
        api_hash = os.environ.get("TG_API_HASH", "").strip()
        if not api_id or not api_hash:
            raise ConfigError(
                "Не заданы TG_API_ID / TG_API_HASH. "
                "Получите их на https://my.telegram.org -> API development tools "
                "и запишите в .env (см. .env.example)."
            )
        if not api_id.isdigit():
            raise ConfigError(f"TG_API_ID должен быть числом, получено: {api_id!r}")
        return cls(
            api_id=int(api_id),
            api_hash=api_hash,
            session=os.environ.get("TG_SESSION", "tg_parser").strip() or "tg_parser",
            phone=os.environ.get("TG_PHONE") or None,
            request_delay=_float_env("TG_REQUEST_DELAY", 0.7),
            flood_sleep_threshold=int(_float_env("TG_FLOOD_SLEEP_THRESHOLD", 60)),
            max_retries=int(_float_env("TG_MAX_RETRIES", 3)),
            proxy_url=os.environ.get("TG_PROXY_URL") or None,
        )


def _float_env(name: str, default: float) -> float:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default
