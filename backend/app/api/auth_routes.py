from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_session
from app.models.schemas import User, UserCreate, UserRead, Token, GoogleToken
from app.auth import get_current_user
from app.services.auth_service import AuthService

# Forgot Password DTOs
from pydantic import BaseModel, EmailStr
class ForgotPasswordRequest(BaseModel):
    email: EmailStr
class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(session)

@router.post("/register", response_model=UserRead)
async def register(user: UserCreate, service: AuthService = Depends(get_auth_service)):
    return await service.register_user(user)

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), service: AuthService = Depends(get_auth_service)):
    # OAuth2 specifies 'username' as the field for email
    return await service.login_user(form_data.username, form_data.password)

@router.post("/google", response_model=Token)
async def google_login(token_data: GoogleToken, service: AuthService = Depends(get_auth_service)):
    return await service.google_login(token_data)

@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, service: AuthService = Depends(get_auth_service)):
    return await service.forgot_password_request(request.email)

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, service: AuthService = Depends(get_auth_service)):
    return await service.reset_password(request.email, request.otp, request.new_password)

# --- Email Verification Endpoints ---
from app.core.email_utils import send_verification_email
import secrets
from datetime import datetime, timedelta

# In-memory storage for verification OTPs (Simple, Non-Persistent)
# Format: {email: {"otp": "123456", "expires_at": datetime}}
pending_verifications = {}

class VerificationRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

@router.post("/verify-email/send")
async def send_verification(request: VerificationRequest, service: AuthService = Depends(get_auth_service)):
    # 1. Check if user already exists
    statement = select(User).where(User.email == request.email)
    result = await service.session.execute(statement)
    if result.scalars().first():
         raise HTTPException(status_code=400, detail="Email already registered. Please login.")

    # 2. Generate OTP
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    
    # 3. Store in memory
    pending_verifications[request.email] = {
        "otp": otp,
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    }

    # 4. Send Email
    success = await send_verification_email(request.email, otp)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send verification email.")

    return {"message": "Verification code sent to your email."}

@router.post("/verify-email/check")
async def check_verification(request: VerifyOTPRequest):
    record = pending_verifications.get(request.email)
    
    if not record:
        raise HTTPException(status_code=400, detail="No verification request found for this email.")
    
    if record["otp"] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
        
    if datetime.utcnow() > record["expires_at"]:
        del pending_verifications[request.email]
        raise HTTPException(status_code=400, detail="Verification code expired.")
    
    # Success - Cleanup
    del pending_verifications[request.email]
    
    return {"message": "Email verified successfully!", "verified": True}
