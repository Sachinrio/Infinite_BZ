from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, case, func, over
from typing import List, Optional, Dict, Any
import shutil
import os

from app.core.database import get_session
from app.models.schemas import Event, UserRegistration, EventListResponse, User, EventCreate, Follow, TicketClass, TicketClassCreate
from app.services.scraper import scrape_events_playwright # Async import
from app.auth import get_current_user
from app.core.email_utils import generate_qr_code, send_event_ticket_email
from sqlmodel import SQLModel
import uuid
import csv
import io
from fastapi.responses import StreamingResponse

from app.api import ai_routes

router = APIRouter()
router.include_router(ai_routes.router, prefix="/ai", tags=["AI Generation"])

# --- 1. SYNC (Admin Only / Debug) ---
@router.post("/sync")
async def sync_events(city: str = "chennai", session: AsyncSession = Depends(get_session)):
    """
    Triggers the Playwright Scraper
    """
    print(f"Starting Sync for {city}...")
    try:
        print("Calling scraper function...")
        events_data = await scrape_events_playwright(city)
        print("Scraper returned.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    saved_count = 0
    processed_ids = set()
    for data in events_data:
        evt_id = data["eventbrite_id"]
        if evt_id in processed_ids:
             continue
        processed_ids.add(evt_id)

        # Check duplicates via eventbrite_id
        stmt = select(Event).where(Event.eventbrite_id == evt_id)
        result = await session.execute(stmt)
        existing = result.scalars().first()
        
        if not existing:
            new_event = Event(**data)
            session.add(new_event)
            saved_count += 1
            
    await session.commit()
    return {"status": "success", "added": saved_count, "total_found": len(events_data)}

# --- 1.5 CREATE EVENT (User Generated) ---

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Uploads an image file and returns the static URL.
    """
    try:
        # Create uploads directory if not exists
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Determine file path
        # Use simple filename sanitization or uuid
        filename = f"{uuid.uuid4()}-{file.filename}"
        file_path = os.path.join(upload_dir, filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return URL (Assuming localhost for dev, needs env var for prod)
        # Using a relative path that frontend can prepend domain to, or full path if simple
        return {"url": f"http://localhost:8000/uploads/{filename}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.post("/events", response_model=Event)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Allows authenticated users to create a new event with multiple ticket classes.
    """
    # Generate unique internal ID
    custom_id = f"chk-{uuid.uuid4()}"
    
    # Logic to handle Tickets
    ticket_objects = []
    total_capacity = 0
    min_price = None
    is_free_event = True
    
    # Process Tickets provided in payload
    if event_data.tickets:
        for t in event_data.tickets:
            # Create TicketClass Object (but don't add to session until event is created or use relationship)
            # Actually, we need event.id first. So we will add them later.
            total_capacity += t.quantity
            if t.price > 0:
                is_free_event = False
                if min_price is None or t.price < min_price:
                    min_price = t.price
            else:
                 if min_price is None:
                    min_price = 0
    
    # Override top-level fields based on tickets if tickets are present
    final_capacity = total_capacity if event_data.tickets else event_data.capacity
    final_is_free = is_free_event if event_data.tickets else event_data.is_free
    final_price_str = str(min_price) if min_price is not None else event_data.price

    # Create Event Object
    # Extract Pro fields for raw_data storage
    raw_data_dump = {
        "source": "InfiniteBZ", 
        "created_by": current_user.email,
        "organizer_email": event_data.organizer_email,
        "price": final_price_str,
        "capacity": final_capacity,
        "agenda": event_data.agenda,
        "speakers": event_data.speakers,
        "gallery_images": event_data.gallery_images,
        # Store ticket summary in raw_data for quick FE access without joins
        "tickets_meta": [t.dict() for t in event_data.tickets] if event_data.tickets else [] 
    }
    
    new_event = Event(
        **event_data.dict(exclude={"organizer_email", "price", "organizer_name", "agenda", "speakers", "tickets", "gallery_images", "capacity", "is_free"}), # Exclude non-db columns
        eventbrite_id=custom_id,
        url=f"https://infinitebz.com/events/{custom_id}",
        organizer_name=current_user.full_name or "Community Member",
        organizer_email=current_user.email,
        capacity=final_capacity,
        is_free=final_is_free,
        raw_data=raw_data_dump
    )
    
    session.add(new_event)
    await session.commit()
    await session.refresh(new_event)
    
    # Now create TicketClass records linked to this event
    if event_data.tickets:
        for t in event_data.tickets:
            new_ticket = TicketClass(
                event_id=new_event.id,
                **t.dict()
            )
            session.add(new_ticket)
        await session.commit()
    
    return new_event

    return new_event

    return new_event

@router.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Deletes an event given its ID. Only the creator should be able to delete.
    """
    # 1. Get Event
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # 2. Check Ownership (Simple email check within raw_data)
    # In a real app, strict relationship check is better.
    creator_email = event.raw_data.get("created_by") if event.raw_data else None
    if creator_email != current_user.email:
         raise HTTPException(status_code=403, detail="Not authorized to delete this event")

    # 3. Delete dependencies first
    # Delete all registrations for this event
    delete_reg_stmt = delete(UserRegistration).where(UserRegistration.event_id == event_id)
    await session.execute(delete_reg_stmt)

    # Delete all ticket classes for this event
    delete_tickets_stmt = delete(TicketClass).where(TicketClass.event_id == event_id)
    await session.execute(delete_tickets_stmt)

    # 4. Delete the event (Core delete to ensure order)
    delete_event_stmt = delete(Event).where(Event.id == event_id)
    await session.execute(delete_event_stmt)

    await session.commit()

    return {"status": "success", "message": "Event deleted"}

@router.put("/events/{event_id}", response_model=Event)
async def update_event(
    event_id: int,
    event_update: EventCreate, # Re-using schema for simplicity
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Updates an event.
    """
    # 1. Get Event
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # 2. Check Ownership
    creator_email = event.raw_data.get("created_by") if event.raw_data else None
    if creator_email != current_user.email:
         raise HTTPException(status_code=403, detail="Not authorized to update this event")

    # 3. Update Fields
    # Update main columns
    event_dict = event_update.dict(exclude_unset=True)
    
    # Handle core columns mapping
    for key, value in event_dict.items():
        if key not in ["organizer_email", "price", "organizer_name", "agenda", "speakers"] and hasattr(event, key):
            setattr(event, key, value)
            
    # Update raw_data for flexible fields
    current_raw = event.raw_data.copy() if event.raw_data else {}
    current_raw.update({
        "organizer_email": event_update.organizer_email,
        "price": event_update.price,
        "capacity": event_update.capacity,
        "agenda": event_update.agenda,
        "speakers": event_update.speakers
    })
    event.raw_data = current_raw
    
    # Update special fields
    if event_update.organizer_name:
        event.organizer_name = event_update.organizer_name
        
    # Recalculate derived fields if needed (e.g. venue_name from mode)
    # For now assuming frontend sends correct venue_name/address via payload
    
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event

@router.get("/events/my-events")
async def get_my_events(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Fetch events created by the current user.
    """
    # Query events where raw_data->>'created_by' matches email
    # Note: JSONB querying in SQLModel/SQLAlchemy
    from sqlalchemy import cast, String
    from sqlalchemy.dialects.postgresql import JSONB
    
    # 1. Get Events
    query = select(Event).where(
        cast(Event.raw_data['created_by'], String) == f'"{current_user.email}"' 
        # Note: JSON value might be quoted or not depending on driver. 
        # Safest is often astext or explicit cast. 
        # Let's try simple python filtration if list is small, or specific operator if large.
        # Given potential complexities with JSON operators in asyncpg/sqlmodel, 
        # let's fetch all "Source=InfiniteBZ" and filter in python for MVP reliability 
        # unless we want to risk syntax errors.
        # Actually, let's try the proper JSONB contains operator which is cleaner.
    )
    
    # Alternative: Use the contains operator @>
    # query = select(Event).where(Event.raw_data.contains({"created_by": current_user.email}))
    
    # Let's stick to the containment operator, it's standard PG.
    stmt = select(Event).where(Event.raw_data.contains({"created_by": current_user.email}))
    result = await session.execute(stmt)
    my_events = result.scalars().all()
    
    # 2. Calculate Stats
    active_count = len(my_events) # Assuming all are active for now
    pending_count = 0 
    total_registrations = 0
    
    # For each event, get registration count (this could be optimized with a join)
    # For each event, get registration count (this could be optimized with a join)
    events_with_stats = []
    
    # Pre-calculate 24h cutoff
    from datetime import datetime, timedelta
    cutoff_24h = datetime.now() - timedelta(hours=24)
    now_time = datetime.now()

    for event in my_events:
        # 1. Total Registrations
        reg_stmt = select(func.count()).select_from(UserRegistration).where(UserRegistration.event_id == event.id)
        reg_res = await session.execute(reg_stmt)
        reg_count = reg_res.scalar()
        total_registrations += reg_count
        
        # 2. Recent Signups (Last 24h)
        recent_stmt = select(func.count()).select_from(UserRegistration).where(
            UserRegistration.event_id == event.id,
            UserRegistration.registered_at >= cutoff_24h
        )
        recent_res = await session.execute(recent_stmt)
        recent_count = recent_res.scalar()

        # 3. Dynamic Status
        # User Request: "Active when slot match not full, otherwise InActive"
        capacity = event.raw_data.get('capacity') or 100 # Default if undefined
        if reg_count < int(capacity):
            event_status = "Active"
        else:
            event_status = "InActive"

        events_with_stats.append({
            **event.dict(),
            "registration_count": reg_count,
            "recent_signup_count": recent_count,
            "status": event_status
        })
        
    return {
        "stats": {
            "active": active_count,
            "pending": pending_count,
            "total_registrations": total_registrations
        },
        "events": events_with_stats
    }

# --- 2. PUBLIC EVENTS API ---
from sqlalchemy import func, select, or_, desc, cast, Date
from datetime import datetime, date as date_type
@router.get("/events", response_model=EventListResponse) # Changed response model
async def list_events(
    city: str = None,
    category: str = None,
    search: str = None,
    source: str = None,
    is_free: str = None, # 'true', 'false', or None
    mode: str = None,    # 'online', 'offline', or None
    date: str = None,    # 'YYYY-MM-DD'
    page: int = 1,
    limit: int = 21,
    session: AsyncSession = Depends(get_session)
):
    """
    Returns events with optional filtering (City, Search) and true pagination.
    """
    from sqlalchemy import or_

    offset = (page - 1) * limit
    
    # Base query for filtering
    filter_query = select(Event)
    
    # 0. Category/Industry Filter (Keyword Search)
    if category and category.lower() != "all":
        # Broaden logic: Map category names to a list of related keywords
        keyword_map = {
            "startup": ["startup", "founder", "entrepreneur", "venture", "pitch", "funding", "incubator", "accelerator", "innovation"],
            "business": ["business", "networking", "marketing", "sales", "finance", "leadership", "management", "corporate", "career", "resume", "job", "interview", "workshop", "money", "income", "profit", "ecommerce", "trade", "expo", "exhibition", "organization", "team", "strategy", "communication"],
            "tech": ["tech", "software", "developer", "ai", "data", "code", "programming", "cloud", "security", "web", "digital", "cyber", "electronics", "engineering"],
            "music": ["music", "concert", "live", "dj", "band", "festival", "performance"],
            "sports": ["sport", "cricket", "football", "run", "marathon", "yoga", "fitness", "badminton"],
            "arts": ["art", "design", "creative", "gallery", "painting"]
        }
        
        # Get keywords for the selected category (default to just the category name if not in map)
        search_keywords = keyword_map.get(category.lower(), [category.lower()])
        
        # Construct OR query for all keywords in Title OR Description
        conditions = []
        for kw in search_keywords:
            kw_term = f"%{kw}%"
            conditions.append(Event.title.ilike(kw_term))
            conditions.append(Event.description.ilike(kw_term))
            
        filter_query = filter_query.where(or_(*conditions))
        
    # 1. City Filter
    if city and city.lower() != "all":
        filter_query = filter_query.where(Event.venue_address.ilike(f"%{city}%"))
        
    # 2. Search Filter (Title, Desc, Venue, Organizer)
    if search:
        search_term = f"%{search}%"
        filter_query = filter_query.where(
            or_(
                Event.title.ilike(search_term),
                Event.description.ilike(search_term),
                Event.venue_name.ilike(search_term),
                Event.venue_address.ilike(search_term),
                Event.organizer_name.ilike(search_term)
            )
        )
        
    # 3. Source Filter (Platform)
    if source and source.strip().lower() != "all":
        s_val = source.strip().lower()
        
        # Mapping for UI friendly names
        if s_val == "ctc" or s_val == "trade centre":
            s_val = "trade_centre" 
        elif s_val == "allevents":
            s_val = "allevents"
            
        # Check source in raw_data OR url
        # Use simple URL check first for speed, then raw_data
        # Note: raw_data->>'source' comparison needs casting or explicit containment
        from sqlalchemy import cast, String
        
        # Flexible filter: URL contains string OR raw_data['source'] equals string
        # Since 'trade_centre' is in raw_data, but URL is chennaitradecentre.org
        
        source_conditions = []
        source_conditions.append(Event.url.ilike(f"%{s_val}%"))
        
        # Explicit raw_data check using astext (safer than cast)
        # Event.raw_data['source'].astext gives the unquoted string value
        source_conditions.append(Event.raw_data['source'].astext == s_val)
        
        # Special case for mapped CTC (also match the URL host)
        if s_val == "trade_centre":
             source_conditions.append(Event.url.ilike("%chennaitradecentre%"))

        filter_query = filter_query.where(or_(*source_conditions))
        
    # 4. Cost Filter
    if is_free:
        if is_free.lower() == "free":
            filter_query = filter_query.where(Event.is_free == True)
        elif is_free.lower() == "paid":
            filter_query = filter_query.where(Event.is_free == False)
            
    # 5. Mode Filter
    if mode:
        if mode.lower() == "online":
            filter_query = filter_query.where(Event.online_event == True)
        elif mode.lower() == "offline":
            filter_query = filter_query.where(Event.online_event == False)
    
    # 6. Date Filter
    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d").date()
            filter_query = filter_query.where(cast(Event.start_time, Date) == filter_date)
        except ValueError:
            pass # Ignore invalid date formats
    
    # 3. Get TOTAL Count (Count BEFORE applying limit/offset)
    # We substitute the selection of 'Event' with 'count(Event.id)'
    count_query = select(func.count(Event.id)).select_from(filter_query.subquery())
    
    # SQLAlchemy Async execution for count
    # Note: Using subquery approach is safer for complex wheres
    # Simplified: select(func.count()).select_from(Event).where(...)
    
    # Re-constructing count query cleanly:
    count_stmt = select(func.count()).select_from(Event)
    if city and city.lower() != "all":
        count_stmt = count_stmt.where(Event.venue_address.ilike(f"%{city}%"))
    if search:
        search_term = f"%{search}%"
        count_stmt = count_stmt.where(
            or_(
                Event.title.ilike(search_term),
                Event.description.ilike(search_term),
                Event.venue_name.ilike(search_term),
                Event.venue_address.ilike(search_term),
                Event.organizer_name.ilike(search_term)
            )
        )
        
    # Apply same filters to count_stmt
    if category and category.lower() != "all":
        keyword_map = {
            "startup": ["startup", "founder", "entrepreneur", "venture", "pitch", "funding", "incubator", "accelerator", "innovation"],
            "business": ["business", "networking", "marketing", "sales", "finance", "leadership", "management", "corporate", "career", "resume", "job", "interview", "workshop", "money", "income", "profit", "ecommerce", "trade", "expo", "exhibition", "organization", "team", "strategy", "communication"],
            "tech": ["tech", "software", "developer", "ai", "data", "code", "programming", "cloud", "security", "web", "digital", "cyber", "electronics", "engineering"],
            "music": ["music", "concert", "live", "dj", "band", "festival", "performance"],
            "sports": ["sport", "cricket", "football", "run", "marathon", "yoga", "fitness", "badminton"],
            "arts": ["art", "design", "creative", "gallery", "painting"]
        }
        search_keywords = keyword_map.get(category.lower(), [category.lower()])
        
        conditions = []
        for kw in search_keywords:
            kw_term = f"%{kw}%"
            conditions.append(Event.title.ilike(kw_term))
            conditions.append(Event.description.ilike(kw_term))
            
        count_stmt = count_stmt.where(or_(*conditions))
        
    if source and source.strip().lower() != "all":
        s_val = source.strip().lower()
        if s_val == "ctc" or s_val == "trade centre":
            s_val = "trade_centre" 
        elif s_val == "allevents":
            s_val = "allevents"
            
        source_conditions = []
        source_conditions.append(Event.url.ilike(f"%{s_val}%"))
        source_conditions.append(Event.raw_data['source'].astext == s_val)
        
        if s_val == "trade_centre":
             source_conditions.append(Event.url.ilike("%chennaitradecentre%"))
             
        count_stmt = count_stmt.where(or_(*source_conditions))

    if is_free:
        if is_free.lower() == "free":
            count_stmt = count_stmt.where(Event.is_free == True)
        elif is_free.lower() == "paid":
            count_stmt = count_stmt.where(Event.is_free == False)

    if mode:
        if mode.lower() == "online":
            count_stmt = count_stmt.where(Event.online_event == True)
        elif mode.lower() == "offline":
            count_stmt = count_stmt.where(Event.online_event == False)

    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d").date()
            count_stmt = count_stmt.where(cast(Event.start_time, Date) == filter_date)
        except ValueError:
            pass

    count_result = await session.execute(count_stmt)
    total_events = count_result.scalar()

    # 4. Get DATA (Apply limit/offset)
    # We want InfiniteBZ events first, then others interleaved by source.
    
    # We need a subquery that adds the ranks
    inner_subq = filter_query.subquery()
    
    # Create expressions using columns from the subquery
    is_inf_expr = case((inner_subq.c.url.ilike("%infinitebz.com%"), 0), else_=1)
    
    source_rank_expr = func.row_number().over(
        partition_by=inner_subq.c.raw_data['source'].astext,
        order_by=inner_subq.c.start_time
    )
    
    # Selection from the subquery
    # We select all columns from inner_subq
    inner_stmt = select(
        inner_subq,
        is_inf_expr.label('is_inf'),
        source_rank_expr.label('s_rank')
    )
    
    final_subq = inner_stmt.subquery()
    
    # Final query with limit/offset
    final_query = select(final_subq).order_by(
        final_subq.c.is_inf,
        final_subq.c.is_free.desc(),
        final_subq.c.s_rank,
        final_subq.c.start_time
    ).offset(offset).limit(limit)
    
    result = await session.execute(final_query)
    
    # Map back to Event objects
    events = []
    for row in result.all():
        data = {col: getattr(row, col) for col in Event.__fields__ if hasattr(row, col)}
        events.append(Event(**data))
    
    return EventListResponse(
        data=events,
        total=total_events,
        page=page,
        limit=limit
    )

@router.get("/events/{event_id}", response_model=Event)
async def get_event(
    event_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Get a single event by ID.
    """
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

# --- 3. TRACKING ---
@router.post("/track-click")
async def track_click(registration: UserRegistration, session: AsyncSession = Depends(get_session)):
    """
    Logs a user clicking 'Register'. 
    NOTE: This is just counting intent, not actual API registration.
    """
    # Force server-side timestamp to ensure valid datetime object
    from datetime import datetime
    registration.registered_at = datetime.now()
    
    session.add(registration)
    await session.commit()
    await session.refresh(registration)
    return {"status": "tracked", "id": registration.id}

# --- 4. AUTO-REGISTRATION ENDPOINT ---
from app.models.schemas import UserRegistration, User
from app.services.registrar import auto_register_playwright
from app.auth import get_current_user

class RegistrationPayload(SQLModel):
    tickets: List[Dict[str, Any]] = []
    attendee: Dict[str, Any] = {}
    total_amount: float = 0.0

@router.post("/events/{event_id}/register")
async def register_for_event(
    event_id: int, 
    payload: RegistrationPayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # 1. Get Event Details
    try:
        # Debug logging (optional, can be removed)
        # with open("debug_email_identity.txt", "a") as f:
        #      f.write(f"TIMESTAMP: {datetime.now()} | USER: {current_user.email}\n")
        pass
    except:
        pass

    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Allow registration for both free and paid events

    # 2. Check if already registered
    stmt = select(UserRegistration).where(
        UserRegistration.user_email == current_user.email,
        UserRegistration.event_id == event_id
    )
    result = await session.execute(stmt)
    existing = result.scalars().first()
    if existing:
        return {"status": "ALREADY_REGISTERED", "message": "You are already registered for this event."}

    # 3. MANUAL CONFIRMATION (API called after user confirms in UI)
    
    # Generate a Self-Verified Confirmation ID
    import time
    from app.services.ticket_service import generate_ticket_pdf
    from app.core.email_utils import send_ticket_email, send_organizer_notification_email
    
    confirmation_id = f"SELF-{int(time.time())}"

    new_reg = UserRegistration(
        event_id=event_id,
        user_email=current_user.email,
        confirmation_id=confirmation_id,
        status="SUCCESS",
        raw_data=payload.dict()
    )
    session.add(new_reg)
    await session.commit()
    
    # Check if Eventbrite/External
    # Check if Internal Event (InfiniteBZ)
    # User Request: Send mail for Infinite_BZ events only
    is_internal = event.raw_data.get("source") == "InfiniteBZ"
    email_status = "SKIPPED_EXTERNAL"
    email_sent = False

    if is_internal:
        # --- NEW: Phase 1 Ticket Generation ---
        # --- NEW: Phase 1 Ticket Generation ---
        try:
            # 1. Generate PDF
            ticket_path = generate_ticket_pdf(
                registration_id=confirmation_id,
                event_title=event.title,
                user_name=current_user.full_name or current_user.email,
                user_email=current_user.email,
                event_date=event.start_time,
                event_location=event.venue_name or "Online"
            )
            
            # 2. Send Email (BACKGROUND TASK)
            # We pass the async function send_ticket_email to background_tasks
            background_tasks.add_task(
                send_ticket_email,
                email=current_user.email,
                name=current_user.full_name or "Attendee",
                event_title=event.title,
                event_id=event.id,
                ticket_id=confirmation_id
            )

            # 3. Send Notification Email to Organizer/Sender (BACKGROUND TASK)
            background_tasks.add_task(
                send_organizer_notification_email,
                email=current_user.email, # Argument unused by function but good for logging if updated
                organizer_name=event.organizer_name,
                attendee_name=current_user.full_name or "Attendee",
                attendee_email=current_user.email,
                event_title=event.title,
                event_date=event.start_time.strftime('%B %d, %Y @ %I:%M %p'),
                ticket_path=ticket_path
            )
            
            email_status = "QUEUED_IN_BACKGROUND"
            email_sent = True
            
        except Exception as e:
            print(f"Ticket Gen Error: {str(e)}")
            email_status = f"ERROR: {str(e)}"
            email_sent = False

    message = "Registration verified and saved!"
    if email_sent:
        message += " Event ticket sent to your email."
    elif not is_internal:
         message += " (External Registration Recorded)"
    else:
        message += " (Note: Email sending is not configured.)"

    return {
        "status": "SUCCESS",
        "message": "message",
        "confirmation_id": confirmation_id,
        "email_status": email_status
    }

@router.get("/events/{event_id}/registrations/csv")
async def get_event_registrations_csv(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Export registrations for a specific event as CSV.
    Only the organizer can access this.
    """
    # 1. Get Event and Verify Ownership
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check ownership
    # We check raw_data['created_by'] which is set during event creation.
    # Fallback to organizer_email check only if created_by is missing.
    owner_email = event.raw_data.get("created_by") or event.raw_data.get("organizer_email")
    
    if not owner_email:
        # If no explicit owner record, we deny access to be safe.
        print(f"DEBUG: Event {event_id} has no created_by/organizer_email in raw_data")
        raise HTTPException(status_code=403, detail="Could not verify event ownership (missing ownership record).")

    if owner_email.lower() != current_user.email.lower():
         raise HTTPException(status_code=403, detail="Only the event organizer can export registrations.")

    # 2. Query Registrations with User Details
    # Join UserRegistration with User to get profile info
    stmt = (
        select(UserRegistration, User)
        .join(User, User.email == UserRegistration.user_email, isouter=True)
        .where(UserRegistration.event_id == event_id)
    )
    result = await session.execute(stmt)
    rows = result.all()

    # 3. Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Registration ID", "Registered At", "Email", "Full Name", "Phone", "Job Title", "Company", "Status", "Ticket Class"])

    for reg, user_profile in rows:
        # Extract details
        reg_id = reg.confirmation_id
        reg_date = reg.registered_at.strftime("%Y-%m-%d %H:%M:%S")
        email = reg.user_email
        status = reg.status
        ticket_class = reg.ticket_class_id or "Standard"

        # User Profile details (if user exists in DB)
        if user_profile:
            full_name = user_profile.full_name or f"{user_profile.first_name or ''} {user_profile.last_name or ''}".strip()
            phone = user_profile.phone or "N/A"
            job_title = user_profile.job_title or "N/A"
            company = user_profile.company or "N/A"
        else:
            # Fallback to registration raw_data if available
            attendee_info = reg.raw_data.get("attendee", {})
            full_name = attendee_info.get("name") or "Guest"
            phone = "N/A" 
            job_title = "N/A"
            company = "N/A"

        writer.writerow([reg_id, reg_date, email, full_name, phone, job_title, company, status, ticket_class])

    output.seek(0)
    
    # 4. Return as File
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=event_{event_id}_registrations.csv"
    return response

# --- 4.5 CHECK-IN ENDPOINT (Organizer Tool) ---
class CheckInRequest(SQLModel):
    ticket_id: str

@router.post("/events/check-in")
async def check_in_attendee(
    request: CheckInRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Verifies a ticket ID and marks the attendee as checked in.
    """
    # 1. Find Registration
    stmt = select(UserRegistration).where(UserRegistration.confirmation_id == request.ticket_id)
    result = await session.execute(stmt)
    registration = result.scalars().first()
    
    if not registration:
        raise HTTPException(status_code=404, detail="Invalid Ticket ID. Access Denied.")
    
    # 2. Check Status
    if registration.status == "CHECKED_IN":
         raise HTTPException(status_code=400, detail=f"Ticket already used! Checked in at {registration.registered_at}") # ideal: store check-in time
    
    if registration.status == "FAILED":
         raise HTTPException(status_code=400, detail="Ticket is invalid (Payment/Reg Failed).")

    # 3. Get Event and User Details for Response
    event = await session.get(Event, registration.event_id)
    # user info might be just email in registration, or we can fetch User object if needed
    # registration.user_email is available
    
    # 4. Mark as Checked In
    registration.status = "CHECKED_IN"
    session.add(registration)
    await session.commit()
    
    return {
        "status": "SUCCESS",
        "message": "Check-in Successful!",
        "attendee": registration.user_email,
        "event": event.title if event else "Unknown Event",
        "ticket_id": registration.confirmation_id

    }

# --- 5. USER PROFILE ENDPOINT ---
class UserProfileUpdate(SQLModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None

class UserProfileResponse(SQLModel):
    id: int
    email: str
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    razorpay_account_id: Optional[str] = None

@router.get("/user/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's profile information.
    """
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        job_title=current_user.job_title,
        company=current_user.company,
        phone=current_user.phone,
        bio=current_user.bio,
        profile_image=current_user.profile_image,
        razorpay_account_id=current_user.razorpay_account_id
    )

@router.put("/user/profile")
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Update current user's profile information.
    """
    # Get the user
    user = await session.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update fields
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    # Update full_name based on first_name and last_name
    if profile_data.first_name is not None or profile_data.last_name is not None:
        first_name = profile_data.first_name if profile_data.first_name is not None else user.first_name or ""
        last_name = profile_data.last_name if profile_data.last_name is not None else user.last_name or ""
        user.full_name = f"{first_name} {last_name}".strip()

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return {
        "status": "success",
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "job_title": user.job_title,
            "company": user.company,
            "phone": user.phone,
            "bio": user.bio,
            "profile_image": user.profile_image
        }
    }

# --- 6. USER REGISTRATIONS ENDPOINT ---
@router.get("/user/registrations")
async def get_user_registrations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all events registered by the current user.
    """
    from sqlalchemy.orm import selectinload

    # Query user registrations with event details
    stmt = select(UserRegistration).where(
        UserRegistration.user_email == current_user.email,
        UserRegistration.status == "SUCCESS"
    ).options(selectinload(UserRegistration.event))

    result = await session.execute(stmt)
    registrations = result.scalars().all()

    # Format response with event details
    registered_events = []
    for reg in registrations:
        if reg.event:  # Ensure event still exists
            event_data = {
                **reg.event.dict(),
                "registration_date": reg.registered_at,
                "confirmation_id": reg.confirmation_id
            }
            registered_events.append(event_data)

    return {
        "status": "success",
        "message": "User registrations retrieved",
        "registrations": registered_events
    }

@router.get("/user/registrations/{event_id}/pdf")
async def download_ticket_pdf(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Generates and returns the PDF ticket for a specific registration.
    """
    from fastapi.responses import FileResponse
    from app.services.ticket_service import generate_ticket_pdf
    
    # 1. Find the registration
    stmt = select(UserRegistration).where(
        UserRegistration.user_email == current_user.email,
        UserRegistration.event_id == event_id,
        UserRegistration.status == "SUCCESS"
    )
    result = await session.execute(stmt)
    registration = result.scalars().first()
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    # 2. Get Event Details
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # 3. Generate PDF (Regenerate on demand)
    try:
        ticket_path = generate_ticket_pdf(
            registration_id=registration.confirmation_id,
            event_title=event.title,
            user_name=current_user.full_name or current_user.email,
            user_email=current_user.email,
            event_date=event.start_time,
            event_location=event.venue_name or "Online"
        )
        return FileResponse(ticket_path, media_type='application/pdf', filename=f"ticket_{event_id}.pdf")
    except Exception as e:
        print(f"PDF Gen Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate ticket PDF")


# --- 7. FOLLOWING SYSTEM ENDPOINTS ---

@router.delete("/user/registrations/{event_id}")
async def cancel_registration(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Cancels a user's registration for a specific event.
    """
    # 1. Check if registration exists
    stmt = select(UserRegistration).where(
        UserRegistration.user_email == current_user.email,
        UserRegistration.event_id == event_id,
        UserRegistration.status == "SUCCESS"
    )
    result = await session.execute(stmt)
    registration = result.scalars().first()
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    # 2. Soft Delete the registration (Update Status)
    # User Request: Track "cancel the order" activities
    registration.status = "CANCELLED"
    session.add(registration)
    await session.commit()
    
    return {"status": "success", "message": "Registration cancelled successfully"}

# --- 7. FOLLOWING SYSTEM ENDPOINTS ---

@router.post("/user/follow/{followed_identifier}")
async def follow_user(
    followed_identifier: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Follow a user by their email or full name.
    """
    print(f"DEBUG: Trying to follow: {followed_identifier}")
    print(f"DEBUG: Current user: {current_user.email}")

    # Try to find user by email first
    stmt = select(User).where(User.email == followed_identifier)
    result = await session.execute(stmt)
    followed_user = result.scalars().first()

    if followed_user:
        print(f"DEBUG: Found user by email: {followed_user.email}, full_name: {followed_user.full_name}")
    else:
        print("DEBUG: User not found by email, trying full_name")

        # If not found by email, try to find by full name
        stmt = select(User).where(User.full_name == followed_identifier)
        result = await session.execute(stmt)
        followed_user = result.scalars().first()

        if followed_user:
            print(f"DEBUG: Found user by full_name: {followed_user.email}, full_name: {followed_user.full_name}")
        else:
            print("DEBUG: User not found by full_name either")

            # Debug: show all users for reference
            all_users_stmt = select(User)
            all_result = await session.execute(all_users_stmt)
            all_users = all_result.scalars().all()
            print("DEBUG: All users in database:")
            for u in all_users:
                print(f"  - Email: {u.email}, Full Name: {repr(u.full_name)}")

    if not followed_user:
        raise HTTPException(status_code=404, detail=f"User not found for identifier: {followed_identifier}")

    if followed_user.email == current_user.email:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    # Check if already following
    stmt = select(Follow).where(
        Follow.follower_email == current_user.email,
        Follow.followed_email == followed_user.email
    )
    result = await session.execute(stmt)
    existing_follow = result.scalars().first()
    if existing_follow:
        raise HTTPException(status_code=400, detail="Already following this user")

    # Create follow relationship
    new_follow = Follow(
        follower_email=current_user.email,
        followed_email=followed_user.email
    )
    session.add(new_follow)
    await session.commit()

    return {"status": "success", "message": f"You are now following {followed_user.full_name or followed_user.email}"}

@router.delete("/user/follow/{followed_identifier}")
async def unfollow_user(
    followed_identifier: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Unfollow a user by their email or full name.
    """
    # Try to find user by email first
    stmt = select(User).where(User.email == followed_identifier)
    result = await session.execute(stmt)
    followed_user = result.scalars().first()

    # If not found by email, try to find by full name
    if not followed_user:
        stmt = select(User).where(User.full_name == followed_identifier)
        result = await session.execute(stmt)
        followed_user = result.scalars().first()

    if not followed_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find and delete the follow relationship
    stmt = select(Follow).where(
        Follow.follower_email == current_user.email,
        Follow.followed_email == followed_user.email
    )
    result = await session.execute(stmt)
    follow = result.scalars().first()
    if not follow:
        raise HTTPException(status_code=400, detail="You are not following this user")

    await session.delete(follow)
    await session.commit()

    return {"status": "success", "message": f"You have unfollowed {followed_user.full_name or followed_user.email}"}

@router.get("/user/following")
async def get_following(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get list of users that the current user is following.
    """
    stmt = select(Follow).where(Follow.follower_email == current_user.email)
    result = await session.execute(stmt)
    follows = result.scalars().all()

    following_list = []
    for follow in follows:
        # Get user details for each followed user
        stmt = select(User).where(User.email == follow.followed_email)
        result = await session.execute(stmt)
        user = result.scalars().first()
        if user:
            following_list.append({
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": user.full_name,
                "followed_at": follow.created_at
            })

    return {"following": following_list, "count": len(following_list)}

@router.get("/user/followers")
async def get_followers(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get list of users that are following the current user.
    """
    stmt = select(Follow).where(Follow.followed_email == current_user.email)
    result = await session.execute(stmt)
    follows = result.scalars().all()

    followers_list = []
    for follow in follows:
        # Get user details for each follower
        stmt = select(User).where(User.email == follow.follower_email)
        result = await session.execute(stmt)
        user = result.scalars().first()
        if user:
            followers_list.append({
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": user.full_name,
                "profile_image": user.profile_image,
                "followed_at": follow.created_at
            })

    return {"followers": followers_list, "count": len(followers_list)}

# --- 8. QR CODE ENDPOINTS ---
@router.get("/user/registrations/{event_id}/qr")
async def get_event_qr_code(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Generate and return QR code for a registered event.
    """
    # Check if user is registered for this event
    stmt = select(UserRegistration).where(
        UserRegistration.user_email == current_user.email,
        UserRegistration.event_id == event_id,
        UserRegistration.status == "SUCCESS"
    )
    result = await session.execute(stmt)
    registration = result.scalars().first()
    if not registration:
        raise HTTPException(status_code=403, detail="You are not registered for this event")

    # Get event details
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Generate QR code data EXACTLY matching the PDF format sent to email
    qr_data = f"Ticket ID: {registration.confirmation_id}\nEvent: {event.title}\nUser: {current_user.email}\nValid: {event.start_time.strftime('%Y-%m-%d %H:%M %p')}"
    qr_base64 = generate_qr_code(qr_data)

    return {
        "qr_code": qr_base64,
        "event_title": event.title,
        "confirmation_id": registration.confirmation_id
    }

@router.post("/user/registrations/{event_id}/send-qr")
async def send_event_qr_email_route(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Send QR code and PDF via email for a registered event.
    """
    # Check if user is registered for this event
    stmt = select(UserRegistration).where(
        UserRegistration.user_email == current_user.email,
        UserRegistration.event_id == event_id,
        UserRegistration.status == "SUCCESS"
    )
    result = await session.execute(stmt)
    registration = result.scalars().first()
    if not registration:
        raise HTTPException(status_code=403, detail="You are not registered for this event")

    # Get event details
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Send email
    event_data = {
        "id": event.id,
        "title": event.title,
        "start_time": event.start_time.strftime('%Y-%m-%d %H:%M %p'),
        "venue_name": event.venue_name,
        "organizer_name": event.organizer_name
    }
    success = await send_event_ticket_email(current_user.email, event_data)

    if success:
        return {"status": "success", "message": "QR code and PDF sent to your email"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email")

# --- 9. USER ACTIVITIES ENDPOINT ---
@router.get("/user/activities")
async def get_user_activities(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all activities for the current user (events created, registered, follow activities).
    """
    activities = []

    # 1. Get events created by the user
    created_stmt = select(Event).where(Event.raw_data.contains({"created_by": current_user.email}))
    created_result = await session.execute(created_stmt)
    created_events = created_result.scalars().all()

    for event in created_events:
        activities.append({
            "type": "event_created",
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "date": event.created_at,
            "event_date": event.start_time,
            "venue": event.venue_name,
            "event_image": event.image_url,
            "status": "created"
        })

    # 2. Get events registered for by the user
    from sqlalchemy.orm import selectinload
    reg_stmt = select(UserRegistration).where(
        UserRegistration.user_email == current_user.email,
        UserRegistration.status == "SUCCESS"
    ).options(selectinload(UserRegistration.event))

    reg_result = await session.execute(reg_stmt)
    registrations = reg_result.scalars().all()

    for reg in registrations:
        if reg.event:
            activities.append({
                "type": "event_registered",
                "id": reg.event.id,
                "title": reg.event.title,
                "description": reg.event.description,
                "date": reg.registered_at,
                "event_date": reg.event.start_time,
                "venue": reg.event.venue_name,
                "confirmation_id": reg.confirmation_id,
                "status": "registered"
            })

    # 3. Get follow activities (people who started following the user)
    follow_stmt = select(Follow).where(Follow.followed_email == current_user.email)
    follow_result = await session.execute(follow_stmt)
    follows = follow_result.scalars().all()

    for follow in follows:
        # Get follower details
        follower_stmt = select(User).where(User.email == follow.follower_email)
        follower_result = await session.execute(follower_stmt)
        follower = follower_result.scalars().first()
        if follower:
            activities.append({
                "type": "new_follower",
                "id": follow.id,
                "title": f"{follower.full_name or follower.email} started following you",
                "description": f"New follower: {follower.full_name or follower.email}",
                "date": follow.created_at,
                "follower_email": follower.email,
                "follower_name": follower.full_name,
                "follower_image": follower.profile_image,
                "status": "followed"
            })

    # 4. Get unfollow activities (people who unfollowed the user) - Note: This is hard to track without audit logs
    # For now, we'll skip unfollow activities as they require additional audit logging

    # 5. Get event deletion activities (using soft delete tracking in raw_data)
    deleted_stmt = select(Event).where(
        Event.raw_data.contains({"deleted_by": current_user.email})
    )
    deleted_result = await session.execute(deleted_stmt)
    deleted_events = deleted_result.scalars().all()

    for event in deleted_events:
        if event.raw_data and event.raw_data.get("deleted_at"):
            activities.append({
                "type": "event_deleted",
                "id": event.id,
                "title": event.title,
                "description": event.description,
                "date": event.raw_data["deleted_at"],
                "event_date": event.start_time,
                "venue": event.venue_name,
                "event_image": event.image_url,
                "status": "deleted"
            })

    # 6. Get Global Event Notifications (Events created by OTHER users)
    # User Request: "if any event created... send to all the user notification page"
    # We filter for events with source='InfiniteBZ' (user created) but NOT created by current_user
    global_stmt = select(Event).where(
        Event.raw_data.op("->>")("source") == "InfiniteBZ"
    )
    global_result = await session.execute(global_stmt)
    global_events = global_result.scalars().all()

    for event in global_events:
        # Skip if created by current user (already covered in Step 1)
        if event.raw_data.get("created_by") == current_user.email:
            continue
            
        activities.append({
            "type": "event_created", # Re-using type for consistent icon
            "id": event.id,
            "title": f"New Event: {event.title}",
            "description": event.description,
            "date": event.created_at,
            "event_date": event.start_time,
            "venue": event.venue_name,
            "event_image": event.image_url,
            "follower_image": None, # Could show organizer avatar if available
            "subtitle": f"Created by {event.organizer_name or 'Unknown'}",
            "status": "created_global"
        })

    # 7. Get user cancellations
    # User Request: "cancel the order... activities"
    cancel_stmt = select(UserRegistration).where(
        UserRegistration.user_email == current_user.email,
        UserRegistration.status == "CANCELLED"
    ).options(selectinload(UserRegistration.event))
    
    cancel_result = await session.execute(cancel_stmt)
    cancellations = cancel_result.scalars().all()
    
    for reg in cancellations:
        if reg.event:
            activities.append({
                "type": "event_cancelled",
                "id": reg.event.id,
                "title": f"Registration Cancelled: {reg.event.title}",
                "description": "You cancelled your registration.",
                "date": reg.registered_at, # Optimally we'd have cancelled_at, but using registered_at for now or now()
                "event_date": reg.event.start_time,
                "venue": reg.event.venue_name,
                "event_image": reg.event.image_url,
                "status": "cancelled"
            })

    # 8. NLP-Based Recommendations
    # User Request: "similar to that give the notification message" (NLP)
    from app.services.recommendation_engine import recommend_events_nlp
    from datetime import datetime

    # 8a. Gather past successful events for profile building
    past_events = []
    registered_event_ids = set()
    
    for reg in registrations:
        if reg.event:
            past_events.append(reg.event)
            registered_event_ids.add(reg.event.id)
            
    # Include cancelled in ID exclusion but NOT in profile building (user rejected them)
    for reg in cancellations:
        if reg.event:
            registered_event_ids.add(reg.event.id)
    
    if past_events:
        # 8b. Fetch all upcoming events the user hasn't interacted with
        # We fetch broader candidate pool instead of just matching category
        candidates_stmt = select(Event).where(
            Event.start_time > datetime.now(),
            Event.id.notin_(registered_event_ids)
        )
        candidates_result = await session.execute(candidates_stmt)
        upcoming_candidates = candidates_result.scalars().all()
        
        # 8c. Run NLP Recommendation Engine
        # recommended_items is a list of tuples: (event, score)
        recommended_items = recommend_events_nlp(past_events, upcoming_candidates, threshold=0.1, limit=3)
        
        for event, score in recommended_items:
            activities.append({
                "type": "event_recommendation",
                "id": event.id,
                "title": f"Recommended: {event.title}",
                "description": f"Based on your history (Match: {int(score*100)}%)",
                "date": datetime.now(), 
                "event_date": event.start_time,
                "venue": event.venue_name,
                "event_image": event.image_url,
                "subtitle": f"Similar to events you attended",
                "status": "recommendation"
            })

    # Sort activities by date (most recent first)
    activities.sort(key=lambda x: x["date"], reverse=True)

    return {
        "activities": activities,
        "total": len(activities)
    }

# --- 10. MY REGISTRATIONS ENDPOINTS ---

@router.get("/user/registrations")
async def get_user_registrations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all events the user has registered for.
    """
    from sqlalchemy.orm import selectinload
    stmt = select(UserRegistration).where(
        UserRegistration.user_email == current_user.email
    ).options(selectinload(UserRegistration.event))
    
    result = await session.execute(stmt)
    registrations = result.scalars().all()
    
    events_list = []
    for reg in registrations:
        if reg.event:
            events_list.append({
                "id": reg.event.id,
                "title": reg.event.title,
                "start_time": reg.event.start_time,
                "end_time": reg.event.end_time,
                "venue_name": reg.event.venue_name,
                "venue_address": reg.event.venue_address,
                "image_url": reg.event.image_url,
                "is_free": reg.event.is_free,
                "online_event": reg.event.online_event,
                "registration_date": reg.registered_at,
                "status": reg.status, # SUCCESS, PENDING, etc.
                "confirmation_id": reg.confirmation_id
            })
            
    return {"registrations": events_list}

@router.get("/user/registrations/{event_id}/qr")
async def get_registration_qr(
    event_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get QR code for a specific registration.
    """
    from sqlalchemy.orm import selectinload
    stmt = select(UserRegistration).where(
        UserRegistration.event_id == event_id,
        UserRegistration.user_email == current_user.email,
        UserRegistration.status == "SUCCESS"
    ).options(selectinload(UserRegistration.event))
    
    result = await session.execute(stmt)
    registration = result.scalars().first()
    
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    # Generate QR Data
    event = registration.event
    qr_data = f"Ticket ID: {registration.confirmation_id}\\nEvent: {event.title}\\nUser: {current_user.email}\\nValid: {event.start_time}"
    
    # Generate QR Image (using existing utility if available or inline)
    # We imported generate_qr_code from app.core.email_utils earlier
    qr_base64 = generate_qr_code(qr_data)
    
    return {
        "qr_code": qr_base64,
        "event_title": event.title,
        "ticket_id": registration.confirmation_id
    }