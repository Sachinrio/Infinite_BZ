import os
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
import qrcode

TICKET_DIR = "tickets"

def generate_qr(data: str, filename: str) -> str:
    """Generates a QR code image and returns its path."""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    path = f"{TICKET_DIR}/{filename}"
    img.save(path)
    return path

def generate_ticket_pdf(registration_id: str, event_title: str, user_name: str, user_email: str, event_date: datetime, event_location: str, is_online: bool = False, event_url: str = None) -> str:
    """
    Generates a PDF ticket for the given registration details.
    Returns the absolute path to the generated PDF.
    """
    
    # Ensure directory exists
    if not os.path.exists(TICKET_DIR):
        os.makedirs(TICKET_DIR)
        
    filename = f"ticket_{registration_id}.pdf"
    filepath = os.path.join(TICKET_DIR, filename)
    absolute_path = os.path.abspath(filepath)
    
    # Create PDF Canvas
    c = canvas.Canvas(absolute_path, pagesize=letter)
    width, height = letter
    
    # --- DESIGN ---
    
    # 1. Header Banner (Dark Background)
    c.setFillColor(colors.HexColor("#0F172A")) # Slate 900
    c.rect(0, height - 2*inch, width, 2*inch, fill=1, stroke=0)
    
    # 2. Event Title (White Text)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(0.5*inch, height - 1*inch, event_title[:40]) # Truncate if too long
    
    # 3. Logo/Brand
    c.setFont("Helvetica", 12)
    c.setFillColor(colors.HexColor("#38BDF8")) # Sky 400
    c.drawString(0.5*inch, height - 1.4*inch, "Powered by Infinite BZ")
    
    # 4. Ticket Info Box
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(0.5*inch, height - 3*inch, "ADMIT ONE")
    
    c.setFont("Helvetica", 12)
    c.drawString(0.5*inch, height - 3.5*inch, f"Attendee: {user_name}")
    c.drawString(0.5*inch, height - 3.8*inch, f"Date: {event_date.strftime('%B %d, %Y @ %I:%M %p')}")
    
    # Wrap Location/Link Text
    import textwrap
    
    if is_online:
        location_label = "Event Link: "
        location_text = event_url or "Link will be shared via email."
    else:
        location_label = "Location: "
        location_text = event_location
    
    # Max chars per line approx (assuming size 12 font and 8.5inch width)
    # Reducing width to 40 to leave safe space for QR Code on the right
    wrapped_lines = textwrap.wrap(location_text, width=40) 
    
    y = height - 4.1*inch
    c.drawString(0.5*inch, y, f"{location_label}{wrapped_lines[0]}")
    
    for line in wrapped_lines[1:]:
        y -= 15 # shift down 15 points per line
        c.drawString(0.5*inch + c.stringWidth(location_label), y, line)
    
    # 5. Ticket ID
    c.setFillColor(colors.gray)
    c.setFont("Helvetica", 10)
    c.drawString(0.5*inch, height - 4.6*inch, f"Ticket ID: {registration_id}")
    
    # 6. QR Code Generation
    # Construct rich QR data to match web view
    qr_data = f"Ticket ID: {registration_id}\nEvent: {event_title}\nUser: {user_email}\nValid: {event_date.strftime('%Y-%m-%d %H:%M %p')}"
    qr_filename = f"qr_{registration_id}.png"
    qr_path = generate_qr(qr_data, qr_filename)
    
    # 7. Draw QR Code
    c.drawImage(qr_path, width - 2.5*inch, height - 4.5*inch, width=2*inch, height=2*inch)
    
    # Cleanup QR image (optional, or keep for debug)
    # os.remove(qr_path) 
    
    # 8. Footer
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica", 10)
    c.drawCentredString(width/2, 0.5*inch, "Please show this ticket at the entrance. valid for one entry.")
    
    c.save()
    return absolute_path
