import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = "http://localhost:8002";

const SpeechContext = createContext();

export const SpeechProvider = ({ children }) => {
  const [recording, setRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const newRecognition = new SpeechRecognition();
        newRecognition.continuous = false;
        newRecognition.interimResults = false;
        newRecognition.lang = "en-US";
        newRecognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          tts(transcript);
        };
        newRecognition.onend = () => {
          setRecording(false);
        };
        newRecognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setRecording(false);
        };
        setRecognition(newRecognition);
      } else {
        console.warn("Speech recognition not supported in this browser.");
      }
    }
  }, []);

  const startRecording = () => {
    if (recognition) {
      recognition.start();
      setRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setRecording(false);
    }
  };

  const tts = async (message) => {
    setLoading(true);
    try {
      const data = await fetch(`${backendUrl}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ message }),
      });
      const response = (await data.json()).messages;
      setMessages((messages) => [...messages, ...response]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const summarize = async (file) => {
    const formData = new FormData();
    formData.append("document", file);
    setLoading(true);
    try {
      const data = await fetch(`${backendUrl}/summarize`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const response = (await data.json()).messages;
      setMessages((messages) => [...messages, ...response]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <SpeechContext.Provider
      value={{
        startRecording,
        stopRecording,
        recording,
        tts,
        summarize,
        message,
        onMessagePlayed,
        loading,
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
};

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error("useSpeech must be used within a SpeechProvider");
  }
  return context;
};
