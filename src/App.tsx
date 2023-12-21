import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import Chat from "./Chat";
import WebSocketConnector from "./WebSocketConnector";
import Welcome from "./Welcome";
import Sidebar from "./Sidebar";

export type Client = {
  connectionId: string;
  nickname: string;
};
export type Message = {
  messageId: string;
  createdAt: number;
  nicknameToNickname: string;
  message: string;
  sender: string;
};
const webSocketConnector = new WebSocketConnector();
const App = () => {
  const [nickname, setNickname] = useState(
    localStorage.getItem("nickname") || ""
  );
  const [targetNicknameValue, setTargetNicknameValue] = useState(
    window.localStorage.getItem("lastTargetNickname") || ""
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  useEffect(() => {
    window.localStorage.setItem("nickname", nickname);
    window.localStorage.setItem("lastTargetNickname", targetNicknameValue);
  });

  const webSocketConnectorRef = useRef(webSocketConnector);

  if (nickname === "") {
    return (
      <Welcome
        setNickname={(nickname) => {
          setNickname(nickname);

          if (targetNicknameValue === "") {
            setTargetNicknameValue(nickname);
          }
        }}
      />
    );
  }

  const WS_URL = `wss://e5sqe76r3k.execute-api.us-east-1.amazonaws.com/dev/?nickname=${nickname}`;
  const ws = webSocketConnectorRef.current.getConnecion(WS_URL);

  const loadMessages = (nickname: string) => {
    ws.send(
      JSON.stringify({
        action: "getMessages",
        targetNickname: nickname,
        limit: 1000,
      })
    );
  };

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        action: "getClients",
      })
    );

    loadMessages(targetNicknameValue);
  };

  ws.onmessage = (e) => {
    console.log(e.data);
    const message = JSON.parse(e.data) as {
      type: string;
      value: unknown;
    };

    console.log(message);

    if (message.type === "clients") {
      setClients((message.value as { clients: Client[] }).clients);
    }
    if (message.type === "messages") {
      setMessages(
        (message.value as { messages: Message[] }).messages.reverse()
      );
    }
    if (message.type === "message") {
      const messageValue = message.value as { message: Message };
      if (messageValue.message.sender === targetNicknameValue) {
        setMessages([...messages, messageValue.message]);
      }
    }
  };

  const setTargetNickname = (nickname: string) => {
    loadMessages(nickname);
    setTargetNicknameValue(nickname);
  };

  const sendMessage = (message: string) => {
    ws.send(
      JSON.stringify({
        action: "sendMessage",
        recipientNickname: targetNicknameValue,
        message: message,
      })
    );

    setMessages([
      ...messages,
      {
        message,
        sender: nickname,
        createdAt: new Date().getTime(),
        messageId: Math.random().toString(),
        nicknameToNickname: [nickname, targetNicknameValue].sort().join("#"),
      },
    ]);
  };
  return (
    <div className="flex">
      <div className="flex-none w-16 md:w-40 border-r-2">
        <Sidebar clients={clients} setTargetNickname={setTargetNickname} />
      </div>
      <div className="flex-auto">
        <Chat
          nickname={nickname}
          messages={messages}
          sendMessage={sendMessage}
          targetNickname={targetNicknameValue}
        />
      </div>
    </div>
  );
};

export default App;
