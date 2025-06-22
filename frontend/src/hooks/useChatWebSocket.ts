import { useEffect, useRef, useState, useCallback } from "react";

type UseChatWebSocketOptions = {
  onMessage?: (message: string) => void;
};

export const useChatWebSocket = (
  companyId: string,
  options?: UseChatWebSocketOptions
) => {
  const [messages, setMessages] = useState<string[]>([]);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(`ws://3.239.107.179:8000`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connection opened.");
      setIsConnected(true);

      const initialMessage = JSON.stringify({ "company-id": companyId });
      socket.send(initialMessage);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      let message: string | undefined;

      if (data.type === "audio" && data.transcript) {
        message = data.transcript;
        setMessages((prevMessages) => [...prevMessages, message]);
      } else if (data.type === "text") {
        message = data.message;
        setMessages((prevMessages) => [...prevMessages, message]);
      }

      if (message) {
        setLastMessage(message);
        options?.onMessage?.(message);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed.");
      setIsConnected(false);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [companyId, options]);

  const sendMessage = useCallback(
    (message: string) => {
      if (socketRef.current && isConnected) {
        const payload = JSON.stringify({ message, mimeType: "text/plain" });
        socketRef.current.send(payload);
      } else {
        console.error("WebSocket is not open or connected.");
      }
    },
    [isConnected]
  );

  return { messages, sendMessage, isConnected, lastMessage };
};