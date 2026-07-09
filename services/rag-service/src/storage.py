"""MinIO-Ablage für Original-Dokumente (pro Tenant ein Prefix)."""

import io

from minio import Minio

from .config import Settings

_client: Minio | None = None
_bucket: str = ""


def init_storage(settings: Settings) -> None:
    global _client, _bucket
    _client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,  # interner Docker-Verkehr; TLS terminiert am Reverse Proxy
    )
    _bucket = settings.minio_bucket
    if not _client.bucket_exists(_bucket):
        _client.make_bucket(_bucket)


def put_object(key: str, data: bytes, content_type: str) -> None:
    assert _client is not None
    _client.put_object(
        _bucket, key, io.BytesIO(data), length=len(data), content_type=content_type
    )


def get_object(key: str) -> bytes:
    assert _client is not None
    resp = _client.get_object(_bucket, key)
    try:
        return resp.read()
    finally:
        resp.close()
        resp.release_conn()


def delete_object(key: str) -> None:
    assert _client is not None
    _client.remove_object(_bucket, key)
