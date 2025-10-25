from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
from fr import friday_response

app = Flask(__name__)
CORS(app)

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")
    
    response_generator = friday_response(user_message)
    
    return Response(stream_with_context(response_generator), mimetype="text/plain")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
