"""Создание и авторизация Telethon-клиента."""

from __future__ import annotations

from typing import Any

from tg_parser.config import Settings
from tg_parser.utils import audit, log


def build_client(settings: Settings) -> Any:
    """Собирает TelegramClient (без подключения)."""
    try:
        from telethon import TelegramClient
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "Не установлен Telethon. Выполните: pip install -r requirements.txt"
        ) from exc

    kwargs: dict[str, Any] = {}
    if settings.proxy_url:
        kwargs["proxy"] = _parse_proxy(settings.proxy_url)

    client = TelegramClient(
        settings.session,
        settings.api_id,
        settings.api_hash,
        flood_sleep_threshold=settings.flood_sleep_threshold,
        **kwargs,
    )
    return client


async def ensure_authorized(client: Any, settings: Settings) -> Any:
    """Подключается и при необходимости проводит интерактивный вход."""
    await client.connect()
    if not await client.is_user_authorized():
        log.info("Требуется вход в Telegram (код придёт в приложение).")
        await client.start(phone=settings.phone)
    me = await client.get_me()
    audit("login", target=f"@{me.username}" if me.username else str(me.id), user_id=me.id)
    return me


def _parse_proxy(url: str) -> tuple[Any, ...]:
    """socks5://user:pass@host:port | http://host:port -> кортеж для Telethon."""
    import socks  # type: ignore[import-not-found]
    from urllib.parse import urlparse

    parsed = urlparse(url)
    kinds = {
        "socks5": socks.SOCKS5,
        "socks4": socks.SOCKS4,
        "http": socks.HTTP,
        "https": socks.HTTP,
    }
    if parsed.scheme not in kinds:
        raise ValueError(f"Неподдерживаемый прокси: {parsed.scheme}")
    proxy: list[Any] = [kinds[parsed.scheme], parsed.hostname, parsed.port]
    if parsed.username:
        proxy += [True, parsed.username, parsed.password]
    return tuple(proxy)
