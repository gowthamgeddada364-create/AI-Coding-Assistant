from flask import Flask, render_template, request, jsonify, redirect, session
import os
from dotenv import load_dotenv
import google.generativeai as genai
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

app.secret_key = "gowtham_secret_key"

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-2.5-flash")

@app.route("/")
def home():

    if "user_id" not in session:
        return redirect("/login")

    return render_template(
        "index.html",
        username=session["username"]
    )


@app.route("/history")
def history():

    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = sqlite3.connect("chat_history.db")
    cursor = conn.cursor()

    cursor.execute(
    """
    SELECT user_message, bot_reply
    FROM chats
    WHERE user_id=?
    ORDER BY id ASC
    """,
    (session["user_id"],)
)

    chats = cursor.fetchall()

    conn.close()

    history = []

    for chat in chats:
        history.append({
            "user": chat[0],
            "bot": chat[1]
        })

    return jsonify(history)

@app.route("/clear-history", methods=["POST"])
def clear_history():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = sqlite3.connect("chat_history.db")
    cursor = conn.cursor()

    cursor.execute(
    "DELETE FROM chats WHERE user_id=?",
    (session["user_id"],)
)

    conn.commit()
    conn.close()

    return jsonify({"status": "success"})


@app.route("/export")
def export_chat():
    
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    conn = sqlite3.connect("chat_history.db")
    cursor = conn.cursor()

    cursor.execute(
    """
    SELECT user_message, bot_reply
    FROM chats
    WHERE user_id=?
    ORDER BY id ASC
    """,
    (session["user_id"],)
)

    chats = cursor.fetchall()

    conn.close()

    text = ""

    for chat in chats:

        text += f"User:\n{chat[0]}\n\n"
        text += f"Bot:\n{chat[1]}\n"
        text += "-" * 60 + "\n\n"

    return jsonify({"chat": text})


@app.route("/chat", methods=["POST"])
def chat():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    user_message = request.json["message"]

    try:
        prompt = f"""
    You are an AI coding assistant.

    Rules:
    1. Answer briefly.
    2. Use Markdown formatting.
    3. Put all code inside proper Markdown code blocks.
    4. Do not write long essays.
    5. Keep explanations to 2-3 lines.
    6. Specify the language after the backticks (python, c, java, html, css, javascript, etc.).

    User Question:
    {user_message}
    """

        response = model.generate_content(prompt)
        reply = response.text 

    except Exception as e:
        print("Gemini Error:", e)
        
        if "429" in str(e):
            reply = "⚠️ Too many requests. Please wait 20-30 seconds and try again."

        else:
            reply = "⚠️ Something went wrong. Please try again later."

    # Save chat
    conn = sqlite3.connect("chat_history.db")
    cursor = conn.cursor()

    cursor.execute(
    """
    INSERT INTO chats(user_id, user_message, bot_reply)
    VALUES (?, ?, ?)
    """,
    (
        session["user_id"],
        user_message,
        reply
    )
)

    conn.commit()
    conn.close()  


    return jsonify({"reply": reply})


@app.route("/signup", methods=["GET", "POST"])
def signup():

    if request.method == "POST":

        username = request.form["username"]
        email = request.form["email"]
        password = generate_password_hash(request.form["password"])

        conn = sqlite3.connect("chat_history.db")
        cursor = conn.cursor()

        try:

            cursor.execute(
                "INSERT INTO users(username, email, password) VALUES (?, ?, ?)",
                (username, email, password)
            )

            conn.commit()

            return redirect("/login")

        except sqlite3.IntegrityError:

            return "Email already exists."

        finally:

            conn.close()

    return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]

        conn = sqlite3.connect("chat_history.db")
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, username, password FROM users WHERE email = ?",
            (email,)
        )

        user = cursor.fetchone()

        conn.close()

        if user and check_password_hash(user[2], password):

            session["user_id"] = user[0]
            session["username"] = user[1]

            return redirect("/")

        else:

            return "Invalid Email or Password"

    return render_template("login.html")

@app.route("/logout")
def logout():

    session.clear()

    return redirect("/login")


if __name__ == "__main__":
    app.run(debug=True)
