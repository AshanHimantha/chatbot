"use client";
import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send } from "lucide-react";

export default function Home() {
  const [messages, setMessages] = useState([
    { text: "Hello! How can I help you today?", isUser: false },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const messagesEndRef = useRef(null);

  // Check if API key is available on component mount
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      console.error(
        "API Key is missing. Please set NEXT_PUBLIC_GEMINI_API_KEY in .env.local"
      );
      setApiKeyMissing(true);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = async (prompt) => {
    // Check for API key before making request
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return "API key is missing. Please add your Gemini API key to the .env.local file.";
    }

    try {
      // Initialize the API client using the correct constructor format
      const ai = new GoogleGenAI({
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      });

      // Generate content based on user prompt
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash", // You can also try "gemini-2.0-flash" if available
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error("Error generating AI response:", error);
      return `Error: ${
        error.message || "Something went wrong with the AI service."
      }`;
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;

    // Add user message
    setMessages([...messages, { text: inputMessage, isUser: true }]);
    const userPrompt = inputMessage;
    setInputMessage("");

    // Show loading state
    setIsLoading(true);

    try {
      // Get AI response
      const aiResponse = await generateAIResponse(userPrompt);

      // Add AI response to chat
      setMessages((prev) => [...prev, { text: aiResponse, isUser: false }]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: `Error: ${
            error.message || "Something went wrong. Please try again."
          }`,
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-4">
      <Card className="w-full max-w-xl h-[80vh] border-zinc-800 bg-zinc-950 text-zinc-100 shadow-xl shadow-blue-900/5">
        <CardHeader className="border-b border-zinc-800 px-6 pb-4 pt-5">
          <div className="flex items-center">
            <Avatar className="mr-3 h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-700">
              <AvatarFallback className="text-white text-xs">AI</AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Gemini AI Assistant
            </CardTitle>
          </div>
        </CardHeader>

        {apiKeyMissing && (
          <div className="bg-red-950 border border-red-800 px-4 py-2 text-red-300 text-sm mx-4 mt-4 rounded-md">
            ⚠️ API key missing. Please add NEXT_PUBLIC_GEMINI_API_KEY to your
            .env.local file.
          </div>
        )}

        <ScrollArea className={"h-[60vh] px-4 py-4 overflow-y-auto"}>
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.isUser ? "justify-end" : "justify-start"
                }`}
              >
                <div className="flex gap-3 max-w-[80%]">
                  {!message.isUser && (
                    <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-700 mt-0.5">
                      <AvatarFallback className="text-white text-xs">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      message.isUser
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  </div>
                  {message.isUser && (
                    <Avatar className="h-8 w-8 bg-zinc-700 mt-0.5">
                      <AvatarFallback className="text-zinc-200 text-xs">
                        You
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-700 mt-0.5">
                    <AvatarFallback className="text-white text-xs">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-zinc-800 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1.5">
                      <div
                        className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <CardFooter className="border-t border-zinc-800 p-4">
          <div className="flex w-full gap-2">
            <Input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-zinc-800 border-zinc-700 placeholder:text-zinc-500 focus-visible:ring-blue-500"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-colors p-2"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
