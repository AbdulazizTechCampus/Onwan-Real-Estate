# Pydantic Models for Admin Dashboard
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

# Enums
class UserType(str, Enum):
    VISITOR = "visitor"
    PROPERTY_SEEKER = "property_seeker"
    PROPERTY_OWNER = "property_owner"
    BROKER_INDIVIDUAL = "broker_individual"
    BROKER_COMPANY = "broker_company"
    PHOTOGRAPHER = "photographer"
    ADMIN = "admin"

class PropertyStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class PopupType(str, Enum):
    WELCOME = "welcome"
    OFFER = "offer"
    REGISTRATION = "registration"
    ANNOUNCEMENT = "announcement"

class PopupTarget(str, Enum):
    ALL = "all"
    GUESTS = "guests"
    REGISTERED = "registered"
    NEW_VISITORS = "new_visitors"

# Popup Message Schema
class PopupMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    popup_type: PopupType = PopupType.ANNOUNCEMENT
    target_audience: PopupTarget = PopupTarget.ALL
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    display_frequency: str = "once"  # once, always, daily
    priority: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

class PopupMessageCreate(BaseModel):
    title: str
    content: str
    popup_type: PopupType = PopupType.ANNOUNCEMENT
    target_audience: PopupTarget = PopupTarget.ALL
    image_url: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    display_frequency: str = "once"
    priority: int = 0

# Property Request Schema
class PropertyRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_phone: str
    property_type: str  # villa, apartment, land, etc.
    transaction_type: str  # sale, rent
    region: str
    city: str
    district: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_area: Optional[float] = None
    max_area: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    additional_requirements: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    matched_properties: List[str] = []  # List of property IDs that match

class PropertyRequestCreate(BaseModel):
    property_type: str
    transaction_type: str
    region: str
    city: str
    district: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_area: Optional[float] = None
    max_area: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    additional_requirements: Optional[str] = None

# User Interaction Schema (for recommendations)
class UserInteraction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    property_id: str
    interaction_type: str  # view, like, favorite, share, contact
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Match/Recommendation Schema
class PropertyMatch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    property_id: str
    match_score: float  # 0-100
    match_reasons: List[str]
    is_notified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Photography Request Schema
class PhotographyRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_phone: str
    property_address: str
    region: str
    city: str
    preferred_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: str = "pending"  # pending, accepted, completed, cancelled
    photographer_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Admin Dashboard Stats
class DashboardStats(BaseModel):
    total_users: int = 0
    total_properties: int = 0
    total_brokers: int = 0
    total_photographers: int = 0
    pending_properties: int = 0
    active_requests: int = 0
    total_matches: int = 0
    today_visits: int = 0
    new_users_today: int = 0
    new_users_week: int = 0
