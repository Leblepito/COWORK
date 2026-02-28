"""Space request/response schemas."""

from pydantic import BaseModel


class SpaceCreate(BaseModel):
    name: str
    space_type: str  # hot_desk, dedicated_desk, private_office, meeting_room
    capacity: int = 1
    floor: int | None = None
    amenities: str | None = None
    hourly_rate_usd: float | None = None
    daily_rate_usd: float | None = None
    monthly_rate_usd: float | None = None


class SpaceResponse(BaseModel):
    id: int
    name: str
    space_type: str
    capacity: int
    floor: int | None
    amenities: str | None
    hourly_rate_usd: float | None
    daily_rate_usd: float | None
    monthly_rate_usd: float | None
    is_active: bool

    model_config = {"from_attributes": True}


class AvailabilityQuery(BaseModel):
    date: str  # YYYY-MM-DD
    start_hour: int = 8
    end_hour: int = 20
