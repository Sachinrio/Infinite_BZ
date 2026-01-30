from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
import os
from dotenv import load_dotenv
import qrcode
import base64
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
import tempfile

load_dotenv() # Load variables from .env file

# Configuration: Read from Environment Variables
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME) # Default to username if not set
MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")

# Check for Real SMTP and valid credentials
ENABLE_EMAIL = bool(MAIL_USERNAME and MAIL_PASSWORD and not MAIL_USERNAME.startswith("your_") and not MAIL_PASSWORD.startswith("your_"))

conf = None
if ENABLE_EMAIL:
    try:
        conf = ConnectionConfig(
            MAIL_USERNAME = MAIL_USERNAME,
            MAIL_PASSWORD = MAIL_PASSWORD,
            MAIL_FROM = MAIL_FROM,
            MAIL_PORT = MAIL_PORT,
            MAIL_SERVER = MAIL_SERVER,
            MAIL_STARTTLS = True,
            MAIL_SSL_TLS = False,
            USE_CREDENTIALS = True,
            VALIDATE_CERTS = True
        )
    except Exception as e:
        print(f"CRITICAL: Email configuration failed: {e}")
        # We generally don't want to crash app import, but this disables email features.
        ENABLE_EMAIL = False
else:
    print("WARNING: MAIL_USERNAME or MAIL_PASSWORD missing or using placeholder values in .env. Email sending is DISABLED.")

async def send_reset_email(email: EmailStr, otp: str):
    """
    Sends the reset OTP via Real SMTP.
    """
    if not ENABLE_EMAIL:
        print(f"FAILED TO SEND EMAIL to {email}: Email credentials not configured.")
        return False

    print(f"Sending OTP email to {email} via {MAIL_SERVER}...")
    try:
        message = MessageSchema(
            subject="Password Reset Request - Infinite BZ",
            recipients=[email],
            body=f"""
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                    <div style="max-w-md: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                        <h2 style="color: #333;">Password Reset</h2>
                        <p>You requested a password reset for Infinite BZ.</p>
                        <p>Your OTP code is:</p>
                        <h1 style="color: #22d3ee; font-size: 32px; letter-spacing: 5px;">{otp}</h1>
                        <p>This code expires in 10 minutes.</p>
                        <p style="font-size: 12px; color: #888;">If you didn't request this, please ignore this email.</p>
                    </div>
                </body>
            </html>
            """,
            subtype=MessageType.html
        )
        fm = FastMail(conf)
        await fm.send_message(message)
        print("Email sent successfully.")
        return True
    except Exception as e:
        print(f"EXTREME ERROR: Failed to send email via SMTP: {e}")
        return False

async def send_ticket_email(email: EmailStr, name: str, event_title: str, event_id: int):
    """
    Sends the Ticket Email via Real SMTP using fastapi-mail.
    """
    if not ENABLE_EMAIL:
        print(f"FAILED TO SEND TICKET to {email}: Email credentials not configured.")
        return False

    print(f"Sending Ticket to {email} via {MAIL_SERVER}...")
    try:
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                    <h2 style="color: #0F172A;">Successfully Registered: {event_title}</h2>
                    <p>Hi {name},</p>
                    <p>Thank you for registering! We are excited to see you.</p>
                    <br/>
                    <div style="text-align: center;">
                        <a href="http://localhost:5174/?view=ticket-details&eventId={event_id}&email={email}" style="background-color: #38BDF8; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; border-radius: 5px;">Go to Ticket</a>
                    </div>
                    <br/>
                    <p style="font-size: 12px; color: #888;">Powered by Infinite BZ Event Platform</p>
                </div>
            </body>
        </html>
        """
        
        message = MessageSchema(
            subject=f"Successfully Registered: {event_title}",
            recipients=[email],
            body=body,
            subtype=MessageType.html
        )
        
        fm = FastMail(conf)
        await fm.send_message(message)
        print("Ticket Email sent successfully.")
        return True
    except Exception as e:
        print(f"EXTREME ERROR: Failed to send ticket email via SMTP: {e}")
        return False

async def send_organizer_notification_email(email: EmailStr, organizer_name: str, attendee_name: str, attendee_email: str, event_title: str, event_date, ticket_path: str):
    """
    Sends a notification email to the organizer/admin (MAIL_FROM) about a new registration.
    """
    if not ENABLE_EMAIL:
        return False

    # Target the configured sender email (MAIL_FROM) or the specific organizer email passed in
    # The user said "mail from email id" which implies the sender address.
    recipient = MAIL_FROM 
    
    print(f"Sending Notification to {recipient} regarding {attendee_email}...")
    try:
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                    <h2 style="color: #0F172A;">New Registration for {event_title}</h2>
                    <p><strong>A new attendee has registered!</strong></p>
                    <hr/>
                    <p><strong>Event:</strong> {event_title}</p>
                    <p><strong>Organizer:</strong> {organizer_name}</p>
                    <p><strong>Date & Time:</strong> {event_date}</p>
                    <hr/>
                    <p><strong>Attendee Name:</strong> {attendee_name}</p>
                    <p><strong>Attendee Email:</strong> {attendee_email}</p>
                    <br/>
                    <p>The ticket PDF sent to the user is attached for your records.</p>
                </div>
            </body>
        </html>
        """
        
        message = MessageSchema(
            subject=f"New Registration: {event_title} - {attendee_name}",
            recipients=[recipient],     # Sending TO the sender/admin
            body=body,
            subtype=MessageType.html,
            attachments=[ticket_path]
        )
        
        fm = FastMail(conf)
        await fm.send_message(message)
        print("organizer notification sent.")
        return True
    except Exception as e:
        print(f"Failed to send organizer notification: {e}")
        return False
def generate_qr_code(data: str) -> str:
    """
    Generate QR code for given data and return as base64 string.
    """
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def generate_event_ticket_pdf(event_data: dict, qr_base64: str, user_email: str, unique_ticket_id: str, user_name: str = None) -> BytesIO:
    """
    Generate a beautifully styled vertical PDF ticket with InfiniteBZ branding and professional design.
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(400, 600))  # Vertical layout - one page
    width, height = 400, 600

    # White background
    c.setFillColorRGB(1, 1, 1)  # White
    c.rect(0, 0, width, height, fill=1)

    # Header with InfiniteBZ branding and primary color (#148EAB)
    c.setFillColorRGB(0.08, 0.55, 0.67)  # #148EAB equivalent
    c.rect(0, height-120, width, 120, fill=1)

    # InfiniteBZ icon and name - attractive design
    c.setFillColorRGB(1, 1, 1)  # White text
    c.setFont("Helvetica-Bold", 28)
    c.drawString(30, height - 50, "🎫 INFINITE BZ")
    c.setFont("Helvetica", 14)
    c.drawString(30, height - 75, "Event Management")
    c.setFont("Helvetica-Bold", 16)
    c.drawString(30, height - 100, "SYSTEM")

    # Ticket ID section with primary color border
    c.setStrokeColorRGB(0.08, 0.55, 0.67)  # #148EAB border
    c.setLineWidth(3)
    c.roundRect(20, height-160, width-40, 35, 8)

    c.setFillColorRGB(0.08, 0.55, 0.67)  # Primary color text
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(width/2, height - 145, f"TICKET ID: {unique_ticket_id}")

    # Event details in vertical layout
    y_pos = height - 200

    # Event Title
    c.setFillColorRGB(0.2, 0.2, 0.2)  # Dark gray
    c.setFont("Helvetica-Bold", 16)
    c.drawString(30, y_pos, "EVENT DETAILS")
    y_pos -= 30

    # Event Name
    c.setFillColorRGB(0.08, 0.55, 0.67)  # Primary color label
    c.setFont("Helvetica-Bold", 12)
    c.drawString(30, y_pos, "Event Name:")
    c.setFillColorRGB(0.1, 0.1, 0.1)  # Dark text
    c.setFont("Helvetica", 11)
    event_title = event_data.get('title', 'N/A')
    c.drawString(120, y_pos, event_title[:25])
    y_pos -= 25

    # Date & Time
    c.setFillColorRGB(0.08, 0.55, 0.67)  # Primary color label
    c.setFont("Helvetica-Bold", 12)
    c.drawString(30, y_pos, "Date & Time:")
    c.setFillColorRGB(0.1, 0.1, 0.1)  # Dark text
    c.setFont("Helvetica", 11)
    date_time = event_data.get('start_time', 'N/A')
    c.drawString(120, y_pos, date_time)
    y_pos -= 25

    # Venue
    c.setFillColorRGB(0.08, 0.55, 0.67)  # Primary color label
    c.setFont("Helvetica-Bold", 12)
    c.drawString(30, y_pos, "Venue:")
    c.setFillColorRGB(0.1, 0.1, 0.1)  # Dark text
    c.setFont("Helvetica", 11)
    venue = event_data.get('venue_name', 'Online Event')
    c.drawString(85, y_pos, venue[:25])
    y_pos -= 25

    # Organizer
    c.setFillColorRGB(0.08, 0.55, 0.67)  # Primary color label
    c.setFont("Helvetica-Bold", 12)
    c.drawString(30, y_pos, "Organizer:")
    c.setFillColorRGB(0.1, 0.1, 0.1)  # Dark text
    c.setFont("Helvetica", 11)
    organizer = event_data.get('organizer_name', 'InfiniteBZ')
    c.drawString(105, y_pos, organizer[:20])
    y_pos -= 25

    # Attendee
    c.setFillColorRGB(0.08, 0.55, 0.67)  # Primary color label
    c.setFont("Helvetica-Bold", 12)
    c.drawString(30, y_pos, "Attendee Name:")
    c.setFillColorRGB(0.1, 0.1, 0.1)  # Dark text
    c.setFont("Helvetica", 11)
    display_name = user_name if user_name else user_email
    c.drawString(130, y_pos, display_name[:30])
    y_pos -= 40

    # QR Code section
    c.setFillColorRGB(0.95, 0.95, 0.95)  # Light gray background
    c.setStrokeColorRGB(0.08, 0.55, 0.67)  # Primary color border
    c.setLineWidth(2)
    c.roundRect(30, y_pos-180, width-60, 170, 10, fill=1)

    # QR Code title
    c.setFillColorRGB(0.08, 0.55, 0.67)  # Primary color
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width/2, y_pos-5, "SCAN FOR VERIFICATION")

    # QR Code
    if qr_base64:
        qr_img_data = base64.b64decode(qr_base64)
        qr_img = ImageReader(BytesIO(qr_img_data))
        c.drawImage(qr_img, 50, y_pos-160, width=120, height=120)

    # Terms and conditions
    terms_y = y_pos - 200
    c.setFillColorRGB(0.4, 0.4, 0.4)  # Gray text
    c.setFont("Helvetica", 8)
    c.drawString(30, terms_y, "• This ticket is non-transferable")
    c.drawString(30, terms_y - 12, "• Valid only for the registered attendee")
    c.drawString(30, terms_y - 24, "• Please arrive 30 minutes early")
    c.drawString(30, terms_y - 36, "• Keep this ticket safe")

    # Footer with InfiniteBZ branding
    c.setFillColorRGB(0.08, 0.55, 0.67)  # Primary color
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width/2 + 20, 30, "Thank you for using InfiniteBZ!")
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2 + 20, 15, "Event Management System")

    c.save()
    buffer.seek(0)
    return buffer

async def send_event_ticket_email(email: EmailStr, event_data: dict, confirmation_id: str = None, user_name: str = None):
    """
    Generate QR code and ticket PDF, then send email with attachments.
    """
    if not ENABLE_EMAIL:
        print(f"FAILED TO SEND EMAIL to {email}: Email credentials not configured.")
        return False

    temp_file_path = None
    try:
        print(f"Attempting to send ticket email to {email} using {MAIL_SERVER}:{MAIL_PORT} with user {MAIL_USERNAME}")

        # Generate unique ticket number
        import uuid
        import time
        unique_ticket_id = f"IBZ-{int(time.time())}-{str(uuid.uuid4())[:8].upper()}"

        # Generate QR code data with unique ticket number
        qr_data = f"Ticket ID: {unique_ticket_id}\nEvent: {event_data.get('title', 'N/A')}\nUser: {email}\nValid: {event_data.get('start_time', 'N/A')}"
        qr_base64 = generate_qr_code(qr_data)

        # Generate ticket PDF with confirmation ID (use the passed confirmation_id or unique_ticket_id as fallback)
        ticket_id_to_use = confirmation_id or unique_ticket_id
        pdf_buffer = generate_event_ticket_pdf(event_data, qr_base64, email, ticket_id_to_use, user_name)

        # Save PDF to temporary file
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(pdf_buffer.getvalue())
            temp_file_path = temp_file.name

        # Create attachments with file path
        attachments = [
            {
                "file": temp_file_path,
                "filename": f"{event_data.get('title', 'event')}_ticket.pdf",
                "headers": {"Content-Type": "application/pdf"}
            }
        ]

        message = MessageSchema(
            subject=f"Your Event Ticket for {event_data.get('title', 'Event')}",
            recipients=[email],
            body=f"""
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                        <h2 style="color: #333;">Event Registration Confirmed</h2>
                        <p>Thank you for registering for <strong>{event_data.get('title', 'the event')}</strong>.</p>
                        <p>Your event ticket is attached as a PDF. Please bring this ticket to the event.</p>
                        <p>You can also scan the QR code below:</p>
                        <img src="data:image/png;base64,{qr_base64}" alt="QR Code" style="max-width: 200px;" />
                        <br/>
                        <div style="text-align: center; margin-top: 20px;">
                            <a href="http://localhost:5174/?view=ticket-details&eventId={event_data.get('id', '')}&email={email}" style="background-color: #38BDF8; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; border-radius: 5px;">Go to Ticket</a>
                        </div>
                        <p style="font-size: 12px; color: #888;">Please bring this to the event.</p>
                    </div>
                </body>
            </html>
            """,
            subtype=MessageType.html,
            attachments=attachments
        )
        fm = FastMail(conf)
        await fm.send_message(message)
        print("Event ticket email sent successfully.")
        return True
    except Exception as e:
        print(f"ERROR: Failed to send event ticket email: {e}")
        print("Please check your Gmail credentials. Make sure:")
        print("1. 2-Factor Authentication is enabled on your Gmail account")
        print("2. You generated an App Password (not your regular password)")
        print("3. The App Password is entered correctly without spaces")
        print("4. Your Gmail account allows less secure apps or has the correct settings")
        return False
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                print(f"Warning: Could not delete temp file {temp_file_path}: {e}")

