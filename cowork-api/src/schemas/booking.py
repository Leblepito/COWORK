"""Booking request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, field_validator


class BookingCreate(BaseModel):
    space_id: int
    start_time: datetime
    end_time: datetime
    notes: str | None = None

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v, info):
        if "start_time" in info.data and v <= info.data["start_time"]:
            raise ValueError("end_time must be after start_time")
        return v


class BookingUpdate(BaseModel):
    start_time: datetime | None = None
    end_time: datetime | None = None
    notes: str | None = None


class BookingResponse(BaseModel):
    id: int
    user_id: int
    space_id: int
    start_time: datetime
    end_time: datetime
    status: str
    check_in_time: datetime | None
    check_out_time: datetime | None
    amount_usd: float | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
