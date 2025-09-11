from scheduler import create_app

app = create_app()

if __name__ == "__main__":
    # Note: For production, we use waitress, not this.
    # This is for direct `python app.py` debugging.
    app.run(debug=True)