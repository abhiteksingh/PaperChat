import sqlite3
import uuid

DATABASE_NAME = "chat.db"

def get_connection():
    return sqlite3.connect(DATABASE_NAME)

def init_db():

    conn = get_connection()
    
    cursor = conn.cursor()

    cursor.execute(""" 
    CREATE TABLE IF NOT EXISTS chats(
        id TEXT PRIMARY KEY,
        title TEXT
        )
    """)

    cursor.execute("""
  
    CREATE TABLE IF NOT EXISTS messages(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT,
            role TEXT,
            content TEXT,
            token_count INTEGER
        )
  """)
    
    conn.commit()
    conn.close()

def save_message(chat_id,role,content,token_count):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """ INSERT INTO messages(chat_id , role , content,token_count)
        VALUES (?,?,?,?)
        """,
        (
            chat_id,
            role,
            content,
            token_count
        )
    )

    conn.commit()
    conn.close()

def load_messages(chat_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT role,content , token_count
        FROM messages
        WHERE chat_id = ?
        ORDER BY id
       """,
       (
           chat_id,
       )
    )

    rows = cursor.fetchall()
    
    conn.close()

    if not rows:
        return []

    return [
        {
            "role" : row[0],
            "content" : row[1],
            "token_count" : row[2]
        }
        for row in rows
    ]

def load_chats():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
    """
    SELECT id, title
    FROM chats
    """
    )

    rows = cursor.fetchall()

    conn.close()

    if not rows:
        return []
    
    return [
    {
        "chat_id": row[0],
        "title": row[1]
    }
    for row in rows
]

def delete_chat(chat_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        DELETE FROM chats
        WHERE id = ?
        """,
        (chat_id,)
    )

    cursor.execute(
        """
        DELETE FROM messages
        WHERE chat_id = ?
        """,
        (chat_id,)
    )

    conn.commit()
    conn.close()

def create_chat(title):
    chat_id = str(uuid.uuid4())

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO chats(id, title)
        VALUES (?, ?)
        """,
        (chat_id, title)
    )

    conn.commit()
    conn.close()

    return chat_id

# def save_pdf(pdf_content):
#     conn = get_connection()
#     cursor = conn.cursor()

#     chat_id = str(uuid.uuid4())

#     cursor.execute(
#         """
#         INSERT INTO chats(id,pdf_content)
#         VALUES (?,?)
#         """,
#         (
#             chat_id,
#             pdf_content
#         )
#     )

#     conn.commit()
#     conn.close()

#     return chat_id


# def load_pdf(chat_id):
#     conn = get_connection()
#     cursor = conn.cursor()

#     cursor.execute(
#         """
#         SELECT pdf_content
#         FROM chats
#         WHERE id = ?
#         """,
#         (
#             chat_id,
#         )
#     )

#     rows = cursor.fetchone()

#     conn.close()

#     if rows is None:
#         return None
    
#     return rows[0]

