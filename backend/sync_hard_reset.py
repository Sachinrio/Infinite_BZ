
import sqlite3
import os
from sqlalchemy import create_engine, text

# Get DB URL from env or default
db_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/infinite_bz" 
# Wait, let's use the actual engine config from the app
from app.core.database import DATABASE_URL
# Convert asyncpg to psycopg2 for sync run
sync_url = DATABASE_URL.replace("asyncpg", "psycopg2")

engine = create_engine(sync_url)
with engine.connect() as conn:
    print("Force deleting all events and related data...")
    try:
        conn.execute(text("DELETE FROM userregistration"))
    except Exception as e:
        print(f"Error clearing userregistration: {e}")
        
    try:
        conn.execute(text("DELETE FROM ticketclass"))
    except Exception as e:
        print(f"Error clearing ticketclass: {e}")
        
    res = conn.execute(text("DELETE FROM event"))
    conn.commit()
    print(f"DONE. Deleted {res.rowcount} events.")
