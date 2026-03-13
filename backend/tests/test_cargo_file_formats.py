"""
TDD: Cargo upload çok formatlı dosya desteği testleri.
Excel, PDF, Word, CSV, görsel, ZIP vb. formatlar kabul edilmeli.
"""
import io
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_extract_text_from_csv():
    """CSV dosyasından metin çıkarılabilmeli."""
    from cargo.file_extractor import extract_text
    csv_bytes = b"isim,soyisim,maas\nAhmet,Yilmaz,5000\nMehmet,Kaya,6000"
    result = extract_text(csv_bytes, "data.csv", "text/csv")
    assert "Ahmet" in result
    assert "maas" in result


def test_extract_text_from_excel():
    """Excel dosyasından metin çıkarılabilmeli (openpyxl)."""
    from cargo.file_extractor import extract_text
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Satislar"
    ws.append(["Urun", "Adet", "Fiyat"])
    ws.append(["Laptop", 10, 15000])
    ws.append(["Mouse", 50, 200])
    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()
    result = extract_text(excel_bytes, "satislar.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    assert "Laptop" in result or "Satislar" in result or "Urun" in result


def test_extract_text_from_plain_text():
    """Düz metin dosyası olduğu gibi döndürülmeli."""
    from cargo.file_extractor import extract_text
    txt_bytes = "Bu bir test dosyasıdır. Trade analizi yapılacak.".encode("utf-8")
    result = extract_text(txt_bytes, "notes.txt", "text/plain")
    assert "Trade" in result or "trade" in result.lower()


def test_extract_text_from_json():
    """JSON dosyasından metin çıkarılabilmeli."""
    from cargo.file_extractor import extract_text
    import json
    data = {"type": "booking", "hotel": "Grand Istanbul", "rooms": 3}
    json_bytes = json.dumps(data).encode("utf-8")
    result = extract_text(json_bytes, "booking.json", "application/json")
    assert "booking" in result or "Grand Istanbul" in result


def test_extract_text_from_binary_image_returns_metadata():
    """Görsel dosyası için metadata döndürülmeli, hata verilmemeli."""
    from cargo.file_extractor import extract_text
    # Minimal PNG header
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    result = extract_text(png_bytes, "photo.png", "image/png")
    # Hata vermemeli, en azından dosya adını içermeli
    assert result is not None
    assert isinstance(result, str)
    assert len(result) > 0


def test_extract_text_from_unknown_binary_returns_metadata():
    """Bilinmeyen binary dosya için metadata döndürülmeli."""
    from cargo.file_extractor import extract_text
    binary = bytes(range(256)) * 10
    result = extract_text(binary, "data.bin", "application/octet-stream")
    assert result is not None
    assert isinstance(result, str)


def test_extract_text_size_limit():
    """Büyük dosyalar 50000 karakterde kesilmeli."""
    from cargo.file_extractor import extract_text
    big_text = ("A" * 1000 + "\n") * 200  # ~200KB
    result = extract_text(big_text.encode("utf-8"), "big.txt", "text/plain")
    assert len(result) <= 50000


def test_extract_text_from_xls():
    """Eski .xls formatı da desteklenmeli (xlrd veya fallback)."""
    from cargo.file_extractor import extract_text
    # .xls binary magic bytes
    xls_magic = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
    result = extract_text(xls_magic + b"\x00" * 100, "old.xls", "application/vnd.ms-excel")
    # Hata vermemeli
    assert result is not None
    assert isinstance(result, str)
