from fastapi import APIRouter, HTTPException, Security
from pydantic import BaseModel, EmailStr
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
import os
from typing import List

router = APIRouter()

# --- VALIDATION SCHEMA ---
class ContactForm(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    message: str

# --- EMAIL CONFIGURATION ---
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS") == "True",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS") == "True",
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

@router.post("/contact")
async def send_contact_email(form_data: ContactForm):
    """
    Receives contact form submission and sends an email to the admin.
    """
    try:
        # Construct the email body
        html = f"""
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> {form_data.first_name} {form_data.last_name}</p>
        <p><strong>Email:</strong> {form_data.email}</p>
        <p><strong>Message:</strong></p>
        <p>{form_data.message}</p>
        <hr>
        <p><em>Reply directly to this email to contact the user (Reply-To is set).</em></p>
        """

        # Prepare the message
        message = MessageSchema(
            subject=f"Infinite BZ Contact: {form_data.first_name} {form_data.last_name}",
            recipients=[os.getenv("MAIL_USERNAME")],  # Send TO the admin
            body=html,
            subtype=MessageType.html,
            reply_to=[form_data.email] # Set Reply-To to the user's email
        )

        # Send the email
        fm = FastMail(conf)
        await fm.send_message(message)

        return {"message": "Email sent successfully"}

    except Exception as e:
        print(f"EMAIL ERROR: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")
