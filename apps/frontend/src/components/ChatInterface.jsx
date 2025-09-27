import { useRef } from "react";
import { useSpeech } from "../hooks/useSpeech";

export const ChatInterface = ({ hidden, ...props }) => {
  const input = useRef();
  const fileInput = useRef();
  const {
    tts,
    summarize,
    loading,
    message,
    startRecording,
    stopRecording,
    recording,
  } = useSpeech();

  const sendMessage = () => {
    const text = input.current.value;
    if (!loading && !message && text.trim()) {
      tts(text);
      input.current.value = "";
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && !loading && !message) {
      summarize(file);
      fileInput.current.value = "";
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none">
      <div className="self-start backdrop-blur-md bg-white bg-opacity-70 p-5 rounded-lg">
        <h1 className="font-black text-xl text-gray-700">
          Dhura&apos;s Digital Human
        </h1>
        <p className="text-gray-600">
          {loading
            ? "Loading..."
            : "Type a message, upload a file, or press the mic to talk with the AI."}
        </p>
      </div>

      <div className="w-full flex flex-col items-end justify-center gap-4"></div>

      <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
        {/* Record button */}
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`bg-gray-500 hover:bg-gray-600 text-white p-4 px-4 font-semibold uppercase rounded-md ${
            recording ? "bg-red-500 hover:bg-red-600" : ""
          } ${loading || message ? "cursor-not-allowed opacity-30" : ""}`}
          disabled={loading || message}
        >
          🎤
        </button>

        {/* Text input */}
        <input
          className="w-full placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
          placeholder="Type a message..."
          ref={input}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        />

        {/* Send button */}
        <button
          disabled={loading || message}
          onClick={sendMessage}
          className={`bg-gray-500 hover:bg-gray-600 text-white p-4 px-10 font-semibold uppercase rounded-md ${
            loading || message ? "cursor-not-allowed opacity-30" : ""
          }`}
        >
          Send
        </button>

        {/* Upload button */}
        <button
          onClick={() => fileInput.current.click()}
          className={`bg-blue-500 hover:bg-blue-600 text-white p-4 px-4 font-semibold uppercase rounded-md ${
            loading || message ? "cursor-not-allowed opacity-30" : ""
          }`}
          disabled={loading || message}
        >
          📄
        </button>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInput}
          onChange={handleFileUpload}
          accept=".txt,.pdf,.docx"
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
};
