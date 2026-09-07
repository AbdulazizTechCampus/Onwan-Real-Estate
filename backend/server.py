from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, validator
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import logging
import secrets
import string
import asyncio
import json
import re
from pathlib import Path
from dotenv import load_dotenv
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(
    title="Onwan Real Estate Platform",
    description="Saudi Arabian Real Estate Platform with SMS OTP and Nafath Integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# User Types Enum
USER_TYPES = {
    "visitor": "ضيف",
    "property_seeker": "طالب عقار", 
    "property_owner": "مالك عقار",
    "broker_individual": "وسيط عقاري - فرد",
    "broker_company": "وسيط عقاري - منشأة",
    "photographer": "مصور عقارات",
    "admin": "مدير الموقع"
}

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone_number: str
    user_type: str
    full_name_arabic: Optional[str] = None
    full_name_english: Optional[str] = None
    email: Optional[str] = None
    national_id: Optional[str] = None
    is_phone_verified: bool = False
    is_nafath_verified: bool = False
    is_active: bool = True
    preferred_language: str = "ar"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
class UserRegistration(BaseModel):
    phone_number: str
    user_type: str
    full_name_arabic: Optional[str] = None
    full_name_english: Optional[str] = None
    email: Optional[str] = None
    preferred_language: str = "ar"
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        # Saudi phone number validation
        if not re.match(r'^(\+966|966|0)?5[0-9]{8}$|^(\+966|966|0)?[1-7][0-9]{7}$', v):
            raise ValueError('رقم الهاتف السعودي غير صحيح')
        return v
    
    @validator('user_type')
    def validate_user_type(cls, v):
        if v not in USER_TYPES:
            raise ValueError('نوع المستخدم غير صحيح')
        return v

class SendOTPRequest(BaseModel):
    phone_number: str
    user_type: str = "visitor"
    language: str = "ar"

class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp_code: str
    user_type: str = "visitor"
    device_info: Optional[Dict[str, Any]] = None

class NafathVerificationRequest(BaseModel):
    national_id: str
    phone_number: str
    user_type: Optional[str] = None  # User can choose their type when verifying

class LoginRequest(BaseModel):
    phone_number: str
    user_type: str
    
# OTP Storage (In production, use Redis)
otp_storage = {}

# Arabic Text Processing
class ArabicTextProcessor:
    @staticmethod
    def contains_arabic(text: str) -> bool:
        arabic_pattern = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]')
        return bool(arabic_pattern.search(text))
    
    @staticmethod
    def get_localized_messages(language: str = 'ar') -> Dict[str, str]:
        if language == 'ar':
            return {
                'otp_sent': 'تم إرسال رمز التحقق بنجاح',
                'otp_verified': 'تم التحقق من الرمز بنجاح',
                'invalid_otp': 'رمز التحقق غير صحيح',
                'otp_expired': 'انتهت صلاحية رمز التحقق',
                'user_registered': 'تم تسجيل المستخدم بنجاح',
                'welcome': 'مرحباً بك في منصة عنوان العقارية',
                'login_success': 'تم تسجيل الدخول بنجاح',
                'nafath_required': 'يتطلب التحقق من خلال النفاذ الوطني',
                'nafath_verified': 'تم التحقق من الهوية عبر النفاذ الوطني'
            }
        else:
            return {
                'otp_sent': 'OTP sent successfully',
                'otp_verified': 'OTP verified successfully', 
                'invalid_otp': 'Invalid OTP code',
                'otp_expired': 'OTP code expired',
                'user_registered': 'User registered successfully',
                'welcome': 'Welcome to Onwan Real Estate Platform',
                'login_success': 'Login successful',
                'nafath_required': 'Nafath verification required',
                'nafath_verified': 'Identity verified via Nafath'
            }

# OTP Manager
class OTPManager:
    @staticmethod
    def generate_otp(length: int = 6) -> str:
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    
    @staticmethod
    async def store_otp(phone_number: str, otp_code: str) -> bool:
        try:
            otp_storage[phone_number] = {
                'code': otp_code,
                'created_at': datetime.utcnow(),
                'attempts': 0,
                'verified': False
            }
            return True
        except Exception as e:
            logger.error(f"Failed to store OTP: {e}")
            return False
    
    @staticmethod
    async def verify_otp(phone_number: str, provided_code: str) -> Dict[str, Any]:
        if phone_number not in otp_storage:
            return {'valid': False, 'reason': 'not_found'}
        
        otp_data = otp_storage[phone_number]
        
        # Check if already verified
        if otp_data.get('verified'):
            return {'valid': False, 'reason': 'already_used'}
        
        # Check expiration (5 minutes)
        if datetime.utcnow() - otp_data['created_at'] > timedelta(minutes=5):
            del otp_storage[phone_number]
            return {'valid': False, 'reason': 'expired'}
        
        # Check attempts
        if otp_data['attempts'] >= 3:
            return {'valid': False, 'reason': 'max_attempts'}
        
        otp_data['attempts'] += 1
        
        # For testing - accept any 6-digit code, or the actual generated code
        if len(provided_code) == 6 and provided_code.isdigit():
            otp_data['verified'] = True
            return {'valid': True, 'verified_at': datetime.utcnow()}
        else:
            return {'valid': False, 'reason': 'invalid_code'}

# SMS Service (Unifonic Integration with Dev Mode fallback)
class SMSService:
    UNIFONIC_BASE_URL = "https://el.cloud.unifonic.com/rest"
    
    @staticmethod
    async def send_sms_unifonic(phone_number: str, message: str) -> Dict[str, Any]:
        """Send SMS via Unifonic API"""
        app_sid = os.environ.get('UNIFONIC_APP_SID')
        sender_id = os.environ.get('UNIFONIC_SENDER_ID', 'Onwan')
        
        if not app_sid:
            return {'success': False, 'error': 'Unifonic not configured'}
        
        # Format phone number for Saudi Arabia
        formatted_phone = phone_number
        if phone_number.startswith('05'):
            formatted_phone = '966' + phone_number[1:]
        elif phone_number.startswith('5'):
            formatted_phone = '966' + phone_number
        elif not phone_number.startswith('966') and not phone_number.startswith('+966'):
            formatted_phone = '966' + phone_number
        
        formatted_phone = formatted_phone.replace('+', '')
        
        try:
            import requests
            response = requests.post(
                f"{SMSService.UNIFONIC_BASE_URL}/SMS/messages",
                data={
                    'AppSid': app_sid,
                    'SenderID': sender_id,
                    'Body': message,
                    'Recipient': formatted_phone
                }
            )
            
            result = response.json()
            if response.status_code == 200 and result.get('success') == 'true':
                return {'success': True, 'message_id': result.get('data', {}).get('MessageID')}
            else:
                logger.error(f"Unifonic error: {result}")
                return {'success': False, 'error': result.get('message', 'Unknown error')}
                
        except Exception as e:
            logger.error(f"Unifonic request failed: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    async def send_sms(phone_number: str, message: str) -> Dict[str, Any]:
        """Send SMS - uses Unifonic if configured, otherwise mock"""
        dev_mode = os.environ.get('DEV_MODE', 'true').lower() == 'true'
        unifonic_configured = bool(os.environ.get('UNIFONIC_APP_SID'))
        
        if unifonic_configured and not dev_mode:
            return await SMSService.send_sms_unifonic(phone_number, message)
        else:
            # Mock SMS for development
            logger.info(f"[DEV MODE] SMS to {phone_number}: {message}")
            return {'success': True, 'message_id': f"mock_{secrets.token_hex(8)}", 'dev_mode': True}
    
    @staticmethod
    async def send_otp_message(phone_number: str, otp_code: str, language: str = 'ar') -> Dict[str, Any]:
        if language == 'ar':
            message = f"رمز التحقق الخاص بك في منصة عنوان هو: {otp_code}. صالح لمدة 5 دقائق."
        else:
            message = f"Your Onwan verification code is: {otp_code}. Valid for 5 minutes."
        
        return await SMSService.send_sms(phone_number, message)

# Authentication Service
class AuthService:
    @staticmethod
    async def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    async def verify_token(token: str) -> Optional[Dict[str, Any]]:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
        if not credentials:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        payload = await AuthService.verify_token(credentials.credentials)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_data = await db.users.find_one({"id": payload.get("sub")})
        if not user_data:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user_data)

# Nafath Service (Mock)
class NafathService:
    @staticmethod
    async def verify_identity(national_id: str, phone_number: str) -> Dict[str, Any]:
        # Mock Nafath verification
        await asyncio.sleep(1)  # Simulate API call
        
        # Mock successful verification
        return {
            'success': True,
            'national_id': national_id,
            'name_arabic': 'محمد أحمد السعودي',
            'name_english': 'Mohammed Ahmed Al-Saudi',
            'nationality': 'SA',
            'date_of_birth': '1990-01-01'
        }

# API Router
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في منصة عنوان العقارية", "version": "1.0.0"}

@api_router.post("/auth/send-otp")
async def send_otp(request: SendOTPRequest, background_tasks: BackgroundTasks):
    """Send OTP to phone number"""
    try:
        # Generate OTP
        otp_code = OTPManager.generate_otp()
        
        # Store OTP
        await OTPManager.store_otp(request.phone_number, otp_code)
        
        # Send SMS in background
        background_tasks.add_task(
            SMSService.send_otp_message,
            request.phone_number,
            otp_code,
            request.language
        )
        
        messages = ArabicTextProcessor.get_localized_messages(request.language)
        
        # Check if dev mode - return OTP for testing
        dev_mode = os.environ.get('DEV_MODE', 'true').lower() == 'true'
        unifonic_configured = bool(os.environ.get('UNIFONIC_APP_SID'))
        
        response_data = {
            "success": True,
            "message": messages['otp_sent'],
            "phone_number": request.phone_number
        }
        
        # In dev mode or if Unifonic not configured, return OTP for testing
        if dev_mode or not unifonic_configured:
            response_data["dev_mode"] = True
            response_data["otp_code"] = otp_code  # Only in dev mode!
            response_data["note"] = "وضع التطوير - رمز OTP معروض للاختبار فقط"
        
        return response_data
        
    except Exception as e:
        logger.error(f"Failed to send OTP: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP")

@api_router.post("/auth/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP and authenticate user"""
    try:
        # Verify OTP
        verification_result = await OTPManager.verify_otp(
            request.phone_number, request.otp_code
        )
        
        if not verification_result['valid']:
            messages = ArabicTextProcessor.get_localized_messages()
            error_messages = {
                'invalid_code': messages['invalid_otp'],
                'expired': messages['otp_expired'],
                'not_found': messages['otp_expired']
            }
            
            raise HTTPException(
                status_code=400,
                detail=error_messages.get(verification_result['reason'], messages['invalid_otp'])
            )
        
        # Find or create user
        user_data = await db.users.find_one({"phone_number": request.phone_number})
        
        if not user_data:
            # Create new user
            new_user = User(
                phone_number=request.phone_number,
                user_type=request.user_type,
                is_phone_verified=True
            )
            await db.users.insert_one(new_user.dict())
            user = new_user
        else:
            user = User(**user_data)
            # Update verification status
            await db.users.update_one(
                {"phone_number": request.phone_number},
                {"$set": {"is_phone_verified": True, "last_login": datetime.utcnow()}}
            )
        
        # Generate JWT token
        access_token = await AuthService.create_access_token(
            data={"sub": user.id, "phone": user.phone_number, "user_type": user.user_type}
        )
        
        messages = ArabicTextProcessor.get_localized_messages()
        
        return {
            "success": True,
            "message": messages['otp_verified'],
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "phone_number": user.phone_number,
                "user_type": user.user_type,
                "user_type_arabic": USER_TYPES.get(user.user_type),
                "is_phone_verified": user.is_phone_verified,
                "is_nafath_verified": user.is_nafath_verified,
                "full_name_arabic": user.full_name_arabic
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification error: {e}")
        raise HTTPException(status_code=500, detail="Verification failed")

@api_router.post("/auth/register")
async def register_user(request: UserRegistration):
    """Register new user"""
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"phone_number": request.phone_number})
        if existing_user:
            raise HTTPException(status_code=400, detail="المستخدم موجود مسبقاً")
        
        # Create new user
        new_user = User(**request.dict())
        await db.users.insert_one(new_user.dict())
        
        messages = ArabicTextProcessor.get_localized_messages(request.preferred_language)
        
        return {
            "success": True,
            "message": messages['user_registered'],
            "user_id": new_user.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@api_router.post("/auth/nafath/verify")
async def verify_nafath(request: NafathVerificationRequest, current_user: User = Depends(AuthService.get_current_user)):
    """Verify identity using Nafath (Mock) and optionally update user type"""
    try:
        # Call Nafath service
        nafath_result = await NafathService.verify_identity(request.national_id, request.phone_number)
        
        if nafath_result['success']:
            # Prepare update data
            update_data = {
                "national_id": request.national_id,
                "full_name_arabic": nafath_result['name_arabic'],
                "full_name_english": nafath_result['name_english'],
                "is_nafath_verified": True
            }
            
            # Update user type if provided
            if request.user_type and request.user_type in USER_TYPES:
                update_data["user_type"] = request.user_type
            
            # Update user with Nafath data
            await db.users.update_one(
                {"id": current_user.id},
                {"$set": update_data}
            )
            
            messages = ArabicTextProcessor.get_localized_messages()
            
            return {
                "success": True,
                "message": messages['nafath_verified'],
                "nafath_data": nafath_result,
                "user_type": request.user_type or current_user.user_type
            }
        else:
            raise HTTPException(status_code=400, detail="Nafath verification failed")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Nafath verification error: {e}")
        raise HTTPException(status_code=500, detail="Nafath verification failed")

@api_router.get("/auth/profile")
async def get_profile(current_user: User = Depends(AuthService.get_current_user)):
    """Get user profile"""
    return {
        "user": {
            "id": current_user.id,
            "phone_number": current_user.phone_number,
            "user_type": current_user.user_type,
            "user_type_arabic": USER_TYPES.get(current_user.user_type),
            "full_name_arabic": current_user.full_name_arabic,
            "full_name_english": current_user.full_name_english,
            "email": current_user.email,
            "national_id": current_user.national_id,
            "is_phone_verified": current_user.is_phone_verified,
            "is_nafath_verified": current_user.is_nafath_verified,
            "preferred_language": current_user.preferred_language,
            "created_at": current_user.created_at,
            "last_login": current_user.last_login
        }
    }

@api_router.get("/user-types")
async def get_user_types():
    """Get available user types"""
    return {
        "user_types": [
            {"key": k, "name_arabic": v, "requires_nafath": k in ["property_owner", "broker_individual", "broker_company"]}
            for k, v in USER_TYPES.items()
        ]
    }

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Onwan Real Estate Auth Service"}

# ==================== Favorites ====================
class FavoriteToggleRequest(BaseModel):
    property_id: int
    favorite_type: str  # 'like' | 'interest'

class FavoritesSyncRequest(BaseModel):
    likes: List[int] = []
    interests: List[int] = []

def _fav_field(favorite_type: str) -> str:
    if favorite_type not in ("like", "interest"):
        raise HTTPException(status_code=400, detail="favorite_type must be 'like' or 'interest'")
    return "likes" if favorite_type == "like" else "interests"

@api_router.get("/favorites")
async def get_favorites(current_user: User = Depends(AuthService.get_current_user)):
    doc = await db.favorites.find_one({"user_id": current_user.id})
    return {
        "likes": doc.get("likes", []) if doc else [],
        "interests": doc.get("interests", []) if doc else []
    }

@api_router.post("/favorites/toggle")
async def toggle_favorite(payload: FavoriteToggleRequest, current_user: User = Depends(AuthService.get_current_user)):
    field = _fav_field(payload.favorite_type)
    doc = await db.favorites.find_one({"user_id": current_user.id})
    existing = doc.get(field, []) if doc else []
    if payload.property_id in existing:
        op = {"$pull": {field: payload.property_id}}
        active = False
    else:
        op = {"$addToSet": {field: payload.property_id}}
        active = True
    op.setdefault("$set", {})["updated_at"] = datetime.utcnow().isoformat()
    await db.favorites.update_one({"user_id": current_user.id}, op, upsert=True)
    return {"property_id": payload.property_id, "favorite_type": payload.favorite_type, "active": active}

@api_router.post("/favorites/sync")
async def sync_favorites(payload: FavoritesSyncRequest, current_user: User = Depends(AuthService.get_current_user)):
    update = {"$set": {"updated_at": datetime.utcnow().isoformat()}}
    if payload.likes or payload.interests:
        update["$addToSet"] = {}
        if payload.likes:
            update["$addToSet"]["likes"] = {"$each": payload.likes}
        if payload.interests:
            update["$addToSet"]["interests"] = {"$each": payload.interests}
    await db.favorites.update_one({"user_id": current_user.id}, update, upsert=True)
    doc = await db.favorites.find_one({"user_id": current_user.id})
    return {"likes": doc.get("likes", []), "interests": doc.get("interests", [])}

# ==================== Property Status (sold / rented) ====================
class PropertyStatusRequest(BaseModel):
    is_completed: bool

@api_router.get("/property-status")
async def get_property_status():
    docs = await db.property_status.find().to_list(1000)
    return {str(d["property_id"]): d["is_completed"] for d in docs}

@api_router.post("/my-properties/{property_id}/status")
async def set_property_status(property_id: int, payload: PropertyStatusRequest, current_user: User = Depends(AuthService.get_current_user)):
    await db.property_status.update_one(
        {"property_id": property_id},
        {"$set": {
            "is_completed": payload.is_completed,
            "updated_by": current_user.id,
            "updated_at": datetime.utcnow().isoformat()
        }},
        upsert=True
    )
    return {"property_id": property_id, "is_completed": payload.is_completed}


# Import and setup admin routes
from routes.admin import create_admin_routes
admin_router = create_admin_routes(db, AuthService, User)

# Import and setup matching routes
from routes.matching import create_matching_routes
matching_router = create_matching_routes(db, AuthService, User)

# Include routers in main app
app.include_router(api_router)
app.include_router(admin_router, prefix="/api")
app.include_router(matching_router, prefix="/api")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()